import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export function QuotationListPage() {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [priceLists, setPriceLists] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedPriceList, setSelectedPriceList] = useState('');

  const stages = ['draft', 'pending_approval', 'approved', 'under_negotiation', 'confirmed'];

  useEffect(() => {
    fetchQuotations();
  }, []);

  const fetchQuotations = async () => {
    try {
      const res = await apiClient.get('/api/quotations?limit=100');
      setQuotations(res.quotations || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openNewQuoteModal = async () => {
    try {
      setIsModalOpen(true);
      const [custRes, plRes] = await Promise.all([
        apiClient.get('/api/customers'),
        apiClient.get('/api/catalog/price-lists')
      ]);
      setCustomers(custRes);
      setPriceLists(plRes.priceLists || []);
      if (custRes.length > 0) setSelectedCustomer(custRes[0].id);
      if (plRes.priceLists?.length > 0) setSelectedPriceList(plRes.priceLists[0].id);
    } catch (err) {
      console.error(err);
    }
  };

  const createQuotation = async () => {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const res = await apiClient.post('/api/quotations', {
        customer_account_id: selectedCustomer,
        price_list_id: selectedPriceList,
        expiration_date: futureDate.toISOString()
      });
      navigate(`/quotations/${res.id}`);
    } catch (err) {
      console.error(err);
      alert('Failed to create quotation');
    }
  };

  const stageDisplayNames = {
    'draft': 'Draft',
    'pending_approval': 'Pending Approval',
    'approved': 'Approved',
    'under_negotiation': 'Negotiation',
    'confirmed': 'Confirmed'
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>;

  return (
    <div className="h-full flex flex-col p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Quotations (List)</h1>
          <p className="text-gray-500 text-sm">Every quotation in the system, one row per quotation, click a row to open it</p>
        </div>
        <div className="space-x-3">
          <button className="px-4 py-2 bg-gray-200 rounded text-sm hover:bg-gray-300">Switch to Table View</button>
          <button onClick={openNewQuoteModal} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">+ New Quotation</button>
        </div>
      </div>

      <div className="flex-1 flex space-x-4 overflow-x-auto">
        {stages.map(stage => {
          const columnQuotes = quotations.filter(q => q.stage === stage);
          return (
            <div key={stage} className="flex-shrink-0 w-80 bg-gray-50 rounded-lg p-4 flex flex-col">
              <h2 className="font-semibold text-gray-700 mb-4">{stageDisplayNames[stage]} <span className="text-gray-400 text-sm font-normal">({columnQuotes.length})</span></h2>
              <div className="flex-1 space-y-3 overflow-y-auto">
                {columnQuotes.map(q => (
                  <div
                    key={q.id}
                    onClick={() => navigate(`/quotations/${q.id}`)}
                    className="bg-white p-4 rounded border border-gray-200 shadow-sm cursor-pointer hover:border-blue-400"
                  >
                    <div className="font-medium text-gray-900">{q.customer_account?.buyer_organization?.legal_name || 'Unknown Customer'}</div>
                    <div className="text-gray-500 text-sm mt-1">{q.quotation_number} • ${Number(q.gross_total).toLocaleString()}</div>
                    {q.blended_risk_score > 0 && <div className="mt-2 text-xs text-orange-600">Risk: {q.blended_risk_score}pt</div>}
                    <div className="mt-1 text-xs text-green-600">Margin: {q.blended_margin_percentage}%</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">New Quotation</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Account</label>
                <select
                  value={selectedCustomer}
                  onChange={e => setSelectedCustomer(e.target.value)}
                  className="w-full border-gray-300 rounded shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.buyer_organization?.legal_name || c.id}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price List</label>
                <select
                  value={selectedPriceList}
                  onChange={e => setSelectedPriceList(e.target.value)}
                  className="w-full border-gray-300 rounded shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {priceLists.map(pl => (
                    <option key={pl.id} value={pl.id}>{pl.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={createQuotation} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
