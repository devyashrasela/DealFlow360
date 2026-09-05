import {
  DiscountTierCeiling,
  CategoryCeiling,
  ApprovalChain,
  ApprovalRule,
  CustomerAccount,
  ApprovalAuditLog
} from '../models/index.js';

// Discount Tier Ceilings
export const listTierCeilings = async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const ceilings = await DiscountTierCeiling.findAll({
      where: { organization_id: organizationId }
    });
    const result = ceilings.map(c => {
      const json = c.toJSON();
      json.customer_tier = json.tier;
      return json;
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const upsertTierCeiling = async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { tier, max_discount_percentage } = req.body;

    const pct = parseFloat(max_discount_percentage);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      return res.status(400).json({ error: 'Discount percentage must be between 0 and 100' });
    }
    
    let ceiling = await DiscountTierCeiling.findOne({
      where: { organization_id: organizationId, tier }
    });

    const priorValue = ceiling ? ceiling.max_discount_percentage : null;

    if (ceiling) {
      ceiling.max_discount_percentage = max_discount_percentage;
      await ceiling.save();
    } else {
      ceiling = await DiscountTierCeiling.create({
        organization_id: organizationId,
        tier,
        max_discount_percentage
      });
    }

    try {
      await ApprovalAuditLog.create({
        organization_id: organizationId,
        quotation_id: null,
        actor_user_id: req.user?.id || '00000000-0000-0000-0000-000000000000',
        blended_risk_score_at_action: 0,
        action_taken: priorValue != null ? 'tier_ceiling_updated' : 'tier_ceiling_created',
        payload_snapshot: { tier, prior_value: priorValue, updated_value: max_discount_percentage },
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });
    } catch (e) {
      console.error('AuditLog error:', e.message);
    }

    res.json(ceiling);
  } catch (error) {
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

export const deleteTierCeiling = async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { id } = req.params;
    
    const ceiling = await DiscountTierCeiling.findOne({
      where: { id, organization_id: organizationId }
    });

    if (!ceiling) {
      return res.status(404).json({ error: 'Not found' });
    }

    // Check if tier is actively assigned to customer accounts (GOV17-05)
    const inUse = await CustomerAccount.findOne({
      where: {
        provider_organization_id: organizationId,
        pricing_tier: ceiling.tier
      }
    });

    if (inUse) {
      return res.status(400).json({
        error: `Cannot delete tier ceiling '${ceiling.tier}': actively assigned to customer accounts.`
      });
    }

    const priorValue = ceiling.max_discount_percentage;
    const tierName = ceiling.tier;

    await ceiling.destroy();

    try {
      await ApprovalAuditLog.create({
        organization_id: organizationId,
        quotation_id: null,
        actor_user_id: req.user?.id || '00000000-0000-0000-0000-000000000000',
        blended_risk_score_at_action: 0,
        action_taken: 'tier_ceiling_deleted',
        payload_snapshot: { id, tier: tierName, prior_value: priorValue },
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });
    } catch (e) {
      console.error('AuditLog error:', e.message);
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Category Ceilings
export const listCategoryCeilings = async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const ceilings = await CategoryCeiling.findAll({
      where: { organization_id: organizationId }
    });
    const result = ceilings.map(c => {
      const json = c.toJSON();
      json.product_category = json.category;
      return json;
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const upsertCategoryCeiling = async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { category, max_discount_percentage } = req.body;

    const pct = parseFloat(max_discount_percentage);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      return res.status(400).json({ error: 'Discount percentage must be between 0 and 100' });
    }
    
    let ceiling = await CategoryCeiling.findOne({
      where: { organization_id: organizationId, category }
    });

    const priorValue = ceiling ? ceiling.max_discount_percentage : null;

    if (ceiling) {
      ceiling.max_discount_percentage = max_discount_percentage;
      await ceiling.save();
    } else {
      ceiling = await CategoryCeiling.create({
        organization_id: organizationId,
        category,
        max_discount_percentage
      });
    }

    try {
      await ApprovalAuditLog.create({
        organization_id: organizationId,
        quotation_id: null,
        actor_user_id: req.user?.id || '00000000-0000-0000-0000-000000000000',
        blended_risk_score_at_action: 0,
        action_taken: priorValue != null ? 'category_ceiling_updated' : 'category_ceiling_created',
        payload_snapshot: { category, prior_value: priorValue, updated_value: max_discount_percentage },
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });
    } catch (e) {
      console.error('AuditLog error:', e.message);
    }

    res.json(ceiling);
  } catch (error) {
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

export const deleteCategoryCeiling = async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { id } = req.params;
    
    const ceiling = await CategoryCeiling.findOne({
      where: { id, organization_id: organizationId }
    });

    if (!ceiling) {
      return res.status(404).json({ error: 'Not found' });
    }

    const priorValue = ceiling.max_discount_percentage;
    const catName = ceiling.category;

    await ceiling.destroy();

    try {
      await ApprovalAuditLog.create({
        organization_id: organizationId,
        quotation_id: null,
        actor_user_id: req.user?.id || '00000000-0000-0000-0000-000000000000',
        blended_risk_score_at_action: 0,
        action_taken: 'category_ceiling_deleted',
        payload_snapshot: { id, category: catName, prior_value: priorValue },
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });
    } catch (e) {
      console.error('AuditLog error:', e.message);
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Approval Chains
export const listApprovalChains = async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const chains = await ApprovalChain.findAll({
      where: { organization_id: organizationId },
      include: [{ model: ApprovalRule, as: 'rules' }]
    });
    res.json(chains);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createApprovalChain = async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const {
      risk_tier,
      min_risk_score,
      max_risk_score,
      requires_manager_approval,
      requires_finance_approval,
      minimum_upsell_margin_threshold,
      absolute_margin_hard_stop
    } = req.body;
    
    const chain = await ApprovalChain.create({
      organization_id: organizationId,
      risk_tier,
      min_risk_score,
      max_risk_score,
      requires_manager_approval,
      requires_finance_approval,
      minimum_upsell_margin_threshold,
      absolute_margin_hard_stop
    });
    
    res.status(201).json(chain);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateApprovalChain = async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { id } = req.params;
    const {
      risk_tier,
      min_risk_score,
      max_risk_score,
      requires_manager_approval,
      requires_finance_approval,
      minimum_upsell_margin_threshold,
      absolute_margin_hard_stop
    } = req.body;

    const chain = await ApprovalChain.findOne({
      where: { id, organization_id: organizationId }
    });

    if (!chain) {
      return res.status(404).json({ error: 'Approval chain not found' });
    }

    if (risk_tier !== undefined) chain.risk_tier = risk_tier;
    if (min_risk_score !== undefined) chain.min_risk_score = min_risk_score;
    if (max_risk_score !== undefined) chain.max_risk_score = max_risk_score;
    if (requires_manager_approval !== undefined) chain.requires_manager_approval = requires_manager_approval;
    if (requires_finance_approval !== undefined) chain.requires_finance_approval = requires_finance_approval;
    if (minimum_upsell_margin_threshold !== undefined) chain.minimum_upsell_margin_threshold = minimum_upsell_margin_threshold;
    if (absolute_margin_hard_stop !== undefined) chain.absolute_margin_hard_stop = absolute_margin_hard_stop;

    await chain.save();

    // Uniformly synchronize margin guardrails across all approval chains for the organization (GOV18-GUARDRAILS-STORAGE)
    if (minimum_upsell_margin_threshold !== undefined || absolute_margin_hard_stop !== undefined) {
      const syncPayload = {};
      if (minimum_upsell_margin_threshold !== undefined) syncPayload.minimum_upsell_margin_threshold = minimum_upsell_margin_threshold;
      if (absolute_margin_hard_stop !== undefined) syncPayload.absolute_margin_hard_stop = absolute_margin_hard_stop;
      await ApprovalChain.update(syncPayload, {
        where: { organization_id: organizationId }
      });
    }

    res.json(chain);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteApprovalChain = async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { id } = req.params;
    
    const deleted = await ApprovalChain.destroy({
      where: { id, organization_id: organizationId }
    });
    
    if (!deleted) {
      return res.status(404).json({ error: 'Approval chain not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Approval Rules
export const addApprovalRule = async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { chainId } = req.params;
    const { rule_name, predicate_condition, escalate_to_role } = req.body;

    // Verify chain belongs to org
    const chain = await ApprovalChain.findOne({
      where: { id: chainId, organization_id: organizationId }
    });

    if (!chain) {
      return res.status(404).json({ error: 'Approval chain not found' });
    }

    const rule = await ApprovalRule.create({
      approval_chain_id: chainId,
      rule_name,
      predicate_condition,
      escalate_to_role
    });

    res.status(201).json(rule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateApprovalRule = async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { chainId, ruleId } = req.params;
    const { rule_name, predicate_condition, escalate_to_role } = req.body;

    // Verify chain belongs to org
    const chain = await ApprovalChain.findOne({
      where: { id: chainId, organization_id: organizationId }
    });

    if (!chain) {
      return res.status(404).json({ error: 'Approval chain not found' });
    }

    const rule = await ApprovalRule.findOne({
      where: { id: ruleId, approval_chain_id: chainId }
    });

    if (!rule) {
      return res.status(404).json({ error: 'Approval rule not found' });
    }

    if (rule_name !== undefined) rule.rule_name = rule_name;
    if (predicate_condition !== undefined) rule.predicate_condition = predicate_condition;
    if (escalate_to_role !== undefined) rule.escalate_to_role = escalate_to_role;

    await rule.save();
    res.json(rule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteApprovalRule = async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { chainId, ruleId } = req.params;

    // Verify chain belongs to org
    const chain = await ApprovalChain.findOne({
      where: { id: chainId, organization_id: organizationId }
    });

    if (!chain) {
      return res.status(404).json({ error: 'Approval chain not found' });
    }

    const deleted = await ApprovalRule.destroy({
      where: { id: ruleId, approval_chain_id: chainId }
    });

    if (!deleted) {
      return res.status(404).json({ error: 'Approval rule not found' });
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
