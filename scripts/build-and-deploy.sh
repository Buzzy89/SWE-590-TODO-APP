#!/bin/bash

set -e

# Configuration - Updated for minimal setup
PROJECT_ID="yusuf-swe590"
REGION="europe-west1"
ZONE="europe-west1-b"
CLUSTER_NAME="todo-app-gke-dev"

echo "🚀 Starting minimal build and deployment process..."

# Step 1: Authenticate and configure
echo "📋 Configuring Google Cloud..."
gcloud config set project $PROJECT_ID
gcloud auth configure-docker

# Step 2: Wait for cluster to be ready
echo "⏳ Waiting for cluster to be ready..."
while [[ $(gcloud container clusters describe $CLUSTER_NAME --zone $ZONE --format="value(status)") != "RUNNING" ]]; do
  echo "Cluster is still provisioning... waiting 30 seconds"
  sleep 30
done
echo "✅ Cluster is ready!"

# Step 3: Get cluster credentials
echo "🔑 Getting cluster credentials..."
gcloud container clusters get-credentials $CLUSTER_NAME --zone $ZONE

# Step 4: Build and push Docker images
echo "🏗️ Building Docker images..."

# Build Auth Service
echo "Building auth-service..."
cd ../auth-service
docker build -t gcr.io/$PROJECT_ID/todo-app-auth:latest .
docker push gcr.io/$PROJECT_ID/todo-app-auth:latest
cd ../terraform

# Build Todo Service
echo "Building todo-service..."
cd ../todo-service
docker build -t gcr.io/$PROJECT_ID/todo-app-todo:latest .
docker push gcr.io/$PROJECT_ID/todo-app-todo:latest
cd ../terraform

# Build Frontend with direct service URLs (no API Gateway in minimal setup)
echo "Building frontend..."
cd ../frontend

# Get node external IP
NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="ExternalIP")].address}')
if [ -z "$NODE_IP" ]; then
  NODE_IP="34.22.249.41"  # Fallback to known IP
fi

# Get Cloud Function URL dynamically
INSIGHTS_URL=$(gcloud functions describe todo-app-insights-dev --region=europe-west1 --format="value(httpsTrigger.url)" 2>/dev/null || echo "https://todo-app-insights-dev-hkyc653hka-ew.a.run.app")

docker build \
  --build-arg REACT_APP_API_URL=http://${NODE_IP}:30081 \
  --build-arg REACT_APP_AUTH_URL=http://${NODE_IP}:30081 \
  --build-arg REACT_APP_TODO_URL=http://${NODE_IP}:30082 \
  --build-arg REACT_APP_TODO_INSIGHTS_URL=${INSIGHTS_URL} \
  -t gcr.io/$PROJECT_ID/todo-app-frontend:latest .
docker push gcr.io/$PROJECT_ID/todo-app-frontend:latest
cd ../terraform

echo "✅ All Docker images built and pushed successfully!"

# Step 5: Update Kubernetes deployments with new images
echo "🔄 Updating Kubernetes deployments..."
kubectl rollout restart deployment/todo-app-auth -n todo-app
kubectl rollout restart deployment/todo-app-todo -n todo-app
kubectl rollout restart deployment/todo-app-frontend -n todo-app

echo "🎉 Minimal deployment completed successfully!"
echo "📝 Getting service information..."

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
kubectl wait --for=condition=ready pod -l app=todo-app-auth -n todo-app --timeout=300s || true
kubectl wait --for=condition=ready pod -l app=todo-app-todo -n todo-app --timeout=300s || true
kubectl wait --for=condition=ready pod -l app=todo-app-frontend -n todo-app --timeout=300s || true

# Get service URLs
kubectl get services -n todo-app

echo "🌐 Service Access:"
echo "Frontend NodePort: http://NODE_IP:30080"
echo "Get Node IP with: kubectl get nodes -o wide"
echo ""
echo "📊 Pod status:"
kubectl get pods -n todo-app
echo ""
echo "🔧 To access from local:"
echo "kubectl port-forward service/todo-app-frontend-service 8080:80 -n todo-app" 