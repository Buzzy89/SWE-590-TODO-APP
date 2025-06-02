const express = require('express');
const Joi = require('joi');
const { Op } = require('sequelize');
const Todo = require('../models/Todo');

const router = express.Router();

// Validation schemas
const createTodoSchema = Joi.object({
  title: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(1000).optional().allow(''),
  priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
  dueDate: Joi.date().optional(),
  category: Joi.string().max(100).optional().default('general'),
  tags: Joi.array().items(Joi.string().max(50)).optional()
});

const updateTodoSchema = Joi.object({
  title: Joi.string().min(1).max(255).optional(),
  description: Joi.string().max(1000).optional().allow(''),
  priority: Joi.string().valid('low', 'medium', 'high').optional(),
  dueDate: Joi.date().optional().allow(null),
  category: Joi.string().max(100).optional(),
  tags: Joi.array().items(Joi.string().max(50)).optional(),
  completed: Joi.boolean().optional()
});

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'dueDate', 'priority', 'title').default('createdAt'),
  sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC'),
  category: Joi.string().optional(),
  priority: Joi.string().valid('low', 'medium', 'high').optional(),
  completed: Joi.boolean().optional(),
  search: Joi.string().optional(),
  tags: Joi.string().optional() // comma-separated tags
});

// Get all todos for user
router.get('/', async (req, res) => {
  try {
    const { error, value } = querySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        details: error.details.map(detail => detail.message)
      });
    }

    const { page, limit, sortBy, sortOrder, category, priority, completed, search, tags } = value;
    const offset = (page - 1) * limit;

    // Build where clause
    const where = { userId: req.user.id };

    if (category) {
      where.category = category;
    }

    if (priority) {
      where.priority = priority;
    }

    if (completed !== undefined) {
      where.completed = completed;
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      where.tags = { [Op.overlap]: tagArray };
    }

    const { rows: todos, count } = await Todo.findAndCountAll({
      where,
      order: [[sortBy, sortOrder]],
      limit,
      offset
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      success: true,
      data: {
        todos,
        pagination: {
          page,
          limit,
          total: count,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get todos error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get single todo
router.get('/:id', async (req, res) => {
  try {
    const todoId = parseInt(req.params.id);

    if (isNaN(todoId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid todo ID'
      });
    }

    const todo = await Todo.findOne({
      where: {
        id: todoId,
        userId: req.user.id
      }
    });

    if (!todo) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found'
      });
    }

    res.json({
      success: true,
      data: { todo }
    });

  } catch (error) {
    console.error('Get todo error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create new todo
router.post('/', async (req, res) => {
  try {
    const { error, value } = createTodoSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }

    const todo = await Todo.create({
      ...value,
      userId: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Todo created successfully',
      data: { todo }
    });

  } catch (error) {
    console.error('Create todo error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update todo
router.put('/:id', async (req, res) => {
  try {
    const todoId = parseInt(req.params.id);

    if (isNaN(todoId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid todo ID'
      });
    }

    const { error, value } = updateTodoSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }

    const todo = await Todo.findOne({
      where: {
        id: todoId,
        userId: req.user.id
      }
    });

    if (!todo) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found'
      });
    }

    await todo.update(value);

    res.json({
      success: true,
      message: 'Todo updated successfully',
      data: { todo }
    });

  } catch (error) {
    console.error('Update todo error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete todo
router.delete('/:id', async (req, res) => {
  try {
    const todoId = parseInt(req.params.id);

    if (isNaN(todoId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid todo ID'
      });
    }

    const todo = await Todo.findOne({
      where: {
        id: todoId,
        userId: req.user.id
      }
    });

    if (!todo) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found'
      });
    }

    await todo.destroy();

    res.json({
      success: true,
      message: 'Todo deleted successfully'
    });

  } catch (error) {
    console.error('Delete todo error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Mark todo as complete
router.patch('/:id/complete', async (req, res) => {
  try {
    const todoId = parseInt(req.params.id);

    if (isNaN(todoId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid todo ID'
      });
    }

    const todo = await Todo.findOne({
      where: {
        id: todoId,
        userId: req.user.id
      }
    });

    if (!todo) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found'
      });
    }

    await todo.update({
      completed: true,
      completedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Todo marked as complete',
      data: { todo }
    });

  } catch (error) {
    console.error('Complete todo error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Mark todo as incomplete
router.patch('/:id/incomplete', async (req, res) => {
  try {
    const todoId = parseInt(req.params.id);

    if (isNaN(todoId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid todo ID'
      });
    }

    const todo = await Todo.findOne({
      where: {
        id: todoId,
        userId: req.user.id
      }
    });

    if (!todo) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found'
      });
    }

    await todo.update({
      completed: false,
      completedAt: null
    });

    res.json({
      success: true,
      message: 'Todo marked as incomplete',
      data: { todo }
    });

  } catch (error) {
    console.error('Incomplete todo error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get todo statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const userId = req.user.id;

    const [total, completed, pending, overdue] = await Promise.all([
      Todo.count({ where: { userId } }),
      Todo.count({ where: { userId, completed: true } }),
      Todo.count({ where: { userId, completed: false } }),
      Todo.count({
        where: {
          userId,
          completed: false,
          dueDate: { [Op.lt]: new Date() }
        }
      })
    ]);

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Get category breakdown
    const categoryStats = await Todo.findAll({
      where: { userId },
      attributes: [
        'category',
        [Todo.sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['category'],
      raw: true
    });

    // Get priority breakdown
    const priorityStats = await Todo.findAll({
      where: { userId },
      attributes: [
        'priority',
        [Todo.sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['priority'],
      raw: true
    });

    res.json({
      success: true,
      data: {
        stats: {
          total,
          completed,
          pending,
          overdue,
          completionRate
        },
        breakdown: {
          categories: categoryStats,
          priorities: priorityStats
        }
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router; 