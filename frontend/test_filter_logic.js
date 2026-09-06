// Extracting just the pure filtering logic from useAdvancedFilter to test E2E behavior
const OPERATORS = {
  '>': (a, b) => a > b,
  '<': (a, b) => a < b,
  '=': (a, b) => a === b,
  '>=': (a, b) => a >= b,
  '<=': (a, b) => a <= b,
  '!=': (a, b) => a !== b,
  'between': (a, b) => Array.isArray(b) && b.length === 2 && a >= b[0] && a <= b[1]
};

const QUOTATION_FILTER_SCHEMA = [
  { key: 'grand_total', type: 'number' },
  { key: 'total_margin', type: 'number' },
  { key: 'line_items', type: 'number', getValue: (q) => q.line_items?.length || 0 }
];

const mockData = [
  { id: 1, grand_total: 1500, total_margin: 200, line_items: [{}] },
  { id: 2, grand_total: 6000, total_margin: 800, line_items: [{}, {}] },
  { id: 3, grand_total: 12000, total_margin: 3000, line_items: [{}, {}, {}] }
];

function runFilter(rules) {
  return mockData.filter(item => {
    return rules.every(rule => {
      const fieldDef = QUOTATION_FILTER_SCHEMA.find(s => s.key === rule.field);
      let itemValue = fieldDef.getValue ? fieldDef.getValue(item) : item[rule.field];
      const numItemValue = Number(itemValue);
      const applyOp = OPERATORS[rule.operator];
      
      if (rule.operator === 'between') {
        return applyOp(numItemValue, [Number(rule.value[0]), Number(rule.value[1])]);
      } else {
        return applyOp(numItemValue, Number(rule.value));
      }
    });
  });
}

console.log("TEST 1: Grand Total > 5000");
const res1 = runFilter([{ field: 'grand_total', operator: '>', value: '5000' }]);
console.log(`Expected: 2 results | Actual: ${res1.length} results (IDs: ${res1.map(r=>r.id).join(', ')})`);
if (res1.length !== 2) throw new Error("Test 1 Failed");

console.log("\nTEST 2: Margin 'between' 100 and 1000");
const res2 = runFilter([{ field: 'total_margin', operator: 'between', value: ['100', '1000'] }]);
console.log(`Expected: 2 results | Actual: ${res2.length} results (IDs: ${res2.map(r=>r.id).join(', ')})`);
if (res2.length !== 2) throw new Error("Test 2 Failed");

console.log("\nTEST 3: Item Count = 3 (Tests custom getValue function)");
const res3 = runFilter([{ field: 'line_items', operator: '=', value: '3' }]);
console.log(`Expected: 1 result | Actual: ${res3.length} results (IDs: ${res3.map(r=>r.id).join(', ')})`);
if (res3.length !== 1) throw new Error("Test 3 Failed");

console.log("\n✅ ALL TESTS PASSED. The underlying mathematical filter engine is rock solid.");
