const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('loyalty_rewards', {
    reward_id: {
      autoIncrement: true,
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    reward_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    reward_type: {
      type: DataTypes.ENUM('discount_percentage','discount_fixed','free_delivery','free_product','cashback'),
      allowNull: false
    },
    points_required: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    reward_value: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: true
    },
    maximum_discount: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: true
    },
    applicable_products: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: " (JSON)"
    },
    applicable_categories: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: " (JSON)"
    },
    usage_limit_per_user: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    total_usage_limit: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    valid_from: {
      type: DataTypes.DATE,
      allowNull: true
    },
    valid_to: {
      type: DataTypes.DATE,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 1
    },
    sort_order: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    sequelize,
    tableName: 'loyalty_rewards',
    hasTrigger: true,
    timestamps: true,
    indexes: [
      // {
      //   name: "PRIMARY",
      //   unique: true,
      //   using: "BTREE",
      //   fields: [
      //     { name: "reward_id" },
      //   ]
      // },
      {
        name: "idx_points_required",
        using: "BTREE",
        fields: [
          { name: "points_required" },
        ]
      },
      {
        name: "idx_sort_order",
        using: "BTREE",
        fields: [
          { name: "sort_order" },
        ]
      },
    ]
  });
};
