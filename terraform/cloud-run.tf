# Cloud Run services commented out for minimal Kubernetes-only setup
# Service accounts can stay for other purposes if needed

resource "google_service_account" "auth_service" {
  account_id   = "${var.app_name}-auth-${var.environment}"
  display_name = "Auth Service Account"
  description  = "Service account for Auth service"
}

resource "google_service_account" "todo_service" {
  account_id   = "${var.app_name}-todo-${var.environment}"
  display_name = "Todo Service Account"
  description  = "Service account for Todo service"
}

resource "google_service_account" "frontend" {
  account_id   = "${var.app_name}-frontend-${var.environment}"
  display_name = "Frontend Service Account"
  description  = "Service account for Frontend"
}

/*
# All Cloud Run services and related resources commented out for minimal Kubernetes setup
# ... (all existing Cloud Run resources)
*/

# VPC Access Connector - Keep for Cloud Functions
resource "google_vpc_access_connector" "main" {
  name          = "main-connector"
  ip_cidr_range = "10.0.2.0/28"
  network       = google_compute_network.main.name
  machine_type  = "e2-micro"
  min_instances = 2
  max_instances = 3
}

# Monitoring Alert Policy
resource "google_monitoring_alert_policy" "cpu_utilization" {
  display_name = "High CPU Utilization - ${var.app_name}"
  combiner     = "OR"
  conditions {
    display_name = "CPU utilization for Kubernetes containers"
    condition_threshold {
      filter          = "resource.type=\"k8s_container\" AND resource.labels.namespace_name=\"todo-app\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = var.cpu_utilization
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }
} 