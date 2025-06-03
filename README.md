# 🚀 Cloud-Native Todo Application

[![GCP](https://img.shields.io/badge/Google_Cloud-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)](https://cloud.google.com/)
[![Kubernetes](https://img.shields.io/badge/kubernetes-%23326ce5.svg?style=for-the-badge&logo=kubernetes&logoColor=white)](https://kubernetes.io/)
[![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/postgresql-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org/)
[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com/)
[![Terraform](https://img.shields.io/badge/terraform-%235835CC.svg?style=for-the-badge&logo=terraform&logoColor=white)](https://terraform.io/)

A modern, scalable, and AI-powered Todo application built with microservices architecture on Google Cloud Platform, deployed using Kubernetes and serverless technologies.

## 📋 Table of Contents

- [✨ Features](#-features)
- [🏗️ Architecture](#️-architecture)
- [🔧 Technologies](#-technologies)
- [🚀 Quick Start](#-quick-start)
- [⚙️ Installation](#️-installation)
- [🔐 Configuration](#-configuration)
- [📊 Monitoring & Analytics](#-monitoring--analytics)
- [🧪 Testing](#-testing)
- [📝 API Documentation](#-api-documentation)
- [🚀 Deployment](#-deployment)
- [💰 Cost Analysis](#-cost-analysis)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

## ✨ Features

### 🎯 Core Features
- **User Management**: Secure registration and authentication
- **Todo Management**: CRUD operations for task management
- **Categorization**: Organize tasks into categories (Work, Personal, Health, etc.)
- **Priority Setting**: High, medium, and low priority levels
- **Date Tracking**: Set due dates for tasks
- **Statistics**: Completion rates and task analytics

### 🤖 AI-Powered Features
- **Smart Categorization**: Automatic category suggestions using Google Natural Language API
- **Priority Prediction**: Intelligent priority assignment based on task content
- **Keyword Analysis**: Extract important keywords from task descriptions
- **Confidence Score**: Reliability level of AI recommendations

### ☁️ Cloud-Native Features
- **Microservices Architecture**: Independent and scalable services
- **Auto-scaling**: Dynamic scaling with Kubernetes HPA
- **Serverless Integration**: Extended functionality with Cloud Functions
- **CI/CD Pipeline**: Automated deployment with Google Cloud Build
- **Monitoring**: System health and performance tracking

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          Google Cloud Platform                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                    Google Kubernetes Engine (GKE)                       │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │   │
│  │  │   Frontend      │  │   Auth Service  │  │   Todo Service  │        │   │
│  │  │   (React)       │  │   (Node.js)     │  │   (Node.js)     │        │   │
│  │  │   Port: 30080   │  │   Port: 30081   │  │   Port: 30082   │        │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘        │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────┐  ┌─────────────────────────────────────────────────┐     │
│  │  PostgreSQL     │  │              Cloud Functions                     │     │
│  │  (Compute)      │  │  • Todo Insights (AI)                          │     │
│  │                 │  │  • Analytics & Reporting                       │     │
│  │                 │  │  • Health Monitoring                           │     │
│  └─────────────────┘  └─────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Service Details

| Service | Technology | Port | Role |
|---------|------------|------|------|
| **Frontend** | React 18 | 30080 | User interface |
| **Auth Service** | Node.js + Express | 30081 | Authentication |
| **Todo Service** | Node.js + Express | 30082 | Todo CRUD operations |
| **Insights Function** | Cloud Functions | HTTPS | AI categorization |
| **Analytics Function** | Cloud Functions | HTTPS | Statistics and reporting |
| **Health Monitor** | Cloud Functions | HTTPS | System health |

## 🔧 Technologies

### Frontend
- **React 18**: Modern UI framework
- **Axios**: HTTP client
- **CSS3**: Modern styling
- **Nginx**: Web server (production)

### Backend Services
- **Node.js 18**: Runtime environment
- **Express.js**: Web framework
- **Sequelize**: ORM
- **JWT**: Authentication
- **Bcrypt**: Password hashing

### Database
- **PostgreSQL 13**: Primary database
- **Connection Pooling**: Performance optimization

### Cloud & Infrastructure
- **Google Kubernetes Engine**: Container orchestration
- **Google Cloud Functions**: Serverless computing
- **Google Natural Language API**: AI text analysis
- **Google Container Registry**: Docker image storage
- **Google Cloud Build**: CI/CD pipeline
- **Terraform**: Infrastructure as Code

### DevOps & Monitoring
- **Docker**: Containerization
- **Kubernetes**: Orchestration
- **Locust**: Load testing
- **Cloud Monitoring**: Metrics and alerts

## 🚀 Quick Start

### Prerequisites

- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
- [Docker](https://docs.docker.com/get-docker/)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [Terraform](https://learn.hashicorp.com/tutorials/terraform/install-cli)
- [Node.js 18+](https://nodejs.org/)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/cloud-project.git
cd cloud-project
```

### 2. Set up Google Cloud Project

```bash
# Create or select your GCP project
gcloud projects create your-project-id
gcloud config set project your-project-id

# Enable required APIs
gcloud services enable container.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable language.googleapis.com
```

### 3. Quick Deployment

```bash
# Deploy infrastructure with Terraform
cd terraform
terraform init
terraform plan
terraform apply

# Build and deploy containers
gcloud builds submit --config=../cloudbuild.yaml
```

### 4. Access the Application

```bash
# Get cluster credentials
gcloud container clusters get-credentials todo-cluster --zone=europe-west1-b

# Get external IP
kubectl get services
```

Application is accessible at:
- **Frontend**: `http://EXTERNAL-IP:30080`
- **Auth API**: `http://EXTERNAL-IP:30081`
- **Todo API**: `http://EXTERNAL-IP:30082`

## ⚙️ Installation

### Local Development

#### 1. Database Setup

```bash
# Run PostgreSQL with Docker
docker run --name postgres-todo \
  -e POSTGRES_DB=todoapp \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=password123 \
  -p 5432:5432 \
  -d postgres:13
```

#### 2. Backend Services

**Auth Service:**
```bash
cd auth-service
npm install
npm start  # Runs on port 3001
```

**Todo Service:**
```bash
cd todo-service
npm install
npm start  # Runs on port 3002
```

#### 3. Frontend

```bash
cd frontend
npm install
npm start  # Runs on port 3000
```

### Cloud Functions Deployment

```bash
cd cloud-functions

# Todo Insights Function
gcloud functions deploy todo-insights \
  --runtime nodejs18 \
  --trigger-http \
  --allow-unauthenticated \
  --memory 256MB

# Analytics Function
gcloud functions deploy todo-analytics \
  --runtime nodejs18 \
  --trigger-http \
  --allow-unauthenticated \
  --memory 256MB

# Health Monitor Function
gcloud functions deploy health-monitor \
  --runtime nodejs18 \
  --trigger-http \
  --allow-unauthenticated \
  --memory 256MB \
  --trigger-schedule "*/5 * * * *"
```

## 🔐 Configuration

### Environment Variables

**Auth Service (.env):**
```env
NODE_ENV=production
PORT=3001
DB_HOST=10.0.1.2
DB_PORT=5432
DB_NAME=todoapp
DB_USER=admin
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
BCRYPT_ROUNDS=10
```

**Todo Service (.env):**
```env
NODE_ENV=production
PORT=3002
DB_HOST=10.0.1.2
DB_PORT=5432
DB_NAME=todoapp
DB_USER=admin
DB_PASSWORD=your_password
AUTH_SERVICE_URL=http://auth-service:3001
INSIGHTS_FUNCTION_URL=https://your-region-project.cloudfunctions.net/todo-insights
```

**Frontend (.env):**
```env
REACT_APP_AUTH_URL=http://your-external-ip:30081
REACT_APP_TODO_URL=http://your-external-ip:30082
REACT_APP_TODO_INSIGHTS_URL=https://your-region-project.cloudfunctions.net/todo-insights
```

### Terraform Variables

Create `terraform/terraform.tfvars` file:

```hcl
project_id = "your-gcp-project-id"
region     = "europe-west1"
zone       = "europe-west1-b"

# Database
db_instance_name = "todo-postgres"
db_name         = "todoapp"
db_user         = "admin"
db_password     = "your_secure_password"

# Kubernetes
cluster_name           = "todo-cluster"
node_pool_name        = "todo-nodes"
initial_node_count    = 1
node_machine_type     = "e2-medium"
```

## 📊 Monitoring & Analytics

### Health Checks

```bash
# Check service status
curl http://your-ip:30081/health  # Auth Service
curl http://your-ip:30082/health  # Todo Service
curl http://your-ip:30080         # Frontend
```

### Metrics

- **Success Rates**: Authentication 95%+, Todo Operations 98%+
- **Response Time**: Auth Service ~1.8s, Todo Service ~423ms
- **AI Accuracy**: Categorization 84%, Priority Prediction 91%
- **Uptime**: 99.6%+ for all services

### Logs

```bash
# Kubernetes logs
kubectl logs -f deployment/auth-service
kubectl logs -f deployment/todo-service
kubectl logs -f deployment/frontend

# Cloud Functions logs
gcloud functions logs read todo-insights --limit 50
```

## 🧪 Testing

### Unit Tests

```bash
# Test backend services
cd auth-service && npm test
cd todo-service && npm test
```

### Load Testing

```bash
# Load test with Locust
cd locust
pip install locust
locust -f locustfile.py --host=http://your-external-ip:30081
```

### Integration Tests

```bash
# Automated testing with Cloud Build
gcloud builds submit --config=cloudbuild.yaml
```

## 📝 API Documentation

### Auth Service

**POST /auth/register**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**POST /auth/login**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

### Todo Service

**GET /todos** - Get all todos
**POST /todos** - Create new todo
```json
{
  "title": "Meeting with team",
  "description": "Discuss project progress",
  "priority": "high",
  "category": "work",
  "dueDate": "2024-12-31"
}
```

**PATCH /todos/:id/complete** - Complete todo
**DELETE /todos/:id** - Delete todo

### Cloud Functions

**POST /insights** - AI categorization
```json
{
  "title": "Buy groceries for dinner",
  "description": "Need milk, bread, and vegetables",
  "userId": 123
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "insights": {
      "category": "shopping",
      "priority": "medium",
      "confidence": 0.89,
      "keywords": ["groceries", "dinner", "food"]
    }
  }
}
```

## 🚀 Deployment

### Production Deployment

```bash
# 1. Infrastructure deployment
cd terraform
terraform apply -var-file="production.tfvars"

# 2. Application deployment
gcloud builds submit --config=cloudbuild.yaml

# 3. Domain setup (optional)
gcloud compute addresses create todo-app-ip --global
gcloud dns record-sets transaction start --zone-file-format --zone=your-zone
gcloud dns record-sets transaction add 34.102.136.180 --name=your-domain.com. --ttl=300 --type=A --zone=your-zone
gcloud dns record-sets transaction execute --zone=your-zone
```

### CI/CD Pipeline

Cloud Build automatically executes the following steps:

1. **Build**: Build Docker images
2. **Test**: Run unit and integration tests
3. **Push**: Push to Container Registry
4. **Deploy**: Deploy to Kubernetes
5. **Health Check**: Validate deployment

### Monitoring Setup

```bash
# Create alerting policies
gcloud alpha monitoring policies create --policy-from-file=monitoring/alert-policy.yaml

# Import dashboard
gcloud monitoring dashboards create --config-from-file=monitoring/dashboard.json
```

## 💰 Cost Analysis

### Monthly Estimated Costs

| Resource | Cost | Notes |
|----------|------|-------|
| **GKE Cluster** | $74.40 | Autopilot, 1 node |
| **Compute Engine** | $7.30 | PostgreSQL (e2-micro) |
| **Cloud Functions** | $2.38 | 3 functions, minimal usage |
| **Container Registry** | $5.00 | Image storage |
| **Network** | $10.00 | Data transfer |
| **VPC Connector** | $7.30 | Serverless connectivity |
| **Natural Language API** | $15.00 | AI text analysis |
| **Monitoring** | $3.00 | Logs and metrics |
| **Total** | **~$124.38** | 41% of $300 trial budget |

### Cost Optimization

- **Autopilot**: Automatic resource optimization
- **Preemptible Instances**: 80% cost savings
- **Connection Pooling**: Database connection optimization
- **Caching**: Response time and cost improvement
- **Scheduled Scaling**: Scale down during off-peak hours

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- **Code Style**: Use ESLint and Prettier
- **Commit Messages**: Follow conventional commits format
- **Testing**: Write tests for new features
- **Documentation**: Update README and code comments

### Issues

- Open issues for bug reports
- Start discussions for feature requests
- Email for security concerns

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## 🎯 Roadmap

- [ ] GraphQL API integration
- [ ] Real-time notifications (WebSocket)
- [ ] Mobile app development
- [ ] Advanced AI features (NLP improvements)
- [ ] Multi-tenant architecture
- [ ] Elasticsearch integration
- [ ] Advanced monitoring and alerting

---

**⭐ If you like this project, please give it a star!**

**🐛 Found a bug or have a feature request? Feel free to open an issue.**

**📫 Contact: [email@example.com](mailto:email@example.com)** 