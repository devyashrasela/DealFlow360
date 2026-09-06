import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { apiClient } from '../../api/client';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { 
  Plus, Edit2, Trash2, ChevronDown, ChevronRight, 
  Settings, DollarSign, PackageOpen, Layers, CheckCircle2,
  AlertCircle, Sparkles, X, RefreshCw, ArrowUpRight, FileText, Search
} from 'lucide-react';

export function CatalogAdminPage({ initialTab }) {
  const location = useLocation();
  const { activeOrg } = useAuth();
  const orgSlug = activeOrg?.slug || 'acme';

  // Compute default tab based on URL path or prop
  const getComputedTab = () => {
    if (initialTab) return initialTab;
    if (location.pathname.includes('price-list')) return 'pricelists';
    if (location.pathname.includes('subscription')) return 'plans';
    if (location.pathname.includes('upsell')) return 'upsell';
    return 'products';
  };

  const [activeTab, setActiveTab] = useState(getComputedTab());

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    } else if (location.pathname.includes('price-list')) {
      setActiveTab('pricelists');
    } else if (location.pathname.includes('subscription')) {
      setActiveTab('plans');
    } else if (location.pathname.includes('products')) {
      setActiveTab('products');
    }
  }, [initialTab, location.pathname]);

  // Data State
  const [products, setProducts] = useState([]);
  const [priceLists, setPriceLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  // UI State
  const [expandedProductId, setExpandedProductId] = useState(null);
  const [expandedPlanId, setExpandedPlanId] = useState(null);
  const [productSearchTerm, setProductSearchTerm] = useState('');

  // Product / Plan Modal Dynamic Fields State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [modalCategory, setModalCategory] = useState('hardware');
  const [modalBillingCadence, setModalBillingCadence] = useState('one_time');
  const [modalBasePrice, setModalBasePrice] = useState(0);

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
  const [searchStr, setSearchStr] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [newItemPrice, setNewItemPrice] = useState('');
  const [isSavingItem, setIsSavingItem] = useState(false);

  // Upsell & Co-Purchase Rules State
  const [minMarginThreshold, setMinMarginThreshold] = useState(20);
  const [coPurchaseRules, setCoPurchaseRules] = useState([]);
  const [isAddRuleModalOpen, setIsAddRuleModalOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState(null);
  const [newRule, setNewRule] = useState({
    trigger_product_id: '',
    suggested_product_id: '',
    priority_rank: 1,
    promotional_discount_percent: 10,
    is_promoted: false
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
      if (activeTab === 'products' || activeTab === 'plans') {
        const res = await apiClient.get('/catalog');
        setProducts(res.products || []);
      } else if (activeTab === 'upsell') {
        const [prodRes, rulesRes, configData] = await Promise.all([
          apiClient.get('/catalog'),
          apiClient.get('/catalog/upsell-rules'),
          apiClient.get('/catalog/upsell-config').catch(() => ({}))
        ]);
        setProducts(prodRes.products || []);
        setCoPurchaseRules(rulesRes || []);
        setMinMarginThreshold(configData.minimum_margin_threshold ?? 20);
      } else if (activeTab === 'pricelists') {
        const [plRes, prodRes] = await Promise.all([
          apiClient.get('/catalog/price-lists'),
          apiClient.get('/catalog')
        ]);
        setPriceLists(Array.isArray(plRes) ? plRes : plRes.priceLists || plRes.data || []);
        setProducts(prodRes.products || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // Filter products that represent recurring subscriptions
  const subscriptionPlans = products.filter(
    p => p.category === 'subscriptions' || (p.billing_cadence && p.billing_cadence !== 'one_time')
  );

  const activePlansCount = subscriptionPlans.filter(p => p.is_active !== false).length;

  const handleOpenCreateProduct = () => {
    setCurrentProduct(null);
    setModalCategory('hardware');
    setModalBillingCadence('one_time');
    setModalBasePrice('');
    setIsProductModalOpen(true);
  };

  const handleOpenCreatePlan = () => {
    setCurrentProduct(null);
    setModalCategory('subscriptions');
    setModalBillingCadence('monthly');
    setModalBasePrice('');
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (p) => {
    setCurrentProduct(p);
    setModalCategory(p.category || 'hardware');
    setModalBillingCadence(p.billing_cadence || 'one_time');
    setModalBasePrice(p.base_list_price || 0);
    setIsProductModalOpen(true);
  };

  const handleOpenEditPlan = (p) => {
    setCurrentProduct(p);
    setModalCategory('subscriptions');
    setModalBillingCadence(p.billing_cadence || 'monthly');
    setModalBasePrice(p.base_list_price || 0);
    setIsProductModalOpen(true);
  };

  // --- PRODUCT CRUD ---
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = {
      sku: formData.get('sku'),
      name: formData.get('name'),
      description: formData.get('description'),
      category: formData.get('category'),
      billing_cadence: formData.get('billing_cadence'),
      base_list_price: parseFloat(formData.get('base_list_price')),
      standard_unit_cost: parseFloat(formData.get('standard_unit_cost') || 0),
    };

    try {
      if (currentProduct) {
        await apiClient.put(`/catalog/${currentProduct.id}`, payload);
        showFeedback(`${payload.category === 'subscriptions' ? 'Subscription plan' : 'Product'} "${payload.name}" updated successfully.`);
      } else {
        await apiClient.post('/catalog', payload);
        showFeedback(`${payload.category === 'subscriptions' ? 'Subscription plan' : 'Product'} "${payload.name}" created successfully.`);
      }
      setIsProductModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.message || 'Error saving product');
    }
  };

  const handleDeleteProduct = async (id, name) => {
    if (!confirm(`Are you sure you want to deactivate "${name}"?`)) return;
    try {
      await apiClient.delete(`/catalog/${id}`);
      showFeedback(`"${name}" deactivated.`);
      fetchData();
    } catch (err) {
      alert(err.message || 'Error deleting item');
    }
  };

  const toggleExpandProduct = async (product) => {
    if (expandedProductId === product.id) {
      setExpandedProductId(null);
    } else {
      setExpandedProductId(product.id);
      if (!product.variants || product.variants.length === 0) {
        try {
          const res = await apiClient.get(`/catalog/${product.id}`);
          const detailedProduct = res.product || res;
          setProducts(products.map(p => p.id === product.id ? { ...p, variants: detailedProduct.variants || [] } : p));
        } catch (err) {
          console.error('Failed to load variants:', err);
        }
      }
    }
  };

  const toggleExpandPlan = (planId) => {
    setExpandedPlanId(prev => prev === planId ? null : planId);
  };

  // --- VARIANT CRUD ---
  const handleSaveVariant = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = {
      variant_sku: formData.get('variant_sku'),
      variant_name: formData.get('variant_name'),
      price_delta: parseFloat(formData.get('price_delta') || 0),
      cost_delta: parseFloat(formData.get('cost_delta') || 0),
      attributes: {}
    };

    try {
      const attrs = formData.get('attributes');
      if (attrs && attrs.trim()) payload.attributes = JSON.parse(attrs);
    } catch (err) {
      alert('Attributes must be valid JSON (e.g. {"color": "Red", "size": "XL"})');
      return;
    }

    try {
      if (currentVariant) {
        await apiClient.put(`/catalog/${variantParentId}/variants/${currentVariant.id}`, payload);
        showFeedback(`Variant "${payload.variant_name}" updated.`);
      } else {
        await apiClient.post(`/catalog/${variantParentId}/variants`, payload);
        showFeedback(`Variant "${payload.variant_name}" added.`);
      }
      setIsVariantModalOpen(false);
      const res = await apiClient.get(`/catalog/${variantParentId}`);
      const detailedProduct = res.product || res;
      setProducts(products.map(p => p.id === variantParentId ? { 
        ...p, 
        variants: detailedProduct.variants || [],
        variants_count: (detailedProduct.variants || []).length
      } : p));
    } catch (err) {
      alert(err.message || 'Error saving variant');
    }
  };

  const handleDeleteVariant = async (productId, variantId) => {
    if (!confirm('Delete this variant?')) return;
    try {
      await apiClient.delete(`/catalog/${productId}/variants/${variantId}`);
      showFeedback('Variant deleted.');
      const res = await apiClient.get(`/catalog/${productId}`);
      const detailedProduct = res.product || res;
      setProducts(products.map(p => p.id === productId ? { 
        ...p, 
        variants: detailedProduct.variants || [],
        variants_count: (detailedProduct.variants || []).length
      } : p));
    } catch (err) {
      alert(err.message || 'Error deleting variant');
    }
  };

  // --- PRICE LIST CRUD ---
  const handleSavePriceList = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = {
      name: formData.get('name'),
      tier: formData.get('tier'),
      currency: formData.get('currency'),
      effective_start: formData.get('effective_start') || null,
      effective_end: formData.get('effective_end') || null,
    };

    try {
      if (currentPriceList) {
        await apiClient.put(`/catalog/price-lists/${currentPriceList.id}`, payload);
        showFeedback(`Price list "${payload.name}" updated.`);
      } else {
        await apiClient.post('/catalog/price-lists', payload);
        showFeedback(`Price list "${payload.name}" created.`);
      }
      setIsPriceListModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.message || 'Error saving price list');
    }
  };

  const openPriceListDetail = async (pl) => {
    setSelectedPriceList(pl);
    setIsPriceListDetailOpen(true);
    setIsAddItemOpen(false);
    try {
      const res = await apiClient.get(`/catalog/price-lists/${pl.id}`);
      const items = res.items || res.priceList?.items || [];
      setPriceListItems(items);
    } catch (err) {
      console.error(err);
      setPriceListItems([]);
    }
  };

  const handleAddPriceListItem = async (e) => {
    e.preventDefault();
    if (!newItemProductId || !newItemPrice) {
      alert('Please choose a product and enter a custom unit price');
      return;
    }

    setIsSavingItem(true);
    try {
      await apiClient.post(`/catalog/price-lists/${selectedPriceList.id}/items`, {
        product_id: newItemProductId,
        custom_unit_price: parseFloat(newItemPrice)
      });
      // Refresh items
      const res = await apiClient.get(`/catalog/price-lists/${selectedPriceList.id}`);
      setPriceListItems(res.items || res.priceList?.items || []);
      setNewItemProductId('');
      setSearchStr('');
      setNewItemPrice('');
      setIsAddItemOpen(false);
      showFeedback('Price list item added successfully.');
    } catch (err) {
      alert(err.message || 'Failed to add item to price list');
    } finally {
      setIsSavingItem(false);
    }
  };

  const handleRemovePriceListItem = async (itemId) => {
    if (!confirm('Remove this custom price override?')) return;
    try {
      await apiClient.delete(`/catalog/price-lists/${selectedPriceList.id}/items/${itemId}`);
      const res = await apiClient.get(`/catalog/price-lists/${selectedPriceList.id}`);
      setPriceListItems(res.items || res.priceList?.items || []);
      showFeedback('Price list item removed.');
    } catch (err) {
      alert(err.message || 'Failed to remove item');
    }
  };

  // --- UPSELL ENGINE HANDLERS ---
  const handleSaveMarginThreshold = async () => {
    try {
      await apiClient.put('/catalog/upsell-config', { minimum_margin_threshold: minMarginThreshold });
      showFeedback(`Minimum Margin Threshold saved at ${minMarginThreshold}%.`);
    } catch (err) {
      showFeedback(err.message || 'Failed to save threshold', 'error');
    }
  };

  const handleAddRule = async (e) => {
    e.preventDefault();
    if (!newRule.trigger_product_id || !newRule.suggested_product_id) {
      showFeedback('Please select both a trigger product and suggested pairing.', 'error');
      return;
    }

    if (newRule.trigger_product_id === newRule.suggested_product_id) {
      showFeedback('Trigger product and suggested pairing cannot be the same.', 'error');
      return;
    }

    try {
      await apiClient.post('/catalog/upsell-rules', {
        trigger_product_id: newRule.trigger_product_id,
        recommended_product_id: newRule.suggested_product_id,
        priority_rank: Number(newRule.priority_rank),
        promotional_discount_percent: Number(newRule.promotional_discount_percent),
        is_promoted: Boolean(newRule.is_promoted),
        is_active: true
      });
      fetchData();
      setIsAddRuleModalOpen(false);
      setNewRule({
        trigger_product_id: '',
        suggested_product_id: '',
        priority_rank: 1,
        promotional_discount_percent: 10,
        is_promoted: false
      });
      showFeedback('New Co-Purchase rule activated.');
    } catch (err) {
      showFeedback(err.message || 'Error saving rule', 'error');
    }
  };

  const handleToggleRulePromoted = async (rule) => {
    try {
      await apiClient.put(`/catalog/upsell-rules/${rule.id}`, { is_promoted: !rule.is_promoted });
      setCoPurchaseRules(coPurchaseRules.map(r => r.id === rule.id ? { ...r, is_promoted: !r.is_promoted } : r));
    } catch (err) {
      showFeedback(err.message || 'Error toggling promotion status', 'error');
    }
  };

  const handleDeleteRuleConfirmed = async () => {
    if (!ruleToDelete) return;
    try {
      await apiClient.delete(`/catalog/upsell-rules/${ruleToDelete}`);
      setCoPurchaseRules(coPurchaseRules.filter(r => r.id !== ruleToDelete));
      showFeedback('Co-Purchase rule removed.');
      setRuleToDelete(null);
    } catch (err) {
      showFeedback(err.message || 'Error deleting rule', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#111826] tracking-tight">Catalog & Products</h1>
          <p className="text-[#2E3141]/70 mt-1">Master SKU catalog, recurring subscription tiers, price lists, and upsell rules.</p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'products' && (
            <Button 
              variant="primary" 
              onClick={handleOpenCreateProduct} 
              icon={Plus}
            >
              Create Product
            </Button>
          )}
          {activeTab === 'plans' && (
            <>
              <Link to={`/${orgSlug}/subscriptions`}>
                <Button variant="outline" size="sm" icon={ArrowUpRight}>
                  Live Contracts
                </Button>
              </Link>
              <Button 
                variant="primary" 
                onClick={handleOpenCreatePlan} 
                icon={Plus}
              >
                Create Plan
              </Button>
            </>
          )}
          {activeTab === 'pricelists' && (
            <Button 
              variant="primary" 
              onClick={() => { setCurrentPriceList(null); setIsPriceListModalOpen(true); }} 
              icon={Plus}
            >
              Create Price List
            </Button>
          )}
          {activeTab === 'upsell' && (
            <Button 
              variant="primary" 
              onClick={() => setIsAddRuleModalOpen(true)} 
              icon={Plus}
            >
              Add Co-Purchase Rule
            </Button>
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
      <div className="flex border-b border-neutral-200/60 overflow-x-auto">
        <button 
          className={`pb-3 px-1 mr-8 font-medium text-sm transition-colors relative shrink-0 ${activeTab === 'products' ? 'text-[#724B66]' : 'text-[#2E3141]/60 hover:text-[#2E3141]'}`}
          onClick={() => setActiveTab('products')}
        >
          <div className="flex items-center space-x-2">
            <PackageOpen size={18}/>
            <span>Products & SKUs</span>
          </div>
          {activeTab === 'products' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#724B66] rounded-t-full" />}
        </button>

        <button 
          className={`pb-3 px-1 mr-8 font-medium text-sm transition-colors relative shrink-0 ${activeTab === 'plans' ? 'text-[#724B66]' : 'text-[#2E3141]/60 hover:text-[#2E3141]'}`}
          onClick={() => setActiveTab('plans')}
        >
          <div className="flex items-center space-x-2">
            <RefreshCw size={18}/>
            <span>Subscription Plans</span>
            {subscriptionPlans.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-[#724B66]/10 text-[#724B66]">
                {subscriptionPlans.length}
              </span>
            )}
          </div>
          {activeTab === 'plans' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#724B66] rounded-t-full" />}
        </button>

        <button 
          className={`pb-3 px-1 mr-8 font-medium text-sm transition-colors relative shrink-0 ${activeTab === 'pricelists' ? 'text-[#724B66]' : 'text-[#2E3141]/60 hover:text-[#2E3141]'}`}
          onClick={() => setActiveTab('pricelists')}
        >
          <div className="flex items-center space-x-2">
            <DollarSign size={18}/>
            <span>Price Lists</span>
            {priceLists.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-neutral-100 text-neutral-600">
                {priceLists.length}
              </span>
            )}
          </div>
          {activeTab === 'pricelists' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#724B66] rounded-t-full" />}
        </button>

        <button 
          className={`pb-3 px-1 font-medium text-sm transition-colors relative shrink-0 ${activeTab === 'upsell' ? 'text-[#724B66]' : 'text-[#2E3141]/60 hover:text-[#2E3141]'}`}
          onClick={() => setActiveTab('upsell')}
        >
          <div className="flex items-center space-x-2">
            <Layers size={18}/>
            <span>Upsell Rules</span>
          </div>
          {activeTab === 'upsell' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#724B66] rounded-t-full" />}
        </button>
      </div>

      {/* CONTENT */}
      {error && <div className="p-4 bg-rose-50 text-rose-600 rounded-lg text-sm">{error}</div>}
      
      <div className="space-y-6">
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
                <div className="p-4 border-b border-neutral-100 flex items-center">
                  <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
                    <input 
                      type="text" 
                      placeholder="Search SKU, Name, or Category..." 
                      className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#724B66] focus:ring-1 focus:ring-[#724B66]/20 transition-all"
                      value={productSearchTerm}
                      onChange={(e) => setProductSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
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
                      {products.filter(p => 
                        !productSearchTerm || 
                        p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) || 
                        p.sku.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                        (p.category || '').toLowerCase().includes(productSearchTerm.toLowerCase())
                      ).map(p => {
                        const variantCount = p.variants_count ?? (p.variants ? p.variants.length : 0);
                        return (
                          <React.Fragment key={p.id}>
                            <tr className="hover:bg-neutral-50/50 transition-colors group">
                              <td className="p-4 font-mono text-xs text-[#724B66] font-semibold">{p.sku}</td>
                              <td className="p-4">
                                <button 
                                  onClick={() => toggleExpandProduct(p)}
                                  className="font-semibold text-[#111826] hover:text-[#724B66] flex items-center space-x-2 text-left group"
                                >
                                  {expandedProductId === p.id ? <ChevronDown size={16} className="text-[#724B66] shrink-0"/> : <ChevronRight size={16} className="text-neutral-400 group-hover:text-[#724B66] shrink-0"/>}
                                  <span>{p.name}</span>
                                  {p.description && (
                                    <span className="text-[10px] uppercase font-semibold tracking-wider text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200/80 group-hover:border-[#724B66]/30 group-hover:text-[#724B66] transition-colors">
                                      Specs
                                    </span>
                                  )}
                                </button>
                                {p.description && (
                                  <p 
                                    onClick={() => toggleExpandProduct(p)}
                                    className="text-xs text-[#2E3141]/60 mt-0.5 line-clamp-1 pl-6 cursor-pointer hover:text-neutral-800"
                                    title="Click to expand full SKU specifications and variants"
                                  >
                                    {p.description}
                                  </p>
                                )}
                              </td>
                              <td className="p-4 capitalize">
                                <Badge variant="category" dot={false} title={`Product category: ${p.category}`}>
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
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${variantCount > 0 ? 'bg-[#724B66]/10 text-[#724B66] border-[#724B66]/20' : 'bg-neutral-100/90 text-neutral-500 border-neutral-200/80'}`}>
                                  {variantCount} variants
                                </span>
                              </td>
                              <td className="p-4 text-right space-x-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleOpenEditProduct(p)} 
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
                                  <div className="px-10 py-5 border-l-4 border-[#724B66] bg-white m-3 rounded-lg shadow-xs space-y-4">
                                    {/* SKU Description & Specifications */}
                                    <div className="p-3.5 bg-neutral-50/80 rounded-lg border border-neutral-200/60 text-xs">
                                      <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-1.5 font-bold text-neutral-600 uppercase tracking-wider text-[11px]">
                                          <FileText className="w-3.5 h-3.5 text-[#724B66]" />
                                          <span>SKU Description & Technical Specifications</span>
                                        </div>
                                        <span className="font-mono text-neutral-400 text-[11px]">SKU: {p.sku}</span>
                                      </div>
                                      {p.description ? (
                                        <p className="text-neutral-700 leading-relaxed whitespace-pre-wrap">{p.description}</p>
                                      ) : (
                                        <div className="flex items-center justify-between text-neutral-400 italic">
                                          <span>No description or technical specifications configured for this product SKU.</span>
                                          <button 
                                            type="button"
                                            onClick={() => handleOpenEditProduct(p)} 
                                            className="not-italic text-xs font-semibold text-[#724B66] hover:underline"
                                          >
                                            + Add specifications
                                          </button>
                                        </div>
                                      )}
                                    </div>

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

            {/* TAB: SUBSCRIPTION PLANS & PRORATION SIMULATOR */}
            {activeTab === 'plans' && (
              <div className="space-y-6">
                {/* KPI Stats Strip */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card 1: Configured Plan Tiers */}
                  <div className="bg-white p-5 rounded-xl border border-neutral-200/60 shadow-xs">
                    <div className="flex items-center justify-between text-neutral-500 text-xs font-semibold uppercase tracking-wider">
                      <span>Configured Plans</span>
                      <div className="w-8 h-8 rounded-lg bg-[#724B66]/10 flex items-center justify-center text-[#724B66]">
                        <RefreshCw className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-[#111826] mt-2">
                      {subscriptionPlans.length} {subscriptionPlans.length === 1 ? 'Recurring Tier' : 'Recurring Tiers'}
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">
                      {activePlansCount} active • Available for quote line selection
                    </p>
                  </div>

                  {/* Card 2: Live Contracts Hub */}
                  <div className="bg-white p-5 rounded-xl border border-neutral-200/60 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-neutral-500 text-xs font-semibold uppercase tracking-wider">
                        <span>Live Contracts</span>
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
                          <ArrowUpRight className="w-4 h-4" />
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-[#111826] mt-2">Subscriptions Hub</p>
                    </div>
                    <Link
                      to={`/${orgSlug}/subscriptions`}
                      className="text-xs font-medium text-[#724B66] hover:text-[#5a3b51] hover:underline inline-flex items-center gap-1.5 mt-2 transition"
                    >
                      <span>Manage active contracts & MRR</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Plans Table */}
                <Card
                  title="Active Subscription Plan Specifications"
                  subtitle="Recurring contract specifications configured in the master product catalog."
                  action={
                    <Button variant="primary" size="sm" icon={Plus} onClick={handleOpenCreatePlan}>
                      Add Subscription Plan
                    </Button>
                  }
                >
                  <div className="p-4 border-b border-neutral-100 flex items-center">
                    <div className="relative w-full max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
                      <input 
                        type="text" 
                        placeholder="Search SKU or Plan Name..." 
                        className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#724B66] focus:ring-1 focus:ring-[#724B66]/20 transition-all"
                        value={productSearchTerm}
                        onChange={(e) => setProductSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-[#F3F2F2] text-[#2E3141] uppercase tracking-wider text-xs border-b border-neutral-200/60 font-semibold">
                        <tr>
                          <th className="p-4">Plan SKU</th>
                          <th className="p-4">Plan Name</th>
                          <th className="p-4">Billing Interval</th>
                          <th className="p-4 text-right">Base Price</th>
                          <th className="p-4 text-right">Standard Cost</th>
                          <th className="p-4 text-center">Status</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200/60">
                        {subscriptionPlans.filter(p => 
                          !productSearchTerm || 
                          p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) || 
                          p.sku.toLowerCase().includes(productSearchTerm.toLowerCase())
                        ).map(p => {
                          const listPrice = Number(p.base_list_price) || 0;
                          const unitCost = Number(p.standard_unit_cost || p.unit_cost) || 0;
                          const marginPct = listPrice > 0 ? (((listPrice - unitCost) / listPrice) * 100).toFixed(1) : '0.0';
                          const isExpanded = expandedPlanId === p.id;

                          return (
                            <React.Fragment key={p.id}>
                              <tr className={`hover:bg-neutral-50/60 transition-colors group ${isExpanded ? 'bg-neutral-50/40' : ''}`}>
                                <td className="p-4 font-mono text-[#724B66] text-xs font-bold">{p.sku}</td>
                                <td className="p-4">
                                  <button
                                    type="button"
                                    onClick={() => toggleExpandPlan(p.id)}
                                    className="font-semibold text-[#111826] hover:text-[#724B66] flex items-center space-x-2 text-left group/btn"
                                  >
                                    {isExpanded ? (
                                      <ChevronDown size={16} className="text-[#724B66] shrink-0" />
                                    ) : (
                                      <ChevronRight size={16} className="text-neutral-400 group-hover/btn:text-[#724B66] shrink-0 transition-colors" />
                                    )}
                                    <span>{p.name}</span>
                                    {p.description ? (
                                      <span className="text-[10px] uppercase font-semibold tracking-wider text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200/80 group-hover/btn:border-[#724B66]/30 group-hover/btn:text-[#724B66] transition-colors">
                                        Specs
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-neutral-400 italic font-normal">
                                        (no desc)
                                      </span>
                                    )}
                                  </button>
                                  {p.description && !isExpanded && (
                                    <p 
                                      onClick={() => toggleExpandPlan(p.id)}
                                      className="text-xs text-neutral-500 pl-6 mt-0.5 line-clamp-1 max-w-sm cursor-pointer hover:text-neutral-800 transition-colors"
                                      title="Click to view full description and specifications"
                                    >
                                      {p.description}
                                    </p>
                                  )}
                                </td>
                                <td className="p-4">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-600 capitalize">
                                    {p.billing_cadence || 'monthly'}
                                  </span>
                                </td>
                                <td className="p-4 text-right font-bold text-[#111826]">
                                  ${listPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  <span className="text-xs font-normal text-neutral-400"> / {p.billing_cadence === 'annual' ? 'yr' : p.billing_cadence === 'quarterly' ? 'qtr' : 'mo'}</span>
                                </td>
                                <td className="p-4 text-right text-neutral-600">
                                  ${unitCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="p-4 text-center">
                                  <Badge status={p.is_active ? 'active' : 'inactive'}>{p.is_active ? 'Active' : 'Inactive'}</Badge>
                                </td>
                                <td className="p-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => toggleExpandPlan(p.id)}
                                      className="text-neutral-500 hover:text-[#724B66]"
                                    >
                                      {isExpanded ? 'Collapse' : 'Details'}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleOpenEditPlan(p)}
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
                                  </div>
                                </td>
                              </tr>

                              {/* EXPANDABLE SKU SPECIFICATIONS DRAWER */}
                              {isExpanded && (
                                <tr className="bg-[#F3F2F2]/30">
                                  <td colSpan="7" className="p-0">
                                    <div className="px-8 py-5 border-l-4 border-[#724B66] bg-white m-3 rounded-lg shadow-xs space-y-3.5">
                                      {/* Header */}
                                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-neutral-100 pb-2.5">
                                        <div className="flex items-center gap-2">
                                          <div className="w-6 h-6 rounded-md bg-[#724B66]/10 flex items-center justify-center text-[#724B66]">
                                            <FileText className="w-3.5 h-3.5" />
                                          </div>
                                          <h4 className="text-xs font-bold text-[#111826] uppercase tracking-wider">
                                            SKU Description & Plan Specifications
                                          </h4>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-neutral-500">
                                          <span>SKU: <strong className="font-mono text-[#724B66]">{p.sku}</strong></span>
                                          <span>•</span>
                                          <span>Billing Interval: <strong className="capitalize text-[#111826]">{p.billing_cadence || 'monthly'}</strong></span>
                                          <span>•</span>
                                          <span>
                                            Target Margin: <strong className="text-emerald-700 font-semibold">{marginPct}%</strong>
                                          </span>
                                        </div>
                                      </div>

                                      {/* Full Description & Entitlements */}
                                      <div className="p-3.5 bg-neutral-50/80 rounded-lg border border-neutral-200/60 text-xs">
                                        <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                                          Scope of Coverage & SLA Terms
                                        </div>
                                        {p.description ? (
                                          <p className="text-neutral-800 leading-relaxed whitespace-pre-wrap">{p.description}</p>
                                        ) : (
                                          <div className="flex items-center justify-between text-neutral-400 italic">
                                            <span>No detailed description or SLA terms configured for this subscription SKU.</span>
                                            <button
                                              type="button"
                                              onClick={() => handleOpenEditPlan(p)}
                                              className="not-italic text-xs font-semibold text-[#724B66] hover:underline"
                                            >
                                              + Add description & SLA terms
                                            </button>
                                          </div>
                                        )}
                                      </div>

                                      {/* Commercial terms footer */}
                                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-neutral-500">
                                        <div className="flex items-center gap-4">
                                          <span>Base List Rate: <strong className="text-[#111826]">${listPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })} / {p.billing_cadence === 'annual' ? 'yr' : 'mo'}</strong></span>
                                          <span>Standard Cost: <strong className="text-[#111826]">${unitCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
                                          <span>Expected Contribution: <strong className="text-emerald-700 font-semibold">${(listPrice - unitCost).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleOpenEditPlan(p)}
                                            icon={Edit2}
                                            className="text-neutral-600 hover:text-[#724B66]"
                                          >
                                            Edit Specifications
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => toggleExpandPlan(p.id)}
                                            className="text-neutral-400 hover:text-neutral-600"
                                          >
                                            Collapse
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                        {subscriptionPlans.length === 0 && (
                          <tr>
                            <td colSpan="7" className="p-8 text-center text-neutral-400">
                              No subscription plans configured. Click "Add Subscription Plan" to provision recurring service tiers.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
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
                            <Badge variant="tag" dot={false} title={`Price List Tier: ${pl.tier}`}>
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
                            <Badge
                              status={pl.is_active ? 'active' : 'inactive'}
                              title={pl.is_active ? 'Active • Available for quotation pricing' : 'Inactive • Archived from new quotes'}
                            >
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
                    <table className="w-full text-left text-sm mt-2 whitespace-nowrap">
                      <thead className="bg-neutral-50/75 border-b border-neutral-200 text-neutral-500 uppercase tracking-wider text-xs font-semibold">
                        <tr>
                          <th className="px-4 py-3 text-left">Trigger Product</th>
                          <th className="px-4 py-3 text-left">Suggested Pairing</th>
                          <th className="px-4 py-3 text-center">Historical Co-Purchase %</th>
                          <th className="px-4 py-3 text-center">Priority</th>
                          <th className="px-4 py-3 text-right">Promo Discount</th>
                          <th className="px-4 py-3 text-center">Sponsorship Tag</th>
                          <th className="px-4 py-3 text-right w-24">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {coPurchaseRules.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="px-4 py-8 text-center text-sm text-neutral-400">
                              No co-purchase rules defined yet. Click "Add Pairing Rule" to create one.
                            </td>
                          </tr>
                        ) : (
                          coPurchaseRules.map(rule => (
                            <tr key={rule.id} className="hover:bg-neutral-50/50 transition-colors group">
                              <td className="px-4 py-3 font-medium text-[#111826]">{rule.trigger_product?.name || 'Unknown'}</td>
                              <td className="px-4 py-3 text-[#724B66] font-semibold">{rule.recommended_product?.name || 'Unknown'}</td>
                            <td className="px-4 py-3 text-center font-bold text-neutral-700">
                              {rule.co_purchase_pct}%
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="font-mono text-xs px-2 py-0.5 bg-neutral-100 rounded">
                                Rank #{rule.priority_rank}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                              {rule.promotional_discount_percent}% Off
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button 
                                onClick={() => handleToggleRulePromoted(rule)}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${rule.is_promoted ? 'bg-[#724B66]' : 'bg-neutral-300'}`}
                                title={rule.is_promoted ? "Promoted in Suggestions" : "Standard Priority"}
                              >
                                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${rule.is_promoted ? 'translate-x-4.5' : 'translate-x-1'}`} />
                              </button>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button 
                                onClick={() => setRuleToDelete(rule.id)} 
                                className="inline-flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors opacity-60 hover:opacity-100 focus:opacity-100"
                                title="Remove Rule"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Remove
                              </button>
                            </td>
                            </tr>
                          ))
                        )}
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
      
      {/* Unified Product / Subscription Plan Modal */}
      <Modal 
        isOpen={isProductModalOpen} 
        onClose={() => setIsProductModalOpen(false)} 
        title={
          currentProduct 
            ? (modalCategory === 'subscriptions' ? 'Edit Subscription Plan' : 'Edit Product')
            : (modalCategory === 'subscriptions' ? 'Create Subscription Plan' : 'Create Master Product')
        }
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#111826] uppercase tracking-wider mb-1">
                {modalCategory === 'subscriptions' ? 'Plan SKU / Code' : 'SKU Code'}
              </label>
              <input 
                name="sku" 
                defaultValue={currentProduct?.sku || ''} 
                required 
                placeholder={modalCategory === 'subscriptions' ? 'e.g. SAAS-SEC-PRO' : 'e.g. PROD-001'}
                className="w-full border border-neutral-300 rounded-lg p-2 text-sm focus:border-[#724B66] outline-none" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111826] uppercase tracking-wider mb-1">
                {modalCategory === 'subscriptions' ? 'Plan Display Name' : 'Product Name'}
              </label>
              <input 
                name="name" 
                defaultValue={currentProduct?.name || ''} 
                required 
                placeholder={modalCategory === 'subscriptions' ? 'e.g. Cloud Security Retainer' : 'e.g. Enterprise Router X900'}
                className="w-full border border-neutral-300 rounded-lg p-2 text-sm focus:border-[#724B66] outline-none" 
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-[#111826] uppercase tracking-wider">
                {modalCategory === 'subscriptions' ? 'Plan Specifications & SLA Entitlements' : 'SKU Description & Technical Specifications'}
              </label>
              <span className="text-[11px] text-neutral-400">Expandable in catalog tables</span>
            </div>
            <textarea 
              name="description" 
              defaultValue={currentProduct?.description || ''} 
              placeholder={modalCategory === 'subscriptions' ? 'e.g. 24/7 priority SLA, dedicated technical account manager, monthly security posture audits, and 99.99% uptime guarantee.' : 'Detailed product specifications, dimensions, features, compatibility, and warranty terms...'}
              className="w-full border border-neutral-300 rounded-lg p-2.5 text-sm focus:border-[#724B66] focus:ring-1 focus:ring-[#724B66] outline-none leading-relaxed" 
              rows={3} 
            />
            <p className="text-[11px] text-neutral-500 mt-1">
              Supports multi-line specifications and terms displayed in the expandable SKU details drawer.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#111826] uppercase tracking-wider mb-1">Category</label>
              <select 
                name="category" 
                value={modalCategory}
                onChange={(e) => {
                  const cat = e.target.value;
                  setModalCategory(cat);
                  if (cat === 'subscriptions') {
                    if (modalBillingCadence === 'one_time') setModalBillingCadence('monthly');
                  } else {
                    if (modalBillingCadence !== 'one_time') setModalBillingCadence('one_time');
                  }
                }}
                className="w-full border border-neutral-300 rounded-lg p-2 text-sm bg-white focus:border-[#724B66] outline-none"
              >
                <option value="hardware">Hardware</option>
                <option value="services">Services</option>
                <option value="subscriptions">Subscriptions</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111826] uppercase tracking-wider mb-1">Billing Cadence</label>
              <select 
                name="billing_cadence" 
                value={modalBillingCadence}
                onChange={(e) => setModalBillingCadence(e.target.value)}
                className="w-full border border-neutral-300 rounded-lg p-2 text-sm bg-white focus:border-[#724B66] outline-none"
              >
                {modalCategory !== 'subscriptions' && <option value="one_time">One Time</option>}
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
          </div>



          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#111826] uppercase tracking-wider mb-1">
                {modalCategory === 'subscriptions' ? 'Base Recurring Price ($)' : 'Base List Price ($)'}
              </label>
              <input 
                name="base_list_price" 
                type="number" 
                step="0.01" 
                value={modalBasePrice}
                onChange={(e) => setModalBasePrice(e.target.value)}
                required 
                className="w-full border border-neutral-300 rounded-lg p-2 text-sm focus:border-[#724B66] outline-none font-mono" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111826] uppercase tracking-wider mb-1">Standard Unit Cost ($)</label>
              <input 
                name="standard_unit_cost" 
                type="number" 
                step="0.01" 
                defaultValue={currentProduct?.standard_unit_cost || currentProduct?.unit_cost || 0} 
                required 
                className="w-full border border-neutral-300 rounded-lg p-2 text-sm focus:border-[#724B66] outline-none font-mono" 
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-100">
            <Button variant="ghost" onClick={() => setIsProductModalOpen(false)} type="button">Cancel</Button>
            <Button variant="primary" type="submit">
              {currentProduct ? 'Save Changes' : (modalCategory === 'subscriptions' ? 'Provision Subscription Plan' : 'Save Product')}
            </Button>
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
              icon={isAddItemOpen ? X : Plus}
            >
              {isAddItemOpen ? 'Close Add Form' : 'Add Custom Price Override'}
            </Button>
          </div>

          {/* Inline Add Price Item Form */}
          {isAddItemOpen && (
            <form onSubmit={handleAddPriceListItem} className="p-4 bg-[#724B66]/5 border border-[#724B66]/20 rounded-xl space-y-3">
              <h5 className="text-xs font-bold text-[#724B66] uppercase tracking-wider">Set Custom Product Price</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-xs font-semibold text-[#111826] mb-1">Target Product (Search by SKU/Name)</label>
                  <input 
                    type="text"
                    value={searchStr}
                    onChange={(e) => {
                      setSearchStr(e.target.value);
                      if (!e.target.value) setNewItemProductId('');
                    }}
                    onFocus={() => setIsProductDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setIsProductDropdownOpen(false), 200)}
                    className="w-full p-2.5 text-sm border border-neutral-300 rounded-lg bg-white outline-none focus:border-[#724B66] focus:ring-1 focus:ring-[#724B66]"
                    required
                    placeholder="Type to search..."
                  />
                  {isProductDropdownOpen && (
                    <ul className="absolute z-50 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-60 overflow-y-auto divide-y divide-neutral-100">
                      {products
                        .filter(p => `${p.name} ${p.sku}`.toLowerCase().includes(searchStr.toLowerCase()))
                        .map(prod => (
                          <li 
                            key={prod.id} 
                            className="px-4 py-2 hover:bg-neutral-50 cursor-pointer transition-colors"
                            onClick={() => {
                              setSearchStr(`${prod.name} (${prod.sku})`);
                              setNewItemProductId(prod.id);
                              setIsProductDropdownOpen(false);
                            }}
                          >
                            <div className="font-semibold text-[#111826] text-sm">{prod.name}</div>
                            <div className="text-xs text-neutral-500 font-mono mt-0.5">{prod.sku} — Base: ${prod.base_list_price}</div>
                          </li>
                      ))}
                      {products.filter(p => `${p.name} ${p.sku}`.toLowerCase().includes(searchStr.toLowerCase())).length === 0 && (
                        <li className="px-4 py-3 text-sm text-neutral-400 text-center italic">No products found.</li>
                      )}
                    </ul>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#111826] mb-1">Custom Tier Unit Price ({selectedPriceList?.currency || 'Base'})</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={newItemPrice} 
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    placeholder="e.g. 199.99" 
                    className="w-full p-2.5 text-sm border border-neutral-300 rounded-lg bg-white outline-none focus:border-[#724B66] focus:ring-1 focus:ring-[#724B66]"
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
          
          <div className="border border-neutral-200/60 rounded-lg overflow-hidden max-h-[400px] overflow-y-auto bg-white shadow-xs">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-neutral-50/75 sticky top-0 border-b border-neutral-200 text-neutral-500 uppercase tracking-wider text-xs font-semibold z-10">
                <tr>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3 text-right">Override Unit Price</th>
                  <th className="px-4 py-3 text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {priceListItems.map(item => (
                  <tr key={item.id} className="hover:bg-neutral-50/50 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[#111826]">
                        {item.product?.name || item.Product?.name || 'Product Override'}
                      </div>
                      <div className="text-xs text-neutral-400 font-mono mt-0.5">
                        {item.product?.sku || item.Product?.sku || item.product_id}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-[#111826]">
                      {selectedPriceList?.currency || '$'} {Number(item.custom_unit_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button 
                        onClick={() => handleRemovePriceListItem(item.id)} 
                        className="inline-flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Remove Override"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    </td>
                  </tr>
                ))}
                {priceListItems.length === 0 && (
                  <tr><td colSpan="3" className="p-8 text-center text-neutral-400 text-sm">No custom price overrides configured. Standard catalog prices apply.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* Add Co-Purchase Rule Modal */}
      <Modal isOpen={isAddRuleModalOpen} onClose={() => setIsAddRuleModalOpen(false)} title="Add Co-Purchase Recommendation Rule">
        <form onSubmit={handleAddRule} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#111826] uppercase tracking-wider mb-1">Trigger Product (Cart Line)</label>
            <select 
              value={newRule.trigger_product_id} 
              onChange={(e) => setNewRule({ ...newRule, trigger_product_id: e.target.value })}
              className="w-full p-2.5 text-sm border border-neutral-300 rounded-lg bg-white outline-none focus:border-[#724B66]"
              required
            >
              <option value="">Choose trigger product...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#111826] uppercase tracking-wider mb-1">Suggested Add-On / Pairing</label>
            <select 
              value={newRule.suggested_product_id} 
              onChange={(e) => setNewRule({ ...newRule, suggested_product_id: e.target.value })}
              className="w-full p-2.5 text-sm border border-neutral-300 rounded-lg bg-white outline-none focus:border-[#724B66]"
              required
            >
              <option value="">Choose recommended product...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#111826] uppercase tracking-wider mb-1">Priority Rank</label>
              <input 
                type="number" 
                min="1" 
                value={newRule.priority_rank} 
                onChange={(e) => setNewRule({ ...newRule, priority_rank: e.target.value })}
                className="w-full p-2.5 text-sm border border-neutral-300 rounded-lg outline-none focus:border-[#724B66]" 
                required 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111826] uppercase tracking-wider mb-1">Promo Discount (%)</label>
              <input 
                type="number" 
                min="0" 
                max="100" 
                value={newRule.promotional_discount_percent} 
                onChange={(e) => setNewRule({ ...newRule, promotional_discount_percent: e.target.value })}
                className="w-full p-2.5 text-sm border border-neutral-300 rounded-lg outline-none focus:border-[#724B66]" 
                required 
              />
            </div>
          </div>
          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={newRule.is_promoted}
                onChange={(e) => setNewRule({ ...newRule, is_promoted: e.target.checked })}
                className="rounded border-neutral-300 text-[#724B66] focus:ring-[#724B66]" 
              />
              <span className="text-sm text-[#111826] font-medium">Mark as Promoted (Boost priority in Quotation Builder)</span>
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
            <Button variant="ghost" onClick={() => setIsAddRuleModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Activate Pairing Rule</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Rule Confirmation Modal */}
      <Modal isOpen={!!ruleToDelete} onClose={() => setRuleToDelete(null)} title="Remove Co-Purchase Rule?">
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            Are you sure you want to remove this Upsell/Co-Purchase rule? This action cannot be undone, and the Quotation Builder will no longer suggest this pairing.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
            <Button variant="ghost" onClick={() => setRuleToDelete(null)}>Cancel</Button>
            <Button variant="primary" className="bg-rose-600 hover:bg-rose-700 text-white border-rose-600" onClick={handleDeleteRuleConfirmed}>
              Remove Rule
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
