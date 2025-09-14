const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('promotions', {
    promotion_id: {
      autoIncrement: true,
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    promotion_code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: "promotion_code"
    },
    promotion_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    discount_type: {
      type: DataTypes.ENUM('percentage','fixed_amount','free_delivery','buy_one_get_one'),
      allowNull: false
    },
    discount_value: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: false
    },
    maximum_discount: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: true,
      comment: "Cap for percentage discounts"
    },
    minimum_order_amount: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: false,
      defaultValue: 0.00
    },
    usage_limit_per_user: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      comment: "NULL = unlimited"
    },
    total_usage_limit: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      comment: "NULL = unlimited"
    },
    current_usage_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    valid_from: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
    },
    valid_to: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: "0000-00-00 00:00:00"
    },
    applicable_to_new_users_only: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0
    },
    applicable_products: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Specific product IDs (JSON)"
    },
    applicable_categories: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Specific category IDs (JSON)"
    },
    applicable_vendors: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Specific vendor IDs (JSON)"
    },
    excluded_products: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: " (JSON)"
    },
    applicable_regions: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Geographic restrictions (JSON)"
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 1
    },
    terms_and_conditions: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'promotions',
    hasTrigger: true,
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "promotion_id" },
        ]
      },
      {
        name: "promotion_code",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "promotion_code" },
        ]
      },
      {
        name: "idx_promotion_code",
        using: "BTREE",
        fields: [
          { name: "promotion_code" },
        ]
      },
      {
        name: "idx_validity",
        using: "BTREE",
        fields: [
          { name: "valid_from" },
          { name: "valid_to" },
        ]
      },
      {
        name: "idx_new_users_only",
        using: "BTREE",
        fields: [
          { name: "applicable_to_new_users_only" },
        ]
      },
    ]
  });
};
