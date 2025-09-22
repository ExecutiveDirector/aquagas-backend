const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('notifications', {
    notification_id: {
      autoIncrement: true,
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
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
    vendor_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      references: {
        model: 'vendors',
        key: 'vendor_id'
      }
    },
    admin_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      references: {
        model: 'admin_users',
        key: 'admin_id'
      }
    },
    notification_type: {
      type: DataTypes.ENUM('order_update','delivery_update','payment_update','promotional','system_alert','reminder'),
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    action_url: {
      type: DataTypes.STRING(512),
      allowNull: true
    },
    send_push: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 1
    },
    send_sms: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0
    },
    send_email: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0
    },
    send_in_app: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 1
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0
    },
    is_sent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0
    },
    sent_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    read_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    priority: {
      type: DataTypes.ENUM('low','normal','high'),
      allowNull: false,
      defaultValue: "normal"
    },
    related_entity_type: {
      type: DataTypes.ENUM('order','delivery','payment','user','vendor'),
      allowNull: true
    },
    related_entity_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    template_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      references: {
        model: 'notification_templates',
        key: 'template_id'
      }
    }
  }, {
    sequelize,
    tableName: 'notifications',
    timestamps: true,
    indexes: [
      // {
      //   name: "PRIMARY",
      //   unique: true,
      //   using: "BTREE",
      //   fields: [
      //     { name: "notification_id" },
      //   ]
      // },
      {
        name: "admin_id",
        using: "BTREE",
        fields: [
          { name: "admin_id" },
        ]
      },
      {
        name: "template_id",
        using: "BTREE",
        fields: [
          { name: "template_id" },
        ]
      },
      {
        name: "idx_user_unread",
        using: "BTREE",
        fields: [
          { name: "user_id" },
          { name: "is_read" },
        ]
      },
      {
        name: "idx_rider_unread",
        using: "BTREE",
        fields: [
          { name: "rider_id" },
          { name: "is_read" },
        ]
      },
      {
        name: "idx_vendor_unread",
        using: "BTREE",
        fields: [
          { name: "vendor_id" },
          { name: "is_read" },
        ]
      },
      {
        name: "idx_notification_type",
        using: "BTREE",
        fields: [
          { name: "notification_type" },
        ]
      },
      {
        name: "idx_priority",
        using: "BTREE",
        fields: [
          { name: "priority" },
        ]
      },
      {
        name: "idx_related_entity",
        using: "BTREE",
        fields: [
          { name: "related_entity_type" },
          { name: "related_entity_id" },
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
