'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

interface SortableThProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  label: string;
  field: string;
}

export default function SortableTh({ label, field, className = '', ...props }: SortableThProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSort = searchParams.get('sort');
  const currentDir = searchParams.get('dir');

  const isActive = currentSort === field;
  const isAsc = isActive && currentDir === 'asc';
  const isDesc = isActive && currentDir === 'desc';

  const handleClick = () => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (isActive) {
      if (isAsc) {
        params.set('dir', 'desc');
      } else {
        params.set('dir', 'asc');
      }
    } else {
      params.set('sort', field);
      params.set('dir', 'asc');
    }
    
    if (params.has('page')) {
      params.set('page', '1');
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <th 
      {...props} 
      className={`py-3.5 px-4 cursor-pointer hover:bg-[#F2ECE3] transition-colors group select-none ${className}`}
      onClick={handleClick}
    >
      <div className="flex items-center gap-1.5">
        <span className={isActive ? 'text-[#54382B]' : ''}>{label}</span>
        {isAsc ? (
          <ArrowUp className="w-3.5 h-3.5 text-[#54382B]" />
        ) : isDesc ? (
          <ArrowDown className="w-3.5 h-3.5 text-[#54382B]" />
        ) : (
          <ArrowUpDown className="w-3.5 h-3.5 text-[#D1CCC5] group-hover:text-[#9B9389]" />
        )}
      </div>
    </th>
  );
}
