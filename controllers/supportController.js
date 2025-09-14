const initModels = require('../models/init-models');
const sequelize = require('../config/db');
const models = initModels(sequelize);

// -------------------------
// Support Tickets
// -------------------------
exports.createTicket = async (req, res, next) => {
  try {
    const { subject, description, category } = req.body;
    const userId = req.user.id;

    const ticket = await models.support_tickets.create({
      subject,
      description,
      category,
      status: 'open',
      user_id: userId,
    });

    res.status(201).json({
      message: 'Support ticket created successfully',
      data: ticket,
    });
  } catch (err) {
    next(err);
  }
};

exports.getUserTickets = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const tickets = await models.support_tickets.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
    });

    res.json(tickets);
  } catch (err) {
    next(err);
  }
};

exports.getTicketDetails = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const ticket = await models.support_tickets.findByPk(ticketId, {
      include: [{ model: models.support_messages, as: 'support_messages' }],
    });

    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    res.json(ticket);
  } catch (err) {
    next(err);
  }
};

// -------------------------
// Support Messages
// -------------------------
exports.addMessage = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const { message } = req.body;
    const userId = req.user.id;

    const ticket = await models.support_tickets.findByPk(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const newMessage = await models.support_messages.create({
      ticket_id: ticketId,
      user_id: userId,
      message,
    });

    res.status(201).json({
      message: 'Message added successfully',
      data: newMessage,
    });
  } catch (err) {
    next(err);
  }
};

exports.getTicketMessages = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const messages = await models.support_messages.findAll({
      where: { ticket_id: ticketId },
      order: [['created_at', 'ASC']],
    });

    res.json(messages);
  } catch (err) {
    next(err);
  }
};

// -------------------------
// FAQ & Help
// -------------------------
exports.getFAQ = async (req, res, next) => {
  try {
    const faqs = await models.support_tickets.findAll({
      where: { category: 'faq' },
      order: [['created_at', 'DESC']],
    });

    res.json(faqs);
  } catch (err) {
    next(err);
  }
};

exports.getHelpTopics = async (req, res, next) => {
  try {
    const topics = await models.support_tickets.findAll({
      attributes: ['category'],
      group: ['category'],
    });

    res.json(topics.map(t => t.category));
  } catch (err) {
    next(err);
  }
};
