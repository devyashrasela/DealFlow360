import { Product, ProductVariant, PriceList, PriceListItem, UpsellRule, ProductAttachment } from '../models/index.js';

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
        { model: ProductVariant, as: 'variants', attributes: ['id'] }
      ]
    });

    const products = rows.map(product => {
      const prodJson = product.toJSON();
      prodJson.variants_count = prodJson.variants ? prodJson.variants.length : 0;
      delete prodJson.variants;
      
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
