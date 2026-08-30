'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  pageSize = 10,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('page', page.toString());
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[#F0ECE4] text-xs">
      <p className="text-[#8E867C]">
        Menampilkan <strong className="text-[#201C1A]">{startItem}</strong> -{' '}
        <strong className="text-[#201C1A]">{endItem}</strong> dari total{' '}
        <strong className="text-[#201C1A]">{totalItems}</strong> data
      </p>

      <div className="flex items-center gap-1.5 self-end sm:self-auto">
        <button
          type="button"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-1.5 rounded-xl border border-[#EBE7DF] bg-white hover:bg-[#FAF8F5] text-[#201C1A] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Halaman Sebelumnya"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {getPageNumbers().map((p, idx) =>
          typeof p === 'number' ? (
            <button
              key={idx}
              type="button"
              onClick={() => goToPage(p)}
              className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                currentPage === p
                  ? 'bg-[#2E2520] text-white shadow-xs'
                  : 'bg-white border border-[#EBE7DF] text-[#7A7268] hover:text-[#201C1A] hover:bg-[#FAF8F5]'
              }`}
            >
              {p}
            </button>
          ) : (
            <span key={idx} className="px-1 text-[#8E867C]">
              {p}
            </span>
          )
        )}

        <button
          type="button"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded-xl border border-[#EBE7DF] bg-white hover:bg-[#FAF8F5] text-[#201C1A] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Halaman Berikutnya"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
