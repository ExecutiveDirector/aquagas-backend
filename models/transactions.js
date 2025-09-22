const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('transactions', {
    transaction_id: {
      autoIncrement: true,
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    transaction_ref: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: "External payment gateway reference",
      unique: "transaction_ref"
    },
    order_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      references: {
        model: 'orders',
        key: 'order_id'
      }
    },
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    payment_method_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      references: {
        model: 'payment_methods',
        key: 'method_id'
      }
    },
    transaction_type: {
      type: DataTypes.ENUM('payment','refund','payout','fee','commission'),
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(12,2),
      allowNull: false
    },
    currency: {
      type: DataTypes.CHAR(3),
      allowNull: false,
      defaultValue: "KES"
    },
    status: {
      type: DataTypes.ENUM('pending','processing','completed','failed','cancelled','refunded'),
      allowNull: false,
      defaultValue: "pending"
    },
    payment_gateway: {
      type: DataTypes.ENUM('mpesa','pesapal','flutterwave','stripe','manual'),
      allowNull: false
    },
    gateway_transaction_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    gateway_response: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Full gateway response (JSON)"
    },
    gateway_fee: {
      type: DataTypes.DECIMAL(8,2),
      allowNull: false,
      defaultValue: 0.00
    },
    tax_amount: {
      type: DataTypes.DECIMAL(8,2),
      allowNull: false,
      defaultValue: 0.00
    },
    initiated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    failed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    failure_reason: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    metadata: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Additional transaction data (JSON)"
    }
  }, {
    sequelize,
    tableName: 'transactions',
    timestamps: false,
    indexes: [
      // {
      //   name: "PRIMARY",
      //   unique: true,
      //   using: "BTREE",
      //   fields: [
      //     { name: "transaction_id" },
      //   ]
      // },
      {
        name: "transaction_ref",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "transaction_ref" },
        ]
      },
      {
        name: "payment_method_id",
        using: "BTREE",
        fields: [
          { name: "payment_method_id" },
        ]
      },
      {
        name: "idx_order",
        using: "BTREE",
        fields: [
          { name: "order_id" },
        ]
      },
      {
        name: "idx_user",
        using: "BTREE",
        fields: [
          { name: "user_id" },
        ]
      },
      {
        name: "idx_status",
        using: "BTREE",
        fields: [
          { name: "status" },
        ]
      },
      {
        name: "idx_transaction_ref",
        using: "BTREE",
        fields: [
          { name: "transaction_ref" },
        ]
      },
      {
        name: "idx_gateway",
        using: "BTREE",
        fields: [
          { name: "payment_gateway" },
        ]
      },
      {
        name: "idx_initiated_at",
        using: "BTREE",
        fields: [
          { name: "initiated_at" },
        ]
      },
      {
        name: "idx_user_status_date",
        using: "BTREE",
        fields: [
          { name: "user_id" },
          { name: "status" },
          { name: "initiated_at" },
        ]
      },
    ]
  });
};
