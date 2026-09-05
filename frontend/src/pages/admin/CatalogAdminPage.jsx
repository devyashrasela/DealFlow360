import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';

export function CatalogAdminPage() {
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [priceLists, setPriceLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'products') {
        const res = await apiClient.get('/api/catalog');
        setProducts(res.products || []);
      } else if (activeTab === 'pricelists') {
        const res = await apiClient.get('/api/catalog/price-lists');
        setPriceLists(Array.isArray(res) ? res : []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createProduct = async () => {
    const name = prompt('Enter Product Name:');
    if (!name) return;
    try {
      await apiClient.post('/api/catalog', { name, category: 'hardware', base_list_price: 1000, unit_cost: 500, sku: `SKU-${Date.now()}` });
      fetchData();
    } catch (err) { alert(err.message); }
  };

  const createPriceList = async () => {
    const name = prompt('Enter Price List Name:');
    if (!name) return;
    try {
      await apiClient.post('/api/catalog/price-lists', { name, currency: 'USD' });
      fetchData();
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Product Catalog & Pricing Configuration</h1>
          <p className="text-gray-500 text-sm">Manage product master data and tier-based price lists.</p>
        </div>
        <button onClick={activeTab === 'products' ? createProduct : createPriceList} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
          + Create {activeTab === 'products' ? 'Product' : 'Price List'}
        </button>
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        <button 
          className={`px-4 py-2 font-medium text-sm ${activeTab === 'products' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('products')}
        >Master Product Catalog</button>
        <button 
          className={`px-4 py-2 font-medium text-sm ${activeTab === 'pricelists' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('pricelists')}
        >Price Lists</button>
      </div>

      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">Error: {error}</div>}

      {!loading && !error && activeTab === 'products' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 border-b">SKU Code</th>
                <th className="p-3 border-b">Product Name</th>
                <th className="p-3 border-b">Category</th>
                <th className="p-3 border-b">Base Price</th>
                <th className="p-3 border-b">Unit Cost</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3">{p.sku || p.id.split('-')[0]}</td>
                  <td className="p-3 font-medium text-blue-600">{p.name}</td>
                  <td className="p-3 capitalize">{p.category}</td>
                  <td className="p-3">${Number(p.base_list_price).toLocaleString()}</td>
                  <td className="p-3">${Number(p.unit_cost).toLocaleString()}</td>
                </tr>
              ))}
              {products.length === 0 && <tr><td colSpan="5" className="p-4 text-center text-gray-500">No products found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && activeTab === 'pricelists' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 border-b">Price List Name</th>
                <th className="p-3 border-b">Currency</th>
                <th className="p-3 border-b">Active Status</th>
              </tr>
            </thead>
            <tbody>
              {priceLists.map(pl => (
                <tr key={pl.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3 font-medium text-blue-600">{pl.name}</td>
                  <td className="p-3">{pl.currency}</td>
                  <td className="p-3"><span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Active</span></td>
                </tr>
              ))}
              {priceLists.length === 0 && <tr><td colSpan="3" className="p-4 text-center text-gray-500">No price lists found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
