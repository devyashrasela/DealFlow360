import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { 
  Plus, Edit2, Trash2, ChevronDown, ChevronRight, 
  Settings, DollarSign, PackageOpen, Layers, CheckCircle2,
  AlertCircle, Sparkles
} from 'lucide-react';

export function CatalogAdminPage({ initialTab }) {
  const location = useLocation();

  // Compute default tab based on URL path or prop
  const getComputedTab = () => {
    if (initialTab) return initialTab;
    if (location.pathname.includes('price-list')) return 'pricelists';
    if (location.pathname.includes('upsell')) return 'upsell';
    return 'products';
  };

  const [activeTab, setActiveTab] = useState(getComputedTab());

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    } else if (location.pathname.includes('price-list')) {
      setActiveTab('pricelists');
    } else if (location.pathname.includes('products')) {
      setActiveTab('products');
    }
  }, [initialTab, location.pathname]);

  // Data State
  const [products, setProducts] = useState([]);
  const [priceLists, setPriceLists] = useState([]);
  const [upsellRules, setUpsellRules] = useState([]);
  const [upsellConfig, setUpsellConfig] = useState({ minimum_margin_threshold: 20 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  // UI State
  const [expandedProductId, setExpandedProductId] = useState(null);

  // Product Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);

  // Variant Modal State
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [currentVariant, setCurrentVariant] = useState(null);
  const [variantParentId, setVariantParentId] = useState(null);

  // Price List Modal State
  const [isPriceListModalOpen, setIsPriceListModalOpen] = useState(false);
  const [currentPriceList, setCurrentPriceList] = useState(null);

  // Price List Items Modal State
  const [isPriceListDetailOpen, setIsPriceListDetailOpen] = useState(false);
  const [selectedPriceList, setSelectedPriceList] = useState(null);
  const [priceListItems, setPriceListItems] = useState([]);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [newItemProductId, setNewItemProductId] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [isSavingItem, setIsSavingItem] = useState(false);

  // Upsell & Co-Purchase Rules State
  const [minMarginThreshold, setMinMarginThreshold] = useState(20);
  const [coPurchaseRules, setCoPurchaseRules] = useState([
    {
      id: 'rule-1',
      trigger_product_id: '',
      trigger_name: 'Enterprise Router X900',
      suggested_product_id: '',
      suggested_name: '3-Year On-Site Maintenance SLA',
      co_purchase_pct: 68,
      priority_rank: 1,
      promotional_discount_percent: 15,
      is_promoted: true,
      is_active: true
    },
    {
      id: 'rule-2',
      trigger_product_id: '',
      trigger_name: 'Managed Cloud Gateway',
      suggested_product_id: '',
      suggested_name: '24/7 Security Operations Center Add-On',
      co_purchase_pct: 54,
      priority_rank: 2,
      promotional_discount_percent: 10,
      is_promoted: false,
      is_active: true
    }
  ]);
  const [isAddRuleModalOpen, setIsAddRuleModalOpen] = useState(false);
  const [newRule, setNewRule] = useState({
    trigger_product_id: '',
    suggested_product_id: '',
    priority_rank: 1,
    promotional_discount_percent: 10,
    is_promoted: false
  });

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

  const showFeedback = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 3500);
  };

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
      setError(err.message || 'Failed to fetch data');
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

      {/* FEEDBACK BANNER */}
      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* TABS */}
      <div className="flex border-b border-neutral-200/60">
        <button 
          className={`pb-3 px-1 mr-8 font-medium text-sm transition-colors relative ${activeTab === 'products' ? 'text-[#724B66]' : 'text-[#2E3141]/60 hover:text-[#2E3141]'}`}
          onClick={() => setActiveTab('products')}
        >
          <div className="flex items-center space-x-2">
            <PackageOpen size={18}/>
            <span>Tab 1: Master Catalog</span>
          </div>
          {activeTab === 'products' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#724B66] rounded-t-full" />}
        </button>
        <button 
          className={`pb-3 px-1 mr-8 font-medium text-sm transition-colors relative ${activeTab === 'pricelists' ? 'text-[#724B66]' : 'text-[#2E3141]/60 hover:text-[#2E3141]'}`}
          onClick={() => setActiveTab('pricelists')}
        >
          <div className="flex items-center space-x-2">
            <DollarSign size={18}/>
            <span>Tab 2: Price Lists</span>
          </div>
          {activeTab === 'pricelists' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#724B66] rounded-t-full" />}
        </button>
        <button 
          className={`pb-3 px-1 font-medium text-sm transition-colors relative ${activeTab === 'upsell' ? 'text-[#724B66]' : 'text-[#2E3141]/60 hover:text-[#2E3141]'}`}
          onClick={() => setActiveTab('upsell')}
        >
          <div className="flex items-center space-x-2">
            <Layers size={18}/>
            <span>Tab 3: Upsell & Cross-Sell Engine</span>
          </div>
          {activeTab === 'upsell' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#724B66] rounded-t-full" />}
        </button>
      </div>

      {/* CONTENT */}
      {error && <div className="p-4 bg-rose-50 text-rose-600 rounded-lg text-sm">{error}</div>}
      
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-[#2E3141]/50 gap-2">
            <Settings className="animate-spin" size={24} />
            <span className="text-sm">Loading catalog records...</span>
          </div>
        ) : (
          <>
            {/* TAB 1: MASTER PRODUCT CATALOG */}
            {activeTab === 'products' && (
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#F3F2F2] text-[#2E3141] uppercase tracking-wider text-xs border-b border-neutral-200/60 font-semibold">
                      <tr>
                        <th className="p-4">SKU Code</th>
                        <th className="p-4">Product Name</th>
                        <th className="p-4">Category</th>
                        <th className="p-4 text-right">Base Price</th>
                        <th className="p-4 text-right">Unit Cost</th>
                        <th className="p-4 text-center">Tax Rate</th>
                        <th className="p-4 text-center">Variants</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200/60">
                      {products.map(p => {
                        const variantCount = p.variants_count ?? (p.variants ? p.variants.length : 0);
                        return (
                          <React.Fragment key={p.id}>
                            <tr className="hover:bg-neutral-50/50 transition-colors group">
                              <td className="p-4 font-mono text-xs text-[#724B66] font-semibold">{p.sku}</td>
                              <td className="p-4">
                                <button 
                                  onClick={() => toggleExpandProduct(p)}
                                  className="font-semibold text-[#111826] hover:text-[#724B66] flex items-center space-x-2 text-left"
                                >
                                  {expandedProductId === p.id ? <ChevronDown size={16} className="text-[#724B66]"/> : <ChevronRight size={16} className="text-neutral-400"/>}
                                  <span>{p.name}</span>
                                </button>
                                {p.description && (
                                  <p className="text-xs text-[#2E3141]/60 mt-0.5 line-clamp-1 pl-6">{p.description}</p>
                                )}
                              </td>
                              <td className="p-4 capitalize">
                                <Badge status={p.category === 'subscriptions' ? 'active' : p.category === 'services' ? 'pickpack' : 'default'}>
                                  {p.category}
                                </Badge>
                              </td>
                              <td className="p-4 text-right font-semibold text-[#111826]">
                                ${Number(p.base_list_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                              <td className="p-4 text-right text-neutral-600">
                                ${Number(p.standard_unit_cost || p.unit_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                              <td className="p-4 text-center text-xs font-mono text-neutral-500">
                                10.0%
                              </td>
                              <td className="p-4 text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variantCount > 0 ? 'bg-[#724B66]/10 text-[#724B66]' : 'bg-neutral-100 text-neutral-500'}`}>
                                  {variantCount} variants
                                </span>
                              </td>
                              <td className="p-4 text-right space-x-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => { setCurrentProduct(p); setIsProductModalOpen(true); }} 
                                  icon={Edit2}
                                >
                                  Edit
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-rose-600 hover:bg-rose-50" 
                                  onClick={() => handleDeleteProduct(p.id, p.name)} 
                                  icon={Trash2}
                                />
                              </td>
                            </tr>
                            
                            {/* VARIANT MATRIX EXPANSION */}
                            {expandedProductId === p.id && (
                              <tr className="bg-[#F3F2F2]/30">
                                <td colSpan="8" className="p-0">
                                  <div className="px-10 py-5 border-l-4 border-[#724B66] bg-white m-3 rounded-lg shadow-xs">
                                    <div className="flex justify-between items-center mb-4">
                                      <div>
                                        <h4 className="font-bold text-[#111826] text-sm flex items-center gap-2">
                                          Variant Matrix: {p.name}
                                        </h4>
                                        <p className="text-xs text-[#2E3141]/70 mt-0.5">Attributes, SKU derivatives, and pricing deltas</p>
                                      </div>
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => { setVariantParentId(p.id); setCurrentVariant(null); setIsVariantModalOpen(true); }} 
                                        icon={Plus}
                                      >
                                        Add Variant
                                      </Button>
                                    </div>
                                    
                                    {p.variants && p.variants.length > 0 ? (
                                      <table className="w-full text-sm bg-white rounded-lg border border-neutral-200/60 overflow-hidden">
                                        <thead className="bg-[#F3F2F2] text-xs font-semibold text-[#2E3141]">
                                          <tr>
                                            <th className="p-3">Variant SKU</th>
                                            <th className="p-3">Variant Name</th>
                                            <th className="p-3 text-right">Price Delta</th>
                                            <th className="p-3 text-right">Effective Price</th>
                                            <th className="p-3">Attributes</th>
                                            <th className="p-3 text-right">Actions</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-100">
                                          {p.variants.map(v => {
                                            const effectivePrice = Number(p.base_list_price) + Number(v.price_delta || 0);
                                            return (
                                              <tr key={v.id} className="hover:bg-neutral-50/50">
                                                <td className="p-3 font-mono text-xs text-[#724B66] font-semibold">{v.variant_sku}</td>
                                                <td className="p-3 font-medium text-[#111826]">{v.variant_name}</td>
                                                <td className="p-3 text-right font-mono text-xs">
                                                  {Number(v.price_delta) >= 0 ? `+${Number(v.price_delta).toFixed(2)}` : Number(v.price_delta).toFixed(2)}
                                                </td>
                                                <td className="p-3 text-right font-bold text-[#111826]">
                                                  ${effectivePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="p-3 text-xs text-neutral-500 font-mono">
                                                  {v.attributes ? JSON.stringify(v.attributes) : '{}'}
                                                </td>
                                                <td className="p-3 text-right space-x-1">
                                                  <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    onClick={() => { setVariantParentId(p.id); setCurrentVariant(v); setIsVariantModalOpen(true); }}
                                                    icon={Edit2}
                                                  />
                                                  <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    onClick={() => handleDeleteVariant(p.id, v.id)} 
                                                    className="text-rose-600 hover:bg-rose-50"
                                                    icon={Trash2}
                                                  />
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    ) : (
                                      <div className="text-xs text-[#2E3141]/60 italic py-3 bg-neutral-50 rounded px-4">
                                        No variants configured for this base product. Click "+ Add Variant" to specify configurations.
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                      {products.length === 0 && (
                        <tr><td colSpan="8" className="p-8 text-center text-[#2E3141]/50">No products found in the catalog.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* TAB 2: PRICE LISTS */}
            {activeTab === 'pricelists' && (
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#F3F2F2] text-[#2E3141] uppercase tracking-wider text-xs border-b border-neutral-200/60 font-semibold">
                      <tr>
                        <th className="p-4">Price List Name</th>
                        <th className="p-4">Customer Tier</th>
                        <th className="p-4">Currency</th>
                        <th className="p-4">Effective Dates</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200/60">
                      {priceLists.map(pl => (
                        <tr key={pl.id} className="hover:bg-neutral-50/50 transition-colors">
                          <td className="p-4 font-semibold text-[#111826] cursor-pointer hover:text-[#724B66]" onClick={() => openPriceListDetail(pl)}>
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-[#724B66]" />
                              <span>{pl.name}</span>
                            </div>
                          </td>
                          <td className="p-4 capitalize">
                            <Badge status={pl.tier === 'gold' ? 'warning' : pl.tier === 'silver' ? 'default' : pl.tier === 'bronze' ? 'pickpack' : 'active'}>
                              {pl.tier}
                            </Badge>
                          </td>
                          <td className="p-4 font-mono font-bold text-xs">{pl.currency}</td>
                          <td className="p-4 text-xs text-[#2E3141]/70">
                            {pl.effective_start ? new Date(pl.effective_start).toLocaleDateString() : 'Immediate'} 
                            {' → '}
                            {pl.effective_end ? new Date(pl.effective_end).toLocaleDateString() : 'Indefinite'}
                          </td>
                          <td className="p-4">
                            <Badge status={pl.is_active ? 'active' : 'cancelled'}>
                              {pl.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="p-4 text-right space-x-2">
                            <Button variant="outline" size="sm" onClick={() => openPriceListDetail(pl)}>
                              Manage Items
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { setCurrentPriceList(pl); setIsPriceListModalOpen(true); }} icon={Edit2}>
                              Edit
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {priceLists.length === 0 && (
                        <tr><td colSpan="6" className="p-8 text-center text-[#2E3141]/50">No price lists registered.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* TAB 3: UPSELL & CROSS-SELL ENGINE */}
            {activeTab === 'upsell' && (
              <div className="space-y-6">
                <Card 
                  title="Global Recommendation Parameters" 
                  subtitle="Configure system-wide profit margins and qualification guardrails for automated suggestions."
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 max-w-xl">
                    <div className="flex-1 w-full">
                      <label className="block text-xs font-semibold text-[#111826] uppercase tracking-wider mb-1">
                        Minimum Margin Threshold (%)
                      </label>
                      <input 
                        type="number" 
                        value={minMarginThreshold} 
                        onChange={(e) => setMinMarginThreshold(Number(e.target.value))}
                        className="w-full border border-neutral-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#724B66]/30 focus:border-[#724B66] outline-none"
                        min="0"
                        max="100"
                      />
                      <p className="text-xs text-[#2E3141]/60 mt-1">
                        Cross-sell suggestions will be suppressed if the blended gross margin falls below this limit.
                      </p>
                    </div>
                    <Button variant="secondary" onClick={handleSaveMarginThreshold}>
                      Save Threshold
                    </Button>
                  </div>
                </Card>
                
                <Card 
                  title="Co-Purchase Rule Pairing Table" 
                  subtitle="Machine-suggested pairings and sponsored upsells promoted in the Quotation Builder."
                  action={
                    <Button variant="primary" size="sm" onClick={() => setIsAddRuleModalOpen(true)} icon={Plus}>
                      Add Pairing Rule
                    </Button>
                  }
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm mt-2">
                      <thead className="bg-[#F3F2F2] text-[#2E3141] uppercase tracking-wider text-xs border-b border-neutral-200/60 font-semibold">
                        <tr>
                          <th className="p-3.5">Trigger Product</th>
                          <th className="p-3.5">Suggested Pairing</th>
                          <th className="p-3.5 text-center">Historical Co-Purchase %</th>
                          <th className="p-3.5 text-center">Priority</th>
                          <th className="p-3.5 text-right">Promo Discount</th>
                          <th className="p-3.5 text-center">Sponsorship Tag</th>
                          <th className="p-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200/60">
                        {coPurchaseRules.map(rule => (
                          <tr key={rule.id} className="hover:bg-neutral-50/50">
                            <td className="p-3.5 font-medium text-[#111826]">{rule.trigger_name}</td>
                            <td className="p-3.5 text-[#724B66] font-semibold">{rule.suggested_name}</td>
                            <td className="p-3.5 text-center font-bold text-neutral-700">
                              {rule.co_purchase_pct}%
                            </td>
                            <td className="p-3.5 text-center">
                              <span className="font-mono text-xs px-2 py-0.5 bg-neutral-100 rounded">
                                Rank #{rule.priority_rank}
                              </span>
                            </td>
                            <td className="p-3.5 text-right font-semibold text-emerald-700">
                              {rule.promotional_discount_percent}% Off
                            </td>
                            <td className="p-3.5 text-center">
                              <button 
                                onClick={() => handleToggleRulePromoted(rule.id)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition ${rule.is_promoted ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'}`}
                              >
                                <Sparkles className="w-3 h-3" />
                                {rule.is_promoted ? 'Promoted Tag' : 'Standard'}
                              </button>
                            </td>
                            <td className="p-3.5 text-right space-x-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-rose-600 hover:bg-rose-50"
                                onClick={() => handleDeleteRule(rule.id)}
                                icon={Trash2}
                              >
                                Remove
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}
          </>
        )}
      </div>

      {/* --- MODALS --- */}
      
      {/* Product Modal */}
      <Modal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} title={currentProduct ? 'Edit Product' : 'Create Master Product'}>
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#111826] uppercase tracking-wider mb-1">SKU Code</label>
              <input name="sku" defaultValue={currentProduct?.sku || ''} required className="w-full border border-neutral-300 rounded-lg p-2 text-sm focus:border-[#724B66] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111826] uppercase tracking-wider mb-1">Product Name</label>
              <input name="name" defaultValue={currentProduct?.name || ''} required className="w-full border border-neutral-300 rounded-lg p-2 text-sm focus:border-[#724B66] outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#111826] uppercase tracking-wider mb-1">Description</label>
            <textarea name="description" defaultValue={currentProduct?.description || ''} className="w-full border border-neutral-300 rounded-lg p-2 text-sm focus:border-[#724B66] outline-none" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#111826] uppercase tracking-wider mb-1">Category</label>
              <select name="category" defaultValue={currentProduct?.category || 'hardware'} className="w-full border border-neutral-300 rounded-lg p-2 text-sm bg-white focus:border-[#724B66] outline-none">
                <option value="hardware">Hardware</option>
                <option value="services">Services</option>
                <option value="subscriptions">Subscriptions</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111826] uppercase tracking-wider mb-1">Billing Cadence</label>
              <select name="billing_cadence" defaultValue={currentProduct?.billing_cadence || 'one_time'} className="w-full border border-neutral-300 rounded-lg p-2 text-sm bg-white focus:border-[#724B66] outline-none">
                <option value="one_time">One Time</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#111826] uppercase tracking-wider mb-1">Base List Price ($)</label>
              <input name="base_list_price" type="number" step="0.01" defaultValue={currentProduct?.base_list_price || 0} required className="w-full border border-neutral-300 rounded-lg p-2 text-sm focus:border-[#724B66] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111826] uppercase tracking-wider mb-1">Standard Unit Cost ($)</label>
              <input name="standard_unit_cost" type="number" step="0.01" defaultValue={currentProduct?.standard_unit_cost || currentProduct?.unit_cost || 0} required className="w-full border border-neutral-300 rounded-lg p-2 text-sm focus:border-[#724B66] outline-none" />
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-100">
            <Button variant="ghost" onClick={() => setIsProductModalOpen(false)} type="button">Cancel</Button>
            <Button variant="primary" type="submit">Save Product</Button>
          </div>
        </form>
      </Modal>

      {/* Variant Modal */}
      <Modal isOpen={isVariantModalOpen} onClose={() => setIsVariantModalOpen(false)} title={currentVariant ? 'Edit Variant' : 'Add Product Variant'}>
        <form onSubmit={handleSaveVariant} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#111826] uppercase tracking-wider mb-1">Variant SKU</label>
              <input name="variant_sku" defaultValue={currentVariant?.variant_sku || ''} required className="w-full border border-neutral-300 rounded-lg p-2 text-sm focus:border-[#724B66] outline-none" placeholder="e.g. SRV-202-L" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111826] uppercase tracking-wider mb-1">Variant Name</label>
              <input name="variant_name" defaultValue={currentVariant?.variant_name || ''} required className="w-full border border-neutral-300 rounded-lg p-2 text-sm focus:border-[#724B66] outline-none" placeholder="e.g. 128GB RAM Upgrade" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#111826] uppercase tracking-wider mb-1">Price Delta ($)</label>
              <input name="price_delta" type="number" step="0.01" defaultValue={currentVariant?.price_delta || 0} className="w-full border border-neutral-300 rounded-lg p-2 text-sm focus:border-[#724B66] outline-none" placeholder="+200.00" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111826] uppercase tracking-wider mb-1">Cost Delta ($)</label>
              <input name="cost_delta" type="number" step="0.01" defaultValue={currentVariant?.cost_delta || 0} className="w-full border border-neutral-300 rounded-lg p-2 text-sm focus:border-[#724B66] outline-none" placeholder="+120.00" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#111826] uppercase tracking-wider mb-1">Attributes (JSON)</label>
            <textarea name="attributes" defaultValue={currentVariant?.attributes ? JSON.stringify(currentVariant.attributes) : '{"specification": "Standard"}'} className="w-full border border-neutral-300 rounded-lg p-2 font-mono text-xs focus:border-[#724B66] outline-none" rows={3} />
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-100">
            <Button variant="ghost" onClick={() => setIsVariantModalOpen(false)} type="button">Cancel</Button>
            <Button variant="primary" type="submit">Save Variant</Button>
          </div>
        </form>
      </Modal>

      {/* Price List Modal */}
      <Modal isOpen={isPriceListModalOpen} onClose={() => setIsPriceListModalOpen(false)} title={currentPriceList ? 'Edit Price List' : 'Create Tier Price List'}>
        <form onSubmit={handleSavePriceList} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#111826] uppercase tracking-wider mb-1">Price List Name</label>
            <input name="name" defaultValue={currentPriceList?.name || ''} required className="w-full border border-neutral-300 rounded-lg p-2 text-sm focus:border-[#724B66] outline-none" placeholder="e.g. Enterprise Gold 2026" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#111826] uppercase tracking-wider mb-1">Customer Tier</label>
              <select name="tier" defaultValue={currentPriceList?.tier || 'standard'} className="w-full border border-neutral-300 rounded-lg p-2 text-sm bg-white focus:border-[#724B66] outline-none">
                <option value="standard">Standard</option>
                <option value="bronze">Bronze</option>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111826] uppercase tracking-wider mb-1">Currency</label>
              <input name="currency" defaultValue={currentPriceList?.currency || 'USD'} required className="w-full border border-neutral-300 rounded-lg p-2 text-sm focus:border-[#724B66] outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#111826] uppercase tracking-wider mb-1">Effective Start</label>
              <input name="effective_start" type="date" defaultValue={currentPriceList?.effective_start ? new Date(currentPriceList.effective_start).toISOString().split('T')[0] : ''} className="w-full border border-neutral-300 rounded-lg p-2 text-sm focus:border-[#724B66] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111826] uppercase tracking-wider mb-1">Effective End</label>
              <input name="effective_end" type="date" defaultValue={currentPriceList?.effective_end ? new Date(currentPriceList.effective_end).toISOString().split('T')[0] : ''} className="w-full border border-neutral-300 rounded-lg p-2 text-sm focus:border-[#724B66] outline-none" />
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-100">
            <Button variant="ghost" onClick={() => setIsPriceListModalOpen(false)} type="button">Cancel</Button>
            <Button variant="primary" type="submit">Save Price List</Button>
          </div>
        </form>
      </Modal>

      {/* Price List Detail Modal */}
      <Modal 
        isOpen={isPriceListDetailOpen} 
        onClose={() => setIsPriceListDetailOpen(false)} 
        title={`Custom Prices: ${selectedPriceList?.name || 'Price List'}`}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-neutral-50 p-3 rounded-lg border border-neutral-200/60">
            <div>
              <p className="text-xs font-semibold uppercase text-neutral-500">Tier: <span className="text-[#111826] font-bold capitalize">{selectedPriceList?.tier}</span></p>
              <p className="text-xs text-neutral-500">Currency: <span className="text-[#111826] font-bold">{selectedPriceList?.currency}</span></p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsAddItemOpen(!isAddItemOpen)} 
              icon={Plus}
            >
              {isAddItemOpen ? 'Close Add Form' : 'Add Custom Price Override'}
            </Button>
          </div>

          {/* Inline Add Price Item Form */}
          {isAddItemOpen && (
            <form onSubmit={handleAddPriceListItem} className="p-4 bg-[#724B66]/5 border border-[#724B66]/20 rounded-xl space-y-3">
              <h5 className="text-xs font-bold text-[#724B66] uppercase tracking-wider">Set Custom Product Price</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#111826] mb-1">Target Product</label>
                  <select 
                    value={newItemProductId} 
                    onChange={(e) => setNewItemProductId(e.target.value)}
                    className="w-full p-2 text-sm border border-neutral-300 rounded-lg bg-white outline-none focus:border-[#724B66]"
                    required
                  >
                    <option value="">Select a catalog product...</option>
                    {products.map(prod => (
                      <option key={prod.id} value={prod.id}>
                        {prod.name} ({prod.sku}) — Base: ${prod.base_list_price}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#111826] mb-1">Custom Tier Unit Price ($)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={newItemPrice} 
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    placeholder="e.g. 199.99" 
                    className="w-full p-2 text-sm border border-neutral-300 rounded-lg bg-white outline-none focus:border-[#724B66]"
                    required 
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setIsAddItemOpen(false)}>Cancel</Button>
                <Button variant="primary" size="sm" type="submit" disabled={isSavingItem}>
                  {isSavingItem ? 'Saving Item...' : 'Confirm Custom Price'}
                </Button>
              </div>
            </form>
          )}
          
          <div className="border border-neutral-200/60 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F3F2F2] sticky top-0 text-xs text-[#2E3141] font-semibold">
                <tr>
                  <th className="p-3">Product Name</th>
                  <th className="p-3 text-right">Override Unit Price</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/60 bg-white">
                {priceListItems.map(item => (
                  <tr key={item.id} className="hover:bg-neutral-50/50">
                    <td className="p-3 font-medium text-[#111826]">
                      {item.product?.name || item.Product?.name || 'Product Override'}
                      <span className="block text-xs text-neutral-400 font-mono">
                        {item.product?.sku || item.Product?.sku || item.product_id}
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold text-[#724B66]">
                      ${Number(item.custom_unit_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-rose-600 hover:bg-rose-50"
                        onClick={() => handleRemovePriceListItem(item.id)}
                        icon={Trash2}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
                {priceListItems.length === 0 && (
                  <tr><td colSpan="3" className="p-6 text-center text-[#2E3141]/50 text-xs italic">No custom price overrides configured. Standard catalog prices apply.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

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
