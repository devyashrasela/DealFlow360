import React, { useState, useRef, useEffect } from 'react';
import { Filter, Plus, Trash2, X } from 'lucide-react';
import { OPERATOR_LABELS } from '../../hooks/useAdvancedFilter.js';

export function AdvancedFilter({ schema, filterProps }) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);
  const { rules, addRule, removeRule, updateRule, clearRules, activeCount } = filterProps;

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition ${
          activeCount > 0 
            ? 'bg-[#724B66]/10 text-[#724B66] border-[#724B66]/20 hover:bg-[#724B66]/20' 
            : 'bg-white border-neutral-300 text-neutral-600 hover:bg-neutral-50'
        }`}
      >
        <Filter className="w-3.5 h-3.5" />
        Filters {activeCount > 0 && `(${activeCount})`}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-[480px] bg-white rounded-xl shadow-xl border border-neutral-200/90 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
            <h3 className="text-sm font-semibold text-[#111826]">Advanced Filters</h3>
            <div className="flex items-center gap-3">
              {activeCount > 0 && (
                <button onClick={clearRules} className="text-xs text-neutral-500 hover:text-rose-600 transition">
                  Clear all
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-4 max-h-[400px] overflow-y-auto space-y-3">
            {rules.length === 0 ? (
              <div className="text-center py-6 text-neutral-400 text-sm">
                No active filters. Add a rule to refine your view.
              </div>
            ) : (
              rules.map(rule => (
                <div key={rule.id} className="flex items-center gap-2 bg-neutral-50 p-2 rounded-lg border border-neutral-200/60">
                  {/* Field Selector */}
                  <select
                    value={rule.field}
                    onChange={(e) => updateRule(rule.id, { field: e.target.value })}
                    className="w-1/3 bg-white border border-neutral-300 rounded text-xs px-2 py-1.5 text-neutral-700 outline-none focus:border-[#724B66]"
                  >
                    {schema.map(s => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>

                  {/* Operator Selector */}
                  <select
                    value={rule.operator}
                    onChange={(e) => updateRule(rule.id, { operator: e.target.value })}
                    className="w-1/3 bg-white border border-neutral-300 rounded text-xs px-2 py-1.5 text-neutral-700 outline-none focus:border-[#724B66]"
                  >
                    {Object.entries(OPERATOR_LABELS).map(([op, label]) => (
                      <option key={op} value={op}>{label}</option>
                    ))}
                  </select>

                  {/* Value Input(s) */}
                  {rule.operator === 'between' ? (
                    <div className="flex-1 flex items-center gap-1">
                      <input
                        type="number"
                        value={rule.value[0] !== undefined ? rule.value[0] : ''}
                        onChange={(e) => updateRule(rule.id, { value: [e.target.value, rule.value[1]] })}
                        onKeyDown={(e) => { if (e.key === 'Enter') setIsOpen(false); }}
                        placeholder="Min"
                        className="w-full bg-white border border-neutral-300 rounded text-xs px-2 py-1.5 outline-none focus:border-[#724B66]"
                      />
                      <span className="text-neutral-400 text-xs">-</span>
                      <input
                        type="number"
                        value={rule.value[1] !== undefined ? rule.value[1] : ''}
                        onChange={(e) => updateRule(rule.id, { value: [rule.value[0], e.target.value] })}
                        onKeyDown={(e) => { if (e.key === 'Enter') setIsOpen(false); }}
                        placeholder="Max"
                        className="w-full bg-white border border-neutral-300 rounded text-xs px-2 py-1.5 outline-none focus:border-[#724B66]"
                      />
                    </div>
                  ) : (
                    <input
                      type="number"
                      value={rule.value !== undefined && !Array.isArray(rule.value) ? rule.value : ''}
                      onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                      onKeyDown={(e) => { if (e.key === 'Enter') setIsOpen(false); }}
                      placeholder="Value..."
                      className="flex-1 bg-white border border-neutral-300 rounded text-xs px-2 py-1.5 outline-none focus:border-[#724B66]"
                    />
                  )}

                  {/* Remove Button */}
                  <button
                    onClick={() => removeRule(rule.id)}
                    className="p-1.5 text-neutral-400 hover:text-rose-500 hover:bg-rose-50 rounded transition shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="px-4 py-3 border-t border-neutral-100 bg-neutral-50/50">
            <button
              onClick={addRule}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#724B66] hover:text-[#5e3d54] transition"
            >
              <Plus className="w-3.5 h-3.5" /> Add Rule
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
