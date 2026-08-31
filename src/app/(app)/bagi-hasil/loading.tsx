import { Skeleton } from '@/components/ui/skeleton';

export default function BagiHasilLoading() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-60 rounded-xl" />
          <Skeleton className="h-3.5 w-80 rounded-md" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-36 rounded-2xl" />
          <Skeleton className="h-10 w-36 rounded-2xl" />
        </div>
      </div>

      {/* Rules Table */}
      <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#F0ECE4] pb-4">
          <Skeleton className="h-5 w-44 rounded-md" />
          <Skeleton className="h-4 w-32 rounded-md" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-12 border-b border-[#F4F0E8] flex items-center justify-between px-2"
            >
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#F0ECE4] pb-4">
          <Skeleton className="h-5 w-48 rounded-md" />
          <Skeleton className="h-4 w-28 rounded-md" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-12 border-b border-[#F4F0E8] flex items-center justify-between px-2"
            >
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24 font-bold" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-8 w-24 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
