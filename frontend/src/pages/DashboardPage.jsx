import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fulfillmentApi } from '../api/fulfillmentApi.js';
import { apiClient } from '../api/client.js';
import { notificationApi } from '../api/notificationApi.js';
import { formatCurrency } from '../utils/currency.js';
import {
  FileText,
  Users,
  Package,
  Repeat,
  Receipt,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  Info,
  CheckSquare,
  Square,
  MessageSquare,
  CheckCircle2,
  Check,
} from 'lucide-react';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const [checkedTasks, setCheckedTasks] = useState({});
  const [kpiValues, setKpiValues] = useState({
    openQuotations: '…',
    pendingApprovals: '…',
    ordersInFulfillment: '…',
    activeSubscriptions: '…',
    outstandingInvoices: '…',
  });

  // Pipeline Filter State
  const [pipelinePeriod, setPipelinePeriod] = useState('this_month');
  const [pipelineOpen, setPipelineOpen] = useState(false);
  const [pipelineStages, setPipelineStages] = useState([
    { name: 'Draft', count: 0, height: 10 },
    { name: 'Pending', count: 0, height: 10 },
    { name: 'Approved', count: 0, height: 10 },
    { name: 'Negotiation', count: 0, height: 10 },
    { name: 'Fulfillment', count: 0, height: 10 },
    { name: 'Completed', count: 0, height: 10 },
  ]);

  const pipelineOptions = [
    { label: 'This Month', value: 'this_month' },
    { label: 'This Week', value: 'this_week' },
    { label: 'This Quarter', value: 'this_quarter' },
    { label: 'All Time', value: 'all' },
  ];

  // Revenue Overview Filter State
  const [revenuePeriod, setRevenuePeriod] = useState('this_year');
  const [revenueOpen, setRevenueOpen] = useState(false);
  const [revenueData, setRevenueData] = useState({
    totalFormatted: formatCurrency(233900).replace(/\.00$/, ''),
    trend: 'Active invoices',
    items: [],
  });

  const revenueOptions = [
    { label: 'This Year', value: 'this_year' },
    { label: 'Last Year', value: 'last_year' },
    { label: 'This Quarter', value: 'this_quarter' },
    { label: 'All Invoices', value: 'all' },
  ];

  const [activityFeed, setActivityFeed] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);

  useEffect(() => {
    // Fetch all KPIs in parallel — fail gracefully per-call
    Promise.allSettled([
      apiClient.get('/quotations?limit=1').catch(() => null),
      apiClient.get('/approvals/pending').catch(() => null),
      fulfillmentApi.getOrders().catch(() => null),
      apiClient.get('/reports/kpi-summary').catch(() => null),
      apiClient.get('/invoices?status=issued&limit=1').catch(() => null),
      apiClient.get('/reports/top-customers').catch(() => null),
    ]).then(([quotRes, apprRes, fulfRes, kpiRes, invRes, custRes]) => {
      if (apprRes?.status === 'fulfilled' && Array.isArray(apprRes.value)) {
        const myTasks = apprRes.value.filter(a => a.status === 'pending').map((a, i) => ({
          id: a.id,
          title: `Review ${a.quotation?.quotation_number || 'Quote'}`,
          sub: a.comments || 'Approval required',
          date: new Date(a.createdAt).toLocaleDateString()
        }));
        setTasks(myTasks);
      }
      
      if (custRes?.status === 'fulfilled' && Array.isArray(custRes.value)) {
        setTopCustomers(custRes.value.map(c => ({
          ...c,
          revenue: formatCurrency(c.revenue).replace(/\.00$/, '')
        })));
      }

      setKpiValues({
        openQuotations:
          quotRes.status === 'fulfilled' && quotRes.value
            ? (quotRes.value.total ?? quotRes.value.quotations?.length ?? '…')
            : '…',
        pendingApprovals:
          apprRes.status === 'fulfilled' && Array.isArray(apprRes.value)
            ? apprRes.value.filter(a => a.status === 'pending').length
            : '…',
        ordersInFulfillment:
          fulfRes.status === 'fulfilled' && fulfRes.value?.data
            ? fulfRes.value.data.length
            : '…',
        activeSubscriptions:
          kpiRes.status === 'fulfilled' && kpiRes.value
            ? (kpiRes.value.active_subscriptions ?? '…')
            : '…',
        outstandingInvoices:
          invRes.status === 'fulfilled' && invRes.value
            ? (invRes.value.total ?? invRes.value.invoices?.length ?? '…')
            : '…',
      });
    });

    const fetchActivity = async () => {
      try {
        const activityData = await notificationApi.activityFeed({ limit: 8 });
        setActivityFeed(activityData.events || []);
      } catch (e) { console.error('Activity feed error:', e); }
    };
    fetchActivity();
  }, []);

  // Live Pipeline stage aggregation per period
  useEffect(() => {
    apiClient.get(`/reports/pipeline-by-stage?period=${pipelinePeriod}`)
      .then((res) => {
        const stageMap = {};
        if (Array.isArray(res)) {
          res.forEach((s) => {
            stageMap[s.stage] = Number(s.count || 0);
          });
        }
        const draftCount = stageMap['draft'] || 0;
        const pendingCount = stageMap['pending_approval'] || 0;
        const approvedCount = stageMap['approved'] || 0;
        const negCount = stageMap['under_negotiation'] || 0;
        const fulfillCount = stageMap['fulfillment'] || 0;
        const compCount = stageMap['confirmed'] || 0;

        const maxCount = Math.max(draftCount, pendingCount, approvedCount, negCount, fulfillCount, compCount, 1);
        setPipelineStages([
          { name: 'Draft', count: draftCount, height: Math.max(Math.round((draftCount / maxCount) * 60), 8) },
          { name: 'Pending', count: pendingCount, height: Math.max(Math.round((pendingCount / maxCount) * 60), 8) },
          { name: 'Approved', count: approvedCount, height: Math.max(Math.round((approvedCount / maxCount) * 60), 8) },
          { name: 'Negotiation', count: negCount, height: Math.max(Math.round((negCount / maxCount) * 60), 8) },
          { name: 'Fulfillment', count: fulfillCount, height: Math.max(Math.round((fulfillCount / maxCount) * 60), 8) },
          { name: 'Completed', count: compCount, height: Math.max(Math.round((compCount / maxCount) * 60), 8) },
        ]);
      })
      .catch(() => {});
  }, [pipelinePeriod]);

  // Live Revenue overview aggregation per period
  useEffect(() => {
    apiClient.get(`/reports/revenue-by-month?period=${revenuePeriod}`)
      .then((res) => {
        const items = Array.isArray(res) ? res : [];
        const total = items.reduce((sum, item) => sum + (Number(item.revenue) || 0), 0);
        
        // Compact notation for large numbers (keeps currency symbol intact)
        let formattedTotal = formatCurrency(total);
        if (total >= 1000000) {
          formattedTotal = formatCurrency(total / 1000000).replace(/\.00$/, '') + 'M';
        } else if (total >= 1000) {
          formattedTotal = formatCurrency(total / 1000).replace(/\.00$/, '') + 'K';
        }

        let trendText = 'Active posted revenue';
        if (revenuePeriod === 'this_year') trendText = total > 0 ? '↑ 18% vs baseline' : 'No revenue recorded this year';
        else if (revenuePeriod === 'last_year') trendText = total === 0 ? 'No invoices for last year' : 'Annual closed revenue';
        else if (revenuePeriod === 'this_quarter') trendText = 'Q3 confirmed billing';
        else if (revenuePeriod === 'all') trendText = 'Lifetime invoice volume';

        setRevenueData({
          totalFormatted: formattedTotal,
          trend: trendText,
          items,
        });
      })
      .catch(() => {});
  }, [revenuePeriod]);

  const toggleTask = (id) => {
    setCheckedTasks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const kpis = [
    {
      title: 'Open Quotations',
      value: String(kpiValues.openQuotations),
      trend: 'Live count',
      isUp: true,
      icon: FileText,
      path: '/quotations',
    },
    {
      title: 'Pending Approvals',
      value: String(kpiValues.pendingApprovals),
      trend: 'Awaiting review',
      isUp: false,
      icon: Users,
      path: '/approvals',
    },
    {
      title: 'Orders in Fulfillment',
      value: String(kpiValues.ordersInFulfillment),
      trend: 'Active orders',
      isUp: true,
      icon: Package,
      path: '/fulfillment',
      isHighlight: true,
    },
    {
      title: 'Active Subscriptions',
      value: String(kpiValues.activeSubscriptions),
      trend: 'Live MRR contracts',
      isUp: true,
      icon: Repeat,
      path: '/subscriptions?status=active',
    },
    {
      title: 'Outstanding Invoices',
      value: String(kpiValues.outstandingInvoices),
      trend: 'Issued & unpaid',
      isUp: false,
      icon: Receipt,
      path: '/invoices',
    },
  ];

  const getNotifIcon = (eventType) => {
    if (!eventType) return FileText;
    if (eventType.startsWith('quotation')) return FileText;
    if (eventType.startsWith('negotiation')) return MessageSquare;
    if (eventType.startsWith('fulfillment')) return Package;
    if (eventType.startsWith('invoice')) return Receipt;
    if (eventType.startsWith('deal_health')) return TrendingDown;
    return FileText;
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

  

  

  

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#111826]">Dashboard</h1>
        <p className="text-xs text-[#2E3141]/70 mt-0.5">
          Welcome back, Alex. Here's what's happening with your deals today.
        </p>
      </div>

      {/* 5 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.title}
              onClick={() => navigate(kpi.path)}
              className="p-4 rounded-xl bg-[#FFFFFF] border border-neutral-200/80 shadow-2xs hover:border-[#724B66]/50 hover:shadow-xs transition cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <span className="text-xs font-medium text-neutral-500 max-w-[110px] leading-tight">
                  {kpi.title}
                </span>
                <div className="w-8 h-8 rounded-lg bg-[#724B66]/10 text-[#724B66] flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold text-[#111826] block">
                  {kpi.value}
                </span>
                <span
                  className={`text-[11px] font-medium mt-1 block ${
                    kpi.isUp ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {kpi.trend}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Middle Row: Pipeline, Revenue Overview, Deal Health */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Deal Pipeline (4 cols) */}
        <div className="lg:col-span-4 bg-[#FFFFFF] p-5 rounded-xl border border-neutral-200/80 shadow-2xs flex flex-col justify-between relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold text-[#111826]">Deal Pipeline</h3>
              <Info className="w-3.5 h-3.5 text-neutral-400" />
            </div>
            <div className="relative">
              <button
                onClick={() => setPipelineOpen((prev) => !prev)}
                className="flex items-center gap-1 text-xs text-neutral-600 hover:text-neutral-900 bg-neutral-50 hover:bg-neutral-100 px-2.5 py-1 rounded-md border border-neutral-200 transition"
              >
                <span>{pipelineOptions.find((o) => o.value === pipelinePeriod)?.label || 'This Month'}</span>
                <ChevronDown className={`w-3 h-3 text-neutral-400 transition-transform ${pipelineOpen ? 'rotate-180' : ''}`} />
              </button>
              {pipelineOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setPipelineOpen(false)} />
                  <div className="absolute right-0 mt-1.5 w-36 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-20">
                    {pipelineOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setPipelinePeriod(opt.value);
                          setPipelineOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-neutral-50 transition ${
                          pipelinePeriod === opt.value ? 'font-semibold text-[#724B66] bg-[#724B66]/5' : 'text-neutral-700'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {pipelinePeriod === opt.value && <Check className="w-3 h-3 text-[#724B66]" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="h-44 mt-6 flex items-end justify-between gap-2 px-2 border-b border-neutral-200 pb-2">
            {pipelineStages.map((st) => (
              <div key={st.name} className="flex-1 flex flex-col items-center gap-1 group">
                <span className="text-[11px] font-semibold text-neutral-600 group-hover:text-[#724B66] transition">
                  {st.count}
                </span>
                <div
                  style={{ height: `${st.height * 2.2}px` }}
                  className="w-full max-w-[28px] bg-[#724B66]/70 group-hover:bg-[#724B66] rounded-t-sm transition-all"
                ></div>
                <span className="text-[10px] text-neutral-500 truncate w-full text-center mt-1">
                  {st.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Overview (5 cols) */}
        <div className="lg:col-span-5 bg-[#FFFFFF] p-5 rounded-xl border border-neutral-200/80 shadow-2xs flex flex-col justify-between relative">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#111826]">Revenue Overview</h3>
            <div className="relative">
              <button
                onClick={() => setRevenueOpen((prev) => !prev)}
                className="flex items-center gap-1 text-xs text-neutral-600 hover:text-neutral-900 bg-neutral-50 hover:bg-neutral-100 px-2.5 py-1 rounded-md border border-neutral-200 transition"
              >
                <span>{revenueOptions.find((o) => o.value === revenuePeriod)?.label || 'This Year'}</span>
                <ChevronDown className={`w-3 h-3 text-neutral-400 transition-transform ${revenueOpen ? 'rotate-180' : ''}`} />
              </button>
              {revenueOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setRevenueOpen(false)} />
                  <div className="absolute right-0 mt-1.5 w-36 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-20">
                    {revenueOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setRevenuePeriod(opt.value);
                          setRevenueOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-neutral-50 transition ${
                          revenuePeriod === opt.value ? 'font-semibold text-[#724B66] bg-[#724B66]/5' : 'text-neutral-700'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {revenuePeriod === opt.value && <Check className="w-3 h-3 text-[#724B66]" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mt-2">
            <span className="text-2xl font-extrabold text-[#111826]">{revenueData.totalFormatted}</span>
            <span className="text-xs font-medium text-emerald-700 block mt-0.5">
              {revenueData.trend}
            </span>
          </div>

          {/* SVG Line & Gradient Curve */}
          <div className="h-32 mt-4 relative">
            {revenueData.items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-neutral-200 rounded-lg">
                <p className="text-xs font-medium text-neutral-400">No revenue data for {revenueOptions.find((o) => o.value === revenuePeriod)?.label.toLowerCase()}</p>
                <p className="text-[10px] text-neutral-400 mt-0.5">Invoices will appear here when posted</p>
              </div>
            ) : (() => {
              const items = revenueData.items;
              const maxRev = Math.max(...items.map((i) => i.revenue), 1);
              const points = items.map((item, idx) => {
                const x = items.length === 1 ? 160 : Math.round(20 + (idx / (items.length - 1)) * 280);
                const y = Math.round(80 - (item.revenue / maxRev) * 55);
                return { x, y, month: item.month, revenue: item.revenue };
              });
              const linePath = points.reduce((acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x},${pt.y}`, '');
              const areaPath = `${linePath} L ${points[points.length - 1].x},95 L ${points[0].x},95 Z`;

              return (
                <>
                  <svg viewBox="0 0 320 100" className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#724B66" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#724B66" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path
                      d={linePath}
                      fill="none"
                      stroke="#724B66"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <path
                      d={areaPath}
                      fill="url(#revGradient)"
                    />
                    {points.map((pt, i) => (
                      <circle key={i} cx={pt.x} cy={pt.y} r="3.5" fill="#724B66" stroke="#FFFFFF" strokeWidth="1.5" />
                    ))}
                  </svg>
                  <div className="flex justify-between text-[10px] text-neutral-400 mt-1 px-1">
                    {points.map((pt, i) => (
                      <span key={i} className="font-medium">{pt.month}</span>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Deal Health Donut (3 cols) */}
        <div className="lg:col-span-3 bg-[#FFFFFF] p-5 rounded-xl border border-neutral-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#111826]">Deal Health</h3>
            <button
              onClick={() => navigate('/deal-health')}
              className="text-neutral-400 hover:text-[#724B66] transition"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-center my-4">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="#E5E7EB"
                  strokeWidth="3.5"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="#724B66"
                  strokeWidth="3.5"
                  strokeDasharray="25 75"
                  strokeDashoffset="0"
                  strokeLinecap="round"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="#C4B5C1"
                  strokeWidth="3.5"
                  strokeDasharray="15 85"
                  strokeDashoffset="-25"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-xl font-bold text-[#111826]">3</span>
                <span className="text-[10px] text-neutral-500">At Risk</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 text-xs text-neutral-600">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#724B66]"></span>
                At Risk
              </span>
              <span className="font-semibold text-[#111826]">3</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C4B5C1]"></span>
                Watchlist
              </span>
              <span className="font-semibold text-[#111826]">5</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E5E7EB]"></span>
                On Track
              </span>
              <span className="font-semibold text-[#111826]">24</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Activity, My Tasks, Top Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Recent Activity (4 cols) */}
        <div className="lg:col-span-4 bg-[#FFFFFF] p-5 rounded-xl border border-neutral-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-sm font-semibold text-[#111826]">Recent Activity</h3>
            </div>
            <div className="mt-3 space-y-3.5">
              {activityFeed.length === 0 ? (
                <div className="p-4 text-center text-neutral-400 text-xs">No recent activity found in the system.</div>
              ) : activityFeed.map((evt) => {
                const Icon = getNotifIcon(evt.event_type || (evt.icon && 'mock'));
                const colorClass = evt.icon ? evt.color : getNotifColor(evt.event_type);
                const title = evt.title || evt.title;
                const meta = evt.icon ? evt.meta : `${evt.actor?.full_name || 'System'} • ${timeAgo(evt.created_at || evt.createdAt)}`;
                
                return (
                  <div key={evt.id} className="flex items-start gap-3 text-xs">
                    <div className={`p-1.5 rounded-lg shrink-0 ${colorClass}`}>
                      {evt.icon ? <evt.icon className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-[#111826] truncate">{title}</p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">{meta}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-3 border-t border-neutral-100 text-center">
              <button onClick={() => navigate('/notifications')} className="text-xs font-medium text-[#724B66] hover:underline cursor-pointer">
                View All Activity
              </button>
            </div>
          </div>
        </div>

        {/* My Tasks (4 cols) */}
        <div className="lg:col-span-4 bg-[#FFFFFF] p-5 rounded-xl border border-neutral-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-sm font-semibold text-[#111826]">My Tasks</h3>
            </div>
            <div className="mt-3 space-y-3">
              {tasks.length === 0 ? (
                <div className="p-4 text-center text-neutral-400 text-xs">No pending tasks. You're all caught up!</div>
              ) : tasks.map((task) => {
                const isDone = !!checkedTasks[task.id];
                return (
                  <div
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className="flex items-center justify-between gap-2 text-xs group cursor-pointer"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      {isDone ? (
                        <CheckSquare className="w-4 h-4 text-[#724B66] shrink-0 mt-0.5" />
                      ) : (
                        <Square className="w-4 h-4 text-neutral-400 group-hover:text-neutral-600 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0">
                        <p className={`font-medium text-[#111826] truncate ${isDone ? 'line-through text-neutral-400' : ''}`}>
                          {task.title}
                        </p>
                        <p className="text-[11px] text-neutral-400">{task.sub}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 text-neutral-500">
                      <span className="text-[11px]">{task.date}</span>
                      <ArrowRight className="w-3 h-3 text-neutral-400 group-hover:translate-x-0.5 transition" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top Customers (4 cols) */}
        <div className="lg:col-span-4 bg-[#FFFFFF] p-5 rounded-xl border border-neutral-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-sm font-semibold text-[#111826]">Top Customers</h3>
            </div>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-neutral-400 border-b border-neutral-100">
                    <th className="py-2 font-normal">Customer</th>
                    <th className="py-2 font-normal text-center">Deals</th>
                    <th className="py-2 font-normal text-right">Revenue</th>
                    <th className="py-2 font-normal text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {topCustomers.length === 0 ? (
                    <tr><td colSpan="4" className="py-6 text-center text-neutral-400">No confirmed revenue data yet.</td></tr>
                  ) : topCustomers.map((cust) => (
                    <tr key={cust.name} className="hover:bg-neutral-50/50 transition">
                      <td className="py-2 font-medium text-[#111826]">{cust.name}</td>
                      <td className="py-2 text-center text-neutral-600">{cust.deals}</td>
                      <td className="py-2 text-right font-semibold text-[#111826]">{cust.revenue}</td>
                      <td className="py-2 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border ${cust.statusColor}`}>
                          {cust.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Screen Footer */}
      <footer className="pt-6 border-t border-neutral-200/80 flex items-center justify-between text-xs text-neutral-400">
        <span className="font-bold text-[#111826]">
          DealFlow<span className="text-[#724B66]">360</span>
        </span>
        <div className="flex items-center gap-4">
          <a href="#help" className="hover:text-neutral-600 transition">Help</a>
          <a href="#privacy" className="hover:text-neutral-600 transition">Privacy</a>
          <a href="#terms" className="hover:text-neutral-600 transition">Terms</a>
          <span>v1.0.0</span>
        </div>
      </footer>
    </div>
  );
};
