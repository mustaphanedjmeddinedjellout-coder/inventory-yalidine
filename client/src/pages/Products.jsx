/**
 * Products Page
 * Full CRUD for products with variant management.
 */
import { useEffect, useMemo, useState } from 'react';
import { productApi } from '../api';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import { Plus, Edit, Trash2, Search, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { resolveImageUrl } from '../storefront/utils';

const CATEGORIES = ['T-Shirt', 'Pants', 'Shoes'];
const CATEGORY_LABELS = { 'T-Shirt': 'تيشيرت', Pants: 'بنطلون', Shoes: 'حذاء' };

const emptyProduct = {
  model_name: '',
  category: 'T-Shirt',
  selling_price: '',
  cost_price: '',
  image: '',
  variants: [{ color: '', size: '', quantity: 0, image: '' }],
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...emptyProduct });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState({});
  const [stockSql, setStockSql] = useState('');
  const [runningStockSql, setRunningStockSql] = useState(false);

  useEffect(() => {
    loadProducts();
  }, [search, filterCategory]);

  function normalizeColor(color) {
    return String(color || '').trim().toLowerCase();
  }

  function propagateColorImages(variants) {
    const imageByColor = new Map();

    for (const v of variants) {
      const key = normalizeColor(v.color);
      if (!key) continue;
      if (v.image && !imageByColor.has(key)) {
        imageByColor.set(key, v.image);
      }
    }

    return variants.map((v) => {
      const key = normalizeColor(v.color);
      if (!key || v.image) return v;
      return { ...v, image: imageByColor.get(key) || '' };
    });
  }

  async function loadProducts() {
    try {
      setLoading(true);
      const res = await productApi.getAll({ search, category: filterCategory });
      setProducts(res.data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyProduct, variants: [{ color: '', size: '', quantity: 0, image: '' }] });
    setModalOpen(true);
  }

  function openEdit(product) {
    setEditing(product);
    setForm({
      model_name: product.model_name,
      category: product.category,
      selling_price: product.selling_price,
      cost_price: product.cost_price,
      image: product.image || '',
      variants: product.variants.length > 0 ? product.variants.map((v) => ({ ...v })) : [{ color: '', size: '', quantity: 0, image: '' }],
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.model_name || !form.selling_price || !form.cost_price) {
      return toast.error('يرجى تعبئة جميع الحقول المطلوبة');
    }
    try {
      setSaving(true);
      const data = {
        ...form,
        selling_price: parseFloat(form.selling_price),
        cost_price: parseFloat(form.cost_price),
        variants: propagateColorImages(form.variants).map((v) => ({
          ...v,
          quantity: parseInt(v.quantity) || 0,
        })),
      };

      if (editing) {
        await productApi.update(editing.id, data);
        toast.success('تم تحديث المنتج بنجاح');
      } else {
        await productApi.create(data);
        toast.success('تم إضافة المنتج بنجاح');
      }
      setModalOpen(false);
      loadProducts();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    try {
      await productApi.delete(id);
      toast.success('تم حذف المنتج');
      loadProducts();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function runStockSql() {
    const sql = stockSql.trim();
    if (!sql) {
      return toast.error('أدخل سطر SQL أولاً');
    }

    if (!window.confirm('سيتم تنفيذ هذا السطر مباشرة على المخزون. هل أنت متأكد؟')) {
      return;
    }

    try {
      setRunningStockSql(true);
      const res = await productApi.runStockSql(sql);
      const rows = res?.data?.rowsAffected || 0;
      toast.success(`تم التحديث بنجاح (${rows} صف)`);
      loadProducts();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRunningStockSql(false);
    }
  }

  function addVariant() {
    setForm((f) => ({ ...f, variants: [...f.variants, { color: '', size: '', quantity: 0, image: '' }] }));
  }

  function removeVariant(index) {
    setForm((f) => ({ ...f, variants: f.variants.filter((_, i) => i !== index) }));
  }

  function updateVariant(index, field, value) {
    setForm((f) => {
      const variants = [...f.variants];
      variants[index] = { ...variants[index], [field]: value };
      return { ...f, variants };
    });
  }

  async function uploadColorImage(colorKey, file) {
    if (!file) return;
    try {
      setUploading((prev) => ({ ...prev, [colorKey]: true }));
      const formData = new FormData();
      formData.append('file', file);
      const res = await productApi.uploadImage(formData);
      const imagePath = res.data?.path;
      if (!imagePath) throw new Error('Upload failed');
      setForm((f) => {
        const variants = f.variants.map((variant) => {
          const currentColor = normalizeColor(variant.color);
          if (colorKey && currentColor === colorKey) {
            return { ...variant, image: imagePath };
          }
          return variant;
        });
        return { ...f, variants, image: f.image || imagePath };
      });
      toast.success('تم رفع الصورة');
    } catch (err) {
      toast.error(err.message || 'تعذر رفع الصورة');
    } finally {
      setUploading((prev) => ({ ...prev, [colorKey]: false }));
    }
  }

  function clearColorImage(colorKey) {
    setForm((f) => ({
      ...f,
      variants: f.variants.map((variant) => {
        const currentColor = normalizeColor(variant.color);
        if (colorKey && currentColor === colorKey) {
          return { ...variant, image: '' };
        }
        return variant;
      }),
      image: (() => {
        const removedImages = f.variants
          .filter((variant) => colorKey && normalizeColor(variant.color) === colorKey)
          .map((variant) => variant.image)
          .filter(Boolean);
        if (removedImages.includes(f.image)) return '';
        return f.image;
      })(),
    }));
  }

  function setCoverImage(imagePath) {
    setForm((f) => ({ ...f, image: imagePath || '' }));
  }

  const colorImageRows = useMemo(() => {
    const seen = new Set();
    const rows = [];

    for (const variant of form.variants) {
      const label = String(variant.color || '').trim();
      const key = normalizeColor(label);
      if (!key || seen.has(key)) continue;
      seen.add(key);

      const image = form.variants.find((v) => normalizeColor(v.color) === key && v.image)?.image || '';
      rows.push({ key, label, image });
    }

    return rows;
  }, [form.variants]);

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 2 }).format(val || 0);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">المنتجات</h1>
          <p className="text-gray-500 text-sm mt-1">إدارة المنتجات والمتغيرات</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg hover:bg-primary-dark transition text-sm font-medium"
        >
          <Plus size={18} />
          إضافة منتج
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="بحث بالاسم..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
        >
          <option value="">جميع الفئات</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
          ))}
        </select>
      </div>

      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <h2 className="text-sm font-semibold text-amber-900">تعديل المخزون عبر SQL</h2>
        <p className="mt-1 text-xs text-amber-800/90">
          مسموح: UPDATE product_variants SET quantity = ... WHERE ... أو INSERT INTO products/product_variants ...
        </p>
        <textarea
          value={stockSql}
          onChange={(e) => setStockSql(e.target.value)}
          rows={3}
          placeholder="UPDATE product_variants SET quantity = 12 WHERE id = 4;"
          className="mt-3 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={runStockSql}
            disabled={runningStockSql}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700 disabled:opacity-50"
          >
            {runningStockSql ? 'جاري التنفيذ...' : 'تنفيذ SQL'}
          </button>
          <button
            type="button"
            onClick={() => setStockSql('')}
            className="rounded-lg border border-amber-300 px-4 py-2 text-sm text-amber-900 transition hover:bg-amber-100"
          >
            مسح
          </button>
        </div>
      </div>

      {/* Products Table */}
      {loading ? (
        <LoadingSpinner />
      ) : products.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
          <Package size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">لا توجد منتجات</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">المنتج</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">الفئة</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">سعر البيع</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">سعر التكلفة</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">الربح</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">المخزون</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">المتغيرات</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map((p) => (
                  <tr key={p.id} className="table-row-hover">
                    <td className="px-5 py-3 font-medium">{p.model_name}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {CATEGORY_LABELS[p.category] || p.category}
                      </span>
                    </td>
                    <td className="px-5 py-3">{formatCurrency(p.selling_price)} da</td>
                    <td className="px-5 py-3">{formatCurrency(p.cost_price)} da</td>
                    <td className="px-5 py-3 text-green-600 font-medium">
                      {formatCurrency(p.selling_price - p.cost_price)} da
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          (p.total_stock || 0) <= 5
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {p.total_stock || 0}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{p.variants.length} متغير</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(p)}
                          className="p-1.5 text-gray-400 hover:text-primary hover:bg-blue-50 rounded-lg transition"
                          title="تعديل"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                          title="حذف"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Product Form Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'تعديل المنتج' : 'إضافة منتج جديد'}
        size="lg"
      >
        <div className="space-y-4">
          {/* Basic info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">اسم الموديل *</label>
              <input
                type="text"
                value={form.model_name}
                onChange={(e) => setForm((f) => ({ ...f, model_name: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="مثال: قميص كلاسيكي"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الفئة *</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">سعر البيع *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.selling_price}
                onChange={(e) => setForm((f) => ({ ...f, selling_price: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">سعر التكلفة *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.cost_price}
                onChange={(e) => setForm((f) => ({ ...f, cost_price: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Profit preview */}
          {form.selling_price && form.cost_price && (
            <div className="bg-green-50 rounded-lg p-3 text-sm text-green-700">
              الربح المتوقع: <strong>{formatCurrency(form.selling_price - form.cost_price)} da</strong> لكل قطعة
            </div>
          )}

          {/* Variants */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">المتغيرات (اللون / المقاس / الكمية)</label>
              <button
                type="button"
                onClick={addVariant}
                className="text-xs text-primary hover:text-primary-dark font-medium"
              >
                + إضافة متغير
              </button>
            </div>

            {colorImageRows.length > 0 && (
              <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs font-medium text-gray-600 mb-2">صور الألوان (صورة واحدة لكل لون)</p>
                {form.image && (
                  <div className="mb-3 flex items-center gap-3 rounded-md border border-gray-200 bg-white p-2">
                    <img
                      src={resolveImageUrl(form.image)}
                      alt="cover"
                      className="h-12 w-12 rounded object-cover border border-gray-200"
                    />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-700">صورة الواجهة المختارة</p>
                      <p className="text-[11px] text-gray-500">تظهر في الصفحة الرئيسية للمتجر</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCoverImage('')}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      مسح
                    </button>
                  </div>
                )}
                <div className="space-y-2">
                  {colorImageRows.map((row) => (
                    <div key={row.key} className="grid gap-2 sm:grid-cols-[1fr_1.6fr_auto_auto] items-center">
                      <span className="text-sm text-gray-700">{row.label}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => uploadColorImage(row.key, e.target.files?.[0])}
                        className="w-full text-xs"
                      />
                      {uploading[row.key] && <span className="text-[11px] text-gray-400">...رفع</span>}
                      {row.image ? (
                        <div className="flex items-center gap-2">
                          <img
                            src={resolveImageUrl(row.image)}
                            alt={row.label}
                            className="h-10 w-10 rounded object-cover border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => setCoverImage(row.image)}
                            className={`text-xs ${form.image === row.image ? 'text-green-600' : 'text-primary hover:text-primary-dark'}`}
                          >
                            {form.image === row.image ? 'صورة الواجهة' : 'اجعلها صورة الواجهة'}
                          </button>
                          <button
                            type="button"
                            onClick={() => clearColorImage(row.key)}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            حذف الصورة
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-400">بدون صورة</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {form.variants.map((v, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-[1.2fr_0.7fr_0.6fr_auto] items-center">
                  <input
                    type="text"
                    placeholder="اللون"
                    value={v.color}
                    onChange={(e) => updateVariant(i, 'color', e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <input
                    type="text"
                    placeholder="المقاس"
                    value={v.size}
                    onChange={(e) => updateVariant(i, 'size', e.target.value)}
                    className="w-24 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="الكمية"
                    value={v.quantity}
                    onChange={(e) => updateVariant(i, 'quantity', e.target.value)}
                    className="w-20 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  {form.variants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeVariant(i)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-primary text-white py-2.5 rounded-lg hover:bg-primary-dark transition font-medium text-sm disabled:opacity-50"
            >
              {saving ? 'جاري الحفظ...' : editing ? 'تحديث المنتج' : 'إضافة المنتج'}
            </button>
            <button
              onClick={() => setModalOpen(false)}
              className="px-6 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition text-sm"
            >
              إلغاء
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
