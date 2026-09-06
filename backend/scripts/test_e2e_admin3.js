import { User, OrganizationMembership } from '../src/models/index.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

async function runTest() {
  const adminUser = await User.findOne({ where: { email: 'admin@acme.com' } });
  const membership = await OrganizationMembership.findOne({ where: { user_id: adminUser.id } });
  const orgId = membership.organization_id;
  
  const token = jwt.sign(
    { id: adminUser.id, email: adminUser.email }, // auth.middleware.js usually uses 'id', not 'sub'
    JWT_SECRET,
    { expiresIn: '8h' }
  );
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'X-Organization-Id': orgId
  };

  const countRes = await fetch('http://localhost:5000/api/notifications/unread-count', { headers });
  const countData = await countRes.json();
  console.log(`Unread Count: ${countData.count}`);

  const listRes = await fetch('http://localhost:5000/api/notifications', { headers });
  const listData = await listRes.json();
  
  if (listData.notifications && listData.notifications.length > 0) {
    console.log(`✅ Latest Notification from API on PORT 5000:`);
    console.log(`   Title: ${listData.notifications[0].activity_event.title}`);
  } else {
    console.log('❌ No notifications found via API on port 5000.');
  }
  
  process.exit(0);
}
runTest();
