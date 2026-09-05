import { Router } from 'express';
import { authenticate, resolveOrgContext, requireRoles } from '../middleware/auth.middleware.js';
import * as teamRolesController from '../controllers/teamRoles.controller.js';

const router = Router();

// All team & role management routes require active authentication, organization context, and Admin role
router.use(authenticate);
router.use(resolveOrgContext);
router.use(requireRoles('admin'));

// Member and role endpoints
router.get('/members', teamRolesController.getMembers);
router.post('/members/:membershipId/change-role', teamRolesController.changeMemberRole);
router.post('/members/:membershipId/status', teamRolesController.updateMemberStatus);
router.post('/members/cross-boundary-promote', teamRolesController.crossBoundaryPromote);
router.post('/invite', teamRolesController.inviteMember);

// Audit trail endpoint
router.get('/audit-logs', teamRolesController.getAuditLogs);

export default router;
