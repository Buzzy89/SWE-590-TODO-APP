# VPC Network
resource "google_compute_network" "main" {
  name                    = "${var.app_name}-vpc-${var.environment}"
  auto_create_subnetworks = false
  routing_mode           = "REGIONAL"
  
  depends_on = [google_project_service.apis]
}

# Subnet
resource "google_compute_subnetwork" "main" {
  name          = "${var.app_name}-subnet-${var.environment}"
  ip_cidr_range = var.subnet_cidr
  region        = var.region
  network       = google_compute_network.main.id
  
  # Enable private Google access for VM without external IP
  private_ip_google_access = true
}

# Cloud NAT Router
resource "google_compute_router" "main" {
  name    = "${var.app_name}-router-${var.environment}"
  region  = var.region
  network = google_compute_network.main.id
}

# Cloud NAT Gateway
resource "google_compute_router_nat" "main" {
  name                               = "${var.app_name}-nat-${var.environment}"
  router                            = google_compute_router.main.name
  region                            = var.region
  nat_ip_allocate_option           = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  log_config {
    enable = false
    filter = "ERRORS_ONLY"
  }
}

# Firewall rule for SSH (for debugging)
resource "google_compute_firewall" "ssh" {
  name    = "${var.app_name}-allow-ssh-${var.environment}"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["ssh-enabled"]
  
  direction = "INGRESS"
}

# Firewall rule for health checks
resource "google_compute_firewall" "health_check" {
  name    = "${var.app_name}-allow-health-check-${var.environment}"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["80", "443", "8080"]
  }

  source_ranges = ["130.211.0.0/22", "35.191.0.0/16"]
  direction     = "INGRESS"
}

# Firewall rule for NodePorts
resource "google_compute_firewall" "nodeports" {
  name    = "${var.app_name}-allow-nodeports-${var.environment}"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["30080", "30081", "30082"]
  }

  source_ranges = ["0.0.0.0/0"]
  direction     = "INGRESS"
} 