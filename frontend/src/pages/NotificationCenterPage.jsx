import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Clock, FileText, MessageSquare, Package, CreditCard, AlertTriangle, Activity as ActivityIcon, Shield, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificationApi } from '../api/notificationApi.js';
import { Button } from '../components/ui/Button.jsx';

export const NotificationCenterPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all'); // all, unread, quotation, invoice, fulfillment, deal_health

  useEffect(() => {
    fetchNotifications();
  }, [activeFilter]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const params = { limit: 50 };
      if (activeFilter === 'unread') {
        params.unread_only = 'true';
      } else if (activeFilter !== 'all') {
        params.entity_type = activeFilter;
      }
      
      const data = await notificationApi.list(params);
      setNotifications(data.notifications || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
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
      try {
        await notificationApi.markRead(notif.id);
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      } catch (e) {}
    }
    const evt = notif.activity_event;
    if (evt) {
      const href = getEntityHref(evt.entity_type, evt.entity_id);
      if (href) navigate(href);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      fetchNotifications();
    } catch (e) {}
  };

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread' },
    { id: 'quotation', label: 'Quotations' },
    { id: 'invoice', label: 'Invoices' },
    { id: 'fulfillment_order', label: 'Fulfillment' },
    { id: 'deal_health', label: 'Deals' },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#724B66]/10 flex items-center justify-center">
            <Bell className="w-5 h-5 text-[#724B66]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#111826]">Notifications</h1>
            <p className="text-sm text-neutral-500 mt-1">View and manage your activity alerts</p>
          </div>
        </div>
        <Button variant="outline" onClick={handleMarkAllRead} className="flex items-center gap-2">
          <CheckCheck className="w-4 h-4" />
          Mark All Read
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${
              activeFilter === f.id
                ? 'bg-[#724B66] text-[#FFFFFF] shadow-sm'
                : 'bg-[#FFFFFF] text-neutral-600 hover:bg-neutral-50 border border-neutral-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-[#FFFFFF] rounded-xl border border-neutral-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-neutral-500">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[#111826]">No notifications found</h3>
            <p className="text-sm text-neutral-500 mt-1">You're all caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {notifications.map(notif => {
              const evt = notif.activity_event;
              const IconComponent = getNotifIcon(evt?.event_type);
              const colorClass = getNotifColor(evt?.event_type);
              
              return (
                <button
                  key={notif.id}
                  onClick={() => handleNotifClick(notif)}
                  className={`w-full text-left p-4 flex gap-4 transition cursor-pointer hover:bg-[#F3F2F2] ${!notif.is_read ? 'bg-[#724B66]/[0.02]' : ''}`}
                >
                  <div className="mt-3 w-2.5 h-2.5 shrink-0 flex items-center justify-center">
                    {!notif.is_read && <div className="w-2.5 h-2.5 rounded-full bg-[#724B66]" />}
                  </div>
                  
                  <div className={`w-10 h-10 rounded-xl ${colorClass} flex items-center justify-center shrink-0`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <p className={`text-sm ${!notif.is_read ? 'font-semibold text-[#111826]' : 'font-medium text-neutral-700'}`}>
                      {evt?.title || 'Notification'}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {evt?.severity === 'critical' && (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                          Critical
                        </span>
                      )}
                      {evt?.severity === 'warning' && (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                          Warning
                        </span>
                      )}
                      {evt?.event_type && (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-[#724B66] bg-[#724B66]/10 px-2 py-0.5 rounded-md">
                          {evt.event_type.split('.')[0].replace('_', ' ')}
                        </span>
                      )}
                      {evt?.entity_type && evt.entity_type !== evt.event_type.split('.')[0] && (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-sky-700 bg-sky-100 px-2 py-0.5 rounded-md">
                          {evt.entity_type.replace('_', ' ')}
                        </span>
                      )}
                      {evt?.actor?.full_name ? (
                        <span className="text-xs font-medium text-neutral-600 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-md">
                          {evt.actor.full_name}
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-neutral-500 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-md">
                          System Auto
                        </span>
                      )}
                      <span className="text-xs text-neutral-400 flex items-center gap-1 ml-1">
                        <Clock className="w-3 h-3" />
                        {timeAgo(notif.created_at || notif.createdAt)}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCenterPage;
