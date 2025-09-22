const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('vendor_inventory', {
    inventory_id: {
      autoIncrement: true,
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    outlet_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: {
        model: 'vendor_outlets',
        key: 'outlet_id'
      }
    },
    product_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: {
        model: 'products',
        key: 'product_id'
      }
    },
    current_stock: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    reserved_stock: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: "Stock allocated to pending orders"
    },
    minimum_stock_level: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 5
    },
    maximum_stock_level: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 100
    },
    reorder_point: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 10
    },
    cost_price: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: false,
      defaultValue: 0.00
    },
    selling_price: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: false
    },
    supplier_info: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Supplier details and pricing (JSON)"
    },
    last_restocked_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    last_sold_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    expiry_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: "For products with expiration"
    },
    batch_number: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    is_available: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 1
    }
  }, {
    sequelize,
    tableName: 'vendor_inventory',
    hasTrigger: true,
    timestamps: true,
    indexes: [
      // {
      //   name: "PRIMARY",
      //   unique: true,
      //   using: "BTREE",
      //   fields: [
      //     { name: "inventory_id" },
      //   ]
      // },
      {
        name: "uk_outlet_product",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "outlet_id" },
          { name: "product_id" },
        ]
      },
      {
        name: "idx_product",
        using: "BTREE",
        fields: [
          { name: "product_id" },
        ]
      },
      {
        name: "idx_stock_level",
        using: "BTREE",
        fields: [
          { name: "current_stock" },
        ]
      },
      {
        name: "idx_low_stock",
        using: "BTREE",
        fields: [
          { name: "outlet_id" },
          { name: "current_stock" },
          { name: "minimum_stock_level" },
        ]
      },
      {
        name: "idx_available",
        using: "BTREE",
        fields: [
          { name: "is_available" },
        ]
      },
      {
        name: "idx_expiry",
        using: "BTREE",
        fields: [
          { name: "expiry_date" },
        ]
      },
    ]
  });
};
