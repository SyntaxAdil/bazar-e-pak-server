import mongoose from "mongoose";
const s = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    customerId: { type: String, default: null, index: true },
    provider: { type: String, default: null },
    method: { type: String, default: null },
    status: {
      type: String,
      enum: [
        "pending",
        "authorized",
        "paid",
        "failed",
        "cancelled",
        "refunded",
        "partially_refunded",
        "timed_out",
        "invalid",
      ],
      default: "pending",
      index: true,
    },
    // checkout progress for the PayFast API flow
    stage: {
      type: String,
      enum: ["created", "tokenized", "charge_submitted", "verified"],
      default: "created",
    },
    amount: { type: Number, min: 0, default: 0 }, // PKR (legacy/display)
    amountMinor: { type: Number, min: 0, default: 0 }, // paisa (authoritative)
    currency: { type: String, default: "PKR" },
    basketId: { type: String, default: null },
    providerReference: { type: String, default: null, index: true }, // gateway transaction id
    gatewayStatusCode: { type: String, default: null },
    gatewayStatusMessage: { type: String, default: null },
    amountVerification: { type: String, enum: ["gateway_response", "request_only", null], default: null },
    instrumentType: { type: String, default: null }, // CARD | ACCOUNT | WALLET
    instrumentLast4: { type: String, default: null },
    failureCode: { type: String, default: null },
    failureMessage: { type: String, default: null },
    verifiedAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    gatewayFeeMinor: { type: Number, min: 0, default: 0 },
    feeSource: { type: String, enum: ["none", "estimated", "actual"], default: "none" },
    refundedMinor: { type: Number, min: 0, default: 0 },
    refundReservedMinor: { type: Number, min: 0, default: 0 },
    appliedRefunds: { type: [String], default: [] },
    // short-lived gateway values; never returned by the API (select: false)
    secret: {
      type: new mongoose.Schema(
        {
          instrumentToken: { type: String, default: null },
          data3dsSecureId: { type: String, default: null },
          eci: { type: String, default: null },
          pares: { type: String, default: null },
          callbackTokenHash: { type: String, default: null },
        },
        { _id: false },
      ),
      default: () => ({}),
      select: false,
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);
s.index({ basketId: 1 }, { unique: true, partialFilterExpression: { basketId: { $type: "string" } } });
s.index(
  { provider: 1, providerReference: 1 },
  { unique: true, partialFilterExpression: { providerReference: { $type: "string" } } },
);
s.index({ status: 1, createdAt: -1 });
export default mongoose.models.Payment || mongoose.model("Payment", s);
