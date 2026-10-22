// In-memory stand-in for MongoDB used by the unit/integration tests. It patches the static query
// methods of the REAL mongoose models (so schema defaults, validation and index definitions are the
// real ones) with a tiny single-process implementation. It is NOT a MongoDB replacement:
// no real concurrency, no transactions, only the operators this codebase uses.
import mongoose from "mongoose";

const isId = (v) => v && typeof v === "object" && v._bsontype === "ObjectId";
const eq = (a, b) => {
  if (a instanceof Date || b instanceof Date) return new Date(a).getTime() === new Date(b).getTime();
  if (isId(a) || isId(b)) return String(a) === String(b);
  return a === b;
};
const getPath = (obj, path) => {
  let cur = [obj];
  for (const k of path.split(".")) {
    const next = [];
    for (const c of cur) {
      if (c === null || c === undefined) continue;
      if (Array.isArray(c) && Number.isNaN(Number(k))) for (const e of c) next.push(e?.[k]);
      else next.push(c[k]);
    }
    cur = next;
  }
  return cur;
};
const matchCond = (vals, cond) => {
  const arrayFlat = vals.flatMap((v) => (Array.isArray(v) ? v : [v]));
  if (cond && typeof cond === "object" && !isId(cond) && !(cond instanceof Date) && !Array.isArray(cond)) {
    return Object.entries(cond).every(([op, arg]) => {
      switch (op) {
        case "$in": return arg.some((x) => arrayFlat.some((v) => eq(v, x)));
        case "$nin": return !arg.some((x) => arrayFlat.some((v) => eq(v, x)));
        case "$ne": return !arrayFlat.some((v) => eq(v, arg));
        case "$gt": return arrayFlat.some((v) => v > arg);
        case "$gte": return arrayFlat.some((v) => v >= arg);
        case "$lt": return arrayFlat.some((v) => v !== null && v !== undefined && v < arg);
        case "$lte": return arrayFlat.some((v) => v <= arg);
        case "$exists": return arg ? arrayFlat.some((v) => v !== undefined) : !arrayFlat.some((v) => v !== undefined);
        case "$regex": return arrayFlat.some((v) => new RegExp(arg, cond.$options).test(String(v)));
        case "$options": return true;
        default: throw new Error(`fake-db: unsupported operator ${op}`);
      }
    });
  }
  if (cond === null) return arrayFlat.every((v) => v === null || v === undefined);
  return arrayFlat.some((v) => eq(v, cond));
};
export const matches = (doc, filter) =>
  Object.entries(filter || {}).every(([k, cond]) => {
    if (k === "$or") return cond.some((f) => matches(doc, f));
    if (k === "$and") return cond.every((f) => matches(doc, f));
    return matchCond(getPath(doc, k), cond);
  });

const clone = (v) => {
  if (Array.isArray(v)) return v.map(clone);
  if (v && typeof v === "object" && !isId(v) && !(v instanceof Date) && !Buffer.isBuffer(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clone(x)]));
  return v;
};
const setPath = (obj, path, val) => {
  const ks = path.split(".");
  let c = obj;
  for (let i = 0; i < ks.length - 1; i++) {
    if (c[ks[i]] === undefined || c[ks[i]] === null) c[ks[i]] = {};
    c = c[ks[i]];
  }
  c[ks.at(-1)] = val;
};
const applyUpdate = (doc, update) => {
  for (const [k, v] of Object.entries(update.$set || {})) setPath(doc, k, clone(v));
  for (const [k, v] of Object.entries(update.$inc || {})) setPath(doc, k, (getPath(doc, k)[0] || 0) + v);
  for (const [k, v] of Object.entries(update.$push || {})) {
    const cur = getPath(doc, k)[0];
    setPath(doc, k, [...(cur || []), clone(v)]);
  }
  doc.updatedAt = new Date();
};

export const installFake = (Model, { selectFalse = [] } = {}) => {
  const store = [];
  const uniques = Model.schema.indexes().filter(([, o]) => o && o.unique).map(([f]) => Object.keys(f));
  const dupCheck = (doc, ignore) => {
    for (const fields of uniques) {
      const tuple = fields.map((f) => getPath(doc, f)[0]);
      if (tuple.some((t) => t === null || t === undefined)) continue;
      if (store.some((d) => d !== ignore && fields.every((f, i) => eq(getPath(d, f)[0], tuple[i])))) throw Object.assign(new Error(`E11000 duplicate key ${fields}`), { code: 11000 });
    }
  };
  const out = (d, q) => {
    const c = clone(d);
    for (const f of selectFalse) if (!q.plus.includes(f)) delete c[f];
    return c;
  };
  class Q {
    constructor(run) { this.run = run; this.plus = []; this.sortSpec = null; this.skipN = 0; this.limitN = Infinity; this.isLean = false; }
    lean() { this.isLean = true; return this; }
    select(s) { for (const m of String(s).match(/\+\w+/g) || []) this.plus.push(m.slice(1)); return this; }
    sort(s) { this.sortSpec = s; return this; }
    skip(n) { this.skipN = n; return this; }
    limit(n) { this.limitN = n; return this; }
    populate() { return this; }
    then(res, rej) { return Promise.resolve().then(() => this.run(this)).then(res, rej); }
    catch(rej) { return this.then(undefined, rej); }
  }
  const findAll = (filter, q) => {
    let rows = store.filter((d) => matches(d, filter));
    if (q.sortSpec) {
      const [[k, dir]] = Object.entries(q.sortSpec);
      rows = [...rows].sort((a, b) => ((a[k] > b[k]) - (a[k] < b[k])) * dir);
    }
    return rows.slice(q.skipN, q.skipN + q.limitN);
  };
  const wrap = (obj) => Object.defineProperty(obj, "toObject", { value: () => clone(obj), enumerable: false });

  Model.__store = store;
  Model.__reset = () => { store.length = 0; };
  Model.create = async (data) => {
    const m = new Model(data);
    await m.validate();
    const obj = m.toObject();
    obj.createdAt = obj.createdAt || new Date();
    obj.updatedAt = new Date();
    dupCheck(obj);
    store.push(obj);
    return wrap(clone(obj));
  };
  Model.findById = (id) => new Q((q) => { const d = store.find((x) => eq(x._id, id)); return d ? out(d, q) : null; });
  Model.findOne = (f) => new Q((q) => { const d = findAll(f, { ...q, limitN: 1, skipN: 0 })[0]; return d ? out(d, q) : null; });
  Model.find = (f) => new Q((q) => findAll(f, q).map((d) => out(d, q)));
  Model.countDocuments = (f) => Promise.resolve(store.filter((d) => matches(d, f)).length);
  Model.findOneAndUpdate = (f, upd, opts = {}) => new Q((q) => {
    const d = store.find((x) => matches(x, f));
    if (!d) return null;
    const before = clone(d);
    const draft = clone(d);
    applyUpdate(draft, upd);
    dupCheck(draft, d);
    Object.assign(d, draft);
    return out(opts.new ? d : before, q);
  });
  Model.updateOne = async (f, upd) => {
    const d = store.find((x) => matches(x, f));
    if (!d) return { matchedCount: 0, modifiedCount: 0 };
    const draft = clone(d);
    applyUpdate(draft, upd);
    dupCheck(draft, d);
    Object.assign(d, draft);
    return { matchedCount: 1, modifiedCount: 1 };
  };
  Model.updateMany = async (f, upd) => {
    const rows = store.filter((x) => matches(x, f));
    rows.forEach((d) => applyUpdate(d, upd));
    return { matchedCount: rows.length, modifiedCount: rows.length };
  };
  Model.deleteOne = async (f) => { const i = store.findIndex((x) => matches(x, f)); if (i >= 0) store.splice(i, 1); return { deletedCount: i >= 0 ? 1 : 0 }; };
  return Model;
};

export const oid = () => new mongoose.Types.ObjectId();
