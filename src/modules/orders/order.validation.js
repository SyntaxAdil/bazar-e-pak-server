import { z } from "zod";
import { parseAmountToMinor } from "./money.js";
import { httpError } from "./access.js";

export const parse = (schema, data) => {
  const r = schema.safeParse(data ?? {});
  if (!r.success) throw httpError(r.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ").slice(0, 400), 400);
  return r.data;
};

const oid = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ID");
const mobile = z.string().regex(/^03\d{9}$/, "Mobile number must look like 03XXXXXXXXX");
const amount = z.union([z.number(), z.string()]).transform((v, ctx) => {
  try {
    const m = parseAmountToMinor(v);
    if (m <= 0) throw new Error("must be greater than zero");
    return m;
  } catch (e) {
    ctx.addIssue({ code: "custom", message: e.message });
    return z.NEVER;
  }
});

export const checkoutSchema = z.object({
  paymentMethod: z.enum(["cod", "payfast"]),
  checkoutKey: z.string().min(8).max(100).regex(/^[A-Za-z0-9_-]+$/).optional(),
  shippingAddress: z.object({
    fullName: z.string().trim().min(2).max(100),
    phone: mobile,
    addressLine: z.string().trim().min(5).max(300),
    city: z.string().trim().min(2).max(80),
    province: z.string().trim().max(80).optional(),
    postalCode: z.string().trim().max(10).optional(),
    notes: z.string().trim().max(300).optional(),
  }).strict(),
}).strict();

const digits = (min, max) => z.string().regex(new RegExp(`^\\d{${min},${max}}$`), "Invalid digits");
export const initiateSchema = z.object({
  orderId: oid,
  accountType: z.enum(["CARD", "ACCOUNT", "WALLET"]),
  mobileNumber: mobile,
  instrument: z.object({
    card_number: digits(12, 19).optional(),
    expiry_month: digits(2, 2).optional(),
    expiry_year: digits(2, 4).optional(),
    cvv: digits(3, 4).optional(),
    account_number: z.string().trim().min(5).max(34).optional(),
    cnic_number: digits(13, 13).optional(),
    bank_code: z.string().trim().max(20).optional(),
    account_type_id: z.union([z.string().max(10), z.number()]).optional(),
  }).strict(),
}).strict().superRefine((v, ctx) => {
  if (v.accountType === "CARD") for (const k of ["card_number", "expiry_month", "expiry_year", "cvv"]) if (!v.instrument[k]) ctx.addIssue({ code: "custom", path: ["instrument", k], message: "Required for CARD" });
  if (v.accountType !== "CARD" && !v.instrument.account_number) ctx.addIssue({ code: "custom", path: ["instrument", "account_number"], message: "Required" });
});

export const confirmSchema = z.object({ otp: z.string().regex(/^\d{4,8}$/, "OTP must be 4-8 digits").optional() }).strict();

export const refundCreateSchema = z.object({
  amount: amount,
  reason: z.string().trim().min(3).max(500),
  shopId: oid.optional(),
  requestId: z.string().min(8).max(100).regex(/^[A-Za-z0-9_-]+$/).optional(),
  manualReference: z.string().trim().min(3).max(100).optional(),
}).strict();
export const refundRequestSchema = z.object({ amount: amount, reason: z.string().trim().min(3).max(500), shopId: oid.optional() }).strict();
export const refundProcessSchema = z.object({ manualReference: z.string().trim().min(3).max(100).optional() }).strict();
export const refundRejectSchema = z.object({ note: z.string().trim().max(500).optional() }).strict();
export const refundReconcileSchema = z.object({ outcome: z.enum(["processed", "failed"]), gatewayReference: z.string().trim().min(3).max(100).optional() }).strict();
export const feeSchema = z.object({ gatewayFee: z.union([z.number(), z.string()]).transform((v, ctx) => {
  try { const m = parseAmountToMinor(v); return m; } catch (e) { ctx.addIssue({ code: "custom", message: e.message }); return z.NEVER; }
}), reference: z.string().trim().max(100).optional() }).strict();
export const settlementCreateSchema = z.object({ shopId: oid, note: z.string().trim().max(500).optional() }).strict();
export const settlementStatusSchema = z.object({ status: z.enum(["processing", "paid", "failed"]), reference: z.string().trim().min(3).max(100).optional(), note: z.string().trim().max(500).optional() }).strict();
export const proofReviewSchema = z.object({ status: z.enum(["accepted", "rejected"]), note: z.string().trim().max(500).optional() }).strict();
