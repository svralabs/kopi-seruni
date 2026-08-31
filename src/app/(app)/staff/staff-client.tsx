'use client';

import { useState, useTransition } from 'react';
import { createStaff, updateStaffRole, deleteStaff } from '@/app/actions/staff';
import type { Outlet } from '@/lib/schema';
import ConfirmModal from '@/components/confirm-modal';
import { toast } from '@/lib/toast';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Store, 
  Trash2, 
  UserCog, 
  Search, 
  X, 
  CheckCircle,
  KeyRound,
  Plus,
  UserCheck,
  Shield,
  ArrowRight
} from 'lucide-react';

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  outletIds: string[];
  outletName: string;
  createdAt: number | string;
}

export default function StaffClient({
  staffList,
  outlets,
  currentOutletId = 'all',
}: {
  staffList: StaffMember[];
  outlets: Outlet[];
  currentOutletId?: string;
}) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<StaffMember | null>(null);
  const [addOutletIds, setAddOutletIds] = useState<string[]>([]);
  const [editOutletIds, setEditOutletIds] = useState<string[]>([]);
  const [editRole, setEditRole] = useState('kasir');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'kasir' | 'manager' | 'owner'>('all');
  const [isPending, startTransition] = useTransition();

  const handleOpenAdd = () => {
    setAddOutletIds(outlets.length > 0 ? [outlets[0].id] : ['out_default']);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (staff: StaffMember) => {
    setEditingStaff(staff);
    setEditOutletIds(
      staff.outletIds && staff.outletIds.length > 0
        ? staff.outletIds
        : [outlets[0]?.id || 'out_default']
    );
    setEditRole(staff.role || 'kasir');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    if (editOutletIds.length === 0) {
      toast.error('Pilih minimal 1 cabang untuk staff');
      return;
    }

    startTransition(async () => {
      try {
        await updateStaffRole(editingStaff.id, editOutletIds, editRole);
        toast.success(`Peran staff "${editingStaff.name}" berhasil diperbarui`);
        setEditingStaff(null);
      } catch (err: any) {
        toast.error(err?.message || 'Gagal mengubah role staff');
      }
    });
  };

  const handleConfirmDelete = () => {
    if (!deletingStaff) return;
    startTransition(async () => {
      try {
        await deleteStaff(deletingStaff.id);
        toast.success(`Akun staff "${deletingStaff.name}" berhasil dihapus`);
        setDeletingStaff(null);
      } catch (err: any) {
        toast.error(err?.message || 'Gagal menghapus staff');
      }
    });
  };

  // Metrics
  const totalCount = staffList.length;
  const kasirCount = staffList.filter((s) => s.role === 'kasir').length;
  const adminCount = totalCount - kasirCount;

  // Filtered List
  const filteredList = staffList.filter((s) => {
    const name = s.name.toLowerCase();
    const email = s.email.toLowerCase();
    const outlet = s.outletName.toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchQuery = name.includes(q) || email.includes(q) || outlet.includes(q);
    const matchRole = roleFilter === 'all' ? true : s.role === roleFilter;
    return matchQuery && matchRole;
  });

  return (
    <div className="space-y-6">
      {/* Header & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#201C1A]">
            Kelola Staff Kasir & Hak Akses (RBAC)
          </h1>
          <p className="text-xs text-[#8E867C] mt-0.5">
            Daftarkan akun kasir, manajer outlet, dan atur penempatan cabang kerja
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#2E2520] hover:bg-[#453932] text-white text-xs font-bold rounded-2xl shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Staff Baru</span>
        </button>
      </div>

      {/* 1. TOP SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#8E867C]">Total Staff Terdaftar</p>
            <h3 className="text-2xl font-black text-[#201C1A] mt-1">{totalCount} Akun</h3>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#FAF8F5] border border-[#ECE7DE] flex items-center justify-center text-[#54382B]">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#8E867C]">Staff Kasir (POS)</p>
            <h3 className="text-2xl font-black text-[#2D7A47] mt-1">{kasirCount} Kasir</h3>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#EBF6EE] border border-[#D1EBD8] flex items-center justify-center text-[#2D7A47]">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#8E867C]">Owner & Manajer</p>
            <h3 className="text-2xl font-black text-[#96631E] mt-1">{adminCount} Akun</h3>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#FDF4E5] border border-[#F2E0C4] flex items-center justify-center text-[#96631E]">
            <Shield className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. FULL-WIDTH DATA TABLE */}
      <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
        {/* Search & Filter Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#F0ECE4]">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-[#8E867C] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama / email / cabang..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-[#F9F7F2] border border-[#E5E0D6] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#F9F7F2] p-1 rounded-xl border border-[#E5E0D6] text-xs">
            {(
              [
                { key: 'all', label: 'Semua' },
                { key: 'kasir', label: 'Kasir' },
                { key: 'manager', label: 'Manager' },
                { key: 'owner', label: 'Owner' },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setRoleFilter(t.key)}
                className={`px-3 py-1 rounded-lg font-bold transition-all text-xs ${
                  roleFilter === t.key
                    ? 'bg-white text-[#201C1A] shadow-xs'
                    : 'text-[#8E867C] hover:text-[#201C1A]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#F0ECE4] bg-[#FAF8F5] text-[#8E867C] text-[10px] font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Nama & Email</th>
                <th className="py-3.5 px-4">Penempatan Cabang</th>
                <th className="py-3.5 px-4">Role Akses</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F0E8]">
              {filteredList.map((s) => (
                <tr key={s.id} className="hover:bg-[#FBF9F6] transition-colors">
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
                      className="px-2.5 py-1 bg-[#FAF8F5] hover:bg-[#F2EDE5] text-[#54382B] font-bold rounded-xl text-xs border border-[#E0D8CC] transition-colors inline-flex items-center gap-1"
                    >
                      <UserCog className="w-3.5 h-3.5" />
                      <span>Ubah Role</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingStaff(s)}
                      className="p-1.5 text-[#9E968B] hover:text-[#964B3B] transition-colors rounded-xl hover:bg-[#FBEBE8] cursor-pointer"
                      title="Hapus akun staff"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-[#9E968B]">
                    <Users className="w-8 h-8 mx-auto mb-2 text-[#D5CEC2]" />
                    <p className="font-bold text-xs text-[#4A4238]">Tidak ada staff yang cocok</p>
                    <p className="text-[11px] text-[#9E968B] mt-0.5">
                      Klik tombol &quot;Tambah Staff Baru&quot; di atas untuk mendaftarkan akun staff.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. MODAL DIALOG 1: TAMBAH STAFF BARU */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0ECE4] pb-3">
              <div className="flex items-center gap-2 text-[#54382B]">
                <UserPlus className="w-4 h-4" />
                <h3 className="font-bold text-sm text-[#201C1A]">Daftarkan Staff Baru</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#9E968B] hover:text-[#201C1A] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              action={async (formData) => {
                try {
                  await createStaff(formData);
                  toast.success('Akun staff baru berhasil dibuat');
                  setIsAddModalOpen(false);
                } catch (err: any) {
                  toast.error(err?.message || 'Gagal mendaftarkan staff');
                }
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Contoh: Rian Kasir"
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">
                  Email Login <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="rian@kopiseruni.com"
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">Role / Hak Akses</label>
                <select
                  name="role"
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-semibold"
                >
                  <option value="kasir">Kasir (POS Saja)</option>
                  <option value="manager">Manager Outlet (POS, Stok, Pengeluaran)</option>
                  <option value="owner">Owner (Akses Penuh Seluruh Laporan & L/R)</option>
                </select>
              </div>

              {/* Multi-Select Outlet Checklist */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-[#4A4238]">
                    Penempatan Cabang <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (addOutletIds.length === outlets.length) {
                        setAddOutletIds([outlets[0]?.id || 'out_default']);
                      } else {
                        setAddOutletIds(outlets.map((o) => o.id));
                      }
                    }}
                    className="text-[11px] font-bold text-[#96631E] hover:underline cursor-pointer"
                  >
                    {addOutletIds.length === outlets.length ? 'Reset Pilihan' : 'Pilih Semua Cabang'}
                  </button>
                </div>

                <div className="space-y-1.5 p-2 bg-[#F9F7F2] rounded-2xl border border-[#E5E0D6] max-h-40 overflow-y-auto">
                  {outlets.map((o) => {
                    const isChecked = addOutletIds.includes(o.id);
                    return (
                      <label
                        key={o.id}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all cursor-pointer text-xs font-semibold ${
                          isChecked
                            ? 'bg-white text-[#201C1A] border border-[#2E2520]/20 shadow-xs'
                            : 'text-[#7A7268] hover:bg-white/60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              if (addOutletIds.length > 1) {
                                setAddOutletIds(addOutletIds.filter((id) => id !== o.id));
                              }
                            } else {
                              setAddOutletIds([...addOutletIds, o.id]);
                            }
                          }}
                          className="w-4 h-4 rounded text-[#2E2520] accent-[#2E2520] cursor-pointer"
                        />
                        <Store className="w-3.5 h-3.5 text-[#54382B]" />
                        <span className="truncate flex-1">{o.name}</span>
                      </label>
                    );
                  })}
                </div>
                {/* Hidden input to pass selected outletIds array */}
                {addOutletIds.map((id) => (
                  <input key={id} type="hidden" name="outletIds" value={id} />
                ))}
                <p className="text-[10px] text-[#8E867C]">
                  {addOutletIds.length === outlets.length
                    ? '⭐️ Akun memiliki izin akses di SEMUA cabang.'
                    : `📍 Akun ditugaskan di ${addOutletIds.length} cabang terpilih.`}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 border border-[#E5E0D6] text-[#7A7268] font-bold rounded-2xl hover:bg-[#FAF8F5]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#2E2520] hover:bg-[#453932] text-white font-bold rounded-2xl shadow-xs"
                >
                  Buat Akun Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. MODAL DIALOG 2: EDIT ROLE */}
      {editingStaff && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-2xl p-6 max-w-md w-full space-y-4 text-xs">
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

              {/* Multi-Select Outlet Checklist for Edit */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-[#4A4238]">
                    Penempatan Cabang <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (editOutletIds.length === outlets.length) {
                        setEditOutletIds([outlets[0]?.id || 'out_default']);
                      } else {
                        setEditOutletIds(outlets.map((o) => o.id));
                      }
                    }}
                    className="text-[11px] font-bold text-[#96631E] hover:underline cursor-pointer"
                  >
                    {editOutletIds.length === outlets.length ? 'Reset Pilihan' : 'Pilih Semua Cabang'}
                  </button>
                </div>

                <div className="space-y-1.5 p-2 bg-[#F9F7F2] rounded-2xl border border-[#E5E0D6] max-h-40 overflow-y-auto">
                  {outlets.map((o) => {
                    const isChecked = editOutletIds.includes(o.id);
                    return (
                      <label
                        key={o.id}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all cursor-pointer text-xs font-semibold ${
                          isChecked
                            ? 'bg-white text-[#201C1A] border border-[#2E2520]/20 shadow-xs'
                            : 'text-[#7A7268] hover:bg-white/60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              if (editOutletIds.length > 1) {
                                setEditOutletIds(editOutletIds.filter((id) => id !== o.id));
                              }
                            } else {
                              setEditOutletIds([...editOutletIds, o.id]);
                            }
                          }}
                          className="w-4 h-4 rounded text-[#2E2520] accent-[#2E2520] cursor-pointer"
                        />
                        <Store className="w-3.5 h-3.5 text-[#54382B]" />
                        <span className="truncate flex-1">{o.name}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-[10px] text-[#8E867C]">
                  {editOutletIds.length === outlets.length
                    ? '⭐️ Akun memiliki izin akses di SEMUA cabang.'
                    : `📍 Akun ditugaskan di ${editOutletIds.length} cabang terpilih.`}
                </p>
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

      {/* 4. MODAL: KONFIRMASI HAPUS STAFF */}
      <ConfirmModal
        isOpen={!!deletingStaff}
        title="Hapus Akun Staff?"
        description="Akun kasir/staff ini akan dihapus dan tidak bisa login kembali ke sistem POS."
        confirmLabel="Hapus Akun"
        cancelLabel="Batal"
        variant="danger"
        isPending={isPending}
        onClose={() => setDeletingStaff(null)}
        onConfirm={handleConfirmDelete}
        itemDetails={
          deletingStaff
            ? [
                { label: 'Nama Staff', value: deletingStaff.name },
                { label: 'Email Login', value: deletingStaff.email },
                { label: 'Penempatan', value: deletingStaff.outletName },
                { label: 'Role Akses', value: deletingStaff.role.toUpperCase() },
              ]
            : undefined
        }
      />
    </div>
  );
}
