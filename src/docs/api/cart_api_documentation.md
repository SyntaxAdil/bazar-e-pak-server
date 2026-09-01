# Bazar-e-Pak Cart API Documentation

## Base URL

```text
/api/cart
```

All Cart APIs require the user to be **authenticated**.

---

## 1. Get Current User Cart

### `GET /api/cart`

Returns the logged-in user's complete cart.

### Headers

```http
Authorization: Bearer <token>
```

### Request Body

No body required.

### Success Response — `200`

```json
{
  "success": true,
  "message": "Cart fetched successfully",
  "data": {
    "_id": "66c123...",
    "user": "66u123...",
    "items": [
      {
        "_id": "66item123...",
        "product": {
          "_id": "66p123...",
          "name": "iPhone 15",
          "slug": "iphone-15",
          "price": 90000,
          "discountPrice": 85000,
          "stock": 10,
          "images": [
            "https://example.com/iphone.jpg"
          ]
        },
        "shop": {
          "_id": "66s123...",
          "name": "Apple Store",
          "slug": "apple-store"
        },
        "quantity": 2,
        "price": 85000,
        "productName": "iPhone 15",
        "productImage": "https://example.com/iphone.jpg"
      }
    ],
    "totalItems": 2,
    "subtotal": 170000
  }
}
```

---

# 2. Add Product to Cart

### `POST /api/cart/items`

Adds a product to the authenticated user's cart.

If the product already exists in the cart, its quantity is **increased** instead of creating a duplicate item.

### Headers

```http
Authorization: Bearer <token>
Content-Type: application/json
```

### Request Body

```json
{
  "productId": "66p123456789",
  "quantity": 2
}
```

### Fields

| Field       | Type   | Required | Description               |
| ----------- | ------ | -------- | ------------------------- |
| `productId` | String | Yes      | Product MongoDB ID        |
| `quantity`  | Number | Yes      | Number of products to add |

### Success Response — `200`

```json
{
  "success": true,
  "message": "Product added to cart successfully",
  "data": {
    "_id": "66cart123...",
    "user": "66user123...",
    "items": [
      {
        "_id": "66item123...",
        "product": "66product123...",
        "shop": "66shop123...",
        "quantity": 2,
        "price": 85000,
        "productName": "iPhone 15",
        "productImage": "https://example.com/iphone.jpg"
      }
    ],
    "totalItems": 2,
    "subtotal": 170000
  }
}
```

### Possible Errors

#### Product doesn't exist

```json
{
  "success": false,
  "message": "Product not found"
}
```

#### Product unavailable

```json
{
  "success": false,
  "message": "Product is currently unavailable"
}
```

#### Insufficient stock

```json
{
  "success": false,
  "message": "Insufficient product stock"
}
```

---

# 3. Update Cart Item Quantity

### `PATCH /api/cart/items/:productId`

Changes the quantity of an existing cart item.

### Example

```http
PATCH /api/cart/items/66p123456789
```

### Headers

```http
Authorization: Bearer <token>
Content-Type: application/json
```

### Request Body

```json
{
  "quantity": 5
}
```

### Success Response — `200`

```json
{
  "success": true,
  "message": "Cart item updated successfully",
  "data": {
    "_id": "66cart123...",
    "user": "66user123...",
    "items": [
      {
        "_id": "66item123...",
        "product": "66product123...",
        "shop": "66shop123...",
        "quantity": 5,
        "price": 85000,
        "productName": "iPhone 15",
        "productImage": "https://example.com/iphone.jpg"
      }
    ],
    "totalItems": 5,
    "subtotal": 425000
  }
}
```

### Possible Errors

```json
{
  "success": false,
  "message": "Cart item not found"
}
```

or

```json
{
  "success": false,
  "message": "Insufficient product stock"
}
```

---

# 4. Remove Product from Cart

### `DELETE /api/cart/items/:productId`

Removes a specific product from the authenticated user's cart.

### Example

```http
DELETE /api/cart/items/66p123456789
```

### Headers

```http
Authorization: Bearer <token>
```

### Request Body

No body required.

### Success Response — `200`

```json
{
  "success": true,
  "message": "Product removed from cart successfully",
  "data": {
    "_id": "66cart123...",
    "user": "66user123...",
    "items": [],
    "totalItems": 0,
    "subtotal": 0
  }
}
```

### Error

```json
{
  "success": false,
  "message": "Cart item not found"
}
```

---

# 5. Clear Entire Cart

### `DELETE /api/cart`

Removes **all products** from the authenticated user's cart.

### Headers

```http
Authorization: Bearer <token>
```

### Request Body

No body required.

### Success Response — `200`

```json
{
  "success": true,
  "message": "Cart cleared successfully",
  "data": {
    "_id": "66cart123...",
    "user": "66user123...",
    "items": [],
    "totalItems": 0,
    "subtotal": 0
  }
}
```

---

# Cart API Summary

| Method   | Endpoint                     | Auth | Purpose         |
| -------- | ---------------------------- | ---: | --------------- |
| `GET`    | `/api/cart`                  |    ✅ | Get user's cart |
| `POST`   | `/api/cart/items`            |    ✅ | Add product     |
| `PATCH`  | `/api/cart/items/:productId` |    ✅ | Update quantity |
| `DELETE` | `/api/cart/items/:productId` |    ✅ | Remove product  |
| `DELETE` | `/api/cart`                  |    ✅ | Clear cart      |

---

# Cart Data Structure

A user's cart looks conceptually like this:

```json
{
  "user": "USER_ID",
  "items": [
    {
      "product": "PRODUCT_ID",
      "shop": "SHOP_ID",
      "quantity": 2,
      "price": 85000,
      "productName": "iPhone 15",
      "productImage": "IMAGE_URL"
    }
  ],
  "totalItems": 2,
  "subtotal": 170000
}
```

### Important logic

**Adding a new product:**

```text
Cart
 └── Product A × 2
```

**Adding Product A again with quantity 3:**

```text
Cart
 └── Product A × 5
```

It does **not** create:

```text
Product A × 2
Product A × 3
```

---

# Complete Cart Flow

```text
User Login
    ↓
Authentication
    ↓
GET /api/cart
    ↓
User's Cart
    ↓
POST /api/cart/items
    ↓
Check Product
    ↓
Check Product Status
    ↓
Check Stock
    ↓
Check Existing Cart Item
    ↓
Add / Increase Quantity
    ↓
Calculate Subtotal
    ↓
Return Updated Cart
```

For frontend integration, the main APIs you'll normally use are:

```text
GET     /api/cart
POST    /api/cart/items
PATCH   /api/cart/items/:productId
DELETE  /api/cart/items/:productId
DELETE  /api/cart
```

This gives you the complete **Cart CRUD/API layer** needed before moving into the checkout/order system.
