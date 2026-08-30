'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveSettings } from '@/app/actions/settings';
import type { Outlet } from '@/lib/schema';
import { Settings, Printer, Percent, MapPin, Phone, CheckCircle2, ArrowRight, Store } from 'lucide-react';

export default function SettingsClient({
  outlets,
  currentOutlet,
  currentSettings,
}: {
  outlets: Outlet[];
  currentOutlet: Outlet;
  currentSettings: Record<string, string>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      await saveSettings(formData);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#201C1A]">
          Pengaturan Umum & Kustomisasi Struk
        </h1>
        <p className="text-xs text-[#8E867C] mt-0.5">
          Konfigurasi tarif PPN, informasi kontak toko, dan teks footer nota kasir ({currentOutlet.name})
        </p>
      </div>


      {isSaved && (
        <div className="p-4 bg-[#EBF6EE] rounded-2xl border border-[#D1EBD8] text-xs font-bold text-[#2D7A47] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Pengaturan berhasil disimpan ke sistem!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start text-xs">
        <input type="hidden" name="outletId" value={currentOutlet.id} />

        {/* Card 1: Pengaturan Pajak & Finansial */}
        <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2 text-[#54382B]">
            <Percent className="w-4 h-4" />
            <h3 className="font-bold text-xs uppercase tracking-wider">Pajak & Transaksi</h3>
          </div>

          <div>
            <label className="block font-bold text-[#4A4238] mb-1.5">
              Tarif Pajak PPN (%)
            </label>
            <input
              type="number"
              name="taxRate"
              min="0"
              max="30"
              step="1"
              defaultValue={currentSettings['tax_rate'] || '11'}
              className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-black"
            />
            <p className="text-[10px] text-[#8E867C] mt-1">
              Standar PPN Indonesia saat ini adalah 11%
            </p>
          </div>
        </div>

        {/* Card 2: Pengaturan Nota & Struk */}
        <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2 text-[#54382B]">
            <Printer className="w-4 h-4" />
            <h3 className="font-bold text-xs uppercase tracking-wider">Kustomisasi Struk Thermal</h3>
          </div>

          <div>
            <label className="block font-bold text-[#4A4238] mb-1.5">
              Pesan Footer Struk (Bawah Nota)
            </label>
            <textarea
              name="receiptFooter"
              rows={2}
              defaultValue={
                currentSettings['receipt_footer'] ||
                'Terima kasih atas kunjungan Anda!\nFollow IG: @kopiseruni'
              }
              className="w-full px-3.5 py-2 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] text-xs leading-relaxed"
            />
          </div>
        </div>

        {/* Card 3: Identitas & Alamat Cabang */}
        <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4 lg:col-span-2">
          <div className="flex items-center gap-2 text-[#54382B]">
            <MapPin className="w-4 h-4" />
            <h3 className="font-bold text-xs uppercase tracking-wider">
              Identitas & Lokasi: {currentOutlet.name}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[#4A4238] mb-1.5">Alamat Cabang</label>
              <textarea
                name="address"
                rows={2}
                defaultValue={currentOutlet.address || ''}
                placeholder="Jl. Dipati Ukur No. 42, Bandung"
                className="w-full px-3.5 py-2 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#4A4238] mb-1.5">No. Telepon Outlet</label>
              <input
                type="text"
                name="phone"
                defaultValue={currentOutlet.phone || ''}
                placeholder="0812-3456-7890"
                className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="py-3 px-6 bg-[#2E2520] hover:bg-[#453932] text-white font-bold rounded-2xl text-xs transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              <span>{isPending ? 'Menyimpan...' : 'Simpan Perubahan Pengaturan'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
