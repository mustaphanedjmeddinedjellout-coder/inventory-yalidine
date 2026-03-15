# نظام إدارة المخزون والطلبات | Inventory & Order Management System

نظام متكامل لإدارة مخزون وطلبات متجر ملابس إلكتروني، مبني بتقنيات حديثة مع دعم كامل للغة العربية.

---

## 🛠 التقنيات المستخدمة | Tech Stack

| الطبقة     | التقنية                        |
| ---------- | ------------------------------ |
| Frontend   | React + Vite                   |
| Backend    | Node.js + Express              |
| Database   | SQLite (better-sqlite3)        |
| Styling    | Tailwind CSS v4                |
| Charts     | Recharts                       |
| Icons      | Lucide React                   |

---

## 📁 هيكل المشروع | Project Structure

```
program/
├── server/                     # Backend
│   ├── src/
│   │   ├── db/
│   │   │   ├── connection.js   # Database setup & schema
│   │   │   └── seed.js         # Sample data seeder
│   │   ├── routes/
│   │   │   ├── products.js     # Product CRUD endpoints
│   │   │   ├── orders.js       # Order endpoints
│   │   │   └── analytics.js    # Dashboard & analytics
│   │   ├── services/
│   │   │   ├── productService.js
│   │   │   ├── orderService.js
│   │   │   └── analyticsService.js
│   │   ├── utils/
│   │   │   ├── calculations.js # Business logic (profit, revenue)
│   │   │   └── response.js     # API response helpers
│   │   └── index.js            # Express server entry
│   ├── .env                    # Environment variables
│   └── package.json
│
├── client/                     # Frontend
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.js       # Axios configuration
│   │   │   └── index.js        # API functions
│   │   ├── components/
│   │   │   ├── Layout.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── StatCard.jsx
│   │   │   ├── Modal.jsx
│   │   │   └── LoadingSpinner.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Products.jsx
│   │   │   ├── Orders.jsx
│   │   │   └── Analytics.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css           # Tailwind + custom styles
│   ├── index.html
│   └── package.json
│
└── README.md
```

---

## 🚀 التشغيل | Setup & Run

### 1. تثبيت الاعتماديات

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 2. تهيئة قاعدة البيانات (اختياري - بيانات تجريبية)

```bash
cd server
npm run seed
```

### 3. تشغيل السيرفر

```bash
cd server
npm run dev    # Development with auto-reload
# أو
npm start      # Production
```

السيرفر يعمل على: `http://localhost:5000`

### 4. تشغيل الواجهة الأمامية

```bash
cd client
npm run dev
```

الواجهة تعمل على: `http://localhost:3000`

---

## 📊 قاعدة البيانات | Database Schema

### جدول المنتجات (products)
| العمود        | النوع    | الوصف                    |
| ------------- | -------- | ------------------------ |
| id            | INTEGER  | المفتاح الأساسي          |
| model_name    | TEXT     | اسم الموديل              |
| category      | TEXT     | الفئة (T-Shirt/Pants/Shoes) |
| selling_price | REAL     | سعر البيع                |
| cost_price    | REAL     | سعر التكلفة (للربح)      |
| image         | TEXT     | رابط الصورة (اختياري)     |
| created_at    | TEXT     | تاريخ الإنشاء             |
| updated_at    | TEXT     | تاريخ التحديث             |

### جدول المتغيرات (product_variants)
| العمود     | النوع    | الوصف            |
| ---------- | -------- | ---------------- |
| id         | INTEGER  | المفتاح الأساسي  |
| product_id | INTEGER  | المنتج المرتبط   |
| color      | TEXT     | اللون            |
| size       | TEXT     | المقاس           |
| quantity   | INTEGER  | الكمية المتوفرة   |

### جدول الطلبات (orders)
| العمود       | النوع    | الوصف              |
| ------------ | -------- | ------------------ |
| id           | INTEGER  | المفتاح الأساسي    |
| order_number | TEXT     | رقم الطلب الفريد   |
| total_amount | REAL     | إجمالي المبلغ      |
| total_cost   | REAL     | إجمالي التكلفة     |
| total_profit | REAL     | إجمالي الربح       |
| items_count  | INTEGER  | عدد القطع          |
| notes        | TEXT     | ملاحظات            |
| created_at   | TEXT     | تاريخ الإنشاء      |

### جدول عناصر الطلب (order_items) - مع لقطات الأسعار
| العمود        | النوع    | الوصف                    |
| ------------- | -------- | ------------------------ |
| id            | INTEGER  | المفتاح الأساسي          |
| order_id      | INTEGER  | الطلب المرتبط            |
| product_id    | INTEGER  | المنتج                   |
| variant_id    | INTEGER  | المتغير                  |
| product_name  | TEXT     | اسم المنتج (لقطة)        |
| variant_info  | TEXT     | معلومات المتغير (لقطة)    |
| quantity      | INTEGER  | الكمية                   |
| selling_price | REAL     | سعر البيع وقت الشراء ⚠️  |
| cost_price    | REAL     | سعر التكلفة وقت الشراء ⚠️ |
| line_total    | REAL     | مجموع السطر              |
| line_cost     | REAL     | تكلفة السطر              |
| line_profit   | REAL     | ربح السطر                |

> ⚠️ **هام:** أسعار البيع والتكلفة تُحفظ كلقطة وقت إنشاء الطلب. تغيير أسعار المنتج لاحقاً لا يؤثر على الطلبات السابقة.

---

## 🔌 API Endpoints

### Products
- `GET    /api/products` — قائمة المنتجات (مع فلتر: ?category=&search=)
- `GET    /api/products/:id` — تفاصيل منتج
- `GET    /api/products/for-order` — منتجات للطلبات (متغيرات متوفرة فقط)
- `GET    /api/products/low-stock?threshold=5` — مخزون منخفض
- `POST   /api/products` — إضافة منتج
- `PUT    /api/products/:id` — تحديث منتج
- `DELETE /api/products/:id` — حذف منتج

### Orders
- `GET    /api/orders` — قائمة الطلبات (مع فلتر: ?date=&from=&to=)
- `GET    /api/orders/:id` — تفاصيل طلب مع عناصره
- `POST   /api/orders` — إنشاء طلب جديد
- `DELETE /api/orders/:id` — حذف طلب (يستعيد المخزون)

### Analytics
- `GET    /api/analytics/dashboard` — ملخص اليوم
- `GET    /api/analytics/revenue?from=&to=` — الإيرادات والأرباح اليومية
- `GET    /api/analytics/top-products?from=&to=` — المنتجات الأكثر مبيعاً
- `GET    /api/analytics/categories?from=&to=` — المبيعات حسب الفئة
- `GET    /api/analytics/monthly?year=` — ملخص شهري

---

## 🛒 Store API (for Noire storefront)

Public read endpoints:
- `GET  /api/store/products` — قائمة المنتجات مع المتغيرات والمخزون
- `GET  /api/store/products/:id` — منتج واحد مع المتغيرات

Protected checkout endpoint (requires `X-STORE-KEY`):
- `POST /api/store/checkout` — إنشاء طلب وتخفيض مخزون المتغيرات

Required headers for checkout:
- `Content-Type: application/json`
- `X-STORE-KEY: <STORE_API_KEY>`

Sample checkout payload:

```json
{
  "customer": {
    "name": "John Doe",
    "phone": "0550000000",
    "wilaya": "16",
    "commune": "Alger",
    "address": "Address details",
    "deliveryMethod": "home",
    "notes": "optional"
  },
  "items": [
    { "product_id": 1, "variant_id": 10, "quantity": 2, "selling_price": 3700 }
  ]
}
```

---

## 📈 نماذج استعلامات التحليلات | Sample Analytics Queries

```sql
-- إيرادات وأرباح اليوم
SELECT
  COALESCE(SUM(total_amount), 0) as today_revenue,
  COALESCE(SUM(total_profit), 0) as today_profit,
  COUNT(*) as today_orders
FROM orders
WHERE date(created_at) = date('now');

-- الإيرادات والأرباح حسب اليوم
SELECT
  date(created_at) as date,
  SUM(total_amount) as revenue,
  SUM(total_profit) as profit,
  COUNT(*) as order_count
FROM orders
WHERE date(created_at) >= date('now', '-30 days')
GROUP BY date(created_at)
ORDER BY date ASC;

-- المنتجات الأكثر مبيعاً
SELECT
  oi.product_name,
  SUM(oi.quantity) as total_quantity,
  SUM(oi.line_total) as total_revenue,
  SUM(oi.line_profit) as total_profit
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
GROUP BY oi.product_id, oi.product_name
ORDER BY total_quantity DESC
LIMIT 10;

-- المبيعات حسب الفئة
SELECT
  p.category,
  SUM(oi.quantity) as total_quantity,
  SUM(oi.line_total) as total_revenue,
  SUM(oi.line_profit) as total_profit
FROM order_items oi
JOIN products p ON p.id = oi.product_id
JOIN orders o ON o.id = oi.order_id
GROUP BY p.category
ORDER BY total_revenue DESC;

-- المتغيرات منخفضة المخزون
SELECT pv.*, p.model_name, p.category
FROM product_variants pv
JOIN products p ON p.id = pv.product_id
WHERE pv.quantity <= 5
ORDER BY pv.quantity ASC;
```

---

## ✅ الميزات الرئيسية

- ✅ حساب الإيرادات والأرباح اليومية تلقائياً
- ✅ لقطات أسعار البيع والتكلفة في كل طلب (لا تتأثر بتغيير الأسعار)
- ✅ تخفيض المخزون تلقائياً عند إنشاء الطلب
- ✅ استعادة المخزون عند حذف الطلب
- ✅ لوحة تحكم بإحصائيات اليوم
- ✅ صفحة تحليلات مع رسوم بيانية
- ✅ فلترة بالتاريخ
- ✅ دعم كامل للغة العربية (RTL)
- ✅ تصميم متجاوب بالكامل
- ✅ إدارة المتغيرات (لون / مقاس / كمية)
