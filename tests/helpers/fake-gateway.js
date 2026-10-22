// Scripted PayFast sandbox stand-in. No network is ever used by the tests.
import { __setFetch } from "../../src/modules/orders/payfast.client.js";

export const makeGateway = () => {
  const g = {
    calls: [],
    txns: new Map(), // basket_id -> { transaction_id, status_code, amount }
    behavior: { tokenize: "ok", charge: "ok", status: null, refund: "ok", tokenizeCode: "00" },
    reset() { g.calls = []; g.txns.clear(); g.behavior = { tokenize: "ok", charge: "ok", status: null, refund: "ok", tokenizeCode: "00" }; },
    count: (path) => g.calls.filter((c) => c.path === path).length,
  };
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  __setFetch(async (url, init) => {
    const path = new URL(url).pathname.replace(/^\/api/, "");
    const form = init.body ? Object.fromEntries(new URLSearchParams(init.body)) : {};
    g.calls.push({ path, method: init.method, form, auth: init.headers.authorization });
    if (path === "/token") return json({ token: "tok_" + Math.random().toString(36).slice(2), refresh_token: "r", expiry: 300 });
    if (path === "/transaction/token") {
      if (g.behavior.tokenize === "network") throw new Error("boom");
      if (g.behavior.tokenize === "reject") return json({ status_code: "14", status_msg: "Incorrect card details" }, 200);
      const transaction_id = "TX" + Math.random().toString(36).slice(2, 10).toUpperCase();
      g.txns.set(form.basket_id, { transaction_id, amount: form.txnamt, status_code: null });
      return json({ status_code: g.behavior.tokenizeCode, status_msg: "ok", instrument_token: "ITOK_SECRET", transaction_id, otp_required: true, eci: false, isNon3DsCard: true, data_3ds_secureid: undefined });
    }
    if (path === "/transaction/tokenized") {
      if (g.behavior.charge === "network") throw new Error("timeout");
      const t = g.txns.get(form.basket_id);
      const code = g.behavior.charge === "ok" ? "00" : g.behavior.charge === "pending" ? "001" : g.behavior.charge === "timeout" ? "002" : "55";
      if (t) t.status_code = code;
      return json({ status_code: code, status_msg: code === "00" ? "Processed OK" : "failed", basket_id: form.basket_id, transaction_id: t?.transaction_id });
    }
    if (path.startsWith("/transaction/basket_id/")) {
      const basket = decodeURIComponent(path.split("/").pop());
      const t = g.txns.get(basket);
      if (!t) return json({ code: "404" }, 404);
      const o = { status_code: t.status_code ?? "001", status_msg: "x", basket_id: basket, transaction_id: t.transaction_id, ...(g.behavior.status || {}) };
      return json(o);
    }
    if (path.startsWith("/transaction/refund/")) {
      if (g.behavior.refund === "network") throw new Error("timeout");
      if (g.behavior.refund === "reject") return json({ code: "423", message: "Unable to process" }, 400);
      if (g.behavior.refund === "5xx") return json({ message: "oops" }, 502);
      return json({ code: "00", message: "Refund accepted" });
    }
    return json({ message: "not found" }, 404);
  });
  return g;
};
