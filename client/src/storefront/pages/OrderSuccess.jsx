import { Link, useParams } from 'react-router-dom';
import { Instagram } from 'lucide-react';

export default function OrderSuccess() {
  const { id } = useParams();
  const instagramUrl = (import.meta.env.VITE_INSTAGRAM_URL || 'https://www.instagram.com/noire.luxewear/').trim();

  return (
    <div className="container-bleed py-20 text-center">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <span className="text-2xl">✓</span>
        </div>
        <h1 className="text-2xl font-display text-ink">تم تأكيد الطلب</h1>
        <p className="text-[13px] text-black/45">تم استلام طلبك وحجز المخزون.</p>
        <div className="rounded-2xl border border-black/10 bg-white/70 px-6 py-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-black/40">رقم الطلب</p>
          <p className="mt-2 text-[20px] font-semibold text-ink">{id}</p>
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
