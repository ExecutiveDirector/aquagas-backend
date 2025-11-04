// ============================================
// services/emailService.js
// ============================================
const nodemailer = require('nodemailer');

// Configure your email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Send email to a user
 * @param {string} to - Recipient email address
 * @param {string} message - Email content
 * @param {string} subject - Email subject (optional)
 */
exports.sendEmail = async (to, message, subject = 'Notification') => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@yourapp.com',
      to,
      subject,
      html: message
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('Error sending email:', err.message);
    throw err;
  }
};