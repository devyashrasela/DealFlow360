import { Op, literal } from 'sequelize';
import { Quotation, QuotationLine, RepDiscountBaseline, Organization } from '../src/models/index.js';

async function run() {
    const org = await Organization.findOne();
    const alerts = [];

    // STALLED
    const staleCutoff = new Date(Date.now() - 5 * 86400000);
    const stalled = await Quotation.findAll({
      attributes: { include: [[literal('updated_at'), 'raw_updated_at']] },
      where: {
        organization_id: org.id,
        stage: { [Op.in]: ['draft', 'pending_approval', 'under_negotiation'] },
        updated_at: { [Op.lte]: staleCutoff },
      },
    });
    console.log('Stalled Deals Found:', stalled.length);
    if(stalled.length > 0) console.log(stalled.map(s => s.quotation_number));

    // LEAK
    const baselines = await RepDiscountBaseline.findAll({ where: { organization_id: org.id } });
    const baselineMap = new Map(baselines.map(b => [b.sales_rep_id, b]));
    const activeQuotes = await Quotation.findAll({
      where: {
        organization_id: org.id,
        stage: { [Op.in]: ['draft', 'pending_approval', 'under_negotiation'] },
      },
      include: [{ model: QuotationLine, as: 'lines' }],
    });
    console.log('Active Quotes Found:', activeQuotes.length);
    let leakCount = 0;
    for (const q of activeQuotes) {
      const baseline = baselineMap.get(q.assigned_sales_rep_id);
      if (!baseline) continue;
      const threshold = baseline.effective_anomaly_threshold;
      for (const line of q.lines || []) {
        if (parseFloat(line.applied_discount_percentage) > threshold) {
          leakCount++;
          console.log('Leak found in:', q.quotation_number);
        }
      }
    }
    console.log('Leaks Found:', leakCount);
    process.exit(0);
}
run();
