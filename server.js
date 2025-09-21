// server.js - Main entry point for Smart Gas Delivery Backend
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Import database connection and models
const sequelize = require('./config/db');
const initModels = require('./models/init-models');

// Import routes and middleware
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const logger = require('./middleware/logger');

const app = express();

// Initialize models
const models = initModels(sequelize);
app.locals.models = models;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Allow curl/mobile
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:4000',
      'http://localhost:5173', // Add frontend
      'https://smartgas-admin.com',
      'https://smartgas.co.ke',
      'https://preview.flutlab.io',   // ✅ 
      'https://2553qn6p-400.uks1.devtunnels.ms/',

    ];
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};
//app.use(cors(corsOptions));
app.use(cors({ origin: '*', credentials: true }));


// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Auth-specific rate limiting
const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50,                 // allow 50 attempts/minute in dev
  message: { error: 'Too many authentication attempts, please try again later.' }
});

app.use('/api/v1/users/login', authLimiter);
app.use('/api/v1/users/register', authLimiter);
app.use('/api/v1/riders/login', authLimiter);
app.use('/api/v1/vendors/login', authLimiter);
app.use('/api/v1/admin/login', authLimiter);

// Body + compression + logging
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());
//app.use(logger);

// API routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🚚 Smart Gas Delivery API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      users: '/api/v1/users',
      products: '/api/v1/products',
      orders: '/api/v1/orders',
      riders: '/api/v1/riders',
      vendors: '/api/v1/vendors',
      payments: '/api/v1/payments',
      notifications: '/api/v1/notifications',
      admin: '/api/v1/admin',
      analytics: '/api/v1/analytics',
      support: '/api/v1/support',
      notification_templates: '/api/v1/notification_templates'

    }
  });
});

// Error handling middleware
//pp.use(notFoundHandler);
 app.use(errorHandler);

// Startup function
async function startServer() {
  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected successfully!');

    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Syncing database models...');
      await sequelize.sync({ alter: false });
      console.log('✅ Database models synced!');
    }

    const PORT = process.env.PORT || 4000;
    const server = app.listen(PORT, () => {
      console.log(`🚀 Smart Gas Delivery API running on port ${PORT}`);
      console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 Server URL: http://localhost:${PORT}`);
      console.log(`📊 API Docs: http://localhost:${PORT}/api/health`);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🔄 Shutting down server...');
      server.close(async () => {
        console.log('✅ HTTP server closed');
        try {
          await sequelize.close();
          console.log('✅ Database connection closed');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error closing database:', error);
          process.exit(1);
        }
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Crash safety
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run only if called directly
if (require.main === module) {
  startServer();
}
// In server.js temporarily:
//const productsRoutes = require('./routes/products');
//console.log('productsRoutes:', productsRoutes);

module.exports = app;
