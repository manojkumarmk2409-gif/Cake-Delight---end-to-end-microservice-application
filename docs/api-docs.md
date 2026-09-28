# API Documentation - Cake Delight

All requests go through the API Gateway at `http://localhost:3000`.

Gateway paths:

- `GET /health`
- `POST /api/auth/register`
- `POST /api/auth/register/verify`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/users/me`
- `PUT /api/users/me`
- `GET /api/catalog/...`
- `GET /api/cart/...`
- `GET /api/orders/...`
- `GET /api/ratings/...`
- `GET /api/notifications/...`

Authentication:

- Public: `POST /api/auth/register`, `POST /api/auth/login`, catalog `GET` endpoints, ratings `GET` endpoints
- Protected routes require `Authorization: Bearer <token>`
- The gateway injects `x-user-id` and `x-user-role` after token verification

## Auth Service (`/api/auth`)

### POST /api/auth/register
Create a new pending registration and send an OTP email.

Body:

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "Secret123!",
  "phone": "9876543210",
  "address": "Chennai"
}
```

Response `202`:

```json
{
  "message": "OTP sent to your email address. Please verify it to complete registration.",
  "email": "jane@example.com",
  "otpSent": true,
  "otpRequired": true,
  "emailVerificationAvailable": true
}
```

### POST /api/auth/register/verify
Verify the OTP and create the user account.

Body:

```json
{
  "email": "jane@example.com",
  "otp": "123456"
}
```

Response `201`:

```json
{
  "token": "...",
  "user": {
    "id": "...",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "user"
  }
}
```

### POST /api/auth/login
Authenticate a user.

Body:

```json
{
  "email": "jane@example.com",
  "password": "Secret123!"
}
```

Response `200`:

```json
{
  "token": "...",
  "user": {
    "id": "...",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "user"
  }
}
```

### POST /api/auth/logout
Return a logout confirmation message.

Response `200`:

```json
{
  "message": "Logged out successfully"
}
```

## User Service (`/api/users`)

### GET /api/users/me
Return the current user profile.

Headers:

- `Authorization: Bearer <token>`

Response `200`:

```json
{
  "_id": "...",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "9876543210",
  "address": "Chennai",
  "role": "user",
  "createdAt": "...",
  "updatedAt": "..."
}
```

### PUT /api/users/me
Update the current user profile.

Headers:

- `Authorization: Bearer <token>`

Body:

```json
{
  "name": "Jane Doe",
  "phone": "9876543210",
  "address": "Chennai"
}
```

Response `200` returns the updated user object.

## Catalog Service (`/api/catalog`)

### GET /api/catalog/cakes
List cakes with optional filters.

Query params:

- `name`
- `category`
- `minPrice`
- `maxPrice`

### GET /api/catalog/cakes/:id
Get a single cake by id.

### POST /api/catalog/cakes
Create a cake.

### PUT /api/catalog/cakes/:id
Update a cake.

### DELETE /api/catalog/cakes/:id
Delete a cake.

## Cart Service (`/api/cart`)

All cart routes require `Authorization: Bearer <token>` so the gateway can inject `x-user-id`.

### GET /api/cart
Return the current user's cart.

### GET /api/cart/test
Health-style test endpoint used by the service.

### POST /api/cart/items
Add an item to the cart.

Body:

```json
{
  "cakeId": "abc123",
  "quantity": 2
}
```

### PUT /api/cart/items/:cakeId
Update the quantity of a cart item.

Body:

```json
{
  "quantity": 3
}
```

### DELETE /api/cart/items/:cakeId
Remove one item from the cart.

### DELETE /api/cart
Clear the cart.

## Order Service (`/api/orders`)

All order routes require `Authorization: Bearer <token>`.

### POST /api/orders/checkout
Create an order from the current cart.

Body:

```json
{
  "address": "Chennai",
  "discountCode": "CAKE10"
}
```

### GET /api/orders
List the current user's orders.

Admins and super admins can see all orders.

### GET /api/orders/:id
Get a single order belonging to the current user.

### PUT /api/orders/:id/status
Update order status.

Admins and super admins only.

## Rating Service (`/api/ratings`)

### POST /api/ratings/ratings
Submit a rating.

Body:

```json
{
  "cakeId": "abc123",
  "userId": "user-1",
  "score": 5,
  "comment": "Amazing!"
}
```

### GET /api/ratings/ratings/:cakeId
List ratings for a cake.

### GET /api/ratings/ratings/:cakeId/average
Return the average score and count.

## Notification Service (`/api/notifications`)

### GET /api/notifications/notifications/:userId
List notifications for a user.

## Health Endpoints

Every service exposes `GET /health`.
