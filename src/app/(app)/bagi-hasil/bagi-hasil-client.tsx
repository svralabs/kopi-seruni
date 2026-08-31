'use client';

import { useState, useTransition } from 'react';
import { formatRupiah, formatDate } from '@/lib/utils';
import { createRule, updateRule, generateProfitSharing, markSharePaid } from '@/app/actions/profit-sharing';
import ConfirmModal from '@/components/confirm-modal';
import { toast } from '@/lib/toast';
import { 
  Users2, 
  Plus, 
  Percent, 
  PieChart, 
  Calculator, 
  CheckCircle, 
  Clock, 
  X, 
  Trash2,
  Sparkles,
  ArrowRight,
  Pencil
} from 'lucide-react';
import { ToggleRuleButton, DeleteRuleButton } from './client-buttons';

export default function BagiHasilClient({
  rulesList,
  ledgerList,
  outlets,
  currentOutletId = 'out_default',
  currentNetProfit = 0,
  totalPaidDividends = 0,
  totalPendingDividends = 0,
}: {
  rulesList: any[];
  ledgerList: any[];
  outlets: any[];
  currentOutletId?: string;
  currentNetProfit?: number;
  totalPaidDividends?: number;
  totalPendingDividends?: number;
}) {
  const [activeTab, setActiveTab] = useState<'rules' | 'ledger'>('rules');
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any | null>(null);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [payingShare, setPayingShare] = useState<any | null>(null);

  const [period, setPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [netProfitInput, setNetProfitInput] = useState(currentNetProfit > 0 ? currentNetProfit : 15000000);
  const [isPending, startTransition] = useTransition();

  const totalPercentage = rulesList
    .filter((r) => r.isActive === 1)
    .reduce((sum, r) => sum + r.percentage, 0);

  const retainedPercentage = Math.max(0, 100 - totalPercentage);
  const estimatedAllocatedDividends = Math.floor((currentNetProfit * totalPercentage) / 100);
  const estimatedRetainedEarnings = Math.floor((currentNetProfit * retainedPercentage) / 100);

  const currentOutletName = outlets.find((o) => o.id === currentOutletId)?.name || 'Outlet Utama';

  const getFrequencyBadge = (freq?: string) => {
    switch (freq) {
      case 'weekly':
        return { label: 'Mingguan', style: 'bg-[#F3E8FF] text-[#6B21A8] border-[#E9D5FF]' };
      case 'quarterly':
        return { label: 'Triwulan', style: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]' };
      case 'yearly':
        return { label: 'Tahunan', style: 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]' };
      case 'monthly':
      default:
        return { label: 'Bulanan', style: 'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]' };
    }
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!period || netProfitInput <= 0) {
      toast.error('Mohon isi periode dan nominal laba bersih yang valid');
      return;
    }

    const [year, month] = period.split('-').map(Number);
    const fromDate = Math.floor(new Date(year, month - 1, 1).getTime() / 1000);
    const toDate = Math.floor(new Date(year, month, 0, 23, 59, 59).getTime() / 1000);

    startTransition(async () => {
      try {
        await generateProfitSharing(currentOutletId, fromDate, toDate, netProfitInput);
        toast.success('Bagi hasil berhasil dihitung & dicatat ke Ledger!');
        setIsGenerateModalOpen(false);
        setActiveTab('ledger');
      } catch (err: any) {
        toast.error(err?.message || 'Gagal generate bagi hasil');
      }
    });
  };

  const handleConfirmMarkPaid = () => {
    if (!payingShare) return;
    startTransition(async () => {
      try {
        await markSharePaid(payingShare.id, currentOutletId);
        toast.success(`Dividen ${payingShare.ruleName ? `untuk "${payingShare.ruleName}" ` : ''}berhasil ditandai LUNAS`);
        setPayingShare(null);
      } catch (err: any) {
        toast.error(err?.message || 'Gagal menandai lunas');
      }
    });
  };

  return (
    <div className="space-y-6">
      <ConfirmModal
        isOpen={!!payingShare}
        onClose={() => setPayingShare(null)}
        onConfirm={handleConfirmMarkPaid}
        title="Tandai Dividen Lunas?"
        description="Pastikan nominal dividen laba bersih toko ini telah ditransfer kepada penerima/mitra investor."
        confirmLabel="Tandai Lunas"
        cancelLabel="Batal"
        variant="success"
        isPending={isPending}
        itemDetails={
          payingShare
            ? [
                { label: 'Periode', value: payingShare.period },
                { label: 'Penerima', value: payingShare.ruleName || '-' },
                { label: 'Nominal Dividen', value: formatRupiah(payingShare.shareAmount) },
              ]
            : undefined
        }
      />

      {/* Header & Setup Modal Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#201C1A]">
            Bagi Hasil & Multi-Owner
          </h1>
          <p className="text-xs text-[#8E867C] mt-0.5">
            Manajemen persentase kepemilikan modal, frekuensi pencairan, dan perhitungan dividen laba bersih toko
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsRuleModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#FAF8F5] hover:bg-[#F2ECE3] text-[#201C1A] text-xs font-bold rounded-2xl border border-[#E5E0D6] shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Setup Owner</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (currentNetProfit > 0) setNetProfitInput(currentNetProfit);
              setIsGenerateModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#2E2520] hover:bg-[#453932] text-white text-xs font-bold rounded-2xl shadow-xs transition-colors cursor-pointer"
          >
            <Calculator className="w-4 h-4" />
            <span>Generate Periode</span>
          </button>
        </div>
      </div>

      {/* 1. TOP NOMINAL & PERCENTAGE METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* KPI 1: Laba Bersih Toko */}
        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-4 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#8E867C] uppercase tracking-wider">
              Laba Bersih Cabang
            </span>
            <div className="w-7 h-7 rounded-xl bg-[#FAF8F5] text-[#54382B] flex items-center justify-center">
              <PieChart className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <h3 className="font-serif font-black text-lg text-[#201C1A]">
              {formatRupiah(currentNetProfit)}
            </h3>
            <p className="text-[10px] text-[#8E867C]">Bulan berjalan ({currentOutletName})</p>
          </div>
        </div>

        {/* KPI 2: Alokasi Dividen Mitra */}
        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-4 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#8E867C] uppercase tracking-wider">
              Alokasi Dividen ({totalPercentage}%)
            </span>
            <div className="w-7 h-7 rounded-xl bg-[#FAF8F5] text-[#54382B] flex items-center justify-center">
              <Users2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <h3 className="font-serif font-black text-lg text-[#54382B]">
              {formatRupiah(estimatedAllocatedDividends)}
            </h3>
            <p className="text-[10px] text-[#54382B] font-semibold">
              {rulesList.filter((r) => r.isActive === 1).length} Partner aktif
            </p>
          </div>
        </div>

        {/* KPI 3: Laba Ditahan / Kas Toko */}
        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-4 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#8E867C] uppercase tracking-wider">
              Laba Ditahan ({retainedPercentage}%)
            </span>
            <div className="w-7 h-7 rounded-xl bg-[#EBF6EE] text-[#2D7A47] flex items-center justify-center">
              <CheckCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <h3 className="font-serif font-black text-lg text-[#2D7A47]">
              {formatRupiah(estimatedRetainedEarnings)}
            </h3>
            <p className="text-[10px] text-[#2D7A47] font-semibold">Dana cadangan kas toko</p>
          </div>
        </div>

        {/* KPI 4: Total Dividen Lunas */}
        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-4 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#8E867C] uppercase tracking-wider">
              Dividen Lunas
            </span>
            <div className="w-7 h-7 rounded-xl bg-[#EBF6EE] text-[#2D7A47] flex items-center justify-center">
              <CheckCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <h3 className="font-serif font-black text-lg text-[#2D7A47]">
              {formatRupiah(totalPaidDividends)}
            </h3>
            <p className="text-[10px] text-[#8E867C]">Total dividen tersalurkan</p>
          </div>
        </div>

        {/* KPI 5: Total Dividen Tertunda */}
        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-4 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#8E867C] uppercase tracking-wider">
              Dividen Pending
            </span>
            <div className="w-7 h-7 rounded-xl bg-[#FFF9EB] text-[#96631E] flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <h3 className="font-serif font-black text-lg text-[#96631E]">
              {formatRupiah(totalPendingDividends)}
            </h3>
            <p className="text-[10px] text-[#96631E] font-semibold">Kewajiban belum ditransfer</p>
          </div>
        </div>
      </div>

      {/* Progress Allocation Bar */}
      <div className="bg-white rounded-3xl border border-[#EBE7DF] p-4 shadow-xs space-y-2">
        <div className="flex justify-between text-xs font-bold">
          <span className="text-[#201C1A]">Proporsi Pembagian Laba ({currentOutletName})</span>
          <span className="text-[#54382B]">
            {totalPercentage}% Hak Mitra ({formatRupiah(estimatedAllocatedDividends)}) / {retainedPercentage}% Kas Toko ({formatRupiah(estimatedRetainedEarnings)})
          </span>
        </div>
        <div className="w-full h-3 bg-[#FAF8F5] border border-[#ECE7DE] rounded-full overflow-hidden flex">
          <div
            style={{ width: `${totalPercentage}%` }}
            className="bg-[#54382B] h-full transition-all duration-500"
          />
          <div
            style={{ width: `${retainedPercentage}%` }}
            className="bg-[#2D7A47] h-full transition-all duration-500"
          />
        </div>
      </div>

      {/* 2. FULL-WIDTH DATA TABLE WITH TABS */}
      <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
        {/* Tab Selector */}
        <div className="flex items-center justify-between pb-3 border-b border-[#F0ECE4]">
          <div className="flex items-center gap-1.5 bg-[#F9F7F2] p-1 rounded-2xl border border-[#E5E0D6] text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('rules')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'rules'
                  ? 'bg-white text-[#201C1A] shadow-xs'
                  : 'text-[#8E867C] hover:text-[#201C1A]'
              }`}
            >
              <Users2 className="w-3.5 h-3.5" />
              <span>Daftar Pemilik & Hak ({rulesList.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ledger')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'ledger'
                  ? 'bg-white text-[#201C1A] shadow-xs'
                  : 'text-[#8E867C] hover:text-[#201C1A]'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Riwayat Dividen Ledger ({ledgerList.length})</span>
            </button>
          </div>

          <span className="text-xs font-bold text-[#8E867C] px-3 py-1 bg-[#FAF8F5] rounded-xl border border-[#EBE7DF]">
            {currentOutletName}
          </span>
        </div>

        {/* Tab 1: Rules Table */}
        {activeTab === 'rules' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#F0ECE4] text-[#8E867C] text-[10px] font-bold uppercase tracking-wider bg-[#FAF8F5]">
                  <th className="py-3.5 px-4">Nama Pemilik / Investor</th>
                  <th className="py-3.5 px-4">Persentase Hak</th>
                  <th className="py-3.5 px-4">Frekuensi Bagi Hasil</th>
                  <th className="py-3.5 px-4">Status Keaktifan</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F0E8]">
                {rulesList.map((r) => {
                  const freqBadge = getFrequencyBadge(r.frequency);
                  return (
                    <tr key={r.id} className="hover:bg-[#FBF9F6] transition-colors">
                      <td className="py-3.5 px-4 font-bold text-[#201C1A]">{r.name}</td>
                      <td className="py-3.5 px-4 font-black text-sm text-[#54382B]">{r.percentage}%</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${freqBadge.style}`}>
                          {freqBadge.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <ToggleRuleButton id={r.id} currentStatus={r.isActive} />
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingRule(r)}
                          className="p-1 text-[#54382B] hover:bg-[#F2EDE5] bg-[#FAF8F5] border border-[#E5E0D6] rounded-xl transition-colors inline-flex cursor-pointer"
                          title="Edit Aturan"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <DeleteRuleButton id={r.id} name={r.name} />
                      </td>
                    </tr>
                  );
                })}
                {rulesList.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-[#9E968B] text-xs">
                      Belum ada owner yang diatur. Klik tombol &quot;Setup Owner&quot; di atas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Ledger Table */}
        {activeTab === 'ledger' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#F0ECE4] text-[#8E867C] text-[10px] font-bold uppercase tracking-wider bg-[#FAF8F5]">
                  <th className="py-3.5 px-4">Periode</th>
                  <th className="py-3.5 px-4">Penerima</th>
                  <th className="py-3.5 px-4">Laba Bersih Toko</th>
                  <th className="py-3.5 px-4">Bagian Dividen</th>
                  <th className="py-3.5 px-4">Status Pembayaran</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F0E8]">
                {ledgerList.map((l) => (
                  <tr key={l.id} className="hover:bg-[#FBF9F6] transition-colors">
                    <td className="py-3.5 px-4 font-bold text-[#201C1A]">{l.period}</td>
                    <td className="py-3.5 px-4 font-semibold text-[#201C1A]">{l.ruleName || l.ruleId}</td>
                    <td className="py-3.5 px-4 text-[#7A7268]">{formatRupiah(l.netProfit)}</td>
                    <td className="py-3.5 px-4 font-black text-sm text-[#2D7A47]">
                      {formatRupiah(l.shareAmount)}
                    </td>
                    <td className="py-3.5 px-4">
                      {l.paidAt ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#EBF6EE] text-[#2D7A47] font-bold text-[10px] border border-[#D1EBD8]">
                          Lunas ({formatDate(l.paidAt)})
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#FDF4E5] text-[#96631E] font-bold text-[10px] border border-[#F2E0C4]">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {!l.paidAt && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => setPayingShare(l)}
                          className="px-3 py-1 bg-[#EBF6EE] hover:bg-[#DDF0E2] text-[#2D7A47] font-bold rounded-xl text-[11px] transition-colors disabled:opacity-50 inline-flex items-center gap-1 border border-[#D1EBD8] cursor-pointer"
                        >
                          <CheckCircle className="w-3 h-3" />
                          <span>Tandai Lunas</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {ledgerList.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-[#9E968B] text-xs">
                      Belum ada ledger bagi hasil. Klik tombol &quot;Generate Periode&quot; di atas untuk mengalkulasi laba.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. MODAL DIALOG 1: SETUP OWNER / RULE BARU */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0ECE4] pb-3">
              <div className="flex items-center gap-2 text-[#54382B]">
                <Plus className="w-4 h-4" />
                <h3 className="font-bold text-sm text-[#201C1A]">Setup Pemilik & Hak Bagi Hasil</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRuleModalOpen(false)}
                className="text-[#9E968B] hover:text-[#201C1A] p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              action={async (formData) => {
                try {
                  await createRule(formData);
                  toast.success('Penerima bagi hasil berhasil ditambahkan');
                  setIsRuleModalOpen(false);
                } catch (err: any) {
                  toast.error(err?.message || 'Gagal menambahkan penerima bagi hasil');
                }
              }}
              className="space-y-3.5 text-xs"
            >
              <input type="hidden" name="outletId" value={currentOutletId} />

              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">
                  Nama Pemilik / Mitra Investor <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Contoh: Owner A (Fahmi)"
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-semibold"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="font-bold text-[#4A4238]">
                    Persentase Hak Bagi Hasil (%) <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-[#8E867C]">Maks: {retainedPercentage}%</span>
                </div>
                <input
                  type="number"
                  name="percentage"
                  required
                  min="1"
                  max={retainedPercentage}
                  step="1"
                  placeholder={`Contoh: ${Math.min(25, retainedPercentage)}`}
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-black text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">
                  Frekuensi Pembagian Dividen <span className="text-red-500">*</span>
                </label>
                <select
                  name="frequency"
                  defaultValue="monthly"
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-semibold cursor-pointer"
                >
                  <option value="monthly">Bulanan (Setiap Akhir Bulan)</option>
                  <option value="weekly">Mingguan (Setiap Akhir Pekan)</option>
                  <option value="quarterly">Triwulan (Per 3 Bulan)</option>
                  <option value="yearly">Tahunan (Tutup Buku)</option>
                </select>
              </div>

              <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#ECE7DE] text-[11px] text-[#7A7268]">
                Sisa porsi kas yang belum dialokasikan untuk cabang ini: <strong>{retainedPercentage}%</strong>
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsRuleModalOpen(false)}
                  className="flex-1 py-2.5 border border-[#E5E0D6] text-[#7A7268] font-bold rounded-2xl hover:bg-[#FAF8F5] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={retainedPercentage <= 0}
                  className="flex-1 py-2.5 bg-[#2E2520] hover:bg-[#453932] text-white font-bold rounded-2xl shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  Simpan Hak Owner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. MODAL DIALOG: EDIT ATURAN BAGI HASIL */}
      {editingRule && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0ECE4] pb-3">
              <div>
                <h3 className="font-bold text-base text-[#201C1A]">Edit Aturan Bagi Hasil</h3>
                <p className="text-[11px] text-[#8E867C]">Perbarui nama partner, persentase, atau frekuensi hak</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingRule(null)}
                className="text-[#9E968B] hover:text-[#201C1A] p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              action={async (formData) => {
                try {
                  await updateRule(editingRule.id, formData);
                  toast.success('Aturan bagi hasil berhasil diperbarui');
                  setEditingRule(null);
                } catch (err: any) {
                  toast.error(err?.message || 'Gagal memperbarui aturan');
                }
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">
                  Nama Pemilik / Mitra Investor <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingRule.name}
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">
                  Persentase Hak Bagi Hasil (%) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="percentage"
                  required
                  min="1"
                  max={100}
                  step="1"
                  defaultValue={editingRule.percentage}
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-black text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">
                  Frekuensi Pembagian Dividen <span className="text-red-500">*</span>
                </label>
                <select
                  name="frequency"
                  defaultValue={editingRule.frequency || 'monthly'}
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-semibold cursor-pointer"
                >
                  <option value="monthly">Bulanan (Setiap Akhir Bulan)</option>
                  <option value="weekly">Mingguan (Setiap Akhir Pekan)</option>
                  <option value="quarterly">Triwulan (Per 3 Bulan)</option>
                  <option value="yearly">Tahunan (Tutup Buku)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingRule(null)}
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

      {/* 5. MODAL DIALOG: GENERATE PERIODE DIVIDEN */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0ECE4] pb-3">
              <div className="flex items-center gap-2 text-[#54382B]">
                <Calculator className="w-4 h-4" />
                <h3 className="font-bold text-sm text-[#201C1A]">Generate Dividen Bagi Hasil</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsGenerateModalOpen(false)}
                className="text-[#9E968B] hover:text-[#201C1A] p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGenerate} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">
                  Periode Bagi Hasil (Bulan) <span className="text-red-500">*</span>
                </label>
                <input
                  type="month"
                  required
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">
                  Total Laba Bersih Toko (Rp) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1000"
                  value={netProfitInput}
                  onChange={(e) => setNetProfitInput(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-black text-sm"
                />
              </div>

              <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#ECE7DE] space-y-1 text-xs">
                <span className="text-[#8E867C] font-bold">Simulasi Dividen ({totalPercentage}%):</span>
                <p className="font-black text-[#2D7A47] text-sm">
                  {formatRupiah(Math.floor((netProfitInput * totalPercentage) / 100))}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="flex-1 py-2.5 border border-[#E5E0D6] text-[#7A7268] font-bold rounded-2xl hover:bg-[#FAF8F5] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-2.5 bg-[#2E2520] hover:bg-[#453932] text-white font-bold rounded-2xl shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? 'Memproses...' : 'Generate Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
