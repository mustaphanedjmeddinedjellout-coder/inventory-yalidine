import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, BarChart3, Menu, X } from 'lucide-react';
import { useState } from 'react';

const links = [
  { to: '/', label: 'لوحة التحكم', icon: LayoutDashboard },
  { to: '/products', label: 'المنتجات', icon: Package },
  { to: '/orders', label: 'الطلبات', icon: ShoppingCart },
  { to: '/analytics', label: 'التحليلات', icon: BarChart3 },
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-4 right-4 z-50 md:hidden bg-white p-2 rounded-lg shadow-md"
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 right-0 h-full w-64 bg-white border-l border-gray-200 shadow-sm z-40 transition-transform duration-300 md:translate-x-0 ${
          open ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-bold text-primary">إدارة المخزون</h1>
          <p className="text-xs text-gray-400 mt-1">نظام إدارة المتجر</p>
        </div>

        <nav className="p-4 space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-primary'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <link.icon size={18} />
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
