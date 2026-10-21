/**
 * Analytics Page
 * Comprehensive business analytics with daily performance, top products per day,
 * order status, hourly patterns, geographic distribution, profit margins, and more.
 */
import { useEffect, useState } from 'react';
import { analyticsApi } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area,
  ComposedChart, Treemap,
} from 'recharts';
import {
  Calendar, TrendingUp, DollarSign, Clock, MapPin, Package,
  ChevronDown, ChevronUp, Percent, ShoppingCart, BarChart3,
} from 'lucide-react';
import toast from 'react-hot-toast';

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#e11d48', '#059669', '#7c3aed', '#ea580c'];

const STATUS_COLORS = {
  'pending': '#f59e0b',
  'confirmed': '#3b82f6',
  'Expédiée': '#8b5cf6',
  'En préparation': '#6366f1',
  'Livrée': '#22c55e',
  'delivered': '#22c55e',
  'Retourné': '#ef4444',
  'returned': '#ef4444',
  'Tentative échouée': '#f97316',
  'Echec livraison': '#dc2626',
  'Vers Wilaya': '#0ea5e9',
  'Centre': '#06b6d4',
  'Reçu à Wilaya': '#14b8a6',
  'En attente du client': '#a855f7',
  'Sorti en livraison': '#8b5cf6',
  'En alerte': '#f43f5e',
};

const STATUS_LABELS = {
  'pending': 'قيد الانتظار',
  'confirmed': 'مؤكد',
  'Expédiée': 'تم الشحن',
  'En préparation': 'قيد التحضير',
  'Livrée': 'تم التوصيل',
  'delivered': 'تم التوصيل',
  'Retourné': 'مرتجع',
  'returned': 'مرتجع',
  'Tentative échouée': 'محاولة فاشلة',
  'Echec livraison': 'فشل التوصيل',
  'Vers Wilaya': 'نحو الولاية',
  'Centre': 'في المركز',
  'Reçu à Wilaya': 'وصل للولاية',
  'En attente du client': 'بانتظار العميل',
  'Sorti en livraison': 'خرج للتوصيل',
  'En alerte': 'تنبيه',
};

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [fromDate, setFromDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));

  // Existing data
  const [revenueData, setRevenueData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [categoryData, setCategoryData] = useState([]);

  // New data
  const [dailyPerformance, setDailyPerformance] = useState([]);
  const [dailyTopProducts, setDailyTopProducts] = useState({});
  const [orderStatus, setOrderStatus] = useState([]);
  const [hourlyData, setHourlyData] = useState([]);
  const [wilayaData, setWilayaData] = useState([]);
  const [profitMargins, setProfitMargins] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, [fromDate, toDate]);

  async function loadAnalytics() {
    try {
      setLoading(true);
      const params = { from: fromDate, to: toDate };
      const [revRes, topRes, catRes, perfRes, dailyTopRes, statusRes, hourlyRes, wilayaRes, marginsRes] =
        await Promise.all([
          analyticsApi.getRevenue(params),
          analyticsApi.getTopProducts(params),
          analyticsApi.getCategories(params),
          analyticsApi.getDailyPerformance(params).catch(() => ({ data: [] })),
          analyticsApi.getDailyTopProducts(params).catch(() => ({ data: {} })),
          analyticsApi.getOrderStatus(params).catch(() => ({ data: [] })),
          analyticsApi.getHourly(params).catch(() => ({ data: [] })),
          analyticsApi.getWilayas(params).catch(() => ({ data: [] })),
          analyticsApi.getProfitMargins(params).catch(() => ({ data: [] })),
        ]);
      setRevenueData(revRes.data);
      setTopProducts(topRes.data);
      setCategoryData(catRes.data);
      setDailyPerformance(perfRes.data || []);
      setDailyTopProducts(dailyTopRes.data || {});
      setOrderStatus(statusRes.data || []);
      setHourlyData(hourlyRes.data || []);
      setWilayaData(wilayaRes.data || []);
      setProfitMargins(marginsRes.data || []);

      // Auto-select last day in daily top products
      const days = Object.keys(dailyTopRes.data || {});
      if (days.length > 0) setSelectedDay(days[days.length - 1]);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 2 }).format(val || 0);

  // Calculate period totals
  const periodRevenue = revenueData.reduce((sum, d) => sum + d.revenue, 0);
  const periodProfit = revenueData.reduce((sum, d) => sum + d.profit, 0);
  const periodOrders = revenueData.reduce((sum, d) => sum + d.order_count, 0);
  const periodAvgOrder = periodOrders > 0 ? periodRevenue / periodOrders : 0;
  const profitMarginPct = periodRevenue > 0 ? ((periodProfit / periodRevenue) * 100).toFixed(1) : '0';

  // Fill hourly data with all 24 hours
  const fullHourlyData = Array.from({ length: 24 }, (_, i) => {
    const found = hourlyData.find((h) => h.hour === i);
    return { hour: `${i}:00`, order_count: found?.order_count || 0, revenue: found?.revenue || 0 };
  });

  const tabs = [
    { id: 'overview', label: 'نظرة عامة', icon: BarChart3 },
    { id: 'daily', label: 'الأداء اليومي', icon: Calendar },
    { id: 'products', label: 'المنتجات', icon: Package },
    { id: 'geography', label: 'التوزيع الجغرافي', icon: MapPin },
    { id: 'operations', label: 'العمليات', icon: ShoppingCart },
  ];

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">التحليلات المتقدمة</h1>
          <p className="text-gray-500 text-sm mt-1">تقارير شاملة لأداء متجرك</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-gray-400" />
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <span className="text-gray-400">—</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>

      {/* Quick presets */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { label: 'اليوم', days: 0 },
          { label: 'آخر 7 أيام', days: 7 },
          { label: 'آخر 30 يوم', days: 30 },
          { label: 'آخر 90 يوم', days: 90 },
        ].map((p) => (
          <button
            key={p.days}
            onClick={() => {
              const to = new Date().toISOString().slice(0, 10);
              const from = new Date(Date.now() - p.days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
              setFromDate(from);
              setToDate(to);
            }}
            className="px-3 py-1.5 text-xs rounded-full border border-gray-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Period Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-blue-50 rounded-lg"><DollarSign size={16} className="text-blue-600" /></div>
            <p className="text-xs text-gray-500">إجمالي الإيرادات</p>
          </div>
          <p className="text-lg font-bold">{formatCurrency(periodRevenue)} da</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-green-50 rounded-lg"><TrendingUp size={16} className="text-green-600" /></div>
            <p className="text-xs text-gray-500">إجمالي الأرباح</p>
          </div>
          <p className="text-lg font-bold text-green-600">{formatCurrency(periodProfit)} da</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-purple-50 rounded-lg"><ShoppingCart size={16} className="text-purple-600" /></div>
            <p className="text-xs text-gray-500">عدد الطلبات</p>
          </div>
          <p className="text-lg font-bold">{periodOrders}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-amber-50 rounded-lg"><DollarSign size={16} className="text-amber-600" /></div>
            <p className="text-xs text-gray-500">متوسط الطلب</p>
          </div>
          <p className="text-lg font-bold">{formatCurrency(periodAvgOrder)} da</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-emerald-50 rounded-lg"><Percent size={16} className="text-emerald-600" /></div>
            <p className="text-xs text-gray-500">هامش الربح</p>
          </div>
          <p className="text-lg font-bold">{profitMarginPct}%</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB: Overview */}
      {activeTab === 'overview' && (
        <>
          {/* Revenue by Day Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
            <h2 className="font-semibold text-gray-800 mb-4">الإيرادات والأرباح اليومية</h2>
            {revenueData.length === 0 ? (
              <p className="text-center text-gray-400 py-8">لا توجد بيانات في هذه الفترة</p>
            ) : (
              <div style={{ direction: 'ltr' }}>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={revenueData}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <Tooltip
                      formatter={(value, name) => [
                        `${formatCurrency(value)} da`,
                        name === 'revenue' ? 'الإيرادات' : name === 'profit' ? 'الأرباح' : 'الطلبات',
                      ]}
                      labelFormatter={(label) => `التاريخ: ${label}`}
                    />
                    <Area type="monotone" dataKey="revenue" fill="url(#revGrad)" stroke="transparent" />
                    <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} name="revenue" />
                    <Line type="monotone" dataKey="profit" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} name="profit" />
                    <Bar dataKey="order_count" fill="#e2e8f0" radius={[2, 2, 0, 0]} name="orders" barSize={20} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Two-column: Top Products + Category */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Top Products */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-800 mb-4">المنتجات الأكثر مبيعاً</h2>
              {topProducts.length === 0 ? (
                <p className="text-center text-gray-400 py-8">لا توجد بيانات</p>
              ) : (
                <>
                  <div style={{ direction: 'ltr' }}>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={topProducts} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                        <YAxis dataKey="product_name" type="category" tick={{ fontSize: 11 }} stroke="#94a3b8" width={100} />
                        <Tooltip
                          formatter={(value, name) => [
                            name === 'total_quantity' ? `${value} قطعة` : `${formatCurrency(value)} da`,
                            name === 'total_quantity' ? 'الكمية' : name === 'total_revenue' ? 'الإيرادات' : 'الأرباح',
                          ]}
                        />
                        <Bar dataKey="total_quantity" fill="#2563eb" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-right px-3 py-2 text-gray-500">المنتج</th>
                          <th className="text-right px-3 py-2 text-gray-500">الكمية</th>
                          <th className="text-right px-3 py-2 text-gray-500">الإيرادات</th>
                          <th className="text-right px-3 py-2 text-gray-500">الربح</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {topProducts.map((p, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 font-medium">{p.product_name}</td>
                            <td className="px-3 py-2">{p.total_quantity}</td>
                            <td className="px-3 py-2">{formatCurrency(p.total_revenue)} da</td>
                            <td className="px-3 py-2 text-green-600">{formatCurrency(p.total_profit)} da</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {/* Category Breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-800 mb-4">المبيعات حسب الفئة</h2>
              {categoryData.length === 0 ? (
                <p className="text-center text-gray-400 py-8">لا توجد بيانات</p>
              ) : (
                <>
                  <div style={{ direction: 'ltr' }}>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={categoryData}
                          dataKey="total_revenue"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label={({ category, percent }) =>
                            `${category} (${(percent * 100).toFixed(0)}%)`
                          }
                        >
                          {categoryData.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${formatCurrency(value)} da`, 'الإيرادات']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-right px-3 py-2 text-gray-500">الفئة</th>
                          <th className="text-right px-3 py-2 text-gray-500">الكمية</th>
                          <th className="text-right px-3 py-2 text-gray-500">الإيرادات</th>
                          <th className="text-right px-3 py-2 text-gray-500">الربح</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {categoryData.map((c, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 font-medium">{c.category}</td>
                            <td className="px-3 py-2">{c.total_quantity}</td>
                            <td className="px-3 py-2">{formatCurrency(c.total_revenue)} da</td>
                            <td className="px-3 py-2 text-green-600">{formatCurrency(c.total_profit)} da</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* TAB: Daily Performance */}
      {activeTab === 'daily' && (
        <>
          {/* Daily Performance Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
            <h2 className="font-semibold text-gray-800 mb-4">الأداء اليومي التفصيلي</h2>
            {dailyPerformance.length === 0 ? (
              <p className="text-center text-gray-400 py-8">لا توجد بيانات</p>
            ) : (
              <div style={{ direction: 'ltr' }}>
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart data={dailyPerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <Tooltip
                      formatter={(value, name) => {
                        const labels = {
                          revenue: 'الإيرادات',
                          profit: 'الأرباح',
                          order_count: 'الطلبات',
                          items_sold: 'القطع المباعة',
                          avg_order_value: 'متوسط الطلب',
                        };
                        return [
                          name === 'order_count' || name === 'items_sold'
                            ? value
                            : `${formatCurrency(value)} da`,
                          labels[name] || name,
                        ];
                      }}
                      labelFormatter={(label) => `التاريخ: ${label}`}
                    />
                    <Legend
                      formatter={(value) => {
                        const labels = { revenue: 'الإيرادات', profit: 'الأرباح', order_count: 'الطلبات', items_sold: 'القطع', avg_order_value: 'متوسط الطلب' };
                        return labels[value] || value;
                      }}
                    />
                    <Area yAxisId="left" type="monotone" dataKey="revenue" fill="#dbeafe" stroke="#2563eb" strokeWidth={2} />
                    <Line yAxisId="left" type="monotone" dataKey="profit" stroke="#16a34a" strokeWidth={2} dot={{ r: 2 }} />
                    <Bar yAxisId="right" dataKey="order_count" fill="#c4b5fd" radius={[2, 2, 0, 0]} barSize={15} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Daily Performance Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
            <h2 className="font-semibold text-gray-800 mb-4">جدول الأداء اليومي</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-right px-3 py-2 text-gray-500">التاريخ</th>
                    <th className="text-right px-3 py-2 text-gray-500">الطلبات</th>
                    <th className="text-right px-3 py-2 text-gray-500">القطع المباعة</th>
                    <th className="text-right px-3 py-2 text-gray-500">الإيرادات</th>
                    <th className="text-right px-3 py-2 text-gray-500">الأرباح</th>
                    <th className="text-right px-3 py-2 text-gray-500">متوسط الطلب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[...dailyPerformance].reverse().map((d, i) => (
                    <tr key={i} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedDay(d.date)}>
                      <td className="px-3 py-2 font-medium">{d.date}</td>
                      <td className="px-3 py-2">{d.order_count}</td>
                      <td className="px-3 py-2">{d.items_sold}</td>
                      <td className="px-3 py-2">{formatCurrency(d.revenue)} da</td>
                      <td className="px-3 py-2 text-green-600">{formatCurrency(d.profit)} da</td>
                      <td className="px-3 py-2">{formatCurrency(d.avg_order_value)} da</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Daily Top Products */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
            <h2 className="font-semibold text-gray-800 mb-4">
              أكثر المنتجات مبيعاً لكل يوم
            </h2>
            {Object.keys(dailyTopProducts).length === 0 ? (
              <p className="text-center text-gray-400 py-8">لا توجد بيانات</p>
            ) : (
              <>
                <div className="flex gap-2 flex-wrap mb-4">
                  {Object.keys(dailyTopProducts).reverse().map((day) => (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                        selectedDay === day
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-200 hover:bg-blue-50 hover:border-blue-200'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
                {selectedDay && dailyTopProducts[selectedDay] && (
                  <div>
                    <p className="text-sm text-gray-600 mb-3">
                      المنتجات الأكثر مبيعاً في <span className="font-bold text-blue-600">{selectedDay}</span>
                    </p>
                    <div style={{ direction: 'ltr' }}>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={dailyTopProducts[selectedDay]} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis type="number" tick={{ fontSize: 11 }} />
                          <YAxis dataKey="product_name" type="category" tick={{ fontSize: 11 }} width={120} />
                          <Tooltip
                            formatter={(value, name) => [
                              name === 'quantity' ? `${value} قطعة` : `${formatCurrency(value)} da`,
                              name === 'quantity' ? 'الكمية' : 'الإيرادات',
                            ]}
                          />
                          <Bar dataKey="quantity" fill="#2563eb" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <table className="w-full text-xs mt-3">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-right px-3 py-2 text-gray-500">#</th>
                          <th className="text-right px-3 py-2 text-gray-500">المنتج</th>
                          <th className="text-right px-3 py-2 text-gray-500">الكمية</th>
                          <th className="text-right px-3 py-2 text-gray-500">الإيرادات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {dailyTopProducts[selectedDay].map((p, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2">{i + 1}</td>
                            <td className="px-3 py-2 font-medium">{p.product_name}</td>
                            <td className="px-3 py-2">{p.quantity} قطعة</td>
                            <td className="px-3 py-2">{formatCurrency(p.revenue)} da</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* TAB: Products */}
      {activeTab === 'products' && (
        <>
          {/* Profit Margins */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
            <h2 className="font-semibold text-gray-800 mb-4">هامش الربح حسب المنتج</h2>
            {profitMargins.length === 0 ? (
              <p className="text-center text-gray-400 py-8">لا توجد بيانات</p>
            ) : (
              <>
                <div style={{ direction: 'ltr' }}>
                  <ResponsiveContainer width="100%" height={Math.max(250, profitMargins.length * 35)}>
                    <BarChart data={profitMargins} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis type="number" tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                      <YAxis dataKey="product_name" type="category" tick={{ fontSize: 10 }} width={120} />
                      <Tooltip
                        formatter={(value, name) => [
                          name === 'margin_percentage' ? `${value}%` : `${formatCurrency(value)} da`,
                          name === 'margin_percentage' ? 'هامش الربح' : name === 'total_revenue' ? 'الإيرادات' : 'الربح',
                        ]}
                      />
                      <Bar dataKey="margin_percentage" radius={[0, 4, 4, 0]}>
                        {profitMargins.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={
                              entry.margin_percentage >= 40 ? '#22c55e'
                              : entry.margin_percentage >= 20 ? '#f59e0b'
                              : '#ef4444'
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-right px-3 py-2 text-gray-500">المنتج</th>
                        <th className="text-right px-3 py-2 text-gray-500">الكمية</th>
                        <th className="text-right px-3 py-2 text-gray-500">الإيرادات</th>
                        <th className="text-right px-3 py-2 text-gray-500">التكلفة</th>
                        <th className="text-right px-3 py-2 text-gray-500">الربح</th>
                        <th className="text-right px-3 py-2 text-gray-500">الهامش</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {profitMargins.map((p, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 font-medium">{p.product_name}</td>
                          <td className="px-3 py-2">{p.total_quantity}</td>
                          <td className="px-3 py-2">{formatCurrency(p.total_revenue)} da</td>
                          <td className="px-3 py-2 text-red-500">{formatCurrency(p.total_cost)} da</td>
                          <td className="px-3 py-2 text-green-600">{formatCurrency(p.total_profit)} da</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              p.margin_percentage >= 40 ? 'bg-green-100 text-green-700'
                              : p.margin_percentage >= 20 ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                            }`}>
                              {p.margin_percentage}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* Top Products bar chart (same as overview but bigger) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
            <h2 className="font-semibold text-gray-800 mb-4">ترتيب المنتجات حسب الإيرادات</h2>
            {topProducts.length === 0 ? (
              <p className="text-center text-gray-400 py-8">لا توجد بيانات</p>
            ) : (
              <div style={{ direction: 'ltr' }}>
                <ResponsiveContainer width="100%" height={Math.max(250, topProducts.length * 40)}>
                  <BarChart data={topProducts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="product_name" type="category" tick={{ fontSize: 10 }} width={120} />
                    <Tooltip
                      formatter={(value, name) => [
                        `${formatCurrency(value)} da`,
                        name === 'total_revenue' ? 'الإيرادات' : 'الربح',
                      ]}
                    />
                    <Bar dataKey="total_revenue" fill="#2563eb" radius={[0, 4, 4, 0]} name="total_revenue" />
                    <Bar dataKey="total_profit" fill="#16a34a" radius={[0, 4, 4, 0]} name="total_profit" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}

      {/* TAB: Geography */}
      {activeTab === 'geography' && (
        <>
          {/* Wilaya Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <MapPin size={18} className="text-blue-600" />
              التوزيع الجغرافي للمبيعات
            </h2>
            {wilayaData.length === 0 ? (
              <p className="text-center text-gray-400 py-8">لا توجد بيانات</p>
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Bar chart */}
                  <div style={{ direction: 'ltr' }}>
                    <ResponsiveContainer width="100%" height={Math.max(300, Math.min(wilayaData.length * 30, 600))}>
                      <BarChart data={wilayaData.slice(0, 20)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis dataKey="wilaya" type="category" tick={{ fontSize: 10 }} width={100} />
                        <Tooltip
                          formatter={(value, name) => [
                            name === 'order_count' ? `${value} طلب` : `${formatCurrency(value)} da`,
                            name === 'order_count' ? 'الطلبات' : name === 'revenue' ? 'الإيرادات' : 'الربح',
                          ]}
                        />
                        <Bar dataKey="order_count" fill="#2563eb" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Pie chart */}
                  <div style={{ direction: 'ltr' }}>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={wilayaData.slice(0, 10)}
                          dataKey="revenue"
                          nameKey="wilaya"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ wilaya, percent }) => `${wilaya} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {wilayaData.slice(0, 10).map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${formatCurrency(value)} da`, 'الإيرادات']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-right px-3 py-2 text-gray-500">#</th>
                        <th className="text-right px-3 py-2 text-gray-500">الولاية</th>
                        <th className="text-right px-3 py-2 text-gray-500">الطلبات</th>
                        <th className="text-right px-3 py-2 text-gray-500">الإيرادات</th>
                        <th className="text-right px-3 py-2 text-gray-500">الربح</th>
                        <th className="text-right px-3 py-2 text-gray-500">% من الطلبات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {wilayaData.map((w, i) => {
                        const totalOrders = wilayaData.reduce((s, x) => s + x.order_count, 0);
                        return (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-3 py-2">{i + 1}</td>
                            <td className="px-3 py-2 font-medium">{w.wilaya}</td>
                            <td className="px-3 py-2">{w.order_count}</td>
                            <td className="px-3 py-2">{formatCurrency(w.revenue)} da</td>
                            <td className="px-3 py-2 text-green-600">{formatCurrency(w.profit)} da</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                                  <div
                                    className="bg-blue-500 h-1.5 rounded-full"
                                    style={{ width: `${((w.order_count / totalOrders) * 100).toFixed(0)}%` }}
                                  />
                                </div>
                                <span className="text-xs">{((w.order_count / totalOrders) * 100).toFixed(1)}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* TAB: Operations */}
      {activeTab === 'operations' && (
        <>
          {/* Order Status Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-800 mb-4">توزيع حالات الطلبات</h2>
              {orderStatus.length === 0 ? (
                <p className="text-center text-gray-400 py-8">لا توجد بيانات</p>
              ) : (
                <>
                  <div style={{ direction: 'ltr' }}>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={orderStatus}
                          dataKey="count"
                          nameKey="status"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          innerRadius={50}
                          label={({ status, percent }) =>
                            `${STATUS_LABELS[status] || status} (${(percent * 100).toFixed(0)}%)`
                          }
                        >
                          {orderStatus.map((entry, i) => (
                            <Cell
                              key={i}
                              fill={STATUS_COLORS[entry.status] || COLORS[i % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, name) => [
                            `${value} طلب`,
                            STATUS_LABELS[name] || name,
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 space-y-2">
                    {orderStatus.map((s, i) => {
                      const total = orderStatus.reduce((sum, x) => sum + x.count, 0);
                      const pct = ((s.count / total) * 100).toFixed(1);
                      return (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: STATUS_COLORS[s.status] || COLORS[i % COLORS.length] }}
                            />
                            <span className="font-medium">{STATUS_LABELS[s.status] || s.status}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-gray-500">{s.count} طلب</span>
                            <span className="text-gray-400">({pct}%)</span>
                            <span className="text-gray-500">{formatCurrency(s.revenue)} da</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Hourly Distribution */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Clock size={18} className="text-purple-600" />
                أوقات الذروة للطلبات
              </h2>
              {hourlyData.length === 0 ? (
                <p className="text-center text-gray-400 py-8">لا توجد بيانات</p>
              ) : (
                <>
                  <div style={{ direction: 'ltr' }}>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={fullHourlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="hour" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                        <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                        <Tooltip
                          formatter={(value, name) => [
                            name === 'order_count' ? `${value} طلب` : `${formatCurrency(value)} da`,
                            name === 'order_count' ? 'الطلبات' : 'الإيرادات',
                          ]}
                          labelFormatter={(label) => `الساعة: ${label}`}
                        />
                        <Bar dataKey="order_count" radius={[4, 4, 0, 0]}>
                          {fullHourlyData.map((entry, i) => (
                            <Cell
                              key={i}
                              fill={entry.order_count > 0 ? '#7c3aed' : '#e2e8f0'}
                              opacity={entry.order_count > 0 ? 0.5 + (entry.order_count / Math.max(...fullHourlyData.map(h => h.order_count || 1))) * 0.5 : 0.3}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Peak hours summary */}
                  {(() => {
                    const sorted = [...fullHourlyData].filter(h => h.order_count > 0).sort((a, b) => b.order_count - a.order_count);
                    const top3 = sorted.slice(0, 3);
                    if (top3.length === 0) return null;
                    return (
                      <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                        <p className="text-xs text-purple-700 font-medium mb-1">أوقات الذروة:</p>
                        <div className="flex gap-3 flex-wrap">
                          {top3.map((h, i) => (
                            <span key={i} className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                              {h.hour} — {h.order_count} طلب
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
