import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Toaster } from 'react-hot-toast';

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-100">
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: { direction: 'rtl', fontFamily: 'inherit' },
        }}
      />
      <Sidebar />
      <main className="md:mr-64 p-4 md:p-8 pt-16 md:pt-8">
        <Outlet />
      </main>
    </div>
  );
}
