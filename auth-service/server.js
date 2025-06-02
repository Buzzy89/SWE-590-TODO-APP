const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
// const rateLimit = require('express-rate-limit'); // Disabled for load testing
const Joi = require('joi');
const { Op } = require('sequelize');
require('dotenv').config();

const { initDatabase } = require('./config/database');
const User = require('./models/User');
const { generateToken, verifyToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Circuit breaker implementation for database operations
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureThreshold = threshold;
    this.timeout = timeout;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }

  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
}

const dbCircuitBreaker = new CircuitBreaker(5, 30000);

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

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs for auth endpoints
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  }
});

app.use(limiter);
*/

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Validation schemas with caching
const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(128).required(),
  firstName: Joi.string().min(1).max(50).optional(),
  lastName: Joi.string().min(1).max(50).optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// Health check with database status
app.get('/health', async (req, res) => {
  const healthCheck = {
    success: true,
    message: 'Auth Service is running',
    timestamp: new Date().toISOString(),
    service: 'auth-service',
    version: '1.0.0',
    database: 'unknown'
  };

  try {
    // Quick DB health check without circuit breaker
    const result = await User.sequelize.query('SELECT 1', { timeout: 5000 });
    healthCheck.database = 'connected';
  } catch (error) {
    healthCheck.database = 'disconnected';
    healthCheck.dbError = error.message;
  }

  res.json(healthCheck);
});

// Optimized Register endpoint
app.post('/auth/register', /* authLimiter, */ async (req, res) => {
  try {
    // Fast validation
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }

    const { username, email, password, firstName, lastName } = value;

    // Use circuit breaker for database operations
    const result = await dbCircuitBreaker.execute(async () => {
      // Check if user already exists with optimized query
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [
            { email: email.toLowerCase() },
            { username }
          ]
        },
        attributes: ['id', 'email', 'username'], // Only fetch needed fields
        raw: true // Get plain object instead of model instance
      });

      if (existingUser) {
        const field = existingUser.email === email.toLowerCase() ? 'email' : 'username';
        return { error: `User with this ${field} already exists`, status: 409 };
      }

      // Create new user
      const user = await User.create({
        username,
        email: email.toLowerCase(),
        password,
        firstName,
        lastName
      });

      return { user };
    });

    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error
      });
    }

    // Generate token
    const token = generateToken({
      userId: result.user.id,
      email: result.user.email,
      username: result.user.username
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: result.user.toJSON(),
        token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.message === 'Circuit breaker is OPEN') {
      return res.status(503).json({
        success: false,
        message: 'Service temporarily unavailable, please try again later'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error during registration'
    });
  }
});

// Optimized Login endpoint
app.post('/auth/login', /* authLimiter, */ async (req, res) => {
  try {
    // Fast validation
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }

    const { email, password } = value;

    // Use circuit breaker for database operations
    const result = await dbCircuitBreaker.execute(async () => {
      // Find user with optimized query
      const user = await User.findOne({
        where: { 
          email: email.toLowerCase(),
          isActive: true 
        },
        attributes: ['id', 'username', 'email', 'password', 'firstName', 'lastName', 'loginAttempts', 'lockedUntil']
      });

      if (!user) {
        return { error: 'Invalid credentials', status: 401 };
      }

      // Check if account is locked
      if (user.isLocked()) {
        return { error: 'Account temporarily locked due to failed login attempts', status: 423 };
      }

      // Check password
      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        // Increment login attempts in background (don't await)
        user.incrementLoginAttempts().catch(err => console.error('Failed to increment login attempts:', err));
        return { error: 'Invalid credentials', status: 401 };
      }

      return { user };
    });

    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error
      });
    }

    // Update last login in background for better performance
    result.user.updateLastLogin().catch(err => 
      console.error('Failed to update last login:', err)
    );

    // Generate token
    const token = generateToken({
      userId: result.user.id,
      email: result.user.email,
      username: result.user.username
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: result.user.toJSON(),
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    
    if (error.message === 'Circuit breaker is OPEN') {
      return res.status(503).json({
        success: false,
        message: 'Service temporarily unavailable, please try again later'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error during login'
    });
  }
});

// Get current user
app.get('/auth/me', verifyToken, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user.toJSON()
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Verify token endpoint
app.post('/auth/verify', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }

    // Set token in request headers for middleware
    req.headers.authorization = `Bearer ${token}`;
    
    // Use middleware to verify
    verifyToken(req, res, () => {
      res.json({
        success: true,
        message: 'Token is valid',
        data: {
          user: req.user.toJSON()
        }
      });
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during token verification'
    });
  }
});

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

// Start server with better error handling
const startServer = async () => {
  try {
    // Try to initialize database, but don't fail if it's not available
    try {
      await initDatabase();
      console.log('✅ Database connected successfully');
    } catch (dbError) {
      console.warn('⚠️  Database connection failed, continuing without database:', dbError.message);
    }
    
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Auth Service is running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`💾 DB Pool: max=${process.env.DB_POOL_MAX || 50}, min=${process.env.DB_POOL_MIN || 5}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app; 