'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatRupiah, formatDateTime } from '@/lib/utils';
import { voidOrder } from '@/app/actions/checkout';
import ReceiptModal, { type ReceiptData } from '@/components/receipt-modal';
import type { Order, OrderItem, Outlet } from '@/lib/schema';
import {
  Search,
  Printer,
  Ban,
  Receipt,
  Store,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpDown,
  CreditCard,
  Banknote,
  QrCode,
} from 'lucide-react';

export interface OrderWithDetails extends Order {
  outletName: string;
  outletAddress?: string | null;
  outletPhone?: string | null;
  kasirName: string;
  items: OrderItem[];
}

export default function OrdersClient({
  initialOrders,
  outlets,
  currentOutletId,
}: {
  initialOrders: OrderWithDetails[];
  outlets: Outlet[];
  currentOutletId?: string;
}) {
  const router = useRouter();
  const [selectedOutlet, setSelectedOutlet] = useState<string>(currentOutletId || 'all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'voided'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'qris' | 'transfer' | 'debit'>('all');

  // Thermal modal receipt state
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);

  // Void confirmation state
  const [voidingOrder, setVoidingOrder] = useState<OrderWithDetails | null>(null);
  const [isPending, startTransition] = useTransition();

  // Filter orders
  const filteredOrders = initialOrders.filter((order) => {
    const matchOutlet = selectedOutlet === 'all' || order.outletId === selectedOutlet;
    const matchStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchPayment = paymentFilter === 'all' || order.paymentMethod === paymentFilter;
    const matchSearch =
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customerName && order.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      order.items.some((i) => i.productName.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchOutlet && matchStatus && matchPayment && matchSearch;
  });

  // KPI Metrics
  const totalRevenue = filteredOrders
    .filter((o) => o.status === 'completed')
    .reduce((sum, o) => sum + o.total, 0);

  const totalTransactions = filteredOrders.length;
  const completedCount = filteredOrders.filter((o) => o.status === 'completed').length;
  const voidedCount = filteredOrders.filter((o) => o.status === 'voided').length;

  const handleOpenReceipt = (order: OrderWithDetails) => {
    const receipt: ReceiptData = {
      orderId: order.id,
      outletName: order.outletName,
      outletAddress: order.outletAddress,
      outletPhone: order.outletPhone,
      kasirName: order.kasirName,
      customerName: order.customerName,
      createdAt: order.createdAt,
      items: order.items.map((i) => ({
        productName: i.productName,
        quantity: i.quantity,
        productPrice: i.productPrice,
        subtotal: i.subtotal,
        notes: i.notes,
      })),
      subtotal: order.subtotal,
      discountAmount: order.discountAmount,
      taxRate: order.taxRate,
      taxAmount: order.taxAmount,
      total: order.total,
      paymentMethod: order.paymentMethod as any,
      cashReceived: order.total,
      change: 0,
      notes: order.notes,
    };
    setActiveReceipt(receipt);
  };

  const handleConfirmVoid = () => {
    if (!voidingOrder) return;
    startTransition(async () => {
      try {
        await voidOrder(voidingOrder.id, voidingOrder.outletId);
        setVoidingOrder(null);
        router.refresh();
      } catch (err: any) {
        alert(err?.message || 'Gagal membatalkan order');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Bento */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#201C1A]">
            Riwayat Transaksi POS
          </h1>
          <p className="text-xs text-[#8E867C] mt-0.5">
            Daftar seluruh penjualan kasir, cetak ulang struk, dan pembatalan pesanan (void)
          </p>
        </div>

        {/* Outlet Selector Filter */}
        <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-2xl border border-[#EBE7DF] shadow-xs">
          <Store className="w-4 h-4 text-[#54382B]" />
          <span className="text-xs font-bold text-[#8E867C]">Outlet:</span>
          <select
            value={selectedOutlet}
            onChange={(e) => {
              setSelectedOutlet(e.target.value);
              if (e.target.value === 'all') router.push('/orders');
              else router.push(`/orders?outletId=${e.target.value}`);
            }}
            className="text-xs font-bold text-[#201C1A] bg-transparent border-none focus:outline-none cursor-pointer"
          >
            <option value="all">Semua Cabang Outlet</option>
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs">
          <span className="text-[11px] font-bold text-[#8E867C] uppercase tracking-wider">
            Total Omset Penjualan
          </span>
          <p className="text-2xl font-black text-[#201C1A] mt-1">{formatRupiah(totalRevenue)}</p>
          <span className="text-[10px] text-[#2D7A47] font-semibold mt-1 inline-block">
            Dari transaksi berstatus selesai
          </span>
        </div>

        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs">
          <span className="text-[11px] font-bold text-[#8E867C] uppercase tracking-wider">
            Total Transaksi
          </span>
          <p className="text-2xl font-black text-[#201C1A] mt-1">{totalTransactions} Struk</p>
          <span className="text-[10px] text-[#8E867C] mt-1 inline-block">Seluruh order tercatat</span>
        </div>

        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs">
          <span className="text-[11px] font-bold text-[#8E867C] uppercase tracking-wider">
            Transaksi Selesai
          </span>
          <p className="text-2xl font-black text-[#2D7A47] mt-1">{completedCount} Struk</p>
          <span className="text-[10px] text-[#2D7A47] font-semibold mt-1 inline-block">Lunas & sukses</span>
        </div>

        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs">
          <span className="text-[11px] font-bold text-[#8E867C] uppercase tracking-wider">
            Transaksi Dibatalkan (Void)
          </span>
          <p className="text-2xl font-black text-[#964B3B] mt-1">{voidedCount} Struk</p>
          <span className="text-[10px] text-[#964B3B] font-semibold mt-1 inline-block">Stok dikembalikan</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl border border-[#EBE7DF] p-4 shadow-xs flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-[#9E968B] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari no struk, nama pelanggan, atau nama menu..."
            className="w-full pl-11 pr-4 py-2.5 bg-[#FAF8F5] border border-[#EAE5DC] rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 bg-[#FAF8F5] p-1 rounded-2xl border border-[#ECE7DE]">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'all'
                ? 'bg-white text-[#201C1A] shadow-xs'
                : 'text-[#8E867C] hover:text-[#201C1A]'
            }`}
          >
            Semua Status
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'completed'
                ? 'bg-white text-[#2D7A47] shadow-xs'
                : 'text-[#8E867C] hover:text-[#201C1A]'
            }`}
          >
            Selesai
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('voided')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'voided'
                ? 'bg-white text-[#964B3B] shadow-xs'
                : 'text-[#8E867C] hover:text-[#201C1A]'
            }`}
          >
            Void
          </button>
        </div>

        {/* Payment Method Filter */}
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value as any)}
          className="px-3.5 py-2.5 bg-[#FAF8F5] border border-[#EAE5DC] rounded-2xl text-xs font-bold text-[#4A4238] focus:outline-none"
        >
          <option value="all">Semua Metode Bayar</option>
          <option value="cash">Tunai (Cash)</option>
          <option value="qris">QRIS</option>
          <option value="debit">Debit / EDC</option>
          <option value="transfer">Transfer Bank</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#F0ECE4] bg-[#FAF8F5] text-[#8E867C] text-[10px] font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">No. Struk / Waktu</th>
                <th className="py-3.5 px-4">Outlet & Kasir</th>
                <th className="py-3.5 px-4">Pelanggan</th>
                <th className="py-3.5 px-4">Item Menu</th>
                <th className="py-3.5 px-4">Total & Metode</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F0E8]">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-[#FBF9F6] transition-colors">
                  {/* Order ID & Time */}
                  <td className="py-3.5 px-4">
                    <p className="font-mono font-bold text-[#201C1A]">{order.id}</p>
                    <p className="text-[10px] text-[#8E867C] mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatDateTime(order.createdAt)}</span>
                    </p>
                  </td>

                  {/* Outlet & Cashier */}
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-[#201C1A]">{order.outletName}</p>
                    <p className="text-[10px] text-[#7A7268]">Kasir: {order.kasirName}</p>
                  </td>

                  {/* Customer */}
                  <td className="py-3.5 px-4 font-semibold text-[#4A4238]">
                    {order.customerName || 'Walk-in'}
                  </td>

                  {/* Items snapshot */}
                  <td className="py-3.5 px-4 max-w-[200px]">
                    <p className="font-semibold text-[#201C1A] truncate">
                      {order.items.map((i) => `${i.productName} (${i.quantity}x)`).join(', ')}
                    </p>
                    <p className="text-[10px] text-[#8E867C]">
                      {order.items.reduce((s, i) => s + i.quantity, 0)} total item
                    </p>
                  </td>

                  {/* Total & Payment */}
                  <td className="py-3.5 px-4">
                    <p className="font-black text-[#201C1A] text-sm">{formatRupiah(order.total)}</p>
                    <span className="text-[10px] font-bold uppercase text-[#54382B] bg-[#F4EFE6] px-2 py-0.5 rounded-md inline-block mt-0.5">
                      {order.paymentMethod}
                    </span>
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                        order.status === 'completed'
                          ? 'bg-[#EBF6EE] text-[#2D7A47] border border-[#D1EBD8]'
                          : 'bg-[#FBEBE8] text-[#964B3B] border border-[#F5C7BE]'
                      }`}
                    >
                      {order.status === 'completed' ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Selesai</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" />
                          <span>Dibatalkan</span>
                        </>
                      )}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleOpenReceipt(order)}
                      className="px-3 py-1.5 bg-[#FAF8F5] hover:bg-[#F2EDE5] text-[#201C1A] font-bold rounded-xl border border-[#E2DDD3] text-[11px] transition-colors inline-flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Cetak Nota</span>
                    </button>

                    {order.status === 'completed' && (
                      <button
                        type="button"
                        onClick={() => setVoidingOrder(order)}
                        className="px-3 py-1.5 bg-[#FBEBE8] hover:bg-[#F8DDD7] text-[#964B3B] font-bold rounded-xl border border-[#F5C7BE] text-[11px] transition-colors inline-flex items-center gap-1.5"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Void</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-[#9E968B]">
                    <Receipt className="w-10 h-10 mx-auto mb-2 text-[#D5CEC2] stroke-[1.2]" />
                    <p className="font-bold text-sm text-[#201C1A]">Tidak ada transaksi ditemukan</p>
                    <p className="text-xs text-[#8E867C] mt-0.5">
                      Coba ganti filter outlet atau kata kunci pencarian
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL: PRINT STRUK THERMAL */}
      {/* ============================================================ */}
      {activeReceipt && (
        <ReceiptModal
          receipt={activeReceipt}
          onClose={() => setActiveReceipt(null)}
        />
      )}

      {/* ============================================================ */}
      {/* MODAL: KONFIRMASI VOID / BATALKAN PESANAN */}
      {/* ============================================================ */}
      {voidingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-[#EBE7DF] p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FBEBE8] text-[#964B3B] flex items-center justify-center mx-auto border border-[#F5C7BE]">
              <Ban className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="font-bold text-base text-[#201C1A]">Batalkan Transaksi (Void)?</h3>
              <p className="text-xs text-[#8E867C] mt-1">
                Transaksi <span className="font-mono font-bold text-[#201C1A]">{voidingOrder.id}</span> sebesar{' '}
                <span className="font-bold text-[#201C1A]">{formatRupiah(voidingOrder.total)}</span> akan dibatalkan dan seluruh stok item akan dikembalikan ke gudang.
              </p>
            </div>

            <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#ECE7DE] text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-[#8E867C]">Outlet</span>
                <span className="font-bold">{voidingOrder.outletName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8E867C]">Kasir</span>
                <span className="font-bold">{voidingOrder.kasirName}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVoidingOrder(null)}
                className="flex-1 py-3 bg-[#F2ECE3] hover:bg-[#E8E0D4] text-[#4A4238] font-bold rounded-2xl text-xs transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleConfirmVoid}
                className="flex-1 py-3 bg-[#964B3B] hover:bg-[#803E30] text-white font-bold rounded-2xl text-xs transition-all shadow-sm disabled:opacity-50"
              >
                {isPending ? 'Membatalkan...' : 'Ya, Batalkan & Rollback Stok'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
