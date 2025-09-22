const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('vendor_analytics', {
    analytics_id: {
      autoIncrement: true,
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    vendor_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: {
        model: 'vendors',
        key: 'vendor_id'
      }
    },
    report_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    completed_orders: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    total_revenue: {
      type: DataTypes.DECIMAL(12,2),
      allowNull: false,
      defaultValue: 0.00
    },
    average_preparation_time_minutes: {
      type: DataTypes.DECIMAL(8,2),
      allowNull: false,
      defaultValue: 0.00
    },
    average_rating: {
      type: DataTypes.DECIMAL(3,2),
      allowNull: false,
      defaultValue: 0.00
    },
    products_out_of_stock: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    low_stock_products: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    sequelize,
    tableName: 'vendor_analytics',
    timestamps: true,
    indexes: [
      // {
      //   name: "PRIMARY",
      //   unique: true,
      //   using: "BTREE",
      //   fields: [
      //     { name: "analytics_id" },
      //   ]
      // },
      {
        name: "uk_vendor_date",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "vendor_id" },
          { name: "report_date" },
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
        name: "idx_report_date",
        using: "BTREE",
        fields: [
          { name: "report_date" },
        ]
      },
    ]
  });
};
