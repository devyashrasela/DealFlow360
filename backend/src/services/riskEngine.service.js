import { DiscountTierCeiling, CategoryCeiling, ApprovalChain, UpsellRule, Product } from '../models/index.js';
import { Op } from 'sequelize';

/**
 * Resolves the effective discount ceiling for a given organization, category, and tier.
 * Returns the LOWER of the two ceilings (category vs tier) if both exist.
 * If only one exists, returns that. If neither, returns 100.
 * 
 * @param {string} organizationId
 * @param {string} category
 * @param {string} pricingTier
 * @returns {Promise<number>} Effective discount ceiling
 */
export const resolveCeiling = async (organizationId, category, pricingTier) => {
  try {
    const [tierCeiling, categoryCeiling] = await Promise.all([
      DiscountTierCeiling.findOne({
        where: { organization_id: organizationId, tier: pricingTier }
      }),
      CategoryCeiling.findOne({
        where: { organization_id: organizationId, category }
      })
    ]);

    const tierLimit = tierCeiling ? parseFloat(tierCeiling.max_discount_percentage) : null;
    const catLimit = categoryCeiling ? parseFloat(categoryCeiling.max_discount_percentage) : null;

    if (tierLimit !== null && catLimit !== null) {
      return Math.min(tierLimit, catLimit);
    }
    if (tierLimit !== null) return tierLimit;
    if (catLimit !== null) return catLimit;

    return 100; // No ceiling
  } catch (error) {
    throw new Error(`Failed to resolve ceiling: ${error.message}`);
  }
};

/**
 * Computes line level math based on provided quotation line fields.
 * 
 * @param {Object} line
 * @returns {Object} Computed fields for the line
 */
export const computeLineMath = (line) => {
  const quantity = Number(line.quantity) || 0;
  const unitListPrice = Number(line.unit_list_price) || 0;
  const unitCostPrice = Number(line.unit_cost_price) || 0;
  const appliedDiscount = Number(line.applied_discount_percentage) || 0;
  const effectiveLimit = Number(line.effective_ceiling_limit) || 100;

  const unitNetPrice = unitListPrice * (1 - appliedDiscount / 100);
  const lineGrossAmount = quantity * unitListPrice;
  const lineNetAmount = quantity * unitNetPrice;
  const lineCostTotal = quantity * unitCostPrice;
  const lineMarginAmount = lineNetAmount - lineCostTotal;
  const lineMarginPercentage = lineNetAmount > 0 ? (lineMarginAmount / lineNetAmount) * 100 : 0;
  const lineExcessPoints = Math.max(0, appliedDiscount - effectiveLimit);
  const isOverLimit = lineExcessPoints > 0;

  return {
    unit_net_price: unitNetPrice,
    line_gross_amount: lineGrossAmount,
    line_net_amount: lineNetAmount,
    line_cost_total: lineCostTotal,
    line_margin_amount: lineMarginAmount,
    line_margin_percentage: lineMarginPercentage,
    line_excess_points: lineExcessPoints,
    is_over_limit: isOverLimit
  };
};

/**
 * Computes blended risk across all lines for a quotation.
 * 
 * @param {Array<Object>} lines Array of computed line objects
 * @returns {Object} Blended risk score and aggregate totals
 */
export const computeBlendedRisk = (lines) => {
  if (!lines || lines.length === 0) {
    return {
      worst_line_excess: 0,
      weighted_margin_bleed: 0,
      blended_risk_score: 0,
      gross_total: 0,
      total_discount_amount: 0,
      net_subtotal: 0,
      blended_margin_percentage: 0
    };
  }

  let eMax = 0;
  let totalNet = 0;
  let totalGross = 0;
  let totalCost = 0;

  for (const line of lines) {
    if (line.line_excess_points > eMax) {
      eMax = line.line_excess_points;
    }
    totalNet += line.line_net_amount;
    totalGross += line.line_gross_amount;
    totalCost += line.line_cost_total;
  }

  let wBleed = 0;
  if (totalNet > 0) {
    for (const line of lines) {
      wBleed += line.line_excess_points * (line.line_net_amount / totalNet);
    }
  }

  const blendedRiskScore = (0.6 * eMax) + (0.4 * wBleed);
  const totalDiscountAmount = totalGross - totalNet;
  const blendedMarginPercentage = totalNet > 0 ? ((totalNet - totalCost) / totalNet) * 100 : 0;

  return {
    worst_line_excess: eMax,
    weighted_margin_bleed: wBleed,
    blended_risk_score: blendedRiskScore,
    gross_total: totalGross,
    total_discount_amount: totalDiscountAmount,
    net_subtotal: totalNet,
    blended_margin_percentage: blendedMarginPercentage
  };
};

/**
 * Determines the risk tier based on blended risk score and margin limits.
 * 
 * @param {string} organizationId
 * @param {number} blendedRiskScore
 * @param {number} E_max
 * @param {number} blendedMarginPercentage
 * @returns {Promise<Object>} Object containing risk tier and approval requirements
 */
export const determineRiskTier = async (organizationId, blendedRiskScore, E_max, blendedMarginPercentage) => {
  try {
    const chains = await ApprovalChain.findAll({
      where: { organization_id: organizationId },
      order: [['min_risk_score', 'ASC']]
    });

    // Margin hard stop check across chains
    for (const chain of chains) {
      if (chain.absolute_margin_hard_stop !== null && chain.absolute_margin_hard_stop !== undefined) {
        if (blendedMarginPercentage < parseFloat(chain.absolute_margin_hard_stop)) {
          return {
            risk_tier: 'high_risk_finance',
            margin_hard_stop_breached: true,
            requires_manager_approval: true,
            requires_finance_approval: true
          };
        }
      }
    }

    if (chains.length === 0) {
      // Simple fallback rules if no approval chains configured
      if (blendedRiskScore === 0) {
        return {
          risk_tier: 'low_risk_auto',
          margin_hard_stop_breached: false,
          requires_manager_approval: false,
          requires_finance_approval: false
        };
      } else if (blendedRiskScore > 0 && blendedRiskScore <= 5 && E_max <= 5) {
        return {
          risk_tier: 'medium_risk_manager',
          margin_hard_stop_breached: false,
          requires_manager_approval: true,
          requires_finance_approval: false
        };
      } else {
        return {
          risk_tier: 'high_risk_finance',
          margin_hard_stop_breached: false,
          requires_manager_approval: true,
          requires_finance_approval: true
        };
      }
    }

    // Find matching chain by score range
    let matchedChain = chains[chains.length - 1]; // Default to highest limit chain
    for (const chain of chains) {
      const min = parseFloat(chain.min_risk_score);
      const max = parseFloat(chain.max_risk_score);
      if (blendedRiskScore >= min && blendedRiskScore < max) {
        matchedChain = chain;
        break;
      }
    }

    return {
      risk_tier: matchedChain.risk_tier,
      margin_hard_stop_breached: false,
      requires_manager_approval: matchedChain.requires_manager_approval,
      requires_finance_approval: matchedChain.requires_finance_approval
    };
  } catch (error) {
    throw new Error(`Failed to determine risk tier: ${error.message}`);
  }
};

/**
 * Returns upsell suggestions based on provided products and a minimum margin threshold.
 * 
 * @param {string} organizationId
 * @param {Array<string>} productIds
 * @param {number} minimumMarginThreshold
 * @returns {Promise<Array<Object>>} Array of upsell suggestions
 */
export const getUpsellSuggestions = async (organizationId, productIds, minimumMarginThreshold) => {
  try {
    if (!productIds || productIds.length === 0) return [];

    const rules = await UpsellRule.findAll({
      where: {
        organization_id: organizationId,
        trigger_product_id: { [Op.in]: productIds },
        is_active: true
      },
      include: [{
        model: Product,
        as: 'recommendedProduct' // Include using standard alias or default association
      }],
      order: [['priority_rank', 'ASC']]
    });

    const suggestions = [];

    for (const rule of rules) {
      const recProduct = rule.recommendedProduct || rule.Product;
      if (!recProduct) continue;

      const baseList = parseFloat(recProduct.base_list_price);
      const standardCost = parseFloat(recProduct.standard_unit_cost);
      
      if (baseList > 0) {
        const marginPct = ((baseList - standardCost) / baseList) * 100;
        
        if (marginPct >= minimumMarginThreshold) {
          suggestions.push({
            rule_id: rule.id,
            recommended_product: {
              id: recProduct.id,
              sku: recProduct.sku,
              name: recProduct.name,
              base_list_price: baseList,
              standard_unit_cost: standardCost
            },
            margin_delta: marginPct,
            promotional_discount_percent: rule.promotional_discount_percent
          });
        }
      }
    }

    return suggestions;
  } catch (error) {
    throw new Error(`Failed to get upsell suggestions: ${error.message}`);
  }
};
