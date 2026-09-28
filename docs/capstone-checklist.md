# Capstone Requirements Checklist

This checklist maps the PDF capstone instructions to the current Cake Delight project.

## 1. Core Project Scope

- [x] Cloud-native cake ordering / e-commerce application
- [x] Users can register, log in, browse cakes, add items to cart, place orders, and leave ratings
- [x] Backend-first implementation with working APIs
- [x] Basic frontend for the main user flow

## 2. Microservices

- [x] User / Account service
- [x] Cake / Catalog service
- [x] Shopping Cart service
- [x] Order service
- [x] Rating / Feedback service
- [x] Notification service

## 3. Architecture

- [x] Microservices are split into separate services
- [x] REST APIs are used for service endpoints
- [x] Service-to-service communication is implemented
- [x] RabbitMQ-based async event flow exists for order notifications
- [x] Each service has a `/health` endpoint
- [x] Docker support exists through `docker-compose.yml`
- [x] Kubernetes manifests exist in `k8s/`

## 4. Database Requirements

- [x] Service ownership is separated by database in the compose setup
- [x] Catalog service uses its own database
- [x] Order service uses its own database
- [x] Rating service uses its own database
- [x] Notification service uses its own database
- [x] User service uses its own database
- [x] Cart service uses its own database

## 5. API Coverage

- [x] Catalog APIs are documented
- [x] Order and basket APIs are documented
- [x] Rating APIs are documented
- [x] Notification APIs are documented
- [x] User / auth APIs are documented in `docs/api-docs.md`

## 6. Frontend Flow

- [x] Register page exists
- [x] Login page exists
- [x] Catalog page exists
- [x] Cake detail page exists
- [x] Basket page exists
- [x] Checkout confirmation page exists
- [x] Order history page exists
- [x] Notifications page exists
- [x] Admin page exists

## 7. Roles and Access Control

- [x] User role support exists
- [x] Admin role support exists
- [x] Super admin role support exists
- [x] Product management is restricted to super admin where required
- [x] Admin access is broader than standard user access

## 8. Documentation

- [x] Main README exists
- [x] Architecture documentation exists
- [x] API documentation exists
- [x] Setup instructions exist
- [x] Kubernetes guide exists
- [x] Main README matches the current service count
- [x] Setup and K8s docs cover the user-service and cart-service

## 9. Docker and Kubernetes

- [x] Dockerfiles exist for the services
- [x] Docker Compose includes the local runtime stack
- [x] Kubernetes manifests exist for the main services
- [x] Kubernetes manifests cover the newer user-service and cart-service
- [x] Full K8s documentation includes user-service and cart-service

## 10. Testing

- [x] Frontend test coverage exists
- [x] Catalog service tests exist
- [x] Rating service tests exist
- [x] Notification service tests exist
- [x] Order service tests exist
- [ ] Run the full test suite again before submission and record the results

## 11. Submission Readiness

- [x] Source structure is organized as a workspace-style repository
- [x] README includes a quick start path
- [x] The project can be run locally with Docker Compose
- [x] The project has a deployed server endpoint
- [ ] Verify the final submission ZIP contents against the official portal requirements
- [x] Confirm the final README and docs are consistent with the current implementation

## 12. Notes

- The PDF emphasizes backend, APIs, containerization, deployment, and documentation more than frontend styling.
- The official problem statement should still be treated as the final authority if it differs from the PDF summary.
