import argon2 from 'argon2';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User, Organization, OrganizationMembership, CustomerAccount } from '../models/index.js';
import { Session, Invitation, OrganizationRelationship } from '../models/session.models.js';
import { writeAuditLog } from '../services/audit.service.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const REFRESH_TOKEN_TTL_DAYS = 30;
const INVITE_TTL_HOURS = 72;

// ── helpers ──────────────────────────────────────────────────────────────────

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function generateRefreshToken() {
  return crypto.randomBytes(48).toString('hex');
}

function issueAccessToken(user, sessionId) {
  const payload = { sub: user.id };
  if (sessionId) payload.session_id = sessionId;
  return jwt.sign(payload, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });
}

async function createSession(user, req) {
  const raw = generateRefreshToken();
  const hash = hashToken(raw);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 86400_000);

  const session = await Session.create({
    user_id: user.id,
    refresh_token_hash: hash,
    expires_at: expiresAt,
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
  });

  return { raw, session };
}

async function buildLoginPayload(user) {
  const memberships = await OrganizationMembership.findAll({
    where: { user_id: user.id, status: 'active' },
    include: [{ model: Organization, as: 'organization' }],
  });

  let redirect = null;
  if (memberships.length === 1) {
    const m = memberships[0];
    const org = m.organization || await Organization.findByPk(m.organization_id);
    if (org?.organization_type === 'provider') {
      redirect = `/${org.slug}/dashboard`;
    } else if (org) {
      const rels = await OrganizationRelationship.findAll({
        where: { customer_organization_id: m.organization_id, status: 'active' },
        include: [{ model: Organization, as: 'provider' }],
      });
      if (rels.length === 1 && rels[0].provider) {
        redirect = `/${rels[0].provider.slug}/${org.slug}/dashboard`;
      }
    }
  }
  // multiple memberships → no redirect → frontend shows WorkspaceSelector

  return { memberships, redirect };
}

// ── POST /api/auth/register ───────────────────────────────────────────────────
export const register = async (req, res) => {
  try {
    const { email, password, full_name, phone_number } = req.body;
    if (!email || !password || !full_name)
      return res.status(400).json({ error: 'email, password, and full_name are required' });

    if (await User.findOne({ where: { email } }))
      return res.status(409).json({ error: 'Email already exists' });

    const password_hash = await argon2.hash(password, { type: argon2.argon2id });
    const user = await User.create({ email, password_hash, full_name, phone_number });

    return res.status(201).json({ user: { id: user.id, email: user.email, full_name: user.full_name } });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ── POST /api/auth/login ──────────────────────────────────────────────────────
export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password)
      return res.status(400).json({ error: 'identifier and password are required' });

    let user = null;

    if (identifier.includes('@')) {
      user = await User.findOne({ where: { email: identifier } });
    } else if (identifier.includes('.')) {
      // format: {employee_id}.{org_slug}
      const lastDot = identifier.lastIndexOf('.');
      const employee_identifier = identifier.substring(0, lastDot);
      const orgSlug = identifier.substring(lastDot + 1);
      const org = await Organization.findOne({ where: { slug: orgSlug } });
      if (org) {
        const m = await OrganizationMembership.findOne({
          where: { organization_id: org.id, employee_identifier },
        });
        if (m) user = await User.findByPk(m.user_id);
      }
    }

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    let isValid = false;
    if (user.password_hash?.startsWith('$2a$') || user.password_hash?.startsWith('$2b$')) {
      isValid = await bcrypt.compare(password, user.password_hash);
      if (isValid) {
        const upgradedHash = await argon2.hash(password, { type: argon2.argon2id });
        await user.update({ password_hash: upgradedHash });
      }
    } else {
      isValid = await argon2.verify(user.password_hash, password);
    }
    if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

    if (!user.is_active) return res.status(403).json({ error: 'Account suspended' });

    await user.update({ last_login_at: new Date() });

    const { raw: refreshToken, session } = await createSession(user, req);
    const accessToken = issueAccessToken(user, session.id);
    const { memberships, redirect } = await buildLoginPayload(user);

    return res.status(200).json({
      access_token: accessToken,
      refresh_token: refreshToken,
      user: { id: user.id, email: user.email, full_name: user.full_name },
      memberships,
      redirect,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ── POST /api/auth/refresh ────────────────────────────────────────────────────
export const refresh = async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) return res.status(400).json({ error: 'refresh_token required' });

    const hash = hashToken(refresh_token);
    const session = await Session.findOne({ where: { refresh_token_hash: hash, is_revoked: false } });
    if (!session) return res.status(401).json({ error: 'Invalid or revoked refresh token' });
    if (new Date() > session.expires_at) {
      await session.update({ is_revoked: true });
      return res.status(401).json({ error: 'Refresh token expired' });
    }

    const user = await User.findByPk(session.user_id);
    if (!user || !user.is_active) {
      await session.update({ is_revoked: true });
      return res.status(401).json({ error: 'User inactive or not found' });
    }

    // Rotate: revoke old, issue new
    await session.update({ is_revoked: true });
    const { raw: newRaw, session: newSession } = await createSession(user, req);
    const accessToken = issueAccessToken(user, newSession.id);

    return res.status(200).json({ access_token: accessToken, refresh_token: newRaw });
  } catch (err) {
    console.error('Refresh error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
export const logout = async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (refresh_token) {
      const hash = hashToken(refresh_token);
      await Session.update({ is_revoked: true }, { where: { refresh_token_hash: hash } });
    }
    return res.status(200).json({ message: 'Logged out' });
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ── GET /api/auth/profile ─────────────────────────────────────────────────────
export const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(401).json({ error: 'User not found' });

    const memberships = await OrganizationMembership.findAll({
      where: { user_id: user.id },
      include: [{ model: Organization, as: 'organization' }],
    });

    return res.status(200).json({
      user: {
        id: user.id, email: user.email, full_name: user.full_name,
        phone_number: user.phone_number, is_active: user.is_active,
        last_login_at: user.last_login_at,
      },
      memberships,
    });
  } catch (err) {
    console.error('Profile error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ── POST /api/auth/organizations ─────────────────────────────────────────────
export const setupOrganization = async (req, res) => {
  try {
    const { legal_name, trading_name, tax_identifier, slug,
      organization_type, default_currency, billing_address, shipping_address } = req.body;

    if (!legal_name || !slug || !organization_type)
      return res.status(400).json({ error: 'legal_name, slug, and organization_type are required' });

    if (await Organization.findOne({ where: { slug } }))
      return res.status(409).json({ error: 'Organization slug already exists' });

    const org = await Organization.create({
      legal_name, trading_name, tax_identifier, slug,
      organization_type, default_currency, billing_address, shipping_address, is_active: true,
    });

    const membership = await OrganizationMembership.create({
      organization_id: org.id, user_id: req.user.id, role: 'admin', status: 'active',
    });

    await writeAuditLog({
      actor_user_id: req.user.id,
      actor_membership_id: membership.id,
      entity_type: 'organization',
      entity_id: org.id,
      action: 'created',
      payload_after: { legal_name, slug, organization_type },
      ip_address: req.ip,
    });

    return res.status(201).json({ message: 'Organization created successfully', organization: org });
  } catch (err) {
    console.error('Setup org error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ── POST /api/auth/customers/search ──────────────────────────────────────────
// FR-2.1: search orgs by tax_identifier or legal_name
export const searchCustomerOrgs = async (req, res) => {
  try {
    const { tax_identifier, legal_name } = req.query;
    if (!tax_identifier && !legal_name)
      return res.status(400).json({ error: 'tax_identifier or legal_name required' });

    const { Op } = await import('sequelize');
    const where = {};
    if (tax_identifier) where.tax_identifier = tax_identifier;
    else where.legal_name = { [Op.like]: `%${legal_name}%` };

    const orgs = await Organization.findAll({ where, attributes: ['id', 'legal_name', 'trading_name', 'tax_identifier', 'slug'] });
    return res.status(200).json({ organizations: orgs });
  } catch (err) {
    console.error('Search orgs error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ── POST /api/auth/invitations ────────────────────────────────────────────────
// FR-2.2: provider invites customer admin
export const createInvitation = async (req, res) => {
  try {
    const { email, role = 'customer_portal', customer_organization_id, new_customer_legal_name, new_customer_slug } = req.body;
    const providerOrgId = req.orgContext?.organizationId;
    if (!email || !providerOrgId)
      return res.status(400).json({ error: 'email and org context required' });

    let custOrgId = customer_organization_id;

    // If no existing org, create one
    if (!custOrgId) {
      if (!new_customer_legal_name || !new_customer_slug)
        return res.status(400).json({ error: 'new_customer_legal_name and new_customer_slug required for new org' });

      if (await Organization.findOne({ where: { slug: new_customer_slug } }))
        return res.status(409).json({ error: 'Customer slug already exists' });

      const custOrg = await Organization.create({
        legal_name: new_customer_legal_name,
        slug: new_customer_slug,
        organization_type: 'customer',
        is_active: true,
      });
      custOrgId = custOrg.id;

      // Create bilateral relationship
      await OrganizationRelationship.create({
        provider_organization_id: providerOrgId,
        customer_organization_id: custOrgId,
        status: 'active',
      });
    } else {
      // Ensure relationship exists
      const [rel] = await OrganizationRelationship.findOrCreate({
        where: { provider_organization_id: providerOrgId, customer_organization_id: custOrgId },
        defaults: { status: 'active' },
      });
      if (rel.status !== 'active')
        return res.status(409).json({ error: 'Relationship is not active' });
    }

    const rawToken = crypto.randomBytes(48).toString('hex');
    const token_hash = hashToken(rawToken);
    const expires_at = new Date(Date.now() + INVITE_TTL_HOURS * 3600_000);

    const inv = await Invitation.create({
      token_hash, email,
      invited_by_user_id: req.user.id,
      organization_id: providerOrgId,
      customer_organization_id: custOrgId,
      role, expires_at,
    });

    await writeAuditLog({
      actor_user_id: req.user.id,
      actor_membership_id: req.orgContext?.membership?.id,
      entity_type: 'invitation',
      entity_id: inv.id,
      action: 'invite_sent',
      payload_after: { email, role, customer_organization_id: custOrgId },
      ip_address: req.ip,
    });

    // In prod: send email with rawToken. Return it here for dev/testing.
    return res.status(201).json({
      message: 'Invitation created',
      invitation_id: inv.id,
      raw_token: rawToken,   // remove in production; send via email
      expires_at,
    });
  } catch (err) {
    console.error('Create invitation error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ── POST /api/auth/invitations/accept ────────────────────────────────────────
// FR-2.2: existing or new user accepts invitation
export const acceptInvitation = async (req, res) => {
  try {
    const { token, password, full_name, phone_number } = req.body;
    if (!token) return res.status(400).json({ error: 'token required' });

    const hash = hashToken(token);
    const inv = await Invitation.findOne({ where: { token_hash: hash, status: 'pending' } });
    if (!inv) return res.status(404).json({ error: 'Invitation not found or already used' });
    if (new Date() > inv.expires_at) {
      await inv.update({ status: 'expired' });
      return res.status(410).json({ error: 'Invitation expired' });
    }

    let user = await User.findOne({ where: { email: inv.email } });

    if (!user) {
      // New user — require full_name + password
      if (!full_name || !password)
        return res.status(400).json({ error: 'full_name and password required for new users' });
      const password_hash = await argon2.hash(password, { type: argon2.argon2id });
      user = await User.create({ email: inv.email, password_hash, full_name, phone_number, is_active: true });
    } else {
      // Existing user — verify password
      if (!password) return res.status(400).json({ error: 'password required to verify existing account' });
      let isValid = false;
      if (user.password_hash?.startsWith('$2a$') || user.password_hash?.startsWith('$2b$')) {
        isValid = await bcrypt.compare(password, user.password_hash);
        if (isValid) {
          const upgradedHash = await argon2.hash(password, { type: argon2.argon2id });
          await user.update({ password_hash: upgradedHash });
        }
      } else {
        isValid = await argon2.verify(user.password_hash, password);
      }
      if (!isValid) return res.status(401).json({ error: 'Invalid credentials for existing account' });
    }

    // Link membership in customer org
    const [membership] = await OrganizationMembership.findOrCreate({
      where: { organization_id: inv.customer_organization_id, user_id: user.id },
      defaults: { role: inv.role, status: 'active' },
    });
    if (membership.status !== 'active') await membership.update({ status: 'active' });

    await inv.update({ status: 'accepted' });

    await writeAuditLog({
      actor_user_id: user.id,
      actor_membership_id: membership.id,
      entity_type: 'invitation',
      entity_id: inv.id,
      action: 'invite_accepted',
      payload_after: { user_id: user.id, organization_id: inv.customer_organization_id, role: inv.role },
      ip_address: req.ip,
    });

    const accessToken = issueAccessToken(user);
    const refreshToken = await createSession(user, req);

    return res.status(200).json({
      message: 'Invitation accepted',
      access_token: accessToken,
      refresh_token: refreshToken,
      user: { id: user.id, email: user.email, full_name: user.full_name },
    });
  } catch (err) {
    console.error('Accept invitation error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
