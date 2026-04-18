/**
 * Analytics Page
 * Revenue/profit charts, period comparison, status funnel, and delivery breakdowns.
 */
import { useEffect, useState } from 'react';
import { analyticsApi } from '../api';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Calendar, DollarSign, Percent, ShoppingCart, TrendingUp, Truck } from 'lucide-react';
import toast from 'react-hot-toast';

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2'];

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatTrend(comparison, previousLabel) {
  if (!comparison) return `لا توجد مقارنة مع ${previousLabel}`;
  const { current = 0, previous = 0, percent_change: percentChange } = comparison;

  if (current === 0 && previous === 0) {
    return `بدون تغيير عن ${previousLabel}`;
  }

  if (percentChange == null) {
    return previous === 0 && current > 0
      ? `نشاط جديد مقارنة مع ${previousLabel}`
      : `لا توجد مقارنة مع ${previousLabel}`;
  }

  const sign = percentChange > 0 ? '+' : '';
  return `${sign}${percentChange.toFixed(1)}% مقارنة مع ${previousLabel}`;
}

function translateDeliveryMethod(method) {
  return method === 'stopdesk' ? 'Stop Desk' : 'توصيل منزلي';
}

function getFunnelBarColor(key) {
  if (key === 'delivered') return '#16a34a';
  if (key === 'failed') return '#dc2626';
  if (key === 'pending') return '#d97706';
  if (key === 'approved') return '#2563eb';
  return '#7c3aed';
}

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));

  const [overview, setOverview] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [categoryData, setCategoryData] = useState([]);

  useEffect(() => {
    loadAnalytics();
  }, [fromDate, toDate]);

  async function loadAnalytics() {
    try {
      setLoading(true);
      const params = { from: fromDate, to: toDate };
      const [overviewRes, revRes, topRes, catRes] = await Promise.all([
        analyticsApi.getOverview(params),
        analyticsApi.getRevenue(params),
        analyticsApi.getTopProducts({ ...params, sort: 'profit' }),
        analyticsApi.getCategories(params),
      ]);

      setOverview(overviewRes.data);
      setRevenueData(revRes.data);
      setTopProducts(topRes.data);
      setCategoryData(catRes.data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  const fallbackSummary = {
    revenue: revenueData.reduce((sum, item) => sum + Number(item.revenue || 0), 0),
    profit: revenueData.reduce((sum, item) => sum + Number(item.profit || 0), 0),
    orders: revenueData.reduce((sum, item) => sum + Number(item.order_count || 0), 0),
  };
  fallbackSummary.aov = fallbackSummary.orders > 0 ? fallbackSummary.revenue / fallbackSummary.orders : 0;
  fallbackSummary.margin_pct = fallbackSummary.revenue > 0
    ? (fallbackSummary.profit / fallbackSummary.revenue) * 100
    : 0;

  const summary = overview?.summary || fallbackSummary;
  const comparison = overview?.comparison || {};
  const previousRange = overview?.range?.previous;
  const previousLabel = previousRange
    ? `${previousRange.from} → ${previousRange.to}`
    : 'الفترة السابقة';
  const orderFunnel = overview?.order_funnel || [];
  const deliveryMethods = (overview?.delivery_methods || []).map((item) => ({
    ...item,
    label: translateDeliveryMethod(item.method),
  }));
  const deliveryByWilaya = overview?.delivery_by_wilaya || [];

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">التحليلات</h1>
            <p className="text-gray-500 text-sm mt-1">تقارير المبيعات والأرباح والتشغيل</p>
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
        {previousRange && (
          <p className="text-xs text-gray-500">
            مقارنة مع الفترة السابقة: {previousRange.from} → {previousRange.to}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
        <StatCard
          title="إجمالي الإيرادات"
          value={`${formatCurrency(summary.revenue)} da`}
          icon={DollarSign}
          color="blue"
          subtitle={formatTrend(comparison.revenue, previousLabel)}
        />
        <StatCard
          title="إجمالي الأرباح"
          value={`${formatCurrency(summary.profit)} da`}
          icon={TrendingUp}
          color="green"
          subtitle={formatTrend(comparison.profit, previousLabel)}
        />
        <StatCard
          title="عدد الطلبات"
          value={summary.orders || 0}
          icon={ShoppingCart}
          color="purple"
          subtitle={formatTrend(comparison.orders, previousLabel)}
        />
        <StatCard
          title="متوسط قيمة الطلب"
          value={`${formatCurrency(summary.aov)} da`}
          icon={DollarSign}
          color="amber"
          subtitle={formatTrend(comparison.aov, previousLabel)}
        />
        <StatCard
          title="هامش الربح"
          value={formatPercent(summary.margin_pct)}
          icon={Percent}
          color="green"
          subtitle={formatTrend(comparison.margin_pct, previousLabel)}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-semibold text-gray-800">الإيرادات والأرباح وهامش الربح اليومي</h2>
            <p className="text-xs text-gray-500">خط الهامش يعرض نسبة الربح اليومية</p>
          </div>
        </div>
        {revenueData.length === 0 ? (
          <p className="text-center text-gray-400 py-8">لا توجد بيانات في هذه الفترة</p>
        ) : (
          <div style={{ direction: 'ltr' }}>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis yAxisId="money" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis
                  yAxisId="margin"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  stroke="#d97706"
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === 'margin_pct') return [`${Number(value || 0).toFixed(1)}%`, 'هامش الربح'];
                    return [
                      `${formatCurrency(value)} da`,
                      name === 'revenue' ? 'الإيرادات' : 'الأرباح',
                    ];
                  }}
                  labelFormatter={(label) => `التاريخ: ${label}`}
                />
                <Legend
                  formatter={(value) => (
                    value === 'revenue' ? 'الإيرادات' : value === 'profit' ? 'الأرباح' : 'هامش الربح'
                  )}
                />
                <Line
                  yAxisId="money"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="revenue"
                />
                <Line
                  yAxisId="money"
                  type="monotone"
                  dataKey="profit"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="profit"
                />
                <Line
                  yAxisId="margin"
                  type="monotone"
                  dataKey="margin_pct"
                  stroke="#d97706"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  name="margin_pct"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">مسار الطلبات</h2>
          {orderFunnel.length === 0 ? (
            <p className="text-center text-gray-400 py-8">لا توجد بيانات</p>
          ) : (
            <div style={{ direction: 'ltr' }}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={orderFunnel}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <Tooltip formatter={(value) => [`${value} طلب`, 'العدد']} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {orderFunnel.map((item) => (
                      <Cell key={item.key} fill={getFunnelBarColor(item.key)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Truck size={18} className="text-blue-600" />
            <h2 className="font-semibold text-gray-800">طريقة التوصيل</h2>
          </div>
          {deliveryMethods.length === 0 ? (
            <p className="text-center text-gray-400 py-8">لا توجد بيانات</p>
          ) : (
            <>
              <div style={{ direction: 'ltr' }}>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={deliveryMethods}
                      dataKey="total_orders"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      label={({ label, percent }) => `${label} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {deliveryMethods.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} طلب`, 'الطلبات']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {deliveryMethods.map((item) => (
                  <div key={item.method} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{item.label}</span>
                    <span className="font-medium text-gray-800">
                      {item.total_orders} طلب / {formatPercent(item.success_rate)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">الأداء حسب الولاية</h2>
          {deliveryByWilaya.length === 0 ? (
            <p className="text-center text-gray-400 py-8">لا توجد بيانات</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-right px-3 py-2 text-gray-500">الولاية</th>
                    <th className="text-right px-3 py-2 text-gray-500">الطلبات</th>
                    <th className="text-right px-3 py-2 text-gray-500">نجاح التوصيل</th>
                    <th className="text-right px-3 py-2 text-gray-500">الفشل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {deliveryByWilaya.map((item) => (
                    <tr key={item.wilaya}>
                      <td className="px-3 py-2 font-medium">{item.wilaya}</td>
                      <td className="px-3 py-2">{item.total_orders}</td>
                      <td className="px-3 py-2 text-green-600">{formatPercent(item.success_rate)}</td>
                      <td className="px-3 py-2 text-red-600">{item.failed_orders}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">المنتجات الأعلى ربحاً</h2>
          {topProducts.length === 0 ? (
            <p className="text-center text-gray-400 py-8">لا توجد بيانات</p>
          ) : (
            <>
              <div style={{ direction: 'ltr' }}>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={topProducts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis
                      dataKey="product_name"
                      type="category"
                      tick={{ fontSize: 11 }}
                      stroke="#94a3b8"
                      width={110}
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        name === 'total_quantity' ? `${value} قطعة` : `${formatCurrency(value)} da`,
                        name === 'total_quantity' ? 'الكمية' : name === 'total_revenue' ? 'الإيرادات' : 'الأرباح',
                      ]}
                    />
                    <Bar dataKey="total_profit" fill="#16a34a" radius={[0, 4, 4, 0]} />
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
                    {topProducts.map((item) => (
                      <tr key={item.product_id}>
                        <td className="px-3 py-2 font-medium">{item.product_name}</td>
                        <td className="px-3 py-2">{item.total_quantity}</td>
                        <td className="px-3 py-2">{formatCurrency(item.total_revenue)} da</td>
                        <td className="px-3 py-2 text-green-600">{formatCurrency(item.total_profit)} da</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

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
                      {categoryData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
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
                    {categoryData.map((item) => (
                      <tr key={item.category}>
                        <td className="px-3 py-2 font-medium">{item.category}</td>
                        <td className="px-3 py-2">{item.total_quantity}</td>
                        <td className="px-3 py-2">{formatCurrency(item.total_revenue)} da</td>
                        <td className="px-3 py-2 text-green-600">{formatCurrency(item.total_profit)} da</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
