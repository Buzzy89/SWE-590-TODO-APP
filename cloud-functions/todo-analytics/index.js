const functions = require('@google-cloud/functions-framework');
const { Pool } = require('pg');

// Database connection pool
let pool;

function getDbPool() {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return pool;
}

// Main function
functions.http('todoAnalytics', async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const action = req.query.action || 'global-stats';
    const db = getDbPool();
    
    switch (action) {
      case 'global-stats':
        await getGlobalStats(req, res, db);
        break;
      case 'user-activity':
        await getUserActivity(req, res, db);
        break;
      case 'completion-trends':
        await getCompletionTrends(req, res, db);
        break;
      case 'category-distribution':
        await getCategoryDistribution(req, res, db);
        break;
      case 'priority-analysis':
        await getPriorityAnalysis(req, res, db);
        break;
      default:
        res.status(400).json({ error: 'Invalid action parameter' });
    }
  } catch (error) {
    console.error('Analytics function error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

async function getGlobalStats(req, res, db) {
  try {
    const queries = await Promise.all([
      // Total users
      db.query('SELECT COUNT(*) as total_users FROM users WHERE is_active = true'),
      
      // Total todos
      db.query('SELECT COUNT(*) as total_todos FROM todos'),
      
      // Completed todos
      db.query('SELECT COUNT(*) as completed_todos FROM todos WHERE completed = true'),
      
      // Active users (logged in last 30 days)
      db.query(`
        SELECT COUNT(*) as active_users 
        FROM users 
        WHERE last_login > NOW() - INTERVAL '30 days' AND is_active = true
      `),
      
      // Todos created today
      db.query(`
        SELECT COUNT(*) as todos_today 
        FROM todos 
        WHERE DATE(created_at) = CURRENT_DATE
      `),
      
      // Average todos per user
      db.query(`
        SELECT AVG(todo_count) as avg_todos_per_user
        FROM (
          SELECT user_id, COUNT(*) as todo_count
          FROM todos
          GROUP BY user_id
        ) user_todos
      `)
    ]);

    const stats = {
      timestamp: new Date().toISOString(),
      global: {
        total_users: parseInt(queries[0].rows[0].total_users),
        total_todos: parseInt(queries[1].rows[0].total_todos),
        completed_todos: parseInt(queries[2].rows[0].completed_todos),
        active_users: parseInt(queries[3].rows[0].active_users),
        todos_today: parseInt(queries[4].rows[0].todos_today),
        avg_todos_per_user: parseFloat(queries[5].rows[0].avg_todos_per_user || 0).toFixed(2)
      }
    };

    // Calculate completion rate
    stats.global.completion_rate = stats.global.total_todos > 0 
      ? ((stats.global.completed_todos / stats.global.total_todos) * 100).toFixed(2)
      : 0;

    res.json(stats);
  } catch (error) {
    throw error;
  }
}

async function getUserActivity(req, res, db) {
  try {
    const query = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as todos_created,
        COUNT(CASE WHEN completed = true THEN 1 END) as todos_completed
      FROM todos
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `;

    const result = await db.query(query);
    
    res.json({
      timestamp: new Date().toISOString(),
      activity: result.rows.map(row => ({
        date: row.date,
        todos_created: parseInt(row.todos_created),
        todos_completed: parseInt(row.todos_completed)
      }))
    });
  } catch (error) {
    throw error;
  }
}

async function getCompletionTrends(req, res, db) {
  try {
    const query = `
      SELECT 
        DATE(completed_at) as completion_date,
        COUNT(*) as completed_count,
        AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600) as avg_completion_hours
      FROM todos
      WHERE completed = true 
        AND completed_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(completed_at)
      ORDER BY completion_date DESC
      LIMIT 30
    `;

    const result = await db.query(query);
    
    res.json({
      timestamp: new Date().toISOString(),
      trends: result.rows.map(row => ({
        date: row.completion_date,
        completed_count: parseInt(row.completed_count),
        avg_completion_hours: parseFloat(row.avg_completion_hours || 0).toFixed(2)
      }))
    });
  } catch (error) {
    throw error;
  }
}

async function getCategoryDistribution(req, res, db) {
  try {
    const query = `
      SELECT 
        category,
        COUNT(*) as total_todos,
        COUNT(CASE WHEN completed = true THEN 1 END) as completed_todos,
        ROUND(
          (COUNT(CASE WHEN completed = true THEN 1 END) * 100.0 / COUNT(*)), 2
        ) as completion_rate
      FROM todos
      GROUP BY category
      ORDER BY total_todos DESC
    `;

    const result = await db.query(query);
    
    res.json({
      timestamp: new Date().toISOString(),
      categories: result.rows.map(row => ({
        category: row.category,
        total_todos: parseInt(row.total_todos),
        completed_todos: parseInt(row.completed_todos),
        completion_rate: parseFloat(row.completion_rate || 0)
      }))
    });
  } catch (error) {
    throw error;
  }
}

async function getPriorityAnalysis(req, res, db) {
  try {
    const query = `
      SELECT 
        priority,
        COUNT(*) as total_todos,
        COUNT(CASE WHEN completed = true THEN 1 END) as completed_todos,
        AVG(CASE 
          WHEN completed = true AND completed_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (completed_at - created_at))/3600 
        END) as avg_completion_hours
      FROM todos
      GROUP BY priority
      ORDER BY 
        CASE priority 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          WHEN 'low' THEN 3 
        END
    `;

    const result = await db.query(query);
    
    res.json({
      timestamp: new Date().toISOString(),
      priorities: result.rows.map(row => ({
        priority: row.priority,
        total_todos: parseInt(row.total_todos),
        completed_todos: parseInt(row.completed_todos),
        completion_rate: row.total_todos > 0 
          ? ((row.completed_todos / row.total_todos) * 100).toFixed(2)
          : 0,
        avg_completion_hours: parseFloat(row.avg_completion_hours || 0).toFixed(2)
      }))
    });
  } catch (error) {
    throw error;
  }
}

// Export for local testing
module.exports = { todoAnalytics: functions.getFunction('todoAnalytics') }; 