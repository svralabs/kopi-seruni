'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Package,
  Warehouse,
  Clock,
  WalletCards,
  TrendingUp,
  Users2,
  Receipt,
  Store,
  Tag,
  UserCog,
  ShoppingBag,
  Settings,
  BookOpen,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pos', label: 'Kasir POS', icon: UtensilsCrossed },
  { href: '/orders', label: 'Riwayat Transaksi', icon: Receipt },
  { href: '/products', label: 'Produk & Menu', icon: Package },
  { href: '/discounts', label: 'Diskon & Promo', icon: Tag },
  { href: '/stok', label: 'Stok & Inventori', icon: Warehouse },
  { href: '/purchases', label: 'Pembelian (PO)', icon: ShoppingBag },
  { href: '/shift', label: 'Shift Kasir', icon: Clock },
  { href: '/expenses', label: 'Pengeluaran', icon: WalletCards },
  { href: '/profit-loss', label: 'Laba Rugi', icon: TrendingUp },
  { href: '/bagi-hasil', label: 'Bagi Hasil', icon: Users2 },
  { href: '/outlets', label: 'Kelola Outlet', icon: Store },
  { href: '/staff', label: 'Staff & Kasir', icon: UserCog },
  { href: '/settings', label: 'Pengaturan', icon: Settings },
  { href: '/api-docs', label: 'Dokumentasi API', icon: BookOpen },
];

export default function Sidebar({ userName = 'Kasir' }: { userName?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = async () => {
    await authClient.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <aside
      className={`${
        isCollapsed ? 'w-20' : 'w-20 lg:w-64'
      } bg-white border-r border-[#EBE7DF] flex flex-col h-screen sticky top-0 shrink-0 transition-all duration-300 z-30 select-none`}
    >
      {/* Brand Header with Collapse Toggle */}
      <div className="p-4 border-b border-[#F0ECE4] flex items-center justify-between gap-3 shrink-0">
        <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
          <div className="relative w-10 h-10 rounded-2xl overflow-hidden bg-[#F7F5F0] border border-[#E8E3DA] p-1 flex items-center justify-center shrink-0 shadow-xs">
            <Image
              src="/logo.webp"
              alt="Toko Kopi Seruni"
              width={36}
              height={36}
              className="object-contain"
              priority
            />
          </div>
          {!isCollapsed && (
            <div className="hidden lg:block truncate">
              <h1 className="font-serif font-black text-xs tracking-tight text-[#201C1A] leading-tight">
                TOKO KOPI
              </h1>
              <p className="font-serif text-base font-bold text-[#54382B] -mt-0.5 tracking-tight">
                Seruni
              </p>
            </div>
          )}
        </Link>

        {/* Toggle Button */}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex p-1.5 rounded-xl hover:bg-[#FAF8F5] text-[#8E867C] hover:text-[#201C1A] transition-colors"
          title={isCollapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
        >
          {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto custom-scrollbar">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname?.startsWith(`${item.href}/`));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center ${
                isCollapsed ? 'justify-center' : 'justify-center lg:justify-start'
              } gap-3.5 px-3 py-2.5 rounded-2xl font-medium text-xs transition-all duration-200 ${
                isActive
                  ? 'bg-[#2E2520] text-[#FAF8F5] shadow-md shadow-[#2E2520]/15 font-bold'
                  : 'text-[#7A7268] hover:text-[#201C1A] hover:bg-[#F5F2EB]'
              }`}
              title={item.label}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-transform ${
                  isActive ? 'text-[#EFE9E1]' : 'text-[#8C847B]'
                }`}
              />
              {!isCollapsed && (
                <span className="hidden lg:inline-block tracking-tight truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="p-3 border-t border-[#F0ECE4] bg-[#FAF8F4] shrink-0">
        {!isCollapsed && (
          <div className="hidden lg:flex items-center justify-between gap-2 px-2 py-1.5 mb-2">
            <div className="truncate">
              <p className="text-[10px] font-medium text-[#9B9489] uppercase tracking-wider">Login</p>
              <p className="text-xs font-bold text-[#201C1A] truncate">{userName}</p>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
          </div>
        )}

        <button
          onClick={handleLogout}
          className={`w-full flex items-center ${
            isCollapsed ? 'justify-center' : 'justify-center lg:justify-start'
          } gap-2 px-3 py-2 text-xs font-bold text-[#964B3B] hover:text-red-700 hover:bg-[#FBEBE8] rounded-xl border border-[#F3DAD5] transition-colors`}
          title="Keluar Akun"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span className="hidden lg:inline">Keluar Akun</span>}
        </button>
      </div>
    </aside>
  );
}
