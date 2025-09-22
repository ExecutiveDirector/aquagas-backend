const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('rider_locations', {
    location_id: {
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
    latitude: {
      type: DataTypes.DECIMAL(10,8),
      allowNull: false
    },
    longitude: {
      type: DataTypes.DECIMAL(11,8),
      allowNull: false
    },
    location: {
      type: "POINT",
      allowNull: false
    },
    accuracy_meters: {
      type: DataTypes.DECIMAL(6,2),
      allowNull: true
    },
    speed_kmh: {
      type: DataTypes.DECIMAL(5,2),
      allowNull: true
    },
    heading_degrees: {
      type: DataTypes.DECIMAL(5,2),
      allowNull: true
    },
    is_current: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 1
    },
    recorded_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
    }
  }, {
    sequelize,
    tableName: 'rider_locations',
    timestamps: false,
    indexes: [
      // {
      //   name: "PRIMARY",
      //   unique: true,
      //   using: "BTREE",
      //   fields: [
      //     { name: "location_id" },
      //   ]
      // },
      {
        name: "idx_location",
        using: "BTREE",
        fields: [
          { name: "latitude" },
          { name: "longitude" },
        ]
      },
      {
        name: "idx_rider_current",
        using: "BTREE",
        fields: [
          { name: "rider_id" },
          { name: "is_current" },
        ]
      },
      {
        name: "idx_recorded_at",
        using: "BTREE",
        fields: [
          { name: "recorded_at" },
        ]
      },
    ]
  });
};
