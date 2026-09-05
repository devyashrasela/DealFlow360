import { Warehouse } from '../models/index.js';

export const listWarehouses = async (req, res, next) => {
  try {
    const warehouses = await Warehouse.findAll({
      where: { organization_id: req.orgContext.organizationId, is_active: true }
    });
    res.json({ success: true, data: warehouses });
  } catch (err) {
    next(err);
  }
};

export const createWarehouse = async (req, res, next) => {
  try {
    const { code, name, shipping_base_fee, shipping_cost_multiplier, address } = req.body;
    const warehouse = await Warehouse.create({
      organization_id: req.orgContext.organizationId,
      code,
      name,
      shipping_base_fee,
      shipping_cost_multiplier,
      address,
      is_active: true
    });
    res.json({ success: true, data: warehouse });
  } catch (err) {
    next(err);
  }
};

export const updateWarehouse = async (req, res, next) => {
  try {
    const { code, name, shipping_base_fee, shipping_cost_multiplier, address } = req.body;
    const warehouse = await Warehouse.findOne({
      where: { id: req.params.id, organization_id: req.orgContext.organizationId }
    });
    
    if (!warehouse) return res.status(404).json({ success: false, error: 'Warehouse not found' });
    
    await warehouse.update({
      code,
      name,
      shipping_base_fee,
      shipping_cost_multiplier,
      address
    });
    
    res.json({ success: true, data: warehouse });
  } catch (err) {
    next(err);
  }
};

export const deleteWarehouse = async (req, res, next) => {
  try {
    const warehouse = await Warehouse.findOne({
      where: { id: req.params.id, organization_id: req.orgContext.organizationId }
    });
    
    if (!warehouse) return res.status(404).json({ success: false, error: 'Warehouse not found' });
    
    await warehouse.update({ is_active: false });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
