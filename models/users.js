const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('users', {
    user_id: {
      autoIncrement: true,
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    account_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: {
        model: 'auth_accounts',
        key: 'account_id'
      },
      unique: "users_ibfk_1"
    },
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    phone_number: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    date_of_birth: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    avatar_url: {
      type: DataTypes.STRING(512),
      allowNull: true
    },
    preferred_payment: {
      type: DataTypes.ENUM('mpesa','card','cash','wallet'),
      allowNull: true,
      defaultValue: "mpesa"
    },
    preferred_language: {
      type: DataTypes.ENUM('en','sw','fr','ar'),
      allowNull: true,
      defaultValue: "en"
    },
    loyalty_points: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    total_orders: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    total_spent: {
      type: DataTypes.DECIMAL(12,2),
      allowNull: false,
      defaultValue: 0.00
    },
    is_premium: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0
    },
    referral_code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: "referral_code"
    },
    referred_by_code: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    notification_preferences: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Push, SMS, Email preferences (JSON)"
    },
    privacy_settings: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Data sharing preferences (JSON)"
    }
  }, {
    sequelize,
    tableName: 'users',
    hasTrigger: true,
    timestamps: true,
    indexes: [
      // {
      //   name: "PRIMARY",
      //   unique: true,
      //   using: "BTREE",
      //   fields: [
      //     { name: "user_id" },
      //   ]
      // },
      {
        name: "account_id",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "account_id" },
        ]
      },
      {
        name: "referral_code",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "referral_code" },
        ]
      },
      {
        name: "idx_referral_code",
        using: "BTREE",
        fields: [
          { name: "referral_code" },
        ]
      },
      {
        name: "idx_referred_by",
        using: "BTREE",
        fields: [
          { name: "referred_by_code" },
        ]
      },
      {
        name: "idx_premium",
        using: "BTREE",
        fields: [
          { name: "is_premium" },
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
