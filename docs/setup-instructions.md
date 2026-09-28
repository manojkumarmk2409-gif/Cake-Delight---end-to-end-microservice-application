# Setup Instructions - Cake Delight

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- Docker 24 or newer
- Docker Compose 2 or newer
- kubectl 1.28 or newer, if you plan to use Kubernetes

## Quick Start with Docker Compose

```bash
docker compose up --build
```

Then open:

- Frontend: `http://localhost:5173`
- API Gateway: `http://localhost:3000`
- RabbitMQ Management UI: `http://localhost:15672`

Seed cakes:

```bash
docker exec cake-catalog node src/seed.js
```

## Local Development without Docker

Install workspace dependencies from the repo root:

```bash
npm install
```

Start MySQL and RabbitMQ:

```bash
docker run -d -p 3307:3306 --name mysql -e MYSQL_ROOT_PASSWORD=rootpass mysql:8.4
docker run -d -p 5672:5672 -p 15672:15672 --name rabbitmq rabbitmq:3.13-management-alpine
```

Copy the environment templates:

```bash
cp services/catalog-service/.env.example services/catalog-service/.env
cp services/order-service/.env.example services/order-service/.env
cp services/rating-service/.env.example services/rating-service/.env
cp services/notification-service/.env.example services/notification-service/.env
cp services/user-service/.env.example services/user-service/.env
cp services/cart-service/.env.example services/cart-service/.env
cp frontend/.env.example frontend/.env
```

Start the services in separate terminals:

```bash
npm run dev --workspace=services/user-service
npm run dev --workspace=services/cart-service
npm run dev --workspace=services/catalog-service
npm run dev --workspace=services/order-service
npm run dev --workspace=services/rating-service
npm run dev --workspace=services/notification-service
npm run dev --workspace=api-gateway
npm run dev --workspace=frontend
```

Seed the catalog:

```bash
node services/catalog-service/src/seed.js
```

## Running Tests

```bash
npm test --workspace=services/user-service
npm test --workspace=services/cart-service
npm test --workspace=services/catalog-service
npm test --workspace=services/order-service
npm test --workspace=services/rating-service
npm test --workspace=services/notification-service
npm test --workspace=frontend
```

Run all tests:

```bash
npm run test:all
```

## Kubernetes

See `k8s/README.md` for cluster deployment instructions.

## Environment Variables

| Variable | Service | Purpose |
| --- | --- | --- |
| `PORT` | All | Service port |
| `MYSQL_HOST` | All backend services | MySQL host name |
| `MYSQL_PORT` | All backend services | MySQL port |
| `MYSQL_USER` | All backend services | MySQL user |
| `MYSQL_PASSWORD` | All backend services | MySQL password |
| `MYSQL_DATABASE` | All backend services | MySQL schema name |
| `JWT_SECRET` | User service, API gateway | JWT signing secret |
| `OTP_TTL_MINUTES` | User service | OTP expiration window |
| `SMTP_HOST` | User service | Outbound email host |
| `SMTP_PORT` | User service | Outbound email port |
| `SMTP_SECURE` | User service | SMTP TLS flag |
| `SMTP_USER` | User service | SMTP username |
| `SMTP_PASS` | User service | SMTP password |
| `SMTP_FROM` | User service | From address for OTP emails |
| `CATALOG_SERVICE_URL` | Cart service, order service, API gateway | Catalog base URL |
| `CART_SERVICE_URL` | API gateway, order service | Cart base URL |
| `ORDER_SERVICE_URL` | API gateway | Order base URL |
| `RATING_SERVICE_URL` | API gateway | Rating base URL |
| `NOTIFICATION_SERVICE_URL` | API gateway | Notification base URL |
| `VITE_API_BASE_URL` | Frontend | Gateway base URL |
