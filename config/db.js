const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: process.env.DB_DIALECT || 'mysql',
    logging: process.env.DB_LOGGING === 'true',
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    },
    define: {
      freezeTableName: true,
      underscored: true,
      timestamps: false
    }
  }
);

sequelize.authenticate()
  .then(() => console.log('✅ DB connected successfully'))
  .catch(err => console.error('❌ DB connection error:', err));

module.exports = sequelize;
