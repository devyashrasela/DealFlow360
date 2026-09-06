import { User, OrganizationMembership } from '../src/models/index.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

async function runTest() {
  const adminUser = await User.findOne({ where: { email: 'admin@acme.com' } });
  const membership = await OrganizationMembership.findOne({ where: { user_id: adminUser.id } });
  const orgId = membership.organization_id;
  
  const token = jwt.sign(
    { sub: adminUser.id, email: adminUser.email },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'X-Organization-Id': orgId
  };

  const countRes = await fetch('http://localhost:3000/api/notifications/unread-count', { headers });
  const text = await countRes.text();
  console.log(`Raw Unread Count Response: ${text}`);

  const listRes = await fetch('http://localhost:3000/api/notifications', { headers });
  const listText = await listRes.text();
  console.log(`Raw List Response: ${listText}`);
  
  process.exit(0);
}
runTest();
