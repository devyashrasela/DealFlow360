import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// Generic JWT verifier — attaches req.user = { id, role, organization_id, customer_account_id? }
export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Customer-portal-only guard: role must be customer_portal
export function requireCustomerPortal(req, res, next) {
  if (req.user?.role !== 'customer_portal') {
    return res.status(403).json({ error: 'Customer portal access only' });
  }
  next();
}

// Internal roles guard (admin, sales_manager, sales_rep, finance_ops)
export function requireInternal(...allowed) {
  return (req, res, next) => {
    if (!allowed.includes(req.user?.role)) {
      return res.status(403).json({ error: `Requires role: ${allowed.join('|')}` });
    }
    next();
  };
}

// Utility: generate token (used by seed + future auth controller)
export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}
