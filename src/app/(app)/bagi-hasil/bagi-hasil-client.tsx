'use client';

import { useState, useTransition } from 'react';
import { formatRupiah, formatDate } from '@/lib/utils';
import { createRule, generateProfitSharing, markSharePaid } from '@/app/actions/profit-sharing';
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
  ArrowRight
} from 'lucide-react';
import { ToggleRuleButton, DeleteRuleButton } from './client-buttons';

export default function BagiHasilClient({
  rulesList,
  ledgerList,
  outlets,
  currentOutletId = 'out_default',
}: {
  rulesList: any[];
  ledgerList: any[];
  outlets: any[];
  currentOutletId?: string;
}) {
  const [activeTab, setActiveTab] = useState<'rules' | 'ledger'>('rules');
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  const [period, setPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [netProfitInput, setNetProfitInput] = useState(15000000);
  const [isPending, startTransition] = useTransition();

  const totalPercentage = rulesList
    .filter((r) => r.isActive === 1)
    .reduce((sum, r) => sum + r.percentage, 0);

  const retainedPercentage = Math.max(0, 100 - totalPercentage);

  const currentOutletName = outlets.find((o) => o.id === currentOutletId)?.name || 'Outlet Utama';

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const [year, month] = period.split('-').map(Number);
      const periodStart = Math.floor(new Date(year, (month || 1) - 1, 1).getTime() / 1000);
      const periodEnd = Math.floor(new Date(year, month || 1, 0, 23, 59, 59).getTime() / 1000);
      await generateProfitSharing(currentOutletId, periodStart, periodEnd, netProfitInput);
      setIsGenerateModalOpen(false);
    });
  };

  const handleMarkPaid = (id: string) => {
    if (!confirm('Tandai bagi hasil ini sudah dibayarkan/transfer ke owner?')) return;
    startTransition(async () => {
      await markSharePaid(id, currentOutletId);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#201C1A]">
            Bagi Hasil & Profit Sharing Multi-Owner
          </h1>
          <p className="text-xs text-[#8E867C] mt-0.5">
            Kelola persentase kepemilikan owner dan pembagian dividen laba bersih di {currentOutletName}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsGenerateModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-[#EBE7DF] hover:bg-[#FAF8F5] text-xs font-bold text-[#54382B] rounded-2xl shadow-xs transition-colors"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Generate Periode</span>
          </button>

          <button
            type="button"
            onClick={() => setIsRuleModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#2E2520] hover:bg-[#453932] text-white text-xs font-bold rounded-2xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Setup Owner</span>
          </button>
        </div>
      </div>

      {/* 1. TOP SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#8E867C]">Alokasi Hak Owner</p>
            <h3 className="text-2xl font-black text-[#54382B] mt-1">{totalPercentage}%</h3>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#F4EFE6] border border-[#E5DEC3] flex items-center justify-center text-[#54382B]">
            <PieChart className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#8E867C]">Kas Toko / Cadangan Modal</p>
            <h3 className="text-2xl font-black text-[#2D7A47] mt-1">{retainedPercentage}%</h3>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#EBF6EE] border border-[#D1EBD8] flex items-center justify-center text-[#2D7A47]">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#8E867C]">Total Owner / Investor</p>
            <h3 className="text-2xl font-black text-[#201C1A] mt-1">{rulesList.length} Orang</h3>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#FAF8F5] border border-[#ECE7DE] flex items-center justify-center text-[#7A7268]">
            <Users2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Visual Progress Bar Alokasi */}
      <div className="bg-white rounded-3xl border border-[#EBE7DF] p-4 shadow-xs space-y-2">
        <div className="flex justify-between text-xs font-bold">
          <span className="text-[#54382B]">Hak Owner ({totalPercentage}%)</span>
          <span className="text-[#2D7A47]">Kas Bisnis ({retainedPercentage}%)</span>
        </div>
        <div className="w-full bg-[#FAF8F5] rounded-full h-3 p-0.5 border border-[#EBE7DF] flex overflow-hidden">
          <div
            className="bg-[#54382B] h-full rounded-l-full transition-all"
            style={{ width: `${Math.min(100, totalPercentage)}%` }}
          />
          <div
            className="bg-[#2D7A47] h-full rounded-r-full transition-all"
            style={{ width: `${retainedPercentage}%` }}
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
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all ${
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
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all ${
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
                  <th className="py-3.5 px-4">Status Keaktifan</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F0E8]">
                {rulesList.map((r) => (
                  <tr key={r.id} className="hover:bg-[#FBF9F6] transition-colors">
                    <td className="py-3.5 px-4 font-bold text-[#201C1A]">{r.name}</td>
                    <td className="py-3.5 px-4 font-black text-sm text-[#54382B]">{r.percentage}%</td>
                    <td className="py-3.5 px-4">
                      <ToggleRuleButton id={r.id} currentStatus={r.isActive} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <DeleteRuleButton id={r.id} name={r.name} />
                    </td>
                  </tr>
                ))}
                {rulesList.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-[#9E968B] text-xs">
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
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          l.status === 'paid'
                            ? 'bg-[#EBF6EE] text-[#2D7A47] border border-[#D1EBD8]'
                            : 'bg-[#FDF4E5] text-[#96631E] border border-[#F5E2BE]'
                        }`}
                      >
                        {l.status === 'paid' ? 'Lunas Ditransfer' : 'Menunggu Transfer'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {l.status === 'pending' && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleMarkPaid(l.id)}
                          className="px-3 py-1 bg-[#2D7A47] hover:bg-[#236338] text-white font-bold rounded-xl text-xs transition-colors shadow-xs"
                        >
                          Tandai Lunas
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {ledgerList.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-[#9E968B] text-xs">
                      Belum ada ledger bagi hasil yang digenerate.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. MODAL DIALOG 1: TAMBAH OWNER / RULE */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0ECE4] pb-3">
              <div className="flex items-center gap-2 text-[#54382B]">
                <Plus className="w-4 h-4" />
                <h3 className="font-bold text-sm text-[#201C1A]">Setup Pemilik / Investor Baru</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRuleModalOpen(false)}
                className="text-[#9E968B] hover:text-[#201C1A] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              action={async (formData) => {
                await createRule(formData);
                setIsRuleModalOpen(false);
              }}
              className="space-y-3.5 text-xs"
            >
              <input type="hidden" name="outletId" value={currentOutletId} />

              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">
                  Nama Pemilik / Investor <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Contoh: Owner A / Pak Budi"
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-bold"
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
                  max={retainedPercentage || 100}
                  step="1"
                  placeholder={retainedPercentage ? `${retainedPercentage}` : '30'}
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-black text-sm"
                />
                <p className="text-[10px] text-[#8E867C] mt-1">
                  Sisa kuota kepemilikan tersedia: <strong className="text-[#2D7A47]">{retainedPercentage}%</strong>
                </p>
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsRuleModalOpen(false)}
                  className="flex-1 py-2.5 border border-[#E5E0D6] text-[#7A7268] font-bold rounded-2xl hover:bg-[#FAF8F5]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={retainedPercentage <= 0}
                  className="flex-1 py-2.5 bg-[#2E2520] hover:bg-[#453932] text-white font-bold rounded-2xl shadow-xs disabled:opacity-50"
                >
                  Simpan Hak Owner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. MODAL DIALOG 2: GENERATE PERIODE DIVIDEN */}
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
                className="text-[#9E968B] hover:text-[#201C1A] p-1 rounded-lg"
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
                  className="flex-1 py-2.5 border border-[#E5E0D6] text-[#7A7268] font-bold rounded-2xl hover:bg-[#FAF8F5]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-2.5 bg-[#2E2520] hover:bg-[#453932] text-white font-bold rounded-2xl shadow-xs disabled:opacity-50"
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
