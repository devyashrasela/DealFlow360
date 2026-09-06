import jwt from 'jsonwebtoken';
import { User, Organization } from '../src/models/index.js';

async function run() {
    const user = await User.findOne({ where: { email: 'admin@acme.com' } });
    const org = await Organization.findOne();
    const token = jwt.sign(
      { sub: user.id, email: user.email, roles: ['admin'], orgId: org.id },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '1h' }
    );
    console.log(token);
    process.exit(0);
}
run();
