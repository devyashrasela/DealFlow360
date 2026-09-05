import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';

export function CatalogAdminPage() {
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [priceLists, setPriceLists] = useState([]);
  const [upsellRules, setUpsellRules] = useState([]);
  const [upsellConfig, setUpsellConfig] = useState({ minimum_margin_threshold: 20 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals & Drawers
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isPriceListModalOpen, setIsPriceListModalOpen] = useState(false);
  const [isUpsellModalOpen, setIsUpsellModalOpen] = useState(false);
  
  // Selected product for variant drawer
  const [selectedProductForVariants, setSelectedProductForVariants] = useState(null);
  const [variantsList, setVariantsList] = useState([]);
  const [loadingVariants, setLoadingVariants] = useState(false);

  // Selected price list for items drawer
  const [selectedPriceListForItems, setSelectedPriceListForItems] = useState(null);
  const [priceListItems, setPriceListItems] = useState([]);
  const [loadingPriceListItems, setLoadingPriceListItems] = useState(false);

  // Product Form State
  const [prodForm, setProdForm] = useState({
    name: '',
    sku: '',
    category: 'hardware',
    billing_cadence: 'one_time',
    base_list_price: 1000,
    standard_unit_cost: 600,
    description: '',
  });

  // Price List Form State
  const [plForm, setPlForm] = useState({
    name: '',
    tier: 'gold',
    currency: 'USD',
  });

  // Variant Form State
  const [variantForm, setVariantForm] = useState({
    variant_name: '',
    variant_sku: '',
    price_delta: 50,
    cost_delta: 30,
  });

  // Price List Item Form State
  const [plItemForm, setPlItemForm] = useState({
    product_id: '',
    custom_unit_price: 900,
  });

  // Upsell Rule Form State
  const [upsellForm, setUpsellForm] = useState({
    trigger_product_id: '',
    recommended_product_id: '',
    priority_rank: 1,
    promotional_discount_percent: 5,
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'products') {
        const res = await apiClient.get('/catalog');
        setProducts(res.products || []);
      } else if (activeTab === 'pricelists') {
        const res = await apiClient.get('/catalog/price-lists');
        setPriceLists(res.priceLists || []);
      } else if (activeTab === 'upsells') {
        const [rulesRes, configRes, prodsRes] = await Promise.all([
          apiClient.get('/catalog/upsell-rules').catch(() => []),
          apiClient.get('/catalog/upsell-config').catch(() => ({ minimum_margin_threshold: 20 })),
          apiClient.get('/catalog').catch(() => ({ products: [] })),
        ]);
        setUpsellRules(rulesRes || []);
        setUpsellConfig(configRes || { minimum_margin_threshold: 20 });
        setProducts(prodsRes.products || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Product Handlers ---
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/catalog', {
        name: prodForm.name,
        sku: prodForm.sku || `SKU-${Date.now()}`,
        category: prodForm.category,
        billing_cadence: prodForm.billing_cadence,
        base_list_price: parseFloat(prodForm.base_list_price),
        standard_unit_cost: parseFloat(prodForm.standard_unit_cost),
        description: prodForm.description,
      });
      setIsProductModalOpen(false);
      setProdForm({
        name: '',
        sku: '',
        category: 'hardware',
        billing_cadence: 'one_time',
        base_list_price: 1000,
        standard_unit_cost: 600,
        description: '',
      });
      fetchData();
    } catch (err) {
      alert('Failed to create product: ' + err.message);
    }
  };

  // --- Variant Handlers ---
  const openVariantsDrawer = async (prod) => {
    setSelectedProductForVariants(prod);
    setLoadingVariants(true);
    try {
      const res = await apiClient.get(`/catalog/${prod.id}/variants`);
      setVariantsList(Array.isArray(res) ? res : res.variants || []);
    } catch (err) {
      alert('Failed to load variants: ' + err.message);
    } finally {
      setLoadingVariants(false);
    }
  };

  const handleCreateVariant = async (e) => {
    e.preventDefault();
    if (!selectedProductForVariants) return;
    try {
      await apiClient.post(`/catalog/${selectedProductForVariants.id}/variants`, {
        variant_name: variantForm.variant_name,
        variant_sku: variantForm.variant_sku || `VAR-${Date.now()}`,
        price_delta: parseFloat(variantForm.price_delta),
        cost_delta: parseFloat(variantForm.cost_delta),
        attributes: {},
      });
      setVariantForm({
        variant_name: '',
        variant_sku: '',
        price_delta: 50,
        cost_delta: 30,
      });
      // Refresh variants & product list to update count
      const res = await apiClient.get(`/catalog/${selectedProductForVariants.id}/variants`);
      setVariantsList(Array.isArray(res) ? res : res.variants || []);
      const prodsRes = await apiClient.get('/catalog');
      setProducts(prodsRes.products || []);
    } catch (err) {
      alert('Failed to create variant: ' + err.message);
    }
  };

  const handleDeleteVariant = async (variantId) => {
    if (!selectedProductForVariants || !confirm('Delete this variant?')) return;
    try {
      await apiClient.delete(`/catalog/${selectedProductForVariants.id}/variants/${variantId}`);
      const res = await apiClient.get(`/catalog/${selectedProductForVariants.id}/variants`);
      setVariantsList(Array.isArray(res) ? res : res.variants || []);
      const prodsRes = await apiClient.get('/catalog');
      setProducts(prodsRes.products || []);
    } catch (err) {
      alert('Failed to delete variant: ' + err.message);
    }
  };

  // --- Price List Handlers ---
  const handleCreatePriceList = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/catalog/price-lists', {
        name: plForm.name,
        tier: plForm.tier,
        currency: plForm.currency,
        effective_start: new Date().toISOString(),
      });
      setIsPriceListModalOpen(false);
      setPlForm({ name: '', tier: 'gold', currency: 'USD' });
      fetchData();
    } catch (err) {
      alert('Failed to create price list: ' + err.message);
    }
  };

  const openPriceListItemsDrawer = async (pl) => {
    setSelectedPriceListForItems(pl);
    setLoadingPriceListItems(true);
    try {
      const [detailRes, prodsRes] = await Promise.all([
        apiClient.get(`/catalog/price-lists/${pl.id}`),
        apiClient.get('/catalog'),
      ]);
      setPriceListItems(detailRes.items || detailRes.price_list_items || []);
      setProducts(prodsRes.products || []);
      if (prodsRes.products?.length > 0) {
        setPlItemForm(prev => ({ ...prev, product_id: prodsRes.products[0].id }));
      }
    } catch (err) {
      alert('Failed to load price list items: ' + err.message);
    } finally {
      setLoadingPriceListItems(false);
    }
  };

  const handleAddPriceListItem = async (e) => {
    e.preventDefault();
    if (!selectedPriceListForItems) return;
    try {
      await apiClient.post(`/catalog/price-lists/${selectedPriceListForItems.id}/items`, {
        product_id: plItemForm.product_id,
        custom_unit_price: parseFloat(plItemForm.custom_unit_price),
      });
      const detailRes = await apiClient.get(`/catalog/price-lists/${selectedPriceListForItems.id}`);
      setPriceListItems(detailRes.items || detailRes.price_list_items || []);
    } catch (err) {
      alert('Failed to add item: ' + err.message);
    }
  };

  const handleDeletePriceListItem = async (itemId) => {
    if (!selectedPriceListForItems || !confirm('Remove custom price item?')) return;
    try {
      await apiClient.delete(`/catalog/price-lists/${selectedPriceListForItems.id}/items/${itemId}`);
      const detailRes = await apiClient.get(`/catalog/price-lists/${selectedPriceListForItems.id}`);
      setPriceListItems(detailRes.items || detailRes.price_list_items || []);
    } catch (err) {
      alert('Failed to remove item: ' + err.message);
    }
  };

  // --- Upsell Handlers ---
  const handleSaveUpsellConfig = async () => {
    try {
      await apiClient.put('/catalog/upsell-config', {
        minimum_margin_threshold: parseFloat(upsellConfig.minimum_margin_threshold),
      });
      alert('Upsell configuration updated successfully!');
    } catch (err) {
      alert('Failed to update upsell config: ' + err.message);
    }
  };

  const handleCreateUpsellRule = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/catalog/upsell-rules', {
        trigger_product_id: upsellForm.trigger_product_id,
        recommended_product_id: upsellForm.recommended_product_id,
        priority_rank: parseInt(upsellForm.priority_rank, 10),
        promotional_discount_percent: parseFloat(upsellForm.promotional_discount_percent),
        is_active: true,
      });
      setIsUpsellModalOpen(false);
      fetchData();
    } catch (err) {
      alert('Failed to create upsell rule: ' + err.message);
    }
  };

  return (
    <div className="p-6 h-full flex flex-col overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Product Catalog & Pricing Configuration</h1>
          <p className="text-gray-500 text-sm">Manage product master data, tier-based price lists, and upsell rules.</p>
        </div>
        <div className="flex space-x-3">
          {activeTab === 'products' && (
            <button
              onClick={() => setIsProductModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 font-medium"
            >
              + Create Product
            </button>
          )}
          {activeTab === 'pricelists' && (
            <button
              onClick={() => setIsPriceListModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 font-medium"
            >
              + Create Price List
            </button>
          )}
          {activeTab === 'upsells' && (
            <button
              onClick={() => {
                if (products.length >= 2) {
                  setUpsellForm({
                    trigger_product_id: products[0].id,
                    recommended_product_id: products[1].id,
                    priority_rank: 1,
                    promotional_discount_percent: 5,
                  });
                }
                setIsUpsellModalOpen(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 font-medium"
            >
              + Add Upsell Rule
            </button>
          )}
        </div>
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`px-4 py-2 font-medium text-sm ${activeTab === 'products' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('products')}
        >
          Master Product Catalog
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${activeTab === 'pricelists' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('pricelists')}
        >
          Price Lists
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${activeTab === 'upsells' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('upsells')}
        >
          Upsell & Cross-Sell
        </button>
      </div>

      {loading && <div className="text-gray-500 py-4">Loading catalog data...</div>}
      {error && <div className="text-red-500 py-2">Error: {error}</div>}

      {/* --- Tab 1: Products Table --- */}
      {!loading && !error && activeTab === 'products' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 border-b">SKU Code</th>
                <th className="p-3 border-b">Product Name</th>
                <th className="p-3 border-b">Category</th>
                <th className="p-3 border-b">Base Price</th>
                <th className="p-3 border-b">Unit Cost</th>
                <th className="p-3 border-b">Tax Rate</th>
                <th className="p-3 border-b text-center">Variant Count</th>
                <th className="p-3 border-b text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => {
                const varCount = p.variants_count ?? p.variant_count ?? 0;
                const cost = p.standard_unit_cost ?? p.unit_cost ?? 0;
                return (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3 font-mono text-xs text-gray-700">{p.sku || p.id.split('-')[0]}</td>
                    <td className="p-3 font-medium text-blue-600">{p.name}</td>
                    <td className="p-3 capitalize">{p.category}</td>
                    <td className="p-3 font-medium">${Number(p.base_list_price).toLocaleString()}</td>
                    <td className="p-3 text-gray-600">${Number(cost).toLocaleString()}</td>
                    <td className="p-3 text-gray-600">18% (Std)</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => openVariantsDrawer(p)}
                        className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
                        title="Click to view or add variants"
                      >
                        {varCount} {varCount === 1 ? 'variant' : 'variants'}
                      </button>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => openVariantsDrawer(p)}
                        className="px-2 py-1 text-xs text-blue-600 border border-blue-200 rounded hover:bg-blue-50"
                      >
                        Manage Variants
                      </button>
                    </td>
                  </tr>
                );
              })}
              {products.length === 0 && (
                <tr>
                  <td colSpan="8" className="p-6 text-center text-gray-500">
                    No products found. Click "+ Create Product" to add your first catalog item.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* --- Tab 2: Price Lists Table --- */}
      {!loading && !error && activeTab === 'pricelists' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 border-b">Price List Name</th>
                <th className="p-3 border-b">Tier</th>
                <th className="p-3 border-b">Currency</th>
                <th className="p-3 border-b">Active Status</th>
                <th className="p-3 border-b text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {priceLists.map(pl => (
                <tr key={pl.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3 font-medium text-blue-600">{pl.name}</td>
                  <td className="p-3 capitalize font-medium text-gray-700">{pl.tier || 'standard'}</td>
                  <td className="p-3 text-gray-600 font-mono text-xs">{pl.currency}</td>
                  <td className="p-3">
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                      Active
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => openPriceListItemsDrawer(pl)}
                      className="px-2 py-1 text-xs text-blue-600 border border-blue-200 rounded hover:bg-blue-50 font-medium"
                    >
                      Manage Custom Prices
                    </button>
                  </td>
                </tr>
              ))}
              {priceLists.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-gray-500">
                    No price lists found. Click "+ Create Price List" to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* --- Tab 3: Upsell & Cross-Sell Table --- */}
      {!loading && !error && activeTab === 'upsells' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Minimum Upsell Margin Threshold</h2>
              <p className="text-xs text-gray-500">Recommended add-ons must yield at least this margin to be suggested.</p>
            </div>
            <div className="flex items-center space-x-3">
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={upsellConfig.minimum_margin_threshold}
                onChange={e => setUpsellConfig({ ...upsellConfig, minimum_margin_threshold: e.target.value })}
                className="w-24 border border-gray-300 rounded p-1.5 text-sm"
              />
              <span className="text-sm font-semibold">%</span>
              <button
                onClick={handleSaveUpsellConfig}
                className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 font-medium"
              >
                Save Threshold
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Co-Purchase / Upsell Recommendation Rules</h2>
            </div>
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 border-b">Priority</th>
                  <th className="p-3 border-b">Trigger Product</th>
                  <th className="p-3 border-b">Recommended Product</th>
                  <th className="p-3 border-b">Promo Discount %</th>
                  <th className="p-3 border-b">Status</th>
                </tr>
              </thead>
              <tbody>
                {upsellRules.map(rule => (
                  <tr key={rule.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3 font-semibold text-gray-700">#{rule.priority_rank}</td>
                    <td className="p-3 font-medium text-gray-900">{rule.trigger_product?.name || rule.trigger_product_id}</td>
                    <td className="p-3 font-medium text-blue-600">{rule.recommended_product?.name || rule.recommended_product_id}</td>
                    <td className="p-3 font-semibold text-green-600">+{rule.promotional_discount_percent}% Promo</td>
                    <td className="p-3">
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">Active</span>
                    </td>
                  </tr>
                ))}
                {upsellRules.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-6 text-center text-gray-500">
                      No upsell rules configured. Click "+ Add Upsell Rule" to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- Structured Product Creation Modal --- */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-lg font-bold text-gray-900">Create New Catalog Product</h2>
              <button onClick={() => setIsProductModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleCreateProduct} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enterprise Workstation Pro"
                  value={prodForm.name}
                  onChange={e => setProdForm({ ...prodForm, name: e.target.value })}
                  className="w-full border border-gray-300 rounded p-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">SKU Code</label>
                  <input
                    type="text"
                    placeholder="e.g. HW-SRV-01"
                    value={prodForm.sku}
                    onChange={e => setProdForm({ ...prodForm, sku: e.target.value })}
                    className="w-full border border-gray-300 rounded p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Category *</label>
                  <select
                    value={prodForm.category}
                    onChange={e => setProdForm({ ...prodForm, category: e.target.value })}
                    className="w-full border border-gray-300 rounded p-2 text-sm"
                  >
                    <option value="hardware">Hardware</option>
                    <option value="services">Services</option>
                    <option value="subscriptions">Subscriptions</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Base List Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={prodForm.base_list_price}
                    onChange={e => setProdForm({ ...prodForm, base_list_price: e.target.value })}
                    className="w-full border border-gray-300 rounded p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Standard Unit Cost ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={prodForm.standard_unit_cost}
                    onChange={e => setProdForm({ ...prodForm, standard_unit_cost: e.target.value })}
                    className="w-full border border-gray-300 rounded p-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Billing Cadence</label>
                <select
                  value={prodForm.billing_cadence}
                  onChange={e => setProdForm({ ...prodForm, billing_cadence: e.target.value })}
                  className="w-full border border-gray-300 rounded p-2 text-sm"
                >
                  <option value="one_time">One-Time</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  rows="2"
                  placeholder="Optional product description..."
                  value={prodForm.description}
                  onChange={e => setProdForm({ ...prodForm, description: e.target.value })}
                  className="w-full border border-gray-300 rounded p-2 text-sm"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 font-medium"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Structured Price List Creation Modal --- */}
      {isPriceListModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-lg font-bold text-gray-900">Create New Price List</h2>
              <button onClick={() => setIsPriceListModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleCreatePriceList} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Price List Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gold Enterprise Pricing 2026"
                  value={plForm.name}
                  onChange={e => setPlForm({ ...plForm, name: e.target.value })}
                  className="w-full border border-gray-300 rounded p-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tier *</label>
                <select
                  value={plForm.tier}
                  onChange={e => setPlForm({ ...plForm, tier: e.target.value })}
                  className="w-full border border-gray-300 rounded p-2 text-sm capitalize"
                >
                  <option value="standard">Standard</option>
                  <option value="bronze">Bronze</option>
                  <option value="silver">Silver</option>
                  <option value="gold">Gold</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Currency *</label>
                <select
                  value={plForm.currency}
                  onChange={e => setPlForm({ ...plForm, currency: e.target.value })}
                  className="w-full border border-gray-300 rounded p-2 text-sm"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsPriceListModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 font-medium"
                >
                  Create Price List
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Variant Management Drawer / Modal --- */}
      {selectedProductForVariants && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-end">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Manage Variants</h2>
                  <p className="text-xs text-gray-500">Product: <span className="font-semibold text-gray-800">{selectedProductForVariants.name}</span></p>
                </div>
                <button onClick={() => setSelectedProductForVariants(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
              </div>

              {/* Add Variant Form */}
              <form onSubmit={handleCreateVariant} className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600">Add New Variant</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Variant Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 5-Pack Bundle"
                      value={variantForm.variant_name}
                      onChange={e => setVariantForm({ ...variantForm, variant_name: e.target.value })}
                      className="w-full border border-gray-300 rounded p-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Variant SKU</label>
                    <input
                      type="text"
                      placeholder="e.g. VAR-5PK"
                      value={variantForm.variant_sku}
                      onChange={e => setVariantForm({ ...variantForm, variant_sku: e.target.value })}
                      className="w-full border border-gray-300 rounded p-1.5 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Price Delta ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={variantForm.price_delta}
                      onChange={e => setVariantForm({ ...variantForm, price_delta: e.target.value })}
                      className="w-full border border-gray-300 rounded p-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Cost Delta ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={variantForm.cost_delta}
                      onChange={e => setVariantForm({ ...variantForm, cost_delta: e.target.value })}
                      className="w-full border border-gray-300 rounded p-1.5 text-sm"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 font-medium"
                >
                  + Add Variant
                </button>
              </form>

              {/* Variants Table */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">Existing Variants</h3>
                {loadingVariants ? (
                  <div className="text-sm text-gray-500 py-4">Loading variants...</div>
                ) : (
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-gray-50 text-xs">
                      <tr>
                        <th className="p-2 border-b">SKU</th>
                        <th className="p-2 border-b">Name</th>
                        <th className="p-2 border-b">Price Delta</th>
                        <th className="p-2 border-b">Cost Delta</th>
                        <th className="p-2 border-b text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variantsList.map(v => (
                        <tr key={v.id} className="border-b border-gray-100">
                          <td className="p-2 font-mono text-xs">{v.variant_sku}</td>
                          <td className="p-2 font-medium">{v.variant_name}</td>
                          <td className="p-2 text-green-700 font-medium">+{Number(v.price_delta).toLocaleString()}</td>
                          <td className="p-2 text-gray-600">+{Number(v.cost_delta).toLocaleString()}</td>
                          <td className="p-2 text-right">
                            <button
                              onClick={() => handleDeleteVariant(v.id)}
                              className="text-red-500 hover:text-red-700 text-xs font-medium"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {variantsList.length === 0 && (
                        <tr>
                          <td colSpan="5" className="p-4 text-center text-gray-500 text-xs">
                            No variants configured for this product.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="pt-4 border-t">
              <button
                onClick={() => setSelectedProductForVariants(null)}
                className="w-full py-2 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Price List Custom Items Drawer / Modal --- */}
      {selectedPriceListForItems && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-end">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Custom Price Items</h2>
                  <p className="text-xs text-gray-500">
                    Price List: <span className="font-semibold text-gray-800">{selectedPriceListForItems.name}</span> ({selectedPriceListForItems.tier} tier)
                  </p>
                </div>
                <button onClick={() => setSelectedPriceListForItems(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
              </div>

              {/* Add Custom Price Form */}
              <form onSubmit={handleAddPriceListItem} className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600">Add Custom Product Price</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Product *</label>
                    <select
                      value={plItemForm.product_id}
                      onChange={e => setPlItemForm({ ...plItemForm, product_id: e.target.value })}
                      className="w-full border border-gray-300 rounded p-1.5 text-sm"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Base: ${p.base_list_price})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Custom Unit Price ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={plItemForm.custom_unit_price}
                      onChange={e => setPlItemForm({ ...plItemForm, custom_unit_price: e.target.value })}
                      className="w-full border border-gray-300 rounded p-1.5 text-sm"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 font-medium"
                >
                  + Add Custom Price Item
                </button>
              </form>

              {/* Custom Prices Table */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">Configured Custom Prices</h3>
                {loadingPriceListItems ? (
                  <div className="text-sm text-gray-500 py-4">Loading items...</div>
                ) : (
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-gray-50 text-xs">
                      <tr>
                        <th className="p-2 border-b">Product</th>
                        <th className="p-2 border-b">Custom Price</th>
                        <th className="p-2 border-b text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {priceListItems.map(item => (
                        <tr key={item.id} className="border-b border-gray-100">
                          <td className="p-2 font-medium">{item.product?.name || item.product_id}</td>
                          <td className="p-2 font-semibold text-blue-600">${Number(item.custom_unit_price).toLocaleString()}</td>
                          <td className="p-2 text-right">
                            <button
                              onClick={() => handleDeletePriceListItem(item.id)}
                              className="text-red-500 hover:text-red-700 text-xs font-medium"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                      {priceListItems.length === 0 && (
                        <tr>
                          <td colSpan="3" className="p-4 text-center text-gray-500 text-xs">
                            No custom price items in this price list.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="pt-4 border-t">
              <button
                onClick={() => setSelectedPriceListForItems(null)}
                className="w-full py-2 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Add Upsell Rule Modal --- */}
      {isUpsellModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-lg font-bold text-gray-900">Add Co-Purchase Upsell Rule</h2>
              <button onClick={() => setIsUpsellModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleCreateUpsellRule} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Trigger Product *</label>
                <select
                  value={upsellForm.trigger_product_id}
                  onChange={e => setUpsellForm({ ...upsellForm, trigger_product_id: e.target.value })}
                  className="w-full border border-gray-300 rounded p-2 text-sm"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Recommended Product *</label>
                <select
                  value={upsellForm.recommended_product_id}
                  onChange={e => setUpsellForm({ ...upsellForm, recommended_product_id: e.target.value })}
                  className="w-full border border-gray-300 rounded p-2 text-sm"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Priority Rank</label>
                  <input
                    type="number"
                    min="1"
                    value={upsellForm.priority_rank}
                    onChange={e => setUpsellForm({ ...upsellForm, priority_rank: e.target.value })}
                    className="w-full border border-gray-300 rounded p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Promo Discount %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={upsellForm.promotional_discount_percent}
                    onChange={e => setUpsellForm({ ...upsellForm, promotional_discount_percent: e.target.value })}
                    className="w-full border border-gray-300 rounded p-2 text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsUpsellModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 font-medium"
                >
                  Create Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
