import { Link } from 'react-router-dom';
import { useCart } from '../cart-context';
import { formatDzd } from '../utils';
import QuantityPicker from '../components/QuantityPicker';

export default function Cart() {
  const { items, subtotal, updateQty, removeItem } = useCart();

  if (items.length === 0) {
    return (
      <div className="container-bleed py-20 text-center">
        <p className="text-[14px] text-black/50">Your cart is empty.</p>
        <Link to="/" className="btn-primary mt-6 inline-flex px-8">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="container-bleed py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="section-heading">Your Bag</h1>
        <span className="text-[12px] text-black/40">{items.length} items</span>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.variantId} className="rounded-2xl border border-black/10 bg-white/70 p-5">
            <div className="flex gap-4">
              <img
                src={item.image}
                alt={item.title}
                className="h-24 w-20 object-cover rounded-xl bg-[#efeae2]"
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
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-black/10 bg-white/70 p-6">
        <div className="flex items-center justify-between">
          <span className="text-[12px] uppercase tracking-[0.3em] text-black/40">Subtotal</span>
          <span className="text-[16px] font-semibold">{formatDzd(subtotal)}</span>
        </div>
      </div>

      <Link to="/" className="btn-primary mt-6 inline-flex w-full justify-center">
        Add another product
      </Link>
      <Link to="/checkout" className="btn-primary mt-6 inline-flex w-full justify-center">
        Proceed to checkout
      </Link>
    </div>
  );
}
