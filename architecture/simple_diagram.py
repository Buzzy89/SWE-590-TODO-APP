#!/usr/bin/env python3
"""
Simplified Cloud Architecture Diagram Generator
"""

from diagrams import Diagram, Cluster, Edge
from diagrams.gcp.compute import GKE, ComputeEngine
from diagrams.gcp.database import SQL
from diagrams.gcp.network import LoadBalancing
from diagrams.gcp.storage import GCS
from diagrams.gcp.devtools import ContainerRegistry
from diagrams.k8s.compute import Pod
from diagrams.k8s.network import Service
from diagrams.onprem.client import Users
from diagrams.programming.language import NodeJS

def generate_main_architecture():
    """Generate the main cloud architecture diagram"""
    
    with Diagram("Todo App - Cloud Architecture", show=False, direction="TB", filename="todo_architecture"):
        
        # External users
        users = Users("Users")
        
        # Load Balancer
        lb = LoadBalancing("Load Balancer\n(NodePort)")
        
        with Cluster("Google Cloud Platform"):
            
            with Cluster("GKE Cluster"):
                with Cluster("Frontend"):
                    frontend = Pod("React App\n:30080")
                    
                with Cluster("Auth Service"):
                    auth = Pod("Node.js Auth\n:30081")
                    
                with Cluster("Todo Service"):
                    todo = Pod("Node.js Todo\n:30082")
            
            # Database
            database = ComputeEngine("PostgreSQL\n(e2-micro)")
            
            # Registry
            registry = ContainerRegistry("Container\nRegistry")
            
            # Storage for builds
            build_storage = GCS("Cloud Build\nArtifacts")
        
        # Connections
        users >> Edge(label="HTTPS") >> lb
        lb >> frontend
        frontend >> Edge(label="API Calls") >> auth
        frontend >> Edge(label="CRUD Ops") >> todo
        
        auth >> Edge(label="DB Queries\n+ Pool + Cache") >> database
        todo >> Edge(label="DB Queries") >> database
        
        build_storage >> Edge(label="Deploy") >> registry
        registry >> Edge(label="Pull Images") >> [frontend, auth, todo]

def generate_performance_diagram():
    """Generate performance optimization visualization"""
    
    with Diagram("Performance Optimizations", show=False, direction="LR", filename="performance_opts"):
        
        load_test = Users("Locust\nLoad Test")
        
        with Cluster("Auth Service Optimizations"):
            original = NodeJS("Original\n99% failures\n89s response")
            
            with Cluster("Optimized Version"):
                cache = NodeJS("Cache Layer\n5-min TTL")
                pool = NodeJS("Connection Pool\n50 max conn")
                bcrypt = NodeJS("Bcrypt Opt\nRounds: 12→10")
                circuit = NodeJS("Circuit Breaker\nGraceful failure")
            
            optimized = NodeJS("Optimized\n95% success\n2.1s response")
        
        load_test >> original
        original >> Edge(label="After Optimization") >> [cache, pool, bcrypt, circuit]
        [cache, pool, bcrypt, circuit] >> optimized

def generate_cost_breakdown():
    """Generate cost breakdown diagram"""
    
    with Diagram("GCP Cost Analysis", show=False, direction="TB", filename="cost_analysis"):
        
        with Cluster("Monthly Costs ($150 total)"):
            gke = GKE("GKE Autopilot\n$105 (70%)")
            lb_cost = LoadBalancing("Network/LB\n$19 (13%)")
            db_cost = ComputeEngine("Database\n$7 (5%)")
            storage_cost = GCS("Storage/Build\n$5 (3%)")
            registry_cost = ContainerRegistry("Registry\n$1 (1%)")
            
            total = GCS("Total: $150/month\nBudget: $300 ✅")
        
        [gke, lb_cost, db_cost, storage_cost, registry_cost] >> total

if __name__ == "__main__":
    print("🔄 Generating cloud architecture diagrams...")
    
    try:
        generate_main_architecture()
        print("✅ Main architecture: todo_architecture.png")
        
        generate_performance_diagram()
        print("✅ Performance optimization: performance_opts.png")
        
        generate_cost_breakdown()
        print("✅ Cost breakdown: cost_analysis.png")
        
        print("\n🎯 All diagrams generated successfully!")
        print("📁 Check current directory for PNG files")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print("💡 Make sure Graphviz is installed: brew install graphviz") 