const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('delivery_assignments', {
    assignment_id: {
      autoIncrement: true,
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    order_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: {
        model: 'orders',
        key: 'order_id'
      }
    },
    rider_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      references: {
        model: 'riders',
        key: 'rider_id'
      }
    },
    assignment_type: {
      type: DataTypes.ENUM('auto','manual','rider_claimed'),
      allowNull: false,
      defaultValue: "auto"
    },
    assignment_status: {
      type: DataTypes.ENUM('pending','accepted','rejected','cancelled','completed'),
      allowNull: false,
      defaultValue: "pending"
    },
    assigned_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
    },
    accepted_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    pickup_time: {
      type: DataTypes.DATE,
      allowNull: true
    },
    delivered_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    pickup_latitude: {
      type: DataTypes.DECIMAL(10,8),
      allowNull: true
    },
    pickup_longitude: {
      type: DataTypes.DECIMAL(11,8),
      allowNull: true
    },
    pickup_location: {
      type: "POINT",
      allowNull: true
    },
    current_latitude: {
      type: DataTypes.DECIMAL(10,8),
      allowNull: true
    },
    current_longitude: {
      type: DataTypes.DECIMAL(11,8),
      allowNull: true
    },
    current_location: {
      type: "POINT",
      allowNull: true
    },
    estimated_distance_km: {
      type: DataTypes.DECIMAL(6,2),
      allowNull: true
    },
    estimated_duration_minutes: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    rider_earnings: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: true,
      comment: "Amount earned by rider for this delivery"
    },
    actual_duration_minutes: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    delivery_notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    rating_by_customer: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'delivery_assignments',
    hasTrigger: true,
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "assignment_id" },
        ]
      },
      {
        name: "idx_order_id",
        using: "BTREE",
        fields: [
          { name: "order_id" },
        ]
      },
      {
        name: "idx_rider_id",
        using: "BTREE",
        fields: [
          { name: "rider_id" },
        ]
      },
      {
        name: "idx_status",
        using: "BTREE",
        fields: [
          { name: "assignment_status" },
        ]
      },
      {
        name: "idx_pickup_location",
        using: "BTREE",
        fields: [
          { name: "pickup_location", length: 25 },
        ]
      },
      {
        name: "idx_current_location",
        using: "BTREE",
        fields: [
          { name: "current_location", length: 25 },
        ]
      },
    ]
  });
};
