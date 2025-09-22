'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('riders', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      phone_number: {
        type: Sequelize.STRING,
        unique: true
      },
      status: {
        type: Sequelize.STRING,
        defaultValue: 'available' // available, busy, inactive
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('riders');
  }
};
