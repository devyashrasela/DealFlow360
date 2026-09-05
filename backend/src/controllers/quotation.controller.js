import { Op } from 'sequelize';
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
export const recalcQuotation = async (quotationId, organizationId) => {
  const quotation = await Quotation.findOne({
    where: { id: quotationId, organization_id: organizationId }
  });
  if (!quotation) return;

  const lines = await QuotationLine.findAll({
    where: { quotation_id: quotationId }
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

  const total_tax_amount = Number(quotation.total_tax_amount || 0);
  const grand_total = Number((net_subtotal + total_tax_amount).toFixed(2));

  await quotation.update({
    gross_total,
    total_discount_amount,
    net_subtotal,
    grand_total,
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

    if (!customer_account_id) {
      return res.status(400).json({ error: 'customer_account_id is required' });
    }
    if (!price_list_id) {
      return res.status(400).json({ error: 'price_list_id is required' });
    }

    // Tenant Isolation Verification
    const customerAccount = await CustomerAccount.findOne({
      where: { id: customer_account_id, provider_organization_id: organization_id, is_active: true }
    });
    if (!customerAccount) {
      return res.status(400).json({ error: 'Invalid customer account for this organization' });
    }

    const priceList = await PriceList.findOne({
      where: { id: price_list_id, organization_id, is_active: true }
    });
    if (!priceList) {
      return res.status(400).json({ error: 'Invalid or inactive price list for this organization' });
    }

    let expDate = expiration_date ? new Date(expiration_date) : null;
    if (!expDate || isNaN(expDate.getTime())) {
      expDate = new Date();
      expDate.setDate(expDate.getDate() + 30);
    } else if (expDate <= new Date()) {
      return res.status(400).json({ error: 'Expiration date must be in the future' });
    }

    const countQuotes = await Quotation.count({ where: { organization_id } });
    const year = new Date().getFullYear();
    const quotation_number = `Q-${year}-${String(countQuotes + 1001).padStart(4, '0')}`;

    const quotation = await Quotation.create({
      organization_id,
      customer_account_id,
      price_list_id,
      assigned_sales_rep_id,
      expiration_date: expDate,
      quotation_number,
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
    const { stage, customer_account_id, search, page = 1, limit = 100 } = req.query;
    
    const where = { organization_id };
    if (stage && stage !== 'all') where.stage = stage;
    if (customer_account_id) where.customer_account_id = customer_account_id;
    if (search) {
      where[Op.or] = [
        { quotation_number: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

    const { count, rows } = await Quotation.findAndCountAll({
      where,
      limit: parseInt(limit, 10),
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: CustomerAccount,
          as: 'customer_account',
          include: [{ model: Organization, as: 'buyer_organization', attributes: ['legal_name', 'trading_name'] }]
        },
        {
          model: User,
          as: 'sales_rep',
          attributes: ['id', 'full_name']
        },
        {
          model: PriceList,
          as: 'price_list',
          attributes: ['id', 'name', 'tier', 'currency']
        }
      ]
    });

    const quotes = rows.map(r => {
      const q = r.toJSON();
      q.status = q.stage;
      return q;
    });

    res.json({
      quotations: quotes,
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
            { model: Product, as: 'product', attributes: ['id', 'name', 'sku'] },
            { model: ProductVariant, as: 'product_variant', attributes: ['id', 'variant_name', 'variant_sku', ['variant_name', 'name']] }
          ]
        },
        {
          model: CustomerAccount,
          as: 'customer_account',
          include: [{ model: Organization, as: 'buyer_organization' }]
        },
        { model: PriceList, as: 'price_list' }
      ]
    });

    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    const qJson = quotation.toJSON();
    qJson.status = qJson.stage;
    res.json(qJson);
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

    const qty = Number(quantity);
    if (!qty || qty <= 0 || !Number.isInteger(qty)) {
      return res.status(400).json({ error: 'Quantity must be a positive integer' });
    }
    const discount = Number(applied_discount_percentage) || 0;
    if (discount < 0 || discount > 100) {
      return res.status(400).json({ error: 'Applied discount must be between 0% and 100%' });
    }

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
      const variant = await ProductVariant.findOne({ where: { id: product_variant_id, product_id } });
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
    const ceiling_discount = await resolveCeiling(organization_id, product.category, pricing_tier);
    const unit_cost = product.standard_unit_cost;

    const lineMath = computeLineMath({
      unit_list_price: list_price,
      unit_cost_price: unit_cost,
      quantity: qty,
      applied_discount_percentage: discount,
      effective_ceiling_limit: ceiling_discount
    });

    const maxLine = await QuotationLine.max('line_number', { where: { quotation_id: quotationId } });
    const line_number = (maxLine || 0) + 1;

    const line = await QuotationLine.create({
      quotation_id: quotationId,
      product_id,
      product_variant_id: product_variant_id || null,
      line_number,
      category: product.category,
      billing_cadence: product.billing_cadence || 'one_time',
      quantity: qty,
      unit_list_price: list_price,
      unit_cost_price: unit_cost,
      applied_discount_percentage: discount,
      effective_ceiling_limit: ceiling_discount,
      ...lineMath
    });

    await recalcQuotation(quotationId, organization_id);

    const lineJson = line.toJSON();
    lineJson.ceiling_discount = lineJson.effective_ceiling_limit;
    lineJson.list_price = lineJson.unit_list_price;
    lineJson.unit_cost = lineJson.unit_cost_price;

    res.status(201).json(lineJson);
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

    const line = await QuotationLine.findOne({ where: { id: lineId, quotation_id: quotationId } });
    if (!line) return res.status(404).json({ error: 'Line not found' });

    let newQuantity = line.quantity;
    if (quantity !== undefined) {
      const q = Number(quantity);
      if (!q || q <= 0 || !Number.isInteger(q)) {
        return res.status(400).json({ error: 'Quantity must be a positive integer' });
      }
      newQuantity = q;
    }

    let newDiscount = line.applied_discount_percentage;
    if (applied_discount_percentage !== undefined) {
      const d = Number(applied_discount_percentage);
      if (d < 0 || d > 100) {
        return res.status(400).json({ error: 'Applied discount must be between 0% and 100%' });
      }
      newDiscount = d;
    }

    const pricing_tier = quotation.customer_account?.pricing_tier || 'standard';
    const product = await Product.findOne({ where: { id: line.product_id, organization_id } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const ceiling_discount = await resolveCeiling(organization_id, product.category, pricing_tier);

    const lineMath = computeLineMath({
      unit_list_price: line.unit_list_price,
      unit_cost_price: line.unit_cost_price,
      quantity: newQuantity,
      applied_discount_percentage: newDiscount,
      effective_ceiling_limit: ceiling_discount
    });

    await line.update({
      quantity: newQuantity,
      applied_discount_percentage: newDiscount,
      effective_ceiling_limit: ceiling_discount,
      ...lineMath
    });

    await recalcQuotation(quotationId, organization_id);

    const lineJson = line.toJSON();
    lineJson.ceiling_discount = lineJson.effective_ceiling_limit;
    lineJson.list_price = lineJson.unit_list_price;
    lineJson.unit_cost = lineJson.unit_cost_price;

    res.json(lineJson);
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

    const line = await QuotationLine.findOne({ where: { id: lineId, quotation_id: quotationId } });
    if (!line) return res.status(404).json({ error: 'Line not found' });

    await line.destroy();

    await recalcQuotation(quotationId, organization_id);

    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteQuotation = async (req, res) => {
  try {
    const organization_id = req.orgContext.organizationId;
    const { quotationId } = req.params;

    const quotation = await Quotation.findOne({
      where: { id: quotationId, organization_id }
    });

    if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
    if (quotation.stage !== 'draft') {
      return res.status(409).json({ error: 'Only draft quotations can be deleted' });
    }

    await QuotationLine.destroy({ where: { quotation_id: quotationId } });
    await quotation.destroy();

    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const confirmQuotation = async (req, res) => {
  try {
    const organization_id = req.orgContext.organizationId;
    const { quotationId } = req.params;

    const quotation = await Quotation.findOne({
      where: { id: quotationId, organization_id },
      include: [{ model: QuotationLine, as: 'lines' }]
    });

    if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
    if (quotation.stage !== 'approved') {
      return res.status(409).json({
        error: `Cannot confirm quotation in '${quotation.stage}' stage. It must be approved before confirmation.`
      });
    }

    await quotation.update({
      stage: 'confirmed',
      confirmed_at: new Date()
    });

    // Downstream event processing: Invoices, Fulfillment, Subscriptions
    try {
      const { generateInvoiceFromQuote } = await import('../services/invoice.service.js');
      await generateInvoiceFromQuote(quotation.id);
    } catch (invErr) {
      console.error('[EVENT] Invoice generation error:', invErr.message);
    }

    try {
      const { executeFulfillmentAllocation } = await import('../services/fulfillment.service.js');
      await executeFulfillmentAllocation(quotation.organization_id, { quotationId: quotation.id });
    } catch (fulErr) {
      console.error('[EVENT] Fulfillment allocation error:', fulErr.message);
    }

    const hasRecurring = quotation.lines?.some(
      l => l.category === 'subscriptions' || (l.billing_cadence && l.billing_cadence !== 'one_time')
    );
    if (hasRecurring) {
      try {
        const { provisionSubscriptionFromQuote } = await import('../services/subscription.service.js');
        await provisionSubscriptionFromQuote(quotation.id);
      } catch (subErr) {
        console.error('[EVENT] Subscription provisioning error:', subErr.message);
      }
    }

    res.json({ message: 'Quotation confirmed successfully', quotation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getUpsells = async (req, res) => {
  try {
    const organization_id = req.orgContext.organizationId;
    const { quotationId } = req.params;

    const lines = await QuotationLine.findAll({
      where: { quotation_id: quotationId },
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
