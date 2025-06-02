const { Sequelize } = require('sequelize');

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 5432;
const DB_NAME = process.env.DB_NAME || 'todoapp';
const DB_USERNAME = process.env.DB_USERNAME || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'SecurePassword123!';

// Create Sequelize instance with optimized settings for high load
const sequelize = new Sequelize(DB_NAME, DB_USERNAME, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 50,          // Increased from 5 to 50 for better concurrency
    min: 5,           // Keep minimum connections alive
    acquire: 60000,   // Increased timeout for high load
    idle: 30000,      // Increased idle timeout
    evict: 10000      // Connection eviction timeout
  },
  dialectOptions: {
    connectTimeout: 60000,
    requestTimeout: 60000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 0
  },
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true
  },
  retry: {
    max: 3
  }
});

// Test database connection with retry logic
const initDatabase = async () => {
  let retries = 3;
  while (retries > 0) {
    try {
      await sequelize.authenticate();
      console.log('✅ Database connection established successfully');
      
      // Sync models (create tables if they don't exist)
      await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
      console.log('✅ Database synchronized');
      return;
      
    } catch (error) {
      console.error(`❌ Database connection attempt failed (${4 - retries}/3):`, error.message);
      retries--;
      
      if (retries === 0) {
        console.error('❌ Unable to connect to the database after 3 attempts');
        throw error;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};

module.exports = {
  sequelize,
  initDatabase
}; 