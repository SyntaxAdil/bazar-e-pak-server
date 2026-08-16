# Category API Documentation

## Base URL

```text
/api/categories
```

## Roles

| Role     | Permission                                             |
| -------- | ------------------------------------------------------ |
| Guest    | View active categories                                 |
| Customer | View active categories                                 |
| Seller   | View active categories                                 |
| Admin    | Create, update, delete, activate/deactivate categories |

> Category management is restricted to **admin**. Sellers and customers can only browse categories.

---

# Category Structure

Each category contains:

```json
{
  "_id": "66b123456789abcdef123456",
  "name": "Mobile Accessories",
  "slug": "mobile-accessories",
  "description": "Mobile phones and related accessories",
  "image": "https://example.com/category.jpg",
  "status": "active",
  "isDeleted": false,
  "createdAt": "2026-08-16T10:00:00.000Z",
  "updatedAt": "2026-08-16T10:00:00.000Z"
}
```

### Status

```text
active
inactive
```

### Soft Delete

Categories are not permanently deleted.

```text
isDeleted: true
```

Deleted categories are hidden from normal public listings.

---

# Endpoints

## 1. Get All Categories

### Endpoint

```http
GET /api/categories
```

### Access

```text
Public
```

### Query Parameters

| Parameter | Type            | Required | Description             |
| --------- | --------------- | -------: | ----------------------- |
| search    | string          |       No | Search by category name |
| status    | active/inactive |       No | Filter by status        |
| page      | number          |       No | Page number             |
| limit     | number          |       No | Items per page          |

### Example

```http
GET /api/categories?page=1&limit=20
```

### Search

```http
GET /api/categories?search=mobile
```

### Filter

```http
GET /api/categories?status=active
```

### Response

```json
{
  "success": true,
  "message": "Categories fetched successfully",
  "data": [
    {
      "_id": "66b123456789abcdef123456",
      "name": "Mobile Accessories",
      "slug": "mobile-accessories",
      "description": "Mobile phones and related accessories",
      "image": "https://example.com/category.jpg",
      "status": "active",
      "isDeleted": false,
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

# 2. Get Category By ID

### Endpoint

```http
GET /api/categories/:categoryId
```

### Access

```text
Public
```

### Example

```http
GET /api/categories/66b123456789abcdef123456
```

### Response

```json
{
  "success": true,
  "message": "Category fetched successfully",
  "data": {
    "_id": "66b123456789abcdef123456",
    "name": "Mobile Accessories",
    "slug": "mobile-accessories",
    "description": "Mobile phones and related accessories",
    "image": "https://example.com/category.jpg",
    "status": "active",
    "isDeleted": false,
    "createdAt": "2026-08-16T10:00:00.000Z",
    "updatedAt": "2026-08-16T10:00:00.000Z"
  }
}
```

---

# 3. Get Category By Slug

### Endpoint

```http
GET /api/categories/slug/:slug
```

### Access

```text
Public
```

### Example

```http
GET /api/categories/slug/mobile-accessories
```

### Response

```json
{
  "success": true,
  "message": "Category fetched successfully",
  "data": {
    "_id": "66b123456789abcdef123456",
    "name": "Mobile Accessories",
    "slug": "mobile-accessories",
    "description": "Mobile phones and related accessories",
    "image": "https://example.com/category.jpg",
    "status": "active",
    "isDeleted": false
  }
}
```

---

# 4. Create Category

### Endpoint

```http
POST /api/categories
```

### Access

```text
Admin only
```

### Headers

```http
Authorization: Bearer <token>
Content-Type: application/json
```

### Request Body

```json
{
  "name": "Mobile Accessories",
  "description": "Mobile phones and related accessories",
  "image": "https://example.com/category.jpg"
}
```

### Response

```json
{
  "success": true,
  "message": "Category created successfully",
  "data": {
    "_id": "66b123456789abcdef123456",
    "name": "Mobile Accessories",
    "slug": "mobile-accessories",
    "description": "Mobile phones and related accessories",
    "image": "https://example.com/category.jpg",
    "status": "active",
    "isDeleted": false
  }
}
```

### Important

`slug`, `status`, and `isDeleted` should **not be trusted from the frontend**.

The server should generate:

```text
slug → automatically
status → active
isDeleted → false
```

---

# 5. Update Category

### Endpoint

```http
PATCH /api/categories/:categoryId
```

### Access

```text
Admin only
```

### Request

```json
{
  "name": "Mobile & Phone Accessories",
  "description": "Phones, chargers, cases and other accessories",
  "image": "https://example.com/new-category.jpg"
}
```

### Response

```json
{
  "success": true,
  "message": "Category updated successfully",
  "data": {
    "_id": "66b123456789abcdef123456",
    "name": "Mobile & Phone Accessories",
    "slug": "mobile-phone-accessories",
    "description": "Phones, chargers, cases and other accessories",
    "image": "https://example.com/new-category.jpg",
    "status": "active",
    "isDeleted": false
  }
}
```

If the category name changes, the server should regenerate the slug.

---

# 6. Update Category Status

### Endpoint

```http
PATCH /api/categories/:categoryId/status
```

### Access

```text
Admin only
```

### Request

```json
{
  "status": "inactive"
}
```

### Response

```json
{
  "success": true,
  "message": "Category status updated successfully",
  "data": {
    "_id": "66b123456789abcdef123456",
    "name": "Mobile Accessories",
    "status": "inactive"
  }
}
```

### Available Status

```text
active
inactive
```

---

# 7. Delete Category

### Endpoint

```http
DELETE /api/categories/:categoryId
```

### Access

```text
Admin only
```

### Example

```http
DELETE /api/categories/66b123456789abcdef123456
```

### Response

```json
{
  "success": true,
  "message": "Category deleted successfully",
  "data": null
}
```

This should perform a **soft delete**:

```json
{
  "isDeleted": true
}
```

The document should remain in MongoDB.

---

# Product ↔ Category Relation

Each Product contains:

```json
{
  "categoryId": "66b123456789abcdef123456"
}
```

Relationship:

```text
Category
   │
   │ categoryId
   ▼
Product
```

When creating a product:

```json
{
  "name": "Fast Charger",
  "description": "25W fast charger",
  "price": 1200,
  "stock": 50,
  "categoryId": "66b123456789abcdef123456",
  "shopId": "66c123456789abcdef123456",
  "images": []
}
```

Backend validates:

```text
1. Category exists
2. Category is active
3. Shop exists
4. Shop is active
5. Seller owns the shop
```

Only then the Product is created.

---

# Category Filtering Through Product API

Products can be filtered using:

```http
GET /api/products?categoryId=<categoryId>
```

Example:

```http
GET /api/products?categoryId=66b123456789abcdef123456
```

This returns products belonging to that category.

---

# Permission Summary

| Action                  | Guest | Customer | Seller | Admin |
| ----------------------- | :---: | :------: | :----: | :---: |
| View categories         |  ✅   |    ✅    |   ✅   |  ✅   |
| Search categories       |  ✅   |    ✅    |   ✅   |  ✅   |
| Filter categories       |  ✅   |    ✅    |   ✅   |  ✅   |
| Create category         |  ❌   |    ❌    |   ❌   |  ✅   |
| Update category         |  ❌   |    ❌    |   ❌   |  ✅   |
| Change category status  |  ❌   |    ❌    |   ❌   |  ✅   |
| Delete category         |  ❌   |    ❌    |   ❌   |  ✅   |
| Use category in Product |  ❌   |    ❌    |   ✅   |  ✅   |

### Final API List

```text
GET    /api/categories
GET    /api/categories/:categoryId
GET    /api/categories/slug/:slug

POST   /api/categories

PATCH  /api/categories/:categoryId
PATCH  /api/categories/:categoryId/status

DELETE /api/categories/:categoryId
```
