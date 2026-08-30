'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatRupiah, calcDiscount, calcTax, calcTotal } from '@/lib/utils';
import { checkout } from '@/app/actions/checkout';
import type { Product, Category, Discount, Outlet } from '@/lib/schema';
import ReceiptModal, { type ReceiptData } from '@/components/receipt-modal';
import {
  Search,
  Coffee,
  CupSoda,
  Sparkles,
  Cookie,
  Utensils,
  Plus,
  Minus,
  Pencil,
  Trash2,
  Banknote,
  CreditCard,
  QrCode,
  Flame,
  Snowflake,
  LayoutGrid,
  Printer,
  X,
  Clock,
  ArrowRight,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  mood: 'Hot' | 'Ice';
  size: 'S' | 'M' | 'L';
  sugar: '30%' | '50%' | '70%' | 'Normal';
  ice: '30%' | '50%' | '70%' | 'Normal';
  notes: string;
}

const ITEMS_PER_PAGE = 8;

export default function POSClient({
  initialProducts,
  categories,
  discounts,
  allOutlets = [],
  currentOutlet,
  shiftId,
  kasirName = 'Kasir Seruni',
}: {
  initialProducts: Product[];
  categories: Category[];
  discounts: Discount[];
  allOutlets?: Outlet[];
  currentOutlet: Outlet;
  shiftId?: string;
  kasirName?: string;
}) {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [selectedDiscountId, setSelectedDiscountId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'transfer' | 'debit'>('cash');
  const [customerName, setCustomerName] = useState<string>('');

  // Cash calculation state
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [paymentRefNumber, setPaymentRefNumber] = useState<string>('');

  // Per-card active selection options state map
  const [cardOptions, setCardOptions] = useState<
    Record<
      string,
      {
        mood: 'Hot' | 'Ice';
        size: 'S' | 'M' | 'L';
        sugar: '30%' | '50%' | '70%' | 'Normal';
        ice: '30%' | '50%' | '70%' | 'Normal';
      }
    >
  >({});

  // Note edit modal state
  const [editingNoteItem, setEditingNoteItem] = useState<{ id: string; name: string; notes: string } | null>(null);

  // Modals & Receipt state
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [completedReceipt, setCompletedReceipt] = useState<ReceiptData | null>(null);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Category Icon helper
  const getCategoryIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('coffee') || lower.includes('kopi')) return Coffee;
    if (lower.includes('tea') || lower.includes('milk') || lower.includes('susu')) return CupSoda;
    if (lower.includes('yakult') || lower.includes('mocktail')) return Sparkles;
    if (lower.includes('snack') || lower.includes('bite') || lower.includes('roti')) return Cookie;
    if (lower.includes('food') || lower.includes('nasi') || lower.includes('makan')) return Utensils;
    return Coffee;
  };

  // Filter products
  const filteredProducts = initialProducts.filter((p) => {
    const matchCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const matchSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchSearch;
  });

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));
  const validPage = Math.min(page, totalPages);
  const paginatedProducts = filteredProducts.slice(
    (validPage - 1) * ITEMS_PER_PAGE,
    validPage * ITEMS_PER_PAGE
  );

  const handleCategoryChange = (catId: string) => {
    setSelectedCategory(catId);
    setPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setPage(1);
  };

  // Get option for product
  const getOptions = (prodId: string) => {
    return (
      cardOptions[prodId] || {
        mood: 'Ice',
        size: 'M',
        sugar: 'Normal',
        ice: 'Normal',
      }
    );
  };

  // Update option for product
  const setOption = (
    prodId: string,
    key: 'mood' | 'size' | 'sugar' | 'ice',
    value: string
  ) => {
    setCardOptions((prev) => ({
      ...prev,
      [prodId]: {
        ...getOptions(prodId),
        [key]: value,
      },
    }));
  };

  // Add to cart with chosen options
  const addToCartWithOptions = (product: Product) => {
    const opt = getOptions(product.id);
    const cartKey = `${product.id}_${opt.mood}_${opt.size}_${opt.sugar}_${opt.ice}`;

    setCart((prev) => {
      const existing = prev.find((item) => item.id === cartKey);
      if (existing) {
        return prev.map((item) =>
          item.id === cartKey ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          id: cartKey,
          product,
          quantity: 1,
          mood: opt.mood,
          size: opt.size,
          sugar: opt.sugar,
          ice: opt.ice,
          notes: '',
        },
      ];
    });
  };

  // Update quantity in cart
  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // Remove from cart
  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  // Clear cart
  const clearCart = () => {
    setCart([]);
    setSelectedDiscountId('');
    setPaymentRefNumber('');
    setCashReceived(0);
    setCustomerName('');
  };

  // Update notes
  const updateItemNotes = (id: string, notes: string) => {
    setCart((prev) =>
      prev.map((item) => (item.id === id ? { ...item, notes } : item))
    );
    setEditingNoteItem(null);
  };

  // Calculations
  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const selectedDiscount = discounts.find((d) => d.id === selectedDiscountId);
  const discountAmount = selectedDiscount
    ? calcDiscount(
        subtotal,
        selectedDiscount.type as 'percentage' | 'fixed',
        selectedDiscount.value
      )
    : 0;

  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const taxRate = 11;
  const taxAmount = calcTax(afterDiscount, taxRate);
  const total = calcTotal(subtotal, discountAmount, taxAmount);

  const changeAmount = Math.max(0, cashReceived - total);

  // Open Checkout Modal
  const handleOpenCheckoutModal = () => {
    if (cart.length === 0) return;
    setCashReceived(total);
    setErrorMessage(null);
    setIsCheckoutModalOpen(true);
  };

  // Process checkout
  const handleProcessCheckout = () => {
    setErrorMessage(null);
    const snapshotItems = cart.map((item) => ({
      productId: item.product.id,
      productName: item.product.name,
      mood: item.mood,
      size: item.size,
      sugar: item.sugar,
      ice: item.ice,
      quantity: item.quantity,
      unitPrice: item.product.price,
      productPrice: item.product.price,
      costPrice: item.product.costPrice || 0,
      subtotal: item.product.price * item.quantity,
      notes: item.notes || undefined,
    }));

    startTransition(async () => {
      try {
        const payload = {
          outletId: currentOutlet.id,
          shiftId,
          customerName: customerName.trim() || 'Pelanggan Walk-in',
          items: snapshotItems,
          discountId: selectedDiscount?.id,
          discountType: selectedDiscount?.type as 'percentage' | 'fixed' | undefined,
          discountValue: selectedDiscount?.value,
          taxRate,
          paymentMethod,
          notes: paymentRefNumber ? `Ref: ${paymentRefNumber}` : undefined,
        };

        const res = await checkout(payload);
        if (res.success) {
          const receipt: ReceiptData = {
            orderId: res.orderId,
            outletName: currentOutlet.name,
            outletAddress: currentOutlet.address,
            outletPhone: currentOutlet.phone,
            kasirName,
            customerName: customerName.trim() || 'Walk-in',
            createdAt: Math.floor(Date.now() / 1000),
            items: snapshotItems,
            subtotal,
            discountAmount,
            taxRate,
            taxAmount,
            total,
            paymentMethod,
            cashReceived: paymentMethod === 'cash' ? cashReceived : total,
            change: paymentMethod === 'cash' ? changeAmount : 0,
            notes: paymentRefNumber ? `Ref: ${paymentRefNumber}` : null,
          };

          setCompletedReceipt(receipt);
          setIsCheckoutModalOpen(false);
          clearCart();
        }
      } catch (err: any) {
        setErrorMessage(err?.message || 'Gagal memproses transaksi. Cek kembali koneksi DB.');
      }
    });
  };

  return (
    <div className="h-full lg:h-[calc(100vh-6.25rem)] min-h-[580px] flex flex-col xl:flex-row gap-4 overflow-hidden">
      {/* ============================================================ */}
      {/* LEFT COLUMN: COMPACT CATALOG WITH PAGINATION (65%) */}
      {/* ============================================================ */}
      <div className="flex-1 flex flex-col justify-between overflow-hidden bg-white rounded-3xl border border-[#EBE7DF] p-4 lg:p-5 shadow-xs">
        {/* Top Control Bar: Categories & Search */}
        <div className="space-y-3 shrink-0 pb-3 border-b border-[#F0ECE4]">
          {/* Header Row */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#201C1A] tracking-tight">Katalog Menu</h2>
              <span className="text-[11px] font-medium text-[#8E867C]">
                ({filteredProducts.length} Menu)
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <div className="px-2.5 py-1 rounded-full bg-[#FAF8F5] border border-[#ECE7DE] flex items-center gap-1.5">
                <span className="text-[#8E867C] text-[10px]">Kasir:</span>
                <span className="font-bold text-[#201C1A] text-[11px]">{kasirName}</span>
              </div>

              <div
                className={`px-2.5 py-1 rounded-full border flex items-center gap-1.5 font-bold text-[10px] ${
                  shiftId
                    ? 'bg-[#EBF6EE] text-[#2D7A47] border-[#D1EBD8]'
                    : 'bg-[#FDF4E5] text-[#96631E] border-[#F5E2BE]'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>{shiftId ? 'Shift Aktif' : 'Shift Belum Dibuka'}</span>
              </div>
            </div>
          </div>

          {/* Search Bar + Category Chips */}
          <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center">
            {/* Search Input */}
            <div className="relative md:w-56 lg:w-64 shrink-0">
              <Search className="w-3.5 h-3.5 text-[#9E968B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Cari menu..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#FAF8F5] border border-[#EAE5DC] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
              />
            </div>

            {/* Horizontal Categories */}
            <div className="flex-1 flex gap-1.5 overflow-x-auto custom-scrollbar pb-0.5">
              <button
                type="button"
                onClick={() => handleCategoryChange('all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-[#2E2520] text-white border-[#2E2520] shadow-xs'
                    : 'bg-[#FAF8F5] text-[#4A4238] border-[#ECE7DE] hover:bg-[#F2ECE3]'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Semua</span>
              </button>

              {categories.map((c) => {
                const IconComponent = getCategoryIcon(c.name);
                const isSelected = selectedCategory === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleCategoryChange(c.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-[#2E2520] text-white border-[#2E2520] shadow-xs'
                        : 'bg-[#FAF8F5] text-[#4A4238] border-[#ECE7DE] hover:bg-[#F2ECE3]'
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                    <span>{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center Grid: Compact Products */}
        <div className="flex-1 overflow-y-auto custom-scrollbar py-3 pr-0.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {paginatedProducts.map((p) => {
              const opt = getOptions(p.id);

              return (
                <div
                  key={p.id}
                  className="bg-[#FAF8F5] rounded-2xl border border-[#EBE7DF] p-3 flex flex-col justify-between shadow-2xs hover:border-[#D5CEC2] hover:bg-[#F8F5EE] transition-all space-y-2.5"
                >
                  {/* Top: Category & Price */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white text-[#54382B] border border-[#ECE7DE] truncate max-w-[100px]">
                        {categories.find((c) => c.id === p.categoryId)?.name || 'Menu'}
                      </span>
                      <span className="font-serif font-black text-xs text-[#201C1A]">
                        {formatRupiah(p.price)}
                      </span>
                    </div>

                    <h3 className="font-bold text-xs text-[#201C1A] line-clamp-1" title={p.name}>
                      {p.name}
                    </h3>
                  </div>

                  {/* Options: Mood, Size, Sugar, Ice */}
                  <div className="space-y-1.5 pt-1.5 border-t border-[#ECE7DE]">
                    {/* Mood & Size */}
                    <div className="grid grid-cols-2 gap-1.5">
                      {/* Mood: Hot vs Ice */}
                      <div className="bg-white p-0.5 rounded-lg border border-[#EAE5DC] flex gap-0.5">
                        <button
                          type="button"
                          onClick={() => setOption(p.id, 'mood', 'Ice')}
                          className={`flex-1 py-0.5 text-[9px] font-bold rounded-md flex items-center justify-center gap-0.5 transition-all cursor-pointer ${
                            opt.mood === 'Ice'
                              ? 'bg-[#2E2520] text-white shadow-2xs'
                              : 'text-[#8E867C] hover:text-[#201C1A]'
                          }`}
                        >
                          <Snowflake className="w-2.5 h-2.5" />
                          <span>Ice</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setOption(p.id, 'mood', 'Hot')}
                          className={`flex-1 py-0.5 text-[9px] font-bold rounded-md flex items-center justify-center gap-0.5 transition-all cursor-pointer ${
                            opt.mood === 'Hot'
                              ? 'bg-[#964B3B] text-white shadow-2xs'
                              : 'text-[#8E867C] hover:text-[#201C1A]'
                          }`}
                        >
                          <Flame className="w-2.5 h-2.5" />
                          <span>Hot</span>
                        </button>
                      </div>

                      {/* Size: S / M / L */}
                      <div className="bg-white p-0.5 rounded-lg border border-[#EAE5DC] flex gap-0.5">
                        {(['S', 'M', 'L'] as const).map((sz) => (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => setOption(p.id, 'size', sz)}
                            className={`flex-1 py-0.5 text-[9px] font-bold rounded-md transition-all cursor-pointer ${
                              opt.size === sz
                                ? 'bg-[#2E2520] text-white shadow-2xs'
                                : 'text-[#8E867C] hover:text-[#201C1A]'
                            }`}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sugar & Ice Level */}
                    <div className="grid grid-cols-2 gap-1.5 text-[9px]">
                      <div>
                        <select
                          value={opt.sugar}
                          onChange={(e) => setOption(p.id, 'sugar', e.target.value)}
                          className="w-full px-1.5 py-0.5 bg-white border border-[#EAE5DC] rounded-lg text-[9px] font-semibold text-[#4A4238] focus:outline-none cursor-pointer"
                        >
                          <option value="30%">Gula 30%</option>
                          <option value="50%">Gula 50%</option>
                          <option value="70%">Gula 70%</option>
                          <option value="Normal">Gula Normal</option>
                        </select>
                      </div>

                      <div>
                        <select
                          value={opt.ice}
                          onChange={(e) => setOption(p.id, 'ice', e.target.value)}
                          className="w-full px-1.5 py-0.5 bg-white border border-[#EAE5DC] rounded-lg text-[9px] font-semibold text-[#4A4238] focus:outline-none cursor-pointer"
                        >
                          <option value="30%">Es 30%</option>
                          <option value="50%">Es 50%</option>
                          <option value="70%">Es 70%</option>
                          <option value="Normal">Es Normal</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Add to Bill Button */}
                  <button
                    type="button"
                    onClick={() => addToCartWithOptions(p)}
                    className="w-full py-1.5 px-3 bg-[#2E2520] hover:bg-[#453932] text-white font-bold rounded-xl text-[11px] transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Tambah</span>
                  </button>
                </div>
              );
            })}

            {paginatedProducts.length === 0 && (
              <div className="col-span-full py-12 text-center p-6 text-[#9E968B]">
                <Coffee className="w-8 h-8 text-[#C2BAAF] mx-auto mb-2 stroke-[1.5]" />
                <p className="font-bold text-xs text-[#201C1A]">Menu tidak ditemukan</p>
                <p className="text-[11px] text-[#8E867C] mt-0.5">
                  Coba kata kunci lain atau pilih kategori Semua
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Pagination Footer */}
        <div className="pt-3 border-t border-[#F0ECE4] flex items-center justify-between shrink-0 text-xs">
          <span className="text-[11px] text-[#8E867C]">
            Halaman <strong className="text-[#201C1A]">{validPage}</strong> dari {totalPages} ({filteredProducts.length} Menu)
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={validPage <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="px-2.5 py-1 rounded-xl bg-[#FAF8F5] border border-[#ECE7DE] text-[#4A4238] hover:bg-[#F2ECE3] disabled:opacity-40 disabled:pointer-events-none text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Sebelumnya</span>
            </button>

            <div className="hidden sm:flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .slice(Math.max(0, validPage - 3), validPage + 2)
                .map((pNum) => (
                  <button
                    key={pNum}
                    type="button"
                    onClick={() => setPage(pNum)}
                    className={`w-7 h-7 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      validPage === pNum
                        ? 'bg-[#2E2520] text-white shadow-xs'
                        : 'bg-[#FAF8F5] text-[#4A4238] border border-[#ECE7DE] hover:bg-[#F2ECE3]'
                    }`}
                  >
                    {pNum}
                  </button>
                ))}
            </div>

            <button
              type="button"
              disabled={validPage >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              className="px-2.5 py-1 rounded-xl bg-[#FAF8F5] border border-[#ECE7DE] text-[#4A4238] hover:bg-[#F2ECE3] disabled:opacity-40 disabled:pointer-events-none text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>Berikutnya</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* RIGHT COLUMN: BILLS / CART PANEL (35%) */}
      {/* ============================================================ */}
      <div className="w-full xl:w-[360px] 2xl:w-[380px] shrink-0 h-full flex flex-col justify-between bg-white rounded-3xl border border-[#EBE7DF] p-4 lg:p-5 shadow-xs overflow-hidden">
        {/* Header Bills */}
        <div className="flex items-center justify-between border-b border-[#F0ECE4] pb-2.5 shrink-0">
          <div>
            <h3 className="font-serif font-black text-base text-[#201C1A] tracking-tight">
              Tagihan (Bills)
            </h3>
            <p className="text-[11px] text-[#8E867C]">{cart.length} Item Pesanan</p>
          </div>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="text-xs font-bold text-[#964B3B] hover:text-[#803E30] transition-colors cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>

        {/* Scrollable Cart Items List */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0 py-2.5 pr-0.5 custom-scrollbar">
          {cart.map((item) => (
            <div
              key={item.id}
              className="p-2.5 rounded-2xl bg-[#FAF8F5] border border-[#ECE7DE] space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-xs text-[#201C1A] truncate">{item.product.name}</h4>
                  <p className="text-[9px] text-[#7A7268]">
                    {item.mood} • Sz {item.size} • Gl {item.sugar} • Es {item.ice}
                  </p>
                  {item.notes && (
                    <p className="text-[9px] text-[#54382B] italic mt-0.5 bg-[#F2EDE5] px-1.5 py-0.5 rounded inline-block">
                      Note: {item.notes}
                    </p>
                  )}
                </div>
                <span className="font-bold text-xs text-[#201C1A] whitespace-nowrap">
                  {formatRupiah(item.product.price * item.quantity)}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1.5 border-t border-[#F0ECE4]">
                <button
                  type="button"
                  onClick={() =>
                    setEditingNoteItem({
                      id: item.id,
                      name: item.product.name,
                      notes: item.notes,
                    })
                  }
                  className="text-[9px] font-semibold text-[#8E867C] hover:text-[#201C1A] flex items-center gap-1 cursor-pointer"
                >
                  <Pencil className="w-2.5 h-2.5" />
                  <span>{item.notes ? 'Edit Catatan' : '+ Catatan'}</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, -1)}
                    className="w-5 h-5 rounded-md bg-white border border-[#E5E0D6] flex items-center justify-center text-[#201C1A] hover:bg-[#F2ECE3] cursor-pointer"
                  >
                    <Minus className="w-2.5 h-2.5" />
                  </button>
                  <span className="text-xs font-bold text-[#201C1A] w-4 text-center">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, 1)}
                    className="w-5 h-5 rounded-md bg-white border border-[#E5E0D6] flex items-center justify-center text-[#201C1A] hover:bg-[#F2ECE3] cursor-pointer"
                  >
                    <Plus className="w-2.5 h-2.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.id)}
                    className="w-5 h-5 rounded-md text-[#9E968B] hover:text-[#964B3B] flex items-center justify-center ml-0.5 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {cart.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 text-[#9E968B]">
              <Coffee className="w-8 h-8 stroke-[1.2] mb-1.5 text-[#D5CEC2]" />
              <p className="text-xs font-bold text-[#4A4238]">Keranjang Kosong</p>
              <p className="text-[10px] text-[#9E968B] mt-0.5">
                Pilih menu di sebelah kiri untuk menambah pesanan
              </p>
            </div>
          )}
        </div>

        {/* Bottom Panel: Voucher, Financials, Payment & Checkout Button */}
        <div className="shrink-0 space-y-2.5 pt-2 border-t border-[#F0ECE4]">
          {/* Discount / Voucher Selector */}
          {discounts.length > 0 && (
            <div>
              <select
                value={selectedDiscountId}
                onChange={(e) => setSelectedDiscountId(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#FAF8F5] border border-[#EAE5DC] rounded-xl text-[11px] font-semibold text-[#201C1A] focus:outline-none cursor-pointer"
              >
                <option value="">-- Diskon / Voucher Promo --</option>
                {discounts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.type === 'percentage' ? `${d.value}%` : formatRupiah(d.value)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Calculations Breakdown */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-[#7A7268] text-[11px]">
              <span>Subtotal</span>
              <span className="font-semibold text-[#201C1A]">{formatRupiah(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-[#2D7A47] font-semibold text-[11px]">
                <span>Diskon</span>
                <span>-{formatRupiah(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#7A7268] text-[11px]">
              <span>PPN (11%)</span>
              <span>+{formatRupiah(taxAmount)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-[#F0ECE4] text-sm font-black text-[#201C1A]">
              <span>Total</span>
              <span>{formatRupiah(total)}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => setPaymentMethod('cash')}
              className={`py-1.5 px-1 rounded-xl text-[10px] font-bold border flex items-center justify-center gap-1 transition-all cursor-pointer ${
                paymentMethod === 'cash'
                  ? 'bg-[#2E2520] text-white border-[#2E2520] shadow-2xs'
                  : 'bg-[#FAF8F5] text-[#4A4238] border-[#ECE7DE] hover:bg-[#F2ECE3]'
              }`}
            >
              <Banknote className="w-3 h-3" />
              <span>Tunai</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('qris')}
              className={`py-1.5 px-1 rounded-xl text-[10px] font-bold border flex items-center justify-center gap-1 transition-all cursor-pointer ${
                paymentMethod === 'qris'
                  ? 'bg-[#2E2520] text-white border-[#2E2520] shadow-2xs'
                  : 'bg-[#FAF8F5] text-[#4A4238] border-[#ECE7DE] hover:bg-[#F2ECE3]'
              }`}
            >
              <QrCode className="w-3 h-3" />
              <span>QRIS</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('debit')}
              className={`py-1.5 px-1 rounded-xl text-[10px] font-bold border flex items-center justify-center gap-1 transition-all cursor-pointer ${
                paymentMethod === 'debit'
                  ? 'bg-[#2E2520] text-white border-[#2E2520] shadow-2xs'
                  : 'bg-[#FAF8F5] text-[#4A4238] border-[#ECE7DE] hover:bg-[#F2ECE3]'
              }`}
            >
              <CreditCard className="w-3 h-3" />
              <span>Debit</span>
            </button>
          </div>

          {/* Action Checkout Button */}
          <button
            type="button"
            disabled={cart.length === 0}
            onClick={handleOpenCheckoutModal}
            className="w-full py-3 bg-[#2E2520] hover:bg-[#453932] disabled:opacity-40 text-white font-bold rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 text-xs tracking-wide cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Proses Bayar ({formatRupiah(total)})</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL: EDIT NOTE ITEM */}
      {/* ============================================================ */}
      {editingNoteItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-[#EBE7DF] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0ECE4] pb-2">
              <h4 className="font-bold text-sm text-[#201C1A]">Catatan Menu</h4>
              <button
                onClick={() => setEditingNoteItem(null)}
                className="text-[#9E968B] hover:text-[#201C1A] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <p className="text-xs font-semibold text-[#54382B] mb-2">{editingNoteItem.name}</p>
              <textarea
                autoFocus
                rows={3}
                defaultValue={editingNoteItem.notes}
                id="modalNoteInput"
                placeholder="Contoh: Less ice, jangan terlalu manis, extra shot espresso..."
                className="w-full p-3 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setEditingNoteItem(null)}
                className="flex-1 py-2 px-3 bg-[#F4EFE7] hover:bg-[#EBE4D8] text-[#4A4238] font-bold rounded-xl text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  const input = document.getElementById('modalNoteInput') as HTMLTextAreaElement;
                  updateItemNotes(editingNoteItem.id, input?.value || '');
                }}
                className="flex-1 py-2 px-3 bg-[#2E2520] hover:bg-[#453932] text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: PROSES PEMBAYARAN / CHECKOUT */}
      {/* ============================================================ */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-[#EBE7DF] p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-[#F0ECE4] pb-3">
              <div>
                <h3 className="font-bold text-base text-[#201C1A]">Proses Pembayaran Kasir</h3>
                <p className="text-xs text-[#8E867C]">{currentOutlet.name}</p>
              </div>
              <button
                onClick={() => setIsCheckoutModalOpen(false)}
                className="text-[#9E968B] hover:text-[#201C1A] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 text-xs text-red-700 bg-red-50 rounded-2xl border border-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Total Display */}
            <div className="bg-[#FAF8F5] border border-[#ECE7DE] p-3.5 rounded-2xl text-center">
              <span className="text-[10px] text-[#8E867C] font-semibold uppercase tracking-wider">
                Total Tagihan
              </span>
              <p className="text-2xl font-black text-[#201C1A] mt-0.5">{formatRupiah(total)}</p>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Customer Name */}
              <div>
                <label className="block font-bold text-[#4A4238] mb-1">
                  Nama Pelanggan / Nomor Meja
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Contoh: Meja 04 / Kak Fahmi"
                  className="w-full px-3.5 py-2 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
                />
              </div>

              {/* PAYMENT METHOD SPECIFIC CONTROLS */}
              {paymentMethod === 'cash' && (
                <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EBE7DF] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-[#201C1A]">Uang Diterima (Rp)</label>
                    <span className="text-[10px] text-[#8E867C]">Wajib &ge; Total</span>
                  </div>

                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={cashReceived || ''}
                    onChange={(e) => setCashReceived(Number(e.target.value))}
                    placeholder="Contoh: 100000"
                    className="w-full px-3 py-2 bg-white border border-[#E5E0D6] rounded-xl text-base font-black focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
                  />

                  {/* Quick Cash Chips */}
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => setCashReceived(total)}
                      className="px-2 py-1 bg-white hover:bg-[#F2EDE5] text-[#201C1A] font-bold rounded-lg border border-[#E0D8CC] text-[10px] cursor-pointer"
                    >
                      Uang Pas
                    </button>
                    <button
                      type="button"
                      onClick={() => setCashReceived((prev) => prev + 10000)}
                      className="px-2 py-1 bg-white hover:bg-[#F2EDE5] text-[#201C1A] font-bold rounded-lg border border-[#E0D8CC] text-[10px] cursor-pointer"
                    >
                      +10rb
                    </button>
                    {[20000, 50000, 100000, 200000].map((nominal) => (
                      <button
                        key={nominal}
                        type="button"
                        onClick={() => setCashReceived(nominal)}
                        className="px-2 py-1 bg-white hover:bg-[#F2EDE5] text-[#201C1A] font-bold rounded-lg border border-[#E0D8CC] text-[10px] cursor-pointer"
                      >
                        {formatRupiah(nominal)}
                      </button>
                    ))}
                  </div>

                  {/* Kembalian Feedback */}
                  <div className="pt-2 border-t border-[#ECE7DE] flex items-center justify-between text-xs font-bold">
                    <span>Kembalian:</span>
                    {cashReceived >= total ? (
                      <span className="text-sm text-[#2D7A47] font-black">
                        {formatRupiah(changeAmount)}
                      </span>
                    ) : (
                      <span className="text-xs text-[#964B3B]">
                        Kurang {formatRupiah(total - cashReceived)}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {paymentMethod === 'qris' && (
                <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EBE7DF] text-center space-y-2">
                  <div className="p-3 bg-white rounded-2xl border border-[#E5E0D6] max-w-[180px] mx-auto shadow-2xs">
                    <span className="font-black text-[10px] text-[#964B3B] tracking-wider block">QRIS TOKO SERUNI</span>
                    <div className="w-28 h-28 mx-auto bg-[#201C1A] p-2 rounded-xl flex items-center justify-center text-white mt-1">
                      <QrCode className="w-24 h-24 text-white" />
                    </div>
                    <p className="text-xs font-black text-[#201C1A] mt-1.5">
                      {formatRupiah(total)}
                    </p>
                  </div>
                  <p className="text-[10px] text-[#7A7268]">
                    Scan QRIS dengan BCA, Mandiri, GoPay, OVO, atau ShopeePay
                  </p>
                </div>
              )}

              {(paymentMethod === 'debit' || paymentMethod === 'transfer') && (
                <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EBE7DF] space-y-1.5">
                  <label className="font-bold text-[#4A4238]">Approval Code / No. Referensi</label>
                  <input
                    type="text"
                    value={paymentRefNumber}
                    onChange={(e) => setPaymentRefNumber(e.target.value)}
                    placeholder="Contoh: BCA-839201"
                    className="w-full px-3 py-2 bg-white border border-[#E5E0D6] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
                  />
                </div>
              )}
            </div>

            {/* Modal Bottom Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCheckoutModalOpen(false)}
                className="flex-1 py-3 px-4 bg-[#F2ECE3] hover:bg-[#E8E0D4] text-[#4A4238] font-bold rounded-2xl text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isPending || (paymentMethod === 'cash' && cashReceived < total)}
                onClick={handleProcessCheckout}
                className="flex-1 py-3 px-4 bg-[#2E2520] hover:bg-[#453932] disabled:opacity-50 text-white font-bold rounded-2xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{isPending ? 'Menyimpan...' : 'Konfirmasi & Struk'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CETAK STRUK THERMAL & SELESAI */}
      {/* ============================================================ */}
      {completedReceipt && (
        <ReceiptModal
          receipt={completedReceipt}
          onClose={() => setCompletedReceipt(null)}
          onNewTransaction={() => {
            setCompletedReceipt(null);
            clearCart();
          }}
        />
      )}
    </div>
  );
}
