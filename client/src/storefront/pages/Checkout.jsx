import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../cart-context';
import { formatDzd } from '../utils';
import { submitCheckout } from '../api';

export default function Checkout() {
  const { items, subtotal, clearCart } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    phone: '',
    wilaya: '',
    commune: '',
    address: '',
    deliveryMethod: 'home',
    notes: ''
  });

  const deliveryPrice = 0;
  const total = useMemo(() => subtotal + deliveryPrice, [subtotal, deliveryPrice]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    if (items.length === 0) return;
    if (!form.name || !form.phone || !form.wilaya || !form.commune || !form.address) {
      setError('Please fill all required fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        customer: {
          name: form.name,
          phone: form.phone,
          wilaya: form.wilaya,
          commune: form.commune,
          address: form.address,
          deliveryMethod: form.deliveryMethod,
          deliveryPrice,
          notes: form.notes
        },
        items: items.map((item) => ({
          product_id: Number(item.productId),
          variant_id: Number(item.variantId),
          quantity: item.quantity,
          selling_price: item.price
        }))
      };

      const result = await submitCheckout(payload);
      const orderRef = result.orderNumber || result.orderId || 'order';
      clearCart();
      navigate(`/order-success/${orderRef}`);
    } catch (err) {
      setError(err.message || 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-bleed py-12">
      <h1 className="section-heading mb-8">Checkout</h1>

      {error && <p className="text-red-500 text-[13px] mb-4">{error}</p>}

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <div className="field-block">
            <label>Full name</label>
            <input className="input-field" value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div className="field-block">
            <label>Phone</label>
            <input className="input-field" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="field-block">
              <label>Wilaya</label>
              <input className="input-field" value={form.wilaya} onChange={(e) => set('wilaya', e.target.value)} />
            </div>
            <div className="field-block">
              <label>Commune</label>
              <input className="input-field" value={form.commune} onChange={(e) => set('commune', e.target.value)} />
            </div>
          </div>
          <div className="field-block">
            <label>Address</label>
            <input className="input-field" value={form.address} onChange={(e) => set('address', e.target.value)} />
          </div>
          <div className="field-block">
            <label>Notes</label>
            <textarea className="input-field" rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white/70 p-6 space-y-4">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-black/45">Subtotal</span>
            <span className="font-medium">{formatDzd(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-black/45">Delivery</span>
            <span className="font-medium">{formatDzd(deliveryPrice)}</span>
          </div>
          <div className="h-px bg-black/10" />
          <div className="flex items-center justify-between text-[14px] font-semibold">
            <span>Total</span>
            <span>{formatDzd(total)}</span>
          </div>
          <button className="btn-primary w-full" onClick={submit} disabled={loading}>
            {loading ? 'Submitting...' : 'Confirm order'}
          </button>
        </div>
      </div>
    </div>
  );
}
