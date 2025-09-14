exports.isEmail = (email) => /\S+@\S+\.\S+/.test(email);
exports.isPhoneNumber = (phone) => /^\d{10,15}$/.test(phone);
// utils/validation.js

// Middleware for user registration validation
exports.validateUserRegistration = (req, res, next) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password || !phone) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  if (!exports.isEmail(email)) {
    return res.status(400).json({ error: 'Invalid email.' });
  }
  if (!exports.isPhoneNumber(phone)) {
    return res.status(400).json({ error: 'Invalid phone number.' });
  }
  next();
};

// Middleware for user profile update validation
exports.validateUserUpdate = (req, res, next) => {
  const { name, phone } = req.body;
  if (phone && !exports.isPhoneNumber(phone)) {
    return res.status(400).json({ error: 'Invalid phone number.' });
  }
  next();
};

// Order validation
exports.validateOrderCreation = (req, res, next) => {
  
}