# Cloud Build service account
resource "google_service_account" "cloud_build" {
  account_id   = "${var.app_name}-cloud-build-${var.environment}"
  display_name = "Cloud Build Service Account"
  description  = "Service account for Cloud Build operations"
}

# IAM roles for Cloud Build
resource "google_project_iam_member" "cloud_build_sa_roles" {
  for_each = toset([
    "roles/run.admin",
    "roles/storage.admin",
    "roles/cloudbuild.builds.builder",
    "roles/iam.serviceAccountUser",
    "roles/cloudfunctions.admin"
  ])
  
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.cloud_build.email}"
}

# Cloud Build Triggers (commented out - requires GitHub repository connection)
# Uncomment and configure after connecting a repository in Google Cloud Console

/*
# Build trigger for Auth service
resource "google_cloudbuild_trigger" "auth_service" {
  name        = "${var.app_name}-auth-trigger-${var.environment}"
  description = "Trigger for Auth service build and deployment"
  
  service_account = google_service_account.cloud_build.id
  
  github {
    owner = "your-github-username"  # Replace with your GitHub username
    name  = "your-repo-name"        # Replace with your repository name
    push {
      branch = "^main$"
    }
  }
  
  build {
    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "build",
        "--platform=linux/amd64",
        "-t", "gcr.io/${var.project_id}/${var.app_name}-auth:$COMMIT_SHA",
        "-t", "gcr.io/${var.project_id}/${var.app_name}-auth:latest",
        "./auth-service"
      ]
    }
    
    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "push", 
        "gcr.io/${var.project_id}/${var.app_name}-auth:$COMMIT_SHA"
      ]
    }
    
    step {
      name = "gcr.io/cloud-builders/gcloud"
      args = [
        "run", "deploy", "${var.app_name}-auth-${var.environment}",
        "--image=gcr.io/${var.project_id}/${var.app_name}-auth:$COMMIT_SHA",
        "--region=${var.region}",
        "--platform=managed",
        "--allow-unauthenticated"
      ]
    }
    
    timeout = "1200s"
  }
  
  depends_on = [google_project_service.apis]
}

# Build trigger for Todo service
resource "google_cloudbuild_trigger" "todo_service" {
  name        = "${var.app_name}-todo-trigger-${var.environment}"
  description = "Trigger for Todo service build and deployment"
  
  service_account = google_service_account.cloud_build.id
  
  github {
    owner = "your-github-username"  # Replace with your GitHub username
    name  = "your-repo-name"        # Replace with your repository name
    push {
      branch = "^main$"
    }
  }
  
  build {
    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "build",
        "--platform=linux/amd64",
        "-t", "gcr.io/${var.project_id}/${var.app_name}-todo:$COMMIT_SHA",
        "-t", "gcr.io/${var.project_id}/${var.app_name}-todo:latest",
        "./todo-service"
      ]
    }
    
    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "push", 
        "gcr.io/${var.project_id}/${var.app_name}-todo:$COMMIT_SHA"
      ]
    }
    
    step {
      name = "gcr.io/cloud-builders/gcloud"
      args = [
        "run", "deploy", "${var.app_name}-todo-${var.environment}",
        "--image=gcr.io/${var.project_id}/${var.app_name}-todo:$COMMIT_SHA",
        "--region=${var.region}",
        "--platform=managed",
        "--allow-unauthenticated"
      ]
    }
    
    timeout = "1200s"
  }
  
  depends_on = [google_project_service.apis]
}

# Build trigger for Frontend
resource "google_cloudbuild_trigger" "frontend" {
  name        = "${var.app_name}-frontend-trigger-${var.environment}"
  description = "Trigger for Frontend build and deployment"
  
  service_account = google_service_account.cloud_build.id
  
  github {
    owner = "your-github-username"  # Replace with your GitHub username
    name  = "your-repo-name"        # Replace with your repository name
    push {
      branch = "^main$"
    }
  }
  
  build {
    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "build",
        "--platform=linux/amd64",
        "-t", "gcr.io/${var.project_id}/${var.app_name}-frontend:$COMMIT_SHA",
        "-t", "gcr.io/${var.project_id}/${var.app_name}-frontend:latest",
        "./frontend"
      ]
    }
    
    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "push", 
        "gcr.io/${var.project_id}/${var.app_name}-frontend:$COMMIT_SHA"
      ]
    }
    
    step {
      name = "gcr.io/cloud-builders/gcloud"
      args = [
        "run", "deploy", "${var.app_name}-frontend-${var.environment}",
        "--image=gcr.io/${var.project_id}/${var.app_name}-frontend:$COMMIT_SHA",
        "--region=${var.region}",
        "--platform=managed",
        "--allow-unauthenticated"
      ]
    }
    
    timeout = "1200s"
  }
  
  depends_on = [google_project_service.apis]
}
*/

# Dockerfile for auth-service
resource "local_file" "auth_dockerfile" {
  content = templatefile("${path.module}/dockerfiles/auth-service.Dockerfile", {})
  filename = "${path.module}/../auth-service/Dockerfile"
}

# Dockerfile for todo-service
resource "local_file" "todo_dockerfile" {
  content = templatefile("${path.module}/dockerfiles/todo-service.Dockerfile", {})
  filename = "${path.module}/../todo-service/Dockerfile"
}

# Cloud Build config for manual builds
resource "local_file" "cloudbuild_yaml" {
  content = templatefile("${path.module}/configs/cloudbuild.yaml", {
    project_id  = var.project_id
    app_name    = var.app_name
    environment = var.environment
    region      = var.region
  })
  filename = "${path.module}/../cloudbuild.yaml"
} 