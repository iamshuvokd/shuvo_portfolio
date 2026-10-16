import { useState, type FormEvent } from 'react';
import { Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminApi } from '@/services/admin.service';

const AdminLogin = ({ onSuccess }: { onSuccess: () => void }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await adminApi.login(password);
      onSuccess();
    } catch (e) {
      setError(e instanceof TypeError ? 'Cannot reach the server. Is the backend running?' : e instanceof Error ? e.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-border/80 bg-card/70 p-7 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
          <Lock className="h-5 w-5" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold text-foreground">Admin sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">Enter the admin password to edit your site.</p>

        <label htmlFor="admin-password" className="mb-1.5 mt-6 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Password
        </label>
        <Input
          id="admin-password"
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" className="mt-5 w-full" disabled={busy || !password}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Sign in
        </Button>
      </form>
    </div>
  );
};

export default AdminLogin;
