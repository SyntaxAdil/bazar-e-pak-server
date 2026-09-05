# Bazar-e-Pak Backend — Overall API Architecture & API Documentation

> **Project:** Bazar-e-Pak / PakBazaar  
> **Source:** Final `bazar-e-pak-server-final.zip` supplied for this project  
> **Style:** REST API · Modular MVC · JavaScript ES Modules  
> **Runtime:** Bun / Node-compatible  
> **Framework:** Express 5  
> **Database:** MongoDB + Mongoose  
> **Validation:** Zod  
> **Authentication:** Next.js Better Auth; Express verifies the authenticated credential/session  

## 1. Purpose

This is the overall API architecture and frontend-integration reference for the final Bazar-e-Pak backend. It documents the route map, authentication/authorization model, module responsibilities, request flow, pagination/search/filter/sort conventions, analytics, audit, CMS, campaigns, offers, notifications, order/payment-ready architecture, and frontend integration rules.

**Source-of-truth rule:** when an exact field, response property, validation rule, or implementation detail differs from this overview, the final backend source code is authoritative.

---

## 2. High-Level Architecture

```text
Next.js Frontend
      │
      │ Better Auth session/token
      ▼
Express REST API
      │
      ├── Helmet / CORS / Rate Limit
      ├── Authentication
      ├── Role / Permission checks
      ├── Ownership checks
      ├── Validation
      ▼
Routes → Controllers → Services → Repositories/Models
                                      │
                                      ▼
                                  MongoDB

Cross-cutting:
  Analytics Events · Audit Logs · Error Handling · System Metrics
```

### Request lifecycle

```text
Client
 → Security middleware
 → Authentication
 → Role/permission authorization
 → Resource ownership
 → Validation
 → Controller
 → Service/business logic
 → Model/repository
 → MongoDB
 → Response
```

Privileged mutations also create audit records where required; meaningful user interactions create analytics events.

---

## 3. Backend Structure

```text
src/
├── app.js
├── server.js
├── config/
├── lib/
├── middlewares/
├── schemas/
├── utils/
├── routes/index.js
└── modules/
    ├── products/
    ├── shops/
    ├── category/
    ├── reviews/
    ├── cart/
    ├── users/
    ├── seller-applications/
    ├── analytics/
    ├── audit/
    ├── campaigns/
    ├── cms/
    ├── team/
    ├── notifications/
    ├── search-analytics/
    ├── system-health/
    ├── offers/
    ├── settings/
    ├── search/
    └── orders/
```

---

## 4. Base URL

API routes are mounted under:

```text
/api
```

Health endpoint:

```text
GET /health
```

Frontend should use an environment variable such as:

```env
NEXT_PUBLIC_SERVER_URL=http://localhost:5000
```

and call:

```js
`${process.env.NEXT_PUBLIC_SERVER_URL}/api/...`
```

Do not hardcode the production API host in components.

---

## 5. Authentication

Authentication remains in **Next.js Better Auth**. The Express server does **not** implement a second authentication system.

Conceptual protected request:

```http
Authorization: Bearer <authenticated-token>
```

The backend verifies the credential, resolves the user, checks current account state, then applies role/permission and ownership rules.

```text
Authentication = Who are you?
Authorization  = What may you do?
Ownership      = Which resource may you control?
```

---

## 6. Roles

| Role | Scope |
|---|---|
| `customer` | Public marketplace + own customer resources |
| `seller` | Own shop/products/offers/analytics |
| `admin` | Permission-scoped platform management |
| `super_admin` | Complete platform authority |

### Super Admin

Exactly one Super Admin is protected as the highest authority. It can manage users, admins, sellers, shops, products, native products/shops, categories, reviews, offers, campaigns, CMS, team, analytics, audit logs, settings and platform operations.

### Admin

Admins are below Super Admin. Their management capabilities are permission-scoped and do not automatically include Super Admin management or critical platform configuration.

### Seller

Seller access is ownership-scoped. A seller cannot access or mutate another seller's business resources by changing an ID in the request.

### Customer

Customers can browse the marketplace, search, use their cart and perform permitted customer actions such as review creation.

---

## 7. API Response Convention

Successful responses generally use:

```json
{
  "success": true,
  "data": {}
}
```

Mutations may also return a message:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

List responses commonly include:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

Use the exact response shape of the implemented endpoint when writing frontend code.

### Common status codes

| Code | Meaning |
|---:|---|
| 200 | Success |
| 201 | Created |
| 202 | Accepted/tracking event |
| 400 | Bad request |
| 401 | Unauthenticated |
| 403 | Forbidden |
| 404 | Not found |
| 409 | Conflict |
| 422 | Validation/business-rule failure |
| 429 | Rate limited |
| 500 | Server error |

---

## 8. Pagination / Search / Filter / Sort

Collections are paginated by the backend.

```text
?page=1&limit=20
```

Typical limits are bounded server-side; the final implementation commonly caps `limit` at 100.

Never fetch an entire collection and paginate it in React.

### Common query concepts

```text
search
page
limit
sortBy
sortOrder
```

### Product filters

```text
category
shop
seller
status
featured
rating
price
stock
```

### User filters

```text
role
status
date
```

### Shop filters

```text
status
seller
rating
date
```

### Review filters

```text
rating
product
shop
seller
date
```

---

# 9. API Route Inventory

All routes below are prefixed by the API base `/api`.

## 9.1 Products

**Base:** `/api/products`

| Method | Endpoint | Access / purpose |
|---|---|---|
| GET | `/api/products` | Public product list |
| GET | `/api/products/:id` | Public product details |
| GET | `/api/products/seller` | Seller's products; seller only |
| GET | `/api/products/best-selling` | Best-selling products |
| GET | `/api/products/trending` | Trending products |
| POST | `/api/products` | Seller/Super Admin create |
| PATCH | `/api/products/:id` | Seller/Super Admin update; ownership enforced |
| DELETE | `/api/products/:id` | Seller/Admin/Super Admin delete according to backend rules |
| PATCH | `/api/products/:id/featured` | **Super Admin only** |
| POST | `/api/products/:id/track` | Product interaction tracking |

Product data covers price, discount, stock, images, category, shop, seller, status, ratings/review counts, featured state and analytics-related fields.

### Featured

Only `super_admin` may feature/unfeature a product or control featured priority.

### Trending

Trending uses recent engagement signals such as product views, clicks and add-to-cart activity, with rating eligibility. A single five-star review must not automatically dominate the ranking.

### Best selling

Best-selling represents actual purchase/order activity. It must not silently use rating as fake sales data.

---

## 9.2 Native Products

**Base:** `/api/native-products`

| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/native-products` | Public |
| POST | `/api/native-products` | Super Admin |
| PATCH | `/api/native-products/:id` | Super Admin |
| DELETE | `/api/native-products/:id` | Super Admin |

Native products are PakBazaar-owned products and support full CRUD.

---

## 9.3 Shops

**Base:** `/api/shops`

| Method | Endpoint | Access / purpose |
|---|---|---|
| GET | `/api/shops` | Public shop list |
| GET | `/api/shops/slug/:slug` | Shop by slug |
| GET | `/api/shops/:shopId` | Shop details |
| POST | `/api/shops` | Seller creates shop |
| PATCH | `/api/shops/:shopId` | Seller/Super Admin update; ownership applies |
| DELETE | `/api/shops/:shopId` | Seller/Super Admin delete; ownership applies |
| PATCH | `/api/shops/:shopId/status` | Super Admin status management |
| POST | `/api/shops/:shopId/track` | Shop interaction tracking |

Shop/business information can include name, slug, logo, cover, gallery, description, contact data, WhatsApp, website, social links, location, hours, ratings and seller relationship.

---

## 9.4 Native Shops

**Base:** `/api/native-shops`

| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/native-shops` | Public |
| POST | `/api/native-shops` | Super Admin |
| PATCH | `/api/native-shops/:id` | Super Admin |
| DELETE | `/api/native-shops/:id` | Super Admin |

Native shops represent PakBazaar-owned business entities.

---

## 9.5 Categories

**Base:** `/api/categories`

| Method | Endpoint | Access / purpose |
|---|---|---|
| GET | `/api/categories` | Public category list |
| GET | `/api/categories/:id` | Category details |
| GET | `/api/categories/slug/:slug` | Category by slug |
| POST | `/api/categories/:id/track` | Category view event |
| POST | `/api/categories` | Super Admin create |
| PATCH | `/api/categories/:id` | Super Admin update |
| DELETE | `/api/categories/:id` | Super Admin delete |

Category deletion must respect product references.

---

## 9.6 Reviews

**Base:** `/api/reviews`

| Method | Endpoint | Access / purpose |
|---|---|---|
| GET | `/api/reviews` | Public review listing according to publication rules |
| GET | `/api/reviews/:id` | Review details |
| POST | `/api/reviews` | Customer create |
| DELETE | `/api/reviews/:id` | Customer/Admin/Super Admin according to ownership/permission rules |
| PATCH | `/api/reviews/:id/moderation` | Admin/Super Admin moderation |

Sellers may view reviews/statistics for their own business but must not use seller access to manipulate ratings or moderate their own reviews.

Rating caches should reflect valid/published review data.

---

## 9.7 Cart

**Base:** `/api/cart`

| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/cart` | Customer |
| POST | `/api/cart/items` | Customer |
| PATCH | `/api/cart/items/:productId` | Customer |
| DELETE | `/api/cart/items/:productId` | Customer |
| DELETE | `/api/cart` | Customer |

The backend revalidates product existence, active/deleted state, stock and current price. Client-side price data is not authoritative.

---

## 9.8 Users

**Base:** `/api/users`

| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/users` | Admin/Super Admin |
| PATCH | `/api/users/:userId/status` | Admin/Super Admin |
| PATCH | `/api/users/:userId/permissions` | Super Admin |
| PATCH | `/api/users/:userId/role` | Super Admin |

The sole Super Admin must be protected against accidental demotion/deletion and role escalation conflicts.

---

## 9.9 Seller Applications

**Base:** `/api/seller-applications`

| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/seller-applications` | Customer |
| GET | `/api/seller-applications/me` | Customer/Seller |
| GET | `/api/seller-applications` | Super Admin |
| PATCH | `/api/seller-applications/:id` | Super Admin |

Lifecycle:

```text
Customer → Pending → Approved / Rejected / Suspended
```

Application history includes review information and rejection reason where applicable. Duplicate pending/active applications should be prevented.

---

## 9.10 Analytics

**Base:** `/api/analytics`

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/analytics/events` | Record analytics event |
| GET | `/api/analytics` | Analytics query |
| GET | `/api/analytics/dashboard` | Dashboard analytics |
| GET | `/api/analytics/products/:id` | Product analytics |
| GET | `/api/analytics/shops/:id` | Shop analytics |
| GET | `/api/analytics/seller` | Seller analytics |
| GET | `/api/analytics/rankings/products` | Product rankings |

Analytics dashboards are role-restricted and seller data must be isolated to the authenticated seller.

### Event types

```text
PRODUCT_VIEW
PRODUCT_CLICK
SHOP_VIEW
SHOP_CLICK
WHATSAPP_CLICK
CALL_CLICK
WEBSITE_CLICK
LOCATION_CLICK
YOUTUBE_CLICK
SOCIAL_CLICK
SHARE
SEARCH
CATEGORY_VIEW
ADD_TO_CART
REVIEW_CREATED
ORDER_CREATED
ORDER_COMPLETED
```

Example event:

```json
{
  "eventType": "PRODUCT_VIEW",
  "productId": "...",
  "shopId": "...",
  "sellerId": "...",
  "source": "product-page",
  "metadata": {}
}
```

Seller reports can cover views, clicks, WhatsApp/call/website/location/social actions, shares, add-to-cart, reviews and real order/sales/revenue metrics when transactions exist.

---

## 9.11 Search

**Base:** `/api/search`

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/search` | Global product/shop search |
| GET | `/api/search/suggestions` | Search suggestions |

The implemented global search searches active, non-deleted products and shops and records search analytics.

---

## 9.12 Search Analytics

**Base:** `/api/search-analytics`

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/search-analytics/track` | Record search |
| POST | `/api/search-analytics/click` | Record search result click |
| GET | `/api/search-analytics` | Search analytics report |

Metrics include keyword searches and no-result searches; result clicks can be associated with a product/shop and search keyword.

---

## 9.13 Offers / Product Discounts

**Base:** `/api/offers`

| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/offers/active` | Public active offers |
| GET | `/api/offers` | Seller/Super Admin |
| POST | `/api/offers` | Seller/Super Admin |
| PATCH | `/api/offers/:id` | Seller/Super Admin; seller ownership enforced |
| DELETE | `/api/offers/:id` | Seller/Super Admin; seller ownership enforced |

Offers are product-level discounts. Seller offers are tied to seller-owned products.

Typical business data:

```text
productId
discountPercent
startDate
endDate
status
```

---

## 9.14 Campaigns

**Base:** `/api/campaigns`

| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/campaigns/active` | Public |
| GET | `/api/campaigns` | Super Admin |
| POST | `/api/campaigns` | Super Admin |
| PATCH | `/api/campaigns/:id` | Super Admin |
| DELETE | `/api/campaigns/:id` | Super Admin |

Campaigns represent platform-wide promotions such as seasonal/flash/launch campaigns.

Typical concepts:

```text
name
description
banner
startDate
endDate
status
eligible products/categories/shops
rules
```

---

## 9.15 CMS

**Base:** `/api/cms`

| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/cms/public` | Public published/scheduled content |
| GET | `/api/cms` | Super Admin |
| POST | `/api/cms` | Super Admin |
| PATCH | `/api/cms/:id` | Super Admin |
| DELETE | `/api/cms/:id` | Super Admin |

CMS supports editable public content such as homepage hero/slider, banners, Vision, Mission, About, featured businesses, categories, trending products, special offers and other site content.

Public content is filtered by publication state, locale and date schedule where applicable.

---

## 9.16 Team

**Base:** `/api/team`

| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/team/public` | Public active team |
| GET | `/api/team` | Super Admin |
| POST | `/api/team` | Super Admin |
| PATCH | `/api/team/:id` | Super Admin |
| DELETE | `/api/team/:id` | Super Admin |

Team records support picture, name, designation, bio, social links, order and active status.

---

## 9.17 Notifications

**Base:** `/api/notifications`

| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/notifications` | Authenticated current user |
| PATCH | `/api/notifications/:id/read` | Authenticated current user |

Notifications are user-scoped and architected for future in-app/email/SMS/WhatsApp delivery.

---

## 9.18 Audit Logs

**Base:** `/api/audit-logs`

| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/audit-logs` | Super Admin |

Audit data records privileged activity such as role changes, seller decisions, product moderation/featuring, CMS/campaign/settings changes, native resource changes and other protected operations.

Conceptual fields:

```text
actor
actor role
action
resource type
resource ID
previous state
new state
reason
metadata
timestamp
```

Audit is separate from analytics.

---

## 9.19 Platform Settings

**Base:** `/api/settings`

| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/settings/public` | Public safe settings |
| GET | `/api/settings` | Super Admin |
| PUT | `/api/settings/:key` | Super Admin |

Public settings currently expose selected safe groups such as site/contact/localization. All settings remain Super Admin controlled.

---

## 9.20 System Health

Endpoint:

```text
GET /api/system-health
```

Access:

```text
super_admin
```

Operational metrics include server/API status, uptime, Node version, database state, request count, error count/rate, authentication failures, memory, CPU/load, storage availability and background-job status.

Public health:

```text
GET /health
```

The public health endpoint verifies server/database availability and reports uptime.

---

# 10. Analytics Architecture

Analytics are event-based rather than a collection of arbitrary counters.

```text
User Interaction
      ↓
Analytics Event
      ↓
Event Storage
      ↓
Aggregation
      ↓
Dashboard / Ranking / Report
```

### Seller analytics

Seller analytics must be scoped to the authenticated seller and may include:

- shop views
- product views/clicks
- WhatsApp/call/website/location/social clicks
- shares
- add-to-cart
- reviews/ratings
- orders/sales/revenue when real transaction data exists
- daily/weekly/monthly/custom periods

### Platform analytics

Super Admin can report platform totals such as users, sellers, shops, products, views, clicks, reviews and actual orders/sales/revenue.

Native PakBazaar resources and external seller resources should remain distinguishable in reporting.

### No fake sales

Views/clicks/add-to-cart events are not sales. Revenue must never be invented from engagement metrics.

---

# 11. Order / Payment-Ready Architecture

The backend contains an order domain prepared for future transactions, including models/concepts for:

```text
Order
Payment
Transaction
Refund
Commission
Settlement
```

Future flow:

```text
Customer
  ↓
Order
  ↓
Payment
  ↓
Verification
  ↓
Confirmation
  ↓
Fulfillment
  ↓
Platform Commission
  ↓
Seller Settlement
```

Real payment processing and fake transaction data are intentionally not substituted for one another.

Orders and financial records should remain historically valid and should not be destructively deleted.

---

# 12. Data Integrity

Core relationships:

```text
Product → Category
Product → Shop
Product → Seller
Shop → Seller
Review → Product
Review → Shop
Offer → Product
Analytics Event → Product/Shop/Seller
Order → Customer + Order Items
Settlement → Seller
```

Backend operations must validate these relationships.

Where appropriate, products/shops/users/reviews use soft-delete semantics. Financial/order history must remain intact.

---

# 13. Security Model

The backend enforces:

- authentication
- RBAC
- permission checks
- resource ownership
- request validation
- input sanitization where applicable
- secure file handling where applicable
- rate limiting
- token verification
- role escalation prevention
- protected admin/developer routes
- Super Admin protection
- seller-to-seller isolation

A hidden frontend URL is never treated as a security boundary.

---

# 14. Frontend Integration

Recommended flow:

```text
UI
 ↓
Feature hook/service
 ↓
Shared fetch helper
 ↓
Better Auth credential
 ↓
Express API
```

Example with native `fetch`:

```js
const response = await fetch(
  `${process.env.NEXT_PUBLIC_SERVER_URL}/api/products`,
  {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  }
);

const result = await response.json();

if (!response.ok) {
  throw new Error(result.message || "Request failed");
}
```

The project should not introduce Axios, Redux or React Query merely to consume this API.

### Frontend rules

1. Use `NEXT_PUBLIC_SERVER_URL` for the API origin.
2. Use the existing Better Auth flow.
3. Use native `fetch`.
4. Handle `401` and `403` separately.
5. Never rely on frontend role checks for security.
6. Use backend pagination.
7. Use backend search/filter/sort.
8. Never trust client price/stock/permission/rating/revenue calculations.
9. Refresh data after mutations where required.
10. Display safe backend validation messages.

---

# 15. Dashboard Integration Map

## Seller dashboard

Primary API areas:

```text
/api/products/seller
/api/shops
/api/offers
/api/reviews
/api/analytics/seller
/api/analytics/products/:id
/api/analytics/shops/:id
```

All seller data is ownership-scoped.

## Admin dashboard

Primary areas:

```text
/api/users
/api/products
/api/shops
/api/reviews
/api/analytics
/api/analytics/dashboard
/api/search-analytics
```

Access depends on the granted admin permissions.

## Super Admin dashboard

Includes all platform-management areas:

```text
products
native-products
shops
native-shops
categories
reviews
users
seller-applications
offers
campaigns
cms
team
analytics
search-analytics
audit-logs
settings
notifications
system-health
orders/payment-ready domains
```

---

# 16. Public Website Integration Map

Public pages can consume:

```text
/api/products
/api/shops
/api/categories
/api/search
/api/campaigns/active
/api/cms/public
/api/team/public
/api/settings/public
```

Public interaction tracking can consume:

```text
/api/products/:id/track
/api/shops/:shopId/track
/api/categories/:id/track
/api/search-analytics/track
/api/search-analytics/click
```

---

# 17. Authorization Matrix

| Operation | Customer | Seller | Admin | Super Admin |
|---|---:|---:|---:|---:|
| Browse marketplace | ✓ | ✓ | ✓ | ✓ |
| Own product management | — | ✓ | — | ✓ |
| Native product management | — | — | — | ✓ |
| Feature product | — | — | — | ✓ |
| Own shop management | — | ✓ | — | ✓ |
| Category write | — | — | — | ✓ |
| Create review | ✓ | — | — | — |
| Review moderation | — | — | Permission | ✓ |
| User management | — | — | Permission | ✓ |
| Seller application review | — | — | — | ✓ |
| Campaign management | — | — | — | ✓ |
| CMS management | — | — | — | ✓ |
| Team management | — | — | — | ✓ |
| Audit log access | — | — | — | ✓ |
| System health | — | — | — | ✓ |

Ownership and resource-state checks apply in addition to this high-level matrix.

---

# 18. Audit vs Analytics

### Analytics

Measures behavior:

```text
views
clicks
searches
shares
add-to-cart
orders/sales
```

### Audit

Measures privileged changes:

```text
who changed what
when
old state
new state
reason/metadata
```

Neither system should replace the other.

---

# 19. API Testing Checklist

For protected endpoints test:

```text
[ ] Valid authorized request
[ ] Unauthenticated request
[ ] Wrong role
[ ] Wrong owner
[ ] Invalid payload
[ ] Missing resource
[ ] Duplicate/conflict case
[ ] Inactive/deleted resource
```

For collection endpoints test:

```text
[ ] page
[ ] limit
[ ] search
[ ] filters
[ ] sorting
[ ] empty results
[ ] invalid page/limit
```

For privileged mutations additionally verify:

```text
[ ] Audit record created
[ ] State transition is valid
[ ] Sole Super Admin protection remains intact
```

For analytics-enabled interactions:

```text
[ ] Correct event type
[ ] Correct resource linkage
[ ] Seller isolation
[ ] No fake sales/revenue
```

---

# 20. Future Development Rules

When extending the backend:

1. Check whether an existing module already owns the feature.
2. Extend the existing module before creating a duplicate.
3. Reuse authentication, role and validation middleware.
4. Enforce ownership on the backend.
5. Paginate collection endpoints.
6. Keep search/filter/sort server-side.
7. Add audit logging for privileged state changes.
8. Add analytics only for meaningful user behavior.
9. Preserve API compatibility where practical.
10. Do not create a second authentication system.
11. Do not fake transaction/revenue data.
12. Do not let sellers manipulate rating statistics.
13. Do not allow role escalation through frontend-controlled fields.
14. Avoid unnecessary dependencies and abstractions.

---

# 21. Final Architecture Summary

```text
                         BAZAR-E-PAK
                              │
                              ▼
                     Next.js + Better Auth
                              │
                              ▼
                       Express REST API
                              │
             ┌────────────────┼────────────────┐
             ▼                ▼                ▼
          Security         Auth/RBAC       Validation
             └────────────────┼────────────────┘
                              ▼
                       Modular API Layer
                              │
       ┌───────────────┬──────┴──────┬────────────────┐
       │               │             │                │
 Marketplace       Business       Platform        Operations
       │               │             │                │
 Products           Shops         CMS              Analytics
 Categories         Seller Apps    Campaigns        Audit
 Reviews             Offers        Team              Health
 Cart                Orders        Settings          Search
 Native Products     Payments      Notifications
 Native Shops        Settlements
       │               │
       └───────────────┴──────────────┐
                                      ▼
                              MongoDB / Mongoose
```

### Core principles

> **Authentication identifies the user.**  
> **Authorization decides what the user may do.**  
> **Ownership decides which business data the user may control.**  
> **The backend is the final source of truth.**  
> **Analytics measures behavior; audit logs measure privileged changes.**  
> **Sales and revenue are never fabricated from clicks/views.**  
> **Native PakBazaar resources are fully manageable.**  
> **Pagination/search/filter/sort belong on the backend.**  
> **Existing correct systems are extended rather than duplicated.**

---

## End of Bazar-e-Pak API Architecture & Documentation
