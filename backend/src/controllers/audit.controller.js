import { Router } from 'express';
import { Op } from 'sequelize';
import { ApprovalAuditLog, DealHealthAlert, Quotation, User } from '../models/index.js';
import { authenticate, resolveOrgContext, requireRoles } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate, resolveOrgContext, requireRoles('admin'));

router.get('/', async (req, res) => {
  try {
    const orgId = req.orgContext.organizationId;
    
    // 1. Fetch Approval Audit Logs
    const approvalLogs = await ApprovalAuditLog.findAll({
      where: { organization_id: orgId },
      include: [
        { model: User, as: 'actor', attributes: ['full_name', 'email'] },
        { model: Quotation, as: 'quotation', attributes: ['id', 'quotation_number'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 100
    });

    // 2. Fetch Deal Health Alerts
    const dealHealthAlerts = await DealHealthAlert.findAll({
      where: { organization_id: orgId },
      include: [
        { model: Quotation, as: 'quotation', attributes: ['id', 'quotation_number'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 100
    });

    // 3. Normalize & Merge
    let unifiedLogs = [];

    for (const log of approvalLogs) {
      let details = `Action: ${log.action_taken}`;
      if (log.payload_snapshot?.comments) {
        details += ` | Comments: ${log.payload_snapshot.comments}`;
      }
      if (log.blended_risk_score_at_action) {
         details += ` | Score: ${log.blended_risk_score_at_action}`;
      }

      unifiedLogs.push({
        id: `approval-${log.id}`,
        timestamp: log.createdAt,
        event_type: 'Approval Action',
        actor: log.actor?.full_name || 'System',
        target_display: log.quotation?.quotation_number || 'Unknown Quote',
        target_link: log.quotation ? `/quotations/${log.quotation.id}` : null,
        details: details
      });
    }

    for (const alert of dealHealthAlerts) {
      unifiedLogs.push({
        id: `health-${alert.id}`,
        timestamp: alert.createdAt,
        event_type: 'Deal Health Anomaly',
        actor: 'System (Algorithm)',
        target_display: alert.quotation?.quotation_number || (alert.title.includes(':') ? alert.title.split(':')[1].trim() : 'System'),
        target_link: '/deal-health',
        details: `[${alert.severity.toUpperCase()}] ${alert.anomaly_type.replace('_', ' ')}: ${alert.description}`
      });
    }

    // Sort by timestamp DESC
    unifiedLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(unifiedLogs.slice(0, 150));
  } catch (error) {
    console.error('Audit Log Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
