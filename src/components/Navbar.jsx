import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  ['/', 'Home'], ['/jobs', 'Jobs'], ['/govt', 'Govt Jobs'], ['/companies', 'Companies'], ['/community', 'Community'], ['/messages', 'Messages'], ['/profile', 'Profile']
];

export default function Navbar() {
  const { user, logout } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <nav className="container-shell flex min-h-16 items-center justify-between gap-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-xl font-black text-slate-900">
          <img src="/booterspace/assets/images/booterspace.png" alt="" className="h-8 w-8 rounded-lg object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          BooterSpace
        </Link>
        <div className="hidden flex-wrap items-center gap-1 md:flex">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => `rounded-lg px-3 py-2 text-sm font-semibold ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>{label}</NavLink>
          ))}
          <NavLink to="/notifications" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Notifications</NavLink>
          {user ? <button onClick={logout} className="btn-secondary py-2 text-sm">Sign out</button> : <NavLink to="/login" className="btn-primary py-2 text-sm">Sign in</NavLink>}
        </div>
      </nav>
    </header>
  );
}
