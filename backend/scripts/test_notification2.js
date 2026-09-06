import { emitEvent } from '../src/services/notification.service.js';
import { User, Organization, Notification, ActivityEvent } from '../src/models/index.js';

async function runTest() {
  const org = await Organization.findOne();
  const user = await User.findOne();

  console.log('\n2. Emitting test event as SYSTEM (no actor_user_id)...');
  const event = await emitEvent({
    organizationId: org.id,
    actorUserId: null, // System event
    eventType: 'deal_health.warning',
    entityType: 'quotation',
    entityId: '00000000-0000-0000-0000-000000000000',
    title: 'SYSTEM TEST: Deal has stalled',
    severity: 'warning',
    targetUserIds: [user.id] // Force fan-out to this specific user
  });

  const notifs = await Notification.findAll({ where: { activity_event_id: event.id } });

  console.log(`✅ Found ${notifs.length} notification(s) routed.`);
  if (notifs.length > 0) {
    console.log(`   Notification ID: ${notifs[0].id}`);
    console.log(`   Delivered To User: ${notifs[0].user_id}`);
    console.log(`   Is Read: ${notifs[0].is_read}`);
  }
  process.exit(0);
}
runTest();
