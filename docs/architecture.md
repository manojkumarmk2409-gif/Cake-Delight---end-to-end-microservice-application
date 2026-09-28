# Architecture - Cake Delight

## System Overview

```text
Browser (React/Vite)
        |
        v  HTTP REST
  +-------------------+
  | API Gateway       |  Port 3000 - single entry point, CORS, rate-limit, logging
  +-------------------+
         |  HTTP proxy
    +----+----------+-----------+----------------+
    v               v           v                v
Catalog Service   Order      Rating Service   Notification
(3001)            (3002)     (3003)           Service (3004)
    |               |                            ^
    |               | AMQP publish               | AMQP consume
    |               +------ order.completed ------+
    v               v
MySQL           MySQL        MySQL            MySQL
catalog_db      order_db     rating_db        notification_db
```

## Design Rationale

### Service Boundaries

| Service | Responsibility | Own DB |
| --- | --- | --- |
| Catalog Service | Cake inventory, CRUD, filtering | `catalog_db` |
| Order Service | Basket management, checkout, order history | `order_db` |
| Rating Service | Ratings submission and aggregation | `rating_db` |
| Notification Service | Order event consumption and notification delivery | `notification_db` |
| API Gateway | Request routing, CORS, rate limiting | - |
| Frontend | React SPA consuming the gateway | - |
| User Service | Registration, login, profile, admin bootstrap | `user_db` |
| Cart Service | Cart management | `cart_db` |

### Database-Per-Service

Each service owns its MySQL schema exclusively. No direct cross-schema queries are used.
Inter-service data needs are handled through HTTP calls between services.

### Synchronous vs Asynchronous Communication

- Synchronous REST: client -> gateway -> services
- Asynchronous RabbitMQ: Order Service -> `order.completed` -> Notification Service

### Resilience Patterns

- `/health` endpoints on every service
- Centralized error handling middleware
- Structured JSON logging via Winston
- RabbitMQ auto-reconnect
- Rate limiting at the gateway

### Scalability

- Stateless services for horizontal scaling
- Basket and order state persisted in MySQL
