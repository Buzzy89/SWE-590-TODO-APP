import random
import json
import time
from locust import HttpUser, task, between, events
from locust.exception import StopUser

class TodoAppUser(HttpUser):
    """
    Simulates a real user interacting with the Todo application
    Tests the complete flow: Frontend -> Auth Service -> Todo Service
    """
    wait_time = between(1, 3)
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.auth_token = None
        self.user_id = None
        self.todos = []
        
        # Updated service URLs for current NodePort setup
        self.auth_url = self.environment.parsed_options.auth_url or "http://34.22.249.41:30081"
        self.todo_url = self.environment.parsed_options.todo_url or "http://34.22.249.41:30082"
        self.frontend_url = self.environment.parsed_options.frontend_url or "http://34.22.249.41:30080"
        self.insights_url = self.environment.parsed_options.insights_url or "https://todo-app-insights-dev-tbv5uyb5va-ew.a.run.app"
        
    def on_start(self):
        """Called when a user starts - simulates user registration/login"""
        self.register_and_login()
        
    def on_stop(self):
        """Called when a user stops - cleanup"""
        if self.auth_token:
            self.logout()
    
    def register_and_login(self):
        """Register a new user and login to get auth token"""
        # Generate unique user data with timestamp to avoid conflicts
        timestamp = int(time.time() * 1000)  # Use milliseconds for uniqueness
        user_id = random.randint(10000, 99999)
        self.username = f"testuser{timestamp}{user_id}"  # Alphanumeric only
        self.email = f"test{timestamp}{user_id}@example.com"
        self.password = "TestPassword123!"
        
        # First, check frontend health
        with self.client.get(f"{self.frontend_url}/health", 
                           catch_response=True, 
                           name="Frontend Health Check") as response:
            if response.status_code != 200:
                response.failure(f"Frontend health check failed: {response.status_code}")
        
        # Register user
        register_data = {
            "username": self.username,
            "email": self.email,
            "password": self.password,
            "firstName": "Test",
            "lastName": "User"
        }
        
        with self.client.post(f"{self.auth_url}/auth/register",
                            json=register_data,
                            catch_response=True,
                            name="User Registration") as response:
            if response.status_code == 201:
                try:
                    data = response.json()
                    if data.get('success'):
                        self.auth_token = data.get('data', {}).get('token')
                        self.user_id = data.get('data', {}).get('user', {}).get('id')
                        response.success()
                        return  # Successfully registered and got token
                except (ValueError, KeyError) as e:
                    response.failure(f"Invalid JSON response: {e}")
                    return
            elif response.status_code == 409:
                # User already exists, that's fine - continue to login
                response.success()
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('message', 'Unknown error')
                except:
                    error_msg = response.text
                response.failure(f"Registration failed: {response.status_code} - {error_msg}")
        
        # Login to get token (if not obtained from registration)
        if not self.auth_token:
            login_data = {
                "email": self.email,
                "password": self.password
            }
            
            with self.client.post(f"{self.auth_url}/auth/login",
                                json=login_data,
                                catch_response=True,
                                name="User Login") as response:
                if response.status_code == 200:
                    try:
                        data = response.json()
                        if data.get('success'):
                            self.auth_token = data.get('data', {}).get('token')
                            self.user_id = data.get('data', {}).get('user', {}).get('id')
                            response.success()
                        else:
                            response.failure(f"Login response not successful: {data}")
                    except (ValueError, KeyError) as e:
                        response.failure(f"Invalid JSON response: {e}")
                else:
                    try:
                        error_data = response.json()
                        error_msg = error_data.get('message', 'Unknown error')
                    except:
                        error_msg = response.text
                    response.failure(f"Login failed: {response.status_code} - {error_msg}")
                    raise StopUser()
        
        # Final check - ensure we have a token
        if not self.auth_token:
            print(f"Failed to get auth token for user {self.email}")
            raise StopUser()
    
    def get_auth_headers(self):
        """Get authorization headers for API calls"""
        if not self.auth_token:
            return {}
        return {"Authorization": f"Bearer {self.auth_token}"}
    
    @task(3)
    def view_frontend_dashboard(self):
        """Simulate viewing the frontend dashboard"""
        with self.client.get(f"{self.frontend_url}/",
                           catch_response=True,
                           name="View Dashboard") as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Dashboard load failed: {response.status_code}")
    
    @task(1)
    def check_auth_health(self):
        """Check auth service health"""
        with self.client.get(f"{self.auth_url}/health",
                           catch_response=True,
                           name="Auth Health Check") as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Auth health check failed: {response.status_code}")
    
    @task(1)
    def check_todo_health(self):
        """Check todo service health"""
        with self.client.get(f"{self.todo_url}/health",
                           catch_response=True,
                           name="Todo Health Check") as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Todo health check failed: {response.status_code}")
    
    @task(5)
    def create_todo(self):
        """Create a new todo item"""
        if not self.auth_token:
            return
            
        todo_data = {
            "title": f"Test Todo {random.randint(1, 1000)}",
            "description": "This is a test todo created by Locust load testing",
            "priority": random.choice(["low", "medium", "high"]),
            "category": random.choice(["work", "personal", "shopping", "health", "general"]),
            "dueDate": "2024-12-31"
        }
        
        with self.client.post(f"{self.todo_url}/todos",
                            json=todo_data,
                            headers=self.get_auth_headers(),
                            catch_response=True,
                            name="Create Todo") as response:
            if response.status_code == 201:
                data = response.json()
                if data.get('success') and data.get('data', {}).get('todo'):
                    todo_id = data['data']['todo']['id']
                    self.todos.append(todo_id)
                response.success()
            else:
                response.failure(f"Todo creation failed: {response.status_code}")
    
    @task(8)
    def get_todos(self):
        """Get user's todo list"""
        if not self.auth_token:
            return
            
        with self.client.get(f"{self.todo_url}/todos",
                           headers=self.get_auth_headers(),
                           catch_response=True,
                           name="Get Todos") as response:
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('data', {}).get('todos'):
                    todos = data['data']['todos']
                    # Update local todos list
                    self.todos = [todo['id'] for todo in todos]
                response.success()
            else:
                response.failure(f"Get todos failed: {response.status_code}")
    
    @task(3)
    def update_todo(self):
        """Update an existing todo"""
        if not self.auth_token or not self.todos:
            return
            
        todo_id = random.choice(self.todos)
        update_data = {
            "title": f"Updated Todo {random.randint(1, 1000)}",
            "description": "Updated by Locust test",
            "priority": random.choice(["low", "medium", "high"])
        }
        
        with self.client.put(f"{self.todo_url}/todos/{todo_id}",
                           json=update_data,
                           headers=self.get_auth_headers(),
                           catch_response=True,
                           name="Update Todo") as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Todo update failed: {response.status_code}")
    
    @task(2)
    def complete_todo(self):
        """Mark a todo as completed"""
        if not self.auth_token or not self.todos:
            return
            
        todo_id = random.choice(self.todos)
        
        with self.client.patch(f"{self.todo_url}/todos/{todo_id}/complete",
                             headers=self.get_auth_headers(),
                             catch_response=True,
                             name="Complete Todo") as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Todo completion failed: {response.status_code}")
    
    @task(1)
    def get_todo_stats(self):
        """Get todo statistics"""
        if not self.auth_token:
            return
            
        with self.client.get(f"{self.todo_url}/todos/stats/summary",
                           headers=self.get_auth_headers(),
                           catch_response=True,
                           name="Get Todo Stats") as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Get stats failed: {response.status_code}")
    
    @task(2)
    def test_ai_insights(self):
        """Test AI insights functionality"""
        if not self.auth_token:
            return
            
        insights_data = {
            "title": f"AI Test Task {random.randint(1, 1000)}",
            "description": "Testing AI categorization and priority prediction",
            "userId": self.user_id
        }
        
        with self.client.post(self.insights_url,
                            json=insights_data,
                            catch_response=True,
                            name="AI Insights") as response:
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    response.success()
                else:
                    response.failure("AI insights returned unsuccessful response")
            else:
                response.failure(f"AI insights failed: {response.status_code}")
    
    @task(1)
    def delete_todo(self):
        """Delete a todo item"""
        if not self.auth_token or not self.todos:
            return
            
        todo_id = random.choice(self.todos)
        
        with self.client.delete(f"{self.todo_url}/todos/{todo_id}",
                              headers=self.get_auth_headers(),
                              catch_response=True,
                              name="Delete Todo") as response:
            if response.status_code == 200:
                # Remove from local list
                if todo_id in self.todos:
                    self.todos.remove(todo_id)
                response.success()
            else:
                response.failure(f"Todo deletion failed: {response.status_code}")
    
    @task(1)
    def verify_token(self):
        """Verify auth token is still valid"""
        if not self.auth_token:
            return
            
        verify_data = {"token": self.auth_token}
        
        with self.client.post(f"{self.auth_url}/auth/verify",
                            json=verify_data,
                            catch_response=True,
                            name="Verify Token") as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Token verification failed: {response.status_code}")
    
    def logout(self):
        """Logout user"""
        if not self.auth_token:
            return
            
        with self.client.post(f"{self.auth_url}/auth/logout",
                            headers=self.get_auth_headers(),
                            catch_response=True,
                            name="User Logout") as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Logout failed: {response.status_code}")


class CPUIntensiveUser(HttpUser):
    """
    Specialized user class for generating CPU load to test HPA scaling
    """
    wait_time = between(0.1, 0.5)  # Much faster requests
    weight = 2  # Higher weight for more instances
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.auth_token = None
        self.auth_url = "http://34.22.249.41:30081"
        self.todo_url = "http://34.22.249.41:30082"
        
    def on_start(self):
        """Quick login for load testing"""
        self.quick_login()
        
    def quick_login(self):
        """Quick login with existing test user"""
        # Create a unique test user for load testing
        timestamp = int(time.time() * 1000)
        user_id = random.randint(1000, 9999)
        
        login_data = {
            "email": f"loadtest{timestamp}{user_id}@example.com",
            "password": "TestPassword123!"
        }
        
        # Try to register first (in case user doesn't exist)
        register_data = {
            "username": f"loadtester{timestamp}{user_id}",  # Alphanumeric only
            "email": login_data["email"], 
            "password": login_data["password"],
            "firstName": "Load",
            "lastName": "Tester"
        }
        
        # Register user (ignore conflicts)
        with self.client.post(f"{self.auth_url}/auth/register", json=register_data, catch_response=True) as response:
            if response.status_code in [201, 409]:  # 201 = created, 409 = already exists
                response.success()
            else:
                response.failure(f"Registration failed: {response.status_code}")
        
        # Login to get token
        with self.client.post(f"{self.auth_url}/auth/login", json=login_data, catch_response=True) as response:
            if response.status_code == 200:
                try:
                    data = response.json()
                    if data.get('success'):
                        self.auth_token = data.get('data', {}).get('token')
                        response.success()
                    else:
                        response.failure(f"Login not successful: {data}")
                except (ValueError, KeyError):
                    response.failure("Invalid JSON response")
            else:
                response.failure(f"Login failed: {response.status_code}")
    
    def get_auth_headers(self):
        if not self.auth_token:
            return {}
        return {"Authorization": f"Bearer {self.auth_token}"}
    
    @task(10)
    def stress_auth_service(self):
        """Generate load on auth service"""
        with self.client.get(f"{self.auth_url}/health", name="Auth Load Test"):
            pass
    
    @task(10) 
    def stress_todo_service(self):
        """Generate load on todo service"""
        with self.client.get(f"{self.todo_url}/health", name="Todo Load Test"):
            pass
    
    @task(5)
    def stress_create_todos(self):
        """Create todos rapidly to generate CPU load"""
        if not self.auth_token:
            return
            
        todo_data = {
            "title": f"Load Test {random.randint(1, 10000)}",
            "description": f"Generated at {time.time()}",
            "priority": "medium",
            "category": "general"
        }
        
        with self.client.post(f"{self.todo_url}/todos",
                            json=todo_data,
                            headers=self.get_auth_headers(),
                            name="Stress Create Todo"):
            pass
    
    @task(8)
    def stress_get_todos(self):
        """Rapidly fetch todos to generate load"""
        if not self.auth_token:
            return
            
        with self.client.get(f"{self.todo_url}/todos",
                           headers=self.get_auth_headers(),
                           name="Stress Get Todos"):
            pass


@events.init_command_line_parser.add_listener
def _(parser):
    parser.add_argument("--auth-url", type=str, default="http://34.22.249.41:30081", help="Auth service URL")
    parser.add_argument("--todo-url", type=str, default="http://34.22.249.41:30082", help="Todo service URL") 
    parser.add_argument("--frontend-url", type=str, default="http://34.22.249.41:30080", help="Frontend URL")
    parser.add_argument("--insights-url", type=str, default="https://todo-app-insights-dev-tbv5uyb5va-ew.a.run.app", help="AI Insights URL")

@events.request.add_listener
def _(request_type, name, response_time, response_length, response, context, exception, **kwargs):
    if exception:
        print(f"Request failed: {name} - {exception}")

@events.test_start.add_listener
def _(environment, **kwargs):
    print(f"Load test starting against:")
    print(f"  Auth Service: {environment.parsed_options.auth_url}")
    print(f"  Todo Service: {environment.parsed_options.todo_url}")
    print(f"  Frontend: {environment.parsed_options.frontend_url}")
    print(f"  AI Insights: {environment.parsed_options.insights_url}")
    print(f"  Users: {environment.parsed_options.num_users}")
    print(f"  Spawn Rate: {environment.parsed_options.spawn_rate}")

@events.test_stop.add_listener
def _(environment, **kwargs):
    print("Load test completed!")
    print("Check HPA status with: kubectl get hpa -n todo-app") 