variable "project_id" {
  description = "Google Cloud Project ID"
  type        = string
}

variable "region" {
  description = "Google Cloud Region"
  type        = string
  default     = "europe-west1"
}

variable "zone" {
  description = "Google Cloud Zone"
  type        = string
  default     = "europe-west1-b"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "todo-app"
}

# Database configuration
variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "todoapp"
}

variable "db_user" {
  description = "PostgreSQL username"
  type        = string
  default     = "postgres"
}

variable "db_password" {
  description = "PostgreSQL password"
  type        = string
  default     = "SecurePassword123!"
  sensitive   = true
}

# Network configuration
variable "network_cidr" {
  description = "CIDR range for the VPC network"
  type        = string
  default     = "10.0.0.0/16"
}

variable "subnet_cidr" {
  description = "CIDR range for the subnet"
  type        = string
  default     = "10.0.1.0/24"
}

# Cloud Run configuration
variable "max_instances" {
  description = "Maximum number of instances for Cloud Run services"
  type        = number
  default     = 2
}

variable "cpu_utilization" {
  description = "CPU utilization threshold for scaling"
  type        = number
  default     = 50
}

# Machine type for PostgreSQL VM (Free tier eligible)
variable "postgres_machine_type" {
  description = "Machine type for PostgreSQL VM"
  type        = string
  default     = "e2-micro"
} 