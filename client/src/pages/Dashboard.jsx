/**
 * Dashboard Page
 * Shows today's revenue, profit, order count, weekly/monthly trends,
 * growth comparison, and low stock alerts.
 */
import { useEffect, useState } from 'react';
import { analyticsApi, productApi } from '../api';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  DollarSign, TrendingUp, TrendingDown, ShoppingCart, AlertTriangle, Package,
  ArrowUpRight, ArrowDownRight, Percent, BarChart3, CheckCircle, RotateCcw,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [growth, setGrowth] = useState(null);
  const [weeklyRevenue, setWeeklyRevenue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const today = new Date().toISOString().slice(0, 10);

      const [dashRes, stockRes, growthRes, weekRes] = await Promise.all([
        analyticsApi.getDashboard(),
        productApi.getLowStock(5),
        analyticsApi.getGrowth().catch(() => ({ data: null })),
        analyticsApi.getRevenue({ from: weekAgo, to: today }).catch(() => ({ data: [] })),
      ]);
      setStats(dashRes.data);
      setLowStock(stockRes.data);
      setGrowth(growthRes.data);
      setWeeklyRevenue(weekRes.data || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner size="lg" />;

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 2 }).format(val || 0);

  const GrowthBadge = ({ value, label }) => {
    const v = parseFloat(value);
    const isPositive = v >= 0;
    return (
      <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        <span>{Math.abs(v)}%</span>
        <span className="text-gray-400 mr-1">{label}</span>
      </div>
    );
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">لوحة التحكم</h1>
        <p className="text-gray-500 text-sm mt-1">ملخص اليوم — {new Date().toLocaleDateString('en-US')}</p>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="إيرادات اليوم"
          value={`${formatCurrency(stats?.today_revenue)} da`}
          icon={DollarSign}
          color="blue"
        />
        <StatCard
          title="أرباح اليوم"
          value={`${formatCurrency(stats?.today_profit)} da`}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="طلبات اليوم"
          value={stats?.today_orders || 0}
          icon={ShoppingCart}
          color="purple"
        />
        <StatCard
          title="منتجات منخفضة المخزون"
          value={stats?.low_stock_count || 0}
          icon={AlertTriangle}
          color={stats?.low_stock_count > 0 ? 'red' : 'amber'}
        />
      </div>

      {/* Growth Comparison Cards */}
      {growth && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-8">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-blue-600" />
            مقارنة الأداء — آخر 7 أيام مقابل الأسبوع السابق
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-center p-4 rounded-lg bg-blue-50/50">
              <p className="text-xs text-gray-500 mb-1">الإيرادات</p>
              <p className="text-xl font-bold">{formatCurrency(growth.current?.revenue)} da</p>
              <GrowthBadge value={growth.growth?.revenue} label="vs الأسبوع الماضي" />
            </div>
            <div className="text-center p-4 rounded-lg bg-green-50/50">
              <p className="text-xs text-gray-500 mb-1">الأرباح</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(growth.current?.profit)} da</p>
              <GrowthBadge value={growth.growth?.profit} label="vs الأسبوع الماضي" />
            </div>
            <div className="text-center p-4 rounded-lg bg-purple-50/50">
              <p className="text-xs text-gray-500 mb-1">الطلبات</p>
              <p className="text-xl font-bold">{growth.current?.orders}</p>
              <GrowthBadge value={growth.growth?.orders} label="vs الأسبوع الماضي" />
            </div>
          </div>
        </div>
      )}

      {/* Mini Revenue Sparkline */}
      {weeklyRevenue.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-8">
          <h2 className="font-semibold text-gray-800 mb-4">إيرادات آخر 7 أيام</h2>
          <div style={{ direction: 'ltr' }}>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={weeklyRevenue}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip
                  formatter={(value) => [`${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(value)} da`, 'الإيرادات']}
                  labelFormatter={(label) => `التاريخ: ${label}`}
                />
                <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} fill="url(#revenueGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Weekly / Monthly + Rates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="إيرادات الأسبوع"
          value={`${formatCurrency(stats?.week_revenue)} da`}
          icon={DollarSign}
          color="blue"
          subtitle="آخر 7 أيام"
        />
        <StatCard
          title="إيرادات الشهر"
          value={`${formatCurrency(stats?.month_revenue)} da`}
          icon={DollarSign}
          color="blue"
          subtitle="آخر 30 يوم"
        />
        <StatCard
          title="نسبة التوصيل"
          value={`${stats?.delivered_rate || 0}%`}
          icon={CheckCircle}
          color="green"
          subtitle="الطلبات الموصلة"
        />
        <StatCard
          title="نسبة الإرجاع"
          value={`${stats?.return_rate || 0}%`}
          icon={RotateCcw}
          color={parseFloat(stats?.return_rate) > 10 ? 'red' : 'amber'}
          subtitle="الطلبات المرجعة"
        />
      </div>

      {/* Inventory stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          title="إجمالي المنتجات"
          value={stats?.total_products || 0}
          icon={Package}
          color="blue"
        />
        <StatCard
          title="قيمة المخزون (بالتكلفة)"
          value={`${formatCurrency(stats?.stock_value)} da`}
          icon={DollarSign}
          color="amber"
        />
        <StatCard
          title="متوسط قيمة الطلب"
          value={`${formatCurrency(stats?.avg_order_value)} da`}
          icon={Percent}
          color="purple"
        />
      </div>

      {/* Low Stock Table */}
      {lowStock.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" />
            <h2 className="font-semibold text-gray-800">تنبيه المخزون المنخفض</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">المنتج</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">الفئة</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">اللون</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">المقاس</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">الكمية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {lowStock.map((item) => (
                  <tr key={item.id} className="table-row-hover">
                    <td className="px-5 py-3 font-medium">{item.model_name}</td>
                    <td className="px-5 py-3">{item.category}</td>
                    <td className="px-5 py-3">{item.color}</td>
                    <td className="px-5 py-3">{item.size}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.quantity === 0
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {item.quantity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
