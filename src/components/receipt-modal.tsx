'use client';

import { useState, useRef, useEffect } from 'react';
import { formatRupiah, formatDateTime } from '@/lib/utils';
import { Printer, CheckCircle2, X, Bluetooth, Loader2, FileText } from 'lucide-react';
import { generateEscPosReceipt } from '@/lib/escpos';
import { printDirectBluetooth, isBluetoothSupported } from '@/lib/bluetooth-printer';

export interface ReceiptData {
  orderId: string;
  outletName: string;
  outletAddress?: string | null;
  outletPhone?: string | null;
  kasirName: string;
  customerName?: string | null;
  createdAt: number;
  items: {
    productName: string;
    quantity: number;
    productPrice: number;
    subtotal: number;
    notes?: string | null;
  }[];
  subtotal: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  paymentMethod: 'cash' | 'qris' | 'transfer' | 'debit';
  cashReceived?: number;
  change?: number;
  notes?: string | null;
}

export default function ReceiptModal({
  receipt,
  onClose,
  onNewTransaction,
}: {
  receipt: ReceiptData;
  onClose: () => void;
  onNewTransaction?: () => void;
}) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [paperWidth, setPaperWidth] = useState<32 | 48>(32);
  const [isBluetoothPrinting, setIsBluetoothPrinting] = useState(false);
  const [bluetoothStatus, setBluetoothStatus] = useState<string | null>(null);
  const [bluetoothSupported, setBluetoothSupported] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setBluetoothSupported(isBluetoothSupported());
  }, []);

  const handlePrintBrowser = () => {
    window.print();
  };

  const handlePrintBluetooth = async (forcePicker: boolean = false) => {
    setIsBluetoothPrinting(true);
    setBluetoothStatus(forcePicker ? 'Mencari printer bluetooth...' : 'Menghubungkan printer...');
    try {
      const payload = generateEscPosReceipt(
        {
          ...receipt,
          footerText: 'Terima kasih atas kunjungan Anda!',
        },
        paperWidth
      );
      const res = await printDirectBluetooth(payload, forcePicker);
      setBluetoothStatus(res.message);
      setTimeout(() => {
        setBluetoothStatus(null);
      }, 4000);
    } catch (e: any) {
      setBluetoothStatus(`Error: ${e.message || e}`);
    } finally {
      setIsBluetoothPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      {/* Container for Screen Modal */}
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-[#EBE7DF] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 bg-[#FAF8F5] border-b border-[#ECE7DE] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#EBF6EE] text-[#2D7A47] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#201C1A]">Struk Pembayaran</h3>
              <p className="text-[11px] text-[#8E867C] font-mono">{receipt.orderId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Paper Width Selector */}
            <div className="flex bg-[#EFECE6] p-0.5 rounded-lg text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setPaperWidth(32)}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                  paperWidth === 32 ? 'bg-white text-[#201C1A] shadow-2xs' : 'text-[#7A7268]'
                }`}
                title="Kertas 58mm (32 Kolom)"
              >
                58mm
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth(48)}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                  paperWidth === 48 ? 'bg-white text-[#201C1A] shadow-2xs' : 'text-[#7A7268]'
                }`}
                title="Kertas 80mm (48 Kolom)"
              >
                80mm
              </button>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white border border-[#E5E0D6] flex items-center justify-center text-[#7A7268] hover:text-[#201C1A] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Notification Toast */}
        {bluetoothStatus && (
          <div className="px-5 py-2.5 bg-[#FAF3E8] border-b border-[#F2E0C4] text-xs font-semibold text-[#96631E] flex items-center gap-2 animate-in fade-in">
            {isBluetoothPrinting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{bluetoothStatus}</span>
          </div>
        )}

        {/* Scrollable Receipt Preview */}
        <div className="p-6 overflow-y-auto bg-[#F4F1EA]">
          {/* Printable Receipt Paper */}
          <div
            ref={receiptRef}
            id="thermal-receipt"
            className={`bg-white p-6 rounded-2xl shadow-sm border border-[#E5DFD5] text-[#201C1A] font-mono text-xs mx-auto space-y-3 receipt-${
              paperWidth === 48 ? '80mm' : '58mm'
            } ${paperWidth === 48 ? 'max-w-[380px]' : 'max-w-[320px]'}`}
          >
            {/* Header Struk: Logo Kopi Seruni (Hitam Putih) */}
            <div className="text-center space-y-1.5 border-b border-dashed border-[#CBC4B8] pb-3.5">
              <div className="flex justify-center pb-2.5 pt-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo-receipt.png"
                  alt="Logo Kopi Seruni"
                  className="w-40 h-auto max-h-18 object-contain mx-auto"
                />
              </div>
              <p className="text-[11px] font-sans font-bold text-[#201C1A]">
                {receipt.outletName}
              </p>
              {receipt.outletAddress && (
                <p className="text-[10px] text-[#7A7268] font-sans leading-tight">
                  {receipt.outletAddress}
                </p>
              )}
              {receipt.outletPhone && (
                <p className="text-[10px] text-[#7A7268] font-sans">
                  Telp: {receipt.outletPhone}
                </p>
              )}
            </div>

            {/* Meta Transaksi */}
            <div className="text-[11px] space-y-0.5 border-b border-dashed border-[#CBC4B8] pb-2 text-[#4A4238]">
              <div className="flex justify-between">
                <span>No. Nota</span>
                <span className="font-bold">{receipt.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span>Waktu</span>
                <span>{formatDateTime(receipt.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span>Kasir</span>
                <span>{receipt.kasirName}</span>
              </div>
              <div className="flex justify-between">
                <span>Pelanggan</span>
                <span className="font-bold">{receipt.customerName || 'Walk-in'}</span>
              </div>
            </div>

            {/* List Items */}
            <div className="space-y-2 border-b border-dashed border-[#CBC4B8] pb-3">
              {receipt.items.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between font-bold text-[#201C1A]">
                    <span>{item.productName}</span>
                    <span>{formatRupiah(item.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-[#7A7268]">
                    <span>
                      {item.quantity} x {formatRupiah(item.productPrice)}
                    </span>
                  </div>
                  {item.notes && (
                    <p className="text-[9px] text-[#9E968B] italic font-sans">{item.notes}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Rincian Finansial */}
            <div className="text-[11px] space-y-1 border-b border-dashed border-[#CBC4B8] pb-2 text-[#4A4238]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatRupiah(receipt.subtotal)}</span>
              </div>
              {receipt.discountAmount > 0 && (
                <div className="flex justify-between text-[#2D7A47] font-semibold">
                  <span>Diskon Promo</span>
                  <span>-{formatRupiah(receipt.discountAmount)}</span>
                </div>
              )}
              {receipt.taxAmount > 0 && (
                <div className="flex justify-between text-[#7A7268]">
                  <span>PPN ({receipt.taxRate}%)</span>
                  <span>+{formatRupiah(receipt.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-dashed border-[#CBC4B8] text-sm font-black text-[#201C1A]">
                <span>TOTAL</span>
                <span>{formatRupiah(receipt.total)}</span>
              </div>
            </div>

            {/* Rincian Bayar & Kembalian */}
            <div className="text-[11px] space-y-1 border-b border-dashed border-[#CBC4B8] pb-3 text-[#4A4238]">
              <div className="flex justify-between">
                <span className="uppercase">Metode: {receipt.paymentMethod}</span>
                <span className="font-bold">
                  {receipt.paymentMethod === 'cash' && receipt.cashReceived
                    ? formatRupiah(receipt.cashReceived)
                    : formatRupiah(receipt.total)}
                </span>
              </div>
              {receipt.paymentMethod === 'cash' && receipt.change != null && (
                <div className="flex justify-between font-bold text-[#2D7A47]">
                  <span>Kembalian</span>
                  <span>{formatRupiah(receipt.change)}</span>
                </div>
              )}
            </div>

            {/* Footer Struk */}
            <div className="text-center pt-1 space-y-1">
              <p className="text-[10px] text-[#7A7268] font-sans">
                Terima kasih atas kunjungan Anda!
              </p>
              <p className="text-[9px] text-[#A8A095] font-sans">
                Follow IG: @kopiseruni
              </p>
              <p className="text-[8px] text-[#C4BCB0] font-sans pt-1">
                POS by{' '}
                <a
                  href="https://svralabs.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-bold text-[#A8A095] hover:text-[#54382B]"
                >
                  svralabs.com
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-4 bg-white border-t border-[#ECE7DE] space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Direct Bluetooth Print Button (Chrome/Edge Web Bluetooth) */}
            {mounted && bluetoothSupported ? (
              <div className="flex gap-1.5">
                <button
                  type="button"
                  disabled={isBluetoothPrinting}
                  onClick={() => handlePrintBluetooth(false)}
                  className="flex-1 py-3 px-3 bg-[#2D7A47] hover:bg-[#236338] disabled:opacity-50 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  title="Cetak langsung ke printer bluetooth tanpa popup dialog"
                >
                  {isBluetoothPrinting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Bluetooth className="w-4 h-4" />
                  )}
                  <span>Print Bluetooth Direct</span>
                </button>
                <button
                  type="button"
                  disabled={isBluetoothPrinting}
                  onClick={() => handlePrintBluetooth(true)}
                  className="py-3 px-2.5 bg-[#EBF6EE] hover:bg-[#DDF0E2] text-[#2D7A47] font-semibold rounded-2xl text-[10px] flex items-center justify-center transition-all cursor-pointer"
                  title="Pilih atau cari perangkat printer bluetooth lain"
                >
                  Pilih
                </button>
              </div>
            ) : null}

            {/* Fallback Standard Browser Print */}
            <button
              type="button"
              onClick={handlePrintBrowser}
              className={`py-3 px-4 bg-[#2E2520] hover:bg-[#453932] text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer ${
                !mounted || !bluetoothSupported ? 'sm:col-span-2' : ''
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>Cetak via Dialog OS</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              if (onNewTransaction) onNewTransaction();
              else onClose();
            }}
            className="w-full py-2.5 px-4 bg-[#FAF8F5] hover:bg-[#F2EDE5] text-[#54382B] font-bold rounded-xl text-xs border border-[#E2DDD3] transition-all cursor-pointer text-center"
          >
            Selesai / Transaksi Baru
          </button>
        </div>
      </div>
    </div>
  );
}
