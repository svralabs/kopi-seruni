import { db } from '@/lib/db';
import { profitSharingRules, profitSharingLedger } from '@/lib/schema';
import { formatRupiah, formatDate } from '@/lib/utils';
import { createRule } from '@/app/actions/profit-sharing-crud';
import { desc } from 'drizzle-orm';
import { GeneratePeriodButton, MarkPaidButton, ToggleRuleButton } from './client-buttons';

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Bagi Hasil & Profit Sharing</h1>
        <p className="text-sm text-zinc-500">
          Atur persentase bagi hasil per orang (Owner, Investor, Mitra) dari Laba Bersih (Net Profit)
        </p>
      </div>

      {/* SECTION 1: Rules Setup */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Tambah Rule */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5 space-y-4">
          <h3 className="font-bold text-sm text-zinc-900 flex items-center gap-2">
            <span>➕</span> Tambah Penerima Bagi Hasil
          </h3>
          <form action={createRule} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Nama Penerima</label>
              <input
                type="text"
                name="name"
                required
                placeholder="Contoh: Owner A / Investor Pak Budi"
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-zinc-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Persentase (%) dari Net Profit</label>
              <input
                type="number"
                name="percentage"
                required
                min="1"
                max="100"
                step="1"
                placeholder="30"
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-zinc-900 font-bold"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
            >
              Simpan Rule Bagi Hasil
            </button>
          </form>
        </div>

        {/* Tabel Rules Aktif */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-zinc-900">Daftar Proporsi Bagi Hasil</h3>
            <div className="text-xs text-zinc-500 font-medium">
              Dialokasikan: <span className="font-bold text-amber-700">{totalPercentage}%</span> | Kas Bisnis:{' '}
              <span className="font-bold text-emerald-700">{retainedPercentage}%</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 text-xs font-semibold uppercase bg-zinc-50">
                  <th className="py-2.5 px-3">Nama Penerima</th>
                  <th className="py-2.5 px-3">Persentase</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rulesList.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-50/70">
                    <td className="py-2.5 px-3 font-semibold text-zinc-900">{r.name}</td>
                    <td className="py-2.5 px-3 font-bold text-amber-700">{r.percentage}%</td>
                    <td className="py-2.5 px-3 text-right">
                      <ToggleRuleButton id={r.id} currentStatus={r.isActive} />
                    </td>
                  </tr>
                ))}
                {rulesList.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center py-6 text-zinc-400 text-xs">
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
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
          <div>
            <h3 className="font-bold text-base text-zinc-900">Buku Besar Pembagian Hasil (Ledger)</h3>
            <p className="text-xs text-zinc-500">Riwayat hak bagi hasil yang digenerate per periode</p>
          </div>
          <GeneratePeriodButton />
        </div>

        {ledgerList.length === 0 ? (
          <div className="text-center py-12 text-zinc-400 text-sm">
            Belum ada ledger bagi hasil yang digenerate.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 text-xs font-semibold uppercase">
                  <th className="py-3 px-3">Periode</th>
                  <th className="py-3 px-3">Penerima</th>
                  <th className="py-3 px-3">Laba Bersih Acuan</th>
                  <th className="py-3 px-3">Nominal Hak</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {ledgerList.map((item) => {
                  const rule = rulesList.find((r) => r.id === item.ruleId);
                  return (
                    <tr key={item.id} className="hover:bg-zinc-50/70">
                      <td className="py-3 px-3 text-xs text-zinc-600">
                        {formatDate(item.periodStart)} s/d {formatDate(item.periodEnd)}
                      </td>
                      <td className="py-3 px-3 font-semibold text-zinc-900">
                        {rule?.name || 'Penerima'}
                      </td>
                      <td className="py-3 px-3 text-zinc-600 text-xs">
                        {formatRupiah(item.netProfit)}
                      </td>
                      <td className="py-3 px-3 font-bold text-amber-700">
                        {formatRupiah(item.shareAmount)}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                            item.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.status === 'paid' ? 'Lunas' : 'Menunggu Transfer'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
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
