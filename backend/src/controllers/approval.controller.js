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

    let totalRevenue = 0;
    let totalCost = 0;

    const recomputedLines = quotation.lines.map(line => {
      const computed = computeLineMath(line);
      totalRevenue += computed.line_net_amount || 0;
      totalCost += computed.line_cost_total || 0;
      return computed;
    });

    const blendedRisk = computeBlendedRisk(recomputedLines);

    const blendedMarginPercentage = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;
    const E_max = blendedRisk.worst_line_excess || 0;

    const riskTier = await determineRiskTier(orgId, blendedRisk.blendedRiskScore, E_max, blendedMarginPercentage);

    if (riskTier.margin_hard_stop_breached) {
      await quotation.update({
        stage: 'rejected',
        worst_line_excess: E_max,
        weighted_margin_bleed: blendedRisk.weighted_margin_bleed,
        blended_risk_score: blendedRisk.blendedRiskScore,
        margin_hard_stop_breached: true,
        gross_total: totalRevenue
      }, { transaction: t });

      await ApprovalAuditLog.create({
        organization_id: orgId,
        quotation_id: quotation.id,
        actor_user_id: req.user.id,
        blended_risk_score_at_action: blendedRisk.blendedRiskScore,
        payload_snapshot: {
          gross_total: totalRevenue,
          blended_risk_score: blendedRisk.blendedRiskScore,
          worst_line_excess: E_max,
          action: 'rejected_margin_hard_stop'
        },
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        action_taken: 'rejected_margin_hard_stop'
      }, { transaction: t });

      await t.commit();
      return res.status(422).json({
        message: 'Margin hard stop breached',
        explanation: 'Quotation rejected automatically due to margin hard stop.'
      });
    }

    await quotation.update({
      worst_line_excess: E_max,
      weighted_margin_bleed: blendedRisk.weighted_margin_bleed,
      blended_risk_score: blendedRisk.blendedRiskScore,
      risk_tier: riskTier.risk_tier || riskTier,
      margin_hard_stop_breached: false,
      gross_total: totalRevenue
    }, { transaction: t });

    const payloadSnapshot = {
      gross_total: totalRevenue,
      blended_risk_score: blendedRisk.blendedRiskScore,
      worst_line_excess: E_max,
      lines: recomputedLines.map(l => ({ id: l.id, revenue: l.line_net_amount, cost: l.line_cost_total }))
    };

    const auditLogBase = {
      organization_id: orgId,
      quotation_id: quotation.id,
      actor_user_id: req.user.id,
      blended_risk_score_at_action: blendedRisk.blendedRiskScore,
      payload_snapshot: payloadSnapshot,
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    };

    const riskTierValue = riskTier.risk_tier || riskTier;

    if (riskTierValue === 'low_risk_auto' || blendedRisk.blendedRiskScore === 0) {
      await quotation.update({ stage: 'approved' }, { transaction: t });
      await ApprovalAuditLog.create({
        ...auditLogBase,
        action_taken: 'auto_approved'
      }, { transaction: t });
      await t.commit();
      return res.status(200).json({ status: 'auto_approved' });
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
    const statusWhere = status === 'pending' ? { status: 'pending' } : (status && status !== 'all' ? { status } : {});

    const approvals = await QuotationApproval.findAll({
      where: {
        ...statusWhere,
        ...roleWhere
      },
      include: [{
        model: Quotation,
        as: 'quotation',
        where: { organization_id: orgId },
        include: [{
          model: CustomerAccount,
          as: 'customer_account',
          include: [{ model: Organization, as: 'buyer_organization' }]
        }]
      }],
      order: [['createdAt', 'DESC']]
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
        { model: ApprovalAuditLog, as: 'audit_logs' },
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
    if (!currentStep || currentStep.required_role !== userRole) {
      await t.rollback();
      return res.status(403).json({ message: 'You are not authorized to approve this step' });
    }

    await currentStep.update({
      status: 'approved',
      action_by_user_id: req.user.id,
      action_timestamp: new Date(),
      comments
    }, { transaction: t });

    const remainingSteps = pendingSteps.length - 1;

    // Optimistic locking
    const [updatedRows] = await Quotation.update(
      {
        stage: remainingSteps === 0 ? 'approved' : 'pending_approval',
        lock_version: quotation.lock_version + 1
      },
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
    return res.status(200).json({ status: 'approved', remainingSteps });
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
    if (!currentStep || currentStep.required_role !== userRole) {
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
