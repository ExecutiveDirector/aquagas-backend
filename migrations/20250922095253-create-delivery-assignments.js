'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('delivery_assignments', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      order_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'orders',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      rider_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'riders',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      status: {
        type: Sequelize.STRING,
        defaultValue: 'assigned' // assigned, picked_up, delivered
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('delivery_assignments');
  }
};
