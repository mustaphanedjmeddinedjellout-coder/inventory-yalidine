import { Link, useParams } from 'react-router-dom';

export default function OrderSuccess() {
  const { id } = useParams();

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
        <Link to="/" className="btn-primary inline-flex px-8">متابعة التسوق</Link>
      </div>
    </div>
  );
}
