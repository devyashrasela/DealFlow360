import { apiClient } from './client';

export const teamRolesApi = {
  /**
   * Fetch all members in active organization and associated customer contacts.
   */
  async getMembers() {
    return apiClient.get('/team/members');
  },

  /**
   * Change a member's role within the organization.
   * Requires mandatory justification reason.
   */
  async changeMemberRole(membershipId, { new_role, reason }) {
    return apiClient.post(`/team/members/${membershipId}/change-role`, {
      new_role,
      reason,
    });
  },

  /**
   * Update member status: 'active', 'suspended', 'removed'.
   * Requires mandatory justification reason.
   */
  async updateMemberStatus(membershipId, { status, reason }) {
    return apiClient.post(`/team/members/${membershipId}/status`, {
      status,
      reason,
    });
  },

  /**
   * Convert a customer portal user to an internal employee role (Cross-boundary promotion).
   * Revokes their customer portal access and grants internal role.
   */
  async crossBoundaryPromote({ customer_user_id, target_role, reason }) {
    return apiClient.post('/team/members/cross-boundary-promote', {
      customer_user_id,
      target_role,
      reason,
    });
  },

  /**
   * Fetch immutable role change audit logs for the organization.
   */
  async getAuditLogs() {
    return apiClient.get('/team/audit-logs');
  },

  /**
   * Invite or add a new team member.
   */
  async inviteMember({ email, role, full_name }) {
    return apiClient.post('/team/invite', {
      email,
      role,
      full_name,
    });
  },
};
