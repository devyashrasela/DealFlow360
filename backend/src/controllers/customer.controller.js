import { CustomerAccount, Organization, User } from '../models/index.js';

export const listCustomers = async (req, res) => {
  try {
    const organization_id = req.orgContext.organizationId;
    const accounts = await CustomerAccount.findAll({
      where: { provider_organization_id: organization_id },
      include: [
        { model: Organization, as: 'buyer_organization', attributes: ['id', 'legal_name', 'trading_name'] },
        { model: User, as: 'assigned_sales_rep', attributes: ['id', 'full_name'] }
      ]
    });
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
