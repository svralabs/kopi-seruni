import { Skeleton } from '@/components/ui/skeleton';

export default function OrdersLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-52 rounded-xl" />
          <Skeleton className="h-3.5 w-72 rounded-md" />
        </div>
        <Skeleton className="h-10 w-36 rounded-2xl" />
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-3xl border border-[#EBE7DF] p-4 shadow-xs flex flex-wrap items-center gap-3">
        <Skeleton className="h-9 w-64 rounded-xl flex-1 min-w-[200px]" />
        <Skeleton className="h-9 w-32 rounded-xl" />
        <Skeleton className="h-9 w-32 rounded-xl" />
        <Skeleton className="h-9 w-40 rounded-xl" />
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
        <div className="h-10 bg-[#FAF8F5] rounded-xl flex items-center px-4 justify-between">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>

        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div
            key={i}
            className="h-14 border-b border-[#F4F0E8] flex items-center px-4 justify-between gap-4"
          >
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="h-3.5 w-24" />
            <div className="space-y-1 w-32">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-2.5 w-16" />
            </div>
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-5 w-16 rounded-md" />
            <div className="space-y-1 text-right">
              <Skeleton className="h-4 w-20 ml-auto" />
              <Skeleton className="h-3 w-14 rounded-full ml-auto" />
            </div>
            <Skeleton className="h-8 w-16 rounded-xl" />
          </div>
        ))}

        {/* Pagination Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-[#F0ECE4]">
          <Skeleton className="h-4 w-36" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20 rounded-xl" />
            <Skeleton className="h-8 w-20 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
