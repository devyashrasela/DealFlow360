import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';

export function QuotationBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState(null);
  const [products, setProducts] = useState([]);
  const [upsells, setUpsells] = useState([]);
  const [loading, setLoading] = useState(true);

  // Line editing state
  const [newLineProductId, setNewLineProductId] = useState('');
  const [newLineQty, setNewLineQty] = useState(1);
  const [newLineDiscount, setNewLineDiscount] = useState(0);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [qRes, pRes, uRes] = await Promise.all([
        apiClient.get(`/api/quotations/${id}`),
        apiClient.get('/api/catalog'),
        apiClient.get(`/api/quotations/${id}/upsells`)
      ]);
      setQuotation(qRes);
      setProducts(pRes.products || []);
      setUpsells(uRes || []);
      if (pRes.products?.length > 0) {
        setNewLineProductId(pRes.products[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addLine = async () => {
    try {
      await apiClient.post(`/api/quotations/${id}/lines`, {
        product_id: newLineProductId,
        quantity: Number(newLineQty),
        applied_discount_percentage: Number(newLineDiscount)
      });
      fetchData(); // Reload to get updated margin/risk
    } catch (err) {
      console.error(err);
      alert('Failed to add line');
    }
  };

  const addUpsell = async (productId) => {
    try {
      await apiClient.post(`/api/quotations/${id}/lines`, {
        product_id: productId,
        quantity: 1,
        applied_discount_percentage: 0
      });
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to add upsell');
    }
  };

  const updateLineDiscount = async (lineId, qty, discount) => {
    try {
      await apiClient.put(`/api/quotations/${id}/lines/${lineId}`, {
        quantity: Number(qty),
        applied_discount_percentage: Number(discount)
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const removeLine = async (lineId) => {
    try {
      await apiClient.delete(`/api/quotations/${id}/lines/${lineId}`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const submitForApproval = async () => {
    // Call approval routing API (we assume there's one, or we just update stage)
    try {
      // Temporary hack: in real life there should be a submit endpoint. 
      // For now we'll just alert and say it's submitted.
      alert('Submit for Approval triggered. (Needs approval API hookup)');
      navigate('/quotations');
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!quotation) return <div className="p-6">Quotation not found</div>;

  return (
    <div className="h-full flex flex-col p-6 space-y-6 overflow-y-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Quotation Detail: {quotation.quotation_number} ({quotation.customer_account?.buyer_organization?.legal_name || 'Unknown'})</h1>
          <p className="text-gray-500 text-sm">Add products, apply discounts, review upsells.</p>
        </div>
        <div className="space-x-3">
          <button onClick={() => navigate('/quotations')} className="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50">Save Draft</button>
          <button onClick={submitForApproval} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Submit for Approval</button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="font-semibold">Customer:</span> {quotation.customer_account?.buyer_organization?.legal_name}</div>
          <div><span className="font-semibold">Price List:</span> {quotation.price_list?.name}</div>
          <div><span className="font-semibold">Gross Total:</span> ${Number(quotation.gross_total).toLocaleString()}</div>
          <div><span className="font-semibold">Blended Risk Score:</span> {quotation.blended_risk_score}pt</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 font-semibold flex justify-between items-center">
          <h2>Line Items</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3">Product</th>
              <th className="p-3 w-24">Qty</th>
              <th className="p-3 w-32">Price</th>
              <th className="p-3 w-32">Discount %</th>
              <th className="p-3 w-32">Limit %</th>
              <th className="p-3 w-40">Status</th>
              <th className="p-3 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {quotation.lines?.map(line => (
              <tr key={line.id} className="border-t border-gray-100">
                <td className="p-3">{line.product?.name}</td>
                <td className="p-3">
                  <input
                    type="number"
                    value={line.quantity}
                    onChange={e => updateLineDiscount(line.id, e.target.value, line.applied_discount_percentage)}
                    className="w-16 border-gray-300 rounded p-1 text-sm"
                    min="1"
                    disabled={quotation.stage !== 'draft'}
                  />
                </td>
                <td className="p-3">${Number(line.unit_list_price).toLocaleString()}</td>
                <td className="p-3">
                  <input
                    type="number"
                    value={line.applied_discount_percentage}
                    onChange={e => updateLineDiscount(line.id, line.quantity, e.target.value)}
                    className="w-16 border-gray-300 rounded p-1 text-sm"
                    min="0"
                    max="100"
                    disabled={quotation.stage !== 'draft'}
                  />
                </td>
                <td className="p-3">{line.effective_ceiling_limit}%</td>
                <td className="p-3 font-medium">
                  {line.is_over_limit ? (
                    <span className="text-red-600">OVER (+{line.line_excess_points}pt)</span>
                  ) : (
                    <span className="text-green-600">OK</span>
                  )}
                </td>
                <td className="p-3">
                  {quotation.stage === 'draft' && (
                    <button onClick={() => removeLine(line.id)} className="text-red-500 hover:text-red-700">✕</button>
                  )}
                </td>
              </tr>
            ))}
            {quotation.stage === 'draft' && (
              <tr className="border-t border-gray-200 bg-gray-50">
                <td className="p-3">
                  <select
                    value={newLineProductId}
                    onChange={e => setNewLineProductId(e.target.value)}
                    className="w-full border-gray-300 rounded p-1 text-sm"
                  >
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </td>
                <td className="p-3">
                  <input type="number" value={newLineQty} onChange={e => setNewLineQty(e.target.value)} min="1" className="w-16 border-gray-300 rounded p-1 text-sm" />
                </td>
                <td className="p-3">-</td>
                <td className="p-3">
                  <input type="number" value={newLineDiscount} onChange={e => setNewLineDiscount(e.target.value)} min="0" max="100" className="w-16 border-gray-300 rounded p-1 text-sm" />
                </td>
                <td className="p-3">-</td>
                <td className="p-3">-</td>
                <td className="p-3">
                  <button onClick={addLine} className="text-blue-600 font-medium hover:text-blue-800">Add</button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {upsells.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Upsell Suggestions</h2>
          <div className="flex space-x-4">
            {upsells.map(u => (
              <div key={u.product_id} className="bg-blue-50 border border-blue-100 rounded-lg p-4 w-64 flex flex-col justify-between">
                <div>
                  <div className="font-semibold text-blue-900">+ {u.product_name}</div>
                  <div className="text-sm text-blue-700 mt-1">Margin: +${Number(u.margin_delta).toLocaleString()}</div>
                </div>
                {quotation.stage === 'draft' && (
                  <button onClick={() => addUpsell(u.product_id)} className="mt-3 bg-white border border-blue-300 text-blue-700 rounded px-3 py-1 text-sm hover:bg-blue-100">
                    Add to Quote
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
