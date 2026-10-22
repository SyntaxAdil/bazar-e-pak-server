# Orders, Payments (COD + Premier PayFast), Ledger, Refunds, Settlement tracking

> Replaces the former "future-ready only" note. This module now exposes real checkout, payment, refund and finance
> endpoints. Frontend contract: `/FRONTEND_INTEGRATION_AGENT.md` (backend root). The repository had no root `README.md`;
> this is the existing orders-module README, updated.

## 1. What is implemented
| Area | Status |
|---|---|
| Checkout from cart (server-side pricing, stock reservation, idempotency key) | implemented |
| COD (never "paid" on placement; admin records collection; manual COD refunds) | implemented |
| PayFast tokenized API flow (token → OTP/3-D Secure → charge → status verification) | implemented, **needs merchant credentials + UAT** |
| Server-side verification, idempotent status transitions, duplicate/concurrent protection | implemented, unit/integration tested with mocks |
| Full/partial refunds through PayFast refund API (+ reconciliation for unknown outcomes) | implemented, **not exercised against the real gateway** |
| 60% Seller / 40% PakBazaar allocation, gateway fee, provisional→final accounting, append-only ledger | implemented |
| Settlement **tracking** (admin records out-of-band payouts) | implemented; no automatic payout |
| Seller / admin / super_admin finance endpoints | implemented |
| Payment-proof upload & private retrieval (GridFS) | implemented |
| DB backup/restore scripts | provided; **scheduling is NOT configured by this change** |

## 2. Verified PayFast architecture (official sources)
Sources: <https://uat.premierpayfast.com/developers/> (API v2.3), <https://premierpayfast.com/faqs/>, <https://premierpayfast.com/onecheckout/>.

Verified in the developer docs: `POST /token` (merchant_id + secured_key → bearer token, needs `customer_ip`), `POST /transaction/token`,
`POST /transaction/tokenized` (OTP, 3-D Secure `data_3ds_pagemode` SIMPLE/CUSTOMIZED, `data_3ds_secureid`, `data_3ds_pares`),
`GET /transaction/{id}` and `/transaction/basket_id/{basket}`, `POST /transaction/refund/{id}` (`txnamt`, `refund_reason`, `customer_ip`),
HMAC-SHA256 `secured_hash`, status codes (`00`/`79` success, `001` pending, `002` timeout). FAQ: cards (Visa/MasterCard 3DS, UnionPay, PayPak),
bank transfers, JazzCash, Easypaisa, Raast; settlement T+2 working days; refunds initiated by the merchant, 7–21 working days; NTN mandatory; PKR 20,000 setup fee.

**Important consequences**
* The documented API is *merchant-built checkout*: the merchant collects instrument details and posts them to PayFast. There is **no documented hosted-redirect checkout API**
  (the marketing "OneCheckout" page has no technical docs). Therefore raw card data transits this backend in memory only (never stored, never logged; only last-4 kept).
  This puts the backend in PCI-DSS scope — ask PayFast for their hosted/OneCheckout integration docs; if provided, replace `createTransactionToken/chargeTokenized`.
* The docs give **relative paths only** → `PAYFAST_API_BASE_URL` must come from PayFast. Sandbox vs live = different base URL + credentials, no code change.
* `secured_hash`: docs say "concatenate with +" and HMAC-SHA256 with the ASCII key, but not separator/output encoding → `PAYFAST_HASH_SEPARATOR` (default none) and `PAYFAST_HASH_ENCODING` (default hex). **Confirm in UAT.**
  Per-endpoint field order follows the docs table; wallet/account field names are not fully documented — verify in UAT.
* The status-response sample has **no amount field**. If PayFast returns `txnamt`/`amount` we compare it (mismatch ⇒ `invalid`); otherwise the amount is guaranteed only because the
  server sent its own trusted `txnamt` (`amountVerification: "request_only"`).
* No documented webhook/IPN signature → no webhook endpoint exists. Final state is decided only by the status API (`/payments/payfast/:id/status`, polled by the frontend).
  The 3-D Secure return URL stores PaRes only and never marks anything paid.
* **Unverified / not implemented (BLOCKED until PayFast confirms in writing):** automatic seller payouts, split payments, sub-merchant/marketplace settlement,
  gateway-fee lookup API, settlement-report API, partial capture. Wallet/Raast/bank flows beyond `CARD|ACCOUNT|WALLET` account types.
  The internal ledger and settlement tracking are therefore independent of any gateway payout.

## 3. Lifecycles
**Order**: `pending`(PayFast, unpaid) / `confirmed`(COD) → `confirmed` (paid) → `processing`/`shipped`/`delivered` (set by other modules) ; `cancelled`; `refunded` (full refund).
**Order.paymentStatus**: `unpaid → pending → paid | failed` (retry creates a new Payment/basket), `cod_pending → paid`, `partially_refunded`, `refunded`, `cancelled`.
**Payment.status**: `pending → paid | failed | timed_out | invalid | cancelled`; `paid → partially_refunded → refunded`. Stage: `created → tokenized → charge_submitted → verified`.
* Only the caller that wins a conditional update (`pending → paid`) finalises; ledger writes are keyed by unique `idempotencyKey`, and `ensureFinancials` repairs a crash between the two steps.
* `charge_submitted` is set by a compare-and-set before calling the gateway ⇒ at most one charge per payment; a network timeout never re-sends the charge — the status API resolves it.
* Admin `POST /finance/admin/payments/:id/verify` may recover a payment wrongly marked failed/timed-out if the gateway later reports success.
* Stock is reserved at checkout and released once on cancel/expiry (`POST /finance/admin/maintenance/expire-stale-orders`; no scheduler exists — call it from cron).
* A payment that succeeds after its order was cancelled is flagged `PAID_AFTER_ORDER_CANCELLED` for staff refund.

## 4. Money, 60/40 and ledger
* All amounts: **integer paisa** (`*Minor`), currency `PKR`. Legacy PKR `Number` fields are kept for compatibility. No floating point in totals (BigInt for products).
* Per (order, shop) `OrderAllocation`: `gross`, `gatewayFee` (pro-rata across shops, largest remainder), `distributable = gross − fee`,
  `seller = floor(distributable × 60%)`, `platform = distributable − seller` (rounding remainder goes to PakBazaar). No explicit business rule existed in the repo, so: shops with no seller (`source: "pakbazaar"`) allocate 100% to PakBazaar.
* The real gateway fee is unknown to the API. Until an admin records it (`POST /finance/admin/payments/:id/gateway-fee`), allocation is **provisional** (fee = `PAYFAST_ESTIMATED_FEE_BPS`, default 0, `feeSource` none/estimated). Recording it makes it **final** and posts delta ledger entries. Not allowed after a refund/settlement exists.
* Refunds reverse seller/platform shares proportionally (cumulative floor, exact on full refund); the gateway fee is assumed non-refundable (unverified).
* `LedgerEntry` is append-only with unique `idempotencyKey`. Types: charge, gateway_fee, seller_share, platform_share, refund, *_reversal, fee_adjustment, settlement.
* COD: cash is collected outside PayFast, so the 60/40 allocation is recorded when an admin marks collection, but COD is excluded from settlements and shown as a separate manual receivable in summaries.
* Settlement (`SellerSettlement`): eligible = PayFast allocations with final fee, unsettled, no refund in flight. `paid` requires a bank-transfer reference typed by an admin; **the backend never moves money.**

## 5. Endpoints (all under `/api`, JSON `{success,message,data[,pagination]}`)
See `/FRONTEND_INTEGRATION_AGENT.md` for full request/response schemas.
| Method & path | Who |
|---|---|
| `GET /payments/methods` | public |
| `POST /orders/checkout` | customer |
| `GET /orders`, `GET /orders/:id` | customer (own) · seller (own-shop items only) · admin with `orders.view` / super_admin |
| `POST /orders/:id/cancel`, `POST /orders/:id/refund-requests` | customer (own) |
| `POST /payments/payfast/initiate`, `/:paymentId/confirm`, `/:paymentId/cancel` | customer (own), rate-limited |
| `GET /payments/payfast/:paymentId/status` | customer (own) · staff with `payments.view` |
| `ALL /payments/payfast/3ds-callback?p&t` | public, one-time token, never marks paid |
| `POST/GET /orders/:id/payment-proofs`, `GET /payments/proofs/:proofId/file` | owner customer · staff `payments.view` (sellers: no access) |
| `GET /finance/seller/{summary,orders,allocations,transactions,refunds,settlements}` | seller (own shop derived from login) |
| `GET /finance/admin/shops`, `/shops/:shopId`, `/shops/:shopId/{orders,allocations,transactions,refunds,settlements}` | `payments.view` |
| `GET /finance/admin/payments`, `/payments/:id`; `POST …/verify`, `…/gateway-fee` | view / `payments.manage` |
| `POST /finance/admin/orders/:id/cod-collected` | `payments.manage` |
| `POST /finance/admin/orders/:id/refunds`; `GET /admin/refunds`; `POST /admin/refunds/:id/{process,reject,reconcile}` | `payments.refund` (view: `payments.view`) |
| `GET/POST /finance/admin/settlements`, `PATCH /admin/settlements/:id` | `payments.view` / `settlements.manage` |
| `PATCH /finance/admin/payment-proofs/:id`, `POST /finance/admin/maintenance/expire-stale-orders` | `payments.manage` |

Roles reuse the existing ones: `customer`, `seller`, `admin` (needs the new permissions below), `super_admin` (= the "Developer/Super Admin"; always allowed).
New admin permissions (grantable by the super admin through the existing permissions endpoint): `orders.view`, `payments.view`, `payments.refund`, `payments.manage`, `settlements.manage`.

## 6. Environment
See `.env.payfast.example`. PayFast stays disabled unless `PAYFAST_ENABLED=true` **and** base URL, merchant id and secured key are set; `/payments/methods` only advertises what is configured. Secrets are read server-side only and never returned or logged. `SERVER_URL` must be the public https origin of this API (used to build the 3-D Secure return URL).

## 7. Payment proofs
Raw image body (`image/jpeg|png|webp`, ≤3 MB, magic-byte checked, max 5 per order) → stored in MongoDB **GridFS** (bucket `paymentProofs`) because the repo has no object-storage provider and a serverless-style entrypoint with no persistent disk; metadata lives in `PaymentProof`. Files are served only by the authenticated route with `Cache-Control: private, no-store`. A proof is evidence only and never changes payment state.
To use S3/R2 instead, replace `proof.storage.js` (needs a new dependency and credentials).

## 8. Backup & recovery (`scripts/backup/`)
The database is MongoDB (db `pakBazar`; the DNS override in `database.js` suggests an Atlas `mongodb+srv` URI — confirm your hosting). **No scheduled backup is configured by this change.** Verify whether your Atlas tier has Cloud Backup enabled; otherwise schedule `mongo-backup.sh` (cron/GitHub Actions/CI) from a secure host with MongoDB Database Tools.
* Backup: `DATABASE_URL=… BACKUP_DIR=/secure/dir scripts/backup/mongo-backup.sh` (gzip archive + sha256, retention `BACKUP_RETENTION_DAYS`, default 14; refuses to write inside the repo; URI passed via a private temp file).
* Verify: `scripts/backup/mongo-verify.sh <archive>` (checksum + `mongorestore --dryRun`).
* Restore: `RESTORE_DATABASE_URL=… scripts/backup/mongo-restore.sh <archive>` restores into `pakBazar_restore_check`; overwriting live data needs `--in-place --confirm-restore`.
* After a restore compare collection counts and run the ledger sanity check (for each `OrderAllocation`: `gross − fee = distributable`, `seller + platform = distributable`, ledger net per shop = allocation shares — see `validateLedgerConsistency`).
* Recommended: daily dump, ≥14 days retention, off-site copy, quarterly restore drill. No export/restore HTTP endpoint exists or should be added.

## 9. Tests
`bun test` → 72 tests, 6 files (money/rounding, gateway client, payment flows incl. failed/pending/timeout/cancelled/amount-mismatch/duplicate/concurrent, COD, refunds incl. limits/retries/failures/reconciliation, 60/40 + fee + ledger consistency, settlement, HTTP-level authorization & seller isolation, proof upload/access, 3-D Secure callback, backup-script safety).
Gateway is mocked; **MongoDB is replaced by an in-memory stand-in** (`tests/helpers/fake-db.js`) that patches the real models' query methods — real concurrency, indexes and transactions were **not** exercised. Run an integration pass against a staging MongoDB and the PayFast UAT before production. Not run: lint (none configured), real PayFast sandbox, real MongoDB, real `mongodump`.

## 10. Research checklist
| Item | Status |
|---|---|
| Read official developer docs, FAQ, OneCheckout page | COMPLETED |
| Token/tokenized/status/refund endpoints, hash, 3DS modes | COMPLETED (documented) |
| API base URL, sandbox credentials | BLOCKED – from PayFast |
| `secured_hash` separator/encoding, wallet/account field names, status payload amount | IN PROGRESS – confirm in UAT |
| Hosted checkout / webhooks | BLOCKED – undocumented; ask PayFast |
| Split payments / seller payouts / marketplace | BLOCKED – unverified, not implemented |
| Gateway-fee & settlement report API | BLOCKED – unverified; admin enters actual fee |
| Real sandbox end-to-end run | REMAINING |
| Atlas backup schedule | REMAINING (infrastructure) |

## 11. Known limitations
No order-fulfilment status endpoints for sellers (statuses beyond payment are managed elsewhere); one global rate limiter + a payment limiter, no `trust proxy` setting (client IP comes from `x-forwarded-for`); stale-order expiry needs an external scheduler; refund/gateway-fee-after-refund edge cases require manual ledger adjustments; frontend must implement `/checkout/payment-result`.

## 12. Deployment steps
1. Copy files to the same relative paths. 2. Add env vars (§6). 3. Deploy; indexes build on first model use (`autoIndex` default). 4. Grant admin permissions. 5. Run PayFast UAT with sandbox credentials, confirm hash format, then set `PAYFAST_ENV=live` + live URL/keys. 6. Schedule expiry job + backups.
