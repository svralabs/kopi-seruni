import { db } from '@/lib/db';
import { outlets, orders } from '@/lib/schema';
import { formatDate } from '@/lib/utils';
import { createOutlet } from '@/app/actions/outlets';
import { Store, Plus, MapPin, Phone, Calendar, ArrowRight, Building2 } from 'lucide-react';
import { sql } from 'drizzle-orm';

export default async function OutletsPage() {
  let outletList: any[] = [];

  try {
    outletList = await db.select().from(outlets);
  } catch (e) {
    console.warn('Error fetching outlets:', e);
  }

  return (
    <div className="space-y-6">
      {/* Header Bento */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#201C1A]">
          Kelola Cabang & Outlet
        </h1>
        <p className="text-xs text-[#8E867C] mt-0.5">
          Daftar seluruh outlet Kopi Seruni, pengaturan alamat cabang, dan kontak kasir
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form Tambah Cabang */}
        <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2 text-[#54382B]">
            <Plus className="w-4 h-4" />
            <h3 className="font-bold text-xs uppercase tracking-wider">Tambah Cabang Baru</h3>
          </div>

          <form action={createOutlet} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-[#4A4238] mb-1.5">
                Nama Cabang Outlet <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                required
                placeholder="Contoh: Kopi Seruni - Cabang Riau"
                className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-[#4A4238] mb-1.5">Alamat Lengkap</label>
              <textarea
                name="address"
                rows={2}
                placeholder="Contoh: Jl. L. L. R.E. Martadinata No. 50, Bandung"
                className="w-full px-3.5 py-2 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl text-[11px] focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#4A4238] mb-1.5">No. Telepon / WhatsApp</label>
              <input
                type="text"
                name="phone"
                placeholder="Contoh: 0812-3456-7890"
                className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl text-[11px] focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#2E2520] hover:bg-[#453932] text-white font-bold rounded-2xl text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 mt-2"
            >
              <span>Daftarkan Cabang Baru</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Right Column: Daftar Outlet Bento Cards */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {outletList.map((outlet) => (
              <div
                key={outlet.id}
                className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-5 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[#9E968B]">{outlet.id}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#EBF6EE] text-[#2D7A47] font-bold text-[10px] border border-[#D1EBD8]">
                      Aktif
                    </span>
                  </div>

                  <div>
                    <h3 className="font-serif font-black text-base text-[#201C1A]">
                      {outlet.name}
                    </h3>
                  </div>

                  <div className="space-y-1.5 text-xs text-[#6B635A]">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#8E867C] shrink-0 mt-0.5" />
                      <span className="text-[11px] leading-relaxed">{outlet.address || 'Alamat belum diatur'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-[#8E867C] shrink-0" />
                      <span className="text-[11px]">{outlet.phone || 'Nomor belum diatur'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#F0ECE4] flex items-center justify-between text-[10px] text-[#8E867C]">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>Dibuat: {formatDate(outlet.createdAt)}</span>
                  </span>
                  <a
                    href={`/pos?outletId=${outlet.id}`}
                    className="font-bold text-[#54382B] hover:underline flex items-center gap-1 text-[11px]"
                  >
                    <span>Buka POS</span>
                    <ArrowRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>

          {outletList.length === 0 && (
            <div className="bg-white rounded-3xl border border-[#EBE7DF] p-12 text-center text-[#9E968B]">
              <Building2 className="w-10 h-10 mx-auto mb-2 text-[#D5CEC2]" />
              <p className="font-bold text-sm text-[#201C1A]">Belum ada outlet terdaftar</p>
              <p className="text-xs text-[#8E867C] mt-0.5">Tambahkan outlet cabang pertama di sebelah kiri</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
