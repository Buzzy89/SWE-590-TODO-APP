# Database outputs
output "postgres_internal_ip" {
  description = "Internal IP address of PostgreSQL instance"
  value       = google_compute_instance.postgres.network_interface[0].network_ip
}

output "postgres_instance_name" {
  description = "Name of the PostgreSQL instance"
  value       = google_compute_instance.postgres.name
}

# Cloud Functions outputs
output "todo_insights_function_url" {
  description = "URL of the Todo Insights function"
  value       = google_cloudfunctions2_function.todo_insights.service_config[0].uri
}

output "health_monitor_function_url" {
  description = "URL of the Health Monitor Cloud Function"
  value       = google_cloudfunctions2_function.health_monitor.service_config[0].uri
}

# GKE outputs
output "gke_cluster_name" {
  description = "Name of the GKE cluster"
  value       = google_container_cluster.primary.name
}

output "gke_cluster_zone" {
  description = "Zone of the GKE cluster"
  value       = google_container_cluster.primary.location
}

# Kubernetes namespace
output "k8s_namespace" {
  description = "Kubernetes namespace for the application"
  value       = kubernetes_namespace.todo_app.metadata[0].name
}

# Service URLs within cluster
output "auth_service_url_cluster" {
  description = "Internal URL of the auth service"
  value       = "http://${kubernetes_service.auth_service.metadata[0].name}.${kubernetes_namespace.todo_app.metadata[0].name}.svc.cluster.local"
}

output "todo_service_url_cluster" {
  description = "Internal URL of the todo service"  
  value       = "http://${kubernetes_service.todo_service.metadata[0].name}.${kubernetes_namespace.todo_app.metadata[0].name}.svc.cluster.local"
}

# Project and image information
output "project_id" {
  description = "Google Cloud project ID"
  value       = var.project_id
}

output "docker_images" {
  description = "Docker images in Google Container Registry"
  value = {
    auth     = "gcr.io/${var.project_id}/${var.app_name}-auth:latest"
    todo     = "gcr.io/${var.project_id}/${var.app_name}-todo:latest"
    frontend = "gcr.io/${var.project_id}/${var.app_name}-frontend:latest"
  }
}

# Cluster credentials command
output "kubectl_config_command" {
  description = "Command to configure kubectl for this cluster"
  value       = "gcloud container clusters get-credentials ${google_container_cluster.primary.name} --zone ${google_container_cluster.primary.location}"
}

# Kubernetes service information
output "kubernetes_services" {
  description = "Kubernetes services information"
  value = {
    namespace     = kubernetes_namespace.todo_app.metadata[0].name
    auth_service  = kubernetes_service.auth_service.metadata[0].name
    todo_service  = kubernetes_service.todo_service.metadata[0].name
    frontend      = kubernetes_service.frontend.metadata[0].name
  }
}

# Access information
output "access_info" {
  description = "How to access the application"
  value = {
    frontend_nodeport = "30080"
    get_node_ip_command = "kubectl get nodes -o wide"
    port_forward_command = "kubectl port-forward service/todo-app-frontend-service 8080:80 -n todo-app"
  }
}

# Useful kubectl commands
output "kubectl_commands" {
  description = "Useful kubectl commands for monitoring"
  value = {
    get_pods     = "kubectl get pods -n ${kubernetes_namespace.todo_app.metadata[0].name}"
    get_services = "kubectl get services -n ${kubernetes_namespace.todo_app.metadata[0].name}"
    describe_frontend = "kubectl describe service ${kubernetes_service.frontend.metadata[0].name} -n ${kubernetes_namespace.todo_app.metadata[0].name}"
    logs_auth = "kubectl logs -f deployment/todo-app-auth -n ${kubernetes_namespace.todo_app.metadata[0].name}"
    logs_todo = "kubectl logs -f deployment/todo-app-todo -n ${kubernetes_namespace.todo_app.metadata[0].name}"
    logs_frontend = "kubectl logs -f deployment/todo-app-frontend -n ${kubernetes_namespace.todo_app.metadata[0].name}"
  }
} 