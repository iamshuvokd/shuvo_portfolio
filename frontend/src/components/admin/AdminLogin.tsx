import { useState, type FormEvent } from 'react';
import { Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminApi } from '@/services/admin.service';

interface AdminLoginProps {
  onSuccess: () => void;
  /** Shown on top of the dashboard after the session expired, so unsaved edits underneath are kept. */
  expired?: boolean;
}

const AdminLogin = ({ onSuccess, expired = false }: AdminLoginProps) => {
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

  const Wrapper = expired ? 'div' : 'main';

  return (
    <Wrapper
      className={
        expired
          ? 'fixed inset-0 z-50 flex items-center justify-center bg-background/85 px-4 backdrop-blur-sm'
          : 'flex min-h-screen items-center justify-center px-4'
      }
      role={expired ? 'dialog' : undefined}
      aria-modal={expired ? true : undefined}
      aria-label={expired ? 'Session expired' : undefined}
    >
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-border/80 bg-card/70 p-7 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
          <Lock className="h-5 w-5" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold text-foreground">{expired ? 'Session expired' : 'Admin sign in'}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {expired
            ? 'Sign in again to continue. Your unsaved changes are kept, just press Save & publish afterwards.'
            : 'Enter the admin password to edit your site.'}
        </p>

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
    </Wrapper>
  );
};

export default AdminLogin;
