import { useEffect, useMemo, useRef, useState } from 'react';
import { landingPageApi, productApi } from '../api';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import { Plus, Edit, Trash2, ExternalLink, Copy, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { resolveImageUrl } from '../storefront/utils';

const emptyForm = {
  slug: '',
  title: '',
  subtitle: '',
  product1_id: '',
  product2_id: '',
  offer_price: '',
  original_price: '',
  image: '',
  color_combos: [],
  active: true,
};

function getUniqueColors(product) {
  if (!product?.variants) return [];
  const map = new Map();
  for (const v of product.variants) {
    const color = String(v.color || '').trim();
    if (!color || map.has(color)) continue;
    map.set(color, true);
  }
  return Array.from(map.keys());
}

function ImageUploadField({ label, value, onChange, uploading, onUpload }) {
  const inputRef = useRef(null);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        {value ? (
          <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
            <img src={resolveImageUrl(value)} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute top-0 right-0 bg-red-500 text-white rounded-bl-lg p-0.5"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <div className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 flex-shrink-0">
            <Upload size={18} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
          >
            {uploading ? 'جار الرفع...' : value ? 'تغيير الصورة' : 'رفع صورة'}
          </button>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          {value && <p className="text-[10px] text-gray-400 truncate mt-0.5" dir="ltr">{value}</p>}
        </div>
      </div>
    </div>
  );
}

export default function LandingPages() {
  const [pages, setPages] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState({});

  useEffect(() => {
    loadPages();
    loadProducts();
  }, []);

  async function loadPages() {
    try {
      setLoading(true);
      const res = await landingPageApi.getAll();
      setPages(res.data || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadProducts() {
    try {
      const res = await productApi.getAll({});
      setProducts(res.data || []);
    } catch (err) {
      toast.error('فشل تحميل المنتجات');
    }
  }

  async function uploadImage(fieldKey, file) {
    if (!file) return;
    try {
      setUploading((prev) => ({ ...prev, [fieldKey]: true }));
      const formData = new FormData();
      formData.append('file', file);
      const res = await productApi.uploadImage(formData);
      const imagePath = res.data?.path;
      if (!imagePath) throw new Error('Upload failed');
      set(fieldKey, imagePath);
      toast.success('تم رفع الصورة');
    } catch (err) {
      toast.error(err.message || 'تعذر رفع الصورة');
    } finally {
      setUploading((prev) => ({ ...prev, [fieldKey]: false }));
    }
  }

  async function uploadComboImage(comboIdx, file) {
    if (!file) return;
    const key = `combo_${comboIdx}`;
    try {
      setUploading((prev) => ({ ...prev, [key]: true }));
      const formData = new FormData();
      formData.append('file', file);
      const res = await productApi.uploadImage(formData);
      const imagePath = res.data?.path;
      if (!imagePath) throw new Error('Upload failed');
      setForm((prev) => {
        const combos = [...prev.color_combos];
        combos[comboIdx] = { ...combos[comboIdx], image: imagePath };
        return { ...prev, color_combos: combos };
      });
      toast.success('تم رفع الصورة');
    } catch (err) {
      toast.error(err.message || 'تعذر رفع الصورة');
    } finally {
      setUploading((prev) => ({ ...prev, [key]: false }));
    }
  }

  function addCombo() {
    setForm((prev) => ({
      ...prev,
      color_combos: [...prev.color_combos, { p1_color: '', p2_color: '', image: '' }],
    }));
  }

  function removeCombo(idx) {
    setForm((prev) => ({
      ...prev,
      color_combos: prev.color_combos.filter((_, i) => i !== idx),
    }));
  }

  function updateCombo(idx, field, value) {
    setForm((prev) => {
      const combos = [...prev.color_combos];
      combos[idx] = { ...combos[idx], [field]: value };
      return { ...prev, color_combos: combos };
    });
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
  }

  function openEdit(page) {
    setEditing(page);
    const combos = page.color_combos
      ? (typeof page.color_combos === 'string' ? JSON.parse(page.color_combos) : page.color_combos)
      : [];
    setForm({
      slug: page.slug,
      title: page.title,
      subtitle: page.subtitle || '',
      product1_id: String(page.product1_id),
      product2_id: String(page.product2_id),
      offer_price: String(page.offer_price),
      original_price: page.original_price ? String(page.original_price) : '',
      image: page.image || '',
      color_combos: combos,
      active: Boolean(page.active),
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.slug || !form.title || !form.product1_id || !form.product2_id || !form.offer_price) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setSaving(true);
    try {
      const validCombos = form.color_combos.filter((c) => c.p1_color && c.p2_color);
      const payload = {
        slug: form.slug.trim().toLowerCase().replace(/\s+/g, '-'),
        title: form.title,
        subtitle: form.subtitle || null,
        product1_id: Number(form.product1_id),
        product2_id: Number(form.product2_id),
        offer_price: Number(form.offer_price),
        original_price: form.original_price ? Number(form.original_price) : null,
        image: form.image || null,
        color_combos: validCombos.length > 0 ? validCombos : null,
        active: form.active,
      };

      if (editing) {
        await landingPageApi.update(editing.id, payload);
        toast.success('تم التحديث');
      } else {
        await landingPageApi.create(payload);
        toast.success('تم الإنشاء');
      }

      setModalOpen(false);
      loadPages();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(page) {
    if (!confirm(`حذف "${page.title}"?`)) return;
    try {
      await landingPageApi.delete(page.id);
      toast.success('تم الحذف');
      loadPages();
    } catch (err) {
      toast.error(err.message);
    }
  }

  function copyLink(slug) {
    const url = `${window.location.origin}/offer/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('تم نسخ الرابط');
  }

  function getProductName(id) {
    const p = products.find((pr) => pr.id === Number(id));
    return p ? p.model_name : `#${id}`;
  }

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const product1Data = useMemo(() => products.find((p) => String(p.id) === form.product1_id), [products, form.product1_id]);
  const product2Data = useMemo(() => products.find((p) => String(p.id) === form.product2_id), [products, form.product2_id]);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">صفحات العروض</h1>
        <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus size={18} />
          إنشاء عرض جديد
        </button>
      </div>

      {pages.length === 0 ? (
        <p className="text-gray-500 text-center py-12">لا توجد عروض بعد</p>
      ) : (
        <div className="grid gap-4">
          {pages.map((page) => (
            <div key={page.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {page.image && (
                  <img src={resolveImageUrl(page.image)} alt="" className="w-14 h-14 rounded-lg object-cover border border-gray-100" />
                )}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{page.title}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${page.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {page.active ? 'نشط' : 'متوقف'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {getProductName(page.product1_id)} + {getProductName(page.product2_id)} — <strong>{page.offer_price} DZD</strong>
                  </p>
                  <p className="text-xs text-gray-400">/offer/{page.slug}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => copyLink(page.slug)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="نسخ الرابط">
                  <Copy size={16} />
                </button>
                <a href={`/offer/${page.slug}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="معاينة">
                  <ExternalLink size={16} />
                </a>
                <button onClick={() => openEdit(page)} className="p-2 rounded-lg hover:bg-gray-100 text-blue-600" title="تعديل">
                  <Edit size={16} />
                </button>
                <button onClick={() => handleDelete(page)} className="p-2 rounded-lg hover:bg-gray-100 text-red-600" title="حذف">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'تعديل العرض' : 'إنشاء عرض جديد'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">عنوان العرض *</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="عرض خاص - تيشيرت + بنطلون"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الرابط (slug) *</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              value={form.slug}
              onChange={(e) => set('slug', e.target.value.replace(/\s+/g, '-').toLowerCase())}
              placeholder="summer-offer"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">وصف فرعي</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              value={form.subtitle}
              onChange={(e) => set('subtitle', e.target.value)}
              placeholder="اشتري 2 بسعر واحد"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">المنتج الأول *</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                value={form.product1_id}
                onChange={(e) => set('product1_id', e.target.value)}
              >
                <option value="">اختر المنتج</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.model_name} ({p.category})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">المنتج الثاني *</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                value={form.product2_id}
                onChange={(e) => set('product2_id', e.target.value)}
              >
                <option value="">اختر المنتج</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.model_name} ({p.category})</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">سعر العرض (DZD) *</label>
              <input
                type="number"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                value={form.offer_price}
                onChange={(e) => set('offer_price', e.target.value)}
                placeholder="5000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">السعر الأصلي (DZD)</label>
              <input
                type="number"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                value={form.original_price}
                onChange={(e) => set('original_price', e.target.value)}
                placeholder="7000"
              />
            </div>
          </div>

          {/* Color Combos */}
          {form.product1_id && form.product2_id && (
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">كومبوهات الألوان</p>
                <button type="button" onClick={addCombo} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                  <Plus size={14} /> إضافة كومبو
                </button>
              </div>
              <p className="text-[11px] text-gray-400">كل كومبو = لون من المنتج الأول + لون من المنتج الثاني + صورة. العميل يختار كومبو واحد ثم يحدد المقاسات.</p>

              {form.color_combos.length === 0 && (
                <p className="text-[12px] text-gray-400 text-center py-3 bg-gray-50 rounded-lg">لا توجد كومبوهات — سيظهر كل الألوان للعميل</p>
              )}

              {form.color_combos.map((combo, idx) => (
                <div key={idx} className="border border-gray-200 rounded-xl p-3 space-y-3 bg-gray-50/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">كومبو {idx + 1}</span>
                    <button type="button" onClick={() => removeCombo(idx)} className="text-red-500 hover:text-red-600 p-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-gray-500 mb-1 block">لون المنتج الأول ({product1Data?.model_name || ''})</label>
                      <select
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                        value={combo.p1_color}
                        onChange={(e) => updateCombo(idx, 'p1_color', e.target.value)}
                      >
                        <option value="">اختر اللون</option>
                        {getUniqueColors(product1Data).map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-500 mb-1 block">لون المنتج الثاني ({product2Data?.model_name || ''})</label>
                      <select
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                        value={combo.p2_color}
                        onChange={(e) => updateCombo(idx, 'p2_color', e.target.value)}
                      >
                        <option value="">اختر اللون</option>
                        {getUniqueColors(product2Data).map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <ImageUploadField
                    label="صورة الكومبو"
                    value={combo.image || ''}
                    onChange={(val) => updateCombo(idx, 'image', val)}
                    uploading={uploading[`combo_${idx}`]}
                    onUpload={(file) => uploadComboImage(idx, file)}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-gray-100 pt-4">
            <ImageUploadField
              label="صورة البانر الاحتياطية"
              value={form.image}
              onChange={(val) => set('image', val)}
              uploading={uploading.image}
              onUpload={(file) => uploadImage('image', file)}
            />
            <p className="text-[11px] text-gray-400 mt-1">تظهر إذا لم يكن للكومبو صورة خاصة</p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active-toggle"
              checked={form.active}
              onChange={(e) => set('active', e.target.checked)}
              className="rounded"
            />
            <label htmlFor="active-toggle" className="text-sm text-gray-700">نشط (مرئي للعملاء)</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              إلغاء
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'جار الحفظ...' : editing ? 'تحديث' : 'إنشاء'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
