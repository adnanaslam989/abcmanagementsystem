// debug-exports.js
console.log('🔍 Checking database module exports...');

try {
  const dbModule = require('./config/db');
  console.log('✅ Database module loaded successfully');
  console.log('Module keys:', Object.keys(dbModule));
  console.log('Module type:', typeof dbModule);
  
  if (dbModule.pool) {
    console.log('✅ Found "pool" property');
    console.log('Pool type:', typeof dbModule.pool);
  }
  
  if (dbModule.db) {
    console.log('✅ Found "db" property');
  }
  
  if (dbModule.query) {
    console.log('✅ Has direct query method');
  }
  
  if (typeof dbModule === 'function' || (dbModule.query && typeof dbModule.query === 'function')) {
    console.log('✅ Module can be used directly for queries');
  }
} catch (error) {
  console.error('❌ Error loading module:', error.message);
}