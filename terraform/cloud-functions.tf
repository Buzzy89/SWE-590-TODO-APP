# Service account for Cloud Function
resource "google_service_account" "analytics_function" {
  account_id   = "${var.app_name}-analytics-${var.environment}"
  display_name = "Analytics Function Service Account"
  description  = "Service account for Todo Analytics Cloud Function"
}

# IAM roles for Cloud Function
resource "google_project_iam_member" "analytics_function_invoker" {
  project = var.project_id
  role    = "roles/cloudfunctions.invoker"
  member  = "serviceAccount:${google_service_account.analytics_function.email}"
}

resource "google_project_iam_member" "analytics_function_logging" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.analytics_function.email}"
}

# Cloud Storage bucket for function source code
resource "google_storage_bucket" "function_source" {
  name                        = "${var.project_id}-${var.app_name}-functions-${var.environment}"
  location                    = var.region
  force_destroy               = true
  uniform_bucket_level_access = true

  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type = "Delete"
    }
  }
}

# Zip the function source code
data "archive_file" "analytics_function_zip" {
  type        = "zip"
  output_path = "/tmp/analytics-function.zip"
  source_dir  = "${path.module}/../cloud-functions/todo-analytics"
}

# Upload function source to bucket
resource "google_storage_bucket_object" "analytics_function_source" {
  name   = "analytics-function-${data.archive_file.analytics_function_zip.output_md5}.zip"
  bucket = google_storage_bucket.function_source.name
  source = data.archive_file.analytics_function_zip.output_path
}

# Analytics Cloud Function - temporarily disabled
# resource "google_cloudfunctions2_function" "analytics" {
#   name        = "${var.app_name}-analytics-${var.environment}"
#   location    = var.region
#   description = "Analytics function for todo app"

#   build_config {
#     runtime     = "nodejs18"
#     entry_point = "todoAnalytics"
#     source {
#       storage_source {
#         bucket = google_storage_bucket.function_source.name
#         object = google_storage_bucket_object.analytics_function_source.name
#       }
#     }
#   }

#   service_config {
#     max_instance_count = 10
#     min_instance_count = 0
#     available_memory   = "256M"
#     timeout_seconds    = 60
#     service_account_email = google_service_account.analytics_function.email
    
#     environment_variables = {
#       NODE_ENV    = "production"
#       DB_HOST     = google_compute_instance.postgres.network_interface[0].network_ip
#       DB_PORT     = "5432"
#       DB_NAME     = var.db_name
#       DB_USERNAME = var.db_user
#       DB_PASSWORD = var.db_password
#     }
    
#     # Remove VPC connector for now to avoid port issues
#     # vpc_connector = google_vpc_access_connector.main.id
#     # vpc_connector_egress_settings = "PRIVATE_RANGES_ONLY"
#   }

#   depends_on = [
#     google_project_service.apis,
#     google_storage_bucket_object.analytics_function_source
#   ]
# }

# Health Monitor Cloud Function
resource "google_cloudfunctions2_function" "health_monitor" {
  name        = "${var.app_name}-health-monitor-${var.environment}"
  location    = var.region
  description = "Health monitoring function"

  build_config {
    runtime     = "nodejs18"
    entry_point = "healthMonitor"
    source {
      storage_source {
        bucket = google_storage_bucket.function_source.name
        object = google_storage_bucket_object.health_monitor_source.name
      }
    }
  }

  service_config {
    max_instance_count = 5
    min_instance_count = 0
    available_memory   = "256M"
    timeout_seconds    = 30
    service_account_email = google_service_account.analytics_function.email
  }

  depends_on = [
    google_project_service.apis,
    google_storage_bucket_object.health_monitor_source
  ]
}

# IAM bindings for public access
# resource "google_cloudfunctions2_function_iam_binding" "analytics_public" {
#   project        = var.project_id
#   location       = var.region
#   cloud_function = google_cloudfunctions2_function.analytics.name
#   role           = "roles/cloudfunctions.invoker"
#   members        = ["allUsers"]
# }

resource "google_cloudfunctions2_function_iam_binding" "health_monitor_public" {
  project        = var.project_id
  location       = var.region
  cloud_function = google_cloudfunctions2_function.health_monitor.name
  role           = "roles/cloudfunctions.invoker"
  members        = ["allUsers"]
}

# Health monitor function source
data "archive_file" "health_monitor_zip" {
  type        = "zip"
  output_path = "/tmp/health-monitor.zip"
  source {
    content  = file("${path.module}/functions/health-monitor.js")
    filename = "index.js"
  }
  source {
    content = jsonencode({
      name = "health-monitor"
      version = "1.0.0"
      main = "index.js"
      dependencies = {
        "@google-cloud/functions-framework" = "^3.3.0"
        "axios" = "^1.4.0"
      }
    })
    filename = "package.json"
  }
}

resource "google_storage_bucket_object" "health_monitor_source" {
  name   = "health-monitor-${data.archive_file.health_monitor_zip.output_md5}.zip"
  bucket = google_storage_bucket.function_source.name
  source = data.archive_file.health_monitor_zip.output_path
}

# Todo Insights Function (AI-powered categorization and priority prediction)
resource "google_cloudfunctions2_function" "todo_insights" {
  name        = "${var.app_name}-insights-${var.environment}"
  location    = var.region
  description = "AI-powered todo categorization and priority prediction"

  build_config {
    runtime     = "nodejs18"
    entry_point = "todoInsights"
    source {
      storage_source {
        bucket = google_storage_bucket.function_source.name
        object = google_storage_bucket_object.todo_insights_source.name
      }
    }
  }

  service_config {
    max_instance_count = 10
    min_instance_count = 0
    available_memory   = "256M"
    timeout_seconds    = 60
    
    environment_variables = {
      DB_HOST     = google_compute_instance.postgres.network_interface[0].network_ip
      DB_PORT     = "5432"
      DB_NAME     = var.db_name
      DB_USERNAME = var.db_user
      DB_PASSWORD = var.db_password
    }

    vpc_connector                 = google_vpc_access_connector.main.id
    vpc_connector_egress_settings = "PRIVATE_RANGES_ONLY"
    
    service_account_email = google_service_account.insights_function.email
  }

  depends_on = [
    google_project_service.apis,
    google_storage_bucket_object.todo_insights_source,
    google_vpc_access_connector.main
  ]
}

# Service account for todo insights function
resource "google_service_account" "insights_function" {
  account_id   = "${var.app_name}-insights-${var.environment}"
  display_name = "Todo Insights Function Service Account"
  description  = "Service account for todo insights function"
}

# IAM roles for insights function
resource "google_project_iam_member" "insights_function_language_user" {
  project = var.project_id
  role    = "roles/ml.developer"
  member  = "serviceAccount:${google_service_account.insights_function.email}"
}

resource "google_project_iam_member" "insights_function_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.insights_function.email}"
}

# Create zip file for insights function
data "archive_file" "todo_insights_zip" {
  type        = "zip"
  output_path = "${path.module}/functions/todo-insights.zip"
  source_dir  = "${path.root}/cloud-functions/todo-insights"
}

# Upload insights function source to bucket
resource "google_storage_bucket_object" "todo_insights_source" {
  name   = "todo-insights-${data.archive_file.todo_insights_zip.output_md5}.zip"
  bucket = google_storage_bucket.function_source.name
  source = data.archive_file.todo_insights_zip.output_path
}

# Make the insights function publicly accessible
resource "google_cloudfunctions2_function_iam_binding" "insights_public" {
  project        = google_cloudfunctions2_function.todo_insights.project
  location       = google_cloudfunctions2_function.todo_insights.location
  cloud_function = google_cloudfunctions2_function.todo_insights.name
  role           = "roles/cloudfunctions.invoker"
  members        = ["allUsers"]
} 