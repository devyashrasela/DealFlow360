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

  const countRes = await fetch('http://localhost:5000/api/notifications/unread-count', { headers });
  const countText = await countRes.text();
  console.log(`Unread Count Raw: ${countText}`);

  const listRes = await fetch('http://localhost:5000/api/notifications', { headers });
  const listText = await listRes.text();
  console.log(`List Raw: ${listText}`);
  
  process.exit(0);
}
runTest();
