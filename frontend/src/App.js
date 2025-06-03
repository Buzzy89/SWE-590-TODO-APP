import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// API base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://34.22.249.41:30081';
const AUTH_API_URL = process.env.REACT_APP_AUTH_URL || 'http://34.22.249.41:30081';
const TODO_API_URL = process.env.REACT_APP_TODO_URL || 'http://34.22.249.41:30082';
const TODO_INSIGHTS_URL = process.env.REACT_APP_TODO_INSIGHTS_URL || 'https://todo-app-insights-dev-tbv5uyb5va-ew.a.run.app';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [todos, setTodos] = useState([]);
  const [stats, setStats] = useState({});
  const [currentView, setCurrentView] = useState('login');
  const [newTodo, setNewTodo] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    category: 'general'
  });

  // Check if user is logged in on component mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      verifyToken(token);
    } else {
      setLoading(false);
    }
  }, []);

  // Load todos when user logs in
  useEffect(() => {
    if (user) {
      loadTodos();
      loadStats();
    }
  }, [user]);

  const verifyToken = async (token) => {
    try {
      const response = await axios.post(`${AUTH_API_URL}/auth/verify`, { token });
      if (response.data.success) {
        setUser(response.data.data.user);
        setCurrentView('dashboard');
        // Set default authorization header
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } else {
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (email, password) => {
    try {
      const response = await axios.post(`${AUTH_API_URL}/auth/login`, {
        email,
        password
      });
      
      if (response.data.success) {
        const { user, token } = response.data.data;
        localStorage.setItem('token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(user);
        setCurrentView('dashboard');
        return { success: true };
      }
    } catch (error) {
      console.error('Login failed:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const handleRegister = async (userData) => {
    try {
      const response = await axios.post(`${AUTH_API_URL}/auth/register`, userData);
      
      if (response.data.success) {
        const { user, token } = response.data.data;
        localStorage.setItem('token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(user);
        setCurrentView('dashboard');
        return { success: true };
      }
    } catch (error) {
      console.error('Registration failed:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Registration failed' 
      };
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setTodos([]);
    setStats({});
    setCurrentView('login');
  };

  const loadTodos = async () => {
    try {
      const response = await axios.get(`${TODO_API_URL}/todos`);
      if (response.data.success) {
        setTodos(response.data.data.todos);
      }
    } catch (error) {
      console.error('Failed to load todos:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await axios.get(`${TODO_API_URL}/todos/stats/summary`);
      if (response.data.success) {
        setStats(response.data.data.stats);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const getTodoInsights = async (title, description) => {
    try {
      const response = await axios.post(TODO_INSIGHTS_URL, {
        title,
        description,
        userId: user.id
      });
      
      if (response.data.success) {
        return response.data.data.insights;
      }
    } catch (error) {
      console.error('Failed to get todo insights:', error);
      return null;
    }
  };

  const handleCreateTodo = async (e) => {
    e.preventDefault();
    try {
      // Get AI insights first
      const insights = await getTodoInsights(newTodo.title, newTodo.description);
      
      // Use AI suggestions if available, otherwise use user input
      const todoData = {
        ...newTodo,
        category: insights?.category || newTodo.category,
        priority: insights?.priority || newTodo.priority
      };

      const response = await axios.post(`${TODO_API_URL}/todos`, todoData);
      if (response.data.success) {
        setNewTodo({
          title: '',
          description: '',
          priority: 'medium',
          dueDate: '',
          category: 'general'
        });
        loadTodos();
        loadStats();
      }
    } catch (error) {
      console.error('Failed to create todo:', error);
    }
  };

  const toggleTodo = async (todoId, completed) => {
    try {
      const endpoint = completed ? 'complete' : 'incomplete';
      const response = await axios.patch(`${TODO_API_URL}/todos/${todoId}/${endpoint}`);
      if (response.data.success) {
        loadTodos();
        loadStats();
      }
    } catch (error) {
      console.error('Failed to toggle todo:', error);
    }
  };

  const deleteTodo = async (todoId) => {
    try {
      const response = await axios.delete(`${TODO_API_URL}/todos/${todoId}`);
      if (response.data.success) {
        loadTodos();
        loadStats();
      }
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        Loading...
      </div>
    );
  }

  return (
    <div className="App">
      {currentView === 'login' && <LoginForm onLogin={handleLogin} onSwitchToRegister={() => setCurrentView('register')} />}
      {currentView === 'register' && <RegisterForm onRegister={handleRegister} onSwitchToLogin={() => setCurrentView('login')} />}
      {currentView === 'dashboard' && (
        <Dashboard 
          user={user}
          todos={todos}
          stats={stats}
          newTodo={newTodo}
          setNewTodo={setNewTodo}
          onCreateTodo={handleCreateTodo}
          onToggleTodo={toggleTodo}
          onDeleteTodo={deleteTodo}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

// Login Form Component
const LoginForm = ({ onLogin, onSwitchToRegister }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const result = await onLogin(formData.email, formData.password);
    if (!result.success) {
      setError(result.message);
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Welcome Back</h2>
        <p className="auth-subtitle">Sign in to your account</p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button type="submit" className="btn btn-primary btn-lg w-100" disabled={loading}>
            {loading && <div className="spinner"></div>}
            Sign In
          </button>
        </form>
        
        <p className="auth-switch">
          Don't have an account?{' '}
          <button type="button" className="link-button" onClick={onSwitchToRegister}>
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
};

// Register Form Component
const RegisterForm = ({ onRegister, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const result = await onRegister(formData);
    if (!result.success) {
      setError(result.message);
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Create Account</h2>
        <p className="auth-subtitle">Sign up for a new account</p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input
                type="text"
                className="form-control"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input
                type="text"
                className="form-control"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-control"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={6}
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button type="submit" className="btn btn-primary btn-lg w-100" disabled={loading}>
            {loading && <div className="spinner"></div>}
            Sign Up
          </button>
        </form>
        
        <p className="auth-switch">
          Already have an account?{' '}
          <button type="button" className="link-button" onClick={onSwitchToLogin}>
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
};

// Dashboard Component
const Dashboard = ({ user, todos, stats, newTodo, setNewTodo, onCreateTodo, onToggleTodo, onDeleteTodo, onLogout }) => {
  const [aiSuggestions, setAiSuggestions] = React.useState(null);
  const [showSuggestions, setShowSuggestions] = React.useState(false);

  // Get AI suggestions when title or description changes
  React.useEffect(() => {
    const getSuggestions = async () => {
      if (newTodo.title.length > 5) {
        try {
          const response = await axios.post(TODO_INSIGHTS_URL, {
            title: newTodo.title,
            description: newTodo.description,
            userId: user.id
          });
          
          if (response.data.success) {
            setAiSuggestions(response.data.data.insights);
            setShowSuggestions(true);
          }
        } catch (error) {
          console.error('Failed to get suggestions:', error);
          setShowSuggestions(false);
        }
      } else {
        setShowSuggestions(false);
      }
    };

    const debounceTimer = setTimeout(getSuggestions, 1000);
    return () => clearTimeout(debounceTimer);
  }, [newTodo.title, newTodo.description, user.id]);

  const applySuggestion = (field, value) => {
    setNewTodo({ ...newTodo, [field]: value });
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Todo Dashboard</h1>
          <div className="user-info">
            <span>Welcome, {user.firstName || user.username}!</span>
            <button className="btn btn-secondary btn-sm" onClick={onLogout}>
              <i className="fas fa-sign-out-alt"></i>
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.total || 0}</div>
            <div className="stat-label">Total Tasks</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.completed || 0}</div>
            <div className="stat-label">Completed</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.pending || 0}</div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.completionRate || 0}%</div>
            <div className="stat-label">Completion Rate</div>
          </div>
        </div>

        <div className="dashboard-main">
          <div className="todo-form-section">
            <div className="card">
              <div className="card-header">
                <i className="fas fa-plus"></i>
                Add New Task
                {aiSuggestions && showSuggestions && (
                  <div className="ai-badge">
                    <i className="fas fa-brain"></i>
                    AI Powered
                  </div>
                )}
              </div>
              <div className="card-body">
                <form onSubmit={onCreateTodo}>
                  <div className="form-group">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Task title..."
                      value={newTodo.title}
                      onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <textarea
                      className="form-control"
                      placeholder="Description (optional)..."
                      value={newTodo.description}
                      onChange={(e) => setNewTodo({ ...newTodo, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  
                  {/* AI Suggestions Panel */}
                  {aiSuggestions && showSuggestions && (
                    <div className="ai-suggestions">
                      <div className="suggestions-header">
                        <i className="fas fa-lightbulb"></i>
                        Smart Suggestions (Confidence: {Math.round(aiSuggestions.confidence * 100)}%)
                      </div>
                      <div className="suggestions-content">
                        <div className="suggestion-item">
                          <span className="suggestion-label">Category:</span>
                          <button 
                            type="button"
                            className={`suggestion-btn ${newTodo.category === aiSuggestions.category ? 'applied' : ''}`}
                            onClick={() => applySuggestion('category', aiSuggestions.category)}
                          >
                            {aiSuggestions.category}
                            {newTodo.category !== aiSuggestions.category && (
                              <i className="fas fa-arrow-right"></i>
                            )}
                          </button>
                        </div>
                        <div className="suggestion-item">
                          <span className="suggestion-label">Priority:</span>
                          <button 
                            type="button"
                            className={`suggestion-btn priority-${aiSuggestions.priority} ${newTodo.priority === aiSuggestions.priority ? 'applied' : ''}`}
                            onClick={() => applySuggestion('priority', aiSuggestions.priority)}
                          >
                            {aiSuggestions.priority}
                            {newTodo.priority !== aiSuggestions.priority && (
                              <i className="fas fa-arrow-right"></i>
                            )}
                          </button>
                        </div>
                        {aiSuggestions.keywords && aiSuggestions.keywords.length > 0 && (
                          <div className="suggestion-keywords">
                            <span className="suggestion-label">Keywords:</span>
                            {aiSuggestions.keywords.map((keyword, index) => (
                              <span key={index} className="keyword-tag">{keyword}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="form-row">
                    <div className="form-group">
                      <select
                        className="form-control"
                        value={newTodo.priority}
                        onChange={(e) => setNewTodo({ ...newTodo, priority: e.target.value })}
                      >
                        <option value="low">Low Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="high">High Priority</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <select
                        className="form-control"
                        value={newTodo.category}
                        onChange={(e) => setNewTodo({ ...newTodo, category: e.target.value })}
                      >
                        <option value="general">General</option>
                        <option value="work">Work</option>
                        <option value="personal">Personal</option>
                        <option value="health">Health</option>
                        <option value="shopping">Shopping</option>
                        <option value="finance">Finance</option>
                        <option value="education">Education</option>
                        <option value="travel">Travel</option>
                        <option value="maintenance">Maintenance</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <input
                      type="date"
                      className="form-control"
                      value={newTodo.dueDate}
                      onChange={(e) => setNewTodo({ ...newTodo, dueDate: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">
                    <i className="fas fa-plus"></i>
                    Add Task
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div className="todos-section">
            <div className="card">
              <div className="card-header">
                <i className="fas fa-tasks"></i>
                Your Tasks ({todos.length})
              </div>
              <div className="card-body">
                {todos.length === 0 ? (
                  <div className="empty-state">
                    <i className="fas fa-clipboard-list"></i>
                    <p>No tasks yet. Create your first task above!</p>
                  </div>
                ) : (
                  <div className="todos-list">
                    {todos.map(todo => (
                      <div key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
                        <div className="todo-content">
                          <div className="todo-main">
                            <h3 className="todo-title">{todo.title}</h3>
                            {todo.description && <p className="todo-description">{todo.description}</p>}
                          </div>
                          <div className="todo-meta">
                            <span className={`priority-badge priority-${todo.priority}`}>
                              {todo.priority}
                            </span>
                            {todo.dueDate && (
                              <span className="due-date">
                                <i className="fas fa-calendar"></i>
                                {new Date(todo.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="todo-actions">
                          <button
                            className={`btn btn-sm ${todo.completed ? 'btn-secondary' : 'btn-success'}`}
                            onClick={() => onToggleTodo(todo.id, !todo.completed)}
                          >
                            <i className={`fas ${todo.completed ? 'fa-undo' : 'fa-check'}`}></i>
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => onDeleteTodo(todo.id)}
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App; 