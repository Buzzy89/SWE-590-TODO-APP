const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
// const rateLimit = require('express-rate-limit'); // Disabled for load testing
require('dotenv').config();

const { initDatabase } = require('./config/database');
const Todo = require('./models/Todo');
const todoRoutes = require('./routes/todos');

const app = express();
const PORT = process.env.PORT || 3002;

// Security middleware
app.use(helmet());

// CORS middleware  
app.use(cors({
  origin: ['http://localhost:3000', 'http://34.22.249.41:30080', 'https://todo-app-insights-dev-tbv5uyb5va-ew.a.run.app'],
  credentials: true
}));

// Rate limiting - DISABLED for load testing
/*
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});

app.use(limiter);
*/

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Mock auth middleware for now (since we don't have real auth integration yet)
const mockAuth = (req, res, next) => {
  // In production, this would verify JWT token from auth service
  req.user = {
    id: 1,
    email: 'test@example.com',
    username: 'testuser'
  };
  next();
};

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Todo Service is running',
    timestamp: new Date().toISOString(),
    service: 'todo-service',
    version: '1.0.0'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Todo Service API',
    endpoints: [
      'GET /health - Health check',
      'GET /todos - Get all todos',
      'POST /todos - Create new todo',
      'GET /todos/:id - Get specific todo',
      'PUT /todos/:id - Update todo',
      'DELETE /todos/:id - Delete todo',
      'PATCH /todos/:id/complete - Mark todo as complete',
      'PATCH /todos/:id/incomplete - Mark todo as incomplete',
      'GET /todos/stats/summary - Get todo statistics'
    ]
  });
});

// Apply mock auth to all todo routes
app.use('/todos', mockAuth, todoRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Start server
const startServer = async () => {
  try {
    // Try to initialize database, but don't fail if it's not available
    try {
      await initDatabase();
      console.log('✅ Database connected successfully');
    } catch (dbError) {
      console.warn('⚠️  Database connection failed, continuing without database:', dbError.message);
    }
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Todo Service is running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app; 