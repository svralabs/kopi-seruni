'use client';

import { useState, useEffect } from 'react';
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
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
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
      <div className="p-4 border-b border-[#F0ECE4] flex items-center justify-between shrink-0 min-h-[76px] gap-2">
        {isCollapsed ? (
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="w-full flex justify-center items-center group py-1"
            title="Perluas Sidebar"
          >
            <div className="relative w-11 h-11 rounded-2xl overflow-hidden bg-[#F7F5F0] border border-[#E8E3DA] p-1.5 flex items-center justify-center shadow-xs group-hover:border-[#54382B] group-hover:scale-105 transition-all">
              <Image
                src="/logo-banner.webp"
                alt="Toko Kopi Seruni"
                width={36}
                height={36}
                className="object-contain"
                priority
              />
            </div>
          </button>
        ) : (
          <>
            <Link 
              href="/dashboard" 
              className="flex-1 flex items-center justify-center overflow-hidden transition-transform hover:scale-[1.02]"
              title="Toko Kopi Seruni"
            >
              <div className="relative w-full h-12 flex items-center justify-center">
                <Image
                  src="/logo-banner.webp"
                  alt="Toko Kopi Seruni"
                  width={200}
                  height={56}
                  className="object-contain object-center h-full w-auto mx-auto"
                  priority
                />
              </div>
            </Link>

            {/* Toggle Button */}
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="hidden lg:flex p-1.5 rounded-xl hover:bg-[#FAF8F5] text-[#8E867C] hover:text-[#201C1A] transition-colors shrink-0"
              title="Ciutkan Sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname?.startsWith(`${item.href}/`));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3 py-2.5 rounded-2xl font-medium text-xs transition-all duration-300 overflow-hidden whitespace-nowrap ${
                isActive
                  ? 'bg-[#2E2520] text-[#FAF8F5] shadow-md shadow-[#2E2520]/15 font-bold'
                  : 'text-[#7A7268] hover:text-[#201C1A] hover:bg-[#F5F2EB]'
              }`}
              title={item.label}
            >
              <div className={`flex items-center justify-center shrink-0 transition-all duration-300 ${isCollapsed ? 'w-full' : 'w-4 mr-3.5'}`}>
                <Icon
                  className={`w-4 h-4 transition-transform ${
                    isActive ? 'text-[#EFE9E1]' : 'text-[#8C847B]'
                  }`}
                />
              </div>
              <span className={`hidden lg:inline transition-all duration-300 ease-in-out truncate ${
                isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'
              }`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="p-3 border-t border-[#F0ECE4] bg-[#FAF8F4] shrink-0 overflow-hidden">
        <div className={`hidden lg:flex items-center justify-between gap-2 overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${
          isCollapsed ? 'max-h-0 opacity-0 mb-0 px-0 py-0' : 'max-h-16 opacity-100 mb-2 px-2 py-1.5'
        }`}>
          <div className="truncate flex-1">
            <p className="text-[10px] font-medium text-[#9B9489] uppercase tracking-wider">Login</p>
            <p className="text-xs font-bold text-[#201C1A] truncate">{userName}</p>
          </div>
          <span className="w-2 h-2 shrink-0 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
        </div>

        <button
          onClick={handleLogout}
          className={`flex items-center px-3 py-2 text-xs font-bold text-[#964B3B] hover:text-red-700 hover:bg-[#FBEBE8] rounded-xl border border-[#F3DAD5] transition-all duration-300 overflow-hidden whitespace-nowrap ${
            isCollapsed ? 'w-full justify-center' : 'w-full justify-start'
          }`}
          title="Keluar Akun"
        >
          <div className={`flex items-center justify-center shrink-0 transition-all duration-300 ${isCollapsed ? 'w-full' : 'w-4 mr-2'}`}>
            <LogOut className="w-4 h-4" />
          </div>
          <span className={`hidden lg:inline transition-all duration-300 ease-in-out ${
            isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[100px] opacity-100'
          }`}>
            Keluar Akun
          </span>
        </button>
      </div>
    </aside>
  );
}
