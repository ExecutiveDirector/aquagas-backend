const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('inventory_movements', {
    movement_id: {
      autoIncrement: true,
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    inventory_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: {
        model: 'vendor_inventory',
        key: 'inventory_id'
      }
    },
    movement_type: {
      type: DataTypes.ENUM('stock_in','stock_out','adjustment','transfer','damaged','expired'),
      allowNull: false
    },
    quantity_change: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "Positive for in, negative for out"
    },
    reason: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    reference_type: {
      type: DataTypes.ENUM('purchase','sale','order','transfer','adjustment'),
      allowNull: true
    },
    reference_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    unit_cost: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_by: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'inventory_movements',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "movement_id" },
        ]
      },
      {
        name: "idx_inventory",
        using: "BTREE",
        fields: [
          { name: "inventory_id" },
        ]
      },
      {
        name: "idx_movement_type",
        using: "BTREE",
        fields: [
          { name: "movement_type" },
        ]
      },
      {
        name: "idx_reference",
        using: "BTREE",
        fields: [
          { name: "reference_type" },
          { name: "reference_id" },
        ]
      },
      {
        name: "idx_created_at",
        using: "BTREE",
        fields: [
          { name: "created_at" },
        ]
      },
    ]
  });
};
