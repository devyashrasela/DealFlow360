import jwt from 'jsonwebtoken';
import { User, OrganizationMembership, Organization } from '../models/index.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication token missing or invalid' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.sub);
    
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      full_name: user.full_name
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const resolveOrgContext = async (req, res, next) => {
  try {
    const organizationId = req.headers['x-organization-id'];
    
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID header is required' });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const organization = await Organization.findOne({
      where: {
        id: organizationId,
        is_active: true
      }
    });

    if (!organization) {
      return res.status(403).json({ error: 'No active membership in this organization' });
    }

    const membership = await OrganizationMembership.findOne({
      where: {
        user_id: req.user.id,
        organization_id: organizationId,
        status: 'active'
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'No active membership in this organization' });
    }

    req.orgContext = {
      organizationId: organizationId,
      membership: {
        id: membership.id,
        role: membership.role,
        employee_identifier: membership.employee_identifier
      }
    };

    next();
  } catch (error) {
    console.error('Org context resolution error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const requireRoles = (...allowedRoles) => {
  const flattenedRoles = allowedRoles.flat();
  return (req, res, next) => {
    if (!req.orgContext || !req.orgContext.membership) {
      return res.status(403).json({ error: 'Organization context required' });
    }

    if (!flattenedRoles.includes(req.orgContext.membership.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

export const requireAnyRole = (req, res, next) => {
  if (!req.orgContext || !req.orgContext.membership) {
    return res.status(403).json({ error: 'Organization context required' });
  }
  
  next();
};
