import fs from 'fs';

const p = '/home/mium/code/DealFlow360/backend/src/controllers/reporting.controller.js';
let content = fs.readFileSync(p, 'utf-8');

const routeCode = `
// ──────────────────────────────────────────────
// GET /api/reports/top-customers
// Return top customers by confirmed revenue
// ──────────────────────────────────────────────
router.get('/top-customers', async (req, res) => {
  try {
    const org = req.orgContext.organizationId;
    
    // Aggregate from Quotations directly
    const customers = await Quotation.findAll({
      where: {
        organization_id: org,
        stage: 'confirmed'
      },
      attributes: [
        'customer_account_id',
        [fn('COUNT', col('Quotation.id')), 'deals'],
        [fn('SUM', col('grand_total')), 'revenue']
      ],
      include: [
        {
          model: CustomerAccount,
          as: 'customer_account',
          attributes: ['id'],
          include: [{ model: Organization, as: 'buyer_organization', attributes: ['legal_name'] }]
        }
      ],
      group: ['customer_account_id', 'customer_account.id', 'customer_account->buyer_organization.id'],
      order: [[literal('revenue'), 'DESC']],
      limit: 5
    });

    const results = customers.map(c => {
      const rev = Number(c.get('revenue')) || 0;
      return {
        name: c.customer_account?.buyer_organization?.legal_name || 'Unknown',
        deals: Number(c.get('deals')) || 0,
        revenue: rev,
        status: rev > 100000 ? 'On Track' : 'Watchlist',
        statusColor: rev > 100000 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-neutral-100 text-neutral-600 border-neutral-300'
      };
    });

    res.json(results);
  } catch (error) {
    console.error('Top Customers Error:', error);
    res.status(500).json({ error: error.message });
  }
});
`;

if (!content.includes('/top-customers')) {
  // insert before the last export default router
  content = content.replace('export default router;', routeCode + '\nexport default router;');
  fs.writeFileSync(p, content, 'utf-8');
  console.log('Added /top-customers route');
} else {
  console.log('Already exists');
}
