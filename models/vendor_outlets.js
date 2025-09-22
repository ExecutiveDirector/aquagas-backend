const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('vendor_outlets', {
    outlet_id: {
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
    outlet_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    outlet_code: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    address_line_1: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    address_line_2: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    county: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    postal_code: {
      type: DataTypes.STRING(20),
      allowNull: true
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
    contact_phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    manager_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    operating_hours: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Daily operating hours (JSON)"
    },
    facilities: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Available facilities\/services (JSON)"
    }
  }, {
    sequelize,
    tableName: 'vendor_outlets',
    timestamps: true,
    indexes: [
      // {
      //   name: "PRIMARY",
      //   unique: true,
      //   using: "BTREE",
      //   fields: [
      //     { name: "outlet_id" },
      //   ]
      // },
      {
        name: "uk_vendor_outlet_code",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "vendor_id" },
          { name: "outlet_code" },
        ]
      },
      {
        name: "idx_location",
        using: "BTREE",
        fields: [
          { name: "latitude" },
          { name: "longitude" },
        ]
      },
      {
        name: "idx_vendor",
        using: "BTREE",
        fields: [
          { name: "vendor_id" },
        ]
      },
    ]
  });
};
