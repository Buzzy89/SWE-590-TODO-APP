const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Simple in-memory cache for user data to reduce DB queries
class UserCache {
  constructor(ttl = 5 * 60 * 1000) { // 5 minutes TTL
    this.cache = new Map();
    this.ttl = ttl;
  }

  set(userId, userData) {
    this.cache.set(userId, {
      data: userData,
      timestamp: Date.now()
    });
  }

  get(userId) {
    const entry = this.cache.get(userId);
    if (!entry) return null;

    // Check if entry is expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(userId);
      return null;
    }

    return entry.data;
  }

  delete(userId) {
    this.cache.delete(userId);
  }

  clear() {
    this.cache.clear();
  }

  // Clean expired entries periodically
  cleanup() {
    const now = Date.now();
    for (const [userId, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(userId);
      }
    }
  }
}

const userCache = new UserCache();

// Cleanup expired cache entries every 5 minutes
setInterval(() => {
  userCache.cleanup();
}, 5 * 60 * 1000);

// Generate JWT token with optimized payload
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'todo-app-auth-service',
    audience: 'todo-app-users'
  });
};

// Optimized user fetch with caching
const getCachedUser = async (userId) => {
  // Try cache first
  let user = userCache.get(userId);
  if (user) {
    return user;
  }

  // Fetch from database with optimized query
  user = await User.findOne({
    where: { 
      id: userId, 
      isActive: true 
    },
    attributes: ['id', 'username', 'email', 'firstName', 'lastName', 'isActive', 'loginAttempts', 'lockedUntil'],
    raw: false // We need the instance for methods
  });

  if (user) {
    // Cache the user data
    userCache.set(userId, user);
  }

  return user;
};

// Verify JWT token middleware with caching
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Extract token from Bearer header
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid token format.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'todo-app-auth-service',
      audience: 'todo-app-users'
    });

    // Get user from cache or database
    const user = await getCachedUser(decoded.userId);

    if (!user || !user.isActive) {
      // Remove from cache if user is not found or inactive
      userCache.delete(decoded.userId);
      return res.status(401).json({
        success: false,
        message: 'Access denied. User not found or inactive.'
      });
    }

    // Check if account is locked
    if (user.isLocked && user.isLocked()) {
      // Remove from cache if user is locked
      userCache.delete(decoded.userId);
      return res.status(401).json({
        success: false,
        message: 'Account is temporarily locked due to multiple failed login attempts.'
      });
    }

    // Attach user to request object
    req.user = user;
    req.token = token;
    
    next();

  } catch (error) {
    console.error('Token verification error:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid token.'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Token has expired.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error during token verification.'
    });
  }
};

// Optional authentication middleware (doesn't fail if no token) with caching
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next();
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'todo-app-auth-service',
      audience: 'todo-app-users'
    });

    const user = await getCachedUser(decoded.userId);

    if (user && user.isActive && (!user.isLocked || !user.isLocked())) {
      req.user = user;
      req.token = token;
    }

    next();

  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

// Admin role check middleware
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Authentication required.'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }

  next();
};

// Check if user owns resource with type coercion
const checkOwnership = (resourceUserIdField = 'userId') => {
  return (req, res, next) => {
    const resourceUserId = req.params[resourceUserIdField] || 
                          req.body[resourceUserIdField] || 
                          req.query[resourceUserIdField];

    // Convert to number for comparison to handle string/number mismatches
    const userIdNum = parseInt(req.user.id);
    const resourceUserIdNum = parseInt(resourceUserId);

    if (userIdNum !== resourceUserIdNum) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own resources.'
      });
    }

    next();
  };
};

// Clear user from cache (useful when user data changes)
const clearUserCache = (userId) => {
  userCache.delete(userId);
};

module.exports = {
  generateToken,
  verifyToken,
  optionalAuth,
  requireAdmin,
  checkOwnership,
  clearUserCache
}; 