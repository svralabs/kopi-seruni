import { db } from '@/lib/db';
import { profitSharingRules, profitSharingLedger } from '@/lib/schema';
import { formatRupiah, formatDate } from '@/lib/utils';
import { createRule } from '@/app/actions/profit-sharing-crud';
import { desc } from 'drizzle-orm';
import { GeneratePeriodButton, MarkPaidButton, ToggleRuleButton } from './client-buttons';
import { Users2, Plus, Percent, BookOpen } from 'lucide-react';

export default async function BagiHasilPage() {
  let rulesList: any[] = [];
  let ledgerList: any[] = [];

  try {
    rulesList = await db.select().from(profitSharingRules);
    ledgerList = await db
      .select()
      .from(profitSharingLedger)
      .orderBy(desc(profitSharingLedger.createdAt));
  } catch (e) {
    console.warn('Error fetching bagi hasil data:', e);
  }

  const totalPercentage = rulesList
    .filter((r) => r.isActive === 1)
    .reduce((sum, r) => sum + r.percentage, 0);

  const retainedPercentage = Math.max(0, 100 - totalPercentage);

  return (
    <div className="space-y-8">
      {/* Header Bento */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#201C1A]">
          Bagi Hasil & Profit Sharing
        </h1>
        <p className="text-xs text-[#8E867C] mt-0.5">
          Atur persentase bagi hasil per orang (Owner, Investor, Mitra) dari Laba Bersih (Net Profit)
        </p>
      </div>

      {/* SECTION 1: Rules Setup Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Tambah Rule */}
        <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
          <h3 className="font-bold text-xs uppercase tracking-wider text-[#54382B] flex items-center gap-2">
            <Plus className="w-4 h-4" /> Tambah Penerima Bagi Hasil
          </h3>

          <form action={createRule} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-[#4A4238] mb-1.5">Nama Penerima</label>
              <input
                type="text"
                name="name"
                required
                placeholder="Contoh: Owner A / Investor Pak Budi"
                className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#4A4238] mb-1.5">Persentase (%) dari Laba Bersih</label>
              <input
                type="number"
                name="percentage"
                required
                min="1"
                max="100"
                step="1"
                placeholder="30"
                className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-black"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-[#2E2520] hover:bg-[#453932] text-white font-bold rounded-2xl text-xs transition-all shadow-xs"
            >
              Simpan Rule Bagi Hasil
            </button>
          </form>
        </div>

        {/* Tabel Rules Aktif */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F0ECE4]">
            <h3 className="font-bold text-sm text-[#201C1A]">Proporsi Bagi Hasil Aktif</h3>
            <div className="text-xs text-[#7A7268] font-medium">
              Dialokasikan: <span className="font-black text-[#54382B]">{totalPercentage}%</span> | Kas Bisnis:{' '}
              <span className="font-black text-[#2D7A47]">{retainedPercentage}%</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#F0ECE4] text-[#8E867C] text-[10px] font-bold uppercase tracking-wider bg-[#FAF8F5]">
                  <th className="py-3 px-4">Nama Penerima</th>
                  <th className="py-3 px-4">Persentase</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F0E8]">
                {rulesList.map((r) => (
                  <tr key={r.id} className="hover:bg-[#FBF9F6]">
                    <td className="py-3 px-4 font-bold text-[#201C1A]">{r.name}</td>
                    <td className="py-3 px-4 font-black text-[#54382B]">{r.percentage}%</td>
                    <td className="py-3 px-4 text-right">
                      <ToggleRuleButton id={r.id} currentStatus={r.isActive} />
                    </td>
                  </tr>
                ))}
                {rulesList.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center py-6 text-[#9E968B] text-xs">
                      Belum ada penerima bagi hasil yang disetup.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 2: Ledger History */}
      <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F0ECE4] pb-4">
          <div>
            <h3 className="font-bold text-base text-[#201C1A]">Buku Besar Pembagian Hasil (Ledger)</h3>
            <p className="text-xs text-[#8E867C]">Riwayat nominal hak bagi hasil per periode</p>
          </div>
          <GeneratePeriodButton />
        </div>

        {ledgerList.length === 0 ? (
          <div className="text-center py-12 text-[#9E968B] text-xs">
            Belum ada ledger bagi hasil yang digenerate.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#F0ECE4] bg-[#FAF8F5] text-[#8E867C] text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Periode</th>
                  <th className="py-3.5 px-4">Penerima</th>
                  <th className="py-3.5 px-4">Laba Bersih Acuan</th>
                  <th className="py-3.5 px-4">Nominal Hak</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F0E8]">
                {ledgerList.map((item) => {
                  const rule = rulesList.find((r) => r.id === item.ruleId);
                  return (
                    <tr key={item.id} className="hover:bg-[#FBF9F6]">
                      <td className="py-3 px-4 text-[#7A7268] whitespace-nowrap">
                        {formatDate(item.periodStart)} s/d {formatDate(item.periodEnd)}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#201C1A]">
                        {rule?.name || 'Penerima'}
                      </td>
                      <td className="py-3 px-4 text-[#6B635A]">
                        {formatRupiah(item.netProfit)}
                      </td>
                      <td className="py-3 px-4 font-black text-[#54382B]">
                        {formatRupiah(item.shareAmount)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                            item.status === 'paid'
                              ? 'bg-[#EBF6EE] text-[#2D7A47]'
                              : 'bg-[#FDF4E5] text-[#96631E]'
                          }`}
                        >
                          {item.status === 'paid' ? 'Lunas' : 'Menunggu Transfer'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {item.status !== 'paid' && <MarkPaidButton id={item.id} />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
