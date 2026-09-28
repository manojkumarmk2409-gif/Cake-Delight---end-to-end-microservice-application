# Cake Delight - Cloud-Native Microservices Application

Cake Delight is a cloud-native cake ordering platform built as a microservices capstone project.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite, React Router, Axios |
| API Gateway | Express.js, http-proxy-middleware, express-rate-limit |
| Microservices | Node.js 20 + Express.js (6 backend services) |
| Database | MySQL (database-per-service pattern) |
| Messaging | RabbitMQ (order.completed event flow) |
| Logging | Winston |
| Testing | Jest, Supertest, React Testing Library |
| Containers | Docker, Docker Compose |
| Orchestration | Kubernetes |

## Project Structure

```text
cake-delight/
  api-gateway/
  services/
    user-service/
    cart-service/
    catalog-service/
    order-service/
    rating-service/
    notification-service/
  frontend/
  k8s/
  docs/
  docker-compose.yml
  README.md
```

## Main Flow

1. Register or log in
2. Browse cakes
3. Add cakes to cart
4. Checkout and create an order
5. Receive notifications from the order event
6. Rate purchased cakes
7. View order history and notifications

## Documentation

- [Architecture](docs/architecture.md)
- [API Docs](docs/api-docs.md)
- [Setup Instructions](docs/setup-instructions.md)
- [Kubernetes Guide](k8s/README.md)
- [Capstone Checklist](docs/capstone-checklist.md)

## Quick Start

```bash
docker compose up --build
```

Then open:

- Frontend: `http://localhost:5173`
- API Gateway: `http://localhost:3000`
- RabbitMQ Management: `http://localhost:15672`

## Seed Data

```bash
docker exec cake-catalog node src/seed.js
```

## Testing

```bash
npm run test:all
```

## Notes

- The app uses a gateway at `http://localhost:3000`.
- Backend services are split by responsibility and database ownership.
- The current implementation uses MySQL with separate schemas per service.
- The current implementation includes user, cart, catalog, order, rating, and notification services.
