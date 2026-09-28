# Cake Delight Traceability Matrix

This matrix maps the capstone evaluation requirements in [evaluation.md](./evaluation.md) to the current implementation in the Cake Delight repository.

## Legend

- `Covered` means the requirement is implemented and traceable in code or docs.
- `Mostly covered` means the feature is implemented, but there is a small verification or documentation gap.
- `Partial` means the requirement is present, but the project still needs a final check or cleanup.

| Requirement | Status | Implementation evidence | Notes |
| --- | --- | --- | --- |
| End-to-end customer flow | Covered | [README.md](../README.md), [frontend/src/pages/CatalogPage.jsx](../frontend/src/pages/CatalogPage.jsx), [frontend/src/pages/BasketPage.jsx](../frontend/src/pages/BasketPage.jsx), [frontend/src/pages/CakeDetailPage.jsx](../frontend/src/pages/CakeDetailPage.jsx) | Browse, filter, basket, checkout, rating, and notifications are all present. |
| Microservices architecture | Covered | [README.md](../README.md), `services/` | Separate user, cart, catalog, order, rating, and notification services exist. |
| API implementation | Covered | [docs/api-docs.md](./api-docs.md), [api-gateway/server.js](../api-gateway/server.js) | Gateway routes and service endpoints are documented and wired. |
| Request and input validation | Covered | [frontend/src/utils/validation.js](../frontend/src/utils/validation.js), [services/user-service/src/controllers/authController.js](../services/user-service/src/controllers/authController.js), [services/user-service/src/controllers/userController.js](../services/user-service/src/controllers/userController.js), [services/catalog-service/src/controllers/cakeController.js](../services/catalog-service/src/controllers/cakeController.js), [services/cart-service/src/controllers/cartController.js](../services/cart-service/src/controllers/cartController.js), [services/order-service/src/controllers/orderController.js](../services/order-service/src/controllers/orderController.js), [services/rating-service/src/controllers/ratingController.js](../services/rating-service/src/controllers/ratingController.js) | Client-side and server-side checks are in place for the main forms and APIs. |
| Event-driven notifications | Covered | [README.md](../README.md), [services/notification-service](../services/notification-service), [services/order-service/src/controllers/orderController.js](../services/order-service/src/controllers/orderController.js) | Order completion publishes an event that notification service consumes. |
| Containerization | Covered | [README.md](../README.md), `services/*/Dockerfile`, [docker-compose.yml](../docker-compose.yml) | Dockerfiles and local compose runtime are present. |
| Kubernetes deployment | Covered | [k8s/README.md](../k8s/README.md), `k8s/*` | Service manifests, gateway, MySQL, RabbitMQ, and ingress are documented. |
| Database-backed persistence | Covered | [README.md](../README.md), `services/*/src/db.js`, `k8s/mysql/*` | MySQL is used with service-owned schemas/databases. |
| Reliability and maintainability | Mostly covered | [api-gateway/server.js](../api-gateway/server.js), [services/*/src/server.js](../services) | Health endpoints, logging, auth gateway, caching controls, and rate limiting exist. |
| Documentation | Covered | [README.md](../README.md), [docs/api-docs.md](./api-docs.md), [docs/capstone-checklist.md](./capstone-checklist.md), [k8s/README.md](../k8s/README.md) | Architecture, API, setup, and deployment docs are present. |
| Roles and access control | Covered | [frontend/src/utils/roles.js](../frontend/src/utils/roles.js), [services/catalog-service/src/routes/cakes.js](../services/catalog-service/src/routes/cakes.js) | User, admin, and super admin separation is implemented. |
| Product create/edit with variants | Covered | [frontend/src/pages/AdminPage.jsx](../frontend/src/pages/AdminPage.jsx), [services/catalog-service/src/controllers/cakeController.js](../services/catalog-service/src/controllers/cakeController.js), [services/cart-service/src/controllers/cartController.js](../services/cart-service/src/controllers/cartController.js) | Product editing and variant support are implemented. |
| Mobile responsiveness | Covered | [frontend/src/index.css](../frontend/src/index.css) | Layout and form styles support smaller screens. |
| Testing | Partial | `frontend` build verified; backend legacy tests in some services still reference missing `mongoose` dependencies | This is a verification gap, not a product feature gap. |
| Final submission readiness | Partial | [README.md](../README.md), [docs/capstone-checklist.md](./capstone-checklist.md) | Final ZIP/package and submission portal checks still need a last review. |

## Summary

The project satisfies the core capstone requirements and most evaluation criteria. The main remaining items are verification-oriented:

- Re-run the full backend test suites after fixing the legacy test dependency mismatch.
- Do a final submission packaging check before upload.

If you want the matrix expanded with page-by-page requirement IDs from the evaluation PDF, that can be added next.
