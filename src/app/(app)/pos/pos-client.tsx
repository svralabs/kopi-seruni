'use client';

import { useState, useTransition } from 'react';
import { formatRupiah, calcDiscount, calcTax, calcTotal } from '@/lib/utils';
import { checkout } from '@/app/actions/checkout';
import type { Product, Category, Discount } from '@/lib/schema';

interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
}

export default function POSClient({
  initialProducts,
  categories,
  discounts,
  outletId = 'out_default',
  shiftId = 'shf_default',
}: {
  initialProducts: Product[];
  categories: Category[];
  discounts: Discount[];
  outletId?: string;
  shiftId?: string;
}) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDiscountId, setSelectedDiscountId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'transfer' | 'debit'>('cash');
  const [customerName, setCustomerName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [successOrder, setSuccessOrder] = useState<{ id: string; total: number } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter products
  const filteredProducts = initialProducts.filter((p) => {
    const matchCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  // Cart operations
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedDiscountId('');
    setCustomerName('');
    setNotes('');
    setPaymentMethod('cash');
  };

  // Calculations (Integer Domain)
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const selectedDiscount = discounts.find((d) => d.id === selectedDiscountId);
  const discountAmount = selectedDiscount
    ? calcDiscount(subtotal, selectedDiscount.type as 'percentage' | 'fixed', selectedDiscount.value)
    : 0;

  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const taxRate = 11; // 11% PPN standar
  const taxAmount = calcTax(afterDiscount, taxRate);
  const total = calcTotal(subtotal, discountAmount, taxAmount);

  // Handle Checkout submission
  const handleProcessCheckout = () => {
    if (cart.length === 0) return;
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const payload = {
          outletId,
          shiftId,
          customerName: customerName || 'Pelanggan Walk-in',
          items: cart.map((item) => ({
            productId: item.product.id,
            productName: item.product.name,
            productPrice: item.product.price,
            costPrice: item.product.costPrice || 0,
            quantity: item.quantity,
            notes: item.notes,
          })),
          discountId: selectedDiscount?.id,
          discountType: selectedDiscount?.type as 'percentage' | 'fixed' | undefined,
          discountValue: selectedDiscount?.value,
          taxRate,
          paymentMethod,
          notes,
        };

        const res = await checkout(payload);
        if (res.success) {
          setSuccessOrder({ id: res.orderId, total: res.total });
          setIsCheckoutModalOpen(false);
          clearCart();
        }
      } catch (err: any) {
        setErrorMessage(err?.message || 'Gagal memproses transaksi. Cek kembali koneksi DB.');
      }
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-6rem)]">
      {/* Left Column: Products Grid (60%) */}
      <div className="flex-1 flex flex-col min-w-0 bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 overflow-hidden">
        {/* Search & Category Filter */}
        <div className="space-y-3 pb-4 border-b border-zinc-100 shrink-0">
          <div className="relative">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Cari menu produk..."
              className="w-full pl-4 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-zinc-900"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-sm no-scrollbar">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 rounded-xl font-medium whitespace-nowrap transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              Semua Menu
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 overflow-y-auto pt-4 pr-1">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400 py-12">
              <span className="text-4xl mb-2">☕</span>
              <p className="text-sm">Tidak ada produk ditemukan.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((prod) => (
                <button
                  key={prod.id}
                  onClick={() => addToCart(prod)}
                  className="flex flex-col text-left p-3.5 rounded-xl border border-zinc-200 hover:border-amber-500 hover:shadow-md transition-all bg-white group relative"
                >
                  <div className="w-full aspect-video rounded-lg bg-zinc-100 mb-2.5 overflow-hidden flex items-center justify-center text-zinc-400 text-2xl font-bold">
                    {prod.imageUrl ? (
                      <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>☕</span>
                    )}
                  </div>
                  <h4 className="font-semibold text-zinc-900 text-sm line-clamp-1 group-hover:text-amber-600">
                    {prod.name}
                  </h4>
                  <p className="text-xs text-zinc-500 line-clamp-1 mb-2">
                    {prod.description || 'Menu Seruni'}
                  </p>
                  <div className="mt-auto flex items-center justify-between">
                    <span className="font-bold text-amber-700 text-sm">
                      {formatRupiah(prod.price)}
                    </span>
                    <span className="w-6 h-6 rounded-full bg-amber-50 group-hover:bg-amber-600 group-hover:text-white text-amber-700 flex items-center justify-center text-xs font-bold transition-colors">
                      +
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Cart & Billing (40%) */}
      <div className="w-full lg:w-96 flex flex-col bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 shrink-0 overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <span className="text-lg">🛒</span>
            <h3 className="font-bold text-zinc-900">Keranjang Pesanan</h3>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-red-500 hover:text-red-700 font-medium"
            >
              Kosongkan
            </button>
          )}
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5 divide-y divide-zinc-100">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400 py-12 text-center">
              <span className="text-3xl mb-2">🛍️</span>
              <p className="text-sm font-medium">Keranjang masih kosong</p>
              <p className="text-xs text-zinc-400 mt-1">Pilih menu dari panel sebelah kiri</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.product.id} className="pt-2.5 first:pt-0 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h5 className="text-sm font-medium text-zinc-900 truncate">{item.product.name}</h5>
                  <p className="text-xs text-zinc-500">
                    {formatRupiah(item.product.price)} x {item.quantity} ={' '}
                    <span className="font-semibold text-zinc-800">
                      {formatRupiah(item.product.price * item.quantity)}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-1.5 bg-zinc-50 p-1 rounded-lg border border-zinc-200">
                  <button
                    onClick={() => updateQuantity(item.product.id, -1)}
                    className="w-6 h-6 rounded bg-white hover:bg-zinc-200 text-zinc-700 font-bold text-xs flex items-center justify-center shadow-xs"
                  >
                    -
                  </button>
                  <span className="w-5 text-center text-xs font-bold text-zinc-900">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.product.id, 1)}
                    className="w-6 h-6 rounded bg-white hover:bg-zinc-200 text-zinc-700 font-bold text-xs flex items-center justify-center shadow-xs"
                  >
                    +
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Summary & Action */}
        <div className="pt-3 border-t border-zinc-100 space-y-2.5 shrink-0">
          {/* Discount Select */}
          {discounts.length > 0 && (
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-zinc-500 font-medium">Diskon / Promo:</span>
              <select
                value={selectedDiscountId}
                onChange={(e) => setSelectedDiscountId(e.target.value)}
                className="px-2 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="">Tanpa Diskon</option>
                {discounts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.type === 'percentage' ? `${d.value}%` : formatRupiah(d.value)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Totals Breakdown */}
          <div className="space-y-1 text-xs text-zinc-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatRupiah(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-red-600 font-medium">
                <span>Diskon</span>
                <span>-{formatRupiah(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Pajak (PPN 11%)</span>
              <span>{formatRupiah(taxAmount)}</span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-zinc-900 pt-1 border-t border-zinc-200">
              <span>Total Tagihan</span>
              <span className="text-amber-700">{formatRupiah(total)}</span>
            </div>
          </div>

          <button
            disabled={cart.length === 0}
            onClick={() => setIsCheckoutModalOpen(true)}
            className="w-full py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-bold rounded-xl shadow transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <span>💳</span> Bayar Sekarang ({formatRupiah(total)})
          </button>
        </div>
      </div>

      {/* Modal Checkout / Pembayaran */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-zinc-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-bold text-lg text-zinc-900">Konfirmasi Pembayaran</h3>
              <button
                onClick={() => setIsCheckoutModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 font-bold"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 text-xs text-red-700 bg-red-50 rounded-lg border border-red-200">
                {errorMessage}
              </div>
            )}

            <div className="bg-amber-50 p-4 rounded-xl text-center">
              <p className="text-xs text-amber-700 font-medium uppercase tracking-wider">Total yang Harus Dibayar</p>
              <p className="text-3xl font-extrabold text-amber-900 mt-1">{formatRupiah(total)}</p>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Nama Pelanggan (Opsional)</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Contoh: Bpk. Budi / Meja 04"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Metode Pembayaran</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['cash', 'qris', 'transfer', 'debit'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`py-2 px-3 rounded-lg border text-xs font-bold uppercase transition-all ${
                        paymentMethod === method
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      {method === 'cash' ? '💵 Tunai (Cash)' : method === 'qris' ? '📱 QRIS' : method === 'transfer' ? '🏦 Transfer' : '💳 Kartu Debit'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Catatan Pesanan (Opsional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Contoh: Kurang manis, tanpa sedotan"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-zinc-900"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCheckoutModalOpen(false)}
                className="flex-1 py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium rounded-xl text-sm transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleProcessCheckout}
                className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors shadow"
              >
                {isPending ? 'Memproses...' : 'Selesaikan Pembayaran'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sukses */}
      {successOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-zinc-200 p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner">
              ✓
            </div>
            <div>
              <h3 className="font-bold text-xl text-zinc-900">Pembayaran Berhasil!</h3>
              <p className="text-xs text-zinc-500 mt-1">Nomor Struk: <span className="font-mono font-bold text-zinc-800">{successOrder.id}</span></p>
            </div>
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
              <span className="text-xs text-zinc-500">Total Diterima</span>
              <p className="text-2xl font-extrabold text-emerald-700 mt-0.5">
                {formatRupiah(successOrder.total)}
              </p>
            </div>
            <button
              onClick={() => setSuccessOrder(null)}
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition-colors shadow"
            >
              Transaksi Baru 🚀
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
