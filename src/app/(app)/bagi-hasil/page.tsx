import { db } from '@/lib/db';
import { profitSharingRules, profitSharingLedger, outlets } from '@/lib/schema';
import { formatRupiah, formatDate } from '@/lib/utils';
import { createRule } from '@/app/actions/profit-sharing';
import { desc, eq } from 'drizzle-orm';

import { GeneratePeriodButton, MarkPaidButton, ToggleRuleButton, DeleteRuleButton } from './client-buttons';
import { Users2, Plus, Percent, BookOpen, Store } from 'lucide-react';


export default async function BagiHasilPage({
  searchParams,
}: {
  searchParams?: Promise<{ outletId?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const outletId = resolvedParams.outletId || 'out_default';

  let allOutlets: any[] = [];
  let rulesList: any[] = [];
  let ledgerList: any[] = [];

  try {
    allOutlets = await db.select().from(outlets);

    rulesList = await db
      .select()
      .from(profitSharingRules)
      .where(eq(profitSharingRules.outletId, outletId));

    ledgerList = await db
      .select()
      .from(profitSharingLedger)
      .where(eq(profitSharingLedger.outletId, outletId))
      .orderBy(desc(profitSharingLedger.createdAt));
  } catch (e) {
    console.warn('Error fetching bagi hasil data:', e);
  }

  const currentOutletName = allOutlets.find((o) => o.id === outletId)?.name || 'Outlet Utama';

  const totalPercentage = rulesList
    .filter((r) => r.isActive === 1)
    .reduce((sum, r) => sum + r.percentage, 0);

  const retainedPercentage = Math.max(0, 100 - totalPercentage);

  return (
    <div className="space-y-8">
      {/* Header Bento */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#201C1A]">
          Bagi Hasil & Profit Sharing Multi-Owner
        </h1>
        <p className="text-xs text-[#8E867C] mt-0.5">
          Atur komposisi kepemilikan dan persentase bagi hasil per orang (Owner A, B, C / Investor) khusus cabang {currentOutletName}
        </p>
      </div>


      {/* SECTION 1: Rules Setup Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Tambah Rule */}
        <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#54382B] flex items-center gap-2">
              <Plus className="w-4 h-4" /> Tambah Pemilik / Investor
            </h3>
            <span className="text-[10px] font-bold text-[#8E867C]">{currentOutletName}</span>
          </div>

          <form action={createRule} className="space-y-3.5 text-xs">
            <input type="hidden" name="outletId" value={outletId} />

            <div>
              <label className="block font-bold text-[#4A4238] mb-1.5">Nama Pemilik / Investor</label>
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
                Persentase (%) dari Laba Bersih
              </label>
              <input
                type="number"
                name="percentage"
                required
                min="1"
                max={retainedPercentage || 100}
                step="1"
                placeholder={retainedPercentage ? `${retainedPercentage}` : '30'}
                className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-black"
              />
              <p className="text-[10px] text-[#8E867C] mt-1">
                Sisa kuota tersedia di cabang ini: <strong className="text-[#2D7A47]">{retainedPercentage}%</strong>
              </p>
            </div>

            <button
              type="submit"
              disabled={retainedPercentage <= 0}
              className="w-full py-2.5 bg-[#2E2520] hover:bg-[#453932] text-white font-bold rounded-2xl text-xs transition-all shadow-xs disabled:opacity-50"
            >
              {retainedPercentage <= 0 ? 'Alokasi Sudah 100%' : 'Simpan Hak Bagi Hasil'}
            </button>
          </form>
        </div>

        {/* Tabel Rules Aktif */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F0ECE4]">
            <h3 className="font-bold text-sm text-[#201C1A]">
              Komposisi Kepemilikan: {currentOutletName}
            </h3>
            <div className="text-xs text-[#7A7268] font-medium">
              Dialokasikan: <span className="font-black text-[#54382B]">{totalPercentage}%</span> | Kas Bisnis:{' '}
              <span className="font-black text-[#2D7A47]">{retainedPercentage}%</span>
            </div>
          </div>

          {/* Visual Progress Bar Alokasi */}
          <div className="w-full bg-[#FAF8F5] rounded-full h-3.5 p-0.5 border border-[#EBE7DF] flex overflow-hidden">
            <div
              className="bg-[#54382B] h-full rounded-l-full transition-all"
              style={{ width: `${Math.min(100, totalPercentage)}%` }}
              title={`Dialokasikan ke Pemilik: ${totalPercentage}%`}
            />
            <div
              className="bg-[#2D7A47] h-full rounded-r-full transition-all"
              style={{ width: `${retainedPercentage}%` }}
              title={`Kas Bisnis / Cadangan Modal: ${retainedPercentage}%`}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#F0ECE4] text-[#8E867C] text-[10px] font-bold uppercase tracking-wider bg-[#FAF8F5]">
                  <th className="py-3 px-4">Nama Pemilik / Investor</th>
                  <th className="py-3 px-4">Persentase Hak</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F0E8]">
                {rulesList.map((r) => (
                  <tr key={r.id} className="hover:bg-[#FBF9F6]">
                    <td className="py-3 px-4 font-bold text-[#201C1A]">{r.name}</td>
                    <td className="py-3 px-4 font-black text-[#54382B]">{r.percentage}%</td>
                    <td className="py-3 px-4">
                      <ToggleRuleButton id={r.id} currentStatus={r.isActive} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <DeleteRuleButton id={r.id} name={r.name} />
                    </td>
                  </tr>
                ))}
                {rulesList.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-[#9E968B] text-xs">
                      Belum ada komposisi pemilik yang diatur untuk cabang ini.
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
            <h3 className="font-bold text-base text-[#201C1A]">
              Buku Besar Pembagian Hasil ({currentOutletName})
            </h3>
            <p className="text-xs text-[#8E867C]">Riwayat nominal hak bagi hasil per periode</p>
          </div>
          <GeneratePeriodButton outletId={outletId} />
        </div>

        {ledgerList.length === 0 ? (
          <div className="text-center py-12 text-[#9E968B] text-xs">
            Belum ada ledger bagi hasil yang digenerate untuk cabang ini.
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
                        {item.status !== 'paid' && <MarkPaidButton id={item.id} outletId={outletId} />}
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
