const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('orders', {
    order_id: {
      autoIncrement: true,
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    order_number: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: "Human-readable order ID",
      unique: "order_number"
    },
    customer_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    outlet_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    vendor_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      comment: "Denormalized for performance"
    },
    vendor_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "Cached vendor name"
    },
    order_status: {
      type: DataTypes.ENUM('draft','pending','confirmed','preparing','ready','dispatched','delivered','cancelled','refunded'),
      allowNull: false,
      defaultValue: "draft"
    },
    payment_status: {
      type: DataTypes.ENUM('pending','paid','partially_paid','refunded','failed'),
      allowNull: false,
      defaultValue: "pending"
    },
    subtotal: {
      type: DataTypes.DECIMAL(12,2),
      allowNull: false,
      defaultValue: 0.00
    },
    tax_amount: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: false,
      defaultValue: 0.00
    },
    delivery_fee: {
      type: DataTypes.DECIMAL(8,2),
      allowNull: false,
      defaultValue: 0.00
    },
    discount_amount: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: false,
      defaultValue: 0.00
    },
    total_amount: {
      type: DataTypes.DECIMAL(12,2),
      allowNull: false,
      defaultValue: 0.00
    },
    delivery_type: {
      type: DataTypes.ENUM('home_delivery','pickup','scheduled'),
      allowNull: false,
      defaultValue: "home_delivery"
    },
    estimated_delivery_time: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "System-estimated delivery time"
    },
    actual_delivery_time: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "When delivery was actually completed"
    }
  }, {
    sequelize,
    tableName: 'orders',
    hasTrigger: true,
    timestamps: true,
    indexes: [
      {
        name: "order_number",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "order_number" },
        ]
      },
      {
        name: "idx_customer",
        using: "BTREE",
        fields: [
          { name: "customer_id" },
        ]
      },
      {
        name: "idx_vendor",
        using: "BTREE",
        fields: [
          { name: "vendor_id" },
        ]
      },
      {
        name: "idx_status",
        using: "BTREE",
        fields: [
          { name: "order_status" },
        ]
      },
      {
        name: "idx_payment",
        using: "BTREE",
        fields: [
          { name: "payment_status" },
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
