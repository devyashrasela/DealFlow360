import { Quotation, QuotationLine, RepDiscountBaseline, sequelize } from '../src/models/index.js';

async function run() {
  try {
    // 1. Fix Stalled Deal
    const stalledQ = await Quotation.findOne({ where: { quotation_number: 'Q-HACK-STALLED-02' } });
    if (stalledQ) {
      const twentyDaysAgo = new Date();
      twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);
      const iso = twentyDaysAgo.toISOString().slice(0, 19).replace('T', ' ');
      
      await sequelize.query(`UPDATE quotations SET updated_at = '${iso}', created_at = '${iso}' WHERE id = '${stalledQ.id}'`);
      console.log('Fixed updated_at for Stalled Deal');
    } else {
        console.log('Q-HACK-STALLED-02 not found');
    }

    // 2. Fix Discount Anomaly
    const leakQ = await Quotation.findOne({ where: { quotation_number: 'Q-HACK-MARGIN-01' } });
    if (leakQ) {
      // Create a baseline for the rep
      await RepDiscountBaseline.upsert({
        organization_id: leakQ.organization_id,
        sales_rep_id: leakQ.assigned_sales_rep_id,
        completed_deal_count: 50,
        mean_discount_percentage: 10,
        std_dev_percentage: 2,
        cohort_mean_discount_percentage: 10,
        cohort_std_dev_percentage: 2,
        effective_anomaly_threshold: 15 // Anomaly triggers > 15%
      });
      console.log('Created RepDiscountBaseline');

      // Update the line item to have a massive applied_discount_percentage
      await sequelize.query(`UPDATE quotation_lines SET applied_discount_percentage = 45.0 WHERE quotation_id = '${leakQ.id}'`);
      console.log('Fixed applied_discount_percentage for Margin Leak');
    } else {
        console.log('Q-HACK-MARGIN-01 not found');
    }

    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
