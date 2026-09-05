import { Router } from 'express';
import { authenticate, resolveOrgContext } from '../middleware/auth.middleware.js';
import * as authController from '../controllers/auth.controller.js';

const router = Router();

// Public
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

// FR-2.2: invite accept — no auth required (token-based)
router.post('/invitations/accept', authController.acceptInvitation);

// Protected — needs valid JWT
router.get('/profile', authenticate, authController.getProfile);
router.post('/organizations', authenticate, authController.setupOrganization);

// FR-2.1: search customer orgs by tax_id / legal_name
router.get('/customers/search', authenticate, authController.searchCustomerOrgs);

// FR-2.2: provider creates invitation (must be in an org context)
router.post('/invitations', authenticate, resolveOrgContext, authController.createInvitation);

export default router;
