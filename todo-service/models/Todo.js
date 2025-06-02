const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Todo = sequelize.define('Todo', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      len: [1, 255],
      notEmpty: true
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: ''
  },
  completed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    defaultValue: 'medium',
    allowNull: false
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  category: {
    type: DataTypes.STRING(100),
    defaultValue: 'general',
    allowNull: false
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING(50)),
    defaultValue: [],
    allowNull: false
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  position: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'For ordering todos within a category/priority'
  }
}, {
  tableName: 'todos',
  timestamps: true,
  paranoid: true, // soft delete
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['user_id', 'completed']
    },
    {
      fields: ['user_id', 'category']
    },
    {
      fields: ['user_id', 'priority']
    },
    {
      fields: ['due_date']
    },
    {
      fields: ['user_id', 'due_date']
    }
  ]
});

// Instance methods
Todo.prototype.markComplete = async function() {
  this.completed = true;
  this.completedAt = new Date();
  await this.save();
  return this;
};

Todo.prototype.markIncomplete = async function() {
  this.completed = false;
  this.completedAt = null;
  await this.save();
  return this;
};

Todo.prototype.isOverdue = function() {
  if (!this.dueDate || this.completed) {
    return false;
  }
  return new Date() > new Date(this.dueDate);
};

Todo.prototype.getDaysUntilDue = function() {
  if (!this.dueDate) {
    return null;
  }
  const today = new Date();
  const due = new Date(this.dueDate);
  const diffTime = due - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

Todo.prototype.addTag = async function(tag) {
  if (!this.tags.includes(tag)) {
    this.tags = [...this.tags, tag];
    await this.save();
  }
  return this;
};

Todo.prototype.removeTag = async function(tag) {
  this.tags = this.tags.filter(t => t !== tag);
  await this.save();
  return this;
};

// Class methods
Todo.findByUser = async function(userId, options = {}) {
  return await this.findAll({
    where: { userId },
    ...options
  });
};

Todo.findCompleted = async function(userId, options = {}) {
  return await this.findAll({
    where: { 
      userId, 
      completed: true 
    },
    ...options
  });
};

Todo.findPending = async function(userId, options = {}) {
  return await this.findAll({
    where: { 
      userId, 
      completed: false 
    },
    ...options
  });
};

Todo.findOverdue = async function(userId, options = {}) {
  return await this.findAll({
    where: {
      userId,
      completed: false,
      dueDate: {
        [sequelize.Op.lt]: new Date()
      }
    },
    ...options
  });
};

Todo.findByCategory = async function(userId, category, options = {}) {
  return await this.findAll({
    where: { 
      userId, 
      category 
    },
    ...options
  });
};

Todo.findByPriority = async function(userId, priority, options = {}) {
  return await this.findAll({
    where: { 
      userId, 
      priority 
    },
    ...options
  });
};

Todo.findByTag = async function(userId, tag, options = {}) {
  return await this.findAll({
    where: {
      userId,
      tags: {
        [sequelize.Op.contains]: [tag]
      }
    },
    ...options
  });
};

Todo.getStats = async function(userId) {
  const total = await this.count({ where: { userId } });
  const completed = await this.count({ 
    where: { userId, completed: true } 
  });
  const pending = await this.count({ 
    where: { userId, completed: false } 
  });
  
  const overdue = await this.count({
    where: {
      userId,
      completed: false,
      dueDate: {
        [sequelize.Op.lt]: new Date()
      }
    }
  });

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    completed,
    pending,
    overdue,
    completionRate
  };
};

// Associations (if needed later)
Todo.associate = function(models) {
  // Define associations here
  // Todo.belongsTo(models.User, { foreignKey: 'userId' });
};

module.exports = Todo; 