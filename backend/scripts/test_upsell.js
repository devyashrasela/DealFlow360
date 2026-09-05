import { getUpsellSuggestions } from '../src/services/riskEngine.service.js';
import { Organization, Product } from '../src/models/index.js';
import db from '../src/models/index.js';

async function runTest() {
  try {
    console.log('--- Testing Upsell Logic ---');
    const org = await Organization.findOne({ where: { slug: 'acme-provider' } });
    if (!org) throw new Error('Org not found');

    const triggerProduct = await Product.findOne({ where: { sku: 'HW-SRV-001', organization_id: org.id } });
    if (!triggerProduct) throw new Error('Trigger product not found');

    console.log(`Trigger Product: ${triggerProduct.name} (${triggerProduct.sku})`);

    // Test 1: Threshold lower than margin (e.g., 50% threshold, margin is 60%)
    console.log('\n[Test 1] Minimum Threshold: 50% (Expected: Should return Team Training)');
    let suggestions = await getUpsellSuggestions(org.id, [triggerProduct.id], 50);
    console.log(JSON.stringify(suggestions, null, 2));

    // Test 2: Threshold higher than margin (e.g., 70% threshold, margin is 60%)
    console.log('\n[Test 2] Minimum Threshold: 70% (Expected: Should return empty array / suppressed)');
    suggestions = await getUpsellSuggestions(org.id, [triggerProduct.id], 70);
    console.log(JSON.stringify(suggestions, null, 2));

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await db.sequelize.close();
  }
}

runTest();
