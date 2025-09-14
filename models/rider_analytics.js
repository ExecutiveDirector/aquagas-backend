const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('rider_analytics', {
    analytics_id: {
      autoIncrement: true,
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    rider_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: {
        model: 'riders',
        key: 'rider_id'
      }
    },
    report_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    completed_deliveries: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    total_distance_km: {
      type: DataTypes.DECIMAL(8,2),
      allowNull: false,
      defaultValue: 0.00
    },
    total_delivery_time_minutes: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    online_time_minutes: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    total_earnings: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: false,
      defaultValue: 0.00
    },
    delivery_fees: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: false,
      defaultValue: 0.00
    },
    tips_received: {
      type: DataTypes.DECIMAL(8,2),
      allowNull: false,
      defaultValue: 0.00
    }
  }, {
    sequelize,
    tableName: 'rider_analytics',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "analytics_id" },
        ]
      },
      {
        name: "uk_rider_date",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "rider_id" },
          { name: "report_date" },
        ]
      },
      {
        name: "idx_rider",
        using: "BTREE",
        fields: [
          { name: "rider_id" },
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
