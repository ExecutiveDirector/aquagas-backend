const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('support_messages', {
    message_id: {
      autoIncrement: true,
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    ticket_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: {
        model: 'support_tickets',
        key: 'ticket_id'
      }
    },
    sender_type: {
      type: DataTypes.ENUM('user','rider','vendor','admin','system'),
      allowNull: false
    },
    sender_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    sender_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    message_text: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    message_type: {
      type: DataTypes.BLOB,
      allowNull: false,
      defaultValue: "text"
    },
    attachments: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: " (JSON)"
    },
    is_internal: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0,
      comment: "Internal admin notes"
    },
    sent_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
    }
  }, {
    sequelize,
    tableName: 'support_messages',
    timestamps: false,
    indexes: [
      // {
      //   name: "PRIMARY",
      //   unique: true,
      //   using: "BTREE",
      //   fields: [
      //     { name: "message_id" },
      //   ]
      // },
      {
        name: "idx_ticket",
        using: "BTREE",
        fields: [
          { name: "ticket_id" },
        ]
      },
      {
        name: "idx_sender",
        using: "BTREE",
        fields: [
          { name: "sender_type" },
          { name: "sender_id" },
        ]
      },
      {
        name: "idx_sent_at",
        using: "BTREE",
        fields: [
          { name: "sent_at" },
        ]
      },
      {
        name: "idx_internal",
        using: "BTREE",
        fields: [
          { name: "is_internal" },
        ]
      },
    ]
  });
};
