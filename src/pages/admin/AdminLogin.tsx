import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Lock, ChefHat, BarChart3, Users, ShoppingBag } from 'lucide-react';

const AdminLogin = () => {
  const { signIn, user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user && isAdmin) {
    navigate('/admin', { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const { error: authError } = await signIn(email, password);
    if (authError) {
      setError(authError);
      setSubmitting(false);
      return;
    }

    setTimeout(() => {
      navigate('/admin', { replace: true });
      setSubmitting(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-between p-12 relative overflow-hidden">
        {/* Background texture */}
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }} />

        {/* Wordmark */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-foreground/15 border border-primary-foreground/20 flex items-center justify-center shadow-sm">
            <span className="text-primary-foreground text-base font-black tracking-tighter">B</span>
          </div>
          <div>
            <p className="text-primary-foreground text-base font-black tracking-tight leading-none">BITELYX</p>
            <p className="text-primary-foreground/50 text-[10px] font-medium mt-0.5 leading-none">Restaurant Platform</p>
          </div>
        </div>

        {/* Center copy */}
        <div className="relative space-y-6">
          <div className="space-y-3">
            <h2 className="text-4xl font-black text-primary-foreground leading-tight tracking-tight">
              Manage your<br />restaurant smarter.
            </h2>
            <p className="text-primary-foreground/60 text-base leading-relaxed max-w-xs">
              Orders, menu, inventory, analytics — everything your restaurant needs in one place.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-col gap-2.5">
            {[
              { icon: ShoppingBag, label: 'Real-time order management' },
              { icon: BarChart3, label: 'Revenue & analytics dashboard' },
              { icon: ChefHat, label: 'Menu & inventory control' },
              { icon: Users, label: 'Multi-location support' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-primary-foreground/15 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-primary-foreground/80" />
                </div>
                <span className="text-primary-foreground/70 text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative text-primary-foreground/30 text-xs">
          © 2026 Bitelyx Ltd. All rights reserved.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile wordmark */}
          <div className="lg:hidden flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm">
              <span className="text-primary-foreground text-sm font-black tracking-tight">B</span>
            </div>
            <div>
              <p className="text-foreground text-sm font-black tracking-tight leading-none">BITELYX</p>
              <p className="text-muted-foreground text-[10px] font-medium mt-0.5 leading-none">Restaurant Platform</p>
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Welcome back</h1>
            <p className="text-muted-foreground text-sm">Sign in to your restaurant dashboard</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@restaurant.com"
                required
                autoComplete="email"
                className="h-10 bg-muted/40 border-border/60 focus:border-primary"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="h-10 bg-muted/40 border-border/60 focus:border-primary"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-destructive/8 border border-destructive/20 rounded-lg p-3">
                <p className="text-sm text-destructive leading-snug">{error}</p>
              </div>
            )}

            <Button type="submit" disabled={submitting} className="w-full h-10 font-semibold">
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Sign in
                </>
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground/50">
            Bitelyx Restaurant Management Platform
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
