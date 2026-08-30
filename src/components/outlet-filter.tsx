'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Store } from 'lucide-react';
import type { Outlet } from '@/lib/schema';

export default function OutletFilter({
  outlets,
  selectedOutletId = 'all',
  paramName = 'outletId',
  showAllOption = true,
  label = 'Outlet:',
}: {
  outlets: Outlet[];
  selectedOutletId?: string;
  paramName?: string;
  showAllOption?: boolean;
  label?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (value === 'all' || !value) {
      params.delete(paramName);
    } else {
      params.set(paramName, value);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-2xl border border-[#EBE7DF] shadow-xs text-xs">
      <Store className="w-3.5 h-3.5 text-[#54382B]" />
      {label && <span className="text-[11px] font-bold text-[#8E867C]">{label}</span>}
      <select
        value={selectedOutletId}
        onChange={handleChange}
        className="text-xs font-bold text-[#201C1A] bg-transparent border-none focus:outline-none cursor-pointer"
      >
        {showAllOption && <option value="all">Semua Cabang</option>}
        {outlets.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  );
}
