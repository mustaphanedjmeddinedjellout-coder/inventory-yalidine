import { Link, useParams } from 'react-router-dom';

export default function OrderSuccess() {
  const { id } = useParams();
  const instagramUrl = (import.meta.env.VITE_INSTAGRAM_URL || 'https://www.instagram.com/noire.luxewear/').trim();

  return (
    <div className="container-bleed py-20 text-center">
      <div className="mx-auto max-w-md space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <span className="text-2xl">✓</span>
        </div>
        <h1 className="text-2xl font-display text-ink">تم تأكيد الطلب</h1>
        <p className="text-[13px] text-black/45">تم استلام طلبك وحجز المخزون.</p>
        <div className="rounded-2xl border border-black/10 bg-white/70 px-6 py-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-black/40">رقم الطلب</p>
          <p className="mt-2 text-[20px] font-semibold text-ink">{id}</p>
        </div>

        <div className="rounded-2xl border border-pink-200 bg-pink-50 px-5 py-4 text-right">
          <p className="text-[13px] text-pink-900 leading-relaxed">
            تابعونا على انستغرام لمعرفة <span className="font-semibold">الوصولات الجديدة</span> وكل المعلومات والتفاصيل أولاً بأول.
          </p>
          <a
            href={instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-pink-700 hover:text-pink-900"
          >
            حسابنا على انستغرام
          </a>
        </div>

        <Link to="/" className="btn-primary inline-flex px-8">متابعة التسوق</Link>
      </div>
    </div>
  );
}
