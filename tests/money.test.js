import { describe, test, expect } from "bun:test";
import { parseAmountToMinor, formatMinor, splitByWeights, computeAllocations, reversedShare, discountedUnitMinor, pkrToMinor, minorToPkr } from "../src/modules/orders/money.js";

describe("money helpers", () => {
  test("parses and formats without float drift", () => {
    expect(parseAmountToMinor("100")).toBe(10000);
    expect(parseAmountToMinor("19.9")).toBe(1990);
    expect(parseAmountToMinor(0.1 + 0.2 > 0 ? "0.30" : "0")).toBe(30);
    expect(formatMinor(10005)).toBe("100.05");
    expect(formatMinor(5)).toBe("0.05");
    for (const bad of ["-1", "1.234", "abc", "", "1e3", NaN, "1,000"]) expect(() => parseAmountToMinor(bad)).toThrow();
  });
  test("discount computed in integer paisa", () => {
    expect(discountedUnitMinor(799.2000000001, 0)).toBe(79920);
    expect(discountedUnitMinor(1000, 15)).toBe(85000);
    expect(discountedUnitMinor(99.99, 33)).toBe(Math.round((9999 * 67) / 100));
    expect(minorToPkr(pkrToMinor(12.34))).toBe(12.34);
  });
  test("splitByWeights is exact and deterministic", () => {
    expect(splitByWeights(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(splitByWeights(0, [3, 5])).toEqual([0, 0]);
    for (let i = 0; i < 500; i++) {
      const total = Math.floor(Math.random() * 1e8);
      const w = Array.from({ length: 1 + (i % 6) }, () => 1 + Math.floor(Math.random() * 1e6));
      const parts = splitByWeights(total, w);
      expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
      expect(splitByWeights(total, w)).toEqual(parts);
    }
  });
  test("60/40 allocation, fee kept separate, remainder to PakBazaar", () => {
    const [a] = computeAllocations([{ shopId: "s1", grossMinor: 100000 }], 0);
    expect(a).toMatchObject({ distributableMinor: 100000, sellerShareMinor: 60000, platformShareMinor: 40000 });
    const [b] = computeAllocations([{ shopId: "s1", grossMinor: 100001 }], 2501);
    expect(b.distributableMinor).toBe(97500);
    expect(b.sellerShareMinor).toBe(58500);
    expect(b.platformShareMinor).toBe(39000);
    expect(b.gatewayFeeMinor + b.distributableMinor).toBe(b.grossMinor);
    const [c] = computeAllocations([{ shopId: "s1", grossMinor: 1001 }], 0); // 600.6 -> floor
    expect(c.sellerShareMinor).toBe(600);
    expect(c.platformShareMinor).toBe(401);
  });
  test("multi-shop fee split sums to the fee; platform-owned shop gets 100%", () => {
    const r = computeAllocations([{ shopId: "a", grossMinor: 70000 }, { shopId: "b", grossMinor: 30001, sellerBps: 0 }], 1001);
    expect(r.reduce((s, x) => s + x.gatewayFeeMinor, 0)).toBe(1001);
    expect(r[1].sellerShareMinor).toBe(0);
    expect(r[1].platformShareMinor).toBe(r[1].distributableMinor);
    for (const x of r) expect(x.sellerShareMinor + x.platformShareMinor).toBe(x.distributableMinor);
  });
  test("fee larger than gross rejected", () => {
    expect(() => computeAllocations([{ shopId: "a", grossMinor: 100 }], 101)).toThrow();
  });
  test("cumulative reversal never exceeds the share and full refund reverses exactly", () => {
    const share = 58501, gross = 97501;
    let prev = 0, refunded = 0;
    for (const part of [10000, 33333, 1, 54167]) {
      refunded += part;
      const cum = reversedShare(share, refunded, gross);
      expect(cum).toBeGreaterThanOrEqual(prev);
      prev = cum;
    }
    expect(refunded).toBe(gross);
    expect(prev).toBe(share);
  });
});
