const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 50],
      isAlphanumeric: true
    }
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      len: [6, 128]
    }
  },
  firstName: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  lastName: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  emailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  loginAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lockedUntil: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'users',
  timestamps: true,
  paranoid: true, // soft delete
  indexes: [
    // Add database indexes for better query performance
    {
      unique: true,
      fields: ['email']
    },
    {
      unique: true,
      fields: ['username']
    },
    {
      fields: ['isActive']
    },
    {
      fields: ['emailVerified']
    },
    {
      fields: ['lastLoginAt']
    }
  ],
  hooks: {
    // Hash password before saving - reduced salt rounds from 12 to 10 for better performance
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10); // Reduced from 12 to 10
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10); // Reduced from 12 to 10
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

// Instance methods
User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Optimized login tracking - batch update with less frequent saves
User.prototype.updateLastLogin = async function() {
  // Use raw update for better performance, avoid triggering hooks
  await User.update(
    {
      lastLoginAt: new Date(),
      loginAttempts: 0,
      lockedUntil: null
    },
    {
      where: { id: this.id },
      silent: true // Don't trigger hooks
    }
  );
  
  // Update instance data without save
  this.lastLoginAt = new Date();
  this.loginAttempts = 0;
  this.lockedUntil = null;
};

User.prototype.incrementLoginAttempts = async function() {
  const newAttempts = this.loginAttempts + 1;
  const lockUntil = newAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
  
  // Use raw update for better performance
  await User.update(
    {
      loginAttempts: newAttempts,
      lockedUntil: lockUntil
    },
    {
      where: { id: this.id },
      silent: true
    }
  );
  
  // Update instance data
  this.loginAttempts = newAttempts;
  this.lockedUntil = lockUntil;
};

User.prototype.isLocked = function() {
  return this.lockedUntil && this.lockedUntil > new Date();
};

User.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.password;
  delete values.deletedAt;
  return values;
};

// Optimized class methods with better query patterns
User.findByEmail = async function(email) {
  return await this.findOne({
    where: { 
      email: email.toLowerCase(),
      isActive: true // Add isActive check to reduce query scope
    },
    attributes: { exclude: ['deletedAt'] } // Exclude unnecessary fields
  });
};

User.findByUsername = async function(username) {
  return await this.findOne({
    where: { 
      username,
      isActive: true 
    },
    attributes: { exclude: ['deletedAt'] }
  });
};

// Associations (if needed later)
User.associate = function(models) {
  // Define associations here
  // User.hasMany(models.Todo, { foreignKey: 'userId' });
};

module.exports = User; 