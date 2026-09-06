import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fulfillmentApi } from '../../api/fulfillmentApi.js';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import {
  Package,
  Warehouse,
  AlertTriangle,
  PlusCircle,
  ArrowRight,
  RefreshCw,
  Clock,
  CheckCircle2,
  X,
} from 'lucide-react';

const formatFulfillmentStatus = (status) => {
  if (!status) return 'Unknown';
  if (status === 'pickpack') return 'Pick & Pack';
  if (status === 'stock_received_pending_consolidation') return 'Stock Received';
  return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
};

export const FulfillmentCockpitPage = () => {
  const navigate = useNavigate();

  const [stockList, setStockList] = useState([]);
  const [orders, setOrders] = useState([]);
  const [backorders, setBackorders] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Inward stock modal state
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [receiptQuantity, setReceiptQuantity] = useState(10);
  const [isSubmittingStock, setIsSubmittingStock] = useState(false);
  const [stockModalError, setStockModalError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [stockRes, ordersRes, backordersRes, promptsRes] = await Promise.all([
        fulfillmentApi.getStock(),
        fulfillmentApi.getOrders(),
        fulfillmentApi.getBackorders(),
        fulfillmentApi.getConsolidationPrompts(),
      ]);

      setStockList(stockRes.data || []);
      setOrders(ordersRes.data || []);
      setBackorders(backordersRes.data || []);
      setPrompts(promptsRes.data || []);
    } catch (err) {
      console.error('Failed to load fulfillment cockpit data:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const [activeTab, setActiveTab] = useState('inventory');

  // Auto-dismiss success notification
  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => {
      setSuccessMessage(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  // Get distinct warehouses & products from current stock list for modal select options
  const warehouseOptions = Array.from(
    new Map(stockList.map((s) => [s.warehouse_id, s.warehouse])).values()
  ).filter(Boolean);

  const productOptions = Array.from(
    new Map(stockList.map((s) => [s.product_id, s.product])).values()
  ).filter(Boolean);

  // Synchronize default warehouse and product selection whenever options load
  useEffect(() => {
    if (warehouseOptions.length > 0 && (!selectedWarehouseId || !warehouseOptions.some(w => w.id === selectedWarehouseId))) {
      setSelectedWarehouseId(warehouseOptions[0].id);
    }
  }, [warehouseOptions, selectedWarehouseId]);

  useEffect(() => {
    if (productOptions.length > 0 && (!selectedProductId || !productOptions.some(p => p.id === selectedProductId))) {
      setSelectedProductId(productOptions[0].id);
    }
  }, [productOptions, selectedProductId]);

  const handleOpenStockModal = () => {
    setStockModalError(null);
    if (warehouseOptions.length > 0 && !selectedWarehouseId) {
      setSelectedWarehouseId(warehouseOptions[0].id);
    }
    if (productOptions.length > 0 && !selectedProductId) {
      setSelectedProductId(productOptions[0].id);
    }
    setReceiptQuantity(10);
    setIsStockModalOpen(true);
  };

  // Handle inward stock replenishment submit
  const handleReceiveStockSubmit = async (e) => {
    e.preventDefault();
    setStockModalError(null);

    const qty = Number(receiptQuantity);
    const targetWhId = selectedWarehouseId || (warehouseOptions[0]?.id);
    const targetProdId = selectedProductId || (productOptions[0]?.id);

    if (!targetWhId) {
      setStockModalError('Please select a destination warehouse.');
      return;
    }
    if (!targetProdId) {
      setStockModalError('Please select a product SKU.');
      return;
    }
    if (!qty || qty <= 0) {
      setStockModalError('Received quantity must be a positive number greater than 0.');
      return;
    }

    setIsSubmittingStock(true);
    try {
      await fulfillmentApi.receiveStock({
        warehouse_id: targetWhId,
        product_id: targetProdId,
        quantity: qty,
      });

      // Find labels for user-friendly success notification
      const wh = warehouseOptions.find((w) => w.id === targetWhId);
      const prod = productOptions.find((p) => p.id === targetProdId);
      const whName = wh ? `${wh.name} (${wh.code})` : 'Warehouse';
      const prodName = prod ? `${prod.name} (${prod.sku})` : 'Product';

      // Immediate local state update: reflect the new in_stock and available quantity immediately
      setStockList((prevStock) =>
        prevStock.map((item) => {
          if (item.warehouse_id === targetWhId && item.product_id === targetProdId) {
            const newOnHand = Number(item.on_hand_quantity || 0) + qty;
            const softReserved = Number(item.soft_reserved_quantity || 0);
            const hardAllocated = Number(item.hard_allocated_quantity || 0);
            return {
              ...item,
              on_hand_quantity: newOnHand,
              available_to_fulfill: newOnHand - softReserved - hardAllocated,
            };
          }
          return item;
        })
      );

      // Close modal and present confirmed success banner
      setIsStockModalOpen(false);
      setSuccessMessage(`Successfully received ${qty} units of ${prodName} into ${whName}! Inventory table updated.`);

      // Re-fetch all data from backend to ensure complete synchronization
      await loadData();
    } catch (err) {
      console.error('Failed to receive stock:', err);
      const msg = err.response?.data?.error || err.message || 'Failed to record stock receipt.';
      setStockModalError(msg);
    } finally {
      setIsSubmittingStock(false);
    }
  };

  const pendingOrdersCount = orders.length;
  const openBackordersCount = backorders.length;
  const activeWarehouseCount = warehouseOptions.length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#111826]">
            Fulfillment and Stock
          </h1>
          <p className="text-sm text-[#2E3141]/70 mt-1">
            Live stock per warehouse, plus every order that still needs fulfilling
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            icon={RefreshCw}
            disabled={isLoading}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenStockModal}
            icon={PlusCircle}
          >
            Receive Inward Stock
          </Button>
        </div>
      </div>

      {/* Success Confirmation Toast Banner */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-sm flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1 rounded-md transition"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Dynamic Consolidation Advisory Banner */}
      {prompts.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-amber-900">
                Mid-Fulfillment Consolidation Opportunity Detected
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                {prompts[0].recommendation} (Quote #{prompts[0].quotation_number})
              </p>
            </div>
          </div>
          {prompts[0].eligible_fulfillment_order_id && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate(`/fulfillment/orders/${prompts[0].eligible_fulfillment_order_id}`)}
            >
              Open Order
            </Button>
          )}
        </div>
      )}

      {/* Quick Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-neutral-200/60 shadow-xs flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-[#111826]">{pendingOrdersCount}</div>
          <div className="text-[#2E3141]/70 text-xs font-semibold uppercase tracking-wider mt-1">Pending Orders</div>
        </div>
        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-neutral-200/60 shadow-xs flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-[#111826]">{openBackordersCount}</div>
          <div className="text-[#2E3141]/70 text-xs font-semibold uppercase tracking-wider mt-1">Open Backorders</div>
        </div>
        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-neutral-200/60 shadow-xs flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-[#111826]">{activeWarehouseCount}</div>
          <div className="text-[#2E3141]/70 text-xs font-semibold uppercase tracking-wider mt-1">Warehouses</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-200/60 overflow-x-auto mb-6">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`pb-3 px-1 mr-8 font-medium text-sm transition-colors relative shrink-0 ${activeTab === 'inventory' ? 'text-[#724B66]' : 'text-[#2E3141]/60 hover:text-[#2E3141]'}`}
        >
          <div className="flex items-center space-x-2">
            <Warehouse size={18}/>
            <span>Live Inventory</span>
            {stockList.length > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${activeTab === 'inventory' ? 'bg-[#724B66]/10 text-[#724B66]' : 'bg-neutral-100 text-neutral-600'}`}>
                {stockList.length}
              </span>
            )}
          </div>
          {activeTab === 'inventory' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#724B66] rounded-t-full" />}
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 px-1 mr-8 font-medium text-sm transition-colors relative shrink-0 ${activeTab === 'orders' ? 'text-[#724B66]' : 'text-[#2E3141]/60 hover:text-[#2E3141]'}`}
        >
          <div className="flex items-center space-x-2">
            <Package size={18}/>
            <span>Orders Awaiting Fulfillment</span>
            {pendingOrdersCount > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${activeTab === 'orders' ? 'bg-[#724B66]/10 text-[#724B66]' : 'bg-neutral-100 text-neutral-600'}`}>
                {pendingOrdersCount}
              </span>
            )}
          </div>
          {activeTab === 'orders' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#724B66] rounded-t-full" />}
        </button>

        <button
          onClick={() => setActiveTab('backorders')}
          className={`pb-3 px-1 mr-8 font-medium text-sm transition-colors relative shrink-0 ${activeTab === 'backorders' ? 'text-[#724B66]' : 'text-[#2E3141]/60 hover:text-[#2E3141]'}`}
        >
          <div className="flex items-center space-x-2">
            <Clock size={18}/>
            <span>Backorders</span>
            {openBackordersCount > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${activeTab === 'backorders' ? 'bg-[#724B66]/10 text-[#724B66]' : 'bg-neutral-100 text-neutral-600'}`}>
                {openBackordersCount}
              </span>
            )}
          </div>
          {activeTab === 'backorders' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#724B66] rounded-t-full" />}
        </button>
      </div>

      {/* SECTION 1: Live Stock Inventory Table */}
      {activeTab === 'inventory' && (
        <Card
          title="Live Stock Inventory"
          subtitle="Physical on-hand, committed reservations, and available-to-fulfill balances"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50/75 border-b border-neutral-200 text-neutral-500 uppercase tracking-wider text-xs font-semibold">
                <tr>
                  <th className="px-4 py-3">Warehouse</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 text-right">In Stock</th>
                  <th className="px-4 py-3 text-right">Reserved</th>
                  <th className="px-4 py-3 text-right">Allocated</th>
                  <th className="px-4 py-3 text-right">Available</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {stockList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[#2E3141]/50 text-sm">
                      {isLoading ? 'Loading stock levels...' : 'No warehouse stock records registered.'}
                    </td>
                  </tr>
                ) : (
                  stockList.map((item) => (
                    <tr key={item.id} className="hover:bg-[#F3F2F2]/50 transition">
                      <td className="px-4 py-3 font-medium text-[#111826]">
                        <div className="flex items-center gap-2">
                          <Warehouse className="w-4 h-4 text-[#724B66]" />
                          <span>{item.warehouse?.name || item.warehouse_id}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[#111826]">{item.product?.name}</div>
                        <div className="text-xs text-neutral-500">{item.product?.sku}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-[#111826]">
                        {item.on_hand_quantity}
                      </td>
                      <td className="px-4 py-3 text-right text-amber-600">
                        {item.soft_reserved_quantity}
                      </td>
                      <td className="px-4 py-3 text-right text-rose-600">
                        {item.hard_allocated_quantity}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600">
                        {item.available_to_fulfill}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.available_to_fulfill > 0 ? (
                          <Badge status="completed">Healthy</Badge>
                        ) : (
                          <Badge status="failed">Depleted</Badge>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* SECTION 2: Pending Orders Table */}
      {activeTab === 'orders' && (
        <Card
          title="Orders Awaiting Fulfillment"
          subtitle="Reverse-chronological queue of orders needing dispatch or parcel preparation"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50/75 border-b border-neutral-200 text-neutral-500 uppercase tracking-wider text-xs font-semibold">
                <tr>
                  <th className="px-4 py-3">Fulfillment #</th>
                  <th className="px-4 py-3">Quote Ref</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Depot</th>
                  <th className="px-4 py-3 text-right">Items</th>
                  <th className="px-4 py-3 text-center">Stage</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[#2E3141]/50 text-sm">
                      No active orders awaiting fulfillment.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => {
                    const customerName =
                      order.quotation?.customer_account?.buyer_organization?.legal_name || 'Unknown Entity';

                    return (
                      <tr
                        key={order.id}
                        onClick={() => navigate(`/fulfillment/orders/${order.id}`)}
                        className="hover:bg-[#F3F2F2]/50 transition cursor-pointer group"
                      >
                        <td className="px-4 py-3 font-medium text-blue-600">
                          {order.order_number}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[#724B66]">
                          {order.quotation?.quotation_number || 'N/A'}
                        </td>
                        <td className="px-4 py-3 font-medium text-[#111826]">
                          {customerName}
                        </td>
                        <td className="px-4 py-3 text-[#2E3141]">
                          <div className="flex items-center gap-1.5">
                            <Warehouse className="w-3.5 h-3.5 text-neutral-400" />
                            <span>{order.warehouse?.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-[#111826]">
                          {order.items?.reduce((sum, it) => sum + it.quantity_allocated, 0) || 0}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge status={order.status}>{formatFulfillmentStatus(order.status)}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#724B66] group-hover:translate-x-0.5 transition">
                            View Split <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* SECTION 3: Open Backorders Table */}
      {activeTab === 'backorders' && (
        <Card
          title="Open Backorders Queue"
          subtitle="Unallocated line remainders waiting on depot replenishment"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50/75 border-b border-neutral-200 text-neutral-500 uppercase tracking-wider text-xs font-semibold">
                <tr>
                  <th className="px-4 py-3">Quote #</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 text-right">Backordered Qty</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {backorders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-neutral-400 text-sm">
                      No backorders pending.
                    </td>
                  </tr>
                ) : (
                  backorders.map((bo) => (
                    <tr key={bo.id} className="hover:bg-[#F3F2F2]/50 transition">
                      <td className="px-4 py-3 font-mono text-xs text-[#724B66]">
                        {bo.quotation?.quotation_number || bo.quotation_id}
                      </td>
                      <td className="px-4 py-3 font-medium text-[#111826]">
                        {bo.product?.name}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-rose-600">
                        {bo.backorder_quantity}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge status={bo.status}>{formatFulfillmentStatus(bo.status)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-500">
                        {new Date(bo.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal: Receive Inward Stock */}
      <Modal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        title="Receive Inward Replenishment Stock"
        subtitle="Increase physical on-hand quantity and trigger consolidation checks"
      >
        <form onSubmit={handleReceiveStockSubmit} className="space-y-4">
          {stockModalError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{stockModalError}</span>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-[#111826] uppercase tracking-wider mb-1">
              Destination Warehouse
            </label>
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-[#FFFFFF] text-[#111826] focus:border-[#724B66] focus:outline-none"
              required
            >
              {warehouseOptions.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name} ({wh.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111826] uppercase tracking-wider mb-1">
              Product SKU
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-[#FFFFFF] text-[#111826] focus:border-[#724B66] focus:outline-none"
              required
            >
              {productOptions.map((prod) => (
                <option key={prod.id} value={prod.id}>
                  {prod.name} ({prod.sku})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111826] uppercase tracking-wider mb-1">
              Received Quantity
            </label>
            <input
              type="number"
              min="1"
              value={receiptQuantity}
              onChange={(e) => setReceiptQuantity(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-[#FFFFFF] text-[#111826] focus:border-[#724B66] focus:outline-none"
              required
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-neutral-100">
            <Button variant="ghost" size="sm" onClick={() => setIsStockModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={isSubmittingStock}>
              {isSubmittingStock ? 'Posting Inward Stock...' : 'Confirm Stock Receipt'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
