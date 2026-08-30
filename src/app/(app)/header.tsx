import { Bell, Store } from 'lucide-react';

export default function Header({ userName = 'Kasir' }: { userName?: string }) {
  return (
    <header className="flex items-center justify-between gap-4 pb-6">
      {/* Left: Outlet status pill */}
      <div className="flex items-center gap-2.5 px-3.5 py-1.5 bg-white border border-[#EBE7DF] rounded-2xl shadow-xs">
        <Store className="w-4 h-4 text-[#54382B]" />
        <span className="text-xs font-semibold text-[#201C1A]">Kopi Seruni — Outlet Pusat</span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      </div>

      {/* Right: Floating Cashier Profile Bento Card matching reference design */}
      <div className="flex items-center gap-3 bg-white border border-[#EBE7DF] rounded-2xl px-4 py-2 shadow-xs">
        <div className="w-9 h-9 rounded-xl bg-[#F2EFE8] border border-[#E2DDD3] flex items-center justify-center text-xs font-bold text-[#54382B] shrink-0">
          {userName.slice(0, 2).toUpperCase()}
        </div>
        <div className="text-left leading-tight pr-2">
          <p className="text-[10px] uppercase font-bold tracking-wider text-[#9E968B]">
            Kasir Aktif
          </p>
          <p className="text-xs font-bold text-[#201C1A] truncate max-w-[120px]">
            {userName}
          </p>
        </div>
        <div className="h-6 w-px bg-[#EBE7DF]" />
        <button
          className="relative p-1.5 text-[#7A7268] hover:text-[#201C1A] transition-colors rounded-lg hover:bg-[#F7F5F0]"
          title="Notifikasi"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-600 ring-2 ring-white" />
        </button>
      </div>
    </header>
  );
}
