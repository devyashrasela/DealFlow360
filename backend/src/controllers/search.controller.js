import { Op } from 'sequelize';
import {
  Quotation,
  CustomerAccount,
  Organization,
  Product,
  FulfillmentOrder,
  Invoice,
  Subscription
} from '../models/index.js';

export const globalSearch = async (req, res) => {
  try {
    const orgId = req.orgContext.organizationId;
    const rawQuery = (req.query.q || '').trim();

    if (!rawQuery || rawQuery.length < 2) {
      return res.status(200).json({
        query: rawQuery,
        totalCount: 0,
        results: {
          quotations: [],
          customers: [],
          orders: [],
          products: [],
          invoices: [],
          subscriptions: []
        }
      });
    }

    const searchTerm = `%${rawQuery}%`;

    // Concurrently search across all 6 core business domains
    const [quotations, customers, orders, products, invoices, subscriptions] = await Promise.all([
      // 1. Quotations
      Quotation.findAll({
        where: {
          organization_id: orgId,
          [Op.or]: [
            { quotation_number: { [Op.like]: searchTerm } },
            { stage: { [Op.like]: searchTerm } }
          ]
        },
        include: [{
          model: CustomerAccount,
          as: 'customer_account',
          include: [{
            model: Organization,
            as: 'buyer_organization',
            attributes: ['id', 'legal_name', 'trading_name']
          }]
        }],
        order: [['createdAt', 'DESC']],
        limit: 6
      }).catch(err => {
        console.error('Search quotations error:', err);
        return [];
      }),

      // 2. Customers (by account number, pricing tier, or buyer organization name)
      CustomerAccount.findAll({
        where: {
          provider_organization_id: orgId,
          [Op.or]: [
            { account_number: { [Op.like]: searchTerm } },
            { pricing_tier: { [Op.like]: searchTerm } }
          ]
        },
        include: [{
          model: Organization,
          as: 'buyer_organization',
          attributes: ['id', 'legal_name', 'trading_name', 'slug']
        }],
        limit: 6
      }).catch(err => {
        console.error('Search customers error:', err);
        return [];
      }),

      // 3. Fulfillment Orders
      FulfillmentOrder.findAll({
        where: {
          organization_id: orgId,
          [Op.or]: [
            { fulfillment_number: { [Op.like]: searchTerm } },
            { status: { [Op.like]: searchTerm } }
          ]
        },
        order: [['createdAt', 'DESC']],
        limit: 6
      }).catch(err => {
        console.error('Search fulfillment orders error:', err);
        return [];
      }),

      // 4. Products & SKUs
      Product.findAll({
        where: {
          organization_id: orgId,
          [Op.or]: [
            { sku: { [Op.like]: searchTerm } },
            { name: { [Op.like]: searchTerm } },
            { description: { [Op.like]: searchTerm } },
            { category: { [Op.like]: searchTerm } }
          ]
        },
        order: [['name', 'ASC']],
        limit: 6
      }).catch(err => {
        console.error('Search products error:', err);
        return [];
      }),

      // 5. Invoices
      Invoice.findAll({
        where: {
          organization_id: orgId,
          [Op.or]: [
            { invoice_number: { [Op.like]: searchTerm } },
            { status: { [Op.like]: searchTerm } },
            { document_type: { [Op.like]: searchTerm } }
          ]
        },
        order: [['createdAt', 'DESC']],
        limit: 6
      }).catch(err => {
        console.error('Search invoices error:', err);
        return [];
      }),

      // 6. Subscriptions
      Subscription.findAll({
        where: {
          organization_id: orgId,
          [Op.or]: [
            { subscription_code: { [Op.like]: searchTerm } },
            { status: { [Op.like]: searchTerm } },
            { billing_cadence: { [Op.like]: searchTerm } }
          ]
        },
        order: [['createdAt', 'DESC']],
        limit: 6
      }).catch(err => {
        console.error('Search subscriptions error:', err);
        return [];
      })
    ]);

    // Also check buyer organization name matches for customer accounts
    let enrichedCustomers = [...customers];
    if (enrichedCustomers.length < 6) {
      try {
        const orgMatches = await CustomerAccount.findAll({
          where: { provider_organization_id: orgId },
          include: [{
            model: Organization,
            as: 'buyer_organization',
            where: {
              [Op.or]: [
                { legal_name: { [Op.like]: searchTerm } },
                { trading_name: { [Op.like]: searchTerm } }
              ]
            },
            attributes: ['id', 'legal_name', 'trading_name', 'slug']
          }],
          limit: 6
        });

        const seenIds = new Set(enrichedCustomers.map(c => c.id));
        for (const om of orgMatches) {
          if (!seenIds.has(om.id)) {
            enrichedCustomers.push(om);
            seenIds.add(om.id);
          }
        }
      } catch (err) {
        console.error('Enrich customer search error:', err);
      }
    }

    // Format results for each domain
    const formattedQuotations = quotations.map(q => ({
      id: q.id,
      type: 'quotation',
      title: q.quotation_number,
      subtitle: q.customer_account?.buyer_organization?.legal_name || 'Customer Quotation',
      status: q.stage,
      badge: q.stage?.replace(/_/g, ' '),
      amount: q.grand_total ? `$${Number(q.grand_total).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : null,
      href: `/quotations/${q.id}`
    }));

    const formattedCustomers = enrichedCustomers.map(c => ({
      id: c.id,
      type: 'customer',
      title: c.buyer_organization?.legal_name || c.buyer_organization?.trading_name || `Account ${c.account_number}`,
      subtitle: `Account #${c.account_number} • ${c.pricing_tier || 'standard'} tier`,
      status: c.pricing_tier,
      badge: `${c.pricing_tier} Tier`,
      href: `/quotations`
    }));

    const formattedOrders = orders.map(o => ({
      id: o.id,
      type: 'order',
      title: o.fulfillment_number,
      subtitle: `Fulfillment Order • ${o.is_manual_override ? 'Manual Split' : 'Standard'}`,
      status: o.status,
      badge: o.status,
      href: `/fulfillment/orders/${o.id}`
    }));

    const formattedProducts = products.map(p => ({
      id: p.id,
      type: 'product',
      title: p.name,
      subtitle: `SKU: ${p.sku} • ${p.category}`,
      status: p.is_active ? 'active' : 'inactive',
      badge: p.category,
      amount: `$${Number(p.base_list_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      href: p.category === 'subscriptions' ? '/subscription-plans' : '/products'
    }));

    const formattedInvoices = invoices.map(i => ({
      id: i.id,
      type: 'invoice',
      title: i.invoice_number,
      subtitle: i.document_type?.replace(/_/g, ' ') || 'Invoice',
      status: i.status,
      badge: i.status,
      amount: i.total_amount ? `$${Number(i.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : null,
      href: `/invoices/${i.id}`
    }));

    const formattedSubscriptions = subscriptions.map(s => ({
      id: s.id,
      type: 'subscription',
      title: s.subscription_code,
      subtitle: `${s.billing_cadence || 'monthly'} subscription`,
      status: s.status,
      badge: s.status,
      amount: s.mrr_amount ? `$${Number(s.mrr_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}/mo` : null,
      href: `/subscriptions/${s.id}`
    }));

    const totalCount = 
      formattedQuotations.length +
      formattedCustomers.length +
      formattedOrders.length +
      formattedProducts.length +
      formattedInvoices.length +
      formattedSubscriptions.length;

    return res.status(200).json({
      query: rawQuery,
      totalCount,
      results: {
        quotations: formattedQuotations,
        customers: formattedCustomers,
        orders: formattedOrders,
        products: formattedProducts,
        invoices: formattedInvoices,
        subscriptions: formattedSubscriptions
      }
    });

  } catch (error) {
    console.error('Global search unexpected error:', error);
    return res.status(500).json({ error: error.message || 'Internal search failure' });
  }
};
