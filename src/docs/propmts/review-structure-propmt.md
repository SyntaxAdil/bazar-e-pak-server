# Prompt: Implement Review Module for Bazar-e-Pak

I am building the backend for a marketplace project called Bazar-e-Pak.

The backend follows a modular MVC architecture using:

- Bun
- Node.js
- Express.js
- JavaScript (ES Modules)
- MongoDB
- Mongoose
- Zod
- Better Auth / existing authentication system
- Centralized error handling
- Middleware-based authentication and role authorization

The project already has a Shop module and Product module.

IMPORTANT:
Do not redesign the existing architecture.
Do not introduce a new architecture.
Do not move files unnecessarily.
Follow the same structure, naming conventions, middleware pattern, response format, validation approach, and error-handling approach already used by the existing modules.

--------------------------------------------------
CURRENT MODULE STRUCTURE
--------------------------------------------------

The existing Shop module looks like this:

src/modules/shops/
├── shop.model.js
├── shop.validation.js
├── shop.repository.js
├── shop.service.js
├── shop.controller.js
└── shop.route.js

The Product module follows the same modular pattern.

The main routes are registered through:

src/routes/index.js

The API follows REST conventions.

--------------------------------------------------
SHOP RELATIONSHIP
--------------------------------------------------

Shop already exists.

Shop contains these important fields:

- _id
- sellerId
- name
- slug
- description
- logo
- banner
- phone
- email
- address
- status
- rating
- totalReviews
- createdAt
- updatedAt

IMPORTANT:

The Shop model does NOT contain:

reviews: []

Reviews must NOT be embedded inside Shop.

Reviews must be stored in a separate MongoDB collection and separate Review module.

The relationship must be:

Shop 1 ───────── N Review

Review stores:

shopId → Shop._id

Similarly:

Shop 1 ───────── N Product

Product stores:

shopId → Shop._id

--------------------------------------------------
OBJECTIVE
--------------------------------------------------

Create a complete Review module.

The Review module must be independent from the Shop module but connected to it through shopId.

The Review module must support:

1. Create a review
2. Get reviews for a shop
3. Get a single review
4. Update own review
5. Delete own review
6. Admin moderation/management
7. Rating calculation
8. Shop rating synchronization
9. Prevent duplicate reviews
10. Proper authentication and authorization
11. Validation
12. Pagination
13. Filtering/sorting where appropriate
14. Proper error handling

--------------------------------------------------
REVIEW MODULE STRUCTURE
--------------------------------------------------

Create exactly this structure:

src/modules/reviews/
├── review.model.js
├── review.validation.js
├── review.repository.js
├── review.service.js
├── review.controller.js
└── review.route.js

Do not put review files inside the Shop module.

Do not create unnecessary files unless the existing project architecture already requires them.

--------------------------------------------------
REVIEW DATA MODEL
--------------------------------------------------

Create a Mongoose Review model.

Recommended fields:

_review fields:

- _id
- shopId
- userId
- rating
- comment
- status
- createdAt
- updatedAt

Use:

shopId:
mongoose.Schema.Types.ObjectId
ref: "Shop"

Use:

userId:
mongoose.Schema.Types.ObjectId

The Review model should reference the Shop collection.

Recommended status values:

- published
- hidden

Default:

published

Rating must:

- be a number
- be an integer
- minimum 1
- maximum 5

Comment must:

- be a string
- have a reasonable minimum length
- have a reasonable maximum length
- be trimmed

Add appropriate indexes.

At minimum consider:

- shopId
- userId
- shopId + userId
- status
- createdAt

IMPORTANT:

One customer must not be able to create multiple reviews for the same shop.

The database should enforce this where appropriate.

Use a compound unique index:

shopId + userId

However, handle duplicate-key errors properly in the service/error handling layer so the API returns a clean 409 response instead of a MongoDB error.

--------------------------------------------------
REVIEW USER INFORMATION
--------------------------------------------------

Do not unnecessarily duplicate complete user information inside Review.

The source of truth for the user should remain the authentication/user system.

If the existing project architecture already uses a safe snapshot approach for display data, follow that convention.

Otherwise, keep the Review model simple:

- userId
- shopId
- rating
- comment
- status
- timestamps

Do not invent fields that are not needed.

--------------------------------------------------
API BASE URL
--------------------------------------------------

Use:

/api/reviews

--------------------------------------------------
REVIEW ENDPOINTS
--------------------------------------------------

Implement these endpoints.

1. Create Review

POST /api/reviews

Access:
Authenticated customer

Request body:

{
  "shopId": "SHOP_ID",
  "rating": 5,
  "comment": "Excellent shop and service."
}

Rules:

- User must be authenticated.
- User must have the customer role.
- shopId must be valid.
- Shop must exist.
- Shop should be eligible to receive reviews.
- Rating must be between 1 and 5.
- Comment must pass validation.
- User must not already have a review for the same shop.
- userId must come from authenticated session/user.
- Never trust userId from request body.
- Create the review.
- Recalculate the shop's rating.
- Update Shop.rating.
- Update Shop.totalReviews.

Do not allow the client to send:

- userId
- status
- createdAt
- updatedAt

These are server-controlled fields.

--------------------------------------------------
2. Get Shop Reviews
--------------------------------------------------

GET /api/reviews/shop/:shopId

Access:
Public

Query parameters:

- page
- limit
- rating
- sort

Example:

GET /api/reviews/shop/SHOP_ID?page=1&limit=10

Possible rating filter:

GET /api/reviews/shop/SHOP_ID?rating=5

Possible sorting:

- newest
- oldest
- highest
- lowest

Default sorting:

newest

Only published reviews should be returned to public users.

Response should include:

- reviews
- pagination
- rating summary if useful

Example:

{
  "success": true,
  "message": "Shop reviews fetched successfully",
  "data": [
    {
      "_id": "REVIEW_ID",
      "shopId": "SHOP_ID",
      "userId": "USER_ID",
      "rating": 5,
      "comment": "Excellent shop.",
      "status": "published",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}

--------------------------------------------------
3. Get Single Review
--------------------------------------------------

GET /api/reviews/:reviewId

Access:
Public if published.

Admin can view hidden reviews.

The service layer must enforce the visibility rule.

--------------------------------------------------
4. Update Review
--------------------------------------------------

PATCH /api/reviews/:reviewId

Access:

- Review owner
- Admin

Customer can update only their own review.

Admin can update any review.

Request body:

{
  "rating": 4,
  "comment": "Updated review."
}

Both fields are optional.

Do not allow the user to modify:

- userId
- shopId
- status
- createdAt

When rating changes:

1. Update the review.
2. Recalculate shop rating.
3. Update Shop.rating.
4. Update Shop.totalReviews if necessary.

--------------------------------------------------
5. Delete Review
--------------------------------------------------

DELETE /api/reviews/:reviewId

Access:

- Review owner
- Admin

Rules:

- Customer can delete only their own review.
- Admin can delete any review.
- After deletion:
  - recalculate shop rating
  - update Shop.rating
  - update Shop.totalReviews

If no reviews remain:

Shop.rating = 0
Shop.totalReviews = 0

--------------------------------------------------
6. Admin Hide Review
--------------------------------------------------

PATCH /api/reviews/:reviewId/status

Access:

Admin only

Request:

{
  "status": "hidden"
}

or:

{
  "status": "published"
}

When a review becomes hidden:

It must NOT contribute to the public shop rating.

Therefore:

- hidden review should be excluded from rating calculation
- Shop.rating must be recalculated
- Shop.totalReviews must be recalculated

When a hidden review becomes published:

- include it in rating calculation
- update Shop.rating
- update Shop.totalReviews

--------------------------------------------------
RATING CALCULATION
--------------------------------------------------

Shop already contains:

rating
totalReviews

These are cached summary values.

The Review module is responsible for keeping them synchronized.

Only reviews with:

status = "published"

should contribute to the shop rating.

Example:

Reviews:

5
4
5
3

Average:

(5 + 4 + 5 + 3) / 4 = 4.25

Store:

rating = 4.3

totalReviews = 4

Round the rating to one decimal place.

If there are no published reviews:

rating = 0
totalReviews = 0

--------------------------------------------------
RATING UPDATE FLOW
--------------------------------------------------

Whenever a review is:

- created
- updated
- deleted
- hidden
- published

the service must recalculate the shop's rating.

The logic should be:

1. Find all published reviews for the shop.
2. Calculate total number of published reviews.
3. Calculate average rating.
4. Round to one decimal.
5. Update Shop.rating.
6. Update Shop.totalReviews.

Keep this logic in the Review service/repository layer.

Do not put review business logic inside Shop controller.

--------------------------------------------------
OWNERSHIP / AUTHORIZATION
--------------------------------------------------

Authentication must use the project's existing auth middleware.

Do not create a second authentication system.

Use the existing:

authMiddleware

and:

checkRoleMiddleware

or whatever exact middleware names already exist in the project.

Follow the existing project implementation instead of inventing new middleware.

Roles:

customer
seller
admin

Review permissions:

CUSTOMER:
- create review
- view public reviews
- update own review
- delete own review

SELLER:
- view public reviews
- cannot edit/delete customer reviews
- cannot change review status unless explicitly authorized by existing requirements

ADMIN:
- view all reviews
- update any review
- delete any review
- publish/hide reviews

IMPORTANT:

Do not trust role information from request body.

Use authenticated user information.

--------------------------------------------------
VALIDATION
--------------------------------------------------

Use Zod.

Create:

review.validation.js

Validate:

Create Review:

- shopId
- rating
- comment

Update Review:

- rating optional
- comment optional

Review ID:

- valid MongoDB ObjectId

Shop ID:

- valid MongoDB ObjectId

Status:

- published
- hidden

Query:

- page
- limit
- rating
- sort

Do not manually duplicate validation logic inside controllers.

--------------------------------------------------
REPOSITORY LAYER
--------------------------------------------------

review.repository.js should contain database operations only.

Examples:

- createReview
- findReviewById
- findReviewByUserAndShop
- findReviewsByShop
- countReviews
- updateReviewById
- deleteReviewById
- updateReviewStatus
- calculateShopRating if appropriate for the existing architecture

Do not put HTTP logic inside repository.

Do not put authorization logic inside repository.

--------------------------------------------------
SERVICE LAYER
--------------------------------------------------

review.service.js contains all business rules.

It should handle:

- shop existence check
- duplicate review check
- ownership verification
- admin permission logic
- review creation
- review update
- review deletion
- review status changes
- rating recalculation
- Shop.rating synchronization
- Shop.totalReviews synchronization

The service should never trust userId from the request body.

Use authenticated user ID.

--------------------------------------------------
CONTROLLER LAYER
--------------------------------------------------

review.controller.js should remain thin.

It should:

1. Read request data.
2. Validate using Zod.
3. Call the service.
4. Return consistent JSON response.

Do not put database queries directly inside controllers.

Do not put complex business logic inside controllers.

--------------------------------------------------
ROUTES
--------------------------------------------------

review.route.js should define:

POST   /api/reviews
GET    /api/reviews/shop/:shopId
GET    /api/reviews/:reviewId
PATCH  /api/reviews/:reviewId
DELETE /api/reviews/:reviewId
PATCH  /api/reviews/:reviewId/status

Use the existing authentication and role middleware.

Public routes should remain public.

Protected routes must use the existing authentication middleware.

Role restrictions must use the existing role middleware.

--------------------------------------------------
ROUTE REGISTRATION
--------------------------------------------------

Update:

src/routes/index.js

Add:

router.use(
  "/reviews",
  reviewRoutes
);

Do not remove existing routes.

Do not change existing Product or Shop routes unnecessarily.

--------------------------------------------------
SHOP MODEL INTEGRATION
--------------------------------------------------

The Shop model already has:

rating
totalReviews

Do not add:

reviews: []

Do not embed reviews.

The Review collection references Shop through:

shopId

Example:

Review:
{
  "_id": "...",
  "shopId": "SHOP_ID",
  "userId": "USER_ID",
  "rating": 5,
  "comment": "Excellent",
  "status": "published"
}

Shop:

{
  "_id": "SHOP_ID",
  "rating": 4.7,
  "totalReviews": 128
}

--------------------------------------------------
PRODUCT RELATION
--------------------------------------------------

Do not modify Product functionality unless necessary.

Product already references Shop using:

shopId

Relationship:

Shop 1 ───────── N Product

Review relationship:

Shop 1 ───────── N Review

User 1 ───────── N Review

--------------------------------------------------
ERROR HANDLING
--------------------------------------------------

Use the project's existing centralized error handling.

Expected errors:

400:
Invalid request / validation

401:
Authentication required

403:
User does not have permission

404:
Shop not found
Review not found

409:
User already reviewed this shop

Do not expose raw MongoDB errors to clients.

Duplicate-key errors must be converted to a clean API error.

--------------------------------------------------
RESPONSE FORMAT
--------------------------------------------------

Follow the existing project response format.

Successful responses should follow:

{
  "success": true,
  "message": "...",
  "data": ...
}

Errors should follow the existing global error response format.

Do not introduce a completely different response structure.

--------------------------------------------------
IMPORTANT SECURITY RULES
--------------------------------------------------

Never trust:

userId
role
shop ownership
status

from the client.

Always derive authenticated user identity from the existing authentication system.

Customer can only modify/delete their own review.

Admin can manage all reviews.

Never allow a customer to modify shopId after review creation.

Never allow a customer to modify another user's review.

--------------------------------------------------
IMPORTANT ARCHITECTURE RULES
--------------------------------------------------

Follow the existing project architecture exactly.

Use:

Route
→ Middleware
→ Controller
→ Service
→ Repository
→ Model

Do not:

- put database queries in routes
- put database queries directly in controllers
- put business logic in models unnecessarily
- duplicate authentication systems
- duplicate Shop functionality
- embed reviews in Shop
- create unnecessary modules
- introduce TypeScript
- introduce Prisma
- introduce SQL
- introduce another database
- change the existing authentication system

Use JavaScript ES Modules.

Use async/await.

Keep functions small and readable.

--------------------------------------------------
FINAL FILES TO PRODUCE
--------------------------------------------------

Create:

src/modules/reviews/review.model.js

src/modules/reviews/review.validation.js

src/modules/reviews/review.repository.js

src/modules/reviews/review.service.js

src/modules/reviews/review.controller.js

src/modules/reviews/review.route.js

Update:

src/routes/index.js

If any existing file must be modified for the Review ↔ Shop relationship, clearly explain exactly what was changed and why.

--------------------------------------------------
EXPECTED FINAL API
--------------------------------------------------

GET    /api/reviews/shop/:shopId
GET    /api/reviews/:reviewId

POST   /api/reviews

PATCH  /api/reviews/:reviewId
DELETE /api/reviews/:reviewId

PATCH  /api/reviews/:reviewId/status

--------------------------------------------------
IMPLEMENTATION REQUIREMENT
--------------------------------------------------

Before writing code, inspect the existing project structure and existing implementations of:

- Product module
- Shop module
- auth middleware
- role middleware
- error middleware
- response utilities
- route registration

Then match those conventions.

Do not blindly copy a generic architecture.

The final Review module must look like it was written as a native part of this Bazar-e-Pak backend rather than an unrelated example project.

Return the complete code for every required Review file and the exact changes required in existing files.