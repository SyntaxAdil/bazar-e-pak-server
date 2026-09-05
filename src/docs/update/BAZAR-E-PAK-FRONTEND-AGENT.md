# Bazar-e-Pak Frontend Integration Agent Guide

> **Purpose:** Complete integration guide for a Next.js/JavaScript frontend agent working against the final Bazar-e-Pak backend.
>
> **Backend source:** `bazar-e-pak-server-final.zip`
>
> **Frontend:** Next.js App Router + JavaScript
>
> **Auth:** Better Auth on Next.js
>
> **API client:** Native `fetch` (do not add Axios)
>
> **State:** Use the project's existing state/context patterns; do not introduce Redux or React Query unless explicitly requested.

---

## 1. Mission for the Frontend Agent

The frontend agent must integrate the existing Next.js application with the existing Bazar-e-Pak REST API without duplicating backend business logic.

The backend is authoritative for:

- authentication verification
- authorization
- seller ownership
- product/shop ownership
- stock
- prices
- discounts
- review integrity
- moderation
- analytics
- pagination
- search/filter/sort
- platform permissions
- audit history

The frontend is responsible for:

- UI
- routing
- forms
- loading states
- empty states
- error states
- optimistic presentation only when safe
- calling the correct API
- displaying API results
- sending interaction analytics
- role-aware navigation

Never make frontend-only security decisions.

---

# 2. Non-Negotiable Rules

1. **Use the existing backend. Do not rebuild it.**
2. **Do not create duplicate APIs.**
3. **Do not replace Better Auth.**
4. **Do not add Axios. Use `fetch`.**
5. **Do not add Redux.**
6. **Do not add React Query.**
7. **Do not trust frontend role checks for security.**
8. **Do not send arbitrary seller IDs to access seller data.**
9. **Do not calculate authoritative price/stock/rating/revenue on the client.**
10. **Do not fake sales, orders, or revenue.**
11. **Use backend pagination.**
12. **Use backend search/filter/sort.**
13. **Do not fetch entire collections to paginate in React.**
14. **Preserve existing working frontend components.**
15. **Modify existing files before creating duplicate components/services.**
16. **Use JavaScript, not TypeScript, for new frontend code.**
17. **Keep public and dashboard experiences responsive and accessible.**
18. **Always handle loading, empty, error, disabled and unauthorized states.**

---

# 3. Backend Architecture You Must Understand

```text
Next.js Frontend
      │
      ├── Better Auth
      │
      └── Native fetch
              │
              ▼
        Express REST API
              │
      ┌───────┼────────┐
      │       │        │
    Auth     RBAC   Validation
      │       │        │
      └───────┼────────┘
              ▼
        Route / Controller
              ▼
          Service Logic
              ▼
       Repository / Model
              ▼
       MongoDB / Mongoose
```

Cross-cutting backend systems:

```text
Analytics Events
Audit Logs
Rate Limiting
Error Handling
System Metrics
Ownership Checks
```

---

# 4. Backend Modules

The final server is organized into these functional areas:

```text
products/
shops/
category/
reviews/
cart/
users/
seller-applications/
analytics/
audit/
offers/
campaigns/
cms/
team/
notifications/
search/
search-analytics/
settings/
system-health/
```

The backend also contains order/payment-ready domain structures.

---

# 5. Base API Configuration

Frontend environment variable:

```env
NEXT_PUBLIC_SERVER_URL=http://localhost:5000
```

Production should use the deployed API origin.

Use:

```js
const API_URL = process.env.NEXT_PUBLIC_SERVER_URL;
```

Never hardcode the production server URL in components.

All API paths below are relative to:

```text
/api
```

Example:

```text
GET ${API_URL}/api/products
```

---

# 6. Better Auth Integration

Better Auth remains in the Next.js frontend.

The Express backend verifies the authenticated credential/session. Do not implement another login/JWT system inside the frontend integration layer.

For protected requests, use the authenticated token/session mechanism already configured by the project.

Conceptual request:

```js
const response = await fetch(`${API_URL}/api/users`, {
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
});
```

The exact token retrieval mechanism must follow the project's existing Better Auth setup.

If the existing frontend has a centralized auth/session provider, use it instead of creating another token store.

---

# 7. Recommended Shared API Helper

Create or reuse one shared native-fetch helper.

Conceptual pattern:

```js
export async function apiFetch(path, options = {}) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SERVER_URL}${path}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    }
  );

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(result.message || "Request failed");
    error.status = response.status;
    error.data = result;
    throw error;
  }

  return result;
}
```

If the project already has a better shared API utility, use that instead.

Do not create multiple competing fetch clients.

---

# 8. HTTP Error Handling

Frontend must distinguish:

```text
401 → login/session problem
403 → role/permission/ownership problem
404 → resource does not exist
409 → duplicate/conflict
422 → validation/business-rule failure
429 → rate limit
500 → server failure
```

Recommended UI behavior:

| Status | Frontend action |
|---:|---|
| 401 | refresh/check session or redirect to login |
| 403 | show permission message; do not retry blindly |
| 404 | show not-found state |
| 409 | show conflict/duplicate message |
| 422 | map validation errors to form fields |
| 429 | show retry/rate-limit message |
| 500 | show generic server-error state |

---

# 9. Response Handling

Typical success:

```json
{
  "success": true,
  "data": {}
}
```

Typical mutation:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

Paginated data:

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

Do not assume a response property that has not been verified against the actual endpoint implementation.

---

# 10. Product Integration

## Public product APIs

```text
GET /api/products
GET /api/products/:id
GET /api/products/best-selling
GET /api/products/trending
POST /api/products/:id/track
```

## Seller product APIs

```text
GET /api/products/seller
POST /api/products
PATCH /api/products/:id
DELETE /api/products/:id
```

## Featured

```text
PATCH /api/products/:id/featured
```

Super Admin only.

## Frontend requirements

Build/integrate:

- product listing
- product detail
- search
- filter
- sorting
- pagination
- stock display
- price/discount display
- seller product table
- product create form
- product edit form
- product delete confirmation
- featured management for Super Admin
- trending section
- best-selling section
- product interaction tracking

Never let the frontend decide whether a seller owns a product.

---

# 11. Native Product Integration

Base:

```text
/api/native-products
```

Endpoints:

```text
GET    /api/native-products
POST   /api/native-products
PATCH  /api/native-products/:id
DELETE /api/native-products/:id
```

UI:

- Super Admin native product table
- create native product
- edit native product
- delete native product
- native product listing/detail
- native product analytics where applicable

Native products are fully manageable. Do not make them read-only.

---

# 12. Shop Integration

Base:

```text
/api/shops
```

Endpoints:

```text
GET   /api/shops
GET   /api/shops/slug/:slug
GET   /api/shops/:shopId
POST  /api/shops
PATCH /api/shops/:shopId
DELETE /api/shops/:shopId
PATCH /api/shops/:shopId/status
POST  /api/shops/:shopId/track
```

Frontend pages/features:

- shop directory
- shop detail
- seller shop dashboard
- shop create/edit
- shop status management for Super Admin
- logo/cover/gallery
- description
- contact
- WhatsApp
- website
- social links
- location
- hours
- rating/reviews
- share buttons
- CTA buttons

Track:

```text
SHOP_VIEW
SHOP_CLICK
WHATSAPP_CLICK
CALL_CLICK
WEBSITE_CLICK
LOCATION_CLICK
YOUTUBE_CLICK
SOCIAL_CLICK
SHARE
```

---

# 13. Native Shop Integration

Base:

```text
/api/native-shops
```

Endpoints:

```text
GET    /api/native-shops
POST   /api/native-shops
PATCH  /api/native-shops/:id
DELETE /api/native-shops/:id
```

Super Admin UI must support complete native shop CRUD.

---

# 14. Category Integration

Base:

```text
/api/categories
```

Endpoints:

```text
GET    /api/categories
GET    /api/categories/slug/:slug
GET    /api/categories/:id
POST   /api/categories/:id/track
POST   /api/categories
PATCH  /api/categories/:id
DELETE /api/categories/:id
```

Frontend:

- category navigation
- category page
- category product filtering
- Super Admin category management
- active/inactive state
- image
- description
- ordering where supported

Track category views.

---

# 15. Review Integration

Base:

```text
/api/reviews
```

Endpoints:

```text
GET    /api/reviews
GET    /api/reviews/:id
POST   /api/reviews
DELETE /api/reviews/:id
PATCH  /api/reviews/:id/moderation
```

Frontend roles:

### Customer

- create review
- view reviews

### Seller

- view own product/shop reviews
- view rating statistics
- no moderation controls

### Admin

- moderation UI only when permission allows

### Super Admin

- complete moderation

Never show seller users an edit/delete/moderation control merely because the review belongs to their product.

---

# 16. Cart Integration

Base:

```text
/api/cart
```

Endpoints:

```text
GET    /api/cart
POST   /api/cart/items
PATCH  /api/cart/items/:productId
DELETE /api/cart/items/:productId
DELETE /api/cart
```

Frontend must support:

- cart drawer/page
- add to cart
- quantity update
- remove
- clear cart
- stock warnings
- stale product handling
- price refresh
- subtotal
- total item count
- empty cart

The backend is authoritative for stock and product pricing.

After successful add-to-cart, the frontend should refresh cart state and may display a toast.

---

# 17. Seller Application Integration

Base:

```text
/api/seller-applications
```

Endpoints:

```text
POST  /api/seller-applications
GET   /api/seller-applications/me
GET   /api/seller-applications
PATCH /api/seller-applications/:id
```

Customer UI:

```text
Apply to become seller
↓
Pending
```

Super Admin UI:

```text
Applications table
↓
Review
↓
Approve / Reject / Suspend
```

Show:

- status
- submitted date
- reviewed date
- reviewer
- rejection reason

Do not allow the frontend to directly activate a seller.

---

# 18. User Management Integration

Base:

```text
/api/users
```

Endpoints:

```text
GET   /api/users
PATCH /api/users/:userId/status
PATCH /api/users/:userId/permissions
PATCH /api/users/:userId/role
```

Admin:

- user list
- status management according to permissions

Super Admin:

- role management
- admin permissions
- account status
- platform user management

Important:

- do not expose role-change UI to normal users
- do not allow creation of a second Super Admin
- protect the sole Super Admin

---

# 19. Offers / Discounts Integration

Base:

```text
/api/offers
```

Endpoints:

```text
GET    /api/offers/active
GET    /api/offers
POST   /api/offers
PATCH  /api/offers/:id
DELETE /api/offers/:id
```

Seller UI:

- own product offers
- create offer
- edit offer
- delete offer
- start/end dates
- discount percentage
- active/inactive state

Super Admin:

- platform-level management as supported

Do not allow a seller to manage another seller's product offer.

---

# 20. Campaign Integration

Base:

```text
/api/campaigns
```

Endpoints:

```text
GET    /api/campaigns/active
GET    /api/campaigns
POST   /api/campaigns
PATCH  /api/campaigns/:id
DELETE /api/campaigns/:id
```

Super Admin CMS/campaign UI:

- campaign list
- create
- edit
- delete
- active/scheduled/expired display
- date range
- banner
- eligible products/categories/shops

Public frontend:

- fetch active campaign
- render announcement/banner dynamically
- never hardcode campaign content when CMS/campaign data exists

---

# 21. CMS Integration

Base:

```text
/api/cms
```

Endpoints:

```text
GET    /api/cms/public
GET    /api/cms
POST   /api/cms
PATCH  /api/cms/:id
DELETE /api/cms/:id
```

Public content should drive:

- homepage hero
- promotional banners
- Vision
- Mission
- About
- featured content
- announcements
- special offers
- localized content where provided

Super Admin CMS should support:

- content listing
- content creation
- editing
- deletion
- status
- locale
- ordering
- schedule

Do not hardcode editable homepage content into components.

---

# 22. Team Integration

Base:

```text
/api/team
```

Endpoints:

```text
GET    /api/team/public
GET    /api/team
POST   /api/team
PATCH  /api/team/:id
DELETE /api/team/:id
```

Super Admin UI:

- add team member
- edit
- delete
- active/inactive
- order
- picture
- name
- designation
- bio
- social links

Public UI consumes `/public`.

---

# 23. Search Integration

Base:

```text
/api/search
```

Endpoints:

```text
GET /api/search?q=...
GET /api/search/suggestions?q=...
```

Search UI must support:

- global search
- product results
- shop results
- autocomplete/suggestions
- no-result state
- result counts
- result navigation

Do not load all products/shops and search them client-side.

---

# 24. Search Analytics Integration

Base:

```text
/api/search-analytics
```

Endpoints:

```text
POST /api/search-analytics/track
POST /api/search-analytics/click
GET  /api/search-analytics
```

Track:

- keyword
- result count
- search source
- clicked result
- result position when available

Admin/Super Admin analytics UI should show:

- popular keywords
- searches
- no-result searches
- result clicks

---

# 25. Analytics Integration

Base:

```text
/api/analytics
```

Endpoints:

```text
POST /api/analytics/events
GET  /api/analytics
GET  /api/analytics/dashboard
GET  /api/analytics/products/:id
GET  /api/analytics/shops/:id
GET  /api/analytics/seller
GET  /api/analytics/rankings/products
```

Core events:

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

Frontend must emit meaningful events without blocking the primary user action.

Use fire-and-forget carefully; do not make a product page unusable because analytics tracking failed.

---

# 26. Analytics UI Requirements

## Seller dashboard

Show only the authenticated seller's:

- shop views
- product views
- clicks
- WhatsApp clicks
- call clicks
- website clicks
- location clicks
- YouTube/social clicks
- shares
- add-to-cart
- reviews
- orders/sales/revenue only when real transaction data exists

Filters:

```text
daily
weekly
monthly
custom
```

## Admin/Super Admin

Platform reports can include:

- users
- sellers
- approved/pending sellers
- shops
- products
- views
- clicks
- shares
- reviews
- orders
- units sold
- revenue when real transactions exist

Never turn clicks into fake sales.

---

# 27. Audit Integration in Frontend

Base:

```text
/api/audit-logs
```

Endpoint:

```text
GET /api/audit-logs
```

Super Admin UI should provide:

- audit log table
- actor
- role
- action
- resource type
- resource ID
- previous state where available
- new state where available
- reason/metadata
- timestamp
- pagination
- filtering

Audit logs are not customer analytics.

---

# 28. Notifications Integration

Base:

```text
/api/notifications
```

Endpoints:

```text
GET   /api/notifications
PATCH /api/notifications/:id/read
```

Frontend:

- notification list
- unread state
- mark as read
- notification badge/count if available
- loading/empty states

Do not create fake notifications just to populate the UI.

---

# 29. Settings Integration

Base:

```text
/api/settings
```

Endpoints:

```text
GET /api/settings/public
GET /api/settings
PUT /api/settings/:key
```

Public settings can drive safe site configuration.

Super Admin can manage platform settings.

Never expose private platform configuration to public components.

---

# 30. System Health Integration

Endpoint:

```text
GET /api/system-health
```

Super Admin only.

Dashboard can display:

- server status
- API status
- uptime
- Node version
- database status
- request count
- error count
- error rate
- authentication failures
- memory
- CPU load
- storage
- background job status

Do not expose this dashboard publicly.

---

# 31. Global Health

Endpoint:

```text
GET /health
```

Use for:

- deployment monitoring
- basic API availability
- database availability

Do not build business functionality around `/health`.

---

# 32. Orders / Payment-Ready Frontend Architecture

The backend is prepared for future transaction functionality.

Conceptual flow:

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
Commission
  ↓
Seller Settlement
```

Frontend should be architected so future pages can be added for:

```text
orders
order details
payments
transactions
refunds
seller settlements
commission reports
```

But do not build fake payment success, fake revenue, or fake transaction history.

---

# 33. Public Frontend Integration Checklist

## Homepage

- [ ] Fetch CMS content
- [ ] Fetch active campaign
- [ ] Fetch categories
- [ ] Fetch featured content
- [ ] Fetch trending products
- [ ] Fetch best-selling products
- [ ] Render announcement bar dynamically
- [ ] Track meaningful product/shop/category interactions
- [ ] Responsive layout

## Products

- [ ] Product listing
- [ ] Search
- [ ] Filter
- [ ] Sort
- [ ] Pagination
- [ ] Product detail
- [ ] Discount display
- [ ] Stock display
- [ ] Reviews
- [ ] Add to cart
- [ ] Track product view/click

## Shops

- [ ] Shop directory
- [ ] Search
- [ ] Shop detail
- [ ] Products
- [ ] Reviews
- [ ] WhatsApp CTA
- [ ] Call CTA
- [ ] Website CTA
- [ ] Location CTA
- [ ] Social/YouTube CTA
- [ ] Share
- [ ] Track interactions

## Categories

- [ ] Category navigation
- [ ] Category page
- [ ] Category products
- [ ] Category tracking

## Search

- [ ] Global search
- [ ] Suggestions
- [ ] Product results
- [ ] Shop results
- [ ] No-results state
- [ ] Search analytics
- [ ] Result-click analytics

## About

- [ ] CMS-driven About
- [ ] Vision
- [ ] Mission
- [ ] Team

---

# 34. Customer Dashboard Integration Checklist

- [ ] Profile/session
- [ ] Cart
- [ ] Review creation
- [ ] Review management where allowed
- [ ] Notifications
- [ ] Seller application
- [ ] Future-ready order history

Do not expose seller/admin management screens to customers.

---

# 35. Seller Dashboard Integration Checklist

## Dashboard

- [ ] KPI cards
- [ ] Shop views
- [ ] Product views
- [ ] Clicks
- [ ] WhatsApp clicks
- [ ] Call clicks
- [ ] Website clicks
- [ ] Location clicks
- [ ] Social/YouTube clicks
- [ ] Shares
- [ ] Add-to-cart
- [ ] Reviews
- [ ] Orders/sales/revenue when available
- [ ] Date filters

## Products

- [ ] Product list
- [ ] Search
- [ ] Filter
- [ ] Sort
- [ ] Pagination
- [ ] Create
- [ ] Edit
- [ ] Delete
- [ ] Stock
- [ ] Price
- [ ] Images
- [ ] Category
- [ ] Status

## Shop

- [ ] Shop profile
- [ ] Logo
- [ ] Cover
- [ ] Gallery
- [ ] Description
- [ ] Contact
- [ ] WhatsApp
- [ ] Website
- [ ] Socials
- [ ] Location
- [ ] Hours

## Offers

- [ ] Offer list
- [ ] Create
- [ ] Edit
- [ ] Delete
- [ ] Schedule

## Reviews

- [ ] Own reviews
- [ ] Rating stats
- [ ] No moderation controls

## Seller Application

- [ ] Status
- [ ] Review result
- [ ] Rejection reason

---

# 36. Admin Dashboard Integration Checklist

- [ ] User list
- [ ] User search
- [ ] User filters
- [ ] User pagination
- [ ] Product management according to permission
- [ ] Shop management according to permission
- [ ] Review moderation according to permission
- [ ] Platform analytics according to permission
- [ ] Search analytics according to permission
- [ ] Notifications

Do not show Super Admin-only controls to normal admins.

---

# 37. Super Admin Dashboard Integration Checklist

## Platform

- [ ] Overview KPIs
- [ ] Users
- [ ] Sellers
- [ ] Seller applications
- [ ] Admins
- [ ] Shops
- [ ] Native shops
- [ ] Products
- [ ] Native products
- [ ] Categories
- [ ] Reviews
- [ ] Offers
- [ ] Campaigns
- [ ] CMS
- [ ] Team
- [ ] Notifications
- [ ] Search analytics
- [ ] Analytics
- [ ] Audit logs
- [ ] Settings
- [ ] System health

## Security

- [ ] Prevent second Super Admin UI
- [ ] Protect sole Super Admin
- [ ] Role management
- [ ] Admin permissions
- [ ] User suspension/ban

---

# 38. Product Page Interaction Tracking

On product detail:

```text
page opened → PRODUCT_VIEW
```

If a user explicitly clicks a product interaction CTA:

```text
PRODUCT_CLICK
WHATSAPP_CLICK
CALL_CLICK
WEBSITE_CLICK
LOCATION_CLICK
YOUTUBE_CLICK
SOCIAL_CLICK
SHARE
```

Do not send the same event repeatedly because of React re-renders.

For `PRODUCT_VIEW`, track once per meaningful page visit rather than once per render.

---

# 39. Shop Page Interaction Tracking

On shop detail:

```text
SHOP_VIEW
```

CTA actions:

```text
SHOP_CLICK
WHATSAPP_CLICK
CALL_CLICK
WEBSITE_CLICK
LOCATION_CLICK
YOUTUBE_CLICK
SOCIAL_CLICK
SHARE
```

Tracking should not block navigation.

---

# 40. Add-to-Cart Tracking

When the backend confirms a successful add-to-cart:

```text
ADD_TO_CART
```

Do not record the event merely because the user clicked a button if the cart operation failed.

---

# 41. Review Tracking

After the backend successfully creates a review:

```text
REVIEW_CREATED
```

Do not record it before successful API confirmation.

---

# 42. Search Tracking

On a completed search:

```text
POST /api/search-analytics/track
```

Send:

```json
{
  "keyword": "phone",
  "resultCount": 20,
  "source": "global_search"
}
```

When a result is clicked:

```text
POST /api/search-analytics/click
```

Include product/shop identity and keyword when available.

---

# 43. Pagination UI Pattern

Use backend pagination:

```text
?page=1&limit=20
```

UI should provide:

```text
Previous
1 2 3 ...
Next
```

Also provide:

- loading state
- empty state
- total result count where provided
- disabled previous/next buttons

Do not load all records just to calculate pages.

---

# 44. Search / Filter / Sort UI Pattern

Keep filter state in URL query parameters where appropriate.

Example:

```text
/products?search=phone&category=abc&sortBy=price&sortOrder=asc&page=1
```

Benefits:

- shareable URLs
- browser back/forward support
- refresh persistence
- server-driven filtering

Use backend parameters rather than client-side filtering of the entire collection.

---

# 45. Forms

For forms, use the project's existing React Hook Form approach.

Typical flow:

```text
Form
 ↓
Client validation
 ↓
API request
 ↓
Backend validation
 ↓
Success / field errors
```

Client validation improves UX; it does not replace backend validation.

Use `react-hot-toast` for concise mutation feedback if that is already the project's convention.

---

# 46. Loading / Empty / Error / Disabled States

Every data-driven screen must account for:

```text
Loading
Empty
Success
Error
Unauthorized
Forbidden
Not Found
```

Every mutation button must account for:

```text
Default
Loading
Success
Error
Disabled
```

Do not let users submit the same destructive operation repeatedly while the request is pending.

---

# 47. Delete Operations

Never immediately delete from UI state before a destructive API call unless the UX is deliberately designed for rollback.

Recommended:

```text
Click Delete
↓
Confirmation modal
↓
API DELETE
↓
Success toast
↓
Refresh/remove from current list
```

For resources using soft delete, the frontend should treat the backend response as authoritative.

---

# 48. Ownership UI Rules

Frontend may hide irrelevant controls based on role/ownership for UX.

But backend remains authoritative.

Example:

```text
Seller sees own products
```

Do not assume:

```text
Seller can update any /api/products/:id
```

The backend performs the ownership check.

---

# 49. Role-Based Navigation

Navigation should be generated from the authenticated user's role and permissions.

Conceptually:

```text
customer
  → Marketplace
  → Cart
  → Reviews
  → Seller Application

seller
  → Seller Dashboard
  → Products
  → Shop
  → Offers
  → Reviews
  → Analytics

admin
  → Admin Dashboard
  → Users
  → Products
  → Shops
  → Reviews
  → Analytics

super_admin
  → Developer Panel
  → Everything
```

This is UI routing only. API authorization is still backend-controlled.

---

# 50. Business Profile UI

The shop/business page should expose the platform's business-discovery features prominently:

```text
Logo
Cover
Name
Description
Business type
Products
Services/content where available
Rating
Reviews
Address
Map/location
Hours
WhatsApp
Call
Website
YouTube
Facebook
Instagram
Other social links
Share
```

The actual fields available from the backend should be used directly.

---

# 51. Localization

The public product should support:

```text
English
Urdu
```

Urdu requires proper RTL layout.

When CMS data contains locale-specific records, request the appropriate `locale` value.

Do not duplicate the same CMS content manually in the frontend if localized CMS content is available.

---

# 52. API Service Organization

If the frontend needs API service files, organize them by existing backend domain rather than by page:

```text
services/
├── products.js
├── shops.js
├── categories.js
├── reviews.js
├── cart.js
├── users.js
├── seller-applications.js
├── analytics.js
├── offers.js
├── campaigns.js
├── cms.js
├── team.js
├── notifications.js
├── search.js
├── search-analytics.js
├── settings.js
├── audit.js
└── system-health.js
```

Reuse existing services if they already exist.

Do not create:

```text
product-api.js
products-api.js
productService.js
productServiceV2.js
```

for the same backend resource.

---

# 53. API Service Example

```js
export async function getProducts(params = {}) {
  const query = new URLSearchParams(params).toString();

  return apiFetch(
    `/api/products${query ? `?${query}` : ""}`
  );
}

export async function getProduct(id) {
  return apiFetch(`/api/products/${id}`);
}

export async function createProduct(payload, token) {
  return apiFetch("/api/products", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}
```

Use the existing project's auth/token handling instead of inventing a new one.

---

# 54. Do Not Duplicate Backend Business Logic

Bad:

```js
const total = products.reduce(...)
```

when the value is authoritative from the backend.

Bad:

```js
if (user.role === "seller") {
  // assume ownership
}
```

Bad:

```js
const bestSelling = products.sort((a, b) => b.rating - a.rating);
```

Correct:

```text
GET /api/products/best-selling
```

The backend owns the business rule.

---

# 55. Analytics Must Not Affect UX

Analytics failures should generally not break the primary action.

For example:

```text
User clicks WhatsApp
       ↓
Open WhatsApp immediately
       ↓
Track WHATSAPP_CLICK in background
```

Do not:

```text
Wait for analytics
↓
Then open WhatsApp
```

unless there is a specific reason.

---

# 56. Caching Guidance

Cache public data only when it is safe and the project's architecture supports it.

Good candidates:

- public categories
- public CMS content
- public team
- active campaigns

Be careful with:

- cart
- user status
- seller dashboard
- permissions
- stock
- price
- admin data

Never use stale client cache as the authority for sensitive state.

---

# 57. File Uploads

Where an endpoint expects files, use the backend's expected multipart/form-data contract.

Do not send a JSON string pretending to be a file unless the backend explicitly expects a URL/string.

For image fields:

```text
logo
cover
gallery
product images
CMS images
team picture
```

follow the actual model/endpoint contract.

---

# 58. Dashboard Table Standard

All large management tables should support:

```text
Search
Filter
Sort
Pagination
Loading
Empty
Error
Refresh
Row actions
Confirmation modal for destructive actions
```

Recommended columns:

```text
Identity
Status
Relevant metrics
Created date
Updated date
Actions
```

Do not put every possible field into a table.

---

# 59. Analytics Dashboard Standard

Seller/admin/super-admin analytics pages should use:

```text
KPI cards
Charts
Date range selector
Comparison where supported
Ranking tables
Drilldown
Empty state
```

Seller dashboard must not show platform-wide data.

---

# 60. CMS Dashboard Standard

CMS editing should use:

```text
List
Search/filter
Create
Edit
Preview where useful
Status
Schedule
Locale
Order
Delete confirmation
```

Public page consumes the published/scheduled content returned by `/api/cms/public`.

---

# 61. Campaign Dashboard Standard

Campaign UI should support:

```text
Draft/active/scheduled/expired presentation
Start date
End date
Banner
Description
Eligible products/categories/shops
```

Public homepage should use `/api/campaigns/active`.

---

# 62. Exact Frontend Work Required by Requirement

## A. Marketplace

- [ ] Products page
- [ ] Product details
- [ ] Shops page
- [ ] Shop details
- [ ] Categories
- [ ] Search
- [ ] Search suggestions
- [ ] Product filters
- [ ] Shop filters where supported
- [ ] Sort
- [ ] Pagination
- [ ] Cart
- [ ] Reviews

## B. Seller

- [ ] Seller registration/application
- [ ] Application status
- [ ] Seller dashboard
- [ ] Own product CRUD
- [ ] Own shop CRUD
- [ ] Own offers
- [ ] Own reviews
- [ ] Own analytics
- [ ] Business profile
- [ ] Interaction metrics

## C. Admin

- [ ] User management
- [ ] Product management
- [ ] Shop management
- [ ] Review moderation
- [ ] Analytics
- [ ] Search analytics
- [ ] Permission-aware navigation

## D. Super Admin

- [ ] Complete Developer Panel
- [ ] Users
- [ ] Admin management
- [ ] Seller applications
- [ ] Sellers
- [ ] Shops
- [ ] Native shops
- [ ] Products
- [ ] Native products
- [ ] Categories
- [ ] Reviews
- [ ] Offers
- [ ] Campaigns
- [ ] CMS
- [ ] Team
- [ ] Analytics
- [ ] Audit
- [ ] Notifications
- [ ] Settings
- [ ] System health

## E. Platform UX

- [ ] Pakistan-themed launch campaign UI
- [ ] 50% / 70% promotional presentation from CMS/campaign data
- [ ] WhatsApp CTA
- [ ] Call CTA
- [ ] Website CTA
- [ ] Location CTA
- [ ] YouTube/social CTA
- [ ] Share
- [ ] English
- [ ] Urdu RTL
- [ ] Responsive design
- [ ] Accessibility

---

# 63. Route-to-Frontend Mapping

| Frontend Feature | Backend API |
|---|---|
| Product listing | `/api/products` |
| Product detail | `/api/products/:id` |
| Trending | `/api/products/trending` |
| Best selling | `/api/products/best-selling` |
| Seller products | `/api/products/seller` |
| Native products | `/api/native-products` |
| Shop listing | `/api/shops` |
| Shop detail | `/api/shops/:shopId` or `/api/shops/slug/:slug` |
| Native shops | `/api/native-shops` |
| Categories | `/api/categories` |
| Reviews | `/api/reviews` |
| Cart | `/api/cart` |
| Users | `/api/users` |
| Seller applications | `/api/seller-applications` |
| Analytics | `/api/analytics` |
| Audit | `/api/audit-logs` |
| Offers | `/api/offers` |
| Campaigns | `/api/campaigns` |
| CMS | `/api/cms` |
| Team | `/api/team` |
| Notifications | `/api/notifications` |
| Search | `/api/search` |
| Search analytics | `/api/search-analytics` |
| Settings | `/api/settings` |
| System health | `/api/system-health` |

---

# 64. API Integration Acceptance Criteria

Frontend integration is complete only when:

```text
[ ] Every required public page consumes the backend
[ ] Every required dashboard module consumes the backend
[ ] Better Auth session works with protected endpoints
[ ] Seller ownership works correctly
[ ] Admin permissions are respected
[ ] Super Admin controls are available
[ ] Native products are manageable
[ ] Native shops are manageable
[ ] Products have server-side pagination/search/filter/sort
[ ] Shops have server-side pagination/search/filter/sort where supported
[ ] Reviews are permission-aware
[ ] Cart is backend-backed
[ ] Offers work
[ ] Campaigns work
[ ] CMS works
[ ] Team works
[ ] Notifications work
[ ] Search analytics works
[ ] Analytics events are emitted from real interactions
[ ] Seller analytics are isolated
[ ] Audit logs are visible to Super Admin
[ ] System health is visible only to Super Admin
[ ] No fake sales/revenue
[ ] No duplicate auth
[ ] No Axios
[ ] No Redux
[ ] No React Query
[ ] No TypeScript added for new integration code
[ ] Loading/empty/error states exist
[ ] Mobile responsive
[ ] Keyboard accessible
[ ] Urdu RTL works
```

---

# 65. Final Agent Workflow

When implementing any frontend feature:

```text
1. Identify the business requirement
2. Identify the backend module
3. Find the exact endpoint
4. Check required role/permission
5. Check request body/query parameters in source
6. Check response shape in source
7. Reuse existing API helper/service
8. Build UI
9. Add loading/empty/error states
10. Add mutation feedback
11. Add analytics event if required
12. Test unauthorized behavior
13. Test wrong-owner behavior where relevant
14. Test pagination/search/filter/sort
15. Verify mobile/responsive behavior
16. Verify accessibility
```

If an endpoint seems missing, **inspect the backend first**. Do not invent a new route immediately.

---

# 66. When Backend Extension Is Actually Needed

Only create a backend change when the frontend requirement cannot be satisfied by an existing API.

Before requesting/creating a backend extension:

```text
Search existing route
↓
Search existing controller/service
↓
Search existing model
↓
Check whether query parameters already support it
↓
Only then add the smallest required backend change
```

Never create a duplicate module because a frontend page needs slightly different data.

---

# 67. Final Architecture Principle

```text
Frontend = Presentation + Interaction
Backend  = Business Rules + Authorization + Data Integrity
Database = Persistent Source of Truth
Better Auth = Authentication
Analytics = Behavior Measurement
Audit = Privileged Change History
```

The frontend agent must preserve this separation.

---

# 68. Final Instruction to Any AI Agent

> You are integrating the Bazar-e-Pak Next.js JavaScript frontend with an existing Express/MongoDB backend.
>
> Read this document before changing API integration.
>
> Do not invent routes, fields, permissions, sales, revenue, or business rules.
>
> Reuse existing frontend architecture and backend endpoints.
>
> Use native `fetch`.
>
> Keep Better Auth as the authentication source.
>
> Treat the backend as the authorization and business-rule source of truth.
>
> Enforce seller ownership through the backend.
>
> Use backend pagination/search/filter/sort.
>
> Do not add Axios, Redux, React Query, or TypeScript for this integration unless explicitly requested.
>
> Do not rebuild modules that already exist.
>
> If a requirement is not currently supported by an endpoint, inspect the backend source and make the smallest necessary extension instead of creating a parallel system.
>
> The goal is a complete, production-oriented Bazar-e-Pak frontend integration with no duplicated architecture and no fake data.

---

## End of Bazar-e-Pak Frontend Integration Agent Guide
