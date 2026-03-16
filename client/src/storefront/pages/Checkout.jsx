import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../cart-context';
import { formatDzd } from '../utils';
import { submitCheckout, fetchCommunes, fetchDeliveryFees, fetchWilayas, fetchCenters } from '../api';

export default function Checkout() {
  const { items, subtotal, clearCart } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [wilayas, setWilayas] = useState([]);
  const [communes, setCommunes] = useState([]);
  const [centers, setCenters] = useState([]);
  const [feeLoading, setFeeLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    wilayaId: '',
    wilayaName: '',
    communeId: '',
    communeName: '',
    centerId: '',
    centerName: '',
    address: '',
    deliveryMethod: 'home',
    notes: ''
  });

  const [deliveryPrice, setDeliveryPrice] = useState(0);
  const total = useMemo(() => subtotal + deliveryPrice, [subtotal, deliveryPrice]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    let active = true;
    fetchWilayas()
      .then((data) => {
        if (!active) return;
        setWilayas(data || []);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Failed to load wilayas');
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!form.wilayaId) return;
    let active = true;
    setCommunes([]);
    setCenters([]);
    set('communeId', '');
    set('communeName', '');
    set('centerId', '');
    set('centerName', '');

    fetchCommunes(form.wilayaId)
      .then((data) => {
        if (!active) return;
        setCommunes(data || []);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Failed to load communes');
      });

    return () => {
      active = false;
    };
  }, [form.wilayaId]);

  useEffect(() => {
    if (!form.wilayaId || form.deliveryMethod !== 'stopdesk') return;
    let active = true;
    setCenters([]);
    set('centerId', '');
    set('centerName', '');

    fetchCenters({ wilayaId: form.wilayaId, communeId: form.communeId })
      .then((data) => {
        if (!active) return;
        setCenters(data || []);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Failed to load stop desk centers');
      });

    return () => {
      active = false;
    };
  }, [form.wilayaId, form.communeId, form.deliveryMethod]);

  useEffect(() => {
    if (!form.wilayaId) return;
    let active = true;
    setFeeLoading(true);
    fetchDeliveryFees({ wilayaId: form.wilayaId, isStopdesk: form.deliveryMethod === 'stopdesk' })
      .then((data) => {
        if (!active) return;
        setDeliveryPrice(Number(data?.price) || 0);
      })
      .catch(() => {
        if (!active) return;
        setDeliveryPrice(0);
      })
      .finally(() => {
        if (!active) return;
        setFeeLoading(false);
      });

    return () => {
      active = false;
    };
  }, [form.wilayaId, form.deliveryMethod]);

  const submit = async () => {
    if (items.length === 0) return;
    if (!form.name || !form.phone || !form.wilayaId || !form.communeId || (form.deliveryMethod === 'home' && !form.address)) {
      setError('Please fill all required fields.');
      return;
    }

    if (form.deliveryMethod === 'stopdesk' && !form.centerId) {
      setError('Please select a stop desk.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        customer: {
          name: form.name,
          phone: form.phone,
          wilaya: form.wilayaName,
          commune: form.communeName,
          address: form.deliveryMethod === 'stopdesk'
            ? `${form.centerName} - Bureau Yalidine`
            : form.address,
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
              <select
                className="input-field"
                value={form.wilayaId}
                onChange={(e) => {
                  const wilayaId = e.target.value;
                  const selected = wilayas.find((w) => String(w.id) === String(wilayaId));
                  set('wilayaId', wilayaId);
                  set('wilayaName', selected?.name || selected?.wilaya_name || '');
                }}
              >
                <option value="">Select wilaya</option>
                {wilayas.map((w) => (
                  <option key={w.id} value={w.id}>{w.name || w.wilaya_name}</option>
                ))}
              </select>
            </div>
            <div className="field-block">
              <label>Commune</label>
              <select
                className="input-field"
                value={form.communeId}
                onChange={(e) => {
                  const communeId = e.target.value;
                  const selected = communes.find((c) => String(c.id) === String(communeId));
                  set('communeId', communeId);
                  set('communeName', selected?.name || selected?.commune_name || '');
                }}
                disabled={!form.wilayaId}
              >
                <option value="">Select commune</option>
                {communes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name || c.commune_name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="field-block">
            <label>Delivery method</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className={`rounded-full border px-4 py-2 text-[12px] uppercase tracking-wider transition-all ${
                  form.deliveryMethod === 'home'
                    ? 'border-black bg-black text-white'
                    : 'border-black/20 text-black/70 hover:border-black'
                }`}
                onClick={() => set('deliveryMethod', 'home')}
              >
                Domicile
              </button>
              <button
                type="button"
                className={`rounded-full border px-4 py-2 text-[12px] uppercase tracking-wider transition-all ${
                  form.deliveryMethod === 'stopdesk'
                    ? 'border-black bg-black text-white'
                    : 'border-black/20 text-black/70 hover:border-black'
                }`}
                onClick={() => set('deliveryMethod', 'stopdesk')}
              >
                Bureau Yalidine
              </button>
            </div>
          </div>
          {form.deliveryMethod === 'stopdesk' && (
            <div className="field-block">
              <label>Bureau Yalidine</label>
              <select
                className="input-field"
                value={form.centerId}
                onChange={(e) => {
                  const centerId = e.target.value;
                  const selected = centers.find((c) => String(c.center_id || c.id) === String(centerId));
                  set('centerId', centerId);
                  set('centerName', selected?.name || '');
                }}
                disabled={!form.wilayaId}
              >
                <option value="">Select bureau Yalidine</option>
                {centers.map((c) => (
                  <option key={c.center_id || c.id} value={c.center_id || c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="field-block">
            <label>Address</label>
            <input
              className="input-field"
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              disabled={form.deliveryMethod === 'stopdesk'}
            />
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
            <span className="font-medium">
              {feeLoading ? '...' : formatDzd(deliveryPrice)}
            </span>
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
