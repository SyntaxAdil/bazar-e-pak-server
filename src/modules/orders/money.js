// Monetary helpers. All internal amounts are INTEGER PAISA (PKR minor units).
// Floating point is only used at the boundary (legacy Number price fields).
export const CURRENCY = "PKR";
export const SELLER_BPS = 6000; // 60% seller
export const PLATFORM_BPS = 4000; // 40% PakBazaar
export const BPS_TOTAL = 10000;

export const moneyError = (message, statusCode = 400) =>
  Object.assign(new Error(message), { statusCode });

// multiply-then-divide without losing precision (BigInt), floor division.
export const mulDivFloor = (a, b, c) => {
  if (!Number.isInteger(a) || !Number.isInteger(b) || !Number.isInteger(c) || c === 0)
    throw moneyError("Invalid monetary operation", 500);
  return Number((BigInt(a) * BigInt(b)) / BigInt(c));
};

// legacy PKR float (e.g. 799.2000000001) -> integer paisa
export const pkrToMinor = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw moneyError("Invalid amount");
  return Math.round(n * 100);
};

// client-supplied amount: number or string with at most 2 decimals -> paisa
export const parseAmountToMinor = (input) => {
  const s = typeof input === "number" ? String(input) : input;
  if (typeof s !== "string" || !/^\d{1,10}(\.\d{1,2})?$/.test(s.trim()))
    throw moneyError("Amount must be a positive number with at most 2 decimals");
  const [whole, frac = ""] = s.trim().split(".");
  const minor = Number(whole) * 100 + Number((frac + "00").slice(0, 2));
  if (!Number.isSafeInteger(minor)) throw moneyError("Invalid amount");
  return minor;
};

export const minorToPkr = (minor) => Number((minor / 100).toFixed(2)); // display / legacy fields
export const formatMinor = (minor) => {
  if (!Number.isInteger(minor) || minor < 0) throw moneyError("Invalid amount", 500);
  return `${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, "0")}`;
};

// unit price after percentage discount, computed in integer paisa
export const discountedUnitMinor = (price, discountPercent = 0) => {
  const base = pkrToMinor(price);
  const d = Math.min(100, Math.max(0, Number(discountPercent) || 0));
  return Math.round((base * (100 - d)) / 100);
};

// Largest-remainder split of `total` by integer weights. Deterministic: ties go
// to the lowest index. Sum of result === total.
export const splitByWeights = (total, weights) => {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (!weights.length || sum <= 0) return weights.map(() => 0);
  const base = weights.map((w) => mulDivFloor(total, w, sum));
  let rest = total - base.reduce((a, b) => a + b, 0);
  const order = weights
    .map((w, i) => ({ i, rem: Number((BigInt(total) * BigInt(w)) % BigInt(sum)) }))
    .sort((x, y) => y.rem - x.rem || x.i - y.i);
  for (let k = 0; rest > 0; k = (k + 1) % order.length, rest--) base[order[k].i] += 1;
  return base;
};

// 60/40 allocation per shop. Platform-owned shops (no seller) pass sellerBps = 0.
// fee is split pro-rata by gross; seller share is floored, PakBazaar gets the remainder.
export const computeAllocations = (shops, feeMinor = 0) => {
  const grosses = shops.map((s) => s.grossMinor);
  const totalGross = grosses.reduce((a, b) => a + b, 0);
  if (feeMinor < 0 || feeMinor > totalGross) throw moneyError("Gateway fee exceeds order amount", 400);
  const fees = splitByWeights(feeMinor, grosses);
  return shops.map((s, i) => {
    const distributableMinor = s.grossMinor - fees[i];
    const sellerBps = s.sellerBps ?? SELLER_BPS;
    const sellerShareMinor = mulDivFloor(distributableMinor, sellerBps, BPS_TOTAL);
    return {
      shopId: s.shopId,
      grossMinor: s.grossMinor,
      gatewayFeeMinor: fees[i],
      distributableMinor,
      sellerBps,
      platformBps: BPS_TOTAL - sellerBps,
      sellerShareMinor,
      platformShareMinor: distributableMinor - sellerShareMinor,
    };
  });
};

// cumulative share reversed after `refundedGrossMinor` of `grossMinor` refunded
export const reversedShare = (shareMinor, refundedGrossMinor, grossMinor) =>
  grossMinor === 0 ? 0 : mulDivFloor(shareMinor, refundedGrossMinor, grossMinor);

export const pktDate = (d = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
