# GKE Cluster - Minimal Configuration
resource "google_container_cluster" "primary" {
  name     = "${var.app_name}-gke-${var.environment}"
  location = var.zone  # Zonal cluster (daha ucuz)

  # Single node configuration
  initial_node_count = 1
  
  network    = google_compute_network.main.name
  subnetwork = google_compute_subnetwork.main.name

  deletion_protection = false

  # Better node configuration for multiple pods
  node_config {
    machine_type = "e2-standard-2"
    disk_size_gb = 16
    disk_type    = "pd-standard"
    
    service_account = google_service_account.gke_nodes.email
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]
  }

  depends_on = [
    google_project_service.apis,
    google_compute_network.main,
    google_compute_subnetwork.main
  ]
}

# Service Account for GKE nodes
resource "google_service_account" "gke_nodes" {
  account_id   = "${var.app_name}-gke-nodes-${var.environment}"
  display_name = "GKE Nodes Service Account"
  description  = "Service account for GKE worker nodes"
}

# IAM bindings for GKE nodes
resource "google_project_iam_member" "gke_nodes_registry" {
  project = var.project_id
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}

resource "google_project_iam_member" "gke_nodes_logging" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}

resource "google_project_iam_member" "gke_nodes_monitoring" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}

resource "google_project_iam_member" "gke_nodes_monitoring_viewer" {
  project = var.project_id
  role    = "roles/monitoring.viewer"
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
} 