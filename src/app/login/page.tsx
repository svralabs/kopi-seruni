import LoginForm from './login-form';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-zinc-200 p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 text-3xl shadow-inner">
            ☕
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Kopi Seruni POS</h1>
          <p className="text-sm text-zinc-500">Masuk untuk mengelola kasir & outlet</p>
        </div>

        <LoginForm />

        <div className="text-center text-xs text-zinc-400">
          Sistem POS & Manajemen Outlet Multi-Cabang
        </div>
      </div>
    </div>
  );
}
