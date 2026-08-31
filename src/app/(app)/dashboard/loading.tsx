import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      {/* Header Bento Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-64 rounded-xl" />
        <Skeleton className="h-4 w-96 rounded-lg" />
      </div>

      {/* KPI Bento Grid: 4 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-3xl border border-[#EBE7DF] p-6 shadow-xs flex flex-col justify-between space-y-4"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-28 rounded-md" />
              <Skeleton className="w-8 h-8 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-8 w-36 rounded-xl" />
              <Skeleton className="h-3 w-24 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      {/* Recent Orders Table Card */}
      <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-5 w-40 rounded-lg" />
            <Skeleton className="h-3 w-32 rounded-md" />
          </div>
          <Skeleton className="h-4 w-28 rounded-md" />
        </div>

        <div className="space-y-3 pt-2">
          {/* Table Header skeleton */}
          <div className="h-10 bg-[#FAF8F5] rounded-xl flex items-center px-4 gap-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-24 ml-auto" />
          </div>

          {/* Table Rows skeleton (5 rows) */}
          {[1, 2, 3, 4, 5].map((row) => (
            <div
              key={row}
              className="h-12 border-b border-[#F4F0E8] flex items-center px-4 gap-4"
            >
              <Skeleton className="h-4 w-24" />
              <div className="space-y-1 w-32">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-2.5 w-16" />
              </div>
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-5 w-16 rounded-md" />
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-4 w-24 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
