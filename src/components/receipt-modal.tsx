'use client';

import { useRef } from 'react';
import { formatRupiah, formatDateTime } from '@/lib/utils';
import { Printer, CheckCircle2, X } from 'lucide-react';

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

  const handlePrint = () => {
    window.print();
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
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-[#E5E0D6] flex items-center justify-center text-[#7A7268] hover:text-[#201C1A]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Receipt Preview */}
        <div className="p-6 overflow-y-auto bg-[#F4F1EA]">
          {/* Printable Receipt Paper */}
          <div
            ref={receiptRef}
            id="thermal-receipt"
            className="bg-white p-6 rounded-2xl shadow-sm border border-[#E5DFD5] text-[#201C1A] font-mono text-xs max-w-[340px] mx-auto space-y-3"
          >
            {/* Header Struk */}
            <div className="text-center space-y-1 border-b border-dashed border-[#CBC4B8] pb-3">
              <h2 className="font-serif font-black text-base uppercase tracking-tight text-[#201C1A]">
                TOKO KOPI SERUNI
              </h2>
              <p className="text-[11px] font-sans font-semibold text-[#54382B]">
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
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-4 bg-white border-t border-[#ECE7DE] grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="py-3 px-4 bg-[#2E2520] hover:bg-[#453932] text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Struk (Print)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (onNewTransaction) onNewTransaction();
              else onClose();
            }}
            className="py-3 px-4 bg-[#FAF8F5] hover:bg-[#F2EDE5] text-[#201C1A] font-bold rounded-2xl text-xs border border-[#E2DDD3] transition-all"
          >
            Transaksi Baru
          </button>
        </div>
      </div>

      {/* Print CSS Styles */}
      <style jsx global>{`
        @page {
          size: auto;
          margin: 0mm;
        }
        @media print {
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          #thermal-receipt,
          #thermal-receipt * {
            visibility: visible !important;
          }
          #thermal-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 58mm !important;
            margin: 0 !important;
            padding: 2mm 3mm !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: monospace, 'Courier New', Courier, sans-serif !important;
          }
        }
      `}</style>
    </div>
  );
}
