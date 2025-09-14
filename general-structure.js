// generate-structure.js - Creates complete project structure
const fs = require('fs');
const path = require('path');

const projectStructure = {
  // Root level files
  'package.json': '',
  'server.js': '',
  '.env.example': '',
  '.env': '',
  '.gitignore': '',
  'README.md': '',
  '.eslintrc.js': '',
  '.prettierrc': '',
  'nodemon.json': '',
  'jest.config.js': '',
  'docker-compose.yml': '',
  'Dockerfile': '',
  'LICENSE': '',

  // Configuration directory
  'config/': {
    'db.js': '',
    'redis.js': '',
    'firebase.js': '',
    'swagger.js': '',
    'email.js': '',
    'cloudinary.js': '',
    'mpesa.js': ''
  },

  // Models directory (already exists)
  'models/': {
    'init-models.js': 'exists',
    'users.js': 'exists',
    'orders.js': 'exists',
    '// ... other 36+ model files': 'exists'
  },

  // Routes directory
  'routes/': {
    'index.js': '',
    'auth.js': '',
    'users.js': '',
    'products.js': '',
    'orders.js': '',
    'riders.js': '',
    'vendors.js': '',
    'payments.js': '',
    'notifications.js': '',
    'admin.js': '',
    'analytics.js': '',
    'support.js': '',
    'uploads.js': '',
    'locations.js': ''
  },

  // Controllers directory
  'controllers/': {
    'authController.js': '',
    'userController.js': '',
    'productController.js': '',
    'orderController.js': '',
    'riderController.js': '',
    'vendorController.js': '',
    'paymentController.js': '',
    'notificationController.js': '',
    'adminController.js': '',
    'analyticsController.js': '',
    'supportController.js': '',
    'uploadController.js': '',
    'locationController.js': '',
    'iotController.js': ''
  },

  // Services directory
  'services/': {
    'authService.js': '',
    'mpesaService.js': '',
    'notificationService.js': '',
    'pushNotificationService.js': '',
    'emailService.js': '',
    'smsService.js': '',
    'riderAssignmentService.js': '',
    'routeOptimizationService.js': '',
    'geocodingService.js': '',
    'uploadService.js': '',
    'cacheService.js': '',
    'iotService.js': '',
    'analyticsService.js': '',
    'inventoryService.js': '',
    'loyaltyService.js': '',
    'schedulerService.js': ''
  },

  // Middleware directory
  'middleware/': {
    'authMiddleware.js': '',
    'roleMiddleware.js': '',
    'errorHandler.js': '',
    'logger.js': '',
    'rateLimiter.js': '',
    'validation.js': '',
    'uploadMiddleware.js': '',
    'corsMiddleware.js': '',
    'compressionMiddleware.js': '',
    'securityMiddleware.js': ''
  },

  // Utils directory
  'utils/': {
    'responseFormatter.js': '',
    'validation.js': '',
    'constants.js': '',
    'helpers.js': '',
    'encryption.js': '',
    'dateUtils.js': '',
    'geoUtils.js': '',
    'priceCalculator.js': '',
    'distanceCalculator.js': '',
    'otpGenerator.js': '',
    'fileUtils.js': '',
    'logger.js': ''
  },

  // Tests directory
  'tests/': {
    'setup.js': '',
    'teardown.js': '',
    
    'unit/': {
      'users.test.js': '',
      'orders.test.js': '',
      'products.test.js': '',
      'riders.test.js': '',
      'vendors.test.js': '',
      'payments.test.js': '',
      'notifications.test.js': '',
      'auth.test.js': '',
      'services.test.js': ''
    },

    'integration/': {
      'api.test.js': '',
      'database.test.js': '',
      'mpesa.test.js': '',
      'notifications.test.js': ''
    },

    'helpers/': {
      'testHelpers.js': '',
      'mockData.js': '',
      'dbHelpers.js': ''
    },

    'fixtures/': {
      'users.json': '',
      'products.json': '',
      'orders.json': ''
    }
  },

  // Scripts directory
  'scripts/': {
    'seedDatabase.js': '',
    'seedUsers.js': '',
    'seedProducts.js': '',
    'seedVendors.js': '',
    'seedRiders.js': '',
    'seedOrders.js': '',
    'seedAnalytics.js': '',
    'cleanup.js': '',
    'backup.js': '',
    'migrate.js': '',
    'generateApiKeys.js': '',
    'setupAdmin.js': '',
    'cronJobs.js': ''
  },

  // Jobs/Workers directory
  'jobs/': {
    'emailWorker.js': '',
    'notificationWorker.js': '',
    'analyticsWorker.js': '',
    'cleanupWorker.js': '',
    'backupWorker.js': '',
    'orderProcessingWorker.js': '',
    'riderAssignmentWorker.js': ''
  },

  // Documentation directory
  'docs/': {
    'API.md': '',
    'DEPLOYMENT.md': '',
    'CONTRIBUTING.md': '',
    'DATABASE.md': '',
    'SETUP.md': '',
    'ARCHITECTURE.md': '',
    'PAYMENT_INTEGRATION.md': '',
    'NOTIFICATION_SYSTEM.md': '',
    'TESTING.md': '',
    
    'api/': {
      'swagger.yaml': '',
      'postman_collection.json': ''
    },

    'diagrams/': {
      'architecture.png': '',
      'database_schema.png': '',
      'api_flow.png': ''
    }
  },

  // Public/Static directory
  'public/': {
    'images/': {
      'logo.png': '',
      'favicon.ico': ''
    },
    'docs/': {
      'api-docs.html': ''
    }
  },

  // Uploads directory
  'uploads/': {
    'products/': {
      '.gitkeep': ''
    },
    'users/': {
      'avatars/': {
        '.gitkeep': ''
      },
      'documents/': {
        '.gitkeep': ''
      }
    },
    'riders/': {
      'documents/': {
        '.gitkeep': ''
      },
      'delivery_photos/': {
        '.gitkeep': ''
      }
    },
    'vendors/': {
      'documents/': {
        '.gitkeep': ''
      },
      'products/': {
        '.gitkeep': ''
      }
    },
    'temp/': {
      '.gitkeep': ''
    }
  },

  // Logs directory
  'logs/': {
    '.gitkeep': '',
    'error/': {
      '.gitkeep': ''
    },
    'access/': {
      '.gitkeep': ''
    },
    'application/': {
      '.gitkeep': ''
    }
  },

  // Storage directory
  'storage/': {
    'cache/': {
      '.gitkeep': ''
    },
    'sessions/': {
      '.gitkeep': ''
    },
    'exports/': {
      '.gitkeep': ''
    }
  },

  // Templates directory
  'templates/': {
    'emails/': {
      'welcome.html': '',
      'order-confirmation.html': '',
      'delivery-notification.html': '',
      'password-reset.html': '',
      'invoice.html': ''
    },
    'sms/': {
      'order-status.txt': '',
      'otp-verification.txt': '',
      'delivery-notification.txt': ''
    },
    'push/': {
      'order-updates.json': '',
      'promotions.json': ''
    }
  },

  // Localization directory
  'locales/': {
    'en/': {
      'common.json': '',
      'errors.json': '',
      'messages.json': ''
    },
    'sw/': {
      'common.json': '',
      'errors.json': '',
      'messages.json': ''
    }
  }
};

function createDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Created directory: ${dirPath}`);
  }
}

function createFile(filePath, content = '') {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content);
    console.log(`📄 Created file: ${filePath}`);
  } else {
    console.log(`⏭️  Skipped existing file: ${filePath}`);
  }
}

function generateStructure(structure, basePath = '') {
  const currentPath = basePath || process.cwd();

  Object.keys(structure).forEach(key => {
    const value = structure[key];
    const fullPath = path.join(currentPath, key);

    if (key.endsWith('/')) {
      // It's a directory
      const dirName = key.slice(0, -1);
      const dirPath = path.join(currentPath, dirName);
      createDirectory(dirPath);
      
      if (typeof value === 'object' && value !== null) {
        generateStructure(value, dirPath);
      }
    } else {
      // It's a file
      if (value === 'exists') {
        console.log(`✅ File already exists: ${fullPath}`);
      } else {
        createFile(fullPath, value);
      }
    }
  });
}

function displayProjectTree() {
  console.log(`
🌳 Smart Gas Delivery Backend Structure:

smart-gas-backend/
├── 📄 package.json
├── 📄 server.js
├── 📄 .env.example
├── 📄 .gitignore
├── 📄 README.md
├── 📄 docker-compose.yml
├── 📄 Dockerfile
├── 
├── 📁 config/
│   ├── db.js
│   ├── redis.js
│   ├── firebase.js
│   └── swagger.js
├── 
├── 📁 models/ (existing - 39 files)
│   ├── init-models.js
│   ├── users.js
│   └── ... (36+ other model files)
├── 
├── 📁 routes/
│   ├── index.js
│   ├── auth.js
│   ├── users.js
│   ├── products.js
│   ├── orders.js
│   ├── riders.js
│   ├── vendors.js
│   ├── payments.js
│   ├── notifications.js
│   ├── admin.js
│   ├── analytics.js
│   └── support.js
├── 
├── 📁 controllers/
│   ├── authController.js
│   ├── userController.js
│   ├── productController.js
│   ├── orderController.js
│   ├── riderController.js
│   ├── vendorController.js
│   ├── paymentController.js
│   ├── notificationController.js
│   ├── adminController.js
│   └── analyticsController.js
├── 
├── 📁 services/
│   ├── mpesaService.js
│   ├── notificationService.js
│   ├── emailService.js
│   ├── smsService.js
│   ├── riderAssignmentService.js
│   ├── geocodingService.js
│   ├── uploadService.js
│   └── cacheService.js
├── 
├── 📁 middleware/
│   ├── authMiddleware.js
│   ├── errorHandler.js
│   ├── logger.js
│   ├── rateLimiter.js
│   └── validation.js
├── 
├── 📁 utils/
│   ├── responseFormatter.js
│   ├── validation.js
│   ├── constants.js
│   ├── helpers.js
│   ├── encryption.js
│   └── dateUtils.js
├── 
├── 📁 tests/
│   ├── setup.js
│   ├── unit/
│   ├── integration/
│   ├── helpers/
│   └── fixtures/
├── 
├── 📁 scripts/
│   ├── seedDatabase.js
│   ├── seedUsers.js
│   ├── seedProducts.js
│   └── backup.js
├── 
├── 📁 docs/
│   ├── API.md
│   ├── DEPLOYMENT.md
│   ├── api/
│   └── diagrams/
├── 
├── 📁 uploads/
│   ├── products/
│   ├── users/
│   ├── riders/
│   └── temp/
├── 
├── 📁 logs/
├── 📁 storage/
├── 📁 templates/
└── 📁 locales/
  `);
}

// Main execution
console.log('🚀 Generating Smart Gas Delivery Backend Structure...\n');

displayProjectTree();

console.log('\n📋 Creating project structure...\n');

try {
  generateStructure(projectStructure);
  
  console.log('\n✅ Project structure generated successfully!');
  console.log('\n📋 Next Steps:');
  console.log('1. 📝 Copy .env.example to .env and configure');
  console.log('2. 📦 Run: npm install');
  console.log('3. 🗄️  Set up database and run: npm run seed');
  console.log('4. 🚀 Start development: npm run dev');
  console.log('\n🎉 Your Smart Gas Delivery backend is ready to go!');
  
} catch (error) {
  console.error('❌ Error creating structure:', error.message);
  process.exit(1);
}