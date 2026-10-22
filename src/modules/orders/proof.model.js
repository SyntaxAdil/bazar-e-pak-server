import mongoose from "mongoose";
// Metadata for an uploaded payment screenshot. The binary lives in GridFS (bucket
// "paymentProofs"), never in this document. A proof NEVER proves a PayFast payment.
const s = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", default: null },
    uploaderId: { type: String, required: true, index: true },
    fileId: { type: mongoose.Schema.Types.ObjectId, required: true },
    originalName: { type: String, default: "" },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    sha256: { type: String, required: true },
    declaredAmountMinor: { type: Number, min: 0, default: null },
    transactionReference: { type: String, default: null },
    paymentDate: { type: Date, default: null },
    status: { type: String, enum: ["submitted", "accepted", "rejected"], default: "submitted", index: true },
    reviewedBy: { type: String, default: null },
    reviewNote: { type: String, default: "" },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
s.index({ orderId: 1, createdAt: -1 });
export default mongoose.models.PaymentProof || mongoose.model("PaymentProof", s);
