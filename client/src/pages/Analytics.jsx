/**
 * Analytics Page
 * Revenue/profit charts, top products, and category breakdown with date filtering.
 */
import { useEffect, useState } from 'react';
import { analyticsApi } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Calendar, TrendingUp, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2'];

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));

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
      const [revRes, topRes, catRes] = await Promise.all([
        analyticsApi.getRevenue(params),
        analyticsApi.getTopProducts(params),
        analyticsApi.getCategories(params),
      ]);
      setRevenueData(revRes.data);
      setTopProducts(topRes.data);
      setCategoryData(catRes.data);
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

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">التحليلات</h1>
          <p className="text-gray-500 text-sm mt-1">تقارير المبيعات والأرباح</p>
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

      {/* Period Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg"><DollarSign size={20} className="text-blue-600" /></div>
            <div>
              <p className="text-xs text-gray-500">إجمالي الإيرادات</p>
              <p className="text-xl font-bold">{formatCurrency(periodRevenue)} da</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg"><TrendingUp size={20} className="text-green-600" /></div>
            <div>
              <p className="text-xs text-gray-500">إجمالي الأرباح</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(periodProfit)} da</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg"><TrendingUp size={20} className="text-purple-600" /></div>
            <div>
              <p className="text-xs text-gray-500">عدد الطلبات</p>
              <p className="text-xl font-bold">{periodOrders}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue by Day Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        <h2 className="font-semibold text-gray-800 mb-4">الإيرادات والأرباح اليومية</h2>
        {revenueData.length === 0 ? (
          <p className="text-center text-gray-400 py-8">لا توجد بيانات في هذه الفترة</p>
        ) : (
          <div style={{ direction: 'ltr' }}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip
                  formatter={(value, name) => [
                    `${formatCurrency(value)} da`,
                    name === 'revenue' ? 'الإيرادات' : 'الأرباح',
                  ]}
                  labelFormatter={(label) => `التاريخ: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="revenue"
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="profit"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Two-column grid: Top Products + Category Breakdown */}
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
              {/* Table below chart */}
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

        {/* Sales by Category */}
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
                    <Tooltip
                      formatter={(value) => [`${formatCurrency(value)} da`, 'الإيرادات']}
                    />
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
    </div>
  );
}
