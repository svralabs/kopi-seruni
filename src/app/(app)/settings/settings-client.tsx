'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { saveSettings } from '@/app/actions/settings';
import type { Outlet } from '@/lib/schema';
import { toast } from '@/lib/toast';
import {
  Settings,
  Printer,
  Percent,
  MapPin,
  Phone,
  CheckCircle2,
  ArrowRight,
  Store,
  Bluetooth,
  Loader2,
  RefreshCw,
  Power,
  Sparkles,
} from 'lucide-react';
import {
  isBluetoothSupported,
  connectBluetoothPrinter,
  forgetBluetoothPrinter,
  getActivePrinterName,
  isPrinterConnected,
  printDirectBluetooth,
} from '@/lib/bluetooth-printer';
import { generateEscPosReceipt } from '@/lib/escpos';

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

  // Bluetooth printer state
  const [btSupported, setBtSupported] = useState(false);
  const [btConnected, setBtConnected] = useState(false);
  const [btDeviceName, setBtDeviceName] = useState<string | null>(null);
  const [btLoading, setBtLoading] = useState(false);
  const [testPrintLoading, setTestPrintLoading] = useState(false);

  useEffect(() => {
    setBtSupported(isBluetoothSupported());
    setBtConnected(isPrinterConnected());
    setBtDeviceName(getActivePrinterName());
  }, []);

  const handleConnectBt = async () => {
    setBtLoading(true);
    try {
      const res = await connectBluetoothPrinter(true);
      if (res.success) {
        setBtConnected(true);
        setBtDeviceName(res.deviceName || 'Printer Bluetooth');
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (e: any) {
      toast.error(e?.message || 'Gagal menyambungkan Bluetooth');
    } finally {
      setBtLoading(false);
    }
  };

  const handleDisconnectBt = () => {
    forgetBluetoothPrinter();
    setBtConnected(false);
    setBtDeviceName(null);
    toast.success('Koneksi printer Bluetooth telah diputuskan.');
  };

  const handleTestPrint = async () => {
    setTestPrintLoading(true);
    try {
      const testData = {
        orderId: 'TEST-' + Date.now().toString().slice(-4),
        outletName: currentOutlet.name,
        outletAddress: currentOutlet.address || 'Jl. Kopi No. 1',
        outletPhone: currentOutlet.phone || '0812-3456-7890',
        kasirName: 'Kasir Utama',
        customerName: 'Uji Coba Printer',
        createdAt: Math.floor(Date.now() / 1000),
        items: [
          {
            productName: 'Kopi Susu Gula Aren',
            quantity: 1,
            productPrice: 18000,
            subtotal: 18000,
          },
        ],
        subtotal: 18000,
        discountAmount: 0,
        taxRate: 0,
        taxAmount: 0,
        total: 18000,
        paymentMethod: 'cash',
        cashReceived: 20000,
        change: 2000,
        footerText: currentSettings['receipt_footer'] || 'Terima kasih atas kunjungan Anda!',
      };

      const payload = generateEscPosReceipt(testData, 32);
      const res = await printDirectBluetooth(payload, false);
      if (res.success) {
        setBtConnected(true);
        setBtDeviceName(res.deviceName || 'Printer Bluetooth');
        toast.success('Struk uji coba berhasil dicetak!');
      } else {
        toast.error(res.message);
      }
    } catch (e: any) {
      toast.error(e?.message || 'Gagal cetak uji coba');
    } finally {
      setTestPrintLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await saveSettings(formData);
        toast.success(`Pengaturan cabang "${currentOutlet.name}" berhasil disimpan!`);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
        router.refresh();
      } catch (err: any) {
        toast.error(err?.message || 'Gagal menyimpan pengaturan');
      }
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
          Konfigurasi tarif PPN, koneksi printer bluetooth kasir, dan teks footer nota ({currentOutlet.name})
        </p>
      </div>

      {isSaved && (
        <div className="p-4 bg-[#EBF6EE] rounded-2xl border border-[#D1EBD8] text-xs font-bold text-[#2D7A47] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Pengaturan berhasil disimpan ke sistem!</span>
        </div>
      )}

      {/* Card Khusus: Setup & Konfigurasi Printer Bluetooth Thermal */}
      <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#EBF6EE] text-[#2D7A47] flex items-center justify-center">
              <Bluetooth className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#201C1A]">
                Setup & Koneksi Printer Bluetooth Kasir
              </h3>
              <p className="text-[11px] text-[#8E867C]">
                Sandingkan printer Bluetooth (misal <strong>RPP02N / POS-58</strong>) agar kasir bisa mencetak 1-klik langsung tanpa dialog popup.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${
                btConnected
                  ? 'bg-[#EBF6EE] text-[#2D7A47] border border-[#D1EBD8]'
                  : 'bg-[#F2EDE5] text-[#7A7268] border border-[#E0D9CE]'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  btConnected ? 'bg-[#2D7A47] animate-pulse' : 'bg-[#A8A095]'
                }`}
              />
              <span>{btConnected ? `Terhubung: ${btDeviceName}` : 'Belum Terhubung'}</span>
            </span>
          </div>
        </div>

        <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#ECE7DE] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-bold text-[#201C1A]">Panduan Sambung Printer:</p>
            <ol className="text-[11px] text-[#7A7268] list-decimal list-inside space-y-0.5">
              <li>Nyalakan printer Bluetooth kasir.</li>
              <li>Klik tombol <strong>"Hubungkan / Sandingkan Printer"</strong> di bawah.</li>
              <li>Pilih nama printer kamu (misal <strong>RPP02N</strong>) lalu klik <strong>"Sandingkan"</strong> pada dialog browser.</li>
              <li>Printer akan tersimpan aktif dan kasir dapat langsung mencetak otomatis pada setiap transaksi!</li>
            </ol>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={btLoading || !btSupported}
              onClick={handleConnectBt}
              className="py-2.5 px-4 bg-[#2D7A47] hover:bg-[#236338] disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              {btLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Bluetooth className="w-3.5 h-3.5" />
              )}
              <span>{btConnected ? 'Ganti / Hubungkan Ulang' : 'Hubungkan / Sandingkan Printer'}</span>
            </button>

            <button
              type="button"
              disabled={testPrintLoading || !btSupported}
              onClick={handleTestPrint}
              className="py-2.5 px-4 bg-[#FAF8F5] hover:bg-[#F2EDE5] text-[#2E2520] font-bold rounded-xl text-xs border border-[#D5CEC2] flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {testPrintLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Printer className="w-3.5 h-3.5" />
              )}
              <span>Tes Cetak Struk</span>
            </button>

            {btConnected && (
              <button
                type="button"
                onClick={handleDisconnectBt}
                className="py-2.5 px-3 bg-[#FBEBEA] hover:bg-[#F7D6D4] text-[#C93B2B] font-bold rounded-xl text-xs border border-[#F2C5C1] flex items-center gap-1 transition-all cursor-pointer"
                title="Putuskan sambungan Bluetooth"
              >
                <Power className="w-3.5 h-3.5" />
                <span>Putus</span>
              </button>
            )}
          </div>
        </div>
      </div>

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
