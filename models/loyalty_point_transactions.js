const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('loyalty_point_transactions', {
    point_transaction_id: {
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
    transaction_type: {
      type: DataTypes.ENUM('earned','redeemed','expired','bonus','adjustment'),
      allowNull: false
    },
    points: {
      type: DataTypes.BIGINT,
      allowNull: false,
      comment: "Positive for earned, negative for redeemed"
    },
    previous_balance: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    new_balance: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    reference_type: {
      type: DataTypes.ENUM('order','referral','signup_bonus','review','admin_adjustment','expiry'),
      allowNull: true
    },
    reference_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "When these specific points expire"
    }
  }, {
    sequelize,
    tableName: 'loyalty_point_transactions',
    timestamps: true,
    indexes: [
      // {
      //   name: "PRIMARY",
      //   unique: true,
      //   using: "BTREE",
      //   fields: [
      //     { name: "point_transaction_id" },
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
        name: "idx_transaction_type",
        using: "BTREE",
        fields: [
          { name: "transaction_type" },
        ]
      },
      {
        name: "idx_created_at",
        using: "BTREE",
        fields: [
          { name: "created_at" },
        ]
      },
      {
        name: "idx_expires_at",
        using: "BTREE",
        fields: [
          { name: "expires_at" },
        ]
      },
    ]
  });
};
