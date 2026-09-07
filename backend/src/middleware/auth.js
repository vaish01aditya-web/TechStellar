const jwt = require('jsonwebtoken');
const prisma = require('../config/prismaClient');

/**
 * Verifies the JWT on every protected route and attaches the current user
 * (re-fetched from the DB, not just trusted from the token payload) to
 * req.user. Re-fetching means a deactivated user is locked out immediately
 * rather than waiting for their token to expire.
 */
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or deactivated' });
    }

    req.user = { id: user.id, email: user.email, role: user.role, fullName: user.fullName };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * RBAC guard. Usage: requireRole('ADMIN'), requireRole('ADMIN', 'REVIEWER')
 * Role is always read from req.user, which was populated server-side from
 * the DB in requireAuth — never trust a role claim from the client.
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `This action requires one of the following roles: ${allowedRoles.join(', ')}`,
      });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
