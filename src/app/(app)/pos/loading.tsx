import { Skeleton } from '@/components/ui/skeleton';

export default function POSLoading() {
  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8.5rem)]">
      {/* Left Column: Product Grid */}
      <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
        {/* Search & Category Pills */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Skeleton className="h-10 flex-1 rounded-2xl" />
          <div className="flex gap-2 overflow-x-auto">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-24 rounded-2xl shrink-0" />
            ))}
          </div>
        </div>

        {/* Product Cards Grid: 8 Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 flex-1 overflow-hidden">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="bg-white rounded-3xl border border-[#EBE7DF] p-3.5 flex flex-col justify-between space-y-3"
            >
              <Skeleton className="h-28 w-full rounded-2xl" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-3/4 rounded-md" />
                <Skeleton className="h-3 w-1/2 rounded-md" />
              </div>
              <div className="flex items-center justify-between pt-1">
                <Skeleton className="h-5 w-20 rounded-md" />
                <Skeleton className="w-8 h-8 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column: Cart Panel */}
      <div className="w-full lg:w-96 bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs flex flex-col justify-between shrink-0 h-full space-y-4">
        {/* Cart Header */}
        <div className="flex items-center justify-between border-b border-[#F0ECE4] pb-4">
          <div className="space-y-1">
            <Skeleton className="h-5 w-28 rounded-md" />
            <Skeleton className="h-3 w-20 rounded-md" />
          </div>
          <Skeleton className="w-8 h-8 rounded-xl" />
        </div>

        {/* Cart Items Placeholder */}
        <div className="flex-1 space-y-3 py-2 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#F0ECE4] flex items-center justify-between"
            >
              <div className="space-y-1 w-1/2">
                <Skeleton className="h-4 w-28 rounded-md" />
                <Skeleton className="h-3 w-16 rounded-md" />
              </div>
              <Skeleton className="h-6 w-20 rounded-xl" />
            </div>
          ))}
        </div>

        {/* Cart Calculation Breakdown */}
        <div className="space-y-2.5 border-t border-[#F0ECE4] pt-4">
          <div className="flex justify-between">
            <Skeleton className="h-3.5 w-16 rounded-md" />
            <Skeleton className="h-3.5 w-20 rounded-md" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-3.5 w-20 rounded-md" />
            <Skeleton className="h-3.5 w-16 rounded-md" />
          </div>
          <div className="flex justify-between pt-1 border-t border-[#F0ECE4]">
            <Skeleton className="h-5 w-24 rounded-md" />
            <Skeleton className="h-6 w-28 rounded-md" />
          </div>
          <Skeleton className="h-12 w-full rounded-2xl mt-2" />
        </div>
      </div>
    </div>
  );
}
