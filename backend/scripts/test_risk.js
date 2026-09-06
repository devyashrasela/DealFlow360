import { determineRiskTier } from '../src/services/riskEngine.service.js';

async function test() {
  const res = await determineRiskTier("89dd6f1e-d288-42e3-a08b-75fa1a7707ee", 0.00, 0.00, 20.00);
  console.log(res);
}
test();
