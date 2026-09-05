import jwt from 'jsonwebtoken';
import { User, OrganizationMembership, Organization } from '../models/index.js';
import { OrganizationRelationship, RelationshipAssignment } from '../models/session.models.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// ── 1. JWT Verification + live user check ─────────────────────────────────────
// Attaches req.user = { id, email, full_name }
// Dynamic check: re-fetches user from DB each request — enables immediate revocation (FR-1.2)
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer '))
      return res.status(401).json({ error: 'Authentication token missing or invalid' });

    const token = authHeader.slice(7);
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Dynamic DB lookup — not cached — so revoked memberships propagate instantly
    const user = await User.findByPk(decoded.sub);
    if (!user || !user.is_active)
      return res.status(401).json({ error: 'User not found or inactive' });

    req.user = { id: user.id, email: user.email, full_name: user.full_name };
    next();
  } catch (err) {
    console.error('Authentication error:', err);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const resolveOrgContext = async (req, res, next) => {
  try {
    let organizationId = req.headers['x-organization-id'];
    const customerAccountId = req.headers['x-customer-account-id'];

    if (!organizationId && customerAccountId) {
      const account = await CustomerAccount.findByPk(customerAccountId);
      if (account) {
        organizationId = account.provider_organization_id;
      }
    }

    if (!organizationId)
      return res.status(400).json({ error: 'Organization ID header is required' });

    if (!req.user?.id)
      return res.status(401).json({ error: 'Authentication required' });

    const organization = await Organization.findOne({ where: { id: organizationId, is_active: true } });
    if (!organization)
      return res.status(403).json({ error: 'Organization not found or inactive' });

    let membership = await OrganizationMembership.findOne({
      where: { user_id: req.user.id, organization_id: organizationId, status: 'active' },
    });

    if (!membership && customerAccountId) {
      const account = await CustomerAccount.findByPk(customerAccountId);
      if (account) {
        const buyerMembership = await OrganizationMembership.findOne({
          where: { user_id: req.user.id, organization_id: account.buyer_organization_id, status: 'active' }
        });
        if (buyerMembership) {
          membership = {
            id: buyerMembership.id,
            role: 'customer_portal',
            employee_identifier: null
          };
        }
      }
    }

    if (!membership)
      return res.status(403).json({ error: 'No active membership in this organization' });

    req.orgContext = {
      organizationId,
      organization,
      membership: { id: membership.id, role: membership.role, employee_identifier: membership.employee_identifier },
    };
    next();
  } catch (err) {
    console.error('Org context error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ── 3. Slug-based Context Guard (FR-3.1 / FR-3.2) ────────────────────────────
// Reads :providerSlug and optionally :customerSlug from route params.
// Validates bilateral relationship, actor membership, and ABAC assignment for sales reps.
export const resolveSlugContext = async (req, res, next) => {
  try {
    if (!req.user?.id)
      return res.status(401).json({ error: 'Authentication required' });

    const { providerSlug, customerSlug } = req.params;
    if (!providerSlug)
      return res.status(400).json({ error: 'providerSlug required in route' });

    // Step 1 — Slug verification
    const providerOrg = await Organization.findOne({ where: { slug: providerSlug, is_active: true } });
    if (!providerOrg)
      return res.status(404).json({ error: `Provider '${providerSlug}' not found` });

    let customerOrg = null;
    let relationship = null;

    if (customerSlug) {
      customerOrg = await Organization.findOne({ where: { slug: customerSlug, is_active: true } });
      if (!customerOrg)
        return res.status(404).json({ error: `Customer '${customerSlug}' not found` });

      // Step 2 — Active bilateral relationship
      relationship = await OrganizationRelationship.findOne({
        where: {
          provider_organization_id: providerOrg.id,
          customer_organization_id: customerOrg.id,
          status: 'active',
        },
      });
      if (!relationship)
        return res.status(404).json({ error: 'No active relationship between these organizations' });
    }

    // Step 3 — Actor membership in either provider or customer org
    let membership = await OrganizationMembership.findOne({
      where: { user_id: req.user.id, organization_id: providerOrg.id, status: 'active' },
    });
    let actorType = 'provider';

    if (!membership && customerOrg) {
      membership = await OrganizationMembership.findOne({
        where: { user_id: req.user.id, organization_id: customerOrg.id, status: 'active' },
      });
      actorType = 'customer';
    }

    if (!membership)
      return res.status(404).json({ error: 'No active membership in provider or customer organization' });

    // Step 4 — ABAC: provider sales reps with assigned_only scope must be in relationship_assignments
    if (actorType === 'provider' && relationship &&
        ['sales_rep'].includes(membership.role)) {
      const assignment = await RelationshipAssignment.findOne({
        where: { relationship_id: relationship.id, membership_id: membership.id },
      });
      if (!assignment)
        return res.status(403).json({ error: 'You are not assigned to this customer relationship' });
    }

    req.slugContext = {
      providerOrg,
      customerOrg,
      relationship,
      membership: { id: membership.id, role: membership.role },
      actorType,
    };

    // Also populate orgContext for backward-compat with requireRoles
    req.orgContext = {
      organizationId: actorType === 'provider' ? providerOrg.id : customerOrg?.id,
      membership: { id: membership.id, role: membership.role },
    };

    next();
  } catch (err) {
    console.error('Slug context error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ── 4. Role guards ───────────────────────────────────────────────────────────
export const requireRoles = (...allowedRoles) => {
  const flat = allowedRoles.flat();
  return (req, res, next) => {
    const role = req.orgContext?.membership?.role || req.slugContext?.membership?.role;
    if (!role) return res.status(403).json({ error: 'Organization context required' });
    if (!flat.includes(role)) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
};

export const requireAnyRole = (req, res, next) => {
  const role = req.orgContext?.membership?.role || req.slugContext?.membership?.role;
  if (!role) return res.status(403).json({ error: 'Organization context required' });
  next();
};

// ── 5. Customer-Safe DTO redaction (FR-4.2) ───────────────────────────────────
// Strips internal cost/margin fields from quotation payloads when actor is customer.
// Call: redactForCustomer(quotationObject, req) → safe object
export function redactForCustomer(quotation, req) {
  if (!quotation) return quotation;
  const isCustomer = req.slugContext?.actorType === 'customer'
    || req.orgContext?.membership?.role === 'customer_portal';

  if (!isCustomer) return quotation;

  const banned = ['unit_cost', 'cost_total', 'line_margin', 'margin_total',
    'margin_percent', 'internal_notes', 'cost_breakdown'];

  const strip = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    const out = Array.isArray(obj) ? [] : {};
    for (const [k, v] of Object.entries(obj)) {
      if (banned.includes(k)) continue;
      // Never expose rejection_reason in approvals sub-array
      if (k === 'approvals') continue;
      out[k] = strip(v);
    }
    return out;
  };

  // Handle plain Sequelize instance
  const raw = typeof quotation.toJSON === 'function' ? quotation.toJSON() : quotation;
  return strip(raw);
}
