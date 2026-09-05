import {
  Quotation,
  QuotationLine,
  Product,
  ProductVariant,
  PriceList,
  PriceListItem,
  CustomerAccount,
  UpsellRule,
  NegotiationThread,
  Organization,
  User,
  ApprovalChain
} from '../models/index.js';
import {
  resolveCeiling,
  computeLineMath,
  computeBlendedRisk,
  getUpsellSuggestions
} from '../services/riskEngine.service.js';

/**
 * Private helper to recalculate quotation totals and risk metrics
 * @param {string} quotationId
 * @param {string} organizationId
 */
const recalcQuotation = async (quotationId, organizationId) => {
  const quotation = await Quotation.findOne({
    where: { id: quotationId, organization_id: organizationId }
  });
  if (!quotation) return;

  const lines = await QuotationLine.findAll({
    where: { quotation_id: quotationId, organization_id: organizationId }
  });

  const {
    gross_total,
    total_discount_amount,
    net_subtotal,
    blended_margin_percentage,
    worst_line_excess,
    weighted_margin_bleed,
    blended_risk_score
  } = computeBlendedRisk(lines);

  await quotation.update({
    gross_total,
    total_discount_amount,
    net_subtotal,
    blended_margin_percentage,
    worst_line_excess,
    weighted_margin_bleed,
    blended_risk_score
  });
};

export const createQuotation = async (req, res) => {
  try {
    const { customer_account_id, price_list_id, expiration_date } = req.body;
    const organization_id = req.orgContext.organizationId;
    const assigned_sales_rep_id = req.user.id;

    const quotation = await Quotation.create({
      organization_id,
      customer_account_id,
      price_list_id,
      assigned_sales_rep_id,
      expiration_date,
      quotation_number: `Q-${Date.now()}`,
      stage: 'draft'
    });

    res.status(201).json(quotation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const listQuotations = async (req, res) => {
  try {
    const organization_id = req.orgContext.organizationId;
    const { stage, customer_account_id, page = 1, limit = 20 } = req.query;
    
    const where = { organization_id };
    if (stage) where.stage = stage;
    if (customer_account_id) where.customer_account_id = customer_account_id;

    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

    const { count, rows } = await Quotation.findAndCountAll({
      where,
      limit: parseInt(limit, 10),
      offset,
      include: [
        {
          model: CustomerAccount,
          as: 'customer_account',
          include: [{ model: Organization, as: 'buyer_organization', attributes: ['legal_name'] }]
        },
        {
          model: User,
          as: 'sales_rep',
          attributes: ['id', 'full_name']
        }
      ]
    });

    res.json({
      quotations: rows,
      total: count,
      page: parseInt(page, 10),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getQuotation = async (req, res) => {
  try {
    const organization_id = req.orgContext.organizationId;
    const { quotationId } = req.params;

    const quotation = await Quotation.findOne({
      where: { id: quotationId, organization_id },
      include: [
        {
          model: QuotationLine,
          as: 'lines',
          include: [
            { model: Product, as: 'product', attributes: ['id', 'name'] },
            { model: ProductVariant, as: 'variant', attributes: ['id', 'name'] }
          ]
        },
        { model: CustomerAccount, as: 'customer_account' },
        { model: PriceList, as: 'price_list' }
      ]
    });

    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    res.json(quotation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateQuotation = async (req, res) => {
  try {
    const organization_id = req.orgContext.organizationId;
    const { quotationId } = req.params;
    const { customer_account_id, price_list_id, expiration_date } = req.body;

    const quotation = await Quotation.findOne({
      where: { id: quotationId, organization_id }
    });

    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    if (quotation.stage !== 'draft') {
      return res.status(409).json({ error: 'Quotation can only be updated in draft stage' });
    }

    await quotation.update({
      customer_account_id: customer_account_id !== undefined ? customer_account_id : quotation.customer_account_id,
      price_list_id: price_list_id !== undefined ? price_list_id : quotation.price_list_id,
      expiration_date: expiration_date !== undefined ? expiration_date : quotation.expiration_date
    });

    res.json(quotation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const addLine = async (req, res) => {
  try {
    const organization_id = req.orgContext.organizationId;
    const { quotationId } = req.params;
    const { product_id, product_variant_id, quantity, applied_discount_percentage } = req.body;

    const quotation = await Quotation.findOne({
      where: { id: quotationId, organization_id },
      include: [{ model: CustomerAccount, as: 'customer_account' }]
    });

    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found' });
    }
    if (quotation.stage !== 'draft') {
      return res.status(409).json({ error: 'Cannot add lines to a non-draft quotation' });
    }

    const product = await Product.findOne({ where: { id: product_id, organization_id } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    let list_price = product.base_list_price;
    if (product_variant_id) {
      const variant = await ProductVariant.findOne({ where: { id: product_variant_id, product_id, organization_id } });
      if (variant) list_price = Number(list_price) + Number(variant.price_delta || 0);
    }

    const priceListItem = await PriceListItem.findOne({
      where: {
        price_list_id: quotation.price_list_id,
        product_id,
        ...(product_variant_id ? { product_variant_id } : {})
      }
    });

    if (priceListItem && priceListItem.override_price != null) {
      list_price = priceListItem.override_price;
    }

    const pricing_tier = quotation.customer_account?.pricing_tier || 'standard';
    const ceiling_discount = resolveCeiling(organization_id, product.category, pricing_tier);
    const unit_cost = product.unit_cost;

    const lineMath = computeLineMath({
      list_price,
      unit_cost,
      quantity,
      applied_discount_percentage,
      ceiling_discount
    });

    const maxLine = await QuotationLine.max('line_number', { where: { quotation_id: quotationId, organization_id } });
    const line_number = (maxLine || 0) + 1;

    const line = await QuotationLine.create({
      organization_id,
      quotation_id: quotationId,
      product_id,
      product_variant_id,
      line_number,
      quantity,
      list_price,
      unit_cost,
      applied_discount_percentage,
      ceiling_discount,
      ...lineMath
    });

    await recalcQuotation(quotationId, organization_id);

    res.status(201).json(line);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateLine = async (req, res) => {
  try {
    const organization_id = req.orgContext.organizationId;
    const { quotationId, lineId } = req.params;
    const { quantity, applied_discount_percentage } = req.body;

    const quotation = await Quotation.findOne({
      where: { id: quotationId, organization_id },
      include: [{ model: CustomerAccount, as: 'customer_account' }]
    });

    if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
    if (quotation.stage !== 'draft') return res.status(409).json({ error: 'Cannot update lines on a non-draft quotation' });

    const line = await QuotationLine.findOne({ where: { id: lineId, quotation_id: quotationId, organization_id } });
    if (!line) return res.status(404).json({ error: 'Line not found' });

    const newQuantity = quantity !== undefined ? quantity : line.quantity;
    const newDiscount = applied_discount_percentage !== undefined ? applied_discount_percentage : line.applied_discount_percentage;

    const pricing_tier = quotation.customer_account?.pricing_tier || 'standard';
    const product = await Product.findOne({ where: { id: line.product_id, organization_id } });
    const ceiling_discount = resolveCeiling(organization_id, product.category, pricing_tier);

    const lineMath = computeLineMath({
      list_price: line.list_price,
      unit_cost: line.unit_cost,
      quantity: newQuantity,
      applied_discount_percentage: newDiscount,
      ceiling_discount
    });

    await line.update({
      quantity: newQuantity,
      applied_discount_percentage: newDiscount,
      ceiling_discount,
      ...lineMath
    });

    await recalcQuotation(quotationId, organization_id);

    res.json(line);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const removeLine = async (req, res) => {
  try {
    const organization_id = req.orgContext.organizationId;
    const { quotationId, lineId } = req.params;

    const quotation = await Quotation.findOne({
      where: { id: quotationId, organization_id }
    });

    if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
    if (quotation.stage !== 'draft') return res.status(409).json({ error: 'Cannot remove lines from a non-draft quotation' });

    const line = await QuotationLine.findOne({ where: { id: lineId, quotation_id: quotationId, organization_id } });
    if (!line) return res.status(404).json({ error: 'Line not found' });

    await line.destroy();

    await recalcQuotation(quotationId, organization_id);

    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getUpsells = async (req, res) => {
  try {
    const organization_id = req.orgContext.organizationId;
    const { quotationId } = req.params;

    const lines = await QuotationLine.findAll({
      where: { quotation_id: quotationId, organization_id },
      attributes: ['product_id']
    });

    const productIds = lines.map(line => line.product_id);

    const approvalChain = await ApprovalChain.findOne({
      where: { organization_id },
      order: [['createdAt', 'ASC']]
    });

    const threshold = approvalChain?.minimum_upsell_margin_threshold || 20;

    const suggestions = await getUpsellSuggestions(organization_id, productIds, threshold);

    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
