import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { User, Organization, OrganizationMembership, CustomerAccount } from '../models/index.js';

export const register = async (req, res) => {
  try {
    const { email, password, full_name, phone_number } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'email, password, and full_name are required' });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const password_hash = await argon2.hash(password, { type: argon2.argon2id });
    
    const user = await User.create({
      email,
      password_hash,
      full_name,
      phone_number
    });

    return res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'identifier and password are required' });
    }

    let user = null;

    if (identifier.includes('@')) {
      user = await User.findOne({ where: { email: identifier } });
    } else if (identifier.includes('.')) {
      const lastDotIndex = identifier.lastIndexOf('.');
      const employee_identifier = identifier.substring(0, lastDotIndex);
      const orgSlug = identifier.substring(lastDotIndex + 1);

      const org = await Organization.findOne({ where: { slug: orgSlug } });
      if (org) {
        const membership = await OrganizationMembership.findOne({
          where: { organization_id: org.id, employee_identifier }
        });
        if (membership) {
          user = await User.findByPk(membership.user_id);
        }
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await argon2.verify(user.password_hash, password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await user.update({ last_login_at: new Date() });

    const token = jwt.sign(
      { sub: user.id }, 
      process.env.JWT_SECRET || 'fallback_secret', 
      { expiresIn: '15m' }
    );

    const memberships = await OrganizationMembership.findAll({
      where: { user_id: user.id, status: 'active' },
      include: [{ model: Organization, as: 'organization' }]
    });

    let redirect = null;
    if (memberships.length === 1) {
      const membership = memberships[0];
      const orgType = membership.organization ? membership.organization.organization_type : null;
      
      // Fallback in case include doesn't auto-resolve as Organization
      const org = membership.organization || await Organization.findByPk(membership.organization_id);

      if (org && org.organization_type === 'provider') {
        redirect = `/${org.slug}/dashboard`;
      } else if (org) {
        const accounts = await CustomerAccount.findAll({
          where: { buyer_organization_id: membership.organization_id, is_active: true }
        });
        if (accounts.length === 1) {
           const provider = await Organization.findByPk(accounts[0].provider_organization_id);
           if (provider) {
             redirect = `/${provider.slug}/${org.slug}/dashboard`;
           }
        }
      }
    }

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name
      },
      memberships,
      redirect
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProfile = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const memberships = await OrganizationMembership.findAll({
      where: { user_id: user.id },
      include: [{ model: Organization, as: 'organization' }]
    });

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone_number: user.phone_number,
        is_active: user.is_active,
        last_login_at: user.last_login_at
      },
      memberships
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const setupOrganization = async (req, res) => {
  try {
    const { 
      legal_name, trading_name, tax_identifier, slug, 
      organization_type, default_currency, billing_address, shipping_address 
    } = req.body;
    const user = req.user;

    if (!legal_name || !slug || !organization_type) {
      return res.status(400).json({ error: 'legal_name, slug, and organization_type are required' });
    }

    const existingOrg = await Organization.findOne({ where: { slug } });
    if (existingOrg) {
      return res.status(409).json({ error: 'Organization slug already exists' });
    }

    const org = await Organization.create({
      legal_name,
      trading_name,
      tax_identifier,
      slug,
      organization_type,
      default_currency,
      billing_address,
      shipping_address,
      is_active: true
    });

    await OrganizationMembership.create({
      organization_id: org.id,
      user_id: user.id,
      role: 'admin',
      status: 'active'
    });

    return res.status(201).json({ message: 'Organization created successfully', organization: org });
  } catch (error) {
    console.error('Setup organization error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
