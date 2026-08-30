'use client';

import { useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Store, Calendar, Bell, X, Check, ArrowRight } from 'lucide-react';
import type { Outlet } from '@/lib/schema';

export default function NavbarPills({
  outlets,
  userName = 'Kasir',
  userRole = 'owner',
  activeOutletName = 'Outlet Pusat',
}: {
  outlets: Outlet[];
  userName?: string;
  userRole?: string;
  activeOutletName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedOutletId = searchParams.get('outletId') || 'all';
  const selectedPeriod = searchParams.get('period') || 'today';

  const [isCustomDateOpen, setIsCustomDateOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const handleOutletChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (value === 'all' || !value) {
      params.delete('outletId');
    } else {
      params.set('outletId', value);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const handlePeriodChange = (periodKey: string) => {
    if (periodKey === 'custom') {
      setIsCustomDateOpen(true);
      return;
    }
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('period', periodKey);
    params.delete('from');
    params.delete('to');
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const handleApplyCustomDate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFrom || !customTo) return;

    const fromEpoch = Math.floor(new Date(customFrom).getTime() / 1000);
    const toEpoch = Math.floor(new Date(customTo).getTime() / 1000) + 86399;

    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('period', 'custom');
    params.set('from', fromEpoch.toString());
    params.set('to', toEpoch.toString());
    const query = params.toString();
    setIsCustomDateOpen(false);
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-3.5 pb-6 border-b border-[#EBE7DF]/80 mb-6">
      {/* LEFT PILLS: Global Outlet Switcher */}
      <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-2xl border border-[#EBE7DF] shadow-xs text-xs">
        <div className="flex items-center gap-1.5">
          <Store className="w-4 h-4 text-[#54382B]" />
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <select
          value={selectedOutletId}
          onChange={handleOutletChange}
          className="text-xs font-bold text-[#201C1A] bg-transparent border-none focus:outline-none cursor-pointer pr-1"
        >
          <option value="all">Semua Cabang (Global)</option>
          {outlets.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>

      {/* CENTER PILLS: Global Date Range Presets */}
      <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-[#EBE7DF] shadow-xs text-xs">
        {[
          { key: 'today', label: 'Hari Ini' },
          { key: '7d', label: 'Minggu Ini' },
          { key: 'this_month', label: 'Bulan Ini' },
          { key: 'custom', label: 'Kustom' },
        ].map((t) => {
          const isActive = selectedPeriod === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => handlePeriodChange(t.key)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs ${
                isActive
                  ? 'bg-[#2E2520] text-white shadow-xs'
                  : 'text-[#8E867C] hover:text-[#201C1A]'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* RIGHT PILL: Unified User Profile, Role Badge & Notification Bell */}
      <div className="relative flex items-center gap-3 bg-white border border-[#EBE7DF] rounded-2xl px-3.5 py-1.5 shadow-xs">
        <div className="w-8 h-8 rounded-xl bg-[#F2EFE8] border border-[#E2DDD3] flex items-center justify-center text-xs font-black text-[#54382B] shrink-0">
          {userName.slice(0, 2).toUpperCase()}
        </div>

        <div className="text-left leading-tight pr-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-[#201C1A] truncate max-w-[110px]">
              {userName}
            </span>
            <span
              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                userRole === 'owner'
                  ? 'bg-[#FAF3E8] text-[#96631E] border border-[#F2E0C4]'
                  : userRole === 'manager'
                  ? 'bg-[#EBF6EE] text-[#2D7A47] border border-[#D1EBD8]'
                  : 'bg-[#F4EFE6] text-[#54382B] border border-[#E5DDD0]'
              }`}
            >
              {userRole}
            </span>
          </div>
          <p className="text-[10px] text-[#8E867C] mt-0.5">{activeOutletName}</p>
        </div>

        <div className="h-5 w-px bg-[#EBE7DF]" />

        {/* Notification Bell with Dropdown */}
        <button
          type="button"
          onClick={() => setIsNotifOpen(!isNotifOpen)}
          className="relative p-1.5 text-[#7A7268] hover:text-[#201C1A] transition-colors rounded-lg hover:bg-[#F7F5F0]"
          title="Notifikasi Operasional"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-600 ring-2 ring-white" />
        </button>

        {/* Notification Dropdown Modal */}
        {isNotifOpen && (
          <div className="absolute right-0 top-12 w-72 bg-white rounded-3xl border border-[#EBE7DF] shadow-lg p-4 z-50 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-[#F0ECE4] pb-2">
              <span className="font-bold text-[#201C1A]">Notifikasi Sistem</span>
              <button
                onClick={() => setIsNotifOpen(false)}
                className="text-[#9E968B] hover:text-[#201C1A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              <div className="p-2.5 bg-[#FAF8F5] rounded-xl border border-[#EBE7DF]">
                <p className="font-bold text-[#201C1A]">Shift Kasir Aktif</p>
                <p className="text-[10px] text-[#8E867C] mt-0.5">Sesi kasir sedang berjalan di Outlet Pusat</p>
              </div>
              <div className="p-2.5 bg-[#FAF8F5] rounded-xl border border-[#EBE7DF]">
                <p className="font-bold text-[#201C1A]">Printer Thermal Ready</p>
                <p className="text-[10px] text-[#8E867C] mt-0.5">Format struk 58mm / 80mm terpasang</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CUSTOM DATE RANGE MODAL */}
      {isCustomDateOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xl p-6 max-w-sm w-full space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-[#F0ECE4] pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#54382B]" />
                <h3 className="font-bold text-sm text-[#201C1A]">Pilih Rentang Tanggal</h3>
              </div>
              <button
                onClick={() => setIsCustomDateOpen(false)}
                className="text-[#9E968B] hover:text-[#201C1A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleApplyCustomDate} className="space-y-3">
              <div>
                <label className="block font-bold text-[#4A4238] mb-1">Dari Tanggal</label>
                <input
                  type="date"
                  required
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-[#4A4238] mb-1">Sampai Tanggal</label>
                <input
                  type="date"
                  required
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-bold"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCustomDateOpen(false)}
                  className="w-1/2 py-2.5 bg-[#FAF8F5] text-[#8E867C] font-bold rounded-2xl border border-[#EBE7DF]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-[#2E2520] hover:bg-[#453932] text-white font-bold rounded-2xl transition-all shadow-xs"
                >
                  Terapkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
