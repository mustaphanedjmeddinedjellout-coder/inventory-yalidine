/**
 * Orders Page
 * Create and manage orders with product/variant selection.
 * Price snapshots are captured at order creation time.
 */
import { useEffect, useState } from 'react';
import { orderApi, productApi, yalidineApi } from '../api';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import { Plus, Trash2, Eye, ShoppingCart, Calendar, Truck, Package } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');

  // New order state
  const [createOpen, setCreateOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Customer / shipping state
  const [firstname, setFirstname] = useState('');
  const [familyname, setFamilyname] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [wilayas, setWilayas] = useState([]);
  const [communes, setCommunes] = useState([]);
  const [selectedWilaya, setSelectedWilaya] = useState('');
  const [selectedWilayaName, setSelectedWilayaName] = useState('');
  const [selectedCommune, setSelectedCommune] = useState('');
  const [isStopdesk, setIsStopdesk] = useState(false);
  const [centers, setCenters] = useState([]);
  const [selectedCenter, setSelectedCenter] = useState('');
  const [centersLoading, setCentersLoading] = useState(false);
  const [wilayasLoading, setWilayasLoading] = useState(false);
  const [communesLoading, setCommunesLoading] = useState(false);
  const [yalidinePrice, setYalidinePrice] = useState('');

  // View order state
  const [viewOrder, setViewOrder] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [dateFilter]);

  async function loadOrders() {
    try {
      setLoading(true);
      const params = {};
      if (dateFilter) params.date = dateFilter;
      const res = await orderApi.getAll(params);
      setOrders(res.data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function openCreate() {
    try {
      const res = await productApi.getForOrder();
      setProducts(res.data);
      setOrderItems([{ product_id: '', variant_id: '', quantity: 1 }]);
      setNotes('');
      // Reset customer fields
      setFirstname('');
      setFamilyname('');
      setContactPhone('');
      setAddress('');
      setSelectedWilaya('');
      setSelectedWilayaName('');
      setSelectedCommune('');
      setIsStopdesk(false);
      setCenters([]);
      setSelectedCenter('');
      setCommunes([]);
      setYalidinePrice('');
      setCreateOpen(true);
      // Load wilayas
      loadWilayas();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function loadWilayas() {
    try {
      setWilayasLoading(true);
      const res = await yalidineApi.getWilayas();
      setWilayas(Array.isArray(res.data) ? res.data : []);
    } catch {
      // Wilayas load failed – user can still create order without shipping
      setWilayas([]);
    } finally {
      setWilayasLoading(false);
    }
  }

  async function handleWilayaChange(wilayaId) {
    setSelectedWilaya(wilayaId);
    setSelectedCommune('');
    setCommunes([]);
    setCenters([]);
    setSelectedCenter('');
    const w = wilayas.find(w => String(w.id) === String(wilayaId));
    setSelectedWilayaName(w ? w.name : '');
    if (!wilayaId) return;
    try {
      setCommunesLoading(true);
      const res = await yalidineApi.getCommunes(wilayaId);
      const data = res.data;
      setCommunes(Array.isArray(data) ? data : (data?.results || []));
    } catch {
      setCommunes([]);
    } finally {
      setCommunesLoading(false);
    }
    // Auto-load centers if Stop Desk is checked
    if (isStopdesk) {
      try {
        setCentersLoading(true);
        const cRes = await yalidineApi.getCenters(wilayaId);
        const cData = Array.isArray(cRes.data) ? cRes.data : [];
        setCenters(cData);
      } catch {
        setCenters([]);
      } finally {
        setCentersLoading(false);
      }
    }
  }

  async function openView(order) {
    try {
      const res = await orderApi.getById(order.id);
      setViewOrder(res.data);
      setViewOpen(true);
    } catch (err) {
      toast.error(err.message);
    }
  }

  function addItem() {
    setOrderItems((prev) => [...prev, { product_id: '', variant_id: '', quantity: 1 }]);
  }

  function removeItem(index) {
    setOrderItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItem(index, field, value) {
    setOrderItems((prev) => {
      const items = [...prev];
      items[index] = { ...items[index], [field]: value };
      // Reset variant when product changes
      if (field === 'product_id') {
        items[index].variant_id = '';
      }
      return items;
    });
  }

  function getSelectedProduct(productId) {
    return products.find((p) => p.id === parseInt(productId));
  }

  function getSelectedVariant(productId, variantId) {
    const product = getSelectedProduct(productId);
    return product?.variants.find((v) => v.id === parseInt(variantId));
  }

  // Calculate order preview
  function getOrderPreview() {
    let total = 0;
    let profit = 0;
    for (const item of orderItems) {
      const product = getSelectedProduct(item.product_id);
      if (product && item.quantity > 0) {
        total += product.selling_price * item.quantity;
        profit += (product.selling_price - product.cost_price) * item.quantity;
      }
    }
    return { total, profit };
  }

  async function handleSubmitOrder() {
    const validItems = orderItems.filter((item) => item.product_id && item.variant_id && item.quantity > 0);
    if (validItems.length === 0) {
      return toast.error('يرجى إضافة عنصر واحد على الأقل');
    }

    try {
      setSaving(true);
      // If stop desk, use the center's address; if domicile, always "."
      let shippingAddress = '.';
      if (isStopdesk && selectedCenter) {
        const center = centers.find(c => String(c.center_id) === String(selectedCenter));
        if (center) shippingAddress = `[Stop Desk] ${center.name} - ${center.address}`;
      }
      await orderApi.create({
        notes,
        firstname: firstname || undefined,
        familyname: familyname || undefined,
        contact_phone: contactPhone || undefined,
        address: shippingAddress || undefined,
        to_wilaya_name: selectedWilayaName || undefined,
        to_commune_name: selectedCommune || undefined,
        is_stopdesk: isStopdesk,
        yalidine_price: yalidinePrice !== '' ? parseFloat(yalidinePrice) : undefined,
        items: validItems.map((item) => ({
          product_id: parseInt(item.product_id),
          variant_id: parseInt(item.variant_id),
          quantity: parseInt(item.quantity),
        })),
      });
      toast.success('تم إنشاء الطلب بنجاح');
      setCreateOpen(false);
      loadOrders();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('هل أنت متأكد من حذف هذا الطلب؟ سيتم استعادة المخزون.')) return;
    try {
      await orderApi.delete(id);
      toast.success('تم حذف الطلب واستعادة المخزون');
      loadOrders();
    } catch (err) {
      toast.error(err.message);
    }
  }

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 2 }).format(val || 0);

  const preview = getOrderPreview();

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">الطلبات</h1>
          <p className="text-gray-500 text-sm mt-1">إدارة طلبات البيع اليومية</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg hover:bg-primary-dark transition text-sm font-medium"
        >
          <Plus size={18} />
          طلب جديد
        </button>
      </div>

      {/* Date Filter */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative">
          <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="pr-10 pl-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        {dateFilter && (
          <button
            onClick={() => setDateFilter('')}
            className="text-sm text-primary hover:text-primary-dark"
          >
            عرض الكل
          </button>
        )}
      </div>

      {/* Orders Table */}
      {loading ? (
        <LoadingSpinner />
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
          <ShoppingCart size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">لا توجد طلبات</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">رقم الطلب</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">العميل</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">العناصر</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">الإجمالي</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">الربح</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">الشحن</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">التاريخ</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((o) => (
                  <tr key={o.id} className="table-row-hover">
                    <td className="px-5 py-3 font-mono text-xs">{o.order_number}</td>
                    <td className="px-5 py-3 text-sm">
                      {o.firstname ? `${o.firstname} ${o.familyname || ''}` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3">{o.items_count} قطعة</td>
                    <td className="px-5 py-3 font-medium">{formatCurrency(o.total_amount)} da</td>
                    <td className="px-5 py-3 text-green-600 font-medium">{formatCurrency(o.total_profit)} da</td>
                    <td className="px-5 py-3">
                      {o.yalidine_tracking ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                          <Truck size={12} /> {o.yalidine_tracking}
                        </span>
                      ) : o.to_wilaya_name ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">
                          <Package size={12} /> في الانتظار
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {new Date(o.created_at).toLocaleDateString('en-US')}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openView(o)}
                          className="p-1.5 text-gray-400 hover:text-primary hover:bg-blue-50 rounded-lg transition"
                          title="عرض التفاصيل"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(o.id)}
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

      {/* Create Order Modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="إنشاء طلب جديد"
        size="lg"
      >
        <div className="space-y-4">
          {/* Customer info section */}
          <div className="bg-orange-50 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-bold text-orange-800 flex items-center gap-2">
              <Truck size={16} /> معلومات العميل والشحن (Yalidine)
            </h3>

            {/* Stop Desk toggle - at the top */}
            <div className="flex items-center gap-2 bg-blue-50 rounded-lg p-3">
              <input
                type="checkbox"
                id="is_stopdesk"
                checked={isStopdesk}
                onChange={(e) => {
                  const checked = e.target.checked;
                  if (!checked) {
                    setCenters([]);
                    setSelectedCenter('');
                    setSelectedCommune('');
                  }
                  setIsStopdesk(checked);
                }}
                className="rounded border-gray-300"
              />
              <label htmlFor="is_stopdesk" className="text-sm font-medium text-blue-800">
                📦 توصيل إلى مكتب (Stop Desk)
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">الاسم الأول *</label>
                <input
                  type="text"
                  value={firstname}
                  onChange={(e) => setFirstname(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="الاسم"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">اللقب *</label>
                <input
                  type="text"
                  value={familyname}
                  onChange={(e) => setFamilyname(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="اللقب"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">رقم الهاتف *</label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="0555123456"
              />
            </div>
            {isStopdesk && (
            <div>
              <label className="block text-xs text-gray-600 mb-1">العنوان *</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="عنوان التوصيل"
              />
            </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">الولاية *</label>
                <select
                  value={selectedWilaya}
                  onChange={(e) => handleWilayaChange(e.target.value)}
                  disabled={wilayasLoading}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                >
                  <option value="">{wilayasLoading ? 'جاري التحميل...' : 'اختر الولاية'}</option>
                  {wilayas.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.id} - {w.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">البلدية *</label>
                <select
                  value={selectedCommune}
                  onChange={(e) => setSelectedCommune(e.target.value)}
                  disabled={communesLoading || !selectedWilaya}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                >
                  <option value="">{communesLoading ? 'جاري التحميل...' : 'اختر البلدية'}</option>
                  {communes
                    .filter((c) => !isStopdesk || c.has_stop_desk)
                    .map((c) => (
                    <option key={c.id || c.name} value={c.name}>
                      {c.name}{c.has_stop_desk ? ' 📦' : ''} — {c.delivery_time_parcel || '?'}j
                    </option>
                  ))}
                </select>
                {selectedCommune && (() => {
                  const c = communes.find(cm => cm.name === selectedCommune);
                  return c ? (
                    <div className="text-xs text-gray-500 mt-1">
                      توصيل: {c.delivery_time_parcel} يوم | دفع: {c.delivery_time_payment} يوم
                      {c.has_stop_desk ? ' | 📦 Stop Desk متاح' : ''}
                    </div>
                  ) : null;
                })()}
              </div>
            </div>

            {/* Center picker – visible when Stop Desk is on */}
            {isStopdesk && (
              <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                <label className="block text-xs font-medium text-blue-800">مكتب الاستلام (Stop Desk) *</label>
                {centersLoading ? (
                  <p className="text-xs text-blue-600">جاري تحميل المكاتب...</p>
                ) : centers.length === 0 ? (
                  <p className="text-xs text-orange-600">اختر الولاية أولاً ثم سيتم تحميل المكاتب تلقائياً</p>
                ) : (
                  <>
                    <select
                      value={selectedCenter}
                      onChange={(e) => {
                        setSelectedCenter(e.target.value);
                        const center = centers.find(c => String(c.center_id) === e.target.value);
                        if (center) {
                          setSelectedCommune(center.commune_name);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-blue-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 bg-white"
                    >
                      <option value="">اختر المكتب ({centers.length} مكتب متاح)</option>
                      {centers.map((c) => (
                        <option key={c.center_id} value={c.center_id}>
                          {c.name} — {c.commune_name}
                        </option>
                      ))}
                    </select>
                    {selectedCenter && (() => {
                      const c = centers.find(ct => String(ct.center_id) === String(selectedCenter));
                      return c ? (
                        <p className="text-xs text-blue-600">📍 {c.address}</p>
                      ) : null;
                    })()}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Order items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">عناصر الطلب</label>
              <button
                type="button"
                onClick={addItem}
                className="text-xs text-primary hover:text-primary-dark font-medium"
              >
                + إضافة عنصر
              </button>
            </div>
            <div className="space-y-3">
              {orderItems.map((item, i) => {
                const product = getSelectedProduct(item.product_id);
                return (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <select
                        value={item.product_id}
                        onChange={(e) => updateItem(i, 'product_id', e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                      >
                        <option value="">اختر المنتج</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.model_name} — {formatCurrency(p.selling_price)} da
                          </option>
                        ))}
                      </select>
                      {orderItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(i)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {product && (
                      <div className="flex items-center gap-2">
                        <select
                          value={item.variant_id}
                          onChange={(e) => updateItem(i, 'variant_id', e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                        >
                          <option value="">اختر المتغير</option>
                          {product.variants.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.color} / {v.size} — متوفر: {v.quantity}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="1"
                          max={getSelectedVariant(item.product_id, item.variant_id)?.quantity || 999}
                          value={item.quantity}
                          onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                          className="w-20 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          placeholder="الكمية"
                        />
                      </div>
                    )}

                    {product && item.quantity > 0 && (
                      <div className="text-xs text-gray-500">
                        المجموع: {formatCurrency(product.selling_price * item.quantity)} da
                        {' | '}
                        الربح: {formatCurrency((product.selling_price - product.cost_price) * item.quantity)} da
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات (اختياري)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              placeholder="ملاحظات إضافية..."
            />
          </div>

          {/* Yalidine Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">سعر التسليم (يالدين) <span className="text-xs text-gray-400">— المبلغ الذي يدفعه الزبون عند الاستلام</span></label>
            <input
              type="number"
              min="0"
              step="1"
              value={yalidinePrice}
              onChange={(e) => setYalidinePrice(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="مثال: 3500"
            />
          </div>

          {/* Order Summary */}
          <div className="bg-blue-50 rounded-lg p-4 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">الإجمالي:</span>
              <span className="font-bold text-gray-800">{formatCurrency(preview.total)} da</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">الربح المتوقع:</span>
              <span className="font-bold text-green-600">{formatCurrency(preview.profit)} da</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={handleSubmitOrder}
              disabled={saving}
              className="flex-1 bg-primary text-white py-2.5 rounded-lg hover:bg-primary-dark transition font-medium text-sm disabled:opacity-50"
            >
              {saving ? 'جاري الإنشاء...' : 'إنشاء الطلب'}
            </button>
            <button
              onClick={() => setCreateOpen(false)}
              className="px-6 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition text-sm"
            >
              إلغاء
            </button>
          </div>
        </div>
      </Modal>

      {/* View Order Modal */}
      <Modal
        isOpen={viewOpen}
        onClose={() => setViewOpen(false)}
        title={`تفاصيل الطلب ${viewOrder?.order_number || ''}`}
        size="lg"
      >
        {viewOrder && (
          <div className="space-y-4">
            {/* Customer & Shipping Info */}
            {viewOrder.firstname && (
              <div className="bg-orange-50 rounded-lg p-4 space-y-2">
                <h3 className="text-sm font-bold text-orange-800 flex items-center gap-2">
                  <Truck size={16} /> معلومات الشحن
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">العميل:</span>{' '}
                    <span className="font-medium">{viewOrder.firstname} {viewOrder.familyname}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">الهاتف:</span>{' '}
                    <span className="font-medium">{viewOrder.contact_phone}</span>
                  </div>
                  {viewOrder.address && viewOrder.address !== '.' && (
                  <div>
                    <span className="text-gray-500">العنوان:</span>{' '}
                    <span className="font-medium">{viewOrder.address}</span>
                  </div>
                  )}
                  <div>
                    <span className="text-gray-500">الولاية / البلدية:</span>{' '}
                    <span className="font-medium">{viewOrder.to_wilaya_name} / {viewOrder.to_commune_name}</span>
                  </div>
                </div>
                {viewOrder.is_stopdesk === 1 && (
                  <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs">Stop Desk</span>
                )}
              </div>
            )}

            {/* Yalidine tracking */}
            {viewOrder.yalidine_tracking && (
              <div className="bg-green-50 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package size={18} className="text-green-600" />
                  <div>
                    <p className="text-sm font-bold text-green-800">Yalidine Tracking</p>
                    <p className="text-xs text-green-600 font-mono">{viewOrder.yalidine_tracking}</p>
                  </div>
                </div>
                {viewOrder.yalidine_status && (
                  <span className="px-2 py-1 rounded-full bg-green-200 text-green-800 text-xs font-medium">
                    {viewOrder.yalidine_status}
                  </span>
                )}
              </div>
            )}

            {/* Order summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">الإجمالي</p>
                <p className="text-lg font-bold text-gray-800">{formatCurrency(viewOrder.total_amount)} da</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">التكلفة</p>
                <p className="text-lg font-bold text-gray-600">{formatCurrency(viewOrder.total_cost)} da</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">الربح</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(viewOrder.total_profit)} da</p>
              </div>
            </div>

            {/* Items table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-right px-4 py-2 text-gray-500 font-medium">المنتج</th>
                    <th className="text-right px-4 py-2 text-gray-500 font-medium">المتغير</th>
                    <th className="text-right px-4 py-2 text-gray-500 font-medium">الكمية</th>
                    <th className="text-right px-4 py-2 text-gray-500 font-medium">سعر البيع</th>
                    <th className="text-right px-4 py-2 text-gray-500 font-medium">سعر التكلفة</th>
                    <th className="text-right px-4 py-2 text-gray-500 font-medium">المجموع</th>
                    <th className="text-right px-4 py-2 text-gray-500 font-medium">الربح</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {viewOrder.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2 font-medium">{item.product_name}</td>
                      <td className="px-4 py-2 text-gray-500">{item.variant_info}</td>
                      <td className="px-4 py-2">{item.quantity}</td>
                      <td className="px-4 py-2">{formatCurrency(item.selling_price)}</td>
                      <td className="px-4 py-2 text-gray-500">{formatCurrency(item.cost_price)}</td>
                      <td className="px-4 py-2 font-medium">{formatCurrency(item.line_total)}</td>
                      <td className="px-4 py-2 text-green-600">{formatCurrency(item.line_profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {viewOrder.notes && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                <strong>ملاحظات:</strong> {viewOrder.notes}
              </div>
            )}

            <div className="text-xs text-gray-400">
              تاريخ الإنشاء: {new Date(viewOrder.created_at).toLocaleString('en-US')}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
