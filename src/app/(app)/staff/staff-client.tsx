'use client';

import { useState, useTransition } from 'react';
import { createStaff, updateStaffUser, updateStaffRole, deleteStaff } from '@/app/actions/staff';
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
  ArrowRight,
  Mail,
  User,
  Lock,
  Crown,
  Briefcase
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

  // Add form states
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addRole, setAddRole] = useState<'kasir' | 'manager' | 'owner'>('kasir');
  const [addOutletIds, setAddOutletIds] = useState<string[]>([]);

  // Edit form states
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editNewPassword, setEditNewPassword] = useState('');
  const [editRole, setEditRole] = useState<'kasir' | 'manager' | 'owner'>('kasir');
  const [editOutletIds, setEditOutletIds] = useState<string[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'kasir' | 'manager' | 'owner'>('all');
  const [isPending, startTransition] = useTransition();

  const handleOpenAdd = () => {
    setAddName('');
    setAddEmail('');
    setAddPassword('');
    setAddRole('kasir');
    setAddOutletIds(outlets.length > 0 ? [outlets[0].id] : ['out_default']);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (staff: StaffMember) => {
    setEditingStaff(staff);
    setEditName(staff.name || '');
    setEditEmail(staff.email || '');
    setEditNewPassword('');
    setEditOutletIds(
      staff.outletIds && staff.outletIds.length > 0
        ? staff.outletIds
        : [outlets[0]?.id || 'out_default']
    );
    setEditRole((staff.role as 'kasir' | 'manager' | 'owner') || 'kasir');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    if (!editName.trim()) {
      toast.error('Nama pengguna tidak boleh kosong');
      return;
    }

    if (!editEmail.trim()) {
      toast.error('Email pengguna tidak boleh kosong');
      return;
    }

    if (editNewPassword.trim() && editNewPassword.trim().length < 6) {
      toast.error('Password baru minimal 6 karakter');
      return;
    }

    if (editOutletIds.length === 0) {
      toast.error('Pilih minimal 1 cabang penempatan');
      return;
    }

    startTransition(async () => {
      try {
        await updateStaffUser(editingStaff.id, {
          name: editName,
          email: editEmail,
          role: editRole,
          outletIds: editOutletIds,
          newPassword: editNewPassword.trim() || undefined,
        });
        toast.success(`Data pengguna "${editName}" berhasil diperbarui`);
        setEditingStaff(null);
      } catch (err: any) {
        toast.error(err?.message || 'Gagal memperbarui data pengguna');
      }
    });
  };

  const handleConfirmDelete = () => {
    if (!deletingStaff) return;
    startTransition(async () => {
      try {
        await deleteStaff(deletingStaff.id);
        toast.success(`Akun "${deletingStaff.name}" berhasil dihapus`);
        setDeletingStaff(null);
      } catch (err: any) {
        toast.error(err?.message || 'Gagal menghapus pengguna');
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
            Kelola Pengguna & Hak Akses (User & RBAC)
          </h1>
          <p className="text-xs text-[#8E867C] mt-0.5">
            Daftarkan dan kelola akun Kasir, Manajer Outlet, dan Owner beserta wewenang cabang
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#2E2520] hover:bg-[#453932] text-white text-xs font-bold rounded-2xl shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Pengguna Baru</span>
        </button>
      </div>

      {/* 1. TOP SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#8E867C]">Total Pengguna Terdaftar</p>
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
                      className="px-2.5 py-1 bg-[#FAF8F5] hover:bg-[#F2EDE5] text-[#54382B] font-bold rounded-xl text-xs border border-[#E0D8CC] transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      <UserCog className="w-3.5 h-3.5" />
                      <span>Edit Detail</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingStaff(s)}
                      className="p-1.5 text-[#9E968B] hover:text-[#964B3B] transition-colors rounded-xl hover:bg-[#FBEBE8] cursor-pointer"
                      title="Hapus akun pengguna"
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
                    <p className="font-bold text-xs text-[#4A4238]">Tidak ada pengguna yang cocok</p>
                    <p className="text-[11px] text-[#9E968B] mt-0.5">
                      Klik tombol &quot;Tambah Pengguna Baru&quot; di atas untuk mendaftarkan akun.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. MODAL DIALOG 1: TAMBAH PENGGUNA BARU */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#F0ECE4] pb-3">
              <div className="flex items-center gap-2 text-[#54382B]">
                <UserPlus className="w-5 h-5" />
                <div>
                  <h3 className="font-bold text-sm text-[#201C1A]">Daftarkan Pengguna Baru</h3>
                  <p className="text-[11px] text-[#8E867C]">Buat akun Kasir, Manajer Outlet, atau Owner</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#9E968B] hover:text-[#201C1A] p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              action={async (formData) => {
                try {
                  await createStaff(formData);
                  toast.success('Akun pengguna baru berhasil didaftarkan');
                  setIsAddModalOpen(false);
                } catch (err: any) {
                  toast.error(err?.message || 'Gagal mendaftarkan pengguna');
                }
              }}
              className="space-y-3.5 text-xs"
            >
              {/* Role Selector Cards */}
              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">
                  Role / Hak Akses Pengguna <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    {
                      role: 'owner',
                      label: 'Owner',
                      desc: 'Akses Penuh Seluruh Menu & L/R',
                      icon: Crown,
                      color: 'text-[#96631E] border-[#F2E0C4] bg-[#FAF3E8]',
                    },
                    {
                      role: 'manager',
                      label: 'Manager',
                      desc: 'POS, Stok Bahan, Pengeluaran',
                      icon: Briefcase,
                      color: 'text-[#2D7A47] border-[#D1EBD8] bg-[#EBF6EE]',
                    },
                    {
                      role: 'kasir',
                      label: 'Kasir',
                      desc: 'Khusus Transaksi Kasir POS',
                      icon: UserCheck,
                      color: 'text-[#54382B] border-[#E5E0D6] bg-[#FAF8F5]',
                    },
                  ].map((r) => {
                    const isSelected = addRole === r.role;
                    const Icon = r.icon;
                    return (
                      <button
                        key={r.role}
                        type="button"
                        onClick={() => {
                          setAddRole(r.role as any);
                          if (r.role === 'owner') {
                            setAddOutletIds(outlets.map((o) => o.id));
                          }
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? `${r.color} ring-2 ring-[#2E2520] shadow-xs`
                            : 'border-[#E5E0D6] bg-white hover:bg-[#FAF8F5] text-[#7A7268]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-black text-xs text-[#201C1A] flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5" />
                            {r.label}
                          </span>
                          {isSelected && <CheckCircle className="w-3.5 h-3.5 text-[#2E2520]" />}
                        </div>
                        <p className="text-[10px] leading-tight opacity-80">{r.desc}</p>
                      </button>
                    );
                  })}
                </div>
                <input type="hidden" name="role" value={addRole} />
              </div>

              <div>
                <label className="block font-bold text-[#4A4238] mb-1">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#8E867C] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="Contoh: Rian Hendrawan"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#4A4238] mb-1">
                  Email Login <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#8E867C] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="rian@kopiseruni.com"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#4A4238] mb-1">
                  Password Login <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#8E867C] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    name="password"
                    required
                    minLength={6}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
                  />
                </div>
              </div>

              {/* Multi-Select Outlet Checklist */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-[#4A4238]">
                    Penempatan Cabang Kerja <span className="text-red-500">*</span>
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

                <div className="space-y-1.5 p-2 bg-[#F9F7F2] rounded-2xl border border-[#E5E0D6] max-h-36 overflow-y-auto">
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
                    ? '✓ Akun memiliki hak akses di SEMUA cabang.'
                    : `✓ Akun ditugaskan di ${addOutletIds.length} cabang terpilih.`}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 border border-[#E5E0D6] text-[#7A7268] font-bold rounded-2xl hover:bg-[#FAF8F5] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#2E2520] hover:bg-[#453932] text-white font-bold rounded-2xl shadow-xs cursor-pointer"
                >
                  Buat Akun Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. MODAL DIALOG 2: EDIT PENGGUNA & HAK AKSES */}
      {editingStaff && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-2xl p-6 max-w-lg w-full space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#F0ECE4] pb-3">
              <div className="flex items-center gap-2 text-[#54382B]">
                <UserCog className="w-5 h-5" />
                <div>
                  <h3 className="font-bold text-sm text-[#201C1A]">Edit Pengguna & Hak Akses</h3>
                  <p className="text-[11px] text-[#8E867C]">
                    Ubah profil, reset password, peran (RBAC), atau cabang kerja
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="text-[#9E968B] hover:text-[#201C1A] p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              {/* Edit Name */}
              <div>
                <label className="block font-bold text-[#4A4238] mb-1">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#8E867C] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-bold"
                  />
                </div>
              </div>

              {/* Edit Email */}
              <div>
                <label className="block font-bold text-[#4A4238] mb-1">
                  Email Login <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#8E867C] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
                  />
                </div>
              </div>

              {/* Edit Password (Optional) */}
              <div>
                <label className="block font-bold text-[#4A4238] mb-1">
                  Password Baru (Opsional)
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#8E867C] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    minLength={6}
                    value={editNewPassword}
                    onChange={(e) => setEditNewPassword(e.target.value)}
                    placeholder="Kosongkan jika tidak ingin ganti password"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
                  />
                </div>
                <p className="text-[10px] text-[#8E867C] mt-1">
                  Isi hanya jika ingin mereset password akun pengguna ini (min. 6 karakter).
                </p>
              </div>

              {/* Role Selection Cards */}
              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">
                  Role / Hak Akses Pengguna <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    {
                      role: 'owner',
                      label: 'Owner',
                      desc: 'Akses Penuh Seluruh Menu & L/R',
                      icon: Crown,
                      color: 'text-[#96631E] border-[#F2E0C4] bg-[#FAF3E8]',
                    },
                    {
                      role: 'manager',
                      label: 'Manager',
                      desc: 'POS, Stok Bahan, Pengeluaran',
                      icon: Briefcase,
                      color: 'text-[#2D7A47] border-[#D1EBD8] bg-[#EBF6EE]',
                    },
                    {
                      role: 'kasir',
                      label: 'Kasir',
                      desc: 'Khusus Transaksi Kasir POS',
                      icon: UserCheck,
                      color: 'text-[#54382B] border-[#E5E0D6] bg-[#FAF8F5]',
                    },
                  ].map((r) => {
                    const isSelected = editRole === r.role;
                    const Icon = r.icon;
                    return (
                      <button
                        key={r.role}
                        type="button"
                        onClick={() => {
                          setEditRole(r.role as any);
                          if (r.role === 'owner') {
                            setEditOutletIds(outlets.map((o) => o.id));
                          }
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? `${r.color} ring-2 ring-[#2E2520] shadow-xs`
                            : 'border-[#E5E0D6] bg-white hover:bg-[#FAF8F5] text-[#7A7268]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-black text-xs text-[#201C1A] flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5" />
                            {r.label}
                          </span>
                          {isSelected && <CheckCircle className="w-3.5 h-3.5 text-[#2E2520]" />}
                        </div>
                        <p className="text-[10px] leading-tight opacity-80">{r.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Multi-Select Outlet Checklist for Edit */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-[#4A4238]">
                    Penempatan Cabang Kerja <span className="text-red-500">*</span>
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

                <div className="space-y-1.5 p-2 bg-[#F9F7F2] rounded-2xl border border-[#E5E0D6] max-h-36 overflow-y-auto">
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
                    ? '✓ Akun memiliki hak akses di SEMUA cabang.'
                    : `✓ Akun ditugaskan di ${editOutletIds.length} cabang terpilih.`}
                </p>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="w-1/2 py-2.5 bg-[#FAF8F5] text-[#8E867C] font-bold rounded-2xl border border-[#EBE7DF] hover:bg-[#F2EDE5] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-1/2 py-2.5 bg-[#2E2520] hover:bg-[#453932] text-white font-bold rounded-2xl transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. MODAL: KONFIRMASI HAPUS PENGGUNA */}
      <ConfirmModal
        isOpen={!!deletingStaff}
        title="Hapus Akun Pengguna?"
        description="Akun pengguna ini akan dihapus dan tidak bisa login kembali ke sistem POS."
        confirmLabel="Hapus Akun"
        cancelLabel="Batal"
        variant="danger"
        isPending={isPending}
        onClose={() => setDeletingStaff(null)}
        onConfirm={handleConfirmDelete}
        itemDetails={
          deletingStaff
            ? [
                { label: 'Nama Pengguna', value: deletingStaff.name },
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
