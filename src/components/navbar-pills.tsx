'use client';

import { useState, useEffect } from 'react';
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

  // Page-specific rules:
  // 1. Single outlet only pages: POS, Shift, Settings, Stok, Bagi Hasil
  const singleOutletPages = ['/pos', '/shift', '/settings', '/stok', '/bagi-hasil'];
  const isSingleOutletOnly = singleOutletPages.some((p) => pathname === p || pathname.startsWith(p + '/'));

  // 2. Hide outlet filter entirely on global master data pages
  const hideOutletPages = ['/outlets', '/staff', '/api-docs'];
  const showOutletPill = !hideOutletPages.some((p) => pathname === p || pathname.startsWith(p + '/'));

  // 3. Show date filter presets only on relevant reporting and analytic pages
  const dateFilterPages = ['/dashboard', '/profit-loss', '/orders', '/expenses', '/bagi-hasil'];
  const showDateFilterPill = dateFilterPages.some((p) => pathname === p || pathname.startsWith(p + '/'));

  const rawOutletId = searchParams?.get('outletId');
  const defaultSingleOutletId = outlets[0]?.id || 'out_default';
  const currentEffectiveOutletId = isSingleOutletOnly
    ? rawOutletId && rawOutletId !== 'all'
      ? rawOutletId
      : defaultSingleOutletId
    : rawOutletId || 'all';

  const selectedPeriod = searchParams?.get('period') || 'today';

  const [isCustomDateOpen, setIsCustomDateOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Sync custom date state from URL params
  useEffect(() => {
    const rawFrom = searchParams?.get('from');
    const rawTo = searchParams?.get('to');
    if (rawFrom) {
      const fromDate = new Date(Number(rawFrom) * 1000);
      if (!isNaN(fromDate.getTime())) {
        setCustomFrom(fromDate.toISOString().slice(0, 10));
      }
    }
    if (rawTo) {
      const toDate = new Date(Number(rawTo) * 1000);
      if (!isNaN(toDate.getTime())) {
        setCustomTo(toDate.toISOString().slice(0, 10));
      }
    }
  }, [searchParams]);

  // If user enters a single-outlet-only page with no outletId or outletId='all', sync URL
  useEffect(() => {
    if (isSingleOutletOnly && (!rawOutletId || rawOutletId === 'all') && outlets.length > 0) {
      const params = new URLSearchParams(searchParams?.toString() || '');
      params.set('outletId', defaultSingleOutletId);
      router.replace(`${pathname}?${params.toString()}`);
    }
  }, [pathname, isSingleOutletOnly, rawOutletId, defaultSingleOutletId, outlets.length, router, searchParams]);

  const handleOutletChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (!isSingleOutletOnly && (value === 'all' || !value)) {
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

    const fromEpoch = Math.floor(new Date(customFrom + 'T00:00:00').getTime() / 1000);
    const toEpoch = Math.floor(new Date(customTo + 'T23:59:59').getTime() / 1000);

    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('period', 'custom');
    params.set('from', fromEpoch.toString());
    params.set('to', toEpoch.toString());
    const query = params.toString();
    setIsCustomDateOpen(false);
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-2.5 pb-3 mb-3 lg:pb-4 lg:mb-4 border-b border-[#EBE7DF]/80">
      {/* LEFT PILLS: Global Outlet Switcher */}
      {showOutletPill ? (
        <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-2xl border border-[#EBE7DF] shadow-xs text-xs">
          <div className="flex items-center gap-1.5">
            <Store className="w-4 h-4 text-[#54382B]" />
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <select
            value={currentEffectiveOutletId}
            onChange={handleOutletChange}
            className="text-xs font-bold text-[#201C1A] bg-transparent border-none focus:outline-none cursor-pointer pr-1"
          >
            {!isSingleOutletOnly && <option value="all">Semua Cabang (Global)</option>}
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="hidden sm:block" />
      )}

      {/* CENTER PILLS: Global Date Range Presets */}
      {showDateFilterPill ? (
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
      ) : (
        <div className="hidden sm:block" />
      )}

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
          className="relative p-1.5 text-[#7A7268] hover:text-[#201C1A] hover:bg-[#FAF8F5] rounded-xl transition-all"
          title="Notifikasi Operasional"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute 1 top-1 right-1 w-2 h-2 bg-amber-500 rounded-full ring-2 ring-white" />
        </button>

        {/* Notification Dropdown Popover */}
        {isNotifOpen && (
          <div className="absolute right-0 top-full mt-3 w-80 bg-white rounded-3xl border border-[#EBE7DF] shadow-xl p-4 z-50 animate-in fade-in slide-in-from-top-2 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0ECE4]">
              <span className="font-bold text-[#201C1A] flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-[#54382B]" /> Notifikasi Sistem
              </span>
              <button
                type="button"
                onClick={() => setIsNotifOpen(false)}
                className="text-[#9E968B] hover:text-[#201C1A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-3 space-y-2.5">
              <div className="p-2.5 bg-[#FAF8F5] rounded-2xl border border-[#ECE7DE] flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <div>
                  <p className="font-bold text-[11px] text-[#201C1A]">Database Turso Siap</p>
                  <p className="text-[10px] text-[#8E867C] mt-0.5">
                    Sistem POS & mutasi tersinkronisasi online real-time.
                  </p>
                </div>
              </div>

              <div className="p-2.5 bg-[#FAF8F5] rounded-2xl border border-[#ECE7DE] flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <div>
                  <p className="font-bold text-[11px] text-[#201C1A]">Bagi Hasil Periode Berjalan</p>
                  <p className="text-[10px] text-[#8E867C] mt-0.5">
                    Siap digenerate pada akhir bulan melalui menu Bagi Hasil.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#F0ECE4] text-center">
              <span className="text-[10px] font-bold text-[#8E867C]">Semua sistem operasional normal</span>
            </div>
          </div>
        )}
      </div>

      {/* Custom Date Picker Modal */}
      {isCustomDateOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#54382B]" />
                <h3 className="font-bold text-sm text-[#201C1A]">Pilih Rentang Tanggal</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomDateOpen(false)}
                className="text-[#9E968B] hover:text-[#201C1A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleApplyCustomDate} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#4A4238] mb-1">Dari Tanggal</label>
                <input
                  type="date"
                  required
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-[#4A4238] mb-1">Sampai Tanggal</label>
                <input
                  type="date"
                  required
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-semibold"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCustomDateOpen(false)}
                  className="flex-1 py-2.5 border border-[#E5E0D6] text-[#7A7268] font-bold rounded-2xl hover:bg-[#FAF8F5]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#2E2520] hover:bg-[#453932] text-white font-bold rounded-2xl shadow-xs"
                >
                  Terapkan Filter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
