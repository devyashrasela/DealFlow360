import { emitEvent } from '../src/services/notification.service.js';
import { User, Organization, Notification, ActivityEvent } from '../src/models/index.js';

async function runTest() {
  try {
    console.log('1. Fetching a test organization and user...');
    const org = await Organization.findOne();
    const user = await User.findOne();
    
    if (!org || !user) {
      console.log('Missing org or user to test with.');
      process.exit(1);
    }
    
    console.log(`Using Org: ${org.id} | User: ${user.email}`);

    console.log('\n2. Emitting a test Deal Health warning event...');
    // We'll target the specific user so we guarantee they get it
    const event = await emitEvent({
      organizationId: org.id,
      actorUserId: user.id,
      eventType: 'deal_health.warning',
      entityType: 'quotation',
      entityId: '00000000-0000-0000-0000-000000000000', // dummy ID
      title: 'TEST NOTIFICATION: Margin Leak Detected',
      description: 'This is an automated test from the CLI',
      metadata: { test: true },
      severity: 'warning',
      targetUserIds: [user.id] // Force fan-out to this specific user
    });

    console.log(`✅ Event Created: ${event.id} | Title: "${event.title}"`);

    console.log('\n3. Verifying notification delivery in database...');
    const notifs = await Notification.findAll({
      where: { activity_event_id: event.id }
    });

    console.log(`✅ Found ${notifs.length} notification(s) routed.`);
    if (notifs.length > 0) {
      console.log(`   Notification ID: ${notifs[0].id}`);
      console.log(`   Delivered To User: ${notifs[0].user_id}`);
      console.log(`   Is Read: ${notifs[0].is_read}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

runTest();
