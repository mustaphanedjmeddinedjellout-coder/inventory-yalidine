/**
 * Dashboard Page
 * Shows daily performance, operational funnel, and restock urgency.
 */
import { useEffect, useState } from 'react';
import { analyticsApi } from '../api';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  AlertTriangle,
  DollarSign,
  Package,
  Percent,
  ShoppingCart,
  Truck,
  TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';

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

function formatTrend(comparison, periodLabel) {
  if (!comparison) return `لا توجد مقارنة مع ${periodLabel}`;
  const { current = 0, previous = 0, percent_change: percentChange } = comparison;

  if (current === 0 && previous === 0) {
    return `بدون تغيير عن ${periodLabel}`;
  }

  if (percentChange == null) {
    return previous === 0 && current > 0
      ? `نشاط جديد مقارنة مع ${periodLabel}`
      : `لا توجد مقارنة مع ${periodLabel}`;
  }

  const sign = percentChange > 0 ? '+' : '';
  return `${sign}${percentChange.toFixed(1)}% مقارنة مع ${periodLabel}`;
}

function formatCurrencyDelta(comparison, periodLabel) {
  if (!comparison) return `لا توجد مقارنة مع ${periodLabel}`;
  const delta = Number(comparison.delta || 0);
  const sign = delta > 0 ? '+' : '';
  return `${sign}${formatCurrency(delta)} da مقارنة مع ${periodLabel}`;
}

function formatPointDelta(comparison, periodLabel) {
  if (!comparison) return `لا توجد مقارنة مع ${periodLabel}`;
  const delta = Number(comparison.delta || 0);
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)} نقطة مقارنة مع ${periodLabel}`;
}

function getFunnelColor(key) {
  if (key === 'delivered') return 'bg-green-50 text-green-700 border-green-100';
  if (key === 'failed') return 'bg-red-50 text-red-700 border-red-100';
  if (key === 'pending') return 'bg-amber-50 text-amber-700 border-amber-100';
  if (key === 'approved') return 'bg-blue-50 text-blue-700 border-blue-100';
  return 'bg-purple-50 text-purple-700 border-purple-100';
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const dashRes = await analyticsApi.getDashboard();
      setStats(dashRes.data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner size="lg" />;

  const todayLabel = new Date().toLocaleDateString('en-US');
  const opsRange = stats?.operations_range;
  const deliverySummary = stats?.delivery_summary || {};
  const orderFunnel = stats?.order_funnel || [];
  const urgentRestock = stats?.urgent_restock || [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">لوحة التحكم</h1>
        <p className="text-gray-500 text-sm mt-1">ملخص اليوم التشغيلي — {todayLabel}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
        <StatCard
          title="إيرادات اليوم"
          value={`${formatCurrency(stats?.today_summary?.revenue)} da`}
          icon={DollarSign}
          color="blue"
          subtitle={formatTrend(stats?.comparison?.revenue, 'الأمس')}
        />
        <StatCard
          title="أرباح اليوم"
          value={`${formatCurrency(stats?.today_summary?.profit)} da`}
          icon={TrendingUp}
          color="green"
          subtitle={formatTrend(stats?.comparison?.profit, 'الأمس')}
        />
        <StatCard
          title="طلبات اليوم"
          value={stats?.today_summary?.orders || 0}
          icon={ShoppingCart}
          color="purple"
          subtitle={formatTrend(stats?.comparison?.orders, 'الأمس')}
        />
        <StatCard
          title="متوسط قيمة الطلب"
          value={`${formatCurrency(stats?.today_summary?.aov)} da`}
          icon={DollarSign}
          color="amber"
          subtitle={formatCurrencyDelta(stats?.comparison?.aov, 'الأمس')}
        />
        <StatCard
          title="هامش الربح"
          value={formatPercent(stats?.today_summary?.margin_pct)}
          icon={Percent}
          color="green"
          subtitle={formatPointDelta(stats?.comparison?.margin_pct, 'الأمس')}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
        <StatCard
          title="نجاح التوصيل"
          value={formatPercent(deliverySummary.success_rate)}
          icon={Truck}
          color="blue"
          subtitle={`${deliverySummary.delivered_orders || 0} تم التسليم / ${deliverySummary.failed_orders || 0} فشل خلال آخر 30 يوم`}
        />
        <StatCard
          title="منتجات منخفضة المخزون"
          value={stats?.low_stock_count || 0}
          icon={AlertTriangle}
          color={stats?.low_stock_count > 0 ? 'red' : 'amber'}
          subtitle="حد التنبيه الحالي: 5 قطع"
        />
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
          title="قيمة المخزون (بسعر البيع)"
          value={`${formatCurrency(stats?.stock_value_selling)} da`}
          icon={DollarSign}
          color="green"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h2 className="font-semibold text-gray-800">مسار الطلبات</h2>
            <p className="text-xs text-gray-500">
              من {opsRange?.from || '—'} إلى {opsRange?.to || '—'}
            </p>
          </div>
          <div className="text-xs text-gray-500">
            الشحن النشط: {deliverySummary.active_shipments || 0}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {orderFunnel.map((step) => (
            <div
              key={step.key}
              className={`rounded-xl border p-4 ${getFunnelColor(step.key)}`}
            >
              <p className="text-xs mb-1">{step.label}</p>
              <p className="text-2xl font-bold">{step.count}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" />
            <div>
              <h2 className="font-semibold text-gray-800">إعادة التزويد العاجلة</h2>
              <p className="text-xs text-gray-500">ترتيب حسب سرعة البيع مقابل المخزون المتبقي</p>
            </div>
          </div>
          <span className="text-xs text-gray-500">آخر 30 يوم</span>
        </div>

        {urgentRestock.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">لا توجد عناصر عاجلة حالياً</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">المنتج</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">الفئة</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">اللون</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">المقاس</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">المتوفر</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">مبيعات 30 يوم</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">تغطية تقديرية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {urgentRestock.map((item) => (
                  <tr key={item.id} className="table-row-hover">
                    <td className="px-5 py-3 font-medium">{item.model_name}</td>
                    <td className="px-5 py-3">{item.category}</td>
                    <td className="px-5 py-3">{item.color || '—'}</td>
                    <td className="px-5 py-3">{item.size || '—'}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.quantity === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {item.quantity}
                      </span>
                    </td>
                    <td className="px-5 py-3">{item.quantity_sold_30d}</td>
                    <td className="px-5 py-3">
                      {item.days_of_cover == null ? (
                        <span className="text-gray-300">—</span>
                      ) : (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            item.days_of_cover <= 7
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {item.days_of_cover} يوم
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
