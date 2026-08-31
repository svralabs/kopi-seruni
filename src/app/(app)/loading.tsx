export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
      <div className="w-8 h-8 border-3 border-[#E5E0D6] border-t-[#54382B] rounded-full animate-spin" />
      <p className="text-xs font-medium text-[#8E867C] tracking-wide">
        Memuat data...
      </p>
    </div>
  );
}
