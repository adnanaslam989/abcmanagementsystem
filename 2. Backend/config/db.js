// config/db.js
const mysql = require('mysql2/promise');
require('dotenv').config();
const db = require('../config/db');

// Database configuration with fallbacks
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hrms',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

console.log('🔧 Database Configuration:', {
  host: dbConfig.host,
  user: dbConfig.user,
  database: dbConfig.database,
  port: dbConfig.port
});

const pool = mysql.createPool(dbConfig);


// Test connection function
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    
    // Test with a simple query
    const [rows] = await connection.query('SELECT 1 as test');
    console.log('📊 Test query successful:', rows[0].test);
    
    // Check if database exists
    const [databases] = await connection.query('SHOW DATABASES');
    const dbExists = databases.some(db => db.Database === dbConfig.database);
    console.log(`📂 Database "${dbConfig.database}" exists: ${dbExists}`);
    
    if (dbExists) {
      // Check tables
      const [tables] = await connection.query(`
        SELECT TABLE_NAME 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = '${dbConfig.database}'
      `);
      
      console.log(`📊 Found ${tables.length} tables in database`);
      
      // Check for manpower table
      const hasManpower = tables.some(table => table.TABLE_NAME === 'manpower');
      console.log(`👥 Manpower table exists: ${hasManpower}`);
      
      if (hasManpower) {
        // Get record count
        const [countResult] = await connection.query('SELECT COUNT(*) as total FROM manpower');
        console.log(`📈 Total employees: ${countResult[0].total}`);
      }
    }
    
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

// SINGLE module.exports at the end
module.exports = {
  // For old implementation (using .execute())
  pool: {
    // Create a wrapper that provides both .execute() and .query()
    execute: async (sql, params) => {
      const [rows] = await pool.query(sql, params);
      return [rows];
    },
    query: async (sql, params) => {
      const [rows] = await pool.query(sql, params);
      return [rows];
    },
    getConnection: () => pool.getConnection()
  },
  
  // For new implementation (using .query())
  db: pool,
  
  // Test function
  testConnection: testConnection,
  
  // Backward compatibility - direct pool access
};