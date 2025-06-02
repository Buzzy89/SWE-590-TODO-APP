# PostgreSQL Instance - Minimal Configuration
resource "google_compute_instance" "postgres" {
  name         = "${var.app_name}-postgres-${var.environment}"
  machine_type = "e2-micro"  # Smallest instance type
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2004-lts"
      size  = 16  # Minimum disk size
      type  = "pd-standard"
    }
  }

  network_interface {
    network    = google_compute_network.main.name
    subnetwork = google_compute_subnetwork.main.name
    
    access_config {
      # Ephemeral IP
    }
  }

  # Startup script for PostgreSQL installation
  metadata_startup_script = templatefile("${path.module}/scripts/postgres-startup.sh", {
    DB_NAME     = var.db_name
    DB_USER     = var.db_user
    DB_PASSWORD = var.db_password
  })

  service_account {
    email  = google_service_account.postgres.email
    scopes = ["cloud-platform"]
  }

  tags = ["postgres-vm", "${var.app_name}-db", "ssh-enabled"]

  labels = {
    environment = var.environment
    app         = var.app_name
    tier        = "database"
  }
}

# Service Account for PostgreSQL VM
resource "google_service_account" "postgres" {
  account_id   = "${var.app_name}-postgres-sa-${var.environment}"
  display_name = "PostgreSQL Service Account"
  description  = "Service account for PostgreSQL VM"
}

# Firewall rule for PostgreSQL (internal only)
resource "google_compute_firewall" "postgres" {
  name    = "${var.app_name}-postgres-${var.environment}"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["5432"]
  }

  source_ranges = [
    var.subnet_cidr,       # VM subnet: 10.0.1.0/24
    "10.240.0.0/14"       # GKE cluster pod CIDR
  ]
  target_tags   = ["postgres-vm"]
}

# IAM binding for PostgreSQL service account
resource "google_project_iam_member" "postgres_logging" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.postgres.email}"
}

resource "google_project_iam_member" "postgres_monitoring" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.postgres.email}"
} 