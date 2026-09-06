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
const DEFAULT_TIER_CEILINGS = { standard: 0, bronze: 5, silver: 10, gold: 15, custom: 25 };
const DEFAULT_CAT_CEILINGS = { hardware: 15, services: 10, subscriptions: 5 };

export const resolveCeiling = async (organizationId, category, pricingTier) => {
  try {
    const catNormalized = (category || '').toLowerCase();
    const tierNormalized = (pricingTier || '').toLowerCase();

    const [tierCeiling, categoryCeiling] = await Promise.all([
      DiscountTierCeiling.findOne({
        where: { organization_id: organizationId, tier: tierNormalized }
      }),
      CategoryCeiling.findOne({
        where: { organization_id: organizationId, category: catNormalized }
      })
    ]);

    const tierLimit = tierCeiling
      ? parseFloat(tierCeiling.max_discount_percentage)
      : (DEFAULT_TIER_CEILINGS[tierNormalized] !== undefined ? DEFAULT_TIER_CEILINGS[tierNormalized] : null);

    const catLimit = categoryCeiling
      ? parseFloat(categoryCeiling.max_discount_percentage)
      : (DEFAULT_CAT_CEILINGS[catNormalized] !== undefined ? DEFAULT_CAT_CEILINGS[catNormalized] : null);

    if (tierLimit !== null && catLimit !== null) {
      return Math.min(tierLimit, catLimit);
    }
    if (tierLimit !== null) return tierLimit;
    if (catLimit !== null) return catLimit;

    return 0; // Safe default ceiling if category/tier is unrecognized
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
  const unitListPrice = Number(line.unit_list_price ?? line.list_price) || 0;
  const unitCostPrice = Number(line.unit_cost_price ?? line.unit_cost) || 0;
  const appliedDiscount = Number(line.applied_discount_percentage ?? line.discount_percentage) || 0;
  const effectiveLimit = Number(line.effective_ceiling_limit ?? line.ceiling_discount) || 100;

  const unitNetPrice = Number((unitListPrice * (1 - appliedDiscount / 100)).toFixed(2));
  const lineGrossAmount = Number((quantity * unitListPrice).toFixed(2));
  const lineNetAmount = Number((quantity * unitNetPrice).toFixed(2));
  const lineCostTotal = Number((quantity * unitCostPrice).toFixed(2));
  const lineMarginAmount = Number((lineNetAmount - lineCostTotal).toFixed(2));
  const lineMarginPercentage = lineNetAmount > 0 ? Number(((lineMarginAmount / lineNetAmount) * 100).toFixed(2)) : 0;
  const lineExcessPoints = Number(Math.max(0, appliedDiscount - effectiveLimit).toFixed(2));
  const isOverLimit = lineExcessPoints > 0;

  return {
    ...(line.id ? { id: line.id } : {}),
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
      blendedRiskScore: 0,
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
    const excess = Number(line.line_excess_points) || 0;
    if (excess > eMax) {
      eMax = excess;
    }
    totalNet += Number(line.line_net_amount) || 0;
    totalGross += Number(line.line_gross_amount) || 0;
    totalCost += Number(line.line_cost_total) || 0;
  }

  let wBleed = 0;
  if (totalNet > 0) {
    for (const line of lines) {
      const net = Number(line.line_net_amount) || 0;
      const excess = Number(line.line_excess_points) || 0;
      wBleed += excess * (net / totalNet);
    }
  }

  const blendedRiskScore = Number(((0.6 * eMax) + (0.4 * wBleed)).toFixed(2));
  const totalDiscountAmount = Number(Math.max(0, totalGross - totalNet).toFixed(2));
  const blendedMarginPercentage = totalNet > 0 ? Number((((totalNet - totalCost) / totalNet) * 100).toFixed(2)) : 0;

  return {
    worst_line_excess: Number(eMax.toFixed(2)),
    weighted_margin_bleed: Number(wBleed.toFixed(2)),
    blended_risk_score: blendedRiskScore,
    blendedRiskScore: blendedRiskScore, // Compatibility alias
    gross_total: Number(totalGross.toFixed(2)),
    total_discount_amount: totalDiscountAmount,
    net_subtotal: Number(totalNet.toFixed(2)),
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
    const score = Number(blendedRiskScore) || 0;
    const eMax = Number(E_max) || 0;
    const marginPct = Number(blendedMarginPercentage) || 0;

    const chains = await ApprovalChain.findAll({
      where: { organization_id: organizationId },
      order: [['min_risk_score', 'ASC']]
    });

    let highestHardStop = null;
    // Margin hard stop check across chains
    for (const chain of chains) {
      if (chain.absolute_margin_hard_stop !== null && chain.absolute_margin_hard_stop !== undefined) {
        // Enforce the highest absolute margin hard stop limit found
        const floor = parseFloat(chain.absolute_margin_hard_stop);
        if (highestHardStop === null || floor > highestHardStop) {
          highestHardStop = floor;
        }
      }
    }

    if (highestHardStop !== null && marginPct < highestHardStop) {
      return {
        risk_tier: 'high_risk_finance',
        margin_hard_stop_breached: true,
        requires_manager_approval: true,
        requires_finance_approval: true
      };
    }

    if (chains.length === 0) {
      // Simple fallback rules if no approval chains configured
      if (score === 0) {
        return {
          risk_tier: 'low_risk_auto',
          margin_hard_stop_breached: false,
          requires_manager_approval: false,
          requires_finance_approval: false
        };
      } else if (score > 0 && score <= 5 && eMax <= 5) {
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
      const max = (chain.max_risk_score !== null && chain.max_risk_score !== undefined && !isNaN(parseFloat(chain.max_risk_score)))
        ? parseFloat(chain.max_risk_score)
        : null;

      // Exact zero match for Slab 1 (0 to 0)
      if (min === 0 && max === 0 && score === 0) {
        matchedChain = chain;
        break;
      }

      if (max !== null) {
        if (score >= min && score <= max) {
          matchedChain = chain;
          break;
        }
      } else {
        if (score >= min) {
          matchedChain = chain;
          break;
        }
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
        as: 'recommended_product',
        where: { is_active: true }
      }],
      order: [['is_promoted', 'DESC'], ['priority_rank', 'ASC']]
    });

    const suggestions = [];
    const seenProductIds = new Set();

    for (const rule of rules) {
      const recProduct = rule.recommended_product;
      if (!recProduct) continue;

      if (productIds.includes(recProduct.id) || seenProductIds.has(recProduct.id)) {
        continue;
      }
      
      const baseList = parseFloat(recProduct.base_list_price);
      const standardCost = parseFloat(recProduct.standard_unit_cost);
      
      if (baseList > 0) {
        const promoDiscount = parseFloat(rule.promotional_discount_percent || 0);
        const effectivePrice = baseList * (1 - promoDiscount / 100);
        
        if (effectivePrice > 0) {
          const marginPct = ((effectivePrice - standardCost) / effectivePrice) * 100;
          
          if (marginPct >= minimumMarginThreshold) {
            seenProductIds.add(recProduct.id);
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
              promotional_discount_percent: promoDiscount,
              is_promoted: rule.is_promoted
            });
          }
        }
      }
    }

    return suggestions;
  } catch (error) {
    throw new Error(`Failed to get upsell suggestions: ${error.message}`);
  }
};
