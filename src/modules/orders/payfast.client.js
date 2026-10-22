// Premier PayFast (Pakistan) API client. Source of truth: https://uat.premierpayfast.com/developers/
// (API v2.3). Verified there: POST /token, POST /transaction/token, POST /transaction/tokenized,
// GET /transaction/{id} and /transaction/basket_id/{basket}, POST /transaction/refund/{id},
// HMAC-SHA256 `secured_hash`, 3-D Secure SIMPLE/CUSTOMIZED page modes.
// NOT documented there (so NOT implemented / assumed): the API host URL (relative paths only),
// hosted-redirect checkout API, webhook signatures, fee lookup, settlement/payout or split APIs.
import crypto from "node:crypto";
import { env } from "../../config/env.js";

export const SUCCESS_CODES = new Set(["00", "79"]);
export const PENDING_CODES = new Set(["001"]);
export const TIMEOUT_CODES = new Set(["002"]);

export const gatewayError = (message, statusCode = 502, extra = {}) =>
  Object.assign(new Error(message), { statusCode, ...extra });

const cfg = () => ({
  enabled: env.PAYFAST_ENABLED,
  env: env.PAYFAST_ENV,
  baseUrl: (env.PAYFAST_API_BASE_URL || "").replace(/\/+$/, ""),
  merchantId: env.PAYFAST_MERCHANT_ID,
  securedKey: env.PAYFAST_SECURED_KEY,
  hashEncoding: env.PAYFAST_HASH_ENCODING,
  hashSeparator: env.PAYFAST_HASH_SEPARATOR,
  timeoutMs: env.PAYFAST_TIMEOUT_MS,
});

export const isConfigured = () => {
  const c = cfg();
  return Boolean(c.enabled && c.baseUrl && c.merchantId && c.securedKey);
};

export const enabledAccountTypes = () =>
  isConfigured()
    ? env.PAYFAST_METHODS.split(",").map((s) => s.trim().toUpperCase()).filter((s) => ["CARD", "ACCOUNT", "WALLET"].includes(s))
    : [];

const assertConfigured = () => {
  if (!isConfigured()) throw gatewayError("PayFast is not configured on this server", 503);
  const c = cfg();
  if (c.env === "live" && !c.baseUrl.startsWith("https://")) throw gatewayError("PayFast live API must use HTTPS", 500);
  return c;
};

// secured_hash = HMAC-SHA256(key = SECURED_KEY (ASCII), message = fields joined in documented order).
// The docs say "concatenate with + operator" but do not specify a separator or output encoding, so both
// are configurable (defaults: no separator, hex). Confirm in UAT before going live.
export const buildSecuredHash = (fields, c = cfg()) => {
  const msg = fields.map((v) => (v === undefined || v === null ? "" : String(v))).join(c.hashSeparator);
  return crypto.createHmac("sha256", Buffer.from(c.securedKey, "ascii")).update(msg, "utf8").digest(c.hashEncoding);
};

let fetchImpl = (...a) => fetch(...a);
export const __setFetch = (fn) => {
  fetchImpl = fn || ((...a) => fetch(...a));
};

const isIp = (s) => /^[0-9a-fA-F:.]{3,45}$/.test(s || "");
export const clientIp = (req) => {
  const xff = String(req?.headers?.["x-forwarded-for"] || "").split(",")[0].trim();
  if (isIp(xff)) return xff;
  const ip = String(req?.ip || req?.socket?.remoteAddress || "").replace(/^::ffff:/, "");
  return isIp(ip) ? ip : "0.0.0.0";
};

const request = async (c, path, { method = "GET", token, form } = {}) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), c.timeoutMs);
  try {
    const headers = { "content-type": "application/x-www-form-urlencoded", accept: "application/json" };
    if (token) headers.authorization = `Bearer ${token}`;
    const res = await fetchImpl(`${c.baseUrl}${path}`, {
      method,
      headers,
      body: form && method !== "GET" ? new URLSearchParams(form).toString() : undefined,
      signal: ctrl.signal,
    });
    const text = await res.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
    return { httpStatus: res.status, ok: res.ok, body };
  } catch (e) {
    // never include request data in errors/logs
    throw gatewayError(e?.name === "AbortError" ? "PayFast request timed out" : "PayFast request failed", 504, { network: true });
  } finally {
    clearTimeout(timer);
  }
};

export const getAccessToken = async (ip) => {
  const c = assertConfigured();
  const r = await request(c, "/token", {
    method: "POST",
    form: { merchant_id: c.merchantId, secured_key: c.securedKey, grant_type: "client_credentials", customer_ip: ip },
  });
  if (!r.ok || !r.body?.token) throw gatewayError("PayFast authentication failed", 502);
  return r.body.token;
};

const INSTRUMENT_FIELDS = {
  CARD: ["card_number", "expiry_month", "expiry_year", "cvv"],
  ACCOUNT: ["account_number", "cnic_number", "bank_code", "account_type_id"],
  WALLET: ["account_number", "cnic_number", "bank_code", "account_type_id"],
};
export const allowedInstrumentFields = (type) => INSTRUMENT_FIELDS[type] || [];

// Step 1 of the tokenized flow (Scenario 1): temporary token + OTP / 3DS data.
export const createTransactionToken = async ({ ip, merchantUserId, mobile, accountType, instrument, basketId, orderDate, amount, callbackUrl }) => {
  const c = assertConfigured();
  const token = await getAccessToken(ip);
  const form = {
    merchant_user_id: merchantUserId,
    user_mobile_number: mobile,
    account_type: accountType,
    basket_id: basketId,
    order_date: orderDate,
    txnamt: amount,
    data_3ds_pagemode: "SIMPLE",
    data_3ds_callback_url: callbackUrl,
  };
  for (const k of allowedInstrumentFields(accountType)) if (instrument?.[k]) form[k] = String(instrument[k]);
  form.secured_hash = buildSecuredHash(
    [merchantUserId, mobile, ...allowedInstrumentFields(accountType).map((k) => form[k])],
    c,
  );
  const r = await request(c, "/transaction/token", { method: "POST", token, form });
  return normalize(r);
};

// Step 2: charge against the temporary token. Amount/basket always come from server-side records.
export const chargeTokenized = async ({ ip, instrumentToken, merchantUserId, mobile, basketId, orderDate, description, amount, otp, transactionId, eci, secureId, pares }) => {
  const c = assertConfigured();
  const token = await getAccessToken(ip);
  const form = {
    instrument_token: instrumentToken,
    merchant_user_id: merchantUserId,
    user_mobile_number: mobile,
    basket_id: basketId,
    order_date: orderDate,
    txndesc: description,
    txnamt: amount,
  };
  if (otp) form.otp = otp;
  if (transactionId) form.transaction_id = transactionId;
  if (eci) form.eci = eci;
  if (secureId) form.data_3ds_secureid = secureId;
  if (pares) form.data_3ds_pares = pares;
  form.secured_hash = buildSecuredHash([instrumentToken, merchantUserId, mobile, amount, otp || ""], c);
  const r = await request(c, "/transaction/tokenized", { method: "POST", token, form });
  return normalize(r);
};

export const fetchTransactionStatus = async ({ ip, transactionId, basketId }) => {
  const c = assertConfigured();
  const token = await getAccessToken(ip);
  const path = transactionId
    ? `/transaction/${encodeURIComponent(transactionId)}`
    : `/transaction/basket_id/${encodeURIComponent(basketId)}`;
  return normalize(await request(c, path, { method: "GET", token }));
};

export const refundTransaction = async ({ ip, transactionId, amount, reason }) => {
  const c = assertConfigured();
  const token = await getAccessToken(ip);
  const r = await request(c, `/transaction/refund/${encodeURIComponent(transactionId)}`, {
    method: "POST",
    token,
    form: { txnamt: amount, refund_reason: reason, customer_ip: ip },
  });
  return normalize(r);
};

const SAFE_KEYS = [
  "status_code", "status_msg", "code", "message", "basket_id", "transaction_id", "rdv_message_key",
  "otp_required", "eci", "isNon3DsCard", "data_3ds_acsurl", "data_3ds_secureid", "data_3ds_html",
  "instrument_token", "txnamt", "transaction_amount", "amount",
];
const normalize = ({ httpStatus, ok, body }) => {
  const b = body && typeof body === "object" ? body : {};
  const safe = {};
  for (const k of SAFE_KEYS) if (b[k] !== undefined) safe[k] = b[k];
  return {
    httpStatus,
    ok,
    code: b.status_code !== undefined && b.status_code !== null && b.status_code !== "" ? String(b.status_code) : b.code !== undefined && b.code !== null ? String(b.code) : null,
    message: b.status_msg || b.message || null,
    basketId: b.basket_id || null,
    transactionId: b.transaction_id ? String(b.transaction_id) : null,
    amountMinor: parseGatewayAmount(b),
    raw: safe, // allow-listed fields only
  };
};

const parseGatewayAmount = (b) => {
  const v = b.txnamt ?? b.transaction_amount ?? b.amount;
  if (v === undefined || v === null || v === "") return null;
  const m = String(v).trim().match(/^(\d+)(?:\.(\d{1,2}))?$/);
  return m ? Number(m[1]) * 100 + Number(((m[2] || "") + "00").slice(0, 2)) : NaN;
};

// maps a gateway code to our payment status; unknown codes are failures (never "paid")
export const classifyCode = (code) => {
  if (SUCCESS_CODES.has(code)) return "paid";
  if (PENDING_CODES.has(code)) return "pending";
  if (TIMEOUT_CODES.has(code)) return "timed_out";
  return "failed";
};
