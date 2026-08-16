# Shop API Documentation

## Base URL

`/api/shops`

---

## Roles

| Role     | Permission                                          |
| -------- | --------------------------------------------------- |
| customer | View shops                                          |
| seller   | Create, update, delete own shop                     |
| admin    | Create, update, delete any shop, manage shop status |

---

# Endpoints

## 1. Get All Shops

**GET** `/api/shops`

### Access

Public

### Query Parameters

| Parameter  | Type   | Required | Description                                  |
| ---------- | ------ | -------- | -------------------------------------------- |
| `page`     | number | No       | Page number. Default: `1`                    |
| `limit`    | number | No       | Items per page. Default: `20`, maximum: `50` |
| `search`   | string | No       | Search shops by name or description          |
| `status`   | string | No       | `active`, `inactive`, `suspended`            |
| `sellerId` | string | No       | Filter shops by seller ID                    |

### Example

`GET /api/shops?page=1&limit=20&search=mobile&status=active`

### Response

```json
{
  "success": true,
  "message": "Shops fetched successfully",
  "data": [
    {
      "_id": "66b123456789abcdef123456",
      "sellerId": "66b123456789abcdef654321",
      "name": "Mobile Accessories BD",
      "slug": "mobile-accessories-bd",
      "description": "All kinds of mobile accessories.",
      "logo": "https://example.com/logo.png",
      "banner": "https://example.com/banner.png",
      "phone": "01700000000",
      "email": "shop@example.com",
      "address": "Dhaka, Bangladesh",
      "status": "active",
      "rating": 4.7,
      "totalReviews": 128,
      "createdAt": "2026-08-16T10:00:00.000Z",
      "updatedAt": "2026-08-16T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

---

# 2. Get Shop by ID

**GET** `/api/shops/:shopId`

### Access

Public

### Parameters

| Parameter | Type   | Required | Description   |
| --------- | ------ | -------- | ------------- |
| `shopId`  | string | Yes      | Shop ObjectId |

### Example

`GET /api/shops/66b123456789abcdef123456`

### Response

```json
{
  "success": true,
  "message": "Shop fetched successfully",
  "data": {
    "_id": "66b123456789abcdef123456",
    "sellerId": "66b123456789abcdef654321",
    "name": "Mobile Accessories BD",
    "slug": "mobile-accessories-bd",
    "description": "All kinds of mobile accessories.",
    "logo": "https://example.com/logo.png",
    "banner": "https://example.com/banner.png",
    "phone": "01700000000",
    "email": "shop@example.com",
    "address": "Dhaka, Bangladesh",
    "status": "active",
    "rating": 4.7,
    "totalReviews": 128,
    "createdAt": "2026-08-16T10:00:00.000Z",
    "updatedAt": "2026-08-16T10:00:00.000Z"
  }
}
```

---

# 3. Get Shop by Slug

**GET** `/api/shops/slug/:slug`

### Access

Public

### Parameters

| Parameter | Type   | Required | Description      |
| --------- | ------ | -------- | ---------------- |
| `slug`    | string | Yes      | Unique shop slug |

### Example

`GET /api/shops/slug/mobile-accessories-bd`

### Response

```json
{
  "success": true,
  "message": "Shop fetched successfully",
  "data": {
    "_id": "66b123456789abcdef123456",
    "sellerId": "66b123456789abcdef654321",
    "name": "Mobile Accessories BD",
    "slug": "mobile-accessories-bd",
    "description": "All kinds of mobile accessories.",
    "logo": "https://example.com/logo.png",
    "banner": "https://example.com/banner.png",
    "phone": "01700000000",
    "email": "shop@example.com",
    "address": "Dhaka, Bangladesh",
    "status": "active",
    "rating": 4.7,
    "totalReviews": 128,
    "createdAt": "2026-08-16T10:00:00.000Z",
    "updatedAt": "2026-08-16T10:00:00.000Z"
  }
}
```

---

# 4. Create Shop

**POST** `/api/shops`

### Access

Seller

### Authentication

Required

### Request Body

```json
{
  "name": "Mobile Accessories BD",
  "description": "All kinds of mobile accessories.",
  "logo": "https://example.com/logo.png",
  "banner": "https://example.com/banner.png",
  "phone": "01700000000",
  "email": "shop@example.com",
  "address": "Dhaka, Bangladesh"
}
```

### Fields

| Field         | Type   | Required | Description       |
| ------------- | ------ | -------- | ----------------- |
| `name`        | string | Yes      | Shop name         |
| `description` | string | No       | Shop description  |
| `logo`        | string | No       | Shop logo URL     |
| `banner`      | string | No       | Shop banner URL   |
| `phone`       | string | No       | Shop phone number |
| `email`       | string | No       | Shop email        |
| `address`     | string | No       | Shop address      |

### Notes

* `sellerId` is taken from the authenticated user.
* `slug` is generated automatically.
* `rating` starts at `0`.
* `totalReviews` starts at `0`.
* A seller can create only one shop.

### Response

```json
{
  "success": true,
  "message": "Shop created successfully",
  "data": {
    "_id": "66b123456789abcdef123456",
    "sellerId": "66b123456789abcdef654321",
    "name": "Mobile Accessories BD",
    "slug": "mobile-accessories-bd",
    "description": "All kinds of mobile accessories.",
    "logo": "https://example.com/logo.png",
    "banner": "https://example.com/banner.png",
    "phone": "01700000000",
    "email": "shop@example.com",
    "address": "Dhaka, Bangladesh",
    "status": "active",
    "rating": 0,
    "totalReviews": 0,
    "createdAt": "2026-08-16T10:00:00.000Z",
    "updatedAt": "2026-08-16T10:00:00.000Z"
  }
}
```

---

# 5. Update Shop

**PATCH** `/api/shops/:shopId`

### Access

Seller/Admin

### Authentication

Required

### Authorization

* Seller can update only their own shop.
* Admin can update any shop.

### Request Body

All fields are optional.

```json
{
  "name": "Mobile Accessories Bangladesh",
  "description": "Premium mobile accessories shop.",
  "logo": "https://example.com/new-logo.png",
  "banner": "https://example.com/new-banner.png",
  "phone": "01800000000",
  "email": "contact@example.com",
  "address": "Mirpur, Dhaka"
}
```

### Response

```json
{
  "success": true,
  "message": "Shop updated successfully",
  "data": {
    "_id": "66b123456789abcdef123456",
    "sellerId": "66b123456789abcdef654321",
    "name": "Mobile Accessories Bangladesh",
    "slug": "mobile-accessories-bangladesh",
    "description": "Premium mobile accessories shop.",
    "logo": "https://example.com/new-logo.png",
    "banner": "https://example.com/new-banner.png",
    "phone": "01800000000",
    "email": "contact@example.com",
    "address": "Mirpur, Dhaka",
    "status": "active",
    "rating": 4.7,
    "totalReviews": 128,
    "createdAt": "2026-08-16T10:00:00.000Z",
    "updatedAt": "2026-08-16T11:00:00.000Z"
  }
}
```

---

# 6. Delete Shop

**DELETE** `/api/shops/:shopId`

### Access

Seller/Admin

### Authentication

Required

### Authorization

* Seller can delete only their own shop.
* Admin can delete any shop.

### Response

```json
{
  "success": true,
  "message": "Shop deleted successfully",
  "data": null
}
```

---

# 7. Update Shop Status

**PATCH** `/api/shops/:shopId/status`

### Access

Admin

### Authentication

Required

### Request Body

```json
{
  "status": "inactive"
}
```

### Allowed Values

| Value       | Description                           |
| ----------- | ------------------------------------- |
| `active`    | Shop is active and publicly available |
| `inactive`  | Shop is temporarily inactive          |
| `suspended` | Shop is suspended by admin            |

### Response

```json
{
  "success": true,
  "message": "Shop status updated successfully",
  "data": {
    "_id": "66b123456789abcdef123456",
    "sellerId": "66b123456789abcdef654321",
    "name": "Mobile Accessories BD",
    "slug": "mobile-accessories-bd",
    "status": "inactive",
    "rating": 4.7,
    "totalReviews": 128,
    "updatedAt": "2026-08-16T11:30:00.000Z"
  }
}
```

---

# Shop Data Structure

```json
{
  "_id": "ObjectId",
  "sellerId": "ObjectId",
  "name": "string",
  "slug": "string",
  "description": "string",
  "logo": "string | null",
  "banner": "string | null",
  "phone": "string",
  "email": "string",
  "address": "string",
  "status": "active | inactive | suspended",
  "rating": "number",
  "totalReviews": "number",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

---

# Relationships

## Shop → Product

A shop can have multiple products.

```text
Shop 1 ───────── N Product
```

Product stores the relationship:

```json
{
  "shopId": "Shop ObjectId"
}
```

## Shop → Review

Reviews are handled by the separate Review module.

```text
Shop 1 ───────── N Review
```

Review stores the relationship:

```json
{
  "shopId": "Shop ObjectId"
}
```

Shop does not contain a `reviews[]` array.

`rating` and `totalReviews` are cached summary fields and should be updated by the Review module whenever reviews are created, updated, or deleted.

---

# Error Responses

## 400 Bad Request

```json
{
  "success": false,
  "message": "Invalid shop ID"
}
```

## 401 Unauthorized

```json
{
  "success": false,
  "message": "Authentication required"
}
```

## 403 Forbidden

```json
{
  "success": false,
  "message": "You are not allowed to update this shop"
}
```

## 404 Not Found

```json
{
  "success": false,
  "message": "Shop not found"
}
```

## 409 Conflict

```json
{
  "success": false,
  "message": "You already have a shop"
}
```

---

# Endpoint Summary

| Method | Endpoint                    | Access       | Description        |
| ------ | --------------------------- | ------------ | ------------------ |
| GET    | `/api/shops`                | Public       | Get all shops      |
| GET    | `/api/shops/:shopId`        | Public       | Get shop by ID     |
| GET    | `/api/shops/slug/:slug`     | Public       | Get shop by slug   |
| POST   | `/api/shops`                | Seller       | Create shop        |
| PATCH  | `/api/shops/:shopId`        | Seller/Admin | Update shop        |
| DELETE | `/api/shops/:shopId`        | Seller/Admin | Delete shop        |
| PATCH  | `/api/shops/:shopId/status` | Admin        | Update shop status |
