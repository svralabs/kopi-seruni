import { Skeleton } from '@/components/ui/skeleton';

export default function ShiftLoading() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1.5">
        <Skeleton className="h-7 w-48 rounded-xl" />
        <Skeleton className="h-3.5 w-72 rounded-md" />
      </div>

      {/* Active Shift Status Card */}
      <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Skeleton className="w-14 h-14 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-44 rounded-md" />
            <Skeleton className="h-3.5 w-32 rounded-md" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="space-y-1 text-right">
            <Skeleton className="h-3 w-20 ml-auto" />
            <Skeleton className="h-6 w-32 ml-auto" />
          </div>
          <Skeleton className="h-11 w-32 rounded-2xl" />
        </div>
      </div>

      {/* Shifts History Table Card */}
      <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
        <Skeleton className="h-5 w-36 rounded-md" />
        
        <div className="h-10 bg-[#FAF8F5] rounded-xl flex items-center px-4 justify-between">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>

        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-12 border-b border-[#F4F0E8] flex items-center px-4 justify-between"
          >
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
