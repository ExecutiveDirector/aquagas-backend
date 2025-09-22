const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('payment_methods', {
    method_id: {
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
    method_type: {
      type: DataTypes.ENUM('mpesa','card','bank_account','wallet'),
      allowNull: false
    },
    display_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    card_last_four: {
      type: DataTypes.CHAR(4),
      allowNull: true
    },
    card_brand: {
      type: DataTypes.ENUM('visa','mastercard','amex'),
      allowNull: true
    },
    card_expiry_month: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: true
    },
    card_expiry_year: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: true
    },
    mpesa_phone_number: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    bank_name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    account_number_masked: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    is_default: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 1
    }
  }, {
    sequelize,
    tableName: 'payment_methods',
    timestamps: true,
    indexes: [
      // {
      //   name: "PRIMARY",
      //   unique: true,
      //   using: "BTREE",
      //   fields: [
      //     { name: "method_id" },
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
        name: "idx_user_default",
        using: "BTREE",
        fields: [
          { name: "user_id" },
          { name: "is_default" },
        ]
      },
      {
        name: "idx_method_type",
        using: "BTREE",
        fields: [
          { name: "method_type" },
        ]
      },
    ]
  });
};
