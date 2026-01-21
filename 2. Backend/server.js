// server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Get local IP address
const getLocalIP = () => {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  
  for (const interfaceName in interfaces) {
    for (const iface of interfaces[interfaceName]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        // Check if it's in the 10.0.x.x range
        if (iface.address.startsWith('10.0.')) {
          return iface.address;
        }
      }
    }
  }
  return 'localhost';
};

const localIP = getLocalIP();
console.log(`🌐 Local IP Address detected: ${localIP}`);

// CORS Configuration - UPDATED
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:5000',
    `http://${localIP}:3000`,
    `http://${localIP}:5000`,
    'http://10.0.0.7:3000',
    'http://10.0.0.7:5000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Allow-Headers',
    'Access-Control-Request-Headers',
    'Access-Control-Allow-Origin'
  ],
  exposedHeaders: ['Content-Length', 'Authorization']
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Increase payload size limit for file uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Import database connection
const dbModule = require('./config/db');

// Test database connection on startup
const initializeDatabase = async () => {
  console.log('🔄 Testing database connection...');
  try {
    const isConnected = await dbModule.testConnection();
    
    if (!isConnected) {
      console.log('\n🚨 IMPORTANT: Database connection failed!');
      console.log('But the server will continue running...');
      console.log('You can fix the database connection and restart the server.');
      console.log('API endpoints might not work properly until database is connected.\n');
    }
  } catch (error) {
    console.log('❌ Error testing database connection:', error.message);
    console.log('Server will continue running with mock data...\n');
  }
};

// Import routes
const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employee'); 
const PAFemployeeRoutes = require('./routes/PAFemployee'); 
const bonusRoutes = require('./routes/bonus');
const roleRoutes = require('./routes/roles');
const penaltyRoutes = require('./routes/penalty');
const biometricRoutes = require('./routes/biometric');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/employee', employeeRoutes); 
app.use('/api/PAFemployee', PAFemployeeRoutes);
app.use('/api/bonus', bonusRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/penalty', penaltyRoutes);
app.use('/api/biometric', biometricRoutes); // This is already correct

// CORS headers middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Check if origin is allowed
  if (corsOptions.origin.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', corsOptions.methods.join(','));
  res.setHeader('Access-Control-Allow-Headers', corsOptions.allowedHeaders.join(','));
  
  next();
});

// Debug endpoint to see all registered routes
app.get('/api/debug-routes', (req, res) => {
  const routes = [];
  
  // Helper function to extract routes
  function printRoutes(layer, prefix = '') {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods);
      methods.forEach(method => {
        routes.push(`${method.toUpperCase()} ${prefix}${layer.route.path}`);
      });
    } else if (layer.name === 'router' && layer.handle.stack) {
      layer.handle.stack.forEach((handler) => {
        printRoutes(handler, prefix + (layer.regexp.toString() !== '/^\\/?(?=\\/|$)/i' ? '' : ''));
      });
    }
  }
  
  app._router.stack.forEach((layer) => {
    printRoutes(layer);
  });
  
  res.json({
    success: true,
    totalRoutes: routes.length,
    routes: routes.sort()
  });
});

// Basic test route (root API endpoint)
app.get('/api', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Organization Management System API is running!',
    server_ip: localIP,
    server_port: PORT,
    endpoints: {
      auth: '/api/auth',
      employee: '/api/employee',
      PAFemployee: '/api/PAFemployee',
      test: '/api/test',
      health: '/api/health',
      roles: '/api/roles',
      bonus: '/api/bonus',
      penalty: '/api/penalty',
      biometric: '/api/biometric', // Added this
      debug: '/api/debug-routes'  // Added this
    },
    cors: {
      allowed_origins: corsOptions.origin,
      current_origin: req.headers.origin || 'none'
    }
  });
});

// Test route with detailed CORS info
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Backend server is working!',
    timestamp: new Date().toISOString(),
    server: {
      ip: localIP,
      port: PORT,
      hostname: require('os').hostname()
    },
    request: {
      origin: req.headers.origin || 'none',
      host: req.headers.host,
      userAgent: req.headers['user-agent']
    }
  });
});

// Health check route
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = await dbModule.testConnection() ? 'connected' : 'disconnected';
    
    res.json({ 
      status: 'OK', 
      server: {
        ip: localIP,
        port: PORT,
        uptime: process.uptime()
      },
      database: dbStatus,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      cors: {
        origin: req.headers.origin || 'none',
        allowed: corsOptions.origin.includes(req.headers.origin) || !req.headers.origin
      }
    });
  } catch (error) {
    res.json({ 
      status: 'OK', 
      database: 'error',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  }
});

// CORS test endpoint
app.get('/api/cors-test', (req, res) => {
  res.json({
    success: true,
    message: 'CORS test successful!',
    headers: {
      origin: req.headers.origin,
      'access-control-allow-origin': res.getHeader('Access-Control-Allow-Origin'),
      'access-control-allow-credentials': res.getHeader('Access-Control-Allow-Credentials')
    },
    allowedOrigins: corsOptions.origin
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error stack:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

// 404 handler for API routes - UPDATED with all routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.originalUrl}`,
    availableRoutes: [
      'GET /api',
      'GET /api/test', 
      'GET /api/health',
      'GET /api/cors-test',
      'GET /api/debug-routes',
      'POST /api/auth/login',
      'POST /api/auth/verify',
      'POST /api/auth/logout',
      'GET /api/employee/:pak',
      'PUT /api/employee/:pak',
      'GET /api/PAFemployee/:pak',
      'PUT /api/PAFemployee/:pak',
      'GET /api/biometric/test',
      'POST /api/biometric/fetch',
      'POST /api/biometric/fetch-simple',
      'GET /api/biometric/config',
      'POST /api/biometric/config/save',
      'POST /api/biometric/auto-sync'
    ],
    note: 'Visit /api/debug-routes to see all registered routes'
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Organization Management System API',
    server_ip: localIP,
    server_port: PORT,
    documentation: 'Visit /api for available endpoints',
    access: {
      local: `http://localhost:${PORT}`,
      network: `http://${localIP}:${PORT}`
    }
  });
});

// Start server - Listen on all network interfaces
const HOST = '0.0.0.0'; // This makes server accessible from any IP
app.listen(PORT, HOST, async () => {
  console.log(`🚀 Server running on:`);
  console.log(`   Local: http://localhost:${PORT}`);
  console.log(`   Network: http://${localIP}:${PORT}`);
  console.log(`   All IPs: http://0.0.0.0:${PORT}`);
  console.log('');
  console.log(`📍 API endpoints available at http://localhost:${PORT}/api`);
  console.log(`🔐 Auth routes: http://localhost:${PORT}/api/auth`);
  console.log(`👥 PAF Employee routes: http://localhost:${PORT}/api/PAFemployee`);
  console.log(`🤖 Biometric routes: http://localhost:${PORT}/api/biometric`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🐛 Debug routes: http://localhost:${PORT}/api/debug-routes`);
  console.log('');
  console.log(`📡 Allowed origins for CORS:`);
  corsOptions.origin.forEach(origin => {
    console.log(`   ✅ ${origin}`);
  });
  
  // Test database connection
  await initializeDatabase();
});