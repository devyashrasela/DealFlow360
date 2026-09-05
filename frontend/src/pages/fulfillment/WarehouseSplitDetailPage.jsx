import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fulfillmentApi } from '../../api/fulfillmentApi.js';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import {
  ArrowLeft,
  Warehouse,
  AlertCircle,
  Clock,
  CheckCircle,
  Truck,
  Box,
  Layers,
} from 'lucide-react';

const ORDER_LIFECYCLE_STEPS = [
  'draft',
  'allocated',
  'assigned',
  'pickpack',
  'shipped',
  'delivered',
];

const formatFulfillmentStatus = (status) => {
  if (!status) return 'Unknown';
  if (status === 'pickpack') return 'Pick & Pack';
  if (status === 'stock_received_pending_consolidation') return 'Stock Received';
  return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
};

export const WarehouseSplitDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [prompts, setPrompts] = useState([]);
  const [preview, setPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isConsolidating, setIsConsolidating] = useState(false);

  const loadOrderDetail = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fulfillmentApi.getOrderDetail(id);
      setOrder(res.data);

      if (res.data?.quotation?.id) {
        const [prevRes, promptRes] = await Promise.all([
          fulfillmentApi.getSplitPreview(res.data.quotation.id).catch(() => null),
          fulfillmentApi.getConsolidationPrompts().catch(() => ({ data: [] })),
        ]);
        if (prevRes?.data) setPreview(prevRes.data);
        if (promptRes?.data) setPrompts(promptRes.data);
      }
    } catch (err) {
      console.error('Failed to load fulfillment order:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadOrderDetail();
  }, [loadOrderDetail]);

  // Handle parcel lifecycle status transition
  const handleStatusTransition = async (nextStatus) => {
    setIsUpdatingStatus(true);
    try {
      await fulfillmentApi.updateOrderStatus(id, nextStatus);
      await loadOrderDetail();
    } catch (err) {
      alert(`Status transition failed: ${err.message}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle mid-fulfillment consolidation
  const handleConsolidate = async (backorderId) => {
    setIsConsolidating(true);
    try {
      await fulfillmentApi.consolidateBackorder(backorderId, {
        target_fulfillment_order_id: id,
        target_warehouse_id: order?.warehouse_id,
      });
      alert('Backorder successfully consolidated into this active shipment!');
      await loadOrderDetail();
    } catch (err) {
      alert(`Consolidation rejected: ${err.message}`);
    } finally {
      setIsConsolidating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#2E3141]/50 text-sm">
        Loading fulfillment plan...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Button variant="outline" size="sm" onClick={() => navigate('/fulfillment')} icon={ArrowLeft}>
          Back to Fulfillment List
        </Button>
        <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm">
          {error || 'Order not found.'}
        </div>
      </div>
    );
  }

  const buyerOrg = order.quotation?.customer_account?.buyer_organization;
  const customerName =
    buyerOrg?.trading_name || buyerOrg?.legal_name || 'Standard Customer';
  const totalAllocatedUnits =
    order.items?.reduce((sum, it) => sum + it.quantity_allocated, 0) || 0;
  const backorders = order.quotation?.backorders || [];
  const totalBackorderedUnits =
    backorders.reduce((sum, bo) => sum + (bo.status === 'open' ? bo.backorder_quantity : 0), 0);

  // Check if there is an active consolidation prompt for this quote
  const activePrompt = prompts.find((p) => p.quotation_id === order.quotation_id);
  const canConsolidate = ['draft', 'allocated', 'assigned'].includes(order.status);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/fulfillment')}
          icon={ArrowLeft}
        >
          Return to Cockpit
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">Lifecycle State:</span>
          <Badge status={order.status}>{formatFulfillmentStatus(order.status)}</Badge>
        </div>
      </div>

      {/* Header Banner */}
      <div className="bg-[#FFFFFF] p-6 rounded-2xl border border-neutral-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#724B66]">
              Fulfillment Order #{order.fulfillment_number}
            </span>
            <h1 className="text-2xl font-bold text-[#111826] mt-0.5">
              Fulfillment Plan: Quote #{order.quotation?.quotation_number} ({customerName})
            </h1>
          </div>
          <div className="text-right">
            <span className="text-xs text-neutral-500 block">Est. Shipping Fee</span>
            <span className="text-xl font-bold text-[#111826]">
              ${Number(order.estimated_shipping_cost || 0).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Metadata Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-neutral-100 text-xs">
          <div>
            <span className="text-neutral-400 block">Warehouse Depot</span>
            <span className="font-semibold text-[#111826] flex items-center gap-1.5 mt-0.5">
              <Warehouse className="w-3.5 h-3.5 text-[#724B66]" />
              {order.warehouse?.name} ({order.warehouse?.code})
            </span>
          </div>
          <div>
            <span className="text-neutral-400 block">Quantity in this Dispatch</span>
            <span className="font-semibold text-[#111826] mt-0.5 block">
              {totalAllocatedUnits} Units
            </span>
          </div>
          <div>
            <span className="text-neutral-400 block">Dispatch Mode</span>
            <span className="font-semibold text-[#111826] mt-0.5 block">
              {order.is_manual_override ? 'Manual Override' : 'Algorithm Auto-Split'}
            </span>
          </div>
          <div>
            <span className="text-neutral-400 block">Confirmed Timestamp</span>
            <span className="font-semibold text-[#111826] mt-0.5 block">
              {new Date(order.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Conditional Banner: Backorder Alert */}
      {totalBackorderedUnits > 0 && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-rose-900">
                Network Shortfall — {totalBackorderedUnits} Units Backordered
              </h4>
              <p className="text-xs text-rose-700 mt-0.5">
                Total demand across line items exceeds physical network stock. Remaining units queued for restocking.
              </p>
            </div>
          </div>
          <Badge status="open" title="Backorder Active • Replenishment requested">Backorder Active</Badge>
        </div>
      )}

      {/* Conditional Banner: Mid-Fulfillment Consolidation Opportunity */}
      {activePrompt && (
        <div className="p-5 rounded-xl bg-amber-50 border border-amber-300 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0 mt-0.5">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-950">
                Stock Arrived Mid-Fulfillment! Consolidate Backorder?
              </h4>
              <p className="text-xs text-amber-900 mt-0.5 max-w-xl">
                {activePrompt.recommendation}. Target parcel is still prior to pickpack ({order.status}).
                Consolidate now to eliminate a separate future shipment.
              </p>
            </div>
          </div>
          <div>
            <Button
              variant="secondary"
              size="sm"
              disabled={!canConsolidate || isConsolidating}
              onClick={() => handleConsolidate(activePrompt.backorder_id)}
            >
              {isConsolidating ? 'Consolidating...' : 'Consolidate Remaining Backorder'}
            </Button>
          </div>
        </div>
      )}

      {/* Lifecycle Status Progress Stepper */}
      <Card title="Shipment Lifecycle Transitions" subtitle="Advance parcel through warehouse packing states">
        <div className="flex items-center justify-between relative py-2">
          {ORDER_LIFECYCLE_STEPS.map((step, idx) => {
            const currentIdx = ORDER_LIFECYCLE_STEPS.indexOf(order.status);
            const isCompleted = idx <= currentIdx;
            const isCurrent = idx === currentIdx;

            return (
              <div key={step} className="flex-1 flex flex-col items-center relative z-10">
                <button
                  type="button"
                  disabled={isUpdatingStatus || idx > currentIdx + 1}
                  onClick={() => handleStatusTransition(step)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition shadow-xs ${
                    isCurrent
                      ? 'bg-[#724B66] text-[#FFFFFF] ring-4 ring-[#724B66]/20'
                      : isCompleted
                      ? 'bg-[#2E3141] text-[#FFFFFF]'
                      : 'bg-[#F3F2F2] text-neutral-400 border border-neutral-300 hover:border-neutral-400'
                  }`}
                >
                  {isCompleted && !isCurrent ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                </button>
                <span
                  className={`text-[11px] mt-2 font-medium capitalize ${
                    isCurrent ? 'text-[#724B66] font-bold' : isCompleted ? 'text-[#2E3141]' : 'text-neutral-400'
                  }`}
                >
                  {step}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Split Allocation Matrix Table */}
      <Card
        title="Split Allocation Matrix"
        subtitle="Line-item allocation breakdown across network depots"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F3F2F2] text-[#2E3141] font-semibold text-xs border-b border-neutral-200 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Product / SKU</th>
                <th className="px-4 py-3 text-right">This Dispatch Allocation</th>
                <th className="px-4 py-3 text-right">Depot Location</th>
                <th className="px-4 py-3 text-center">Dispatch Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {order.items?.map((item) => (
                <tr key={item.id} className="hover:bg-[#F3F2F2]/50 transition">
                  <td className="px-4 py-3 font-medium text-[#111826]">
                    <div className="flex items-center gap-2">
                      <Box className="w-4 h-4 text-neutral-400" />
                      <span>{item.product?.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-[#724B66]">
                    {item.quantity_allocated} Units
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-neutral-600">
                    {order.warehouse?.name}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge status={order.status}>{formatFulfillmentStatus(order.status)}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recommended Warehouse Split Comparison (Preview) */}
      {preview && (
        <Card
          title="Optimization Analysis"
          subtitle="Proximity and shipping weight multiplier calculations"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#F3F2F2]/60 border border-neutral-200">
              <span className="text-xs text-neutral-500 block">Routing Strategy</span>
              <span className="text-base font-bold text-[#111826] mt-0.5 block">
                {preview.is_split ? 'Multi-Warehouse Split' : 'Single Depot Consolidated'}
              </span>
              <span className="text-xs text-[#2E3141]/70 mt-1 block">
                {preview.single_depot_chosen
                  ? `100% routed to ${preview.single_depot_chosen}`
                  : 'Split across lowest-cost depots to satisfy demand'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#F3F2F2]/60 border border-neutral-200">
              <span className="text-xs text-neutral-500 block">Estimated Total Dispatch Cost</span>
              <span className="text-base font-bold text-[#724B66] mt-0.5 block">
                ${Number(preview.estimated_total_shipping_cost || 0).toFixed(2)}
              </span>
              <span className="text-xs text-[#2E3141]/70 mt-1 block">
                Calculated using warehouse base fee * shipping weight multiplier
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#F3F2F2]/60 border border-neutral-200">
              <span className="text-xs text-neutral-500 block">Shipment Dispatches</span>
              <span className="text-base font-bold text-[#2E3141] mt-0.5 block">
                {preview.allocations?.length || 1} Carrier Parcels
              </span>
              <span className="text-xs text-[#2E3141]/70 mt-1 block">
                {preview.allocations?.map((a) => a.warehouse_name).join(', ')}
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
