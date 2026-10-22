import crypto from "node:crypto";
import Proof from "./proof.model.js";
import Order from "./order.model.js";
import Payment from "./payment.model.js";
import { storage } from "./proof.storage.js";
import { parseAmountToMinor } from "./money.js";
import { httpError, assertObjectId, assertStaffPermission, isStaff, parsePage, pageMeta } from "./access.js";
import { safeAudit } from "../../utils/audit.js";

export const MAX_PROOF_BYTES = 3 * 1024 * 1024;
export const MAX_PROOFS_PER_ORDER = 5;
export const PROOF_MIME = ["image/jpeg", "image/png", "image/webp"];

// content sniffing: the declared Content-Type must agree with the real file signature
export const sniffMime = (b) => {
  if (!Buffer.isBuffer(b) || b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  return null;
};
const cleanName = (n) => String(n || "proof").split(/[\\/]/).pop().replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 80) || "proof";

export const serializeProof = (p) => ({
  id: String(p._id),
  orderId: String(p.orderId),
  paymentId: p.paymentId ? String(p.paymentId) : null,
  mimeType: p.mimeType,
  sizeBytes: p.sizeBytes,
  originalName: p.originalName,
  declaredAmountMinor: p.declaredAmountMinor,
  transactionReference: p.transactionReference,
  paymentDate: p.paymentDate,
  status: p.status,
  reviewNote: p.reviewNote,
  createdAt: p.createdAt,
  note: "A screenshot is supporting evidence only and never marks a payment as paid.",
});

export const uploadProof = async (user, orderId, { buffer, declaredMime, filename, amount, reference, paymentDate }) => {
  assertObjectId(orderId, "order ID");
  if (user.role !== "customer") throw httpError("Only the customer who placed the order can upload payment proof", 403);
  const order = await Order.findOne({ _id: orderId, customerId: user.id }).lean();
  if (!order) throw httpError("Order not found", 404);
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw httpError("A non-empty image body is required", 400);
  if (buffer.length > MAX_PROOF_BYTES) throw httpError("File is too large (max 3 MB)", 413);
  const real = sniffMime(buffer);
  if (!real || !PROOF_MIME.includes(real)) throw httpError("Only JPEG, PNG or WebP images are accepted", 415);
  if (declaredMime && declaredMime !== real) throw httpError("File content does not match its Content-Type", 415);
  const existing = await Proof.countDocuments({ orderId: order._id });
  if (existing >= MAX_PROOFS_PER_ORDER) throw httpError("Maximum number of proofs reached for this order", 409);
  const declaredAmountMinor = amount === undefined || amount === "" ? null : parseAmountToMinor(amount);
  let when = null;
  if (paymentDate) {
    when = new Date(paymentDate);
    if (Number.isNaN(when.getTime()) || when.getTime() > Date.now() + 86400000) throw httpError("Invalid payment date", 400);
  }
  const ref = reference ? String(reference).trim().slice(0, 100) : null;
  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
  const fileId = await storage.put(buffer, `${crypto.randomUUID()}`, { orderId: String(order._id), uploaderId: user.id });
  try {
    const doc = await Proof.create({
      orderId: order._id, paymentId: order.paymentId || null, uploaderId: user.id, fileId, originalName: cleanName(filename),
      mimeType: real, sizeBytes: buffer.length, sha256, declaredAmountMinor, transactionReference: ref, paymentDate: when,
    });
    return serializeProof(doc.toObject ? doc.toObject() : doc);
  } catch (e) {
    await storage.remove(fileId);
    throw e;
  }
};

const canRead = async (user, proof) => {
  if (user.role === "customer") return proof.uploaderId === user.id;
  if (isStaff(user)) {
    assertStaffPermission(user, "payments.view");
    return true;
  }
  return false; // sellers cannot see customers' payment screenshots
};

export const listProofs = async (user, orderId, q = {}) => {
  assertObjectId(orderId, "order ID");
  const order = await Order.findById(orderId).lean();
  if (!order) throw httpError("Order not found", 404);
  if (user.role === "customer" && order.customerId !== user.id) throw httpError("Order not found", 404);
  if (user.role !== "customer") {
    if (!isStaff(user)) throw httpError("Forbidden - Insufficient permissions", 403);
    assertStaffPermission(user, "payments.view");
  }
  const p = parsePage(q);
  const [rows, total] = await Promise.all([Proof.find({ orderId }).sort({ createdAt: -1 }).skip(p.skip).limit(p.limit).lean(), Proof.countDocuments({ orderId })]);
  return { data: rows.map(serializeProof), pagination: pageMeta(p, total) };
};

export const openProofFile = async (user, proofId) => {
  assertObjectId(proofId, "proof ID");
  const proof = await Proof.findById(proofId).lean();
  if (!proof || !(await canRead(user, proof))) throw httpError("Proof not found", 404);
  return { proof, stream: storage.openRead(proof.fileId) };
};

export const reviewProof = async (actor, proofId, { status, note = "" }) => {
  assertStaffPermission(actor, "payments.manage");
  assertObjectId(proofId, "proof ID");
  if (!["accepted", "rejected"].includes(status)) throw httpError("status must be accepted or rejected", 400);
  const p = await Proof.findOneAndUpdate(
    { _id: proofId, status: "submitted" },
    { $set: { status, reviewNote: String(note).slice(0, 500), reviewedBy: actor.id, reviewedAt: new Date() } },
    { new: true },
  ).lean();
  if (!p) throw httpError("Proof not found or already reviewed", 404);
  await safeAudit({ actor, action: "PAYMENT_PROOF_REVIEWED", resourceType: "payment_proof", resourceId: p._id, reason: note, metadata: { status, orderId: String(p.orderId) } });
  return serializeProof(p); // note: reviewing a proof never changes Payment/Order payment state
};
