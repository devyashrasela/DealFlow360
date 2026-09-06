import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { warehouseApi } from '../../api/warehouseApi';
import { fulfillmentApi } from '../../api/fulfillmentApi';
import { 
  Warehouse, Plus, Edit2, Trash2, CheckCircle2, 
  MapPin, Package, ArrowUpRight, Truck, ChevronDown, ChevronRight 
} from 'lucide-react';

export const WarehouseAdminPage = () => {
  const [warehouses, setWarehouses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [feedback, setFeedback] = useState('');
  
  // Expanded stock view state
  const [expandedRow, setExpandedRow] = useState(null);
  const [warehouseStock, setWarehouseStock] = useState({});
  const [isLoadingStock, setIsLoadingStock] = useState(false);

  // Delete modal state
  const [warehouseToDelete, setWarehouseToDelete] = useState(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    shipping_base_fee: '25.00',
    shipping_cost_multiplier: '1.00',
    address_street: '',
    address_city: '',
    address_state: '',
    address_zip: '',
    address_country: ''
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
      let parsed = {};
      try { parsed = typeof warehouse.address === 'string' ? JSON.parse(warehouse.address) : (warehouse.address || {}); } catch(e) {}
      setFormData({
        code: warehouse.code,
        name: warehouse.name,
        shipping_base_fee: warehouse.shipping_base_fee,
        shipping_cost_multiplier: warehouse.shipping_cost_multiplier,
        address_street: parsed.street || '',
        address_city: parsed.city || '',
        address_state: parsed.state || '',
        address_zip: parsed.zip || '',
        address_country: parsed.country || ''
      });
    } else {
      setEditingWarehouse(null);
      setFormData({
        code: '',
        name: '',
        shipping_base_fee: '25.00',
        shipping_cost_multiplier: '1.00',
        address_street: '',
        address_city: '',
        address_state: '',
        address_zip: '',
        address_country: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const parsedAddress = {
        street: formData.address_street,
        city: formData.address_city,
        state: formData.address_state,
        zip: formData.address_zip,
        country: formData.address_country
      };

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

  const handleDelete = (id, name) => {
    setWarehouseToDelete({ id, name });
  };

  const confirmDelete = async () => {
    if (!warehouseToDelete) return;
    try {
      await warehouseApi.delete(warehouseToDelete.id);
      showFeedback(`Depot "${warehouseToDelete.name}" deactivated.`);
      setWarehouseToDelete(null);
      fetchWarehouses();
    } catch (err) {
      alert(err.message || 'Failed to delete warehouse');
    }
  };

  const fetchInventory = async (warehouseId) => {
    setIsLoadingStock(true);
    try {
      const res = await fulfillmentApi.getStock({ warehouse_id: warehouseId });
      setWarehouseStock(prev => ({ ...prev, [warehouseId]: res.data || [] }));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingStock(false);
    }
  };

  const toggleExpandRow = (w) => {
    if (expandedRow === w.id) {
      setExpandedRow(null);
    } else {
      setExpandedRow(w.id);
      if (!warehouseStock[w.id]) {
        fetchInventory(w.id);
      }
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
        </div>
        <div className="flex items-center gap-3">
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

      {/* Main Table */}
      <Card 
        title="Configured Depots & Fulfillment Centers" 
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-neutral-50/75 border-b border-neutral-200 text-neutral-500 uppercase tracking-wider text-xs font-semibold">
              <tr>
                <th className="px-4 py-3 text-left">Facility Name</th>
                <th className="px-4 py-3 text-left">Depot Code</th>
                <th className="px-4 py-3 text-right">Base Shipping Fee</th>
                <th className="px-4 py-3 text-right">Cost Multiplier</th>
                <th className="px-4 py-3 text-left">Facility Location</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {isLoading ? (
                <tr><td colSpan="7" className="px-4 py-8 text-center text-neutral-400">Loading fulfillment depots...</td></tr>
              ) : warehouses.length === 0 ? (
                <tr><td colSpan="7" className="px-4 py-8 text-center text-[#2E3141]/50 italic">No warehouse depots registered. Click "+ Add Warehouse Depot" to create one.</td></tr>
              ) : (
                warehouses.map(w => (
                  <React.Fragment key={w.id}>
                    <tr className="hover:bg-neutral-50/50 transition-colors group">
                      <td className="px-4 py-3 font-semibold text-[#111826]">
                        <button 
                          onClick={() => toggleExpandRow(w)}
                          className="font-semibold text-[#111826] hover:text-[#724B66] flex items-center space-x-2 text-left group"
                        >
                          {expandedRow === w.id ? <ChevronDown size={16} className="text-[#724B66] shrink-0"/> : <ChevronRight size={16} className="text-neutral-400 group-hover:text-[#724B66] shrink-0"/>}
                          <span>{w.name}</span>
                        </button>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-bold text-[#724B66]">{w.code}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-[#111826]">
                        ${Number(w.shipping_base_fee).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-neutral-700">
                        {Number(w.shipping_cost_multiplier).toFixed(2)}x
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-600">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          <span className="truncate max-w-xs">{formatAddress(w.address)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          status={w.is_active ? 'operational' : 'inactive'}
                          title={w.is_active ? 'Operational • Facility active and accepting order dispatches' : 'Inactive • Facility paused from routing'}
                        >
                          {w.is_active ? 'Operational' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                    {expandedRow === w.id && (
                      <tr className="bg-neutral-50/40">
                        <td colSpan="7" className="px-10 py-6 border-b border-neutral-200">
                          <div className="bg-white rounded-lg border border-neutral-200 p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-sm font-bold text-[#111826]">Live Stock Inventory Preview</h4>
                              <Link to="/fulfillment">
                                <Button variant="outline" size="sm" icon={ArrowUpRight}>
                                  Manage Inventory
                                </Button>
                              </Link>
                            </div>
                            {isLoadingStock ? (
                              <div className="py-4 text-center text-neutral-400 text-xs">Fetching live stock...</div>
                            ) : warehouseStock[w.id]?.length > 0 ? (
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {warehouseStock[w.id].slice(0, 8).map(stock => (
                                  <div key={stock.id} className="p-3 border border-neutral-100 rounded bg-neutral-50 flex justify-between items-center">
                                    <div className="flex flex-col">
                                      <span className="text-[10px] text-neutral-500 uppercase tracking-wider">{stock.product?.sku || 'Unknown'}</span>
                                    </div>
                                    <Badge status={stock.available_to_fulfill > 50 ? 'active' : stock.available_to_fulfill > 10 ? 'warning' : 'danger'}>
                                      {stock.available_to_fulfill} in stock
                                    </Badge>
                                  </div>
                                ))}
                                {warehouseStock[w.id].length > 8 && (
                                  <div className="p-3 flex justify-center items-center">
                                    <span className="text-xs font-semibold text-[#724B66]">+{warehouseStock[w.id].length - 8} more...</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="py-4 text-center text-[#2E3141]/50 text-xs italic">
                                No inventory items stocked in this depot.
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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
          <div className="border-t border-neutral-100 pt-4 mt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#111826] mb-3">Facility Address Details</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Street Address</label>
                <input 
                  type="text" 
                  value={formData.address_street} 
                  onChange={e => setFormData({ ...formData, address_street: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg outline-none focus:border-[#724B66]"
                  placeholder="e.g. 100 Logistics Blvd"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">City</label>
                  <input 
                    type="text" 
                    value={formData.address_city} 
                    onChange={e => setFormData({ ...formData, address_city: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg outline-none focus:border-[#724B66]"
                    placeholder="e.g. Austin"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">State / Province</label>
                  <input 
                    type="text" 
                    value={formData.address_state} 
                    onChange={e => setFormData({ ...formData, address_state: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg outline-none focus:border-[#724B66]"
                    placeholder="e.g. TX"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Postal Code</label>
                  <input 
                    type="text" 
                    value={formData.address_zip} 
                    onChange={e => setFormData({ ...formData, address_zip: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg outline-none focus:border-[#724B66]"
                    placeholder="e.g. 78701"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Country</label>
                  <input 
                    type="text" 
                    value={formData.address_country} 
                    onChange={e => setFormData({ ...formData, address_country: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg outline-none focus:border-[#724B66]"
                    placeholder="e.g. USA"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100 mt-6">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} type="button">Cancel</Button>
            <Button variant="primary" type="submit">
              {editingWarehouse ? 'Save Depot Changes' : 'Register Depot'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Custom Delete Confirmation Modal */}
      <Modal 
        isOpen={!!warehouseToDelete} 
        onClose={() => setWarehouseToDelete(null)}
        title="Deactivate Warehouse Depot"
      >
        <div className="space-y-4">
          <div className="p-4 bg-rose-50 border border-rose-100 rounded-lg flex gap-3">
            <Trash2 className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-rose-800">Deactivate Depot</p>
              <p className="text-sm text-rose-600 mt-1">
                Are you sure you want to deactivate the depot <strong>"{warehouseToDelete?.name}"</strong>? 
                It will be removed from all future automatic routing calculations. Active dispatches will need to be re-routed manually.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setWarehouseToDelete(null)}>Cancel</Button>
            <Button 
              variant="primary" 
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={confirmDelete}
            >
              Confirm Deactivation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
