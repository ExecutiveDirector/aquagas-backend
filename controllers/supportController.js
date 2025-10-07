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
// Support Tickets
// -------------------------
// exports.createTicket = async (req, res, next) => {
//   try {
//     const { subject, description, category, priority, related_order_id, attachments } = req.body;
//     const userId = req.user.id;

//     // Generate ticket number
//     const ticketCount = await models.support_tickets.count();
//     const ticketNumber = `TKT${String(ticketCount + 1).padStart(6, '0')}`;

//     const ticket = await models.support_tickets.create({
//       user_id: userId,
//       ticket_number: ticketNumber,
//       subject,
//       description,
//       category: category || 'other',
//       priority: priority || 'medium',
//       status: 'open',
//       related_order_id: related_order_id || null,
//       attachments: attachments ? JSON.stringify(attachments) : null,
//     });

//     res.status(201).json({
//       message: 'Support ticket created successfully',
//       data: ticket,
//     });
//   } catch (err) {
//     next(err);
//   }
// };

// exports.getUserTickets = async (req, res, next) => {
//   try {
//     const userId = req.user.id;
//     const { status, priority, category } = req.query;

//     const where = { user_id: userId };
//     if (status) where.status = status;
//     if (priority) where.priority = priority;
//     if (category) where.category = category;

//     const tickets = await models.support_tickets.findAll({
//       where,
//       include: [
//         {
//           model: models.support_messages,
//           as: 'support_messages',
//           order: [['sent_at', 'ASC']]
//         }
//       ],
//       order: [['created_at', 'DESC']],
//     });

//     res.json(tickets);
//   } catch (err) {
//     next(err);
//   }
// };

exports.getAllTickets = async (req, res, next) => {
  try {
    const { status, priority, category, user_id, vendor_id } = req.query;

    const where = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;
    if (user_id) where.user_id = user_id;
    if (vendor_id) where.vendor_id = vendor_id;

    const tickets = await models.support_tickets.findAll({
      where,
      include: [
        {
          model: models.support_messages,
          as: 'support_messages',
          order: [['sent_at', 'ASC']]
        },
        {
          model: models.users,
          as: 'user',
          attributes: ['user_id', 'first_name', 'last_name']
        }
      ],
      order: [['created_at', 'DESC']],
    });

    res.json(tickets);
  } catch (err) {
    next(err);
  }
};

// exports.getTicketDetails = async (req, res, next) => {
//   try {
//     const { ticketId } = req.params;
//     const ticket = await models.support_tickets.findByPk(ticketId, {
//       include: [
//         {
//           model: models.support_messages,
//           as: 'support_messages',
//           order: [['sent_at', 'ASC']]
//         }
//       ],
//     });

//     if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

//     res.json(ticket);
//   } catch (err) {
//     next(err);
//   }
// };

exports.updateTicketStatus = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const { status } = req.body;

    const ticket = await models.support_tickets.findByPk(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const updateData = { status, updated_at: new Date() };

    if (status === 'resolved') {
      updateData.resolved_at = new Date();
      // Calculate resolution time
      const createdAt = new Date(ticket.created_at);
      const resolvedAt = new Date();
      const resolutionTimeHours = Math.round((resolvedAt - createdAt) / (1000 * 60 * 60));
      updateData.resolution_time_hours = resolutionTimeHours;
    } else if (status === 'closed') {
      updateData.closed_at = new Date();
    }

    await ticket.update(updateData);

    res.json({
      message: 'Ticket status updated successfully',
      data: ticket,
    });
  } catch (err) {
    next(err);
  }
};

exports.assignTicket = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const { assigned_admin_id } = req.body;

    const ticket = await models.support_tickets.findByPk(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    await ticket.update({ assigned_admin_id, updated_at: new Date() });

    res.json({
      message: 'Ticket assigned successfully',
      data: ticket,
    });
  } catch (err) {
    next(err);
  }
};

exports.rateTicket = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const { customer_satisfaction_rating } = req.body;

    if (customer_satisfaction_rating < 1 || customer_satisfaction_rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const ticket = await models.support_tickets.findByPk(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    await ticket.update({ customer_satisfaction_rating, updated_at: new Date() });

    res.json({
      message: 'Rating submitted successfully',
      data: ticket,
    });
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
// GET /api/support/faq - Get all FAQs (with optional category filter)
// POST /api/support/faq/:id/helpful - Increment helpful count for FAQ
// const initModels = require('../models/init-models');
// const sequelize = require('../config/db');
// const models = initModels(sequelize);


// -------------------------
// Support Messages
// // -------------------------
// exports.addMessage = async (req, res, next) => {
//   try {
//     const { ticketId } = req.params;
//     const { message_text, message_type, attachments } = req.body;
//     const userId = req.user.id;

//     const ticket = await models.support_tickets.findByPk(ticketId);
//     if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

//     // Determine sender details
//     let senderType = 'user';
//     let senderName = 'User';
    
//     if (req.user.role === 'admin') {
//       senderType = 'admin';
//       senderName = req.user.name || 'Admin';
//     } else if (req.user.role === 'rider') {
//       senderType = 'rider';
//       senderName = req.user.name || 'Rider';
//     } else if (req.user.role === 'vendor') {
//       senderType = 'vendor';
//       senderName = req.user.name || 'Vendor';
//     }

//     const newMessage = await models.support_messages.create({
//       ticket_id: ticketId,
//       sender_type: senderType,
//       sender_id: userId,
//       sender_name: senderName,
//       message_text,
//       message_type: message_type || 'text',
//       attachments: attachments ? JSON.stringify(attachments) : null,
//       is_internal: false,
//     });

//     // Update ticket status if it was closed/resolved
//     if (ticket.status === 'closed' || ticket.status === 'resolved') {
//       await ticket.update({ status: 'in_progress', updated_at: new Date() });
//     }

//     res.status(201).json({
//       message: 'Message added successfully',
//       data: newMessage,
//     });
//   } catch (err) {
//     next(err);
//   }
// };

// exports.getTicketMessages = async (req, res, next) => {
//   try {
//     const { ticketId } = req.params;
//     const messages = await models.support_messages.findAll({
//       where: { 
//         ticket_id: ticketId,
//         is_internal: false // Only show public messages to users
//       },
//       order: [['sent_at', 'ASC']],
//     });

//     res.json(messages);
//   } catch (err) {
//     next(err);
//   }
// };

// -------------------------
// FAQ Management
// -------------------------
// exports.getFAQs = async (req, res, next) => {
//   try {
//     const { category } = req.query;

//     // Since we don't have a dedicated FAQ table, we'll create a mock response
//     // In a real implementation, you'd create a separate FAQ table
//     const mockFAQs = [
//       {
//         id: 1,
//         question: "How do I track my order?",
//         answer: "You can track your order by going to 'My Orders' in your account dashboard. You'll see real-time updates on your order status and delivery progress.",
//         category: "orders",
//         helpful_count: 45
//       },
//       {
//         id: 2,
//         question: "What payment methods do you accept?",
//         answer: "We accept all major credit cards, mobile money (M-Pesa, Airtel Money), and cash on delivery. You can also use your wallet balance for payments.",
//         category: "payment",
//         helpful_count: 38
//       },
//       {
//         id: 3,
//         question: "How long does delivery take?",
//         answer: "Standard delivery usually takes 30-60 minutes depending on your location and the vendor. Express delivery is available for faster service.",
//         category: "delivery",
//         helpful_count: 52
//       },
//       {
//         id: 4,
//         question: "Can I cancel my order?",
//         answer: "You can cancel your order within 5 minutes of placing it. After that, please contact support for cancellation requests.",
//         category: "orders",
//         helpful_count: 29
//       },
//       {
//         id: 5,
//         question: "How do I report a problem with my order?",
//         answer: "You can report issues by creating a support ticket, calling our helpline, or using the live chat feature. Include your order number for faster assistance.",
//         category: "support",
//         helpful_count: 33
//       }
//     ];

//     let filteredFAQs = mockFAQs;
//     if (category) {
//       filteredFAQs = mockFAQs.filter(faq => faq.category === category);
//     }

//     res.json(filteredFAQs);
//   } catch (err) {
//     next(err);
//   }
// };

// -------------------------
// Knowledge Base
// -------------------------
exports.getKnowledgeBase = async (req, res, next) => {
  try {
    const { category, search } = req.query;

    // Mock knowledge base articles
    const mockKnowledgeBase = [
      {
        id: 1,
        title: "Getting Started with Your Account",
        content: "Learn how to set up your account, add payment methods, and start ordering from your favorite vendors.",
        category: "getting-started",
        views: 1250,
        helpful_votes: 89,
        tags: ["account", "setup", "getting-started"],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 2,
        title: "Understanding Delivery Zones",
        content: "Find out which areas we deliver to and how delivery zones affect your order timing and fees.",
        category: "delivery",
        views: 987,
        helpful_votes: 72,
        tags: ["delivery", "zones", "areas"],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 3,
        title: "Wallet and Payment Guide",
        content: "Complete guide to managing your wallet, adding funds, and using different payment methods.",
        category: "payment",
        views: 1456,
        helpful_votes: 112,
        tags: ["wallet", "payment", "money"],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 4,
        title: "Troubleshooting Order Issues",
        content: "Common solutions for order problems including wrong items, late deliveries, and payment issues.",
        category: "troubleshooting",
        views: 834,
        helpful_votes: 67,
        tags: ["orders", "problems", "solutions"],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    let filteredArticles = mockKnowledgeBase;

    if (category) {
      filteredArticles = filteredArticles.filter(article => article.category === category);
    }

    if (search) {
      const searchTerm = search.toLowerCase();
      filteredArticles = filteredArticles.filter(article =>
        article.title.toLowerCase().includes(searchTerm) ||
        article.content.toLowerCase().includes(searchTerm) ||
        article.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    res.json(filteredArticles);
  } catch (err) {
    next(err);
  }
};

// exports.getHelpTopics = async (req, res, next) => {
//   try {
//     const topics = [
//       'getting-started',
//       'orders',
//       'payment',
//       'delivery',
//       'account',
//       'troubleshooting',
//       'vendor',
//       'rider'
//     ];

//     res.json(topics);
//   } catch (err) {
//     next(err);
//   }
// };

// -------------------------
// Support Statistics
// -------------------------
exports.getSupportStats = async (req, res, next) => {
  try {
    const [
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      closedTickets
    ] = await Promise.all([
      models.support_tickets.count(),
      models.support_tickets.count({ where: { status: 'open' } }),
      models.support_tickets.count({ where: { status: 'in_progress' } }),
      models.support_tickets.count({ where: { status: 'resolved' } }),
      models.support_tickets.count({ where: { status: 'closed' } })
    ]);

    // Get average resolution time
    const resolvedTicketsWithTime = await models.support_tickets.findAll({
      where: { 
        resolution_time_hours: { [models.Sequelize.Op.not]: null }
      },
      attributes: ['resolution_time_hours']
    });

    const avgResolutionTime = resolvedTicketsWithTime.length > 0
      ? resolvedTicketsWithTime.reduce((sum, ticket) => sum + ticket.resolution_time_hours, 0) / resolvedTicketsWithTime.length
      : 0;

    // Get average satisfaction rating
    const ratedTickets = await models.support_tickets.findAll({
      where: { 
        customer_satisfaction_rating: { [models.Sequelize.Op.not]: null }
      },
      attributes: ['customer_satisfaction_rating']
    });

    const avgSatisfactionRating = ratedTickets.length > 0
      ? ratedTickets.reduce((sum, ticket) => sum + ticket.customer_satisfaction_rating, 0) / ratedTickets.length
      : 0;

    // Get tickets by category
    const ticketsByCategory = await models.support_tickets.findAll({
      attributes: [
        'category',
        [models.Sequelize.fn('COUNT', models.Sequelize.col('category')), 'count']
      ],
      group: ['category']
    });

    // Get tickets by priority
    const ticketsByPriority = await models.support_tickets.findAll({
      attributes: [
        'priority',
        [models.Sequelize.fn('COUNT', models.Sequelize.col('priority')), 'count']
      ],
      group: ['priority']
    });

    const categoryStats = {};
    ticketsByCategory.forEach(item => {
      categoryStats[item.category] = parseInt(item.dataValues.count);
    });

    const priorityStats = {};
    ticketsByPriority.forEach(item => {
      priorityStats[item.priority] = parseInt(item.dataValues.count);
    });

    res.json({
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      closedTickets,
      avgResolutionTime: Math.round(avgResolutionTime),
      avgSatisfactionRating: Number(avgSatisfactionRating.toFixed(1)),
      ticketsByCategory: categoryStats,
      ticketsByPriority: priorityStats
    });
  } catch (err) {
    next(err);
  }
};