import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { warehouseApi } from '../../api/warehouseApi';
import { 
  Warehouse, Plus, Edit2, Trash2, CheckCircle2, 
  MapPin, Package, ArrowUpRight, Truck 
} from 'lucide-react';

export const WarehouseAdminPage = () => {
  const [warehouses, setWarehouses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [feedback, setFeedback] = useState('');
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    shipping_base_fee: '25.00',
    shipping_cost_multiplier: '1.00',
    address: '{"city": "Austin", "state": "TX", "zip": "78701"}'
  });

  const showFeedback = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 3500);
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    setIsLoading(true);
    try {
      const res = await warehouseApi.list();
      setWarehouses(res.data || res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (warehouse = null) => {
    if (warehouse) {
      setEditingWarehouse(warehouse);
      setFormData({
        code: warehouse.code,
        name: warehouse.name,
        shipping_base_fee: warehouse.shipping_base_fee,
        shipping_cost_multiplier: warehouse.shipping_cost_multiplier,
        address: typeof warehouse.address === 'object' ? JSON.stringify(warehouse.address) : (warehouse.address || '{}')
      });
    } else {
      setEditingWarehouse(null);
      setFormData({
        code: '',
        name: '',
        shipping_base_fee: '25.00',
        shipping_cost_multiplier: '1.00',
        address: '{"city": "Chicago", "state": "IL", "country": "USA"}'
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      let parsedAddress = {};
      try {
        parsedAddress = formData.address ? JSON.parse(formData.address) : {};
      } catch (e) {
        alert('Address must be valid JSON format');
        return;
      }

      const payload = {
        code: formData.code,
        name: formData.name,
        shipping_base_fee: parseFloat(formData.shipping_base_fee),
        shipping_cost_multiplier: parseFloat(formData.shipping_cost_multiplier),
        address: parsedAddress
      };
      
      if (editingWarehouse) {
        await warehouseApi.update(editingWarehouse.id, payload);
        showFeedback(`Warehouse "${payload.name}" updated successfully.`);
      } else {
        await warehouseApi.create(payload);
        showFeedback(`New Depot "${payload.name}" registered.`);
      }
      setIsModalOpen(false);
      fetchWarehouses();
    } catch (err) {
      alert(err.message || 'Failed to save warehouse');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to deactivate depot "${name}"?`)) return;
    try {
      await warehouseApi.delete(id);
      showFeedback(`Depot "${name}" deactivated.`);
      fetchWarehouses();
    } catch (err) {
      alert(err.message || 'Failed to delete warehouse');
    }
  };

  const formatAddress = (addr) => {
    if (!addr) return '—';
    if (typeof addr === 'string') {
      try { addr = JSON.parse(addr); } catch { return addr; }
    }
    const parts = [addr.street, addr.city, addr.state, addr.country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Registered Address';
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#111826] tracking-tight">Warehouse & Depot Network</h1>
          <p className="text-sm text-[#2E3141]/70 mt-1">
            Configure fulfillment locations, base carrier fees, and distance shipping multipliers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/fulfillment">
            <Button variant="outline" size="sm" icon={Package}>
              Live Stock Inventory
            </Button>
          </Link>
          <Button variant="primary" size="sm" onClick={() => handleOpenModal()} icon={Plus}>
            Add Warehouse Depot
          </Button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Quick Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-neutral-200/60 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-semibold uppercase tracking-wider">
            <span>Fulfillment Depots</span>
            <Warehouse className="w-4 h-4 text-[#724B66]" />
          </div>
          <p className="text-2xl font-bold text-[#111826] mt-2">{warehouses.length} Active Nodes</p>
          <p className="text-xs text-[#2E3141]/60 mt-0.5">Physical distribution centers</p>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-neutral-200/60 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-semibold uppercase tracking-wider">
            <span>Routing Optimization</span>
            <Truck className="w-4 h-4 text-[#724B66]" />
          </div>
          <p className="text-2xl font-bold text-[#111826] mt-2">Dynamic Multi-Depot</p>
          <p className="text-xs text-emerald-700 font-medium mt-0.5">Lowest cost auto-split active</p>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-neutral-200/60 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-semibold uppercase tracking-wider">
            <span>Consolidation Engine</span>
            <Package className="w-4 h-4 text-[#724B66]" />
          </div>
          <p className="text-2xl font-bold text-[#111826] mt-2">Mid-Flight Merging</p>
          <p className="text-xs text-[#2E3141]/60 mt-0.5">Packs backorders into open dispatches</p>
        </div>
      </div>

      {/* Main Table */}
      <Card 
        title="Configured Depots & Fulfillment Centers" 
        subtitle="Operational parameters used in Screen 7 & Screen 8 auto-split computations"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-[#2E3141] uppercase tracking-wider bg-[#F3F2F2] border-b border-neutral-200/60 font-semibold">
              <tr>
                <th className="px-4 py-3.5">Depot Code</th>
                <th className="px-4 py-3.5">Facility Name</th>
                <th className="px-4 py-3.5 text-right">Base Shipping Fee</th>
                <th className="px-4 py-3.5 text-right">Cost Multiplier</th>
                <th className="px-4 py-3.5">Facility Location</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/60">
              {isLoading ? (
                <tr><td colSpan="7" className="px-4 py-8 text-center text-neutral-400">Loading fulfillment depots...</td></tr>
              ) : warehouses.length === 0 ? (
                <tr><td colSpan="7" className="px-4 py-8 text-center text-[#2E3141]/50 italic">No warehouse depots registered. Click "+ Add Warehouse Depot" to create one.</td></tr>
              ) : (
                warehouses.map(w => (
                  <tr key={w.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="px-4 py-3.5 font-mono text-xs font-bold text-[#724B66]">{w.code}</td>
                    <td className="px-4 py-3.5 font-semibold text-[#111826]">
                      <div className="flex items-center gap-2">
                        <Warehouse className="w-4 h-4 text-neutral-400 shrink-0" />
                        <span>{w.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-[#111826]">
                      ${Number(w.shipping_base_fee).toFixed(2)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-neutral-700">
                      {Number(w.shipping_cost_multiplier).toFixed(2)}x
                    </td>
                    <td className="px-4 py-3.5 text-xs text-neutral-600">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span className="truncate max-w-xs">{formatAddress(w.address)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <Badge status={w.is_active ? 'active' : 'cancelled'}>
                        {w.is_active ? 'Operational' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenModal(w)} icon={Edit2}>
                        Edit
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-rose-600 hover:bg-rose-50" 
                        onClick={() => handleDelete(w.id, w.name)}
                        icon={Trash2}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add / Edit Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingWarehouse ? "Edit Warehouse Depot" : "Register Warehouse Depot"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#111826] mb-1">Depot Code</label>
              <input 
                type="text" 
                value={formData.code} 
                onChange={e => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg outline-none focus:border-[#724B66] font-mono"
                placeholder="e.g. WH-EAST-01"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#111826] mb-1">Facility Name</label>
              <input 
                type="text" 
                value={formData.name} 
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg outline-none focus:border-[#724B66]"
                placeholder="e.g. Austin Regional Depot"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#111826] mb-1">Base Dispatch Fee ($)</label>
              <input 
                type="number" 
                step="0.01"
                value={formData.shipping_base_fee} 
                onChange={e => setFormData({ ...formData, shipping_base_fee: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg outline-none focus:border-[#724B66] font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#111826] mb-1">Distance Multiplier</label>
              <input 
                type="number" 
                step="0.01"
                value={formData.shipping_cost_multiplier} 
                onChange={e => setFormData({ ...formData, shipping_cost_multiplier: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg outline-none focus:border-[#724B66] font-mono"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#111826] mb-1">Address & Location Details (JSON)</label>
            <textarea 
              value={formData.address} 
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg font-mono outline-none focus:border-[#724B66]"
              rows={3}
              placeholder='{"street": "100 Logistics Blvd", "city": "Austin", "state": "TX", "country": "USA"}'
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} type="button">Cancel</Button>
            <Button variant="primary" type="submit">
              {editingWarehouse ? 'Save Depot Changes' : 'Register Depot'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
