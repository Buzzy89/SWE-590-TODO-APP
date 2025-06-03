#!/usr/bin/env python3
"""
Cloud-Native Todo Application Architecture Diagram Generator
Using the Diagrams library to create professional architecture diagrams
"""

from diagrams import Diagram, Cluster, Edge
from diagrams.gcp.compute import GKE, ComputeEngine, Functions
from diagrams.gcp.database import SQL
from diagrams.gcp.network import LoadBalancing, VPC
from diagrams.gcp.storage import GCS
from diagrams.gcp.devtools import ContainerRegistry
from diagrams.k8s.compute import Pod, Deployment
from diagrams.k8s.network import Service
from diagrams.onprem.client import Users
from diagrams.programming.language import NodeJS

def generate_architecture_diagram():
    """Generate the complete architecture diagram for the Todo application"""
    
    with Diagram("Cloud-Native Todo Application Architecture", show=False, direction="TB", filename="todo_app_architecture"):
        
        # External users
        users = Users("Users")
        
        with Cluster("Google Cloud Platform"):
            
            with Cluster("Google Kubernetes Engine (GKE Autopilot)"):
                with Cluster("todo-app namespace"):
                    # Frontend
                    with Cluster("Frontend Service"):
                        frontend_pod = Pod("React App\n(Port: 30080)")
                        frontend_service = Service("NodePort Service")
                        frontend_hpa = Deployment("HPA: 1-5 replicas")
                    
                    # Auth Service
                    with Cluster("Auth Service"):
                        auth_pod = Pod("Node.js Auth\n(Port: 30081)")
                        auth_service = Service("NodePort Service")
                        auth_hpa = Deployment("HPA: 1-5 replicas")
                    
                    # Todo Service
                    with Cluster("Todo Service"):
                        todo_pod = Pod("Node.js Todo\n(Port: 30082)")
                        todo_service = Service("NodePort Service")
                        todo_hpa = Deployment("HPA: 1-5 replicas")
                    
                    # Service mesh connections
                    frontend_service >> Edge(label="Internal API calls") >> auth_service
                    frontend_service >> Edge(label="CRUD operations") >> todo_service
            
            # Database
            with Cluster("Compute Engine"):
                database = ComputeEngine("PostgreSQL\n(e2-micro)")
            
            # Cloud Functions - Serverless Microservices
            with Cluster("Cloud Functions (Serverless)"):
                todo_insights = Functions("Todo Insights Function\n• AI Categorization & Priority\n• Natural Language API\n• 256MB, Node.js 18")
                todo_analytics = Functions("Todo Analytics Function\n• Global Statistics\n• User Activity Analysis\n• PostgreSQL Connection")
                health_monitor = Functions("Health Monitor Function\n• System Health Checks\n• Automated Monitoring\n• 5-minute intervals")
            
            # Container Registry
            registry = ContainerRegistry("Container Registry\n- auth:optimized-v4\n- frontend:updated-v2\n- todo:latest")
            
            # CI/CD (using generic GCS for build artifacts)
            cicd = GCS("Cloud Build\nCI/CD Pipeline")
            
            # Network
            with Cluster("VPC Network"):
                vpc = VPC("Private Network\n10.0.1.0/24")
                lb = LoadBalancing("Load Balancer\nNodePort Services")
        
        # External connections
        users >> Edge(label="HTTP Requests") >> lb
        lb >> frontend_service
        
        # Internal service connections
        auth_pod >> Edge(label="DB Queries\n+ Connection Pool\n+ Caching\n+ Circuit Breaker") >> database
        todo_pod >> Edge(label="DB Queries") >> database
        
        # Functions connections
        todo_pod >> Edge(label="AI Categorization\nPriority Prediction") >> todo_insights
        frontend_service >> Edge(label="Analytics Reports\nStatistics") >> todo_analytics
        health_monitor >> Edge(label="Health Checks") >> [auth_pod, todo_pod, frontend_pod]
        
        # CI/CD connections
        cicd >> Edge(label="Build & Push") >> registry
        registry >> Edge(label="Pull images") >> [frontend_pod, auth_pod, todo_pod]

def generate_performance_optimization_diagram():
    """Generate a diagram showing the performance optimization layers"""
    
    with Diagram("Performance Optimization Architecture", show=False, direction="LR", filename="performance_optimizations"):
        
        users = Users("Load Test\n(Locust)")
        
        with Cluster("Optimized Auth Service"):
            with Cluster("Performance Layers"):
                circuit_breaker = NodeJS("Circuit Breaker\n(Opossum)")
                cache_layer = NodeJS("In-Memory Cache\n(5-min TTL)")
                connection_pool = NodeJS("Connection Pool\n(50 max connections)")
                bcrypt_opt = NodeJS("Bcrypt Optimization\n(Salt rounds: 12→10)")
            
            database = SQL("PostgreSQL\nWith Indexes")
        
        # Performance flow
        users >> Edge(label="Concurrent Requests") >> circuit_breaker
        circuit_breaker >> Edge(label="Cache Check") >> cache_layer
        cache_layer >> Edge(label="Pool Management") >> connection_pool
        connection_pool >> Edge(label="Optimized Queries") >> database
        
        # Performance metrics
        with Cluster("Performance Results"):
            metrics = [
                NodeJS("Success Rate:\n0.8% → 95.2%"),
                NodeJS("Response Time:\n89s → 2.1s"),
                NodeJS("Throughput:\n12 → 47 req/s")
            ]

def generate_cost_breakdown_diagram():
    """Generate a cost breakdown visualization"""
    
    with Diagram("GCP Cost Breakdown ($150/month)", show=False, direction="TB", filename="cost_breakdown"):
        
        with Cluster("Monthly Cost Analysis"):
            gke_cost = GKE("GKE Autopilot\n$105.18 (70%)")
            network_cost = LoadBalancing("Network & LB\n$19.20 (13%)")
            compute_cost = ComputeEngine("Compute Engine\n$7.41 (5%)")
            build_cost = GCS("Cloud Build\n$5.00 (3%)")
            functions_cost = Functions("Cloud Functions\n$2.23 (1.5%)")
            registry_cost = ContainerRegistry("Container Registry\n$0.26 (0.2%)")
            
            total = GCS("Total: $150/month\nBudget: $300 ✅")
            
            [gke_cost, network_cost, compute_cost, build_cost, functions_cost, registry_cost] >> total

if __name__ == "__main__":
    print("Generating architecture diagrams...")
    
    # Generate main architecture diagram
    generate_architecture_diagram()
    print("✅ Main architecture diagram generated: todo_app_architecture.png")
    
    # Generate performance optimization diagram
    generate_performance_optimization_diagram()
    print("✅ Performance optimization diagram generated: performance_optimizations.png")
    
    # Generate cost breakdown diagram
    generate_cost_breakdown_diagram()
    print("✅ Cost breakdown diagram generated: cost_breakdown.png")
    
    print("\n🎯 All architecture diagrams generated successfully!")
    print("📁 Check the current directory for PNG files") 