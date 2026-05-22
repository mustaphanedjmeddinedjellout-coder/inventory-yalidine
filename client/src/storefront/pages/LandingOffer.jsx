import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchLandingPage, submitCheckout, fetchWilayas, fetchCommunes, fetchDeliveryFees, fetchCenters } from '../api';
import { formatDzd, resolveImageUrl } from '../utils';
import SmartImage from '../components/SmartImage';
import TrustStrip from '../components/TrustStrip';
import CustomerReviews from '../components/CustomerReviews';

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

const SIZE_PRIORITY = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

function sortSizes(sizes) {
  return [...sizes].sort((a, b) => {
    const left = a.toUpperCase();
    const right = b.toUpperCase();
    const li = SIZE_PRIORITY.indexOf(left);
    const ri = SIZE_PRIORITY.indexOf(right);
    if (li !== -1 || ri !== -1) {
      if (li === -1) return 1;
      if (ri === -1) return -1;
      return li - ri;
    }
    return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
  });
}

function ProductCard({ product, label, selectedColor }) {
  const variants = product?.variants || [];

  const displayImage = useMemo(() => {
    const colorKey = normalizeText(selectedColor);
    const extraImages = product?.color_images?.[colorKey] || [];
    if (extraImages.length > 0) return extraImages[0];
    const variantImg = variants.find((v) => normalizeText(v.color) === colorKey && v.image)?.image;
    return variantImg || product?.image || '';
  }, [variants, selectedColor, product]);

  return (
    <div className="rounded-2xl border border-black/10 bg-white/70 p-4">
      <div className="flex gap-4">
        <div className="w-24 h-28 flex-shrink-0 rounded-xl overflow-hidden bg-[#f5f1ea]">
          <SmartImage
            src={resolveImageUrl(displayImage)}
            alt={product.model_name}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-[0.2em] text-black/40 mb-1">{label}</p>
          <h3 className="text-[15px] font-semibold text-ink truncate">{product.model_name}</h3>
          {selectedColor && (
            <p className="text-[12px] text-black/50 mt-1">اللون: {selectedColor}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LandingOffer() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  const [selectedComboIdx, setSelectedComboIdx] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');

  // Order form state
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
    notes: '',
  });
  const [wilayas, setWilayas] = useState([]);
  const [communes, setCommunes] = useState([]);
  const [centers, setCenters] = useState([]);
  const [deliveryPrice, setDeliveryPrice] = useState(0);
  const [feeLoading, setFeeLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  function normalizePhoneDigits(value) {
    return String(value || '')
      .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
      .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
      .replace(/\D/g, '');
  }

  function createEventId() {
    return `purchase-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function getCookieValue(name) {
    if (typeof document === 'undefined') return '';
    const cookies = document.cookie ? document.cookie.split('; ') : [];
    for (const cookie of cookies) {
      const [key, ...rest] = cookie.split('=');
      if (key === name) return decodeURIComponent(rest.join('='));
    }
    return '';
  }

  function getTikTokTracking() {
    if (typeof window === 'undefined') return { ttclid: '', ttp: '' };
    const params = new URLSearchParams(window.location.search || '');
    const ttclidFromUrl = params.get('ttclid') || '';
    if (ttclidFromUrl) {
      try { localStorage.setItem('ttclid', ttclidFromUrl); } catch {}
    }
    let storedTtclid = '';
    try { storedTtclid = localStorage.getItem('ttclid') || ''; } catch {}
    const ttp = getCookieValue('_ttp');
    return { ttclid: ttclidFromUrl || storedTtclid || '', ttp: ttp || '' };
  }

  function scrollToField(fieldId) {
    if (typeof window === 'undefined') return;
    requestAnimationFrame(() => {
      const el = document.getElementById(fieldId);
      if (!el) return;
      const top = window.scrollY + el.getBoundingClientRect().top - 120;
      window.scrollTo({ top, behavior: 'smooth' });
      try { el.focus({ preventScroll: true }); } catch { el.focus(); }
    });
  }

  // Load landing page data
  useEffect(() => {
    if (!slug) return;
    let active = true;
    setLoading(true);
    fetchLandingPage(slug)
      .then((res) => {
        if (!active) return;
        setData(res);
        const combos = res.color_combos || [];
        setSelectedComboIdx(0);
        if (combos.length > 0) {
          const c = combos[0];
          const v1 = res.product1?.variants?.find((v) => normalizeText(v.color) === normalizeText(c.p1_color) && v.quantity > 0);
          if (v1) setSelectedSize(v1.size || '');
        } else {
          const v1 = res.product1?.variants?.find((v) => v.quantity > 0);
          if (v1) setSelectedSize(v1.size || '');
        }
      })
      .catch((err) => {
        if (!active) return;
        setPageError(err.message || 'العرض غير متوفر');
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => { active = false; };
  }, [slug]);

  // Meta Pixel ViewContent
  useEffect(() => {
    if (!data || typeof window === 'undefined' || !window.fbq) return;
    window.fbq('track', 'ViewContent', {
      content_type: 'product',
      content_ids: [String(data.product1.id), String(data.product2.id)],
      content_name: data.title,
      currency: 'DZD',
      value: Number(data.offer_price || 0),
    });
  }, [data]);

  // Load wilayas
  useEffect(() => {
    let active = true;
    fetchWilayas()
      .then((d) => { if (active) setWilayas(d || []); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  // Load communes when wilaya changes
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
      .then((d) => { if (active) setCommunes(d || []); })
      .catch(() => {});
    return () => { active = false; };
  }, [form.wilayaId]);

  // Load centers for stopdesk
  useEffect(() => {
    if (!form.wilayaId || form.deliveryMethod !== 'stopdesk') return;
    let active = true;
    setCenters([]);
    set('centerId', '');
    set('centerName', '');
    fetchCenters({ wilayaId: form.wilayaId, communeId: form.communeId })
      .then((d) => { if (active) setCenters(d || []); })
      .catch(() => {});
    return () => { active = false; };
  }, [form.wilayaId, form.communeId, form.deliveryMethod]);

  // Calculate delivery fee
  useEffect(() => {
    if (!form.wilayaId) return;
    let active = true;
    setFeeLoading(true);
    fetchDeliveryFees({
      wilayaId: form.wilayaId,
      communeId: form.communeId,
      isStopdesk: form.deliveryMethod === 'stopdesk',
    })
      .then((d) => {
        if (!active) return;
        const basePrice = Number(d?.price) || 0;
        setDeliveryPrice(Math.max(0, basePrice - 100));
      })
      .catch(() => { if (active) setDeliveryPrice(0); })
      .finally(() => { if (active) setFeeLoading(false); });
    return () => { active = false; };
  }, [form.wilayaId, form.deliveryMethod, form.communeId]);

  const combos = data?.color_combos || [];
  const activeCombo = combos[selectedComboIdx] || null;

  const p1Color = activeCombo ? activeCombo.p1_color : '';
  const p2Color = activeCombo ? activeCombo.p2_color : '';

  const variant1 = useMemo(() => {
    if (!data?.product1 || !p1Color) return null;
    return data.product1.variants.find(
      (v) => normalizeText(v.color) === normalizeText(p1Color) && normalizeText(v.size) === normalizeText(selectedSize)
    );
  }, [data, p1Color, selectedSize]);

  const variant2 = useMemo(() => {
    if (!data?.product2 || !p2Color) return null;
    return data.product2.variants.find(
      (v) => normalizeText(v.color) === normalizeText(p2Color) && normalizeText(v.size) === normalizeText(selectedSize)
    );
  }, [data, p2Color, selectedSize]);

  // Shared sizes — only show sizes available in BOTH products for the selected combo colors
  const sharedSizes = useMemo(() => {
    if (!data?.product1 || !data?.product2) return [];
    const p1Variants = data.product1.variants || [];
    const p2Variants = data.product2.variants || [];
    const p1Sizes = new Set(p1Variants.filter((v) => normalizeText(v.color) === normalizeText(p1Color)).map((v) => String(v.size || '').trim()));
    const p2Sizes = new Set(p2Variants.filter((v) => normalizeText(v.color) === normalizeText(p2Color)).map((v) => String(v.size || '').trim()));
    const shared = [...p1Sizes].filter((s) => s && p2Sizes.has(s));
    return sortSizes(shared);
  }, [data, p1Color, p2Color]);

  const canOrder = variant1 && variant1.quantity > 0 && variant2 && variant2.quantity > 0;

  const total = useMemo(() => {
    if (!data) return 0;
    return data.offer_price + deliveryPrice;
  }, [data, deliveryPrice]);

  async function handleSubmit() {
    if (!canOrder || !data) return;

    if (!form.name.trim()) {
      setFormError('يرجى ملء جميع الحقول المطلوبة.');
      scrollToField('lp-name');
      return;
    }
    if (!form.phone.trim()) {
      setFormError('يرجى ملء جميع الحقول المطلوبة.');
      scrollToField('lp-phone');
      return;
    }
    if (!form.wilayaId) {
      setFormError('يرجى ملء جميع الحقول المطلوبة.');
      scrollToField('lp-wilaya');
      return;
    }
    if (!form.communeId) {
      setFormError('يرجى ملء جميع الحقول المطلوبة.');
      scrollToField('lp-commune');
      return;
    }
    if (form.deliveryMethod === 'home' && !form.address.trim()) {
      setFormError('يرجى ملء جميع الحقول المطلوبة.');
      scrollToField('lp-address');
      return;
    }
    const normalizedPhone = normalizePhoneDigits(form.phone);
    if (!/^\d{10}$/.test(normalizedPhone)) {
      setFormError('رقم هاتفك غير صحيح. يجب أن يكون 10 أرقام.');
      scrollToField('lp-phone');
      return;
    }
    if (form.deliveryMethod === 'stopdesk' && !form.centerId) {
      setFormError('يرجى اختيار مكتب الاستلام.');
      scrollToField('lp-center');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const p1 = data.product1;
      const p2 = data.product2;
      const pricePerItem1 = Math.round(data.offer_price * (p1.selling_price / (p1.selling_price + p2.selling_price)));
      const pricePerItem2 = data.offer_price - pricePerItem1;

      const eventId = createEventId();
      const eventSourceUrl = typeof window !== 'undefined' ? window.location.href : '';
      const tiktokTracking = getTikTokTracking();

      const payload = {
        customer: {
          name: form.name,
          phone: normalizedPhone,
          wilaya: form.wilayaName,
          commune: form.communeName,
          eventId,
          eventSourceUrl,
          ttclid: tiktokTracking.ttclid,
          ttp: tiktokTracking.ttp,
          address: form.deliveryMethod === 'stopdesk'
            ? `${form.centerName} - Bureau Yalidine`
            : form.address,
          centerId: form.centerId,
          deliveryMethod: form.deliveryMethod,
          deliveryPrice,
          notes: form.notes,
        },
        bundleDiscount: 0,
        items: [
          {
            product_id: Number(p1.id),
            variant_id: Number(variant1.id),
            quantity: 1,
            selling_price: pricePerItem1,
          },
          {
            product_id: Number(p2.id),
            variant_id: Number(variant2.id),
            quantity: 1,
            selling_price: pricePerItem2,
          },
        ],
      };

      const result = await submitCheckout(payload);
      const orderRef = result.orderNumber || result.orderId || 'order';

      if (typeof window !== 'undefined' && window.fbq) {
        window.fbq(
          'track',
          'Purchase',
          {
            currency: 'DZD',
            value: Number(total.toFixed(2)),
            content_type: 'product',
            content_ids: [String(p1.id), String(p2.id)],
            num_items: 2,
          },
          { eventID: eventId }
        );
      }

      navigate(`/order-success/${orderRef}`);
    } catch (err) {
      setFormError(err.message || 'فشل إتمام الطلب');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="container-bleed py-16 text-[13px] text-black/50 text-center">جار التحميل...</div>;
  }

  if (pageError || !data) {
    return (
      <div className="container-bleed py-16 text-center">
        <p className="text-red-500 text-[13px]">{pageError || 'العرض غير متوفر'}</p>
      </div>
    );
  }

  const discount = data.original_price ? Math.round(((data.original_price - data.offer_price) / data.original_price) * 100) : 0;

  return (
    <div className="container-bleed py-6 pb-36 sm:py-10 sm:pb-12">
      {/* Hero section */}
      <div className="text-center mb-8">
        {discount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-[12px] font-semibold text-red-600 mb-3">
            وفّر {discount}%
          </span>
        )}
        <h1 className="text-2xl sm:text-3xl font-display text-ink leading-tight">{data.title}</h1>
        {data.subtitle && (
          <p className="mt-2 text-[14px] text-black/55">{data.subtitle}</p>
        )}
        <div className="mt-4 flex items-baseline justify-center gap-3">
          <span className="text-2xl font-bold text-ink">{formatDzd(data.offer_price)}</span>
          {data.original_price && (
            <span className="text-[14px] text-black/35 line-through">{formatDzd(data.original_price)}</span>
          )}
        </div>
      </div>

      {/* Banner image — combo-specific or fallback */}
      {(() => {
        const comboImg = activeCombo?.image;
        const displayImg = comboImg || data.image;
        if (!displayImg) return null;
        return (
          <div className="mb-8 mx-auto max-w-lg rounded-2xl overflow-hidden">
            <img src={resolveImageUrl(displayImg)} alt={data.title} className="w-full h-auto" />
          </div>
        );
      })()}

      {/* Combo picker + size selectors */}
      <div className="max-w-lg mx-auto space-y-4">
        {/* Combo picker */}
        {combos.length > 0 && (
          <div className="rounded-2xl border border-black/10 bg-white/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-black/40 mb-2">اختر اللون</p>
            <div className="flex flex-wrap gap-2">
              {combos.map((combo, idx) => {
                const label = combo.p1_color === combo.p2_color
                  ? combo.p1_color
                  : `${combo.p1_color} + ${combo.p2_color}`;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedComboIdx(idx);
                      // Find first size available in both products for this combo
                      const p1v = data.product1.variants.filter((v) => normalizeText(v.color) === normalizeText(combo.p1_color) && v.quantity > 0);
                      const p2v = data.product2.variants.filter((v) => normalizeText(v.color) === normalizeText(combo.p2_color) && v.quantity > 0);
                      const p2Sizes = new Set(p2v.map((v) => normalizeText(v.size)));
                      const firstShared = p1v.find((v) => p2Sizes.has(normalizeText(v.size)));
                      setSelectedSize(firstShared?.size || p1v[0]?.size || '');
                    }}
                    className={`rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-wider transition-all ${
                      selectedComboIdx === idx
                        ? 'border-black bg-black text-white'
                        : 'border-black/20 text-black/70 hover:border-black'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Shared size picker */}
        {sharedSizes.length > 0 && (
          <div className="rounded-2xl border border-black/10 bg-white/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-black/40 mb-2">المقاس</p>
            <div className="flex flex-wrap gap-2">
              {sharedSizes.map((size) => {
                const p1Ok = (data.product1.variants || []).some(
                  (v) => normalizeText(v.color) === normalizeText(p1Color) && normalizeText(v.size) === normalizeText(size) && v.quantity > 0
                );
                const p2Ok = (data.product2.variants || []).some(
                  (v) => normalizeText(v.color) === normalizeText(p2Color) && normalizeText(v.size) === normalizeText(size) && v.quantity > 0
                );
                const isAvailable = p1Ok && p2Ok;
                return (
                  <button
                    key={size}
                    type="button"
                    disabled={!isAvailable}
                    onClick={() => setSelectedSize(size)}
                    className={`rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-wider transition-all ${
                      normalizeText(selectedSize) === normalizeText(size)
                        ? 'border-black bg-black text-white'
                        : isAvailable
                        ? 'border-black/20 text-black/70 hover:border-black'
                        : 'border-black/10 text-black/30'
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {!canOrder && (
          <p className="text-center text-[12px] text-red-500">يرجى اختيار المقاس المتوفر</p>
        )}

        <TrustStrip />

        {/* Urgency */}
        <div className="text-center py-3 rounded-xl bg-amber-50 border border-amber-200">
          <p className="text-[13px] font-semibold text-amber-800">العرض محدود - لا تفوت الفرصة!</p>
        </div>

        {/* Inline Order Form */}
        <div className="rounded-2xl border border-black/10 bg-white/70 p-5 space-y-4 mt-6">
          <h2 className="text-[15px] font-semibold text-ink">معلومات الطلب</h2>
          <p className="text-[12px] text-black/45">الدفع عند الاستلام — املأ بياناتك وسنوصل لك</p>

          {formError && <p className="text-red-500 text-[12px] bg-red-50 rounded-lg px-3 py-2">{formError}</p>}

          <div className="field-block">
            <label className="text-[12px] text-black/50 mb-1 block">الاسم الكامل *</label>
            <input
              id="lp-name"
              className="input-field"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>

          <div className="field-block">
            <label className="text-[12px] text-black/50 mb-1 block">الهاتف *</label>
            <input
              id="lp-phone"
              className="input-field"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              inputMode="numeric"
              maxLength={10}
              placeholder="0XXXXXXXXX"
            />
          </div>

          <div className="field-block">
            <label className="text-[12px] text-black/50 mb-1 block">طريقة التوصيل</label>
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
                للمنزل
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
                مكتب ياليدين
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="field-block">
              <label className="text-[12px] text-black/50 mb-1 block">الولاية *</label>
              <select
                id="lp-wilaya"
                className="input-field"
                value={form.wilayaId}
                onChange={(e) => {
                  const wilayaId = e.target.value;
                  const selected = wilayas.find((w) => String(w.id) === String(wilayaId));
                  set('wilayaId', wilayaId);
                  set('wilayaName', selected?.name || selected?.wilaya_name || '');
                }}
              >
                <option value="">اختر الولاية</option>
                {wilayas.map((w) => (
                  <option key={w.id} value={w.id}>{w.name || w.wilaya_name}</option>
                ))}
              </select>
            </div>
            <div className="field-block">
              <label className="text-[12px] text-black/50 mb-1 block">البلدية *</label>
              <select
                id="lp-commune"
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
                <option value="">اختر البلدية</option>
                {communes
                  .filter((c) => form.deliveryMethod !== 'stopdesk' || c.has_stop_desk)
                  .map((c) => (
                    <option key={c.id} value={c.id}>{c.name || c.commune_name}</option>
                  ))}
              </select>
            </div>
          </div>

          {form.deliveryMethod === 'stopdesk' && (
            <div className="field-block">
              <label className="text-[12px] text-black/50 mb-1 block">مكتب ياليدين *</label>
              <select
                id="lp-center"
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
                <option value="">اختر مكتب ياليدين</option>
                {centers.map((c) => (
                  <option key={c.center_id || c.id} value={c.center_id || c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {form.deliveryMethod === 'home' && (
            <div className="field-block">
              <label className="text-[12px] text-black/50 mb-1 block">العنوان *</label>
              <input
                id="lp-address"
                className="input-field"
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
              />
            </div>
          )}

          <div className="field-block">
            <label className="text-[12px] text-black/50 mb-1 block">ملاحظات</label>
            <textarea className="input-field" rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>

          {/* Price Summary */}
          <div className="border-t border-black/10 pt-4 space-y-2">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-black/45">سعر العرض</span>
              <span className="font-medium">{formatDzd(data.offer_price)}</span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-black/45">التوصيل</span>
              <span className="font-medium">{feeLoading ? '...' : formatDzd(deliveryPrice)}</span>
            </div>
            <div className="h-px bg-black/10" />
            <div className="flex items-center justify-between text-[15px] font-semibold">
              <span>الإجمالي</span>
              <span>{formatDzd(total)}</span>
            </div>
          </div>

          {/* Submit */}
          <button
            type="button"
            className="w-full rounded-full bg-black text-white py-3.5 text-[13px] font-semibold uppercase tracking-wider hover:bg-black/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!canOrder || submitting}
            onClick={handleSubmit}
          >
            {submitting ? 'جار الإرسال...' : `تأكيد الطلب · ${formatDzd(total)}`}
          </button>
        </div>
      </div>

      <CustomerReviews />
    </div>
  );
}
