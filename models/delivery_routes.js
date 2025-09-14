const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('delivery_routes', {
    route_id: {
      autoIncrement: true,
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    assignment_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: {
        model: 'delivery_assignments',
        key: 'assignment_id'
      }
    },
    route_points: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: "Array of lat\/lng coordinates (JSON)"
    },
    estimated_duration_minutes: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    estimated_distance_km: {
      type: DataTypes.DECIMAL(6,2),
      allowNull: false
    },
    traffic_conditions: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: " (JSON)"
    },
    route_optimization_version: {
      type: DataTypes.STRING(50),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'delivery_routes',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "route_id" },
        ]
      },
      {
        name: "idx_assignment",
        using: "BTREE",
        fields: [
          { name: "assignment_id" },
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
