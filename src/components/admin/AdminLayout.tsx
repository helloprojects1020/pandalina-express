import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard,
  UtensilsCrossed,
  List,
  SlidersHorizontal,
  ClipboardList,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import logoImg from '@/assets/logo.png';

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/menu', icon: UtensilsCrossed, label: 'Categories', end: true },
  { to: '/admin/menu/items', icon: List, label: 'Menu Items' },
  { to: '/admin/menu/options', icon: SlidersHorizontal, label: 'Options / Modifiers' },
  { to: '/admin/orders', icon: ClipboardList, label: 'Orders' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
];

const AdminLayout = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-border flex items-center gap-3">
        <img src={logoImg} alt="Pandalina" className="w-8 h-8 rounded-lg" />
        <span className="font-bold text-foreground text-sm">Pandalina Admin</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User / Logout */}
      <div className="p-3 border-t border-border space-y-2">
        <p className="text-xs text-muted-foreground truncate px-3">{user?.email}</p>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive w-full transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex" dir="ltr">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 border-e border-border bg-card flex-col shrink-0 sticky top-0 h-screen">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-accent/60" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 start-0 w-64 bg-card shadow-elevated">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-3 sticky top-0 z-40">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-1.5 rounded-lg hover:bg-muted"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <h2 className="text-sm font-semibold text-foreground">Restaurant Management</h2>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
