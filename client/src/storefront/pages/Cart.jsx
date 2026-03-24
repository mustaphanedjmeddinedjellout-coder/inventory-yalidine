import { Link } from 'react-router-dom';
import { useCart } from '../cart-context';
import { formatDzd } from '../utils';
import QuantityPicker from '../components/QuantityPicker';

export default function Cart() {
  const { items, subtotal, updateQty, removeItem } = useCart();

  if (items.length === 0) {
    return (
      <div className="container-bleed py-20 text-center">
        <p className="text-[14px] text-black/50">سلتك فارغة.</p>
        <Link to="/" className="btn-primary mt-6 inline-flex px-8">
          متابعة التسوق
        </Link>
      </div>
    );
  }

  return (
    <div className="container-bleed py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="section-heading">سلة المشتريات</h1>
        <span className="text-[12px] text-black/40">{items.length} منتجات</span>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.variantId} className="rounded-2xl border border-black/10 bg-white/70 p-5">
            <div className="flex gap-4">
              <img
                src={item.image}
                alt={item.title}
                loading="lazy"
                decoding="async"
                className="h-24 w-20 object-cover rounded-xl bg-[#efeae2]"
                onError={(e) => {
                  e.target.src = '/placeholder-product.svg';
                }}
              />
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[14px] font-medium text-ink">{item.title}</p>
                    <p className="text-[12px] text-black/45">{item.color} / {item.size}</p>
                  </div>
                  <p className="text-[13px] font-semibold">{formatDzd(item.price * item.quantity)}</p>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <QuantityPicker value={item.quantity} onChange={(qty) => updateQty(item, qty)} />
                  <button
                    type="button"
                    className="text-[12px] text-black/35 hover:text-red-500"
                    onClick={() => removeItem(item)}
                  >
                    حذف
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-black/10 bg-white/70 p-6">
        <div className="flex items-center justify-between">
          <span className="text-[12px] uppercase tracking-[0.3em] text-black/40">المجموع الفرعي</span>
          <span className="text-[16px] font-semibold">{formatDzd(subtotal)}</span>
        </div>
      </div>

      <Link
        to="/"
        className="mt-6 inline-flex w-full items-center justify-center rounded-full border border-black bg-transparent px-6 py-3 text-[0.75rem] uppercase tracking-[0.3em] text-black transition-colors hover:bg-black hover:text-white"
      >
        أضف منتجا آخر
      </Link>
      <Link to="/checkout" className="btn-primary mt-6 inline-flex w-full justify-center">
        تأكيد الطلب
      </Link>
    </div>
  );
}
