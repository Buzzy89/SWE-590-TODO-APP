# Kubernetes provider
provider "kubernetes" {
  host                   = "https://${google_container_cluster.primary.endpoint}"
  token                  = data.google_client_config.default.access_token
  cluster_ca_certificate = base64decode(google_container_cluster.primary.master_auth.0.cluster_ca_certificate)
}

# Data source for getting access token
data "google_client_config" "default" {}

# Data source for getting cluster nodes - DISABLED (problematic)
/*
data "google_compute_instance" "gke_node" {
  name = google_container_cluster.primary.node_config[0].machine_type != "" ? "${google_container_cluster.primary.name}-default-pool-*" : ""
  zone = var.zone
  depends_on = [google_container_cluster.primary]
}
*/

# Namespace
resource "kubernetes_namespace" "todo_app" {
  metadata {
    name = var.app_name
    labels = {
      name        = var.app_name
      environment = var.environment
    }
  }

  depends_on = [google_container_cluster.primary]
}

# ConfigMap for environment variables
resource "kubernetes_config_map" "app_config" {
  metadata {
    name      = "${var.app_name}-config"
    namespace = kubernetes_namespace.todo_app.metadata[0].name
  }

  data = {
    DB_HOST     = google_compute_instance.postgres.network_interface[0].network_ip
    DB_PORT     = "5432"
    DB_NAME     = var.db_name
    DB_USERNAME = var.db_user
    NODE_ENV    = "production"
  }
}

# Secret for sensitive data
resource "kubernetes_secret" "app_secrets" {
  metadata {
    name      = "${var.app_name}-secrets"
    namespace = kubernetes_namespace.todo_app.metadata[0].name
  }

  data = {
    DB_PASSWORD = var.db_password
    JWT_SECRET  = "your-super-secret-jwt-key-change-in-production"
  }

  type = "Opaque"
}

# Auth Service Deployment - Optimized for High Load
resource "kubernetes_deployment" "auth_service" {
  metadata {
    name      = "${var.app_name}-auth"
    namespace = kubernetes_namespace.todo_app.metadata[0].name
    labels = {
      app     = "${var.app_name}-auth"
      version = "v2-optimized"
    }
  }

  spec {
    replicas = 1  # Minimal: 1 replica

    selector {
      match_labels = {
        app = "${var.app_name}-auth"
      }
    }

    template {
      metadata {
        labels = {
          app = "${var.app_name}-auth"
        }
      }

      spec {
        container {
          name  = "auth-service"
          image = "europe-west1-docker.pkg.dev/yusuf-swe590/todo-app/auth:optimized-v4"
          port {
            container_port = 3001
          }

          env_from {
            config_map_ref {
              name = kubernetes_config_map.app_config.metadata[0].name
            }
          }

          env_from {
            secret_ref {
              name = kubernetes_secret.app_secrets.metadata[0].name
            }
          }

          env {
            name  = "PORT"
            value = "3001"
          }

          env {
            name  = "NODE_ENV"
            value = "production"
          }

          env {
            name  = "DB_POOL_MAX"
            value = "50"
          }

          env {
            name  = "DB_POOL_MIN"
            value = "5"
          }

          # Increased resources for better performance
          resources {
            limits = {
              cpu    = "500m"     # Increased from 200m
              memory = "1Gi"      # Increased from 256Mi
            }
            requests = {
              cpu    = "250m"     # Increased from 100m
              memory = "512Mi"    # Increased from 128Mi
            }
          }

          # Optimized health checks
          liveness_probe {
            http_get {
              path = "/health"
              port = 3001
            }
            initial_delay_seconds = 15  # Reduced from 30
            period_seconds        = 20  # Reduced from 30
            timeout_seconds       = 5
            failure_threshold     = 3
          }

          readiness_probe {
            http_get {
              path = "/health"
              port = 3001
            }
            initial_delay_seconds = 5   # Reduced from 15
            period_seconds        = 5   # Reduced from 10
            timeout_seconds       = 3
            failure_threshold     = 3
          }

          # Startup probe for better initial deployment
          startup_probe {
            http_get {
              path = "/health"
              port = 3001
            }
            initial_delay_seconds = 10
            period_seconds        = 5
            timeout_seconds       = 3
            failure_threshold     = 10
          }
        }
      }
    }

    # Rolling update strategy for zero downtime
    strategy {
      type = "RollingUpdate"
      rolling_update {
        max_unavailable = "25%"
        max_surge       = "25%"
      }
    }
  }
}

# Auth Service Service
resource "kubernetes_service" "auth_service" {
  metadata {
    name      = "${var.app_name}-auth-service"
    namespace = kubernetes_namespace.todo_app.metadata[0].name
  }

  spec {
    selector = {
      app = "${var.app_name}-auth"
    }

    port {
      name        = "http"
      port        = 80
      target_port = 3001
      protocol    = "TCP"
    }

    type = "ClusterIP"
  }
}

# Auth Service NodePort (for external access)
resource "kubernetes_service" "auth_service_nodeport" {
  metadata {
    name      = "${var.app_name}-auth-nodeport"
    namespace = kubernetes_namespace.todo_app.metadata[0].name
  }

  spec {
    selector = {
      app = "${var.app_name}-auth"
    }

    port {
      name        = "http"
      port        = 80
      target_port = 3001
      protocol    = "TCP"
      node_port   = 30081
    }

    type = "NodePort"
  }
}

# Todo Service Deployment - Minimal
resource "kubernetes_deployment" "todo_service" {
  metadata {
    name      = "${var.app_name}-todo"
    namespace = kubernetes_namespace.todo_app.metadata[0].name
    labels = {
      app     = "${var.app_name}-todo"
      version = "v1"
    }
  }

  spec {
    replicas = 1  # Minimal: 1 replica

    selector {
      match_labels = {
        app = "${var.app_name}-todo"
      }
    }

    template {
      metadata {
        labels = {
          app = "${var.app_name}-todo"
        }
      }

      spec {
        container {
          name  = "todo-service"
          image = "europe-west1-docker.pkg.dev/yusuf-swe590/todo-app/todo:no-rate-limit"
          port {
            container_port = 3002
          }

          env_from {
            config_map_ref {
              name = kubernetes_config_map.app_config.metadata[0].name
            }
          }

          env_from {
            secret_ref {
              name = kubernetes_secret.app_secrets.metadata[0].name
            }
          }

          env {
            name  = "PORT"
            value = "3002"
          }

          env {
            name  = "AUTH_SERVICE_URL"
            value = "http://${kubernetes_service.auth_service.metadata[0].name}.${kubernetes_namespace.todo_app.metadata[0].name}.svc.cluster.local"
          }

          env {
            name  = "REACT_APP_TODO_INSIGHTS_URL"
            value = google_cloudfunctions2_function.todo_insights.service_config[0].uri
          }

          # Minimal resources
          resources {
            limits = {
              cpu    = "200m"
              memory = "256Mi"
            }
            requests = {
              cpu    = "100m"
              memory = "128Mi"
            }
          }

          liveness_probe {
            http_get {
              path = "/health"
              port = 3002
            }
            initial_delay_seconds = 30
            period_seconds        = 30
            timeout_seconds       = 5
            failure_threshold     = 3
          }

          readiness_probe {
            http_get {
              path = "/health"
              port = 3002
            }
            initial_delay_seconds = 15
            period_seconds        = 10
            timeout_seconds       = 3
            failure_threshold     = 3
          }
        }
      }
    }
  }
}

# Todo Service Service
resource "kubernetes_service" "todo_service" {
  metadata {
    name      = "${var.app_name}-todo-service"
    namespace = kubernetes_namespace.todo_app.metadata[0].name
  }

  spec {
    selector = {
      app = "${var.app_name}-todo"
    }

    port {
      name        = "http"
      port        = 80
      target_port = 3002
      protocol    = "TCP"
    }

    type = "ClusterIP"
  }
}

# Todo Service NodePort (for external access)
resource "kubernetes_service" "todo_service_nodeport" {
  metadata {
    name      = "${var.app_name}-todo-nodeport"
    namespace = kubernetes_namespace.todo_app.metadata[0].name
  }

  spec {
    selector = {
      app = "${var.app_name}-todo"
    }

    port {
      name        = "http"
      port        = 80
      target_port = 3002
      protocol    = "TCP"
      node_port   = 30082
    }

    type = "NodePort"
  }
}

# Frontend Deployment - Minimal
resource "kubernetes_deployment" "frontend" {
  metadata {
    name      = "${var.app_name}-frontend"
    namespace = kubernetes_namespace.todo_app.metadata[0].name
    labels = {
      app     = "${var.app_name}-frontend"
      version = "v1"
    }
  }

  spec {
    replicas = 1  # Minimal: 1 replica

    selector {
      match_labels = {
        app = "${var.app_name}-frontend"
      }
    }

    template {
      metadata {
        labels = {
          app = "${var.app_name}-frontend"
        }
      }

      spec {
        container {
          name  = "frontend"
          image = "europe-west1-docker.pkg.dev/yusuf-swe590/todo-app/frontend:latest"
          port {
            container_port = 80
          }

          env {
            name  = "REACT_APP_API_URL"
            value = "http://34.22.249.41:30081"
          }

          env {
            name  = "REACT_APP_AUTH_URL"
            value = "http://34.22.249.41:30081"
          }

          env {
            name  = "REACT_APP_TODO_URL"
            value = "http://34.22.249.41:30082"
          }

          env {
            name  = "REACT_APP_TODO_INSIGHTS_URL"
            value = google_cloudfunctions2_function.todo_insights.service_config[0].uri
          }

          # Minimal resources
          resources {
            limits = {
              cpu    = "100m"
              memory = "128Mi"
            }
            requests = {
              cpu    = "50m"
              memory = "64Mi"
            }
          }

          liveness_probe {
            http_get {
              path = "/health"
              port = 80
            }
            initial_delay_seconds = 15
            period_seconds        = 30
            timeout_seconds       = 3
            failure_threshold     = 3
          }

          readiness_probe {
            http_get {
              path = "/health"
              port = 80
            }
            initial_delay_seconds = 5
            period_seconds        = 10
            timeout_seconds       = 3
            failure_threshold     = 3
          }
        }
      }
    }
  }
}

# Frontend Service (NodePort instead of LoadBalancer)
resource "kubernetes_service" "frontend" {
  metadata {
    name      = "${var.app_name}-frontend-service"
    namespace = kubernetes_namespace.todo_app.metadata[0].name
  }

  spec {
    selector = {
      app = "${var.app_name}-frontend"
    }

    port {
      name        = "http"
      port        = 80
      target_port = 80
      protocol    = "TCP"
      node_port   = 30080  # Fixed NodePort
    }

    type = "NodePort"  # Changed from LoadBalancer to NodePort
  }
}

# HPA for Auth Service - Optimized for High Load
resource "kubernetes_horizontal_pod_autoscaler_v2" "auth_hpa" {
  metadata {
    name      = "${var.app_name}-auth-hpa"
    namespace = kubernetes_namespace.todo_app.metadata[0].name
  }

  spec {
    min_replicas = 3    # Increased from 1 to match deployment
    max_replicas = 10   # Increased from 5 for better scaling

    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = kubernetes_deployment.auth_service.metadata[0].name
    }

    # CPU-based scaling
    metric {
      type = "Resource"
      resource {
        name = "cpu"
        target {
          type                = "Utilization"
          average_utilization = 70  # Increased from 50 for more aggressive scaling
        }
      }
    }

    # Memory-based scaling
    metric {
      type = "Resource"
      resource {
        name = "memory"
        target {
          type                = "Utilization"
          average_utilization = 80
        }
      }
    }

    behavior {
      scale_up {
        stabilization_window_seconds = 30   # Reduced from 60 for faster scaling
        select_policy               = "Max"
        policy {
          type          = "Pods"
          value         = 2           # Scale up 2 pods at a time
          period_seconds = 30         # Reduced from 60
        }
        policy {
          type          = "Percent"
          value         = 50          # Or 50% of current pods
          period_seconds = 30
        }
      }
      scale_down {
        stabilization_window_seconds = 180  # Reduced from 300
        select_policy               = "Min"
        policy {
          type          = "Pods"
          value         = 1
          period_seconds = 60
        }
        policy {
          type          = "Percent"
          value         = 25          # Scale down 25% at a time
          period_seconds = 60
        }
      }
    }
  }
}

# HPA for Todo Service  
resource "kubernetes_horizontal_pod_autoscaler_v2" "todo_hpa" {
  metadata {
    name      = "${var.app_name}-todo-hpa"
    namespace = kubernetes_namespace.todo_app.metadata[0].name
  }

  spec {
    min_replicas = 1
    max_replicas = 5

    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = kubernetes_deployment.todo_service.metadata[0].name
    }

    metric {
      type = "Resource"
      resource {
        name = "cpu"
        target {
          type                = "Utilization"
          average_utilization = 50
        }
      }
    }

    behavior {
      scale_up {
        stabilization_window_seconds = 60
        select_policy               = "Max"
        policy {
          type          = "Pods"
          value         = 1
          period_seconds = 60
        }
      }
      scale_down {
        stabilization_window_seconds = 300
        select_policy               = "Min"
        policy {
          type          = "Pods"
          value         = 1
          period_seconds = 60
        }
      }
    }
  }
}

# Remove all HPA resources and API Gateway for minimal setup
# Horizontal Pod Autoscalers removed for minimal configuration 