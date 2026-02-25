/**
 * Dashboard Page
 * Shows today's revenue, profit, order count, and low stock alerts.
 */
import { useEffect, useState } from 'react';
import { analyticsApi, productApi } from '../api';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { DollarSign, TrendingUp, ShoppingCart, AlertTriangle, Package } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [dashRes, stockRes] = await Promise.all([
        analyticsApi.getDashboard(),
        productApi.getLowStock(5),
      ]);
      setStats(dashRes.data);
      setLowStock(stockRes.data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner size="lg" />;

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 2 }).format(val || 0);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">لوحة التحكم</h1>
        <p className="text-gray-500 text-sm mt-1">ملخص اليوم — {new Date().toLocaleDateString('en-US')}</p>
      </div>

      {/* Stat Cards */}
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

      {/* Additional stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
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
