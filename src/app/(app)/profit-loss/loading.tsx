import { Skeleton } from '@/components/ui/skeleton';

export default function ProfitLossLoading() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-64 rounded-xl" />
          <Skeleton className="h-3.5 w-96 rounded-md" />
        </div>
        <Skeleton className="h-10 w-36 rounded-2xl" />
      </div>

      {/* Waterfall Breakdown Table */}
      <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs overflow-hidden max-w-4xl">
        <div className="px-6 py-5 border-b border-[#F0ECE4] flex justify-between items-center bg-[#FAF8F5]">
          <Skeleton className="h-5 w-44 rounded-md" />
          <Skeleton className="h-6 w-28 rounded-lg" />
        </div>

        <div className="divide-y divide-[#F4F0E8]">
          {[
            { indent: false, h: 'h-14', isTotal: false },
            { indent: true, h: 'h-14', isTotal: false },
            { indent: false, h: 'h-14', isTotal: false },
            { indent: true, h: 'h-14', isTotal: false },
            { indent: false, h: 'h-16', isTotal: true },
          ].map((row, idx) => (
            <div
              key={idx}
              className={`px-6 py-4 flex items-center justify-between ${
                row.isTotal ? 'bg-[#FAF8F5]' : ''
              }`}
            >
              <div className={`flex items-center gap-3 ${row.indent ? 'ml-4' : ''}`}>
                <Skeleton className="w-8 h-8 rounded-xl" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-40 rounded-md" />
                  <Skeleton className="h-2.5 w-28 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-6 w-32 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
