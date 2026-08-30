'use client';

import { useState, useTransition } from 'react';
import { createStaff, updateStaffRole, deleteStaff } from '@/app/actions/staff';
import type { Outlet } from '@/lib/schema';
import { Plus, UserCheck, Trash2, Shield, ArrowRight, UserPlus, UserCog, X } from 'lucide-react';

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  outletId: string;
  outletName: string;
  createdAt: string;
}

export default function StaffClient({
  staffList,
  outlets,
}: {
  staffList: StaffMember[];
  outlets: Outlet[];
}) {
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [editOutletId, setEditOutletId] = useState('');
  const [editRole, setEditRole] = useState('kasir');
  const [isPending, startTransition] = useTransition();

  const handleOpenEdit = (staff: StaffMember) => {
    setEditingStaff(staff);
    setEditOutletId(staff.outletId || outlets[0]?.id || 'out_default');
    setEditRole(staff.role || 'kasir');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    startTransition(async () => {
      try {
        await updateStaffRole(editingStaff.id, editOutletId, editRole);
        setEditingStaff(null);
      } catch (err: any) {
        alert(err?.message || 'Gagal mengubah role staff');
      }
    });
  };

  const handleDelete = (userId: string, name: string) => {
    if (!confirm(`Yakin ingin menghapus akses kasir/staff "${name}"?`)) return;
    startTransition(async () => {
      try {
        await deleteStaff(userId);
      } catch (err: any) {
        alert(err?.message || 'Gagal menghapus staff');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#201C1A]">
          Kelola Staff Kasir & Hak Akses (RBAC)
        </h1>
        <p className="text-xs text-[#8E867C] mt-0.5">
          Daftarkan akun kasir, manajer outlet, dan atur penempatan cabang kerja
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Form Tambah Kasir */}
        <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2 text-[#54382B]">
            <UserPlus className="w-4 h-4" />
            <h3 className="font-bold text-xs uppercase tracking-wider">Daftarkan Staff Baru</h3>
          </div>

          <form action={createStaff} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-[#4A4238] mb-1.5">Nama Lengkap</label>
              <input
                type="text"
                name="name"
                required
                placeholder="Contoh: Rian Kasir"
                className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-[#4A4238] mb-1.5">Email Login</label>
              <input
                type="email"
                name="email"
                required
                placeholder="rian@kopiseruni.com"
                className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#4A4238] mb-1.5">Password</label>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">Penempatan Outlet</label>
                <select
                  name="outletId"
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-semibold"
                >
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">Role / Hak Akses</label>
                <select
                  name="role"
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-semibold"
                >
                  <option value="kasir">Kasir (POS Saja)</option>
                  <option value="manager">Manager Outlet</option>
                  <option value="owner">Owner (Full)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 bg-[#2E2520] hover:bg-[#453932] text-white font-bold rounded-2xl text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 mt-2 disabled:opacity-50"
            >
              <span>Buat Akun Staff</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Right: Daftar Staff Table */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#201C1A]">Daftar Staff & Kasir Aktif</h3>
            <span className="text-xs text-[#8E867C]">{staffList.length} Akun Terdaftar</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#F0ECE4] bg-[#FAF8F5] text-[#8E867C] text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Nama & Email</th>
                  <th className="py-3 px-4">Cabang Outlet</th>
                  <th className="py-3 px-4">Role Akses</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F0E8]">
                {staffList.map((s) => (
                  <tr key={s.id} className="hover:bg-[#FBF9F6]">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-[#201C1A]">{s.name}</p>
                      <p className="text-[10px] text-[#8E867C]">{s.email}</p>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#4A4238]">
                      {s.outletName}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          s.role === 'owner'
                            ? 'bg-[#FAF3E8] text-[#96631E] border border-[#F2E0C4]'
                            : s.role === 'manager'
                            ? 'bg-[#EBF6EE] text-[#2D7A47] border border-[#D1EBD8]'
                            : 'bg-[#FAF8F5] text-[#201C1A] border border-[#E5E0D6]'
                        }`}
                      >
                        {s.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(s)}
                        className="px-2.5 py-1 bg-[#FAF8F5] hover:bg-[#F2EDE5] text-[#54382B] font-bold rounded-xl text-[11px] border border-[#E0D8CC] transition-colors inline-flex items-center gap-1"
                      >
                        <UserCog className="w-3.5 h-3.5" />
                        <span>Ubah Role</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(s.id, s.name)}
                        className="p-1 text-[#9E968B] hover:text-[#964B3B] transition-colors rounded-lg hover:bg-[#FBEBE8]"
                        title="Hapus akun staff"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* EDIT ROLE MODAL */}
      {editingStaff && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xl p-6 max-w-md w-full space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-[#F0ECE4] pb-3">
              <div>
                <h3 className="font-bold text-sm text-[#201C1A]">Ubah Peran & Cabang Staff</h3>
                <p className="text-[11px] text-[#8E867C] mt-0.5">{editingStaff.name} ({editingStaff.email})</p>
              </div>
              <button onClick={() => setEditingStaff(null)} className="text-[#9E968B] hover:text-[#201C1A]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block font-bold text-[#4A4238] mb-1">Penempatan Outlet</label>
                <select
                  value={editOutletId}
                  onChange={(e) => setEditOutletId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-bold"
                >
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#4A4238] mb-1">Role / Hak Akses Baru</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-bold"
                >
                  <option value="kasir">Kasir (Hanya POS & Struk)</option>
                  <option value="manager">Manager Outlet (POS, Stok, Pengeluaran)</option>
                  <option value="owner">Owner (Akses Penuh Seluruh Cabang & L/R)</option>
                </select>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="w-1/2 py-2.5 bg-[#FAF8F5] text-[#8E867C] font-bold rounded-2xl border border-[#EBE7DF]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-1/2 py-2.5 bg-[#2E2520] hover:bg-[#453932] text-white font-bold rounded-2xl transition-all shadow-xs disabled:opacity-50"
                >
                  {isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
