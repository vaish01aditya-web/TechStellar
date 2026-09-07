import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/', label: 'Dashboard', roles: null },
  { to: '/inspections', label: 'Inspections', roles: null },
  { to: '/inspections/new', label: 'New Inspection', roles: ['OFFICER', 'ADMIN'] },
  { to: '/rules', label: 'Rules', roles: ['ADMIN'] },
  { to: '/users', label: 'Users', roles: ['ADMIN'] },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col bg-ink text-white">
        <div className="px-5 py-6">
          <p className="font-serif text-lg leading-tight">Legal Metrology</p>
          <p className="text-xs text-white/50">Compliance Checker</p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.filter((item) => !item.roles || item.roles.includes(user?.role)).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 px-5 py-4">
          <p className="text-sm">{user?.fullName}</p>
          <p className="text-xs capitalize text-white/50">{user?.role?.toLowerCase()}</p>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="mt-3 text-xs text-white/60 underline underline-offset-2 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
