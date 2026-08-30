import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 p-4 text-center">
      <div className="text-6xl mb-4">🚫</div>
      <h1 className="text-2xl font-bold text-zinc-900 mb-2">Akses Ditolak</h1>
      <p className="text-zinc-600 max-w-sm mb-6">
        Anda tidak memiliki izin akses untuk membuka halaman ini. Silakan hubungi Owner atau Administrator.
      </p>
      <Link
        href="/dashboard"
        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors shadow-sm"
      >
        Kembali ke Dashboard
      </Link>
    </div>
  );
}
