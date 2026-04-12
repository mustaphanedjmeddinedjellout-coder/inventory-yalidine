/**
 * Reviews Manager Page
 * Admin interface for uploading and managing customer review media.
 */
import { useEffect, useState } from 'react';
import { reviewApi, productApi } from '../api';
import { Plus, Trash2, ArrowUp, ArrowDown, Image, Film } from 'lucide-react';
import toast from 'react-hot-toast';
import { resolveImageUrl } from '../storefront/utils';

export default function Reviews() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [addingUrl, setAddingUrl] = useState(false);
  const [urlForm, setUrlForm] = useState({ src: '', media_type: 'image', alt: '' });

  useEffect(() => {
    loadReviews();
  }, []);

  async function loadReviews() {
    try {
      setLoading(true);
      const res = await reviewApi.getAll();
      setItems(res.data || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (!isVideo && !isImage) {
      return toast.error('يُسمح فقط بالصور والفيديوهات');
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await productApi.uploadImage(formData);
      const path = uploadRes.data?.path;
      if (!path) throw new Error('فشل رفع الملف');

      const maxOrder = items.reduce((max, item) => Math.max(max, item.sort_order || 0), 0);
      await reviewApi.create({
        media_type: isVideo ? 'video' : 'image',
        src: path,
        alt: file.name.replace(/\.[^.]+$/, ''),
        sort_order: maxOrder + 1,
      });

      toast.success('تم إضافة المراجعة');
      loadReviews();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleAddUrl() {
    if (!urlForm.src.trim()) {
      return toast.error('يرجى إدخال رابط الملف');
    }
    try {
      const maxOrder = items.reduce((max, item) => Math.max(max, item.sort_order || 0), 0);
      await reviewApi.create({
        media_type: urlForm.media_type,
        src: urlForm.src.trim(),
        alt: urlForm.alt || null,
        sort_order: maxOrder + 1,
      });
      toast.success('تم إضافة المراجعة');
      setUrlForm({ src: '', media_type: 'image', alt: '' });
      setAddingUrl(false);
      loadReviews();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('هل أنت متأكد من حذف هذه المراجعة؟')) return;
    try {
      await reviewApi.delete(id);
      toast.success('تم الحذف');
      loadReviews();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleReorder(id, direction) {
    const idx = items.findIndex((item) => item.id === id);
    if (idx === -1) return;
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= items.length) return;

    const currentOrder = items[idx].sort_order ?? idx;
    const swapOrder = items[swapIdx].sort_order ?? swapIdx;

    try {
      await Promise.all([
        reviewApi.update(items[idx].id, { sort_order: swapOrder }),
        reviewApi.update(items[swapIdx].id, { sort_order: currentOrder }),
      ]);
      loadReviews();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">آراء العملاء</h1>
          <p className="text-gray-500 text-sm mt-1">إدارة صور وفيديوهات آراء العملاء</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAddingUrl(!addingUrl)}
            className="flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
          >
            <Plus size={18} />
            إضافة رابط
          </button>
          <label className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg hover:bg-primary-dark transition text-sm font-medium cursor-pointer">
            <Plus size={18} />
            {uploading ? 'جاري الرفع...' : 'رفع ملف'}
            <input
              type="file"
              accept="image/*,video/*"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {addingUrl && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">إضافة رابط خارجي</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              value={urlForm.src}
              onChange={(e) => setUrlForm((f) => ({ ...f, src: e.target.value }))}
              placeholder="رابط الصورة أو الفيديو"
              className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <select
              value={urlForm.media_type}
              onChange={(e) => setUrlForm((f) => ({ ...f, media_type: e.target.value }))}
              className="px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="image">صورة</option>
              <option value="video">فيديو</option>
            </select>
            <input
              type="text"
              value={urlForm.alt}
              onChange={(e) => setUrlForm((f) => ({ ...f, alt: e.target.value }))}
              placeholder="وصف (اختياري)"
              className="px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddUrl}
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-dark transition"
            >
              إضافة
            </button>
            <button
              onClick={() => setAddingUrl(false)}
              className="border border-gray-200 px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">جاري التحميل...</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
          <Image size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">لا توجد آراء عملاء بعد</p>
          <p className="text-gray-400 text-sm mt-1">ارفع صور أو فيديوهات لعرضها في صفحة المنتج</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className="group relative rounded-xl border border-gray-100 bg-white overflow-hidden shadow-sm"
            >
              <div className="aspect-[4/5] bg-gray-50 relative">
                {item.media_type === 'video' ? (
                  <video
                    src={resolveImageUrl(item.src)}
                    className="w-full h-full object-cover"
                    muted
                    loop
                    autoPlay
                    playsInline
                  />
                ) : (
                  <img
                    src={resolveImageUrl(item.src)}
                    alt={item.alt || ''}
                    className="w-full h-full object-cover"
                  />
                )}

                <div className="absolute top-2 left-2">
                  <span className="inline-flex items-center gap-1 bg-black/50 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-sm">
                    {item.media_type === 'video' ? <Film size={10} /> : <Image size={10} />}
                    {item.media_type === 'video' ? 'فيديو' : 'صورة'}
                  </span>
                </div>

                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  {idx > 0 && (
                    <button
                      onClick={() => handleReorder(item.id, -1)}
                      className="p-2 bg-white/90 rounded-full text-gray-700 hover:bg-white transition shadow"
                      title="تقديم"
                    >
                      <ArrowUp size={14} />
                    </button>
                  )}
                  {idx < items.length - 1 && (
                    <button
                      onClick={() => handleReorder(item.id, 1)}
                      className="p-2 bg-white/90 rounded-full text-gray-700 hover:bg-white transition shadow"
                      title="تأخير"
                    >
                      <ArrowDown size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 bg-red-500/90 rounded-full text-white hover:bg-red-600 transition shadow"
                    title="حذف"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="px-3 py-2">
                <p className="text-xs text-gray-500 truncate">{item.alt || `مراجعة #${item.id}`}</p>
                <p className="text-[10px] text-gray-400">ترتيب: {item.sort_order}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
