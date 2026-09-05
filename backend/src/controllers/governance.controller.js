import {
  DiscountTierCeiling,
  CategoryCeiling,
  ApprovalChain,
  ApprovalRule
} from '../models/index.js';

// Discount Tier Ceilings
export const listTierCeilings = async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const ceilings = await DiscountTierCeiling.findAll({
      where: { organization_id: organizationId }
    });
    res.json(ceilings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const upsertTierCeiling = async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { tier, max_discount_percentage } = req.body;
    
    let ceiling = await DiscountTierCeiling.findOne({
      where: { organization_id: organizationId, tier }
    });

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
    res.json(ceiling);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteTierCeiling = async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { id } = req.params;
    
    const deleted = await DiscountTierCeiling.destroy({
      where: { id, organization_id: organizationId }
    });
    
    if (!deleted) {
      return res.status(404).json({ error: 'Not found' });
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
    res.json(ceilings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const upsertCategoryCeiling = async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { category, max_discount_percentage } = req.body;
    
    let ceiling = await CategoryCeiling.findOne({
      where: { organization_id: organizationId, category }
    });

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
    res.json(ceiling);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteCategoryCeiling = async (req, res) => {
  try {
    const { organizationId } = req.orgContext;
    const { id } = req.params;
    
    const deleted = await CategoryCeiling.destroy({
      where: { id, organization_id: organizationId }
    });
    
    if (!deleted) {
      return res.status(404).json({ error: 'Not found' });
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
      include: [{ model: ApprovalRule }]
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
