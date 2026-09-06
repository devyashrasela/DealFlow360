import { Quotation, Organization, CustomerAccount, sequelize, QuotationLine, Product } from '../src/models/index.js';

async function run() {
  try {
    const org = await Organization.findOne();
    const acc = await CustomerAccount.findOne();
    const prod = await Product.findOne();
    const existingQ = await Quotation.findOne();

    if (!org || !acc || !prod || !existingQ) {
      console.log('Missing basic data');
      process.exit(1);
    }

    // 1. Margin Leak Quote
    const q1 = await Quotation.create({
      organization_id: org.id,
      customer_account_id: acc.id,
      quotation_number: 'Q-HACK-MARGIN-01',
      stage: 'pending_approval',
      blended_margin_percentage: 8.5, // Less than 15.0 floor
      grand_total: 50000,
      assigned_sales_rep_id: existingQ.assigned_sales_rep_id,
      price_list_id: existingQ.price_list_id,
      expiration_date: existingQ.expiration_date
    });
    
    // We must pass required QuotationLine fields
    await QuotationLine.create({
      quotation_id: q1.id,
      product_id: prod.id,
      quantity: 10,
      unit_price: 5000,
      total_price: 50000,
      line_number: 1,
      category: 'hardware',
      unit_list_price: 6000,
      unit_cost_price: 4500,
      effective_ceiling_limit: 10.0,
      unit_net_price: 5000,
      line_gross_amount: 60000,
      line_net_amount: 50000,
      line_cost_total: 45000,
      line_margin_amount: 5000,
      line_margin_percentage: 8.5
    });

    // 2. Stalled Deal Quote (Created 20 days ago)
    const twentyDaysAgo = new Date();
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);

    const q2 = await Quotation.create({
      organization_id: org.id,
      customer_account_id: acc.id,
      quotation_number: 'Q-HACK-STALLED-02',
      stage: 'pending_approval',
      blended_margin_percentage: 25.0, 
      grand_total: 120000,
      assigned_sales_rep_id: existingQ.assigned_sales_rep_id,
      price_list_id: existingQ.price_list_id,
      expiration_date: existingQ.expiration_date,
      createdAt: twentyDaysAgo,
      updatedAt: twentyDaysAgo
    });
    
    await QuotationLine.create({
      quotation_id: q2.id,
      product_id: prod.id,
      quantity: 1,
      unit_price: 120000,
      total_price: 120000,
      line_number: 1,
      category: 'hardware',
      unit_list_price: 150000,
      unit_cost_price: 90000,
      effective_ceiling_limit: 10.0,
      unit_net_price: 120000,
      line_gross_amount: 150000,
      line_net_amount: 120000,
      line_cost_total: 90000,
      line_margin_amount: 30000,
      line_margin_percentage: 25.0
    });

    // Manually force createdAt because Sequelize sometimes ignores it on create
    await sequelize.query(`UPDATE quotations SET created_at = '${twentyDaysAgo.toISOString().slice(0, 19).replace('T', ' ')}' WHERE id = '${q2.id}'`);

    console.log('✅ Injected 2 Problematic Quotations!');
    console.log('1. Margin Leak:', q1.quotation_number);
    console.log('2. Stalled Deal:', q2.quotation_number);
    console.log('Run scan() in the UI now!');
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
