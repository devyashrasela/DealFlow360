import { Op } from 'sequelize';
import {
  sequelize,
  User,
  Organization,
  OrganizationMembership,
  OrganizationRelationship,
  AuditLog,
  RoleChangeAuditLog
} from '../models/index.js';
import { writeAuditLog } from '../services/audit.service.js';

// Ensure table exists on first run
let isTableSynced = false;
async function ensureAuditTable() {
  if (!isTableSynced) {
    try {
      await RoleChangeAuditLog.sync({ alter: false });
      isTableSynced = true;
    } catch (err) {
      console.warn('[RoleChangeAuditLog] sync warning:', err.message);
    }
  }
}

/**
 * Helper: Strictly verify actor is an active DB Admin in the specified organization.
 * FR-RBAC-01 & FR-RBAC-02: Never trust client-submitted role or claims.
 */
async function verifyAdminActor(userId, organizationId) {
  if (!userId || !organizationId) return null;
  const actorMembership = await OrganizationMembership.findOne({
    where: {
      user_id: userId,
      organization_id: organizationId,
      status: 'active',
      role: 'admin',
    },
    include: [{ model: User, as: 'user', attributes: ['id', 'full_name', 'email'] }],
  });
  return actorMembership;
}

/**
 * GET /api/team/members
 * Returns all members of the active organization plus associated customer contacts.
 */
export const getMembers = async (req, res) => {
  try {
    await ensureAuditTable();
    const organizationId = req.orgContext?.organizationId;
    if (!organizationId) {
      return res.status(400).json({ error: 'Active organization context required' });
    }

    // 1. Fetch internal members
    const members = await OrganizationMembership.findAll({
      where: {
        organization_id: organizationId,
        status: { [Op.ne]: 'removed' },
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'full_name', 'phone_number', 'is_active', 'last_login_at', 'created_at'],
        },
      ],
      order: [['created_at', 'ASC']],
    });

    // 2. Fetch customer contacts via bilateral relationships
    const relationships = await OrganizationRelationship.findAll({
      where: {
        provider_organization_id: organizationId,
        status: 'active',
      },
      attributes: ['id', 'customer_organization_id'],
    });

    const customerOrgIds = relationships.map((r) => r.customer_organization_id).filter(Boolean);
    let customerContacts = [];
    if (customerOrgIds.length > 0) {
      customerContacts = await OrganizationMembership.findAll({
        where: {
          organization_id: { [Op.in]: customerOrgIds },
          status: 'active',
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'email', 'full_name', 'phone_number', 'is_active', 'last_login_at', 'created_at'],
          },
          {
            model: Organization,
            as: 'organization',
            attributes: ['id', 'legal_name', 'trading_name', 'slug'],
          },
        ],
      });
    }

    // 3. Compute metric summaries
    const total_members = members.length;
    const admins_count = members.filter((m) => m.role === 'admin' && m.status === 'active').length;
    const sales_count = members.filter((m) => ['sales_rep', 'sales_manager'].includes(m.role) && m.status === 'active').length;
    const ops_count = members.filter((m) => m.role === 'finance_ops' && m.status === 'active').length;
    const customer_portal_count = customerContacts.length;

    return res.status(200).json({
      members,
      customerContacts,
      metrics: {
        total_members,
        admins_count,
        sales_count,
        ops_count,
        customer_portal_count,
      },
    });
  } catch (err) {
    console.error('[getMembers Error]:', err);
    return res.status(500).json({ error: 'Internal server error fetching members' });
  }
};

/**
 * POST /api/team/members/:membershipId/change-role
 * FR-RBAC-01, FR-RBAC-02, FR-RBAC-03, FR-RBAC-04, FR-RBAC-06, FR-RBAC-08, FR-RBAC-09
 * Strictly changes a member's role with mandatory justification and Last Admin protection.
 */
export const changeMemberRole = async (req, res) => {
  try {
    await ensureAuditTable();
    const organizationId = req.orgContext?.organizationId;
    const { membershipId } = req.params;
    const { new_role, reason } = req.body;

    // FR-RBAC-01 & 02: Verify actor is truly Admin in DB
    const actorMembership = await verifyAdminActor(req.user?.id, organizationId);
    if (!actorMembership) {
      return res.status(403).json({ error: 'Forbidden: Only an active Organization Admin can modify roles' });
    }

    // FR-RBAC-06: Written reason is mandatory
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return res.status(400).json({ error: 'A written reason is required for role modification' });
    }

    const validRoles = ['admin', 'sales_manager', 'sales_rep', 'finance_ops', 'customer_portal'];
    if (!validRoles.includes(new_role)) {
      return res.status(400).json({ error: `Invalid target role. Must be one of: ${validRoles.join(', ')}` });
    }

    // FR-RBAC-08: Target membership must belong to active org
    const targetMembership = await OrganizationMembership.findOne({
      where: { id: membershipId, organization_id: organizationId },
      include: [{ model: User, as: 'user', attributes: ['id', 'full_name', 'email'] }],
    });

    if (!targetMembership) {
      return res.status(404).json({ error: 'Membership not found in this organization' });
    }

    const prior_role = targetMembership.role;
    if (prior_role === new_role) {
      return res.status(400).json({ error: `Member already holds the role of '${new_role}'` });
    }

    // FR-RBAC-03: Last Admin Protection
    if (prior_role === 'admin' && new_role !== 'admin') {
      const activeAdminsCount = await OrganizationMembership.count({
        where: {
          organization_id: organizationId,
          role: 'admin',
          status: 'active',
        },
      });

      if (activeAdminsCount <= 1) {
        return res.status(400).json({
          error: 'Cannot demote or remove the sole remaining Admin of this organization. Promote another member to Admin first.',
        });
      }
    }

    // FR-RBAC-04 / FR-RBAC-05: Cross-boundary promotion check
    const is_cross_boundary = (prior_role === 'customer_portal' && new_role !== 'customer_portal') ||
                              (prior_role !== 'customer_portal' && new_role === 'customer_portal');

    // Update role
    targetMembership.role = new_role;
    await targetMembership.save();

    // FR-RBAC-09: Dedicated role change audit log
    const auditEntry = await RoleChangeAuditLog.create({
      organization_id: organizationId,
      membership_id: targetMembership.id,
      target_user_id: targetMembership.user_id,
      actor_user_id: req.user.id,
      actor_membership_id: actorMembership.id,
      action: is_cross_boundary ? 'cross_boundary_promotion' : 'role_change',
      prior_role,
      new_role,
      reason: reason.trim(),
      is_cross_boundary,
      ip_address: req.ip || req.headers['x-forwarded-for'] || null,
    });

    // Also write standard AuditLog
    await writeAuditLog({
      actor_user_id: req.user.id,
      actor_membership_id: actorMembership.id,
      entity_type: 'membership',
      entity_id: targetMembership.id,
      action: is_cross_boundary ? 'cross_boundary_promotion' : 'role_change',
      payload_before: { role: prior_role },
      payload_after: { role: new_role, reason: reason.trim(), is_cross_boundary },
      ip_address: req.ip,
    });

    return res.status(200).json({
      message: `Role successfully changed from '${prior_role}' to '${new_role}'`,
      membership: targetMembership,
      audit_log: auditEntry,
    });
  } catch (err) {
    console.error('[changeMemberRole Error]:', err);
    return res.status(500).json({ error: 'Internal server error changing role' });
  }
};

/**
 * POST /api/team/members/:membershipId/status
 * FR-RBAC-10 & FR-RBAC-11: Suspend, reactivate, or remove a member.
 */
export const updateMemberStatus = async (req, res) => {
  try {
    await ensureAuditTable();
    const organizationId = req.orgContext?.organizationId;
    const { membershipId } = req.params;
    const { status, reason } = req.body;

    const actorMembership = await verifyAdminActor(req.user?.id, organizationId);
    if (!actorMembership) {
      return res.status(403).json({ error: 'Forbidden: Only an active Organization Admin can modify member status' });
    }

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return res.status(400).json({ error: 'A written reason is required for status modification' });
    }

    const validStatuses = ['active', 'suspended', 'removed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const targetMembership = await OrganizationMembership.findOne({
      where: { id: membershipId, organization_id: organizationId },
      include: [{ model: User, as: 'user', attributes: ['id', 'full_name', 'email'] }],
    });

    if (!targetMembership) {
      return res.status(404).json({ error: 'Membership not found in this organization' });
    }

    // FR-RBAC-03: Last Admin Protection for suspension/removal
    if (targetMembership.role === 'admin' && ['suspended', 'removed'].includes(status) && targetMembership.status === 'active') {
      const activeAdminsCount = await OrganizationMembership.count({
        where: {
          organization_id: organizationId,
          role: 'admin',
          status: 'active',
        },
      });

      if (activeAdminsCount <= 1) {
        return res.status(400).json({
          error: 'Cannot demote or remove the sole remaining Admin of this organization. Promote another member to Admin first.',
        });
      }
    }

    const prior_status = targetMembership.status;
    targetMembership.status = status;
    await targetMembership.save();

    const actionType = status === 'suspended' ? 'suspend' : status === 'removed' ? 'remove' : 'reactivate';

    const auditEntry = await RoleChangeAuditLog.create({
      organization_id: organizationId,
      membership_id: targetMembership.id,
      target_user_id: targetMembership.user_id,
      actor_user_id: req.user.id,
      actor_membership_id: actorMembership.id,
      action: actionType,
      prior_role: `${targetMembership.role} (${prior_status})`,
      new_role: `${targetMembership.role} (${status})`,
      reason: reason.trim(),
      is_cross_boundary: false,
      ip_address: req.ip || req.headers['x-forwarded-for'] || null,
    });

    await writeAuditLog({
      actor_user_id: req.user.id,
      actor_membership_id: actorMembership.id,
      entity_type: 'membership',
      entity_id: targetMembership.id,
      action: actionType,
      payload_before: { status: prior_status },
      payload_after: { status, reason: reason.trim() },
      ip_address: req.ip,
    });

    return res.status(200).json({
      message: `Member status updated to '${status}'`,
      membership: targetMembership,
      audit_log: auditEntry,
    });
  } catch (err) {
    console.error('[updateMemberStatus Error]:', err);
    return res.status(500).json({ error: 'Internal server error updating member status' });
  }
};

/**
 * POST /api/team/members/cross-boundary-promote
 * Section 9 & FR-RBAC-04, 05: Explicit cross-boundary promotion of customer user to internal role.
 */
export const crossBoundaryPromote = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    await ensureAuditTable();
    const organizationId = req.orgContext?.organizationId;
    const { customer_user_id, target_role, reason } = req.body;

    const actorMembership = await verifyAdminActor(req.user?.id, organizationId);
    if (!actorMembership) {
      await transaction.rollback();
      return res.status(403).json({ error: 'Forbidden: Only an active Organization Admin can promote members' });
    }

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      await transaction.rollback();
      return res.status(400).json({ error: 'A written reason is required for cross-boundary promotion' });
    }

    const validInternalRoles = ['sales_rep', 'sales_manager', 'finance_ops', 'admin'];
    if (!validInternalRoles.includes(target_role)) {
      await transaction.rollback();
      return res.status(400).json({ error: `Invalid internal target role. Must be one of: ${validInternalRoles.join(', ')}` });
    }

    // Find customer user
    const customerUser = await User.findByPk(customer_user_id, { transaction });
    if (!customerUser) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Customer user not found' });
    }

    // 1. Deactivate/suspend user's customer portal membership for bilateral relationships of this provider org
    const relationships = await OrganizationRelationship.findAll({
      where: { provider_organization_id: organizationId, status: 'active' },
      attributes: ['customer_organization_id'],
      transaction,
    });
    const custOrgIds = relationships.map((r) => r.customer_organization_id).filter(Boolean);

    await OrganizationMembership.update(
      { status: 'suspended' },
      {
        where: {
          user_id: customer_user_id,
          organization_id: { [Op.in]: custOrgIds },
        },
        transaction,
      }
    );

    // 2. Create or reactivate internal membership in provider org
    let [internalMembership, created] = await OrganizationMembership.findOrCreate({
      where: { user_id: customer_user_id, organization_id: organizationId },
      defaults: {
        role: target_role,
        status: 'active',
      },
      transaction,
    });

    if (!created) {
      internalMembership.role = target_role;
      internalMembership.status = 'active';
      await internalMembership.save({ transaction });
    }

    // 3. Write immutable cross-boundary audit log
    const auditEntry = await RoleChangeAuditLog.create({
      organization_id: organizationId,
      membership_id: internalMembership.id,
      target_user_id: customer_user_id,
      actor_user_id: req.user.id,
      actor_membership_id: actorMembership.id,
      action: 'cross_boundary_promotion',
      prior_role: 'customer_portal',
      new_role: target_role,
      reason: reason.trim(),
      is_cross_boundary: true,
      ip_address: req.ip || req.headers['x-forwarded-for'] || null,
    }, { transaction });

    await transaction.commit();

    await writeAuditLog({
      actor_user_id: req.user.id,
      actor_membership_id: actorMembership.id,
      entity_type: 'membership',
      entity_id: internalMembership.id,
      action: 'cross_boundary_promotion',
      payload_before: { role: 'customer_portal', context: 'customer_org' },
      payload_after: { role: target_role, context: 'provider_org', reason: reason.trim(), is_cross_boundary: true },
      ip_address: req.ip,
    });

    return res.status(200).json({
      message: `Successfully converted Customer Portal User '${customerUser.full_name}' to internal '${target_role}'`,
      membership: internalMembership,
      audit_log: auditEntry,
    });
  } catch (err) {
    await transaction.rollback();
    console.error('[crossBoundaryPromote Error]:', err);
    return res.status(500).json({ error: 'Internal server error performing cross-boundary promotion' });
  }
};

/**
 * GET /api/team/audit-logs
 * Returns chronological role change audit trail for the active organization.
 */
export const getAuditLogs = async (req, res) => {
  try {
    await ensureAuditTable();
    const organizationId = req.orgContext?.organizationId;
    if (!organizationId) {
      return res.status(400).json({ error: 'Active organization context required' });
    }

    const logs = await RoleChangeAuditLog.findAll({
      where: { organization_id: organizationId },
      include: [
        { model: User, as: 'target_user', attributes: ['id', 'full_name', 'email'] },
        { model: User, as: 'actor_user', attributes: ['id', 'full_name', 'email'] },
      ],
      order: [['created_at', 'DESC']],
      limit: 100,
    });

    return res.status(200).json({ audit_logs: logs });
  } catch (err) {
    console.error('[getAuditLogs Error]:', err);
    return res.status(500).json({ error: 'Internal server error fetching audit logs' });
  }
};

/**
 * POST /api/team/invite
 * Invites or adds a new member to the organization with a specified role.
 */
export const inviteMember = async (req, res) => {
  try {
    await ensureAuditTable();
    const organizationId = req.orgContext?.organizationId;
    const { email, role = 'sales_rep', full_name } = req.body;

    const actorMembership = await verifyAdminActor(req.user?.id, organizationId);
    if (!actorMembership) {
      return res.status(403).json({ error: 'Forbidden: Only an active Organization Admin can invite members' });
    }

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required' });
    }

    const validRoles = ['admin', 'sales_manager', 'sales_rep', 'finance_ops'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    // Find or create user
    let user = await User.findOne({ where: { email } });
    if (!user) {
      const argon2 = await import('argon2');
      const tempHash = await argon2.hash('TempPassword@123', { type: argon2.argon2id });
      user = await User.create({
        email,
        full_name: full_name || email.split('@')[0],
        password_hash: tempHash,
        is_active: true,
      });
    }

    // Check if membership already exists in this org
    let membership = await OrganizationMembership.findOne({
      where: { user_id: user.id, organization_id: organizationId },
    });

    if (membership) {
      if (membership.status === 'active') {
        return res.status(400).json({ error: 'User is already an active member of this organization' });
      }
      membership.status = 'active';
      membership.role = role;
      await membership.save();
    } else {
      membership = await OrganizationMembership.create({
        user_id: user.id,
        organization_id: organizationId,
        role,
        status: 'active',
      });
    }

    await RoleChangeAuditLog.create({
      organization_id: organizationId,
      membership_id: membership.id,
      target_user_id: user.id,
      actor_user_id: req.user.id,
      actor_membership_id: actorMembership.id,
      action: 'role_change',
      prior_role: 'none',
      new_role: role,
      reason: 'New member invited/added to organization',
      is_cross_boundary: false,
      ip_address: req.ip,
    });

    return res.status(201).json({
      message: `Member '${user.email}' added successfully as '${role}'`,
      membership,
      user,
    });
  } catch (err) {
    console.error('[inviteMember Error]:', err);
    return res.status(500).json({ error: 'Internal server error inviting member' });
  }
};
