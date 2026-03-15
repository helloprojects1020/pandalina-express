import { useState } from 'react';
import logo from '@/assets/logo.png';

const CORRECT_PASSWORD = 'Hanna0526!@';
const STORAGE_KEY = 'site-authenticated';
const storage = sessionStorage;

const PasswordGate = ({ children }: { children: React.ReactNode }) => {
  const [authenticated, setAuthenticated] = useState(
    () => storage.getItem(STORAGE_KEY) === 'true'
  );
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      storage.setItem(STORAGE_KEY, 'true');
      setAuthenticated(true);
    } else {
      setError(true);
      setTimeout(() => setError(false), 1500);
    }
  };

  if (authenticated) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center px-6 overflow-auto">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[280px] flex flex-col items-center gap-5 py-8"
      >
        <img src={logo} alt="Logo" className="w-16 h-16 object-contain" />
        <h1 className="font-display text-lg text-foreground text-center">Enter Password</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          className={`w-full h-11 rounded-xl bg-secondary px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all ${
            error ? 'ring-2 ring-destructive animate-shake' : 'focus:ring-primary/30'
          }`}
        />
        <button
          type="submit"
          className="w-full h-11 rounded-full bg-primary text-primary-foreground font-bold text-sm active:scale-95 transition-transform"
        >
          Enter
        </button>
        {error && (
          <p className="text-destructive text-sm font-medium">Incorrect password</p>
        )}
      </form>
    </div>
  );
};

export default PasswordGate;
