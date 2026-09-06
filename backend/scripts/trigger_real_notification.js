import { emitEvent } from '../src/services/notification.service.js';
import { Quotation, User } from '../src/models/index.js';

async function run() {
  const q = await Quotation.findOne({ where: { quotation_number: 'Q-1004' } });
  const rep = await User.findOne({ where: { email: 'omar.rep@acme.com' } });
  
  await emitEvent({
    organizationId: q.organization_id,
    actorUserId: rep.id,
    eventType: 'quotation.submitted',
    entityType: 'quotation',
    entityId: q.id,
    title: `Quotation ${q.quotation_number} submitted for approval`,
    description: 'Omar requested a 12% discount on this deal.',
    metadata: { quotationNumber: q.quotation_number, grandTotal: q.grand_total, salesRepUserId: rep.id },
    severity: 'info'
  });
  
  console.log('Real notification generated successfully for Q-1004!');
  process.exit(0);
}
run();
