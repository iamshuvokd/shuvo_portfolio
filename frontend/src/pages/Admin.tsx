import { useCallback, useEffect, useState } from 'react';
import AdminDashboard from '@/components/admin/AdminDashboard';
import AdminLogin from '@/components/admin/AdminLogin';
import { env } from '@/config/env';
import { adminApi, getToken } from '@/services/admin.service';

const Admin = () => {
  const [signedIn, setSignedIn] = useState(() => Boolean(getToken()));
  /** True when the token expired mid-session: show a login overlay but keep the editor (and the draft) alive. */
  const [expired, setExpired] = useState(false);

  // The admin area must never be indexed or cached by crawlers.
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Admin';
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => {
      document.title = previousTitle;
      meta.remove();
    };
  }, []);

  const logout = useCallback(() => {
    void adminApi.logout(); // revoke on the server; the UI does not wait for it
    setSignedIn(false);
    setExpired(false);
  }, []);

  const sessionExpired = useCallback(() => setExpired(true), []);

  if (!env.apiUrl) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center">
        <div className="max-w-md">
          <h1 className="text-xl font-semibold text-foreground">Backend not configured</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Set <code className="rounded bg-secondary px-1.5 py-0.5">VITE_API_URL</code> to your API (for example
            https://api.example.com/api) and rebuild to use the admin panel.
          </p>
        </div>
      </div>
    );
  }

  if (!signedIn) return <AdminLogin onSuccess={() => setSignedIn(true)} />;

  return (
    <>
      <AdminDashboard onLogout={logout} onSessionExpired={sessionExpired} />
      {expired && <AdminLogin expired onSuccess={() => setExpired(false)} />}
    </>
  );
};

export default Admin;
