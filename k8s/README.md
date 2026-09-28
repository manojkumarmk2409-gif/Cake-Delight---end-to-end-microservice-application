# Kubernetes Deployment Guide - Cake Delight

## Prerequisites

- kubectl installed and configured
- A running cluster such as Minikube, Kind, or a cloud cluster
- Docker images built and loaded or pushed to a registry

## Apply Order

```bash
kubectl create namespace cake-delight

kubectl apply -f k8s/mysql/configmap.yaml
kubectl apply -f k8s/mysql/statefulset.yaml
kubectl apply -f k8s/mysql/service.yaml
kubectl apply -f k8s/rabbitmq/deployment.yaml

kubectl wait --for=condition=ready pod -l app=mysql -n cake-delight --timeout=120s
kubectl wait --for=condition=ready pod -l app=rabbitmq -n cake-delight --timeout=120s

kubectl apply -f k8s/catalog-service/configmap.yaml
kubectl apply -f k8s/order-service/configmap.yaml
kubectl apply -f k8s/rating-service/configmap.yaml
kubectl apply -f k8s/notification-service/configmap.yaml
kubectl apply -f k8s/user-service/configmap.yaml
kubectl apply -f k8s/cart-service/configmap.yaml
kubectl apply -f k8s/api-gateway/configmap.yaml

kubectl apply -f k8s/catalog-service/seed-job.yaml
kubectl wait --for=condition=complete job/catalog-service-seed -n cake-delight --timeout=120s

kubectl apply -f k8s/catalog-service/deployment.yaml
kubectl apply -f k8s/catalog-service/service.yaml
kubectl apply -f k8s/order-service/deployment.yaml
kubectl apply -f k8s/order-service/service.yaml
kubectl apply -f k8s/rating-service/deployment.yaml
kubectl apply -f k8s/rating-service/service.yaml
kubectl apply -f k8s/notification-service/deployment.yaml
kubectl apply -f k8s/notification-service/service.yaml
kubectl apply -f k8s/user-service/deployment.yaml
kubectl apply -f k8s/cart-service/deployment.yaml
kubectl apply -f k8s/api-gateway/deployment.yaml
kubectl apply -f k8s/api-gateway/service.yaml
kubectl apply -f k8s/frontend/deployment.yaml

kubectl apply -f k8s/api-gateway/ingress.yaml
```

## Port Forwarding for Local Testing

```bash
kubectl port-forward svc/api-gateway 3000:3000 -n cake-delight
kubectl port-forward svc/frontend 5173:80 -n cake-delight
kubectl port-forward svc/rabbitmq 15672:15672 -n cake-delight
```

## Docker Images

```bash
docker build -t cake-delight/user-service:latest ./services/user-service
docker build -t cake-delight/cart-service:latest ./services/cart-service
docker build -t cake-delight/catalog-service:latest ./services/catalog-service
docker build -t cake-delight/order-service:latest ./services/order-service
docker build -t cake-delight/rating-service:latest ./services/rating-service
docker build -t cake-delight/notification-service:latest ./services/notification-service
docker build -t cake-delight/api-gateway:latest ./api-gateway
docker build -t cake-delight/frontend:latest ./frontend
```

## Notes

- Use a MySQL instance with separate schemas for each service.
- For production, keep the database credentials in Kubernetes Secrets.
- The user service depends on SMTP settings for the registration OTP flow.
