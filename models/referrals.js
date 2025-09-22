const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('referrals', {
    referral_id: {
      autoIncrement: true,
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    referrer_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    referee_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    referral_code: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    referrer_reward_points: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    referee_reward_points: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    referrer_cash_reward: {
      type: DataTypes.DECIMAL(8,2),
      allowNull: false,
      defaultValue: 0.00
    },
    referee_cash_reward: {
      type: DataTypes.DECIMAL(8,2),
      allowNull: false,
      defaultValue: 0.00
    },
    status: {
      type: DataTypes.ENUM('pending','qualified','rewarded','expired'),
      allowNull: false,
      defaultValue: "pending"
    },
    referred_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
    },
    qualified_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "When referee made first order"
    },
    rewarded_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    qualification_order_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      references: {
        model: 'orders',
        key: 'order_id'
      }
    },
    qualification_deadline: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'referrals',
    timestamps: false,
    indexes: [
      // {
      //   name: "PRIMARY",
      //   unique: true,
      //   using: "BTREE",
      //   fields: [
      //     { name: "referral_id" },
      //   ]
      // },
      {
        name: "uk_referrer_referee",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "referrer_id" },
          { name: "referee_id" },
        ]
      },
      {
        name: "qualification_order_id",
        using: "BTREE",
        fields: [
          { name: "qualification_order_id" },
        ]
      },
      {
        name: "idx_referrer",
        using: "BTREE",
        fields: [
          { name: "referrer_id" },
        ]
      },
      {
        name: "idx_referee",
        using: "BTREE",
        fields: [
          { name: "referee_id" },
        ]
      },
      {
        name: "idx_referral_code",
        using: "BTREE",
        fields: [
          { name: "referral_code" },
        ]
      },
    ]
  });
};
