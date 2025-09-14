const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: false,
    define: {
      freezeTableName: true,
      underscored: true,   // snake_case naming
      timestamps: false    // disable createdAt/updatedAt globally
      // ⚠️ Do not define createdAt/updatedAt if timestamps=false
    }
  }
);

module.exports = sequelize;
