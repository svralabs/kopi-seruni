import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF8F5] p-4 text-center">
      <div className="w-16 h-16 rounded-3xl bg-[#FBEBE8] border border-[#F5C7BE] flex items-center justify-center text-[#964B3B] mb-4">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold text-[#201C1A] mb-2">Akses Ditolak</h1>
      <p className="text-[#8E867C] text-sm max-w-sm mb-6">
        Anda tidak memiliki izin akses untuk membuka halaman ini. Silakan hubungi Owner atau Administrator.
      </p>
      <Link
        href="/pos"
        className="px-5 py-2.5 bg-[#2E2520] hover:bg-[#453932] text-white text-xs font-bold rounded-2xl transition-colors shadow-xs"
      >
        Kembali ke POS
      </Link>
    </div>
  );
}
