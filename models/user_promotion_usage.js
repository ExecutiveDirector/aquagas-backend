const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('user_promotion_usage', {
    usage_id: {
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
    promotion_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: {
        model: 'promotions',
        key: 'promotion_id'
      }
    },
    order_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      references: {
        model: 'orders',
        key: 'order_id'
      }
    },
    usage_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1
    },
    discount_amount: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: false
    },
    used_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
    }
  }, {
    sequelize,
    tableName: 'user_promotion_usage',
    timestamps: false,
    indexes: [
      // {
      //   name: "PRIMARY",
      //   unique: true,
      //   using: "BTREE",
      //   fields: [
      //     { name: "usage_id" },
      //   ]
      // },
      {
        name: "promotion_id",
        using: "BTREE",
        fields: [
          { name: "promotion_id" },
        ]
      },
      {
        name: "order_id",
        using: "BTREE",
        fields: [
          { name: "order_id" },
        ]
      },
      {
        name: "idx_user_promotion",
        using: "BTREE",
        fields: [
          { name: "user_id" },
          { name: "promotion_id" },
        ]
      },
      {
        name: "idx_used_at",
        using: "BTREE",
        fields: [
          { name: "used_at" },
        ]
      },
    ]
  });
};
