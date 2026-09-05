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
} from 'lucide-react';

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

  // Handle inward stock replenishment submit
  const handleReceiveStockSubmit = async (e) => {
    e.preventDefault();
    if (!selectedWarehouseId || !selectedProductId || receiptQuantity <= 0) return;

    setIsSubmittingStock(true);
    try {
      await fulfillmentApi.receiveStock({
        warehouse_id: selectedWarehouseId,
        product_id: selectedProductId,
        quantity: Number(receiptQuantity),
      });
      setIsStockModalOpen(false);
      await loadData();
    } catch (err) {
      alert(`Error receiving stock: ${err.message}`);
    } finally {
      setIsSubmittingStock(false);
    }
  };

  // Get distinct warehouses & products from current stock list for modal select options
  const warehouseOptions = Array.from(
    new Map(stockList.map((s) => [s.warehouse_id, s.warehouse])).values()
  ).filter(Boolean);

  const productOptions = Array.from(
    new Map(stockList.map((s) => [s.product_id, s.product])).values()
  ).filter(Boolean);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111826]">
            Fulfillment and Stock (List)
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
            onClick={() => {
              if (warehouseOptions.length > 0) setSelectedWarehouseId(warehouseOptions[0].id);
              if (productOptions.length > 0) setSelectedProductId(productOptions[0].id);
              setIsStockModalOpen(true);
            }}
            icon={PlusCircle}
          >
            Receive Inward Stock
          </Button>
        </div>
      </div>

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

      {/* SECTION 1: Live Stock Inventory Table */}
      <Card
        title="Live Stock Inventory"
        subtitle="Physical on-hand, committed reservations, and available-to-fulfill balances"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F3F2F2] text-[#2E3141] font-semibold text-xs border-b border-neutral-200 uppercase tracking-wider">
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
                    <td className="px-4 py-3 text-[#111826]">
                      <span className="font-medium">{item.product?.name}</span>
                      <span className="text-xs text-[#2E3141]/60 block">{item.product?.sku}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-[#111826]">
                      {item.on_hand_quantity}
                    </td>
                    <td className="px-4 py-3 text-right text-neutral-600">
                      {item.soft_reserved_quantity}
                    </td>
                    <td className="px-4 py-3 text-right text-[#724B66] font-medium">
                      {item.hard_allocated_quantity}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-[#111826]">
                      <span className={item.available_to_fulfill <= 0 ? 'text-rose-600' : 'text-emerald-700'}>
                        {item.available_to_fulfill}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.available_to_fulfill <= 0 ? (
                        <Badge status="open">Stockout</Badge>
                      ) : item.is_low_stock ? (
                        <Badge status="pickpack">Low Stock</Badge>
                      ) : (
                        <Badge status="active">Healthy</Badge>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* SECTION 2: Orders Awaiting Fulfillment Table */}
      <Card
        title="Orders Awaiting Fulfillment"
        subtitle="Reverse-chronological queue of orders needing dispatch or parcel preparation"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F3F2F2] text-[#2E3141] font-semibold text-xs border-b border-neutral-200 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Fulfillment #</th>
                <th className="px-4 py-3">Quote Ref</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Warehouse Assigned</th>
                <th className="px-4 py-3 text-right">Items</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#2E3141]/50 text-sm">
                    {isLoading ? 'Loading orders...' : 'No orders awaiting fulfillment.'}
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const customerName =
                    order.quotation?.customer_account?.buyer_organization?.name ||
                    'Standard Customer';

                  return (
                    <tr
                      key={order.id}
                      onClick={() => navigate(`/fulfillment/orders/${order.id}`)}
                      className="hover:bg-[#724B66]/5 transition cursor-pointer group"
                    >
                      <td className="px-4 py-3 font-semibold text-[#724B66]">
                        {order.fulfillment_number}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-neutral-600">
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
                        <Badge status={order.status}>{order.status}</Badge>
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

      {/* SECTION 3: Open Backorders Table */}
      <Card
        title="Open Backorders Queue"
        subtitle="Unallocated line remainders waiting on depot replenishment"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F3F2F2] text-[#2E3141] font-semibold text-xs border-b border-neutral-200 uppercase tracking-wider">
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
                      <Badge status={bo.status}>{bo.status}</Badge>
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

      {/* Modal: Receive Inward Stock */}
      <Modal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        title="Receive Inward Replenishment Stock"
        subtitle="Increase physical on-hand quantity and trigger consolidation checks"
      >
        <form onSubmit={handleReceiveStockSubmit} className="space-y-4">
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
