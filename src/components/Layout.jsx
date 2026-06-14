import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main><Outlet /></main>
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="container-shell flex flex-col gap-2 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>© 2026 BooterSpace. Career, community, and hiring tools.</p>
          <p>Firebase Auth · Firestore · FCM · React Router · Vite</p>
        </div>
      </footer>
    </div>
  );
}
