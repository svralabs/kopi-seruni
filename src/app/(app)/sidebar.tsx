'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/pos', label: 'Kasir POS', icon: '🛒' },
  { href: '/products', label: 'Produk & Menu', icon: '📦' },
  { href: '/stok', label: 'Stok & Inventori', icon: '🏬' },
  { href: '/shift', label: 'Shift Kasir', icon: '🕐' },
  { href: '/expenses', label: 'Pengeluaran', icon: '💳' },
  { href: '/profit-loss', label: 'Laba Rugi', icon: '📈' },
  { href: '/bagi-hasil', label: 'Bagi Hasil', icon: '👥' },
];

export default function Sidebar({ userName = 'Pengguna' }: { userName?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await authClient.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <aside className="w-64 bg-zinc-900 text-zinc-100 flex flex-col min-h-screen border-r border-zinc-800 shrink-0">
      {/* Brand */}
      <div className="p-6 border-b border-zinc-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-xl shadow-lg">
          ☕
        </div>
        <div>
          <h1 className="font-bold text-base tracking-wide text-white leading-tight">KOPI SERUNI</h1>
          <p className="text-xs text-amber-500 font-medium tracking-wider">POS MULTI-OUTLET</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                isActive
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User profile & Logout */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-950/40">
        <div className="flex items-center justify-between gap-2 px-2 py-2 mb-2">
          <div className="truncate">
            <p className="text-xs text-zinc-400">Masuk sebagai</p>
            <p className="text-sm font-medium text-zinc-200 truncate">{userName}</p>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/40">
            Online
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-lg border border-red-900/30 transition-colors"
        >
          <span>🚪</span> Keluar Akun
        </button>
      </div>
    </aside>
  );
}
