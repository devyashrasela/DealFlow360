import { Quotation, QuotationLine, Warehouse, WarehouseStock, Backorder, FulfillmentOrder } from '../src/models/index.js';
import { executeFulfillmentAllocation } from '../src/services/fulfillment.service.js';

async function run() {
  try {
    const warehouses = await Warehouse.findAll({ limit: 2 });
    const w1 = warehouses[0];
    const w2 = warehouses[1];
    
    // Find specific quotation
    let q = await Quotation.findByPk('01896c30-1557-41e1-99b8-45aa2e5547a3', { include: [{ model: QuotationLine, as: 'lines' }] });
    const line = q.lines[0];
    
    // Clean up past runs
    await FulfillmentOrder.destroy({ where: { quotation_id: q.id } });
    await Backorder.destroy({ where: { quotation_id: q.id } });
    
    // Update inventory: W1 has 5, W2 has 5
    await WarehouseStock.update(
      { on_hand_quantity: 5, hard_allocated_quantity: 0 }, 
      { where: { warehouse_id: w1.id, product_id: line.product_id, product_variant_id: line.product_variant_id } }
    );
    await WarehouseStock.update(
      { on_hand_quantity: 5, hard_allocated_quantity: 0 }, 
      { where: { warehouse_id: w2.id, product_id: line.product_id, product_variant_id: line.product_variant_id } }
    );
    
    console.log(`\nExecuting Auto-Split Fulfillment Engine...`);
    const result = await executeFulfillmentAllocation(q.organization_id, { quotationId: q.id });
    console.log(`\n✅ Engine Execution Successful!`);
    console.log(JSON.stringify(result, null, 2));
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
