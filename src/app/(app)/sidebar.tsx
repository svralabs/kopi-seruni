'use client';

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

  const handleLogout = async () => {
    await authClient.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <aside className="w-20 lg:w-60 bg-white border-r border-[#EBE7DF] flex flex-col min-h-screen shrink-0 transition-all">
      {/* Brand Logo */}
      <div className="p-4 lg:p-6 border-b border-[#F0ECE4] flex items-center justify-center lg:justify-start gap-3">
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
        <div className="hidden lg:block">
          <h1 className="font-serif font-black text-sm tracking-tight text-[#201C1A] leading-tight">
            TOKO KOPI
          </h1>
          <p className="font-serif text-lg font-bold text-[#54382B] -mt-1 tracking-tight">
            Seruni
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 lg:p-4 space-y-1.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(`${item.href}/`));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-center lg:justify-start gap-3.5 px-3 py-3 rounded-2xl font-medium text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-[#2E2520] text-[#FAF8F5] shadow-md shadow-[#2E2520]/15 font-semibold'
                  : 'text-[#7A7268] hover:text-[#201C1A] hover:bg-[#F5F2EB]'
              }`}
              title={item.label}
            >
              <Icon
                className={`w-5 h-5 shrink-0 transition-transform ${
                  isActive ? 'text-[#EFE9E1]' : 'text-[#8C847B]'
                }`}
              />
              <span className="hidden lg:inline-block tracking-tight text-[13px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="p-3 lg:p-4 border-t border-[#F0ECE4] bg-[#FAF8F4]">
        <div className="hidden lg:flex items-center justify-between gap-2 px-2 py-1.5 mb-2">
          <div className="truncate">
            <p className="text-[11px] font-medium text-[#9B9489] uppercase tracking-wider">Login</p>
            <p className="text-xs font-semibold text-[#201C1A] truncate">{userName}</p>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center lg:justify-start gap-2.5 px-3 py-2.5 text-xs font-semibold text-[#964B3B] hover:text-red-700 hover:bg-[#FBEBE8] rounded-xl border border-[#F3DAD5] transition-colors"
          title="Keluar"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span className="hidden lg:inline">Keluar Akun</span>
        </button>
      </div>
    </aside>
  );
}
