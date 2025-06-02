# Todo App - Google Cloud Infrastructure

Bu Terraform konfigürasyonu, Google Cloud Platform üzerinde cloud-native bir Todo uygulaması için gerekli altyapıyı oluşturur.

## Mimari

### Hybrid Cloud Architecture

- **Frontend**: React uygulaması (Kubernetes/GKE)
- **API Gateway**: Nginx reverse proxy (Kubernetes/GKE)
- **Auth Service**: Node.js kimlik doğrulama servisi (Kubernetes + Cloud Run)
- **Todo Service**: Node.js todo yönetim servisi (Kubernetes + Cloud Run) 
- **Database**: PostgreSQL (Compute Engine VM)
- **Functions**: Cloud Functions (Health Monitor, Todo Insights)
- **CI/CD**: Cloud Build + Docker Registry
- **Network**: VPC, Subnet, Load Balancers

### Kubernetes Components (GKE Autopilot)

- **Frontend Deployment**: React app with LoadBalancer servicea
- **API Gateway Deployment**: Nginx with LoadBalancer service
- **Auth Service Deployment**: Node.js microservice with ClusterIP
- **Todo Service Deployment**: Node.js microservice with ClusterIP
- **Horizontal Pod Autoscalers**: Auto-scaling based on CPU utilization
- **ConfigMaps & Secrets**: Environment variables and sensitive data

## Özellikler

- ✅ **GKE Autopilot**: Serverless Kubernetes with automatic scaling
- ✅ **Hybrid Architecture**: Kubernetes + Cloud Run + Cloud Functions
- ✅ **Auto-scaling**: CPU-based HPA with min/max replicas
- ✅ **Load Balancing**: External LoadBalancer for frontend & API gateway
- ✅ **Service Mesh**: Internal service communication
- ✅ **Health Monitoring**: Liveness & readiness probes
- ✅ **AI-Powered**: Natural Language API for todo insights
- ✅ **Security**: VPC network, service accounts, secrets management

## Gereksinimler

1. Google Cloud Platform hesabı (Billing enabled)
2. Terraform >= 1.0
3. Google Cloud SDK (gcloud CLI)
4. Docker (local build için)
5. kubectl (Kubernetes CLI)

## Kurulum

### 1. Google Cloud Kurulumu

```bash
# Google Cloud SDK kurulumu (macOS)
brew install google-cloud-sdk

# Giriş yapın
gcloud auth login
gcloud auth application-default login

# Proje oluşturun veya seçin
gcloud projects create your-project-id
gcloud config set project your-project-id

# Billing hesabını etkinleştirin
gcloud billing accounts list
gcloud billing projects link your-project-id --billing-account=BILLING_ACCOUNT_ID

# Gerekli API'leri etkinleştirin
gcloud services enable container.googleapis.com
gcloud services enable compute.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable language.googleapis.com
```

### 2. Terraform Konfigürasyonu

```bash
# Terraform dizinine gidin
cd terraform

# Variables dosyasını kopyalayın ve düzenleyin
cp terraform.tfvars.example terraform.tfvars

# terraform.tfvars dosyasını proje bilgilerinizle güncelleyin
nano terraform.tfvars
```

### 3. Infrastructure Deployment

```bash
# Terraform'u başlatın
terraform init

# Planı kontrol edin
terraform plan

# Altyapıyı oluşturun (GKE cluster 5-10 dakika sürebilir)
terraform apply
```

### 4. Application Deployment

```bash
# Ana dizine dönün ve deployment script'ini çalıştırın
cd ..
chmod +x scripts/build-and-deploy.sh
./scripts/build-and-deploy.sh
```

## Konfigürasyon

### terraform.tfvars Dosyası

```hcl
# Google Cloud Project Configuration
project_id = "your-gcp-project-id"
region     = "europe-west1"
zone       = "europe-west1-b"

# Application Configuration
environment = "dev"
app_name    = "todo-app"

# Database Configuration
db_name     = "todoapp"
db_user     = "postgres"
db_password = "SecurePassword123!"

# Network Configuration
network_cidr = "10.0.0.0/16"
subnet_cidr  = "10.0.1.0/24"

# Scaling Configuration
max_instances    = 2
cpu_utilization  = 50

# VM Configuration
postgres_machine_type = "e2-micro"
```

## Deployment Sonrası

### 1. Cluster Credentials

```bash
# GKE cluster credentials'ını alın
gcloud container clusters get-credentials todo-app-gke-dev --region europe-west1

# Kubernetes context'ini kontrol edin
kubectl config current-context
```

### 2. Service URL'lerini Alın

```bash
# Terraform outputs
terraform output

# Kubernetes services
kubectl get services -n todo-app

# External IP addresses
kubectl get services -n todo-app -o wide
```

### 3. Application Status

```bash
# Pod status
kubectl get pods -n todo-app

# Deployment status
kubectl get deployments -n todo-app

# HPA status
kubectl get hpa -n todo-app

# Service endpoints
kubectl describe service todo-app-frontend-service -n todo-app
kubectl describe service todo-app-api-gateway-service -n todo-app
```

## Monitoring ve Logs

### Kubernetes Logs

```bash
# Pod logs
kubectl logs -f deployment/todo-app-auth -n todo-app
kubectl logs -f deployment/todo-app-todo -n todo-app
kubectl logs -f deployment/todo-app-frontend -n todo-app
kubectl logs -f deployment/todo-app-api-gateway -n todo-app

# Events
kubectl get events -n todo-app --sort-by='.firstTimestamp'
```

### Cloud Run Service Logs

```bash
# Auth service logları
gcloud logging read 'resource.type=cloud_run_revision resource.labels.service_name=todo-app-auth-dev' --limit=50

# Todo service logları  
gcloud logging read 'resource.type=cloud_run_revision resource.labels.service_name=todo-app-todo-dev' --limit=50
```

### Health Checks

```bash
# API Gateway health
curl http://$(kubectl get service todo-app-api-gateway-service -n todo-app -o jsonpath='{.status.loadBalancer.ingress[0].ip}')/health

# Cloud Functions health
curl "$(terraform output -raw health_monitor_function_url)"

# Todo insights test
curl -X POST "$(terraform output -raw todo_insights_function_url)" \
  -H "Content-Type: application/json" \
  -d '{"title": "Buy groceries", "description": "Get milk and bread", "userId": "test"}'
```

## Scaling ve Performance

### Auto-scaling Konfigürasyonu

```bash
# HPA durumunu izleyin
kubectl get hpa -n todo-app -w

# Resource kullanımını kontrol edin
kubectl top pods -n todo-app
kubectl top nodes
```

### Scaling Testleri

```bash
# Load test için script çalıştırın
./scripts/run-scaling-test.sh

# Manuel scaling
kubectl scale deployment todo-app-frontend --replicas=3 -n todo-app
kubectl scale deployment todo-app-auth --replicas=3 -n todo-app
```

## Güvenlik

### Network Security
- **VPC**: Isolated network environment
- **Private cluster**: Internal node communication
- **LoadBalancer**: External access only through LB
- **Service accounts**: Minimal required permissions

### Application Security
- **JWT Authentication**: Token-based auth
- **Secrets Management**: Kubernetes secrets
- **TLS/HTTPS**: Encrypted communication
- **Health Checks**: Liveness & readiness probes

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     Internet                            │
└─────────────────┬───────────────┬───────────────────────┘
                  │               │
                  ▼               ▼
         ┌─────────────────┐ ┌─────────────────┐
         │   Frontend LB   │ │  API Gateway LB │
         │  (External IP)  │ │  (External IP)  │
         └─────────┬───────┘ └─────────┬───────┘
                   │                   │
    ┌──────────────┼───────────────────┼──────────────────┐
    │              ▼     GKE Cluster   ▼                  │
    │    ┌─────────────────┐  ┌─────────────────┐         │
    │    │    Frontend     │  │   API Gateway   │         │
    │    │   (React App)   │  │     (Nginx)     │         │
    │    └─────────────────┘  └─────┬───────────┘         │
    │                               │                     │
    │              ┌────────────────┼────────────────┐    │
    │              ▼                ▼                ▼    │
    │    ┌─────────────────┐ ┌─────────────────┐         │
    │    │  Auth Service   │ │  Todo Service   │         │
    │    │   (Node.js)     │ │   (Node.js)     │         │
    │    └─────────┬───────┘ └─────────┬───────┘         │
    └──────────────┼───────────────────┼─────────────────┘
                   │                   │
                   └─────────┬─────────┘
                             ▼
                   ┌─────────────────┐
                   │   PostgreSQL    │
                   │ (Compute Engine)│
                   └─────────────────┘
```

## Troubleshooting

### Common Issues

1. **Cluster oluşturma hatası**
   ```bash
   # Autopilot cluster status kontrol
   gcloud container clusters describe todo-app-gke-dev --region europe-west1
   ```

2. **Pod başlamıyor**
   ```bash
   kubectl describe pod POD_NAME -n todo-app
   kubectl logs POD_NAME -n todo-app
   ```

3. **LoadBalancer IP alamıyor**
   ```bash
   kubectl describe service todo-app-frontend-service -n todo-app
   kubectl get events -n todo-app
   ```

4. **Image pull hatası**
   ```bash
   # Docker registry auth
   gcloud auth configure-docker
   
   # Image'ları manuel push
   docker push gcr.io/PROJECT_ID/todo-app-auth:latest
   docker push gcr.io/PROJECT_ID/todo-app-todo:latest
   docker push gcr.io/PROJECT_ID/todo-app-frontend:latest
   ```

### Debug Commands

```bash
# Cluster info
kubectl cluster-info
kubectl get nodes -o wide

# Service mesh connectivity
kubectl exec -it FRONTEND_POD -n todo-app -- curl http://todo-app-api-gateway-service

# Resource limits
kubectl describe hpa -n todo-app
kubectl top pods -n todo-app
```

## Cleanup

```bash
# Terraform ile altyapıyı silin
terraform destroy

# Manuel cleanup (gerekirse)
gcloud container clusters delete todo-app-gke-dev --region europe-west1
gcloud compute instances delete todo-app-postgres-dev --zone europe-west1-b
```

## Cost Optimization

- **GKE Autopilot**: Sadece kullanılan kaynak için ödeme
- **Preemptible VMs**: %80 daha ucuz compute
- **Auto-scaling**: 0 replica'ya kadar scale down
- **Regional persistent disks**: Daha ucuz storage
- **Cloud Functions**: Serverless, pay-per-use model

## Useful Commands

```bash
# Port forwarding (local testing)
kubectl port-forward service/todo-app-frontend-service 8080:80 -n todo-app
kubectl port-forward service/todo-app-api-gateway-service 8081:80 -n todo-app

# Config backup
kubectl get all -n todo-app -o yaml > backup.yaml

# Resource monitoring
watch kubectl get pods -n todo-app
watch kubectl get hpa -n todo-app
``` 