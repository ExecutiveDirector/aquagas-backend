const { verifyAccessToken } = require('../utils/encryption');

// ------------------------
// Authentication Middleware
// ------------------------
exports.authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    console.log('No authorization header provided');
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    console.log('Invalid authorization format:', authHeader);
    return res.status(401).json({ error: 'Invalid authorization format' });
  }

  try {
    const decoded = verifyAccessToken(token);
    console.log('Token verified successfully:', {
      account_id: decoded.account_id || decoded.id,
      role: decoded.role,
      admin_role: decoded.admin_role
    });
    
    // Normalize the user object to handle different token formats
    req.user = {
      account_id: decoded.account_id || decoded.id,
      id: decoded.account_id || decoded.id,
      role: decoded.role,
      admin_role: decoded.admin_role || null,
      user_id: decoded.user_id,
      vendor_id: decoded.vendor_id,
      rider_id: decoded.rider_id,
      admin_id: decoded.admin_id,
      permissions: decoded.permissions || [],
      ...decoded
    };
    
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
  if (!token) return next();

  try {
    const decoded = verifyAccessToken(token);
    req.user = {
      account_id: decoded.account_id || decoded.id,
      id: decoded.account_id || decoded.id,
      role: decoded.role,
      admin_role: decoded.admin_role || null,
      user_id: decoded.user_id,
      vendor_id: decoded.vendor_id,
      rider_id: decoded.rider_id,
      admin_id: decoded.admin_id,
      permissions: decoded.permissions || [],
      ...decoded
    };
  } catch (err) {
    console.log('Optional auth invalid token:', err.message);
    // Continue without authentication
  }
  next();
};

// ------------------------
// Generic Role-based Middleware
// ------------------------
const requireRole = (roles) => (req, res, next) => {
  if (!req.user) {
    console.log('No user in request - authentication required');
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!req.user.role) {
    console.log('No role in user token:', req.user);
    return res.status(403).json({ error: 'No role found in token' });
  }

  if (!roles.includes(req.user.role)) {
    console.log(`Access denied: User role '${req.user.role}' not in required roles: ${roles.join(', ')}`);
    return res.status(403).json({ 
      error: `Access denied. Required role(s): ${roles.join(', ')}`,
      userRole: req.user.role
    });
  }

  console.log(`Role check passed: ${req.user.role}`);
  next();
};

// ------------------------
// Generic Admin-SubRole Middleware
// ------------------------
const requireAdminSubRole = (subRoles) => (req, res, next) => {
  if (!req.user) {
    console.log('No user in request - authentication required');
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'admin') {
    console.log(`Access denied: User role '${req.user.role}' is not admin`);
    return res.status(403).json({ 
      error: 'Admin role required',
      userRole: req.user.role
    });
  }

  // Super admin always allowed
  if (req.user.admin_role === 'super_admin') {
    console.log('Super admin access granted');
    return next();
  }

  if (!req.user.admin_role) {
    console.log('No admin_role in token:', req.user);
    return res.status(403).json({ 
      error: 'Admin role not specified. Contact system administrator.' 
    });
  }

  if (!subRoles.includes(req.user.admin_role)) {
    console.log(`Access denied: Admin role '${req.user.admin_role}' not in required roles: ${subRoles.join(', ')}`);
    return res.status(403).json({
      error: `Access denied. Required admin role(s): ${subRoles.join(', ')}`,
      userAdminRole: req.user.admin_role
    });
  }

  console.log(`Admin subrole check passed: ${req.user.admin_role}`);
  next();
};

// ------------------------
// Permission-based Middleware
// ------------------------
const requirePermission = (permissions) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Super admin has all permissions
  if (req.user.role === 'admin' && req.user.admin_role === 'super_admin') {
    console.log('Super admin bypasses permission check');
    return next();
  }

  // Check permissions
  const userPermissions = req.user.permissions || [];
  const hasPermission = permissions.every((p) => userPermissions.includes(p));

  if (!hasPermission) {
    console.log(`Permission denied: User permissions [${userPermissions.join(', ')}] insufficient for required [${permissions.join(', ')}]`);
    return res.status(403).json({
      error: `Access denied. Required permission(s): ${permissions.join(', ')}`,
      userPermissions
    });
  }

  console.log(`Permission check passed: [${permissions.join(', ')}]`);
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
// Flexible Admin Middleware - allows any admin
// ------------------------
exports.requireAnyAdmin = (req, res, next) => {
  if (!req.user) {
    console.log('No user in request - authentication required');
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'admin') {
    console.log(`Access denied: User role '${req.user.role}' is not admin`);
    return res.status(403).json({ 
      error: 'Admin role required',
      userRole: req.user.role
    });
  }

  console.log(`Any admin access granted: role=${req.user.role}, admin_role=${req.user.admin_role}`);
  next();
};

// ------------------------
// Specific Admin-SubRole Exports
// ------------------------
exports.requireSuperAdmin = requireAdminSubRole(['super_admin']);
exports.requireFinanceAdmin = requireAdminSubRole(['finance_admin', 'super_admin']);
exports.requireSupportAdmin = requireAdminSubRole(['support_admin', 'super_admin']);
exports.requireOperationsAdmin = requireAdminSubRole(['operations_admin', 'super_admin']);
exports.requireMarketingAdmin = requireAdminSubRole(['marketing_admin', 'super_admin']);

// ------------------------
// Permission Export
// ------------------------
exports.requirePermission = requirePermission;