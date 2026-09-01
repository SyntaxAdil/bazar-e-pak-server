# Product API Documentation

---

## 📋 Overview

The Product API provides a robust interface for managing products, discounts, featured products, sales tracking, customer interaction tracking, retrieval, creation, updating, and soft deletion.

---

## 🔐 Access Control Matrix

| Role         | Permissions                                                       |
| :----------- | :---------------------------------------------------------------- |
| **Customer** | View products, track product interactions                         |
| **Seller**   | Create, update, delete own products, manage own featured products |
| **Admin**    | Create, update, delete any product, manage featured products      |

---

## 🛠 Endpoints

### 1. Get All Products

Retrieves a paginated list of products with optional filtering.

* **Endpoint:** `GET /api/products`
* **Authentication:** Not required.

#### Query Parameters

| Parameter    | Type     | Required | Description                      |
| :----------- | :------- | :------- | :------------------------------- |
| `search`     | string   | No       | Search products by name          |
| `categoryId` | ObjectId | No       | Filter by category ID            |
| `shopId`     | ObjectId | No       | Filter by shop ID                |
| `status`     | string   | No       | Filter by `active` or `inactive` |
| `isFeatured` | boolean  | No       | Filter featured products         |
| `page`       | number   | No       | Page number, default: `1`        |
| `limit`      | number   | No       | Items per page, default: `20`    |

---

### 2. Get Single Product

Fetches details of a specific product by its ID.

* **Endpoint:** `GET /api/products/:id`
* **Authentication:** Not required.

---

### 3. Get Best Selling Products

Retrieves top-selling products based on purchase count.

If products have no purchases, products are ranked using review statistics.

* **Endpoint:** `GET /api/products/best-selling`
* **Authentication:** Not required.

#### Query Parameters

| Parameter    | Type     | Required | Description                                                |
| :----------- | :------- | :------- | :--------------------------------------------------------- |
| `limit`      | number   | No       | Number of products to return, default: `10`, maximum: `50` |
| `shopId`     | ObjectId | No       | Filter by shop                                             |
| `categoryId` | ObjectId | No       | Filter by category                                         |

#### Ranking Logic

1. Products with higher `purchaseCount` are ranked first.
2. When purchase counts are equal, `averageRating` is considered.
3. `reviewCount` is used as an additional ranking factor.

---

### 4. Create Product

Creates a new product record.

* **Endpoint:** `POST /api/products`
* **Authentication:** Required
* **Allowed Roles:** `seller`, `admin`

#### Request Body

```json
{
  "name": "Wireless Earbuds",
  "description": "High quality wireless earbuds.",
  "price": 2500,
  "stock": 50,
  "images": [
    "https://example.com/product.png"
  ],
  "categoryId": "66b123456789abcdef123456",
  "shopId": "66b123456789abcdef654321",
  "status": "active",
  "discount": 50
}
```

`sellerId` is derived automatically from the authenticated user/shop.

`discount` represents the percentage discount. Frontend calculates the discounted price.

---

### 5. Update Product

Updates existing product details.

* **Endpoint:** `PATCH /api/products/:id`
* **Authentication:** Required
* **Allowed Roles:** `seller`, `admin`

Sellers can only update their own products.

Admins can update any product.

#### Request Body

All fields are optional.

```json
{
  "name": "Updated Wireless Earbuds",
  "price": 2500,
  "stock": 40,
  "discount": 30,
  "status": "active"
}
```

---

### 6. Delete Product

Performs a soft delete on a product.

* **Endpoint:** `DELETE /api/products/:id`
* **Authentication:** Required
* **Allowed Roles:** `seller`, `admin`

Sets `isDeleted = true`.

---

### 7. Set Product as Featured

Allows a seller to mark or unmark their own product as featured.

* **Endpoint:** `PATCH /api/products/:id/featured`
* **Authentication:** Required
* **Allowed Roles:** `seller`, `admin`

#### Request Body

```json
{
  "isFeatured": true
}
```

Sellers can only manage their own products.

Admins can manage any product.

---

### 8. Track Product Purchase

Increases the purchase count of a product.

* **Endpoint:** `POST /api/products/:id/purchase`
* **Authentication:** Required
* **Allowed Roles:** `customer`, `seller`, `admin`

#### Request Body

```json
{
  "quantity": 2
}
```

The `purchaseCount` is increased according to the purchased quantity.

---

### 9. Track WhatsApp Click

Tracks when a customer clicks the WhatsApp contact option for a product.

* **Endpoint:** `POST /api/products/:id/whatsapp-click`
* **Authentication:** Not required

Each successful request increments `whatsappClicks` by `1`.

---

### 10. Track Call Click

Tracks when a customer clicks the call/contact option for a product.

* **Endpoint:** `POST /api/products/:id/call-click`
* **Authentication:** Not required

Each successful request increments `callClicks` by `1`.

---

## 📊 Data Schema

| Field            | Type     | Required | Default   | Description              |
| :--------------- | :------- | :------- | :-------- | :----------------------- |
| `name`           | String   | Yes      | -         | Product name             |
| `description`    | String   | Yes      | -         | Product description      |
| `price`          | Number   | Yes      | -         | Original product price   |
| `stock`          | Number   | Yes      | `0`       | Available inventory      |
| `images`         | String[] | No       | `[]`      | Product image URLs       |
| `categoryId`     | ObjectId | Yes      | -         | Associated category      |
| `shopId`         | ObjectId | Yes      | -         | Associated shop          |
| `sellerId`       | String   | Yes      | Auth user | Product owner            |
| `status`         | String   | No       | `active`  | `active` / `inactive`    |
| `discount`       | Number   | No       | `0`       | Discount percentage      |
| `isFeatured`     | Boolean  | No       | `false`   | Featured product status  |
| `purchaseCount`  | Number   | No       | `0`       | Total purchased quantity |
| `whatsappClicks` | Number   | No       | `0`       | Total WhatsApp clicks    |
| `callClicks`     | Number   | No       | `0`       | Total call clicks        |
| `averageRating`  | Number   | No       | `0`       | Cached average rating    |
| `reviewCount`    | Number   | No       | `0`       | Cached review count      |
| `isDeleted`      | Boolean  | No       | `false`   | Soft delete flag         |
| `createdAt`      | Date     | No       | -         | Creation timestamp       |
| `updatedAt`      | Date     | No       | -         | Last update timestamp    |

---

## ✅ Validation Rules

* **`name`:** 2–150 characters.
* **`description`:** Maximum 5000 characters.
* **`price`:** Must be `>= 0`.
* **`stock`:** Integer and must be `>= 0`.
* **`images`:** Maximum 10 valid URLs.
* **`categoryId/shopId`:** Valid MongoDB ObjectIds.
* **`status`:** `active` or `inactive`.
* **`discount`:** Number from `0` to `100`.
* **`isFeatured`:** Boolean.
* **`purchaseCount`:** Integer and must be `>= 0`.
* **`whatsappClicks`:** Integer and must be `>= 0`.
* **`callClicks`:** Integer and must be `>= 0`.

---

## 📈 Product Ranking

Best-selling products use:

```text
purchaseCount
↓
averageRating
↓
reviewCount
```

Products with higher purchase counts appear first. When purchase data is unavailable or equal, review rating and review count are used.

---

## ⚠️ Status Codes

| Status | Meaning                        |
| :----- | :----------------------------- |
| `200`  | Request successful             |
| `201`  | Product created successfully   |
| `400`  | Validation error / Bad request |
| `401`  | Authentication required        |
| `403`  | Permission denied              |
| `404`  | Product not found              |
| `409`  | Conflict                       |
| `500`  | Internal server error          |

---

## 📌 Endpoint Summary

| Method | Endpoint                           | Access        | Description               |
| :----- | :--------------------------------- | :------------ | :------------------------ |
| GET    | `/api/products`                    | Public        | Get all products          |
| GET    | `/api/products/:id`                | Public        | Get product by ID         |
| GET    | `/api/products/best-selling`       | Public        | Get best-selling products |
| POST   | `/api/products`                    | Seller/Admin  | Create product            |
| PATCH  | `/api/products/:id`                | Seller/Admin  | Update product            |
| DELETE | `/api/products/:id`                | Seller/Admin  | Soft delete product       |
| PATCH  | `/api/products/:id/featured`       | Seller/Admin  | Set/unset featured        |
| POST   | `/api/products/:id/purchase`       | Authenticated | Track purchase            |
| POST   | `/api/products/:id/whatsapp-click` | Public        | Track WhatsApp click      |
| POST   | `/api/products/:id/call-click`     | Public        | Track call click          |
