import { emitEvent } from '../src/services/notification.service.js';
import { User, OrganizationMembership } from '../src/models/index.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

async function runTest() {
  try {
    const adminUser = await User.findOne({ where: { email: 'admin@acme.com' } });
    const membership = await OrganizationMembership.findOne({ where: { user_id: adminUser.id } });
    const orgId = membership.organization_id;
    const otherUser = await User.findOne({ where: { email: 'portal@apex.com' } }) || await User.findOne();
    
    // 1. Force the password to 'admin123' if it's not (just in case they need to log in manually)
    import('bcryptjs').then(async (bcrypt) => {
       const hash = await bcrypt.default.hash('admin123', 10);
       await adminUser.update({ password_hash: hash });
    });

    console.log(`2. Simulating a backorder event triggered by ${otherUser.email}...`);
    await emitEvent({
      organizationId: orgId,
      actorUserId: otherUser.id,
      eventType: 'fulfillment.backorder',
      entityType: 'fulfillment_order',
      entityId: '11111111-1111-1111-1111-111111111111',
      title: 'E2E TEST: Order ORD-9999 is on backorder',
      severity: 'warning'
    });

    // 3. Generate Token exactly as auth.controller would
    const token = jwt.sign(
      { sub: adminUser.id, email: adminUser.email },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'X-Organization-Id': orgId
    };

    console.log('4. Calling GET /api/notifications/unread-count...');
    const countRes = await fetch('http://localhost:3000/api/notifications/unread-count', { headers });
    const countData = await countRes.json();
    console.log(`   Unread Count: ${countData.count}`);

    console.log('5. Calling GET /api/notifications...');
    const listRes = await fetch('http://localhost:3000/api/notifications?limit=2', { headers });
    const listData = await listRes.json();
    
    if (listData.notifications && listData.notifications.length > 0) {
      const latest = listData.notifications[0];
      console.log(`   ✅ Success! Latest Notification fetched via API:`);
      console.log(`      ID: ${latest.id}`);
      console.log(`      Title: ${latest.activity_event.title}`);
      console.log(`      Read Status: ${latest.is_read}`);
    } else {
      console.log('   ❌ No notifications returned from API.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}
runTest();
