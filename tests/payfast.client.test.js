import { describe, test, expect } from "bun:test";
import crypto from "node:crypto";
import { buildSecuredHash, classifyCode, clientIp, isConfigured, enabledAccountTypes } from "../src/modules/orders/payfast.client.js";

describe("PayFast client", () => {
  test("secured_hash is HMAC-SHA256 over concatenated documented fields", () => {
    const cfg = { securedKey: "k3y", hashSeparator: "", hashEncoding: "hex" };
    const expected = crypto.createHmac("sha256", "k3y").update("tokabcuser0345100.00").digest("hex");
    expect(buildSecuredHash(["tok", "abc", "user", "0345", "100.00", undefined], cfg)).toBe(expected);
    expect(buildSecuredHash(["a", "b"], { ...cfg, hashSeparator: "|", hashEncoding: "base64" })).toBe(crypto.createHmac("sha256", "k3y").update("a|b").digest("base64"));
  });
  test("status code classification: only documented success codes are paid", () => {
    expect(classifyCode("00")).toBe("paid");
    expect(classifyCode("79")).toBe("paid");
    expect(classifyCode("001")).toBe("pending");
    expect(classifyCode("002")).toBe("timed_out");
    for (const c of ["55", "14", "9000", "423", "", null, "0", "000", "OK", "success"]) expect(classifyCode(c)).toBe("failed");
  });
  test("client ip extraction rejects junk", () => {
    expect(clientIp({ headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" } })).toBe("203.0.113.7");
    expect(clientIp({ headers: { "x-forwarded-for": "<script>" }, ip: "::ffff:198.51.100.2" })).toBe("198.51.100.2");
    expect(clientIp({ headers: {} })).toBe("0.0.0.0");
  });
  test("configured via env; methods list limited to documented account types", () => {
    expect(isConfigured()).toBe(true);
    expect(enabledAccountTypes()).toEqual(["CARD", "ACCOUNT", "WALLET"]);
  });
});
