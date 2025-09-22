const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('user_subscriptions', {
    subscription_id: {
      autoIncrement: true,
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    plan_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      references: {
        model: 'subscription_plans',
        key: 'plan_id'
      }
    },
    subscription_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('active','paused','cancelled','expired'),
      allowNull: false,
      defaultValue: "active"
    },
    subscription_items: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: "Array of {product_id, quantity, unit_price} (JSON)"
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    next_delivery_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    last_order_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    base_amount: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: false
    },
    total_amount: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: false
    },
    delivery_address_line_1: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    delivery_address_line_2: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    delivery_city: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    delivery_county: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    delivery_latitude: {
      type: DataTypes.DECIMAL(10,8),
      allowNull: false
    },
    delivery_longitude: {
      type: DataTypes.DECIMAL(11,8),
      allowNull: false
    },
    delivery_location: {
      type: "POINT",
      allowNull: false
    },
    delivery_instructions: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    preferred_delivery_time: {
      type: DataTypes.TIME,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'user_subscriptions',
    timestamps: true,
    indexes: [
      // {
      //   name: "PRIMARY",
      //   unique: true,
      //   using: "BTREE",
      //   fields: [
      //     { name: "subscription_id" },
      //   ]
      // },
      {
        name: "idx_user",
        using: "BTREE",
        fields: [
          { name: "user_id" },
        ]
      },
      {
        name: "idx_plan",
        using: "BTREE",
        fields: [
          { name: "plan_id" },
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
        name: "idx_next_delivery",
        using: "BTREE",
        fields: [
          { name: "next_delivery_date" },
        ]
      },
    ]
  });
};
