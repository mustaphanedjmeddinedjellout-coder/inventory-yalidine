/**
 * Products Page
 * Full CRUD for products with variant management.
 */
import { useEffect, useState } from 'react';
import { productApi } from '../api';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import { Plus, Edit, Trash2, Search, Package } from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = ['T-Shirt', 'Pants', 'Shoes'];
const CATEGORY_LABELS = { 'T-Shirt': 'تيشيرت', Pants: 'بنطلون', Shoes: 'حذاء' };

const emptyProduct = {
  model_name: '',
  category: 'T-Shirt',
  selling_price: '',
  cost_price: '',
  variants: [{ color: '', size: '', quantity: 0 }],
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

  useEffect(() => {
    loadProducts();
  }, [search, filterCategory]);

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
    setForm({ ...emptyProduct, variants: [{ color: '', size: '', quantity: 0 }] });
    setModalOpen(true);
  }

  function openEdit(product) {
    setEditing(product);
    setForm({
      model_name: product.model_name,
      category: product.category,
      selling_price: product.selling_price,
      cost_price: product.cost_price,
      variants: product.variants.length > 0 ? product.variants.map((v) => ({ ...v })) : [{ color: '', size: '', quantity: 0 }],
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
        variants: form.variants.map((v) => ({
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

  function addVariant() {
    setForm((f) => ({ ...f, variants: [...f.variants, { color: '', size: '', quantity: 0 }] }));
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
            <div className="space-y-2">
              {form.variants.map((v, i) => (
                <div key={i} className="flex items-center gap-2">
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
