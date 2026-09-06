import fs from 'fs';

const p = '/home/mium/code/DealFlow360/backend/src/controllers/dealHealth.controller.js';
let content = fs.readFileSync(p, 'utf-8');

// Ensure FulfillmentAllocation is imported
if (!content.includes('FulfillmentAllocation')) {
    content = content.replace('Warehouse', 'Warehouse,\n  FulfillmentAllocation');
}

// Replace the invalid Warehouse include
const oldInclude = `{ model: Warehouse, as: 'warehouse', attributes: ['id', 'name', 'code'] },`;
const newInclude = `{ 
            model: FulfillmentAllocation, 
            as: 'allocations', 
            include: [{ model: Warehouse, as: 'warehouse', attributes: ['id', 'name', 'code'] }] 
          },`;

content = content.replace(oldInclude, newInclude);

fs.writeFileSync(p, content, 'utf-8');
console.log('Fixed dealHealth.controller.js');
