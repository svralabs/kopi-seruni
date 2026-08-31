'use client';

import { useState } from 'react';
import { createOutlet, updateOutlet } from '@/app/actions/outlets';
import { formatDate } from '@/lib/utils';
import type { Outlet } from '@/lib/schema';
import { toast } from '@/lib/toast';
import { 
  Store, 
  Plus, 
  MapPin, 
  Phone, 
  Calendar, 
  ArrowRight, 
  Building2, 
  X,
  Search,
  CheckCircle,
  Pencil
} from 'lucide-react';
import Link from 'next/link';

export default function OutletsClient({
  outletList,
}: {
  outletList: Outlet[];
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const totalCount = outletList.length;

  const filteredList = outletList.filter((o) => {
    const name = o.name.toLowerCase();
    const addr = (o.address || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || addr.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#201C1A]">
            Kelola Cabang & Outlet
          </h1>
          <p className="text-xs text-[#8E867C] mt-0.5">
            Daftar seluruh lokasi cabang Toko Kopi Seruni, alamat operasional, dan kontak kasir
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#2E2520] hover:bg-[#453932] text-white text-xs font-bold rounded-2xl shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Cabang Baru</span>
        </button>
      </div>

      {/* 1. TOP SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#8E867C]">Total Cabang Toko</p>
            <h3 className="text-2xl font-black text-[#201C1A] mt-1">{totalCount} Outlet</h3>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#FAF8F5] border border-[#ECE7DE] flex items-center justify-center text-[#54382B]">
            <Store className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#8E867C]">Status Operasional</p>
            <h3 className="text-2xl font-black text-[#2D7A47] mt-1">100% Aktif</h3>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#EBF6EE] border border-[#D1EBD8] flex items-center justify-center text-[#2D7A47]">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#8E867C]">Kategori Outlet</p>
            <h3 className="text-2xl font-black text-[#54382B] mt-1">Multi-Branch</h3>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#FAF8F5] border border-[#ECE7DE] flex items-center justify-center text-[#54382B]">
            <Building2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. FULL-WIDTH DATA TABLE */}
      <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
        {/* Search Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#F0ECE4]">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-[#8E867C] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari cabang / alamat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-[#F9F7F2] border border-[#E5E0D6] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#F0ECE4] bg-[#FAF8F5] text-[#8E867C] text-[10px] font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Nama Cabang</th>
                <th className="py-3.5 px-4">Alamat Lengkap</th>
                <th className="py-3.5 px-4">Kontak Telepon / WA</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F0E8]">
              {filteredList.map((outlet) => (
                <tr key={outlet.id} className="hover:bg-[#FBF9F6] transition-colors">
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-[#201C1A] text-sm">{outlet.name}</p>
                    <p className="text-[10px] font-mono text-[#9E968B]">{outlet.id}</p>
                  </td>
                  <td className="py-3.5 px-4 text-[#6B635A] max-w-xs truncate">
                    {outlet.address || '-'}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-[#201C1A]">
                    {outlet.phone || '-'}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#EBF6EE] text-[#2D7A47] font-bold text-[10px] border border-[#D1EBD8]">
                      Aktif
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingOutlet(outlet)}
                      className="p-1.5 text-[#54382B] hover:bg-[#F2EDE5] bg-[#FAF8F5] border border-[#E5E0D6] rounded-xl transition-colors inline-flex cursor-pointer"
                      title="Edit Cabang"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <Link
                      href={`/pos?outletId=${outlet.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#FAF8F5] hover:bg-[#2E2520] hover:text-white text-[#54382B] font-bold rounded-xl text-xs border border-[#E5E0D6] transition-all cursor-pointer"
                    >
                      <span>Buka POS</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}

              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-[#9E968B]">
                    <Building2 className="w-8 h-8 mx-auto mb-2 text-[#D5CEC2]" />
                    <p className="font-bold text-xs text-[#4A4238]">Belum ada outlet cabang terdaftar</p>
                    <p className="text-[11px] text-[#9E968B] mt-0.5">
                      Klik tombol &quot;Tambah Cabang Baru&quot; di atas untuk mendaftarkan outlet.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. MODAL DIALOG: TAMBAH CABANG */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0ECE4] pb-3">
              <div className="flex items-center gap-2 text-[#54382B]">
                <Plus className="w-4 h-4" />
                <h3 className="font-bold text-sm text-[#201C1A]">Tambah Cabang Baru</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[#9E968B] hover:text-[#201C1A] p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              action={async (formData) => {
                try {
                  await createOutlet(formData);
                  toast.success('Cabang outlet baru berhasil didaftarkan');
                  setIsModalOpen(false);
                } catch (err: any) {
                  toast.error(err?.message || 'Gagal mendaftarkan cabang');
                }
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">
                  Nama Cabang Outlet <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Contoh: Kopi Seruni - Cabang Riau"
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">Alamat Lengkap</label>
                <textarea
                  name="address"
                  rows={2}
                  placeholder="Jl. LLRE Martadinata No. 85, Cihapit, Bandung"
                  className="w-full px-3.5 py-2 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">Nomor Telepon / WA Outlet</label>
                <input
                  type="text"
                  name="phone"
                  placeholder="0812-3456-7890"
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
                />
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 border border-[#E5E0D6] text-[#7A7268] font-bold rounded-2xl hover:bg-[#FAF8F5] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#2E2520] hover:bg-[#453932] text-white font-bold rounded-2xl shadow-xs cursor-pointer"
                >
                  Daftarkan Cabang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. MODAL DIALOG: EDIT CABANG */}
      {editingOutlet && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0ECE4] pb-3">
              <div>
                <h3 className="font-bold text-base text-[#201C1A]">Ubah Data Cabang Outlet</h3>
                <p className="text-[11px] text-[#8E867C]">Perbarui nama, alamat, atau nomor kontak cabang</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingOutlet(null)}
                className="text-[#9E968B] hover:text-[#201C1A] p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              action={async (formData) => {
                try {
                  await updateOutlet(editingOutlet.id, formData);
                  toast.success(`Data cabang "${editingOutlet.name}" berhasil diperbarui`);
                  setEditingOutlet(null);
                } catch (err: any) {
                  toast.error(err?.message || 'Gagal memperbarui cabang');
                }
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">
                  Nama Cabang Outlet <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingOutlet.name}
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">Alamat Lengkap</label>
                <textarea
                  name="address"
                  rows={2}
                  defaultValue={editingOutlet.address || ''}
                  className="w-full px-3.5 py-2 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">Nomor Telepon / WA Outlet</label>
                <input
                  type="text"
                  name="phone"
                  defaultValue={editingOutlet.phone || ''}
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
                />
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingOutlet(null)}
                  className="flex-1 py-2.5 border border-[#E5E0D6] text-[#7A7268] font-bold rounded-2xl hover:bg-[#FAF8F5] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#2E2520] hover:bg-[#453932] text-white font-bold rounded-2xl shadow-xs cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
