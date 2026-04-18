import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Instagram } from 'lucide-react';
import { fetchOrderStatus } from '../api';

export default function OrderSuccess() {
  const { id } = useParams();
  const location = useLocation();
  const initialOrder = location.state || {};
  const instagramUrl = (import.meta.env.VITE_INSTAGRAM_URL || 'https://www.instagram.com/noire.luxewear/').trim();

  const [orderInfo, setOrderInfo] = useState({
    orderNumber: initialOrder.orderNumber || id,
    orderStatus: initialOrder.orderStatus || null,
    yalidineTracking: initialOrder.yalidineTracking || null,
    yalidineStatus: initialOrder.yalidineStatus || null,
    yalidineLabel: initialOrder.yalidineLabel || null,
  });
  const [loading, setLoading] = useState(!initialOrder.yalidineTracking);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadStatus() {
      try {
        setLoading(true);
        const result = await fetchOrderStatus(id);
        if (!active) return;
        setOrderInfo({
          orderNumber: result.orderNumber || id,
          orderStatus: result.orderStatus || null,
          yalidineTracking: result.yalidineTracking || null,
          yalidineStatus: result.yalidineStatus || null,
          yalidineLabel: result.yalidineLabel || null,
        });
        setError('');
      } catch (err) {
        if (!active) return;
        setError(err.message || 'تعذر تحميل حالة الطلب');
      } finally {
        if (!active) return;
        setLoading(false);
      }
    }

    loadStatus();

    return () => {
      active = false;
    };
  }, [id]);

  return (
    <div className="container-bleed py-20 text-center">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <span className="text-2xl">✓</span>
        </div>
        <h1 className="text-2xl font-display text-ink">تم تأكيد الطلب</h1>
        <p className="text-[13px] text-black/45">تم إرسال طلبك إلى ياليدين وحجز المخزون.</p>

        <div className="space-y-4 rounded-2xl border border-black/10 bg-white/70 px-6 py-5 text-right">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-black/40">رقم الطلب الداخلي</p>
            <p className="mt-2 text-[20px] font-semibold text-ink">{orderInfo.orderNumber || id}</p>
          </div>

          <div className="h-px bg-black/10" />

          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-black/40">رقم تتبع ياليدين</p>
            <p className="mt-2 text-[18px] font-semibold text-ink">
              {loading ? 'جاري التحميل...' : orderInfo.yalidineTracking || 'لم يصدر بعد'}
            </p>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-black/40">حالة الشحن</p>
            <p className="mt-2 text-[15px] font-medium text-black/70">
              {loading ? 'جاري التحديث...' : orderInfo.yalidineStatus || orderInfo.orderStatus || 'قيد المعالجة'}
            </p>
          </div>

          {orderInfo.yalidineLabel && (
            <div className="pt-1">
              <a
                href={orderInfo.yalidineLabel}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-full border border-black/15 px-4 py-2 text-[12px] font-semibold text-black/70 transition hover:border-black hover:text-black"
              >
                فتح ملصق ياليدين
              </a>
            </div>
          )}

          {error && <p className="text-[12px] text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-pink-200 bg-pink-50/70 px-6 py-5 text-right">
          <p className="text-[30px] leading-none text-pink-300/70">"</p>
          <p className="-mt-3 text-[14px] leading-7 text-pink-900">
            تابعونا على إنستغرام لمعرفة <span className="font-semibold">الوصولات الجديدة</span>
            <br />
            وكل المعلومات والتفاصيل أولاً بأول.
          </p>

          <div className="mt-4 flex justify-end">
            <a
              href={instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-pink-200 bg-white px-4 py-2 text-[13px] font-semibold text-pink-700 transition hover:bg-pink-100"
            >
              <Instagram size={16} />
              حسابنا على إنستغرام
            </a>
          </div>
        </div>

        <Link to="/" className="btn-primary inline-flex px-8">متابعة التسوق</Link>
      </div>
    </div>
  );
}
