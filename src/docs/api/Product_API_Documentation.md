# Product API Documentation

---

## 📋 Overview
The Product API provides a robust interface for managing product data, including retrieval, creation, updating, and soft deletion. This API is designed to support customer, seller, and administrator interactions based on specific permission levels.

---

## 🔐 Access Control Matrix

| Role | Permissions |
| :--- | :--- |
| **Customer** | View products |
| **Seller** | Create, update, and delete own products |
| **Admin** | Create, update, and delete any product |

---

## 🛠 Endpoints

### 1. Get All Products
Retrieves a paginated list of products with optional filtering.

*   **Endpoint:** `GET /api/products`
*   **Authentication:** Not required.

#### Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `search` | string | No | Search products by name |
| `categoryId` | ObjectId | No | Filter by category ID |
| `shopId` | ObjectId | No | Filter by shop ID |
| `status` | string | No | Filter by `active` or `inactive` |
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 20) |

---

### 2. Get Single Product
Fetches details of a specific product by its ID.

*   **Endpoint:** `GET /api/products/:id`
*   **Authentication:** Not required.

---

### 3. Create Product
Creates a new product record.

*   **Endpoint:** `POST /api/products`
*   **Authentication:** Required (`Authorization: Bearer <token>`)
*   **Allowed Roles:** `seller`, `admin`
*   **Note:** `sellerId` is derived automatically from the authenticated user.

---

### 4. Update Product
Updates existing product details.

*   **Endpoint:** `PATCH /api/products/:id`
*   **Authentication:** Required (`Authorization: Bearer <token>`)
*   **Allowed Roles:** `seller`, `admin`
*   **Permission:** Sellers can only update their own products; Admins can update any.

---

### 5. Delete Product
Performs a soft delete on a product.

*   **Endpoint:** `DELETE /api/products/:id`
*   **Authentication:** Required (`Authorization: Bearer <token>`)
*   **Allowed Roles:** `seller`, `admin`
*   **Mechanism:** Sets `isDeleted = true`.

---

## 📊 Data Schema

| Field | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `name` | String | Yes | - | Product name |
| `description` | String | Yes | - | Product description |
| `price` | Number | Yes | - | Product price |
| `stock` | Number | Yes | 0 | Available inventory |
| `images` | String[] | No | `[]` | Array of image URLs |
| `categoryId` | ObjectId | Yes | - | Associated Category ID |
| `shopId` | ObjectId | Yes | - | Associated Shop ID |
| `sellerId` | String | Yes | Auth user | Owner ID |
| `status` | String | No | `active` | Status: `active` / `inactive` |
| `isDeleted` | Boolean | No | `false` | Soft delete flag |

---

## ✅ Validation Rules

*   **name:** 2–150 characters (Required).
*   **description:** Max 5000 characters (Required).
*   **price:** Must be $\ge$ 0 (Required).
*   **stock:** Must be integer $\ge$ 0 (Required).
*   **images:** Max 10 items; must be valid URLs.
*   **categoryId/shopId:** Valid MongoDB ObjectIds.
*   **status:** `active` or `inactive`.

---

## ⚠️ Status Codes

| Status | Meaning |
| :--- | :--- |
| `200` | Request successful |
| `201` | Product created successfully |
| `400` | Validation error / Bad request |
| `401` | Authentication required |
| `403` | Permission denied |
| `404` | Resource not found |
| `409` | Conflict |
| `500` | Internal server error |
