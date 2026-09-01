'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import ConfirmModal from '@/components/confirm-modal';
import { useFilterLoading } from '@/context/filter-loading-context';
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
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  Loader2,
} from 'lucide-react';

const ALL_NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['owner', 'manager'] },
  { href: '/pos', label: 'Kasir POS', icon: UtensilsCrossed, roles: ['owner', 'manager', 'kasir'] },
  { href: '/orders', label: 'Riwayat Transaksi', icon: Receipt, roles: ['owner', 'manager', 'kasir'] },
  { href: '/products', label: 'Produk & Menu', icon: Package, roles: ['owner', 'manager'] },
  { href: '/discounts', label: 'Diskon & Promo', icon: Tag, roles: ['owner', 'manager'] },
  { href: '/stok', label: 'Stok & Inventori', icon: Warehouse, roles: ['owner', 'manager'] },
  { href: '/shift', label: 'Shift Kasir', icon: Clock, roles: ['owner', 'manager', 'kasir'] },
  { href: '/expenses', label: 'Pengeluaran', icon: WalletCards, roles: ['owner', 'manager'] },
  { href: '/profit-loss', label: 'Laba Rugi', icon: TrendingUp, roles: ['owner'] },
  { href: '/bagi-hasil', label: 'Bagi Hasil', icon: Users2, roles: ['owner'] },
  { href: '/outlets', label: 'Kelola Outlet', icon: Store, roles: ['owner'] },
  { href: '/staff', label: 'Staff & Kasir', icon: UserCog, roles: ['owner'] },
  { href: '/settings', label: 'Pengaturan', icon: Settings, roles: ['owner', 'manager'] },
];

export default function AppShell({
  userName = 'Kasir / Owner',
  userRole = 'kasir',
  children,
}: {
  userName?: string;
  userRole?: 'owner' | 'manager' | 'kasir';
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isPending } = useFilterLoading();
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const navItems = ALL_NAV_ITEMS.filter((item) => item.roles.includes(userRole));

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authClient.signOut();
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
      setIsLoggingOut(false);
    }
  };

  const isPOSPage = pathname === '/pos' || pathname.startsWith('/pos/');

  return (
    <div className="flex h-screen overflow-hidden bg-[#F7F5F0] text-[#1E1B18]">
      {/* ============================================================ */}
      {/* 1. DESKTOP / TABLET LANDSCAPE SIDEBAR (>= 1024px) */}
      {/* ============================================================ */}
      <aside
        className={`hidden lg:flex flex-col h-screen sticky top-0 shrink-0 bg-white border-r border-[#EBE7DF] transition-all duration-300 z-30 select-none ${
          isDesktopCollapsed ? 'w-16 xl:w-20' : 'w-56 xl:w-64'
        }`}
      >
        {/* Brand Header */}
        <div className="p-3.5 border-b border-[#F0ECE4] flex items-center justify-between shrink-0 min-h-[64px] gap-2">
          {isDesktopCollapsed ? (
            <button
              type="button"
              onClick={() => setIsDesktopCollapsed(false)}
              className="w-full flex justify-center items-center py-1 group cursor-pointer"
              title="Perluas Sidebar"
            >
              <div className="relative w-9 h-9 rounded-2xl overflow-hidden bg-[#F7F5F0] border border-[#E8E3DA] p-1 flex items-center justify-center group-hover:scale-105 transition-all">
                <Image
                  src="/logo-banner.webp"
                  alt="Seruni"
                  width={28}
                  height={28}
                  className="object-contain"
                  priority
                />
              </div>
            </button>
          ) : (
            <>
              <Link
                href="/dashboard"
                className="flex-1 flex items-center justify-center overflow-hidden transition-transform hover:scale-[1.02] cursor-pointer"
                title="Toko Kopi Seruni"
              >
                <div className="relative w-full h-9 flex items-center justify-center">
                  <Image
                    src="/logo-banner.webp"
                    alt="Toko Kopi Seruni"
                    width={160}
                    height={40}
                    className="object-contain object-center h-full w-auto mx-auto"
                    priority
                  />
                </div>
              </Link>
              <button
                type="button"
                onClick={() => setIsDesktopCollapsed(true)}
                className="p-1 rounded-xl hover:bg-[#FAF8F5] text-[#8E867C] hover:text-[#201C1A] transition-colors shrink-0 cursor-pointer"
                title="Ciutkan Sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname?.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-2.5 py-2 rounded-2xl font-medium text-xs transition-all duration-200 overflow-hidden whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#2E2520] text-[#FAF8F5] shadow-xs font-bold'
                    : 'text-[#7A7268] hover:text-[#201C1A] hover:bg-[#F5F2EB]'
                }`}
                title={item.label}
              >
                <div
                  className={`flex items-center justify-center shrink-0 ${
                    isDesktopCollapsed ? 'w-full' : 'w-4 mr-2.5'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${isActive ? 'text-[#EFE9E1]' : 'text-[#8C847B]'}`}
                  />
                </div>
                {!isDesktopCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Desktop User Info & Logout */}
        <div className="p-2.5 border-t border-[#F0ECE4] bg-[#FAF8F4] shrink-0">
          {!isDesktopCollapsed && (
            <div className="flex items-center justify-between gap-2 mb-1.5 px-2 py-0.5">
              <div className="truncate flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <p className="text-[9px] font-bold text-[#9B9489] uppercase tracking-wider">
                    {userRole === 'owner' ? 'Owner' : userRole === 'manager' ? 'Manajer' : 'Kasir'}
                  </p>
                  <span
                    className={`text-[8px] font-black uppercase px-1 py-0.2 rounded ${
                      userRole === 'owner'
                        ? 'bg-[#FAF3E8] text-[#96631E] border border-[#F2E0C4]'
                        : userRole === 'manager'
                        ? 'bg-[#EBF6EE] text-[#2D7A47] border border-[#D1EBD8]'
                        : 'bg-[#FAF8F5] text-[#4A4238] border border-[#E5E0D6]'
                    }`}
                  >
                    {userRole}
                  </span>
                </div>
                <p className="text-xs font-bold text-[#201C1A] truncate">{userName}</p>
              </div>
              <span className="w-2 h-2 shrink-0 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsLogoutModalOpen(true)}
            className={`flex items-center px-2.5 py-1.5 text-xs font-bold text-[#964B3B] hover:text-red-700 hover:bg-[#FBEBE8] rounded-xl border border-[#F3DAD5] transition-all cursor-pointer ${
              isDesktopCollapsed ? 'w-full justify-center' : 'w-full justify-start gap-2'
            }`}
            title="Keluar Akun"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            {!isDesktopCollapsed && <span>Keluar Akun</span>}
          </button>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* 2. MOBILE / TABLET PORTRAIT DRAWER OVERLAY (< 1024px) */}
      {/* ============================================================ */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop Blur */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Drawer Panel */}
          <aside className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white border-r border-[#EBE7DF] shadow-2xl flex flex-col z-50 animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#F0ECE4] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#F7F5F0] border border-[#E8E3DA] p-1 flex items-center justify-center">
                  <Image
                    src="/logo-banner.webp"
                    alt="Seruni"
                    width={28}
                    height={28}
                    className="object-contain"
                  />
                </div>
                <div>
                  <h3 className="font-serif font-black text-sm text-[#201C1A]">Toko Kopi Seruni</h3>
                  <p className="text-[10px] text-[#8E867C]">POS & Multi-Cabang</p>
                </div>
              </div>

              <button
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1.5 rounded-xl hover:bg-[#FAF8F5] text-[#8E867C] hover:text-[#201C1A] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Navigation Links */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname?.startsWith(`${item.href}/`));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className={`flex items-center px-3.5 py-2.5 rounded-2xl font-bold text-xs transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#2E2520] text-[#FAF8F5] shadow-xs'
                        : 'text-[#7A7268] hover:text-[#201C1A] hover:bg-[#F5F2EB]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mr-3 ${isActive ? 'text-[#EFE9E1]' : 'text-[#8C847B]'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Drawer User & Logout */}
            <div className="p-4 border-t border-[#F0ECE4] bg-[#FAF8F4] shrink-0 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="text-[10px] font-bold text-[#8E867C] uppercase">
                      {userRole === 'owner' ? 'Owner' : userRole === 'manager' ? 'Manajer' : 'Kasir'}
                    </p>
                    <span
                      className={`text-[8px] font-black uppercase px-1 py-0.2 rounded ${
                        userRole === 'owner'
                          ? 'bg-[#FAF3E8] text-[#96631E] border border-[#F2E0C4]'
                          : userRole === 'manager'
                          ? 'bg-[#EBF6EE] text-[#2D7A47] border border-[#D1EBD8]'
                          : 'bg-[#FAF8F5] text-[#4A4238] border border-[#E5E0D6]'
                      }`}
                    >
                      {userRole}
                    </span>
                  </div>
                  <p className="text-xs font-black text-[#201C1A]">{userName}</p>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
              </div>

              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-[#964B3B] hover:bg-[#FBEBE8] rounded-xl border border-[#F3DAD5] transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar Akun</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. MAIN CONTENT CONTAINER */}
      {/* ============================================================ */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        {/* Top Progress Loading Bar for Global Filters & Navigation */}
        {isPending && (
          <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gradient-to-r from-[#2D7A47] via-[#D49E35] to-[#2D7A47] animate-pulse shadow-sm" />
        )}

        {/* Mobile / Tablet Portrait Top Bar (< 1024px) */}
        <header className="lg:hidden h-14 bg-white border-b border-[#EBE7DF] px-3 sm:px-4 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="p-2 rounded-xl bg-[#FAF8F5] border border-[#E5E0D6] text-[#201C1A] hover:bg-[#F2ECE3] transition-colors cursor-pointer"
              title="Buka Menu"
            >
              <Menu className="w-4 h-4" />
            </button>

            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-7 h-7 relative rounded-lg overflow-hidden bg-[#FAF8F5] flex items-center justify-center">
                <Image src="/logo-banner.webp" alt="Seruni" width={24} height={24} className="object-contain" />
              </div>
              <span className="font-serif font-black text-xs text-[#201C1A] tracking-tight">Kopi Seruni</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/pos"
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isPOSPage
                  ? 'bg-[#2E2520] text-white shadow-xs'
                  : 'bg-[#FAF8F5] text-[#4A4238] border border-[#ECE7DE]'
              }`}
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>POS</span>
            </Link>
          </div>
        </header>

        {/* Scrollable / Fill Main View */}
        <main
          className={`flex-1 min-w-0 overflow-y-auto transition-all duration-200 relative ${
            isPending ? 'opacity-50 cursor-wait pointer-events-none' : 'opacity-100'
          } ${
            isPOSPage
              ? 'p-2.5 sm:p-3.5 lg:p-4 flex flex-col h-[calc(100vh-3.5rem)] lg:h-screen min-h-0'
              : 'p-3.5 sm:p-5 lg:p-6 xl:p-8 max-w-[1600px] w-full mx-auto pb-20'
          }`}
        >
          {isPending && (
            <div className="fixed bottom-6 right-6 z-40 bg-[#201C1A] text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-[#3E3835] flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#64B87C]" />
              <span>Memperbarui data periode...</span>
            </div>
          )}
          {children}
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={isLogoutModalOpen}
        title="Konfirmasi Keluar Akun"
        description="Apakah Anda yakin ingin keluar dari sistem Kopi Seruni POS? Anda harus memasukkan email dan password untuk masuk kembali."
        confirmLabel="Ya, Keluar Akun"
        cancelLabel="Batal"
        variant="danger"
        isPending={isLoggingOut}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
        itemDetails={[
          { label: 'Pengguna', value: userName },
          { label: 'Peran Akun', value: userRole.toUpperCase() },
        ]}
      />
    </div>
  );
}
