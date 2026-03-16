import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UtensilsCrossed, ClipboardList, Layers, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  const [stats, setStats] = useState({ categories: 0, items: 0, orders: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const [cats, items, orders] = await Promise.all([
        supabase.from('categories').select('id', { count: 'exact', head: true }),
        supabase.from('menu_items').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id', { count: 'exact', head: true }),
      ]);
      setStats({
        categories: cats.count ?? 0,
        items: items.count ?? 0,
        orders: orders.count ?? 0,
      });
    };
    fetchStats();
  }, []);

  const cards = [
    { label: 'Categories', value: stats.categories, icon: Layers, to: '/admin/menu', color: 'bg-blue-500/10 text-blue-600' },
    { label: 'Menu Items', value: stats.items, icon: UtensilsCrossed, to: '/admin/menu', color: 'bg-green-500/10 text-green-600' },
    { label: 'Orders', value: stats.orders, icon: ClipboardList, to: '/admin/orders', color: 'bg-orange-500/10 text-orange-600' },
    { label: 'Settings', value: '→', icon: Settings, to: '/admin/settings', color: 'bg-purple-500/10 text-purple-600' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="bg-card rounded-2xl p-5 shadow-card hover:shadow-elevated transition-shadow"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${c.color}`}>
              <c.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-foreground">{c.value}</p>
            <p className="text-sm text-muted-foreground">{c.label}</p>
          </Link>
        ))}
      </div>

      <div className="bg-card rounded-2xl p-6 shadow-card">
        <h2 className="font-semibold text-foreground mb-2">Quick Start</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• Go to <Link to="/admin/menu" className="text-primary underline">Menu Management</Link> to add categories and dishes</li>
          <li>• Go to <Link to="/admin/orders" className="text-primary underline">Orders</Link> to view incoming orders</li>
          <li>• Go to <Link to="/admin/settings" className="text-primary underline">Settings</Link> to configure delivery, hours, and WhatsApp</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminDashboard;
