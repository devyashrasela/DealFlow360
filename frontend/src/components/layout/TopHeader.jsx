import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, RefreshCw, LogOut, ChevronDown, User, Shield, Building, Loader2, X, CheckCheck, Clock, FileText, MessageSquare, Package, CreditCard, AlertTriangle, Activity as ActivityIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { GLOBAL_CURRENCY, setGlobalCurrency, SUPPORTED_CURRENCIES, CURRENCY_SYMBOLS } from '../../utils/currency.js';
import { useNavigate, useLocation } from 'react-router-dom';
import { searchApi } from '../../api/searchApi.js';
import { notificationApi } from '../../api/notificationApi.js';

// Debounce hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

export const TopHeader = ({ onRefresh, isRefreshing = false }) => {
  const { user, activeRole, activeOrg, memberships, switchWorkspace, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isOnNotificationsPage = location.pathname === '/notifications';
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Notification State
  const [notifOpen, setNotifOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [currency, setLocalCurrency] = useState(GLOBAL_CURRENCY);

  useEffect(() => {
    const handleCurr = () => setLocalCurrency(GLOBAL_CURRENCY);
    window.addEventListener('currency_changed', handleCurr);
    return () => window.removeEventListener('currency_changed', handleCurr);
  }, []);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchFocused(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Poll for unread count
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const data = await notificationApi.unreadCount();
        setUnreadCount(data.count);
      } catch (e) { /* silent */ }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  const openNotifications = async () => {
    setNotifOpen(prev => !prev);
    if (!notifOpen) {
      try {
        const data = await notificationApi.list({ limit: 10 });
        setNotifications(data.notifications);
      } catch (e) { console.error(e); }
    }
  };

  const getNotifIcon = (eventType) => {
    if (!eventType) return FileText;
    if (eventType.startsWith('quotation')) return FileText;
    if (eventType.startsWith('negotiation')) return MessageSquare;
    if (eventType.startsWith('fulfillment')) return Package;
    if (eventType.startsWith('invoice')) return CreditCard;
    if (eventType.startsWith('deal_health')) return AlertTriangle;
    if (eventType.startsWith('subscription')) return RefreshCw;
    if (eventType.startsWith('role')) return Shield;
    return ActivityIcon;
  };
  
  const getNotifColor = (eventType) => {
    if (!eventType) return 'text-[#724B66] bg-[#724B66]/10';
    if (eventType.startsWith('negotiation')) return 'text-amber-600 bg-amber-50';
    if (eventType.startsWith('fulfillment')) return 'text-sky-600 bg-sky-50';
    if (eventType === 'invoice.paid') return 'text-emerald-600 bg-emerald-50';
    if (eventType === 'invoice.overdue') return 'text-rose-600 bg-rose-50';
    if (eventType.startsWith('invoice')) return 'text-sky-600 bg-sky-50';
    if (eventType.includes('critical')) return 'text-rose-600 bg-rose-50';
    if (eventType.startsWith('deal_health')) return 'text-amber-600 bg-amber-50';
    return 'text-[#724B66] bg-[#724B66]/10';
  };

  const timeAgo = (dateStr) => {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getEntityHref = (entityType, entityId) => {
    switch(entityType) {
      case 'quotation': return `/quotations/${entityId}`;
      case 'invoice': return `/invoices/${entityId}`;
      case 'fulfillment_order': return `/fulfillment/orders/${entityId}`;
      case 'subscription': return `/subscriptions/${entityId}`;
      default: return null;
    }
  };

  const handleNotifClick = async (notif) => {
    if (!notif.is_read) {
      await notificationApi.markRead(notif.id).catch(() => {});
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    }
    const evt = notif.activity_event;
    if (evt) {
      const href = getEntityHref(evt.entity_type, evt.entity_id);
      if (href) navigate(href);
    }
    setNotifOpen(false);
  };

  const handleMarkAllRead = async () => {
    await notificationApi.markAllRead().catch(() => {});
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  // Perform search
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedSearchQuery || debouncedSearchQuery.length < 2) {
        setSearchResults(null);
        return;
      }
      setIsSearching(true);
      try {
        const data = await searchApi.globalSearch(debouncedSearchQuery);
        setSearchResults(data);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults(null);
      } finally {
        setIsSearching(false);
      }
    };
    performSearch();
  }, [debouncedSearchQuery]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const formatRole = (role) => {
    if (!role) return 'Member';
    return role
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const renderResultSection = (title, items) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="py-2 border-b border-neutral-100 last:border-b-0">
        <h4 className="px-3 pb-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
          {title}
        </h4>
        <div className="flex flex-col">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                navigate(item.href);
                setIsSearchFocused(false);
                setSearchQuery('');
              }}
              className="text-left px-3 py-2 hover:bg-[#F3F2F2] transition flex flex-col gap-0.5 cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-[#111826] truncate">{item.title}</span>
                {item.amount && (
                  <span className="text-xs font-semibold text-[#111826] whitespace-nowrap">{item.amount}</span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-neutral-500 truncate">{item.subtitle}</span>
                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-[#724B66]/10 text-[#724B66] rounded uppercase font-medium whitespace-nowrap">
                    {item.badge}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <header className="h-16 bg-[#FFFFFF] border-b border-neutral-200/80 px-8 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      {/* Global Search Bar */}
      <div className="relative w-96 max-w-xl" ref={searchRef}>
        <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          placeholder="Search quotations, customers, orders..."
          className="w-full pl-10 pr-10 py-2 text-sm bg-[#F3F2F2] border border-transparent rounded-lg text-[#111826] placeholder-neutral-400 focus:outline-none focus:bg-[#FFFFFF] focus:border-[#724B66]/50 focus:ring-2 focus:ring-[#724B66]/10 transition"
        />
        
        {searchQuery && (
          <button 
            onClick={() => {
              setSearchQuery('');
              setSearchResults(null);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-neutral-400 hover:text-neutral-600 rounded-full hover:bg-neutral-200 transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Search Results Dropdown */}
        {isSearchFocused && searchQuery.length >= 2 && (
          <div className="absolute top-full left-0 mt-2 w-[500px] max-h-[80vh] overflow-y-auto bg-[#FFFFFF] rounded-xl shadow-xl border border-neutral-200/90 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
            {isSearching && !searchResults ? (
              <div className="p-8 flex flex-col items-center justify-center text-neutral-500">
                <Loader2 className="w-6 h-6 animate-spin text-[#724B66] mb-2" />
                <span className="text-sm">Searching...</span>
              </div>
            ) : searchResults?.totalCount === 0 ? (
              <div className="p-8 text-center text-neutral-500">
                <p className="text-sm">No results found for "{searchResults.query}"</p>
                <p className="text-xs mt-1 text-neutral-400">Try searching for a different term.</p>
              </div>
            ) : searchResults ? (
              <div className="py-1">
                {renderResultSection('Quotations', searchResults.results.quotations)}
                {renderResultSection('Customers', searchResults.results.customers)}
                {renderResultSection('Orders', searchResults.results.orders)}
                {renderResultSection('Products', searchResults.results.products)}
                {renderResultSection('Invoices', searchResults.results.invoices)}
                {renderResultSection('Subscriptions', searchResults.results.subscriptions)}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Global Reload Trigger */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            title="Reload Data"
            className="p-2 rounded-lg text-[#2E3141] hover:bg-[#F3F2F2] hover:text-[#724B66] transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#724B66]' : ''}`} />
          </button>
        )}

        {/* Currency Selector */}
        <div className="relative">
          <button 
            onClick={() => setCurrencyOpen(!currencyOpen)}
            className="flex items-center gap-1 p-2 rounded-lg text-[#2E3141] hover:bg-[#F3F2F2] transition cursor-pointer text-xs font-semibold"
          >
            {CURRENCY_SYMBOLS[currency]} {currency}
            <ChevronDown className="w-3 h-3 text-neutral-400" />
          </button>
          
          {currencyOpen && (
            <div className="absolute right-0 mt-2 w-32 bg-[#FFFFFF] rounded-xl shadow-xl border border-neutral-200/90 z-50 overflow-hidden py-1">
              {SUPPORTED_CURRENCIES.map(c => (
                <button
                  key={c}
                  onClick={() => {
                    setGlobalCurrency(c);
                    setCurrencyOpen(false);
                    // trigger a react re-render hack by reloading for hackathon
                    window.location.reload(); 
                  }}
                  className={`w-full text-left px-4 py-2 text-xs hover:bg-[#F3F2F2] flex items-center justify-between ${c === currency ? 'text-[#724B66] font-bold bg-[#724B66]/5' : 'text-[#2E3141]'}`}
                >
                  <span>{c}</span>
                  <span className="text-neutral-400 font-normal">{CURRENCY_SYMBOLS[c]}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button onClick={openNotifications} className="relative p-2 rounded-lg text-[#2E3141] hover:bg-[#F3F2F2] transition cursor-pointer">
            <Bell className="w-4 h-4" />
            {!isOnNotificationsPage && unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-[#724B66] text-[#FFFFFF] text-[10px] font-bold flex items-center justify-center ring-2 ring-[#FFFFFF] px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-96 bg-[#FFFFFF] rounded-xl shadow-xl border border-neutral-200/90 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
              {/* Header */}
              <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#111826]">Notifications</h3>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} className="text-xs text-[#724B66] hover:underline cursor-pointer flex items-center gap-1">
                    <CheckCheck className="w-3 h-3" />
                    Mark all read
                  </button>
                )}
              </div>

              {/* Notification list */}
              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                    <p className="text-sm text-neutral-500">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map(notif => {
                    const evt = notif.activity_event;
                    const IconComponent = getNotifIcon(evt?.event_type);
                    const colorClass = getNotifColor(evt?.event_type);
                    return (
                      <button
                        key={notif.id}
                        onClick={() => handleNotifClick(notif)}
                        className={`w-full text-left px-4 py-3 flex gap-3 transition cursor-pointer ${!notif.is_read ? 'bg-[#724B66]/[0.03]' : ''} hover:bg-[#F3F2F2]`}
                      >
                        {!notif.is_read && <span className="w-2 h-2 rounded-full bg-[#724B66] shrink-0 mt-2" />}
                        {notif.is_read && <span className="w-2 h-2 shrink-0 mt-2" />}
                        <div className={`w-8 h-8 rounded-lg ${colorClass} flex items-center justify-center shrink-0`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate ${!notif.is_read ? 'font-medium text-[#111826]' : 'text-neutral-600'}`}>
                            {evt?.title || 'Notification'}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {evt?.actor?.full_name && <span className="text-xs text-neutral-400 truncate">{evt.actor.full_name}</span>}
                            <span className="text-xs text-neutral-400 flex items-center gap-0.5"><Clock className="w-3 h-3" />{timeAgo(notif.created_at || notif.createdAt)}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-neutral-100 text-center">
                <button onClick={() => { navigate('/notifications'); setNotifOpen(false); }} className="text-xs font-medium text-[#724B66] hover:underline cursor-pointer">
                  View All Notifications
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-neutral-200"></div>

        {/* User Badge with Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-[#F3F2F2] transition cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-[#724B66] text-[#FFFFFF] flex items-center justify-center text-xs font-bold ring-2 ring-[#724B66]/20">
              {getInitials(user?.full_name)}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-semibold text-[#111826] leading-tight">
                {user?.full_name || 'User'}
              </p>
              <p className="text-[11px] text-[#2E3141]/60 leading-tight">
                {formatRole(activeRole)}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 ml-0.5" />
          </button>

          {/* User Menu Dropdown */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-[#FFFFFF] rounded-xl shadow-lg border border-neutral-200/90 py-2 z-50 text-sm animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-4 py-2.5 border-b border-neutral-100">
                <p className="text-xs font-semibold text-[#111826]">{user?.full_name}</p>
                <p className="text-[11px] text-[#2E3141]/60 truncate">{user?.email}</p>
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#724B66] font-medium bg-[#724B66]/10 px-2 py-0.5 rounded-md w-fit">
                  <Shield className="w-3 h-3" />
                  <span>{formatRole(activeRole)}</span>
                </div>
              </div>

              {activeOrg && (
                <div className="px-4 py-2 border-b border-neutral-100 bg-neutral-50/50">
                  <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider block">Organization</span>
                  <p className="text-xs font-medium text-[#111826] truncate mt-0.5">
                    {activeOrg.trading_name || activeOrg.legal_name || 'Organization'}
                  </p>
                </div>
              )}

              {/* Workspace switcher if user belongs to multiple orgs */}
              {memberships.length > 1 && (
                <div className="px-2 py-1.5 border-b border-neutral-100">
                  <p className="px-2 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Switch Org</p>
                  {memberships.map((m) => (
                    <button
                      key={m.organization_id}
                      onClick={() => {
                        switchWorkspace(m.organization_id);
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-2 py-1 text-xs rounded hover:bg-neutral-100 flex items-center justify-between"
                    >
                      <span className="truncate">{m.organization?.trading_name || m.organization?.legal_name}</span>
                      <span className="text-[10px] text-neutral-400 font-mono">{m.role}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="pt-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
