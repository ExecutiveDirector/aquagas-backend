const { verifyAccessToken } = require('../utils/encryption');

// ------------------------
// Authentication Middleware
// ------------------------
exports.authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Invalid authorization format' });

  try {
    const decoded = verifyAccessToken(token);
    console.log('Decoded token:', decoded);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('JWT verification error:', err.message);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// ------------------------
// Optional Authentication
// ------------------------
exports.optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return next();

  const token = authHeader.split(' ')[1];
  try {
    req.user = verifyAccessToken(token);
  } catch (err) {
    // ignore invalid/expired token → user stays unauthenticated
    console.log('Optional auth invalid token:', err.message);
  }
  next();
};

// ------------------------
// Generic Role-based Middleware
// ------------------------
const requireRole = (roles) => (req, res, next) => {
  if (!req.user) {
    console.log('No user in request');
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!req.user.role) {
    console.log('No role in user token:', req.user);
    return res.status(403).json({ error: 'No role found in token' });
  }

  if (!roles.includes(req.user.role)) {
    console.log(`Role ${req.user.role} not in required roles:`, roles);
    return res.status(403).json({ error: `Access denied. Required role(s): ${roles.join(', ')}` });
  }

  console.log(`Role check passed: ${req.user.role}`);
  next();
};

// ------------------------
// Generic Admin-SubRole Middleware
// ------------------------
const requireAdminSubRole = (subRoles) => (req, res, next) => {
  if (!req.user) {
    console.log('No user in request');
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'admin') {
    console.log(`User role ${req.user.role} is not admin`);
    return res.status(403).json({ error: 'Admin role required' });
  }

  // Super admin always allowed
  if (req.user.admin_role === 'super_admin') {
    console.log('Super admin access granted');
    return next();
  }

  if (!req.user.admin_role) {
    console.log('No admin_role in token:', req.user);
    return res.status(403).json({ error: 'Admin role not specified' });
  }

  if (!subRoles.includes(req.user.admin_role)) {
    console.log(`Admin role ${req.user.admin_role} not in required roles:`, subRoles);
    return res.status(403).json({
      error: `Access denied. Required admin role(s): ${subRoles.join(', ')}`
    });
  }

  console.log(`Admin subrole check passed: ${req.user.admin_role}`);
  next();
};

// ------------------------
// Permission-based Middleware
// ------------------------
const requirePermission = (permissions) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });

  // Super admin has all permissions
  if (req.user.role === 'admin' && req.user.admin_role === 'super_admin') {
    console.log('Super admin bypasses permission check');
    return next();
  }

  // Check permissions
  const userPermissions = req.user.permissions || [];
  const hasPermission = permissions.every((p) => userPermissions.includes(p));

  if (!hasPermission) {
    console.log(`User permissions ${userPermissions} insufficient for required ${permissions}`);
    return res.status(403).json({
      error: `Access denied. Required permission(s): ${permissions.join(', ')}`
    });
  }

  console.log(`Permission check passed: ${permissions}`);
  next();
};

// ------------------------
// Specific Role Exports
// ------------------------
exports.requireAdminRole = requireRole(['admin']);
exports.requireVendorRole = requireRole(['vendor']);
exports.requireRiderRole = requireRole(['rider']);
exports.requireUserRole = requireRole(['user']);
exports.requireAdminOrVendorRole = requireRole(['admin', 'vendor']);

// ------------------------
// Specific Admin-SubRole Exports
// ------------------------
exports.requireSuperAdmin = requireAdminSubRole(['super_admin']);
exports.requireFinanceAdmin = requireAdminSubRole(['finance_admin']);
exports.requireSupportAdmin = requireAdminSubRole(['support_admin']);
exports.requireOperationsAdmin = requireAdminSubRole(['operations_admin']);
exports.requireMarketingAdmin = requireAdminSubRole(['marketing_admin']);

// ------------------------
// Permission Export
// ------------------------
exports.requirePermission = requirePermission;