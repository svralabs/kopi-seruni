import { Skeleton } from '@/components/ui/skeleton';

export default function ExpensesLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-60 rounded-xl" />
          <Skeleton className="h-3.5 w-80 rounded-md" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32 rounded-2xl" />
          <Skeleton className="h-10 w-40 rounded-2xl" />
        </div>
      </div>

      {/* Expenses Table Card */}
      <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#F0ECE4] pb-4">
          <div className="space-y-1">
            <Skeleton className="h-3 w-28 rounded-md" />
            <Skeleton className="h-6 w-36 rounded-lg" />
          </div>
          <Skeleton className="h-9 w-48 rounded-xl" />
        </div>

        <div className="h-10 bg-[#FAF8F5] rounded-xl flex items-center px-4 justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>

        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-12 border-b border-[#F4F0E8] flex items-center px-4 justify-between"
          >
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-5 w-20 rounded-md" />
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-4 w-24 font-bold" />
            <Skeleton className="h-6 w-12 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
