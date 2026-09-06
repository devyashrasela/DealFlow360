import { Product, ProductVariant, PriceList, PriceListItem, UpsellRule, ProductAttachment, ApprovalChain, Quotation, QuotationLine } from '../models/index.js';

// --- Products CRUD ---

export const createProduct = async (req, res) => {
  try {
    const organization_id = req.orgContext.organizationId;
    const { sku, name, description, category, billing_cadence, base_list_price, standard_unit_cost } = req.body;
    
    const product = await Product.create({
      organization_id,
      sku,
      name,
      description,
      category,
      billing_cadence,
      base_list_price,
      standard_unit_cost,
      is_active: true
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const listProducts = async (req, res) => {
  try {
    const organization_id = req.orgContext.organizationId;
    const { category, is_active, page = 1, limit = 20 } = req.query;

    const whereClause = { organization_id };
    if (category) whereClause.category = category;
    if (is_active !== undefined) whereClause.is_active = is_active === 'true';

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const { count, rows } = await Product.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit, 10),
      offset,
      include: [
        { 
          model: ProductVariant, 
          as: 'variants', 
          attributes: ['id', 'variant_sku', 'variant_name', 'price_delta', 'attributes', 'is_active'],
          where: { is_active: true },
          required: false 
        }
      ]
    });

    const products = rows.map(product => {
      const prodJson = product.toJSON();
      prodJson.variants = prodJson.variants || [];
      prodJson.variants_count = prodJson.variants.length;
      
      // Omit internal fields if necessary depending on the consumer, but as per requirements, these are internal users.
      // If customer role was allowed, we'd delete standard_unit_cost here.
      
      return prodJson;
    });

    res.status(200).json({
      products,
      total: count,
      page: parseInt(page, 10),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getProduct = async (req, res) => {
  try {
    const organization_id = req.orgContext.organizationId;
    const { productId } = req.params;

    const product = await Product.findOne({
      where: { id: productId, organization_id },
      include: [
        { model: ProductVariant, as: 'variants' },
        { model: PriceListItem, as: 'price_list_items' }
      ]
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const organization_id = req.orgContext.organizationId;
    const { productId } = req.params;
    const { sku, name, description, category, billing_cadence, base_list_price, standard_unit_cost, is_active } = req.body;

    const product = await Product.findOne({ where: { id: productId, organization_id } });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await product.update({
      sku,
      name,
      description,
      category,
      billing_cadence,
      base_list_price,
      standard_unit_cost,
      is_active
    });

    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const organization_id = req.orgContext.organizationId;
    const { productId } = req.params;

    const product = await Product.findOne({ where: { id: productId, organization_id } });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await product.update({ is_active: false });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --- Product Variants CRUD ---

export const createVariant = async (req, res) => {
  try {
    const organization_id = req.orgContext.organizationId;
    const { productId } = req.params;
    
    const product = await Product.findOne({ where: { id: productId, organization_id } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const { variant_sku, variant_name, price_delta, cost_delta, attributes } = req.body;

    const variant = await ProductVariant.create({
      product_id: productId,
      variant_sku,
      variant_name,
      price_delta,
      cost_delta,
      attributes,
      is_active: true
    });

    res.status(201).json(variant);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const listVariants = async (req, res) => {
  try {
    const organization_id = req.orgContext.organizationId;
    const { productId } = req.params;

    const product = await Product.findOne({ where: { id: productId, organization_id } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const variants = await ProductVariant.findAll({
      where: { product_id: productId }
    });

    res.status(200).json(variants);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateVariant = async (req, res) => {
  try {
    const organization_id = req.orgContext.organizationId;
    const { productId, variantId } = req.params;

    const product = await Product.findOne({ where: { id: productId, organization_id } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const variant = await ProductVariant.findOne({ where: { id: variantId, product_id: productId } });
    if (!variant) return res.status(404).json({ error: 'Variant not found' });

    const { variant_sku, variant_name, price_delta, cost_delta, attributes, is_active } = req.body;

    await variant.update({
      variant_sku,
      variant_name,
      price_delta,
      cost_delta,
      attributes,
      is_active
    });

    res.status(200).json(variant);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteVariant = async (req, res) => {
  try {
    const organization_id = req.orgContext.organizationId;
    const { productId, variantId } = req.params;

    const product = await Product.findOne({ where: { id: productId, organization_id } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const variant = await ProductVariant.findOne({ where: { id: variantId, product_id: productId } });
    if (!variant) return res.status(404).json({ error: 'Variant not found' });

    await variant.update({ is_active: false });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --- Price Lists CRUD ---

export const createPriceList = async (req, res) => {
  try {
    const organization_id = req.orgContext.organizationId;
    const { name, tier, currency, effective_start, effective_end } = req.body;

    const priceList = await PriceList.create({
      organization_id,
      name,
      tier,
      currency,
      effective_start,
      effective_end,
      is_active: true
    });

    res.status(201).json(priceList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const listPriceLists = async (req, res) => {
  try {
    const organization_id = req.orgContext.organizationId;
    const priceLists = await PriceList.findAll({ where: { organization_id } });

    res.status(200).json(priceLists);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getPriceList = async (req, res) => {
  try {
    const organization_id = req.orgContext.organizationId;
    const { priceListId } = req.params;

    const priceList = await PriceList.findOne({
      where: { id: priceListId, organization_id },
      include: [
        {
          model: PriceListItem,
          as: 'items',
          include: [{ model: Product, as: 'product', attributes: ['name', 'sku'] }]
        }
      ]
    });

    if (!priceList) return res.status(404).json({ error: 'PriceList not found' });

    res.status(200).json(priceList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updatePriceList = async (req, res) => {
  try {
    const organization_id = req.orgContext.organizationId;
    const { priceListId } = req.params;
    const { name, tier, currency, effective_start, effective_end, is_active } = req.body;

    const priceList = await PriceList.findOne({ where: { id: priceListId, organization_id } });
    if (!priceList) return res.status(404).json({ error: 'PriceList not found' });

    await priceList.update({
      name,
      tier,
      currency,
      effective_start,
      effective_end,
      is_active
    });

    res.status(200).json(priceList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --- Price List Items CRUD ---

export const addPriceListItem = async (req, res) => {
  try {
    const organization_id = req.orgContext.organizationId;
    const { priceListId } = req.params;
    const { product_id, product_variant_id, custom_unit_price } = req.body;

    const priceList = await PriceList.findOne({ where: { id: priceListId, organization_id } });
    if (!priceList) return res.status(404).json({ error: 'PriceList not found' });

    const item = await PriceListItem.create({
      price_list_id: priceListId,
      product_id,
      product_variant_id,
      custom_unit_price
    });

    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updatePriceListItem = async (req, res) => {
  try {
    const organization_id = req.orgContext.organizationId;
    const { priceListId, itemId } = req.params;
    const { custom_unit_price } = req.body;

    const priceList = await PriceList.findOne({ where: { id: priceListId, organization_id } });
    if (!priceList) return res.status(404).json({ error: 'PriceList not found' });

    const item = await PriceListItem.findOne({ where: { id: itemId, price_list_id: priceListId } });
    if (!item) return res.status(404).json({ error: 'PriceListItem not found' });

    await item.update({ custom_unit_price });

    res.status(200).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const removePriceListItem = async (req, res) => {
  try {
    const organization_id = req.orgContext.organizationId;
    const { priceListId, itemId } = req.params;

    const priceList = await PriceList.findOne({ where: { id: priceListId, organization_id } });
    if (!priceList) return res.status(404).json({ error: 'PriceList not found' });

    const item = await PriceListItem.findOne({ where: { id: itemId, price_list_id: priceListId } });
    if (!item) return res.status(404).json({ error: 'PriceListItem not found' });

    await item.destroy();

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --- Dynamic Price Resolver ---

export const resolvePrice = async (req, res) => {
  try {
    const organization_id = req.orgContext.organizationId;
    const { product_id, product_variant_id, price_list_id } = req.body;

    const product = await Product.findOne({ where: { id: product_id, organization_id } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    let variant = null;
    if (product_variant_id) {
      variant = await ProductVariant.findOne({ where: { id: product_variant_id, product_id } });
      if (!variant) return res.status(404).json({ error: 'Variant not found' });
    }

    let unit_price = null;
    let source = 'base_price';

    // Check PriceList
    if (price_list_id) {
      const priceList = await PriceList.findOne({ where: { id: price_list_id, organization_id } });
      if (priceList) {
        const whereClause = { price_list_id, product_id };
        if (product_variant_id) whereClause.product_variant_id = product_variant_id;
        else whereClause.product_variant_id = null; // Assuming null when no variant

        const priceItem = await PriceListItem.findOne({ where: whereClause });
        if (priceItem) {
          unit_price = parseFloat(priceItem.custom_unit_price);
          source = 'price_list';
        }
      }
    }

    // Fallback to Base Price
    if (unit_price === null) {
      unit_price = parseFloat(product.base_list_price);
      if (variant) {
        unit_price += parseFloat(variant.price_delta || 0);
      }
    }

    // Calculate cost
    let unit_cost = parseFloat(product.standard_unit_cost);
    if (variant) {
      unit_cost += parseFloat(variant.cost_delta || 0);
    }

    res.status(200).json({
      unit_price,
      unit_cost,
      source
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --- Upsell & Cross-Sell Engine CRUD ---

export const listUpsellRules = async (req, res) => {
  try {
    const organization_id = req.orgContext.organizationId;
    const rules = await UpsellRule.findAll({
      where: { organization_id },
      include: [
        { model: Product, as: 'trigger_product' },
        { model: Product, as: 'recommended_product' }
      ],
      order: [['priority_rank', 'ASC']]
    });

    const rulesWithPct = await Promise.all(rules.map(async (rule) => {
      let coPurchasePct = 0;
      
      try {
        // TODO: Optimize N+1 query. This should be a single aggregate query in future.
        // 1. Find all quotations that have the trigger product
        const triggerLines = await QuotationLine.findAll({
          attributes: ['quotation_id'],
          where: { product_id: rule.trigger_product_id },
          include: [{ 
            model: Quotation, 
            as: 'quotation',
            where: { organization_id, stage: ['approved', 'confirmed'] } 
          }]
        });
        
        const triggerQuotationIds = [...new Set(triggerLines.map(line => line.quotation_id))];
        
        if (triggerQuotationIds.length > 0) {
          // 2. Find how many of those quotations ALSO have the recommended product
          const recommendedLines = await QuotationLine.findAll({
            attributes: ['quotation_id'],
            where: { 
              product_id: rule.recommended_product_id,
              quotation_id: triggerQuotationIds
            }
          });
          const coPurchaseQuotationIds = [...new Set(recommendedLines.map(line => line.quotation_id))];
          
          coPurchasePct = Math.round((coPurchaseQuotationIds.length / triggerQuotationIds.length) * 100);
        }
      } catch (error) {
        console.error(`Error calculating co-purchase pct for rule ${rule.id}:`, error);
      }
      
      const ruleData = rule.toJSON();
      ruleData.co_purchase_pct = coPurchasePct;
      return ruleData;
    }));

    res.status(200).json(rulesWithPct);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createUpsellRule = async (req, res) => {
  try {
    const organization_id = req.orgContext.organizationId;
    const { trigger_product_id, recommended_product_id, priority_rank = 1, promotional_discount_percent = 0, is_promoted = false, is_active = true } = req.body;
    
    if (trigger_product_id === recommended_product_id) {
      return res.status(400).json({ error: 'Trigger and recommended product cannot be the same' });
    }

    const rule = await UpsellRule.create({
      organization_id,
      trigger_product_id,
      recommended_product_id,
      priority_rank,
      promotional_discount_percent,
      is_promoted,
      is_active
    });
    res.status(201).json(rule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateUpsellRule = async (req, res) => {
  try {
    const organization_id = req.orgContext.organizationId;
    const { ruleId } = req.params;
    const rule = await UpsellRule.findOne({ where: { id: ruleId, organization_id } });
    if (!rule) return res.status(404).json({ error: 'Upsell rule not found' });
    
    const { priority_rank, promotional_discount_percent, is_promoted, is_active } = req.body;
    await rule.update({ priority_rank, promotional_discount_percent, is_promoted, is_active });
    
    res.status(200).json(rule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteUpsellRule = async (req, res) => {
  try {
    const organization_id = req.orgContext.organizationId;
    const { ruleId } = req.params;
    const rule = await UpsellRule.findOne({ where: { id: ruleId, organization_id } });
    if (!rule) return res.status(404).json({ error: 'Upsell rule not found' });
    await rule.destroy();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getUpsellConfig = async (req, res) => {
  try {
    const organization_id = req.orgContext.organizationId;
    const chain = await ApprovalChain.findOne({ 
      where: { organization_id },
      order: [['createdAt', 'ASC']]
    });
    const minimum_margin_threshold = chain ? parseFloat(chain.minimum_upsell_margin_threshold || 20) : 20;
    res.status(200).json({ minimum_margin_threshold });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateUpsellConfig = async (req, res) => {
  try {
    const organization_id = req.orgContext.organizationId;
    const { minimum_margin_threshold } = req.body;
    if (minimum_margin_threshold !== undefined) {
      await ApprovalChain.update(
        { minimum_upsell_margin_threshold },
        { where: { organization_id } }
      );
    }
    res.status(200).json({ minimum_margin_threshold });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

