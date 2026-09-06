import { useState, useMemo } from 'react';

// Operator definitions
export const OPERATORS = {
  '>': (a, b) => a > b,
  '<': (a, b) => a < b,
  '=': (a, b) => a === b,
  '>=': (a, b) => a >= b,
  '<=': (a, b) => a <= b,
  '!=': (a, b) => a !== b,
  'between': (a, b) => {
    if (!Array.isArray(b) || b.length !== 2) return false;
    return a >= b[0] && a <= b[1];
  }
};

export const OPERATOR_LABELS = {
  '>': 'Greater than (>)',
  '<': 'Less than (<)',
  '=': 'Equals (=)',
  '>=': 'Greater or equal (>=)',
  '<=': 'Less or equal (<=)',
  '!=': 'Not equal (!=)',
  'between': 'Between'
};

/**
 * Hook to manage advanced filtering state and apply it to a dataset.
 * 
 * @param {Array} data - The raw data array to filter
 * @param {Array} schema - Definition of filterable fields, e.g., [{ key: 'grand_total', label: 'Grand Total', type: 'number', getValue: (item) => item.grand_total }]
 * @returns {Object} - { filteredData, rules, setRules, addRule, removeRule, updateRule, clearRules }
 */
export function useAdvancedFilter(data, schema) {
  const [rules, setRules] = useState([]); // Array of { id, field, operator, value }

  const filteredData = useMemo(() => {
    if (!rules || rules.length === 0) return data;
    if (!data) return [];

    return data.filter(item => {
      // All rules must pass (AND logic)
      return rules.every(rule => {
        const fieldDef = schema.find(s => s.key === rule.field);
        if (!fieldDef || !rule.operator || rule.value === undefined || rule.value === '') return true;

        // Extract value from item safely
        let itemValue = fieldDef.getValue ? fieldDef.getValue(item) : item[rule.field];
        
        // Handle nested fields like customer_account.grand_total if getValue isn't provided
        if (itemValue === undefined && rule.field.includes('.')) {
          itemValue = rule.field.split('.').reduce((obj, key) => obj && obj[key], item);
        }

        const numItemValue = Number(itemValue);
        
        const applyOp = OPERATORS[rule.operator];
        if (!applyOp) return true;

        if (rule.operator === 'between') {
          const v1 = Number(rule.value[0]);
          const v2 = Number(rule.value[1]);
          if (isNaN(v1) || isNaN(v2)) return true;
          return applyOp(numItemValue, [v1, v2]);
        } else {
          const v = Number(rule.value);
          if (isNaN(v)) return true;
          return applyOp(numItemValue, v);
        }
      });
    });
  }, [data, rules, schema]);

  const addRule = () => {
    const firstField = schema[0]?.key || '';
    setRules([...rules, { id: crypto.randomUUID(), field: firstField, operator: '>', value: '' }]);
  };

  const removeRule = (id) => {
    setRules(rules.filter(r => r.id !== id));
  };

  const updateRule = (id, updates) => {
    setRules(rules.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const clearRules = () => {
    setRules([]);
  };

  return {
    filteredData,
    rules,
    setRules,
    addRule,
    removeRule,
    updateRule,
    clearRules,
    activeCount: rules.length
  };
}
