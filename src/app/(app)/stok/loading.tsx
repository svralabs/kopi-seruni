import { Skeleton } from '@/components/ui/skeleton';

export default function StockLoading() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-56 rounded-xl" />
          <Skeleton className="h-3.5 w-80 rounded-md" />
        </div>
        <Skeleton className="h-10 w-36 rounded-2xl" />
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs flex items-center justify-between"
          >
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-24 rounded-md" />
              <Skeleton className="h-7 w-16 rounded-lg" />
            </div>
            <Skeleton className="w-10 h-10 rounded-2xl" />
          </div>
        ))}
      </div>

      {/* Table Card with Tab switcher */}
      <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F0ECE4] pb-4">
          {/* Tabs */}
          <div className="flex gap-2 bg-[#F9F7F2] p-1 rounded-2xl border border-[#E5E0D6] w-fit">
            <Skeleton className="h-8 w-32 rounded-xl" />
            <Skeleton className="h-8 w-28 rounded-xl" />
            <Skeleton className="h-8 w-32 rounded-xl" />
          </div>
          <Skeleton className="h-9 w-60 rounded-xl" />
        </div>

        {/* Table Rows */}
        <div className="space-y-3">
          <div className="h-10 bg-[#FAF8F5] rounded-xl flex items-center px-4 justify-between">
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-12 border-b border-[#F4F0E8] flex items-center px-4 justify-between"
            >
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
