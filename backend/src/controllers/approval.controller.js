import {
  Quotation,
  QuotationLine,
  QuotationApproval,
  ApprovalAuditLog,
  ApprovalChain,
  OrganizationMembership,
  CustomerAccount,
  Organization,
  Product,
  User,
  sequelize
} from '../models/index.js';
import {
  computeLineMath,
  computeBlendedRisk,
  determineRiskTier
} from '../services/riskEngine.service.js';
import { emitEvent } from '../services/notification.service.js';

export const submitForApproval = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { quotationId } = req.params;
    const orgId = req.orgContext.organizationId;

    const quotation = await Quotation.findOne({
      where: { id: quotationId, organization_id: orgId },
      include: [{ model: QuotationLine, as: 'lines' }],
      transaction: t
    });

    if (!quotation) {
      await t.rollback();
      return res.status(404).json({ message: 'Quotation not found' });
    }

    if (quotation.stage !== 'draft') {
      await t.rollback();
      return res.status(400).json({ message: 'Quotation must be in draft stage' });
    }

    const recomputedLines = quotation.lines.map(line => {
      const computed = computeLineMath(line);
      return {
        ...computed,
        id: line.id
      };
    });

    const blendedRisk = computeBlendedRisk(recomputedLines);
    const blendedRiskScore = blendedRisk.blended_risk_score;
    const E_max = blendedRisk.worst_line_excess || 0;
    const blendedMarginPercentage = blendedRisk.blended_margin_percentage;

    const riskTier = await determineRiskTier(orgId, blendedRiskScore, E_max, blendedMarginPercentage);

    await quotation.update({
      worst_line_excess: E_max,
      weighted_margin_bleed: blendedRisk.weighted_margin_bleed,
      blended_risk_score: blendedRiskScore,
      risk_tier: riskTier.risk_tier || riskTier,
      margin_hard_stop_breached: riskTier.margin_hard_stop_breached || false,
      requires_executive_override: riskTier.margin_hard_stop_breached || false,
      gross_total: blendedRisk.gross_total,
      net_subtotal: blendedRisk.net_subtotal,
      total_discount_amount: blendedRisk.total_discount_amount,
      grand_total: blendedRisk.net_subtotal
    }, { transaction: t });

    const payloadSnapshot = {
      gross_total: blendedRisk.gross_total,
      net_subtotal: blendedRisk.net_subtotal,
      blended_risk_score: blendedRiskScore,
      worst_line_excess: E_max,
      lines: recomputedLines.map(l => ({ id: l.id, revenue: l.line_net_amount, cost: l.line_cost_total }))
    };

    const auditLogBase = {
      organization_id: orgId,
      quotation_id: quotation.id,
      actor_user_id: req.user.id,
      blended_risk_score_at_action: blendedRiskScore,
      payload_snapshot: payloadSnapshot,
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    };

    const riskTierValue = riskTier.risk_tier || riskTier;

    if (riskTierValue === 'low_risk_auto' || blendedRiskScore === 0) {
      await quotation.update({ stage: 'approved' }, { transaction: t });
      await ApprovalAuditLog.create({
        ...auditLogBase,
        action_taken: 'auto_approved'
      }, { transaction: t });
      await t.commit();
      return res.status(200).json({ status: 'auto_approved', riskAnalysis: riskTier });
    }

    let createdSteps = [];
    if (riskTierValue === 'medium_risk_manager') {
      await quotation.update({ stage: 'pending_approval' }, { transaction: t });
      const step = await QuotationApproval.create({
        quotation_id: quotation.id,
        step_order: 1,
        required_role: 'sales_manager',
        status: 'pending'
      }, { transaction: t });
      createdSteps.push(step);

      await ApprovalAuditLog.create({
        ...auditLogBase,
        action_taken: 'submitted_for_approval'
      }, { transaction: t });
    } else if (riskTierValue === 'high_risk_finance') {
      await quotation.update({ stage: 'pending_approval' }, { transaction: t });
      const step1 = await QuotationApproval.create({
        quotation_id: quotation.id,
        step_order: 1,
        required_role: 'sales_manager',
        status: 'pending'
      }, { transaction: t });
      const step2 = await QuotationApproval.create({
        quotation_id: quotation.id,
        step_order: 2,
        required_role: 'finance_ops',
        status: 'pending'
      }, { transaction: t });
      createdSteps.push(step1, step2);

      await ApprovalAuditLog.create({
        ...auditLogBase,
        action_taken: 'submitted_for_approval'
      }, { transaction: t });
    }

    await t.commit();

    if (riskTierValue === 'medium_risk_manager' || riskTierValue === 'high_risk_finance') {
      await emitEvent({
        organizationId: orgId,
        actorUserId: req.user.id,
        eventType: 'quotation.submitted',
        entityType: 'quotation',
        entityId: quotation.id,
        title: `${quotation.quotation_number} submitted for approval`,
        metadata: { quotationNumber: quotation.quotation_number, grandTotal: quotation.grand_total, salesRepUserId: quotation.assigned_sales_rep_id },
      });
    }

    return res.status(200).json({ steps: createdSteps, riskAnalysis: riskTier });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({ error: error.message });
  }
};

export const listPendingApprovals = async (req, res) => {
  try {
    const orgId = req.orgContext.organizationId;
    const userRole = req.orgContext.membership.role;
    const { status } = req.query;

    const roleWhere = userRole === 'admin' ? {} : { required_role: userRole };
    const statusWhere = status === 'all' ? {} : (status ? { status } : { status: 'pending' });

    const approvals = await QuotationApproval.findAll({
      where: {
        ...statusWhere,
        ...roleWhere
      },
      order: [['createdAt', 'DESC']],
      include: [{
        model: Quotation,
        as: 'quotation',
        where: { organization_id: orgId },
        include: [{
          model: CustomerAccount,
          as: 'customer_account',
          include: [{ model: Organization, as: 'buyer_organization' }]
        }]
      }]
    });

    return res.status(200).json(approvals);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getApprovalDetail = async (req, res) => {
  try {
    const { quotationId } = req.params;
    const orgId = req.orgContext.organizationId;

    const quotation = await Quotation.findOne({
      where: { id: quotationId, organization_id: orgId },
      include: [
        { model: QuotationLine, as: 'lines', include: [{ model: Product, as: 'product' }] },
        { model: QuotationApproval, as: 'approvals' },
        { model: ApprovalAuditLog, as: 'audit_logs', include: [{ model: User, as: 'actor', attributes: ['id', 'full_name', 'email'] }] },
        { model: CustomerAccount, as: 'customer_account', include: [{ model: Organization, as: 'buyer_organization' }] }
      ]
    });

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    return res.status(200).json(quotation);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const approveQuotation = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { quotationId } = req.params;
    const { comments } = req.body;
    const orgId = req.orgContext.organizationId;
    const userRole = req.orgContext.membership.role;

    const quotation = await Quotation.findOne({
      where: { id: quotationId, organization_id: orgId },
      include: [{ model: QuotationLine, as: 'lines' }],
      transaction: t
    });

    if (!quotation) {
      await t.rollback();
      return res.status(404).json({ message: 'Quotation not found' });
    }

    const pendingSteps = await QuotationApproval.findAll({
      where: { quotation_id: quotation.id, status: 'pending' },
      order: [['step_order', 'ASC']],
      transaction: t
    });

    const currentStep = pendingSteps[0];
    if (!currentStep) {
      await t.rollback();
      return res.status(404).json({ message: 'No pending approval steps found' });
    }

    if (userRole !== 'admin' && currentStep.required_role !== userRole) {
      await t.rollback();
      return res.status(403).json({ message: 'You are not authorized to approve this step' });
    }

    await currentStep.update({
      status: 'approved',
      action_by_user_id: req.user.id,
      action_timestamp: new Date(),
      comments: comments || null
    }, { transaction: t });

    const remainingSteps = pendingSteps.length - 1;

    const isFullyInternallyApproved = remainingSteps === 0;
    const isCustomerAlreadyConfirmed = !!quotation.customer_confirmed_at;
    
    let newStage = 'pending_approval';
    if (isFullyInternallyApproved) {
      newStage = isCustomerAlreadyConfirmed ? 'confirmed' : 'approved';
    }

    const updatePayload = {
      stage: newStage,
      lock_version: quotation.lock_version + 1
    };

    if (isFullyInternallyApproved) {
      updatePayload.internally_approved_at = new Date();
      updatePayload.internally_approved_by = req.user.id;
      if (isCustomerAlreadyConfirmed) {
        updatePayload.confirmed_at = new Date();
      }
    }

    // Optimistic locking
    const [updatedRows] = await Quotation.update(
      updatePayload,
      {
        where: { id: quotation.id, lock_version: quotation.lock_version, organization_id: orgId },
        transaction: t
      }
    );

    if (updatedRows === 0) {
      await t.rollback();
      return res.status(409).json({ message: 'Conflict: Quotation was modified by another request' });
    }

    const payloadSnapshot = {
      gross_total: quotation.gross_total,
      blended_risk_score: quotation.blended_risk_score,
      lines: (quotation.lines || []).map(l => ({ id: l.id, revenue: l.line_net_amount, cost: l.line_cost_total }))
    };

    await ApprovalAuditLog.create({
      organization_id: orgId,
      quotation_id: quotation.id,
      actor_user_id: req.user.id,
      blended_risk_score_at_action: quotation.blended_risk_score,
      payload_snapshot: payloadSnapshot,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      action_taken: 'approved'
    }, { transaction: t });

    await t.commit();

    await emitEvent({
      organizationId: req.orgContext.organizationId,
      actorUserId: req.user.id,
      eventType: 'quotation.approved',
      entityType: 'quotation',
      entityId: quotationId,
      title: `${quotation.quotation_number} approved by ${req.user.full_name}`,
      metadata: { quotationNumber: quotation.quotation_number, salesRepUserId: quotation.assigned_sales_rep_id },
    });

    if (newStage === 'confirmed') {
      try {
        const { generateInvoiceFromQuote } = await import('../services/invoice.service.js');
        await generateInvoiceFromQuote(quotation.id);
      } catch (e) { console.error('Invoice gen failed:', e.message); }
      try {
        const { executeFulfillmentAllocation } = await import('../services/fulfillment.service.js');
        await executeFulfillmentAllocation(orgId, { quotationId: quotation.id });
      } catch (e) { console.error('Fulfillment alloc failed:', e.message); }
      const hasRecurring = quotation.lines?.some(l => l.category === 'subscriptions' || (l.billing_cadence && l.billing_cadence !== 'one_time'));
      if (hasRecurring) {
        try {
          const { provisionSubscriptionFromQuote } = await import('../services/subscription.service.js');
          await provisionSubscriptionFromQuote(quotation.id);
        } catch (e) { console.error('Sub provisioning failed:', e.message); }
      }
    }

    return res.status(200).json({ status: newStage, remainingSteps });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({ error: error.message });
  }
};

export const rejectQuotation = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { quotationId } = req.params;
    const { comments } = req.body;
    const orgId = req.orgContext.organizationId;
    const userRole = req.orgContext.membership.role;

    if (!comments) {
      await t.rollback();
      return res.status(400).json({ message: 'Comments are required for rejection' });
    }

    const quotation = await Quotation.findOne({
      where: { id: quotationId, organization_id: orgId },
      include: [{ model: QuotationLine, as: 'lines' }],
      transaction: t
    });

    if (!quotation) {
      await t.rollback();
      return res.status(404).json({ message: 'Quotation not found' });
    }

    const pendingSteps = await QuotationApproval.findAll({
      where: { quotation_id: quotation.id, status: 'pending' },
      order: [['step_order', 'ASC']],
      transaction: t
    });

    const currentStep = pendingSteps[0];
    if (!currentStep) {
      await t.rollback();
      return res.status(404).json({ message: 'No pending approval steps found' });
    }

    if (userRole !== 'admin' && currentStep.required_role !== userRole) {
      await t.rollback();
      return res.status(403).json({ message: 'You are not authorized to reject this step' });
    }

    await currentStep.update({
      status: 'rejected',
      action_by_user_id: req.user.id,
      action_timestamp: new Date(),
      comments
    }, { transaction: t });

    await quotation.update({ stage: 'rejected' }, { transaction: t });

    const payloadSnapshot = {
      gross_total: quotation.gross_total,
      blended_risk_score: quotation.blended_risk_score,
      lines: (quotation.lines || []).map(l => ({ id: l.id, revenue: l.line_net_amount, cost: l.line_cost_total }))
    };

    await ApprovalAuditLog.create({
      organization_id: orgId,
      quotation_id: quotation.id,
      actor_user_id: req.user.id,
      blended_risk_score_at_action: quotation.blended_risk_score,
      payload_snapshot: payloadSnapshot,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      action_taken: 'rejected'
    }, { transaction: t });

    await t.commit();

    await emitEvent({
      organizationId: req.orgContext.organizationId,
      actorUserId: req.user.id,
      eventType: 'quotation.rejected',
      entityType: 'quotation',
      entityId: quotationId,
      title: `${quotation.quotation_number} rejected by ${req.user.full_name}`,
      metadata: { quotationNumber: quotation.quotation_number, salesRepUserId: quotation.assigned_sales_rep_id, reason: req.body.comments },
      severity: 'warning',
    });

    return res.status(200).json({ status: 'rejected' });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({ error: error.message });
  }
};

export const returnQuotation = async (req, res) => {
  const { quotationId } = req.params;
  const { comments } = req.body;
  const orgId = req.orgContext.organizationId;

  const t = await sequelize.transaction();
  try {
    const quotation = await Quotation.findOne({
      where: { id: quotationId, organization_id: orgId },
      include: [{ model: QuotationLine, as: 'lines' }],
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!quotation) {
      await t.rollback();
      return res.status(404).json({ message: 'Quotation not found' });
    }

    const pendingSteps = await QuotationApproval.findAll({
      where: { quotation_id: quotation.id, status: 'pending' },
      order: [['step_order', 'ASC']],
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    const currentStep = pendingSteps[0];
    if (currentStep) {
      const userRole = req.orgContext.membership.role;
      if (userRole !== 'admin' && currentStep.required_role !== userRole) {
        await t.rollback();
        return res.status(403).json({ message: 'You are not authorized to return this step' });
      }
      await currentStep.update({
        status: 'rejected',
        action_by_user_id: req.user.id,
        action_timestamp: new Date(),
        comments: comments || 'Returned for revision'
      }, { transaction: t });
    }

    await quotation.update({ stage: 'draft' }, { transaction: t });

    const payloadSnapshot = {
      gross_total: quotation.gross_total,
      blended_risk_score: quotation.blended_risk_score,
      lines: (quotation.lines || []).map(l => ({ id: l.id, revenue: l.line_net_amount, cost: l.line_cost_total }))
    };

    await ApprovalAuditLog.create({
      organization_id: orgId,
      quotation_id: quotation.id,
      actor_user_id: req.user.id,
      blended_risk_score_at_action: quotation.blended_risk_score,
      payload_snapshot: payloadSnapshot,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      action_taken: 'returned'
    }, { transaction: t });

    await t.commit();
    return res.status(200).json({ status: 'returned', stage: 'draft' });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({ error: error.message });
  }
};

export const listAuditLogs = async (req, res) => {
  try {
    const { quotationId } = req.params;
    const orgId = req.orgContext.organizationId;

    // Verify quotation belongs to this org
    const quotation = await Quotation.findOne({
      where: { id: quotationId, organization_id: orgId }
    });
    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    const logs = await ApprovalAuditLog.findAll({
      where: { quotation_id: quotationId },
      order: [['created_at', 'ASC']],
      include: [{
        model: User,
        as: 'actor',
        attributes: ['full_name', 'email']
      }]
    });

    return res.status(200).json(logs);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
