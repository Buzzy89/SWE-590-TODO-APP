#!/usr/bin/env python3
"""
Serverless Functions Architecture Diagram Generator
Detailed visualization of Cloud Functions in our Todo Application
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

def generate_updated_architecture_diagram():
    """Generate the complete architecture diagram with detailed serverless functions"""
    
    with Diagram("Cloud-Native Todo Application - Serverless Architecture", show=False, direction="TB", filename="todo_app_serverless_architecture"):
        
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
                todo_insights = Functions("Todo Insights Function\n• AI Categorization\n• Priority Prediction\n• Natural Language API\n• 256MB, Node.js 18\n• VPC Connector")
                todo_analytics = Functions("Todo Analytics Function\n• Global Statistics\n• User Activity\n• Trend Analysis\n• PostgreSQL Pool\n• 256MB, 60s timeout")
                health_monitor = Functions("Health Monitor Function\n• System Health Checks\n• Automated Monitoring\n• Service Status\n• 256MB, 30s timeout\n• Scheduled Execution")
            
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
        
        # Serverless Functions connections - More detailed
        todo_pod >> Edge(label="AI Categorization\nPriority Prediction\nPOST /insights") >> todo_insights
        frontend_service >> Edge(label="Analytics Reports\nStatistics\nGET /analytics") >> todo_analytics
        health_monitor >> Edge(label="Health Checks\nPeriodic Monitoring") >> [auth_service, todo_service, frontend_service]
        
        # Database connections for functions
        todo_insights >> Edge(label="Todo Update\nCategory & Priority\nINSERT/UPDATE") >> database
        todo_analytics >> Edge(label="Analytics Query\nAggregate Data\nSELECT") >> database
        
        # CI/CD connections
        cicd >> Edge(label="Build & Push") >> registry
        registry >> Edge(label="Pull images") >> [frontend_pod, auth_pod, todo_pod]
        cicd >> Edge(label="Deploy Functions") >> [todo_insights, todo_analytics, health_monitor]

def generate_serverless_details_diagram():
    """Generate detailed serverless functions architecture"""
    
    with Diagram("Serverless Functions Detailed Architecture", show=False, direction="LR", filename="serverless_functions_detail"):
        
        users = Users("Frontend\nReact App")
        
        with Cluster("Cloud Functions (Serverless Microservices)"):
            
            with Cluster("Todo Insights Function"):
                insights_trigger = Functions("HTTP Trigger\nhttps://...insights")
                insights_nlp = NodeJS("Natural Language\nAPI Processing\nEntities & Sentiment")
                insights_categorize = NodeJS("Category Prediction\nWork, Personal,\nHealth, Shopping,\nFinance, Education,\nTravel, Maintenance")
                insights_priority = NodeJS("Priority Prediction\nHigh, Medium, Low\nKeyword Analysis")
                
                insights_trigger >> insights_nlp
                insights_nlp >> insights_categorize
                insights_nlp >> insights_priority
            
            with Cluster("Todo Analytics Function"):
                analytics_trigger = Functions("HTTP Trigger\nhttps://...analytics")
                analytics_stats = NodeJS("Global Stats\nTotal Todos\nCompletion Rate")
                analytics_trends = NodeJS("Trend Analysis\nWeekly/Monthly\nUser Activity")
                analytics_reports = NodeJS("Category Distribution\nPriority Analysis\nTime-based Reports")
                
                analytics_trigger >> analytics_stats
                analytics_trigger >> analytics_trends  
                analytics_trigger >> analytics_reports
            
            with Cluster("Health Monitor Function"):
                health_trigger = Functions("Scheduled Trigger\nCron: */5 * * * *\nEvery 5 minutes")
                health_check = NodeJS("Service Health Check\nAuth: :30081/health\nTodo: :30082/health\nFrontend: :30080")
                health_alerts = NodeJS("Alert System\nStatus Reporting\nResponse Time\nError Rate")
                
                health_trigger >> health_check
                health_check >> health_alerts
        
        # Database
        database = SQL("PostgreSQL\nCompute Engine\n10.0.1.2:5432")
        
        # Connections
        users >> Edge(label="POST /insights\n{title, description, userId}") >> insights_trigger
        users >> Edge(label="GET /analytics\n?action=global-stats") >> analytics_trigger
        
        insights_categorize >> Edge(label="UPDATE todos SET\ncategory, priority") >> database
        insights_priority >> Edge(label="AI prediction results") >> database
        
        analytics_stats >> Edge(label="SELECT COUNT(*),\nAVG(completion_rate)") >> database
        analytics_trends >> Edge(label="GROUP BY date,\nuser activity") >> database
        analytics_reports >> Edge(label="Analytics queries\nJOIN operations") >> database
        
        # External services monitoring
        with Cluster("Monitored K8s Services"):
            auth_svc = Service("Auth Service\nNodePort :30081")
            todo_svc = Service("Todo Service\nNodePort :30082") 
            frontend_svc = Service("Frontend\nNodePort :30080")
        
        health_check >> Edge(label="GET /health\nTimeout: 5s\nStatus check") >> [auth_svc, todo_svc, frontend_svc]

def generate_function_specs_diagram():
    """Generate Cloud Functions specifications and costs"""
    
    with Diagram("Cloud Functions Technical Specifications", show=False, direction="TB", filename="cloud_functions_specs"):
        
        with Cluster("Function Specifications & Costs"):
            
            with Cluster("Todo Insights Function"):
                insights_specs = Functions("• Runtime: Node.js 18\n• Memory: 256MB\n• Timeout: 60s\n• Max Instances: 10\n• VPC Connector: Enabled\n• Service Account: insights-sa\n\nDependencies:\n• @google-cloud/language\n• @google-cloud/functions-framework\n• pg (PostgreSQL)\n\nCost: ~$1.20/month")
            
            with Cluster("Todo Analytics Function"):
                analytics_specs = Functions("• Runtime: Node.js 18\n• Memory: 256MB\n• Timeout: 60s\n• Max Instances: 10\n• Connection Pool: 10 max\n• Service Account: analytics-sa\n\nDependencies:\n• @google-cloud/functions-framework\n• pg (PostgreSQL)\n\nCost: ~$0.80/month")
            
            with Cluster("Health Monitor Function"):
                health_specs = Functions("• Runtime: Node.js 18\n• Memory: 256MB\n• Timeout: 30s\n• Max Instances: 5\n• Schedule: */5 * * * *\n• Public Access: Enabled\n\nDependencies:\n• @google-cloud/functions-framework\n• axios (HTTP client)\n\nCost: ~$0.23/month")
        
        with Cluster("Total Serverless Cost"):
            total_cost = GCS("Cloud Functions Total\n$2.23/month (1.5%)\n\n150MB average memory\n~2,000 invocations/month\n5s average execution time")
        
        [insights_specs, analytics_specs, health_specs] >> total_cost

if __name__ == "__main__":
    print("Generating serverless architecture diagrams...")
    
    # Generate updated main architecture with serverless details
    generate_updated_architecture_diagram()
    print("✅ Updated architecture diagram generated: todo_app_serverless_architecture.png")
    
    # Generate serverless functions detail diagram
    generate_serverless_details_diagram() 
    print("✅ Serverless functions detail diagram generated: serverless_functions_detail.png")
    
    # Generate function specifications diagram
    generate_function_specs_diagram()
    print("✅ Function specifications diagram generated: cloud_functions_specs.png")
    
    print("\n🎯 Serverless architecture diagrams generated successfully!")
    print("📁 Check the current directory for PNG files")
    print("\n📋 Generated diagrams:")
    print("   1. todo_app_serverless_architecture.png - Main architecture + serverless details")
    print("   2. serverless_functions_detail.png - Function workflow details") 
    print("   3. cloud_functions_specs.png - Technical specifications & costs") 