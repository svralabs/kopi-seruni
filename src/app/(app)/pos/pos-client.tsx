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
  CheckCircle2,
  Banknote,
  CreditCard,
  QrCode,
  Flame,
  Snowflake,
  LayoutGrid,
  Printer,
  X,
  Store,
  Clock,
  Building2,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

interface CartItem {
  id: string; // unique item cart key (includes options)
  product: Product;
  quantity: number;
  mood: 'Hot' | 'Ice';
  size: 'S' | 'M' | 'L';
  sugar: '30%' | '50%' | '70%' | 'Normal';
  ice: '30%' | '50%' | '70%' | 'Normal';
  notes: string;
}

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
  const [selectedDiscountId, setSelectedDiscountId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'transfer' | 'debit'>('cash');
  const [customerName, setCustomerName] = useState<string>('');

  // Cash calculation state
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [paymentRefNumber, setPaymentRefNumber] = useState<string>('');

  // Per-card active selection options state map
  const [cardOptions, setCardOptions] = useState<
    Record<string, { mood: 'Hot' | 'Ice'; size: 'S' | 'M' | 'L'; sugar: '30%' | '50%' | '70%' | 'Normal'; ice: '30%' | '50%' | '70%' | 'Normal' }>
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

  const updateQuantity = (cartKey: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === cartKey) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const updateItemNotes = (cartKey: string, notes: string) => {
    setCart((prev) =>
      prev.map((item) => (item.id === cartKey ? { ...item, notes } : item))
    );
    setEditingNoteItem(null);
  };

  const removeFromCart = (cartKey: string) => {
    setCart((prev) => prev.filter((item) => item.id !== cartKey));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedDiscountId('');
    setCustomerName('');
    setPaymentMethod('cash');
    setCashReceived(0);
    setPaymentRefNumber('');
  };

  // Calculations (Integer Domain)
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const selectedDiscount = discounts.find((d) => d.id === selectedDiscountId);
  const discountAmount = selectedDiscount
    ? calcDiscount(subtotal, selectedDiscount.type as 'percentage' | 'fixed', selectedDiscount.value)
    : 0;

  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const taxRate = 11; // 11% PPN
  const taxAmount = calcTax(afterDiscount, taxRate);
  const total = calcTotal(subtotal, discountAmount, taxAmount);

  // Kembalian calculation
  const changeAmount = Math.max(0, cashReceived - total);
  const isCashInsufficient = paymentMethod === 'cash' && cashReceived > 0 && cashReceived < total;
  const isCashZero = paymentMethod === 'cash' && cashReceived === 0;

  // Open Checkout Modal
  const handleOpenCheckoutModal = () => {
    if (cart.length === 0) return;
    setCashReceived(total); // Default uang pas
    setErrorMessage(null);
    setIsCheckoutModalOpen(true);
  };

  // Handle Checkout submission
  const handleProcessCheckout = () => {
    if (cart.length === 0) return;
    if (paymentMethod === 'cash' && cashReceived < total) {
      setErrorMessage(`Uang tunai kurang ${formatRupiah(total - cashReceived)}. Harap masukkan nominal yang mencukupi.`);
      return;
    }

    setErrorMessage(null);

    const snapshotItems = cart.map((item) => {
      const customDesc = `${item.mood}, Size ${item.size}, Gula ${item.sugar}, Es ${item.ice}${
        item.notes ? ` (${item.notes})` : ''
      }`;
      return {
        productId: item.product.id,
        productName: item.product.name,
        productPrice: item.product.price,
        costPrice: item.product.costPrice || 0,
        quantity: item.quantity,
        subtotal: item.product.price * item.quantity,
        notes: customDesc,
      };
    });

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
          // Construct thermal receipt data
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
    <div className="space-y-4">
      {/* ============================================================ */}
      {/* TOP BAR: OUTLET SWITCHER & STATUS SHIFT */}
      {/* ============================================================ */}
      <div className="bg-white rounded-3xl border border-[#EBE7DF] p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FAF8F5] border border-[#EBE7DF] flex items-center justify-center text-[#54382B]">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#8E867C] block">
              Cabang Kasir Aktif
            </span>
            <p className="font-serif font-black text-sm text-[#201C1A]">
              {currentOutlet.name}
            </p>
          </div>
        </div>


        <div className="flex items-center gap-3 text-xs">
          <div className="px-3.5 py-1.5 rounded-full bg-[#FAF8F5] border border-[#ECE7DE] flex items-center gap-2">
            <span className="text-[#8E867C]">Kasir:</span>
            <span className="font-bold text-[#201C1A]">{kasirName}</span>
          </div>

          <div
            className={`px-3.5 py-1.5 rounded-full border flex items-center gap-2 font-bold text-[11px] ${
              shiftId
                ? 'bg-[#EBF6EE] text-[#2D7A47] border-[#D1EBD8]'
                : 'bg-[#FDF4E5] text-[#96631E] border-[#F5E2BE]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{shiftId ? 'Shift Aktif' : 'Shift Belum Dibuka'}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        {/* ============================================================ */}
        {/* LEFT COLUMN: BENTO MENU CATALOG (65%) */}
        {/* ============================================================ */}
        <div className="flex-1 flex flex-col min-w-0 space-y-6">
          {/* Bento Category Block */}
          <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[#201C1A] tracking-tight">
                Pilih Kategori
              </h2>
              <span className="text-xs font-medium text-[#9B9389]">
                {categories.length + 1} Kategori Tersedia
              </span>
            </div>

            {/* Horizontal Categories */}
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 ${
                  selectedCategory === 'all'
                    ? 'bg-[#2E2520] text-white border-[#2E2520] shadow-sm'
                    : 'bg-[#FAF8F5] text-[#4A4238] border-[#ECE7DE] hover:bg-[#F2ECE3]'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span>Semua Menu</span>
              </button>

              {categories.map((c) => {
                const IconComponent = getCategoryIcon(c.name);
                const isSelected = selectedCategory === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCategory(c.id)}
                    className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 ${
                      isSelected
                        ? 'bg-[#2E2520] text-white border-[#2E2520] shadow-sm'
                        : 'bg-[#FAF8F5] text-[#4A4238] border-[#ECE7DE] hover:bg-[#F2ECE3]'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bento Search & Filter Bar */}
          <div className="bg-white rounded-3xl border border-[#EBE7DF] p-4 shadow-xs flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#9E968B] absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama kopi, teh, makanan, atau cemilan..."
                className="w-full pl-11 pr-4 py-2.5 bg-[#FAF8F5] border border-[#EAE5DC] rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
              />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs font-semibold text-[#8E867C] hover:text-[#201C1A] px-2 py-1"
              >
                Clear
              </button>
            )}
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProducts.map((p) => {
              const opt = getOptions(p.id);

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-3xl border border-[#EBE7DF] p-5 flex flex-col justify-between shadow-xs hover:border-[#D5CEC2] transition-all space-y-4"
                >
                  {/* Top: Image Placeholder / Category Badge & Title */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#FAF8F5] text-[#54382B] border border-[#ECE7DE]">
                        {categories.find((c) => c.id === p.categoryId)?.name || 'Menu'}
                      </span>
                      <span className="font-serif font-black text-sm text-[#201C1A]">
                        {formatRupiah(p.price)}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-[#201C1A] line-clamp-1">{p.name}</h3>
                    {p.description && (
                      <p className="text-[11px] text-[#8E867C] mt-1 line-clamp-2 leading-relaxed">
                        {p.description}
                      </p>
                    )}
                  </div>

                  {/* Options: Mood, Size, Sugar, Ice */}
                  <div className="space-y-2.5 pt-2 border-t border-[#F2ECE3]">
                    {/* Mood & Size */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Mood: Hot vs Ice */}
                      <div className="bg-[#FAF8F5] p-1 rounded-xl border border-[#EAE5DC] flex gap-1">
                        <button
                          type="button"
                          onClick={() => setOption(p.id, 'mood', 'Ice')}
                          className={`flex-1 py-1 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${
                            opt.mood === 'Ice'
                              ? 'bg-white text-[#201C1A] shadow-xs'
                              : 'text-[#8E867C] hover:text-[#201C1A]'
                          }`}
                        >
                          <Snowflake className="w-3 h-3 text-[#1D638B]" />
                          <span>Ice</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setOption(p.id, 'mood', 'Hot')}
                          className={`flex-1 py-1 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${
                            opt.mood === 'Hot'
                              ? 'bg-white text-[#201C1A] shadow-xs'
                              : 'text-[#8E867C] hover:text-[#201C1A]'
                          }`}
                        >
                          <Flame className="w-3 h-3 text-[#964B3B]" />
                          <span>Hot</span>
                        </button>
                      </div>

                      {/* Size: S / M / L */}
                      <div className="bg-[#FAF8F5] p-1 rounded-xl border border-[#EAE5DC] flex gap-1">
                        {(['S', 'M', 'L'] as const).map((sz) => (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => setOption(p.id, 'size', sz)}
                            className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-all ${
                              opt.size === sz
                                ? 'bg-white text-[#201C1A] shadow-xs'
                                : 'text-[#8E867C] hover:text-[#201C1A]'
                            }`}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sugar & Ice Level */}
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <span className="text-[9px] text-[#9E968B] block mb-0.5 font-bold uppercase">Gula</span>
                        <select
                          value={opt.sugar}
                          onChange={(e) => setOption(p.id, 'sugar', e.target.value)}
                          className="w-full px-2 py-1 bg-[#FAF8F5] border border-[#EAE5DC] rounded-xl text-[10px] font-semibold text-[#4A4238] focus:outline-none"
                        >
                          <option value="30%">Less 30%</option>
                          <option value="50%">Half 50%</option>
                          <option value="70%">70%</option>
                          <option value="Normal">Normal</option>
                        </select>
                      </div>

                      <div>
                        <span className="text-[9px] text-[#9E968B] block mb-0.5 font-bold uppercase">Es</span>
                        <select
                          value={opt.ice}
                          onChange={(e) => setOption(p.id, 'ice', e.target.value)}
                          className="w-full px-2 py-1 bg-[#FAF8F5] border border-[#EAE5DC] rounded-xl text-[10px] font-semibold text-[#4A4238] focus:outline-none"
                        >
                          <option value="30%">Less 30%</option>
                          <option value="50%">Half 50%</option>
                          <option value="70%">70%</option>
                          <option value="Normal">Normal</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Add to Bill Button */}
                  <button
                    type="button"
                    onClick={() => addToCartWithOptions(p)}
                    className="w-full py-2.5 px-4 bg-[#2E2520] hover:bg-[#453932] text-white font-bold rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-xs hover:shadow"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah ke Pesanan</span>
                  </button>
                </div>
              );
            })}

            {filteredProducts.length === 0 && (
              <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-[#EBE7DF] p-8">
                <Coffee className="w-10 h-10 text-[#C2BAAF] mx-auto mb-3 stroke-[1.5]" />
                <p className="font-bold text-sm text-[#201C1A]">Menu tidak ditemukan</p>
                <p className="text-xs text-[#8E867C] mt-1">
                  Coba kata kunci lain atau pilih kategori Semua Menu
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: BILLS / CART PANEL (35%) */}
        {/* ============================================================ */}
        <div className="w-full xl:w-96 flex flex-col space-y-6 shrink-0">
          <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 flex flex-col h-full space-y-6">
            {/* Header Bills */}
            <div className="flex items-center justify-between border-b border-[#F0ECE4] pb-4">
              <div>
                <h3 className="font-serif font-black text-lg text-[#201C1A] tracking-tight">
                  Tagihan (Bills)
                </h3>
                <p className="text-xs text-[#8E867C] mt-0.5">{cart.length} Item Pesanan</p>
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs font-bold text-[#964B3B] hover:text-[#803E30] transition-colors"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto space-y-3 min-h-[220px] max-h-[360px] pr-1">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#ECE7DE] space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-xs text-[#201C1A]">{item.product.name}</h4>
                      <p className="text-[10px] text-[#7A7268] mt-0.5">
                        {item.mood} • Size {item.size} • Gula {item.sugar} • Es {item.ice}
                      </p>
                      {item.notes && (
                        <p className="text-[10px] text-[#54382B] italic mt-0.5 bg-[#F2EDE5] px-2 py-0.5 rounded-md inline-block">
                          Note: {item.notes}
                        </p>
                      )}
                    </div>
                    <span className="font-bold text-xs text-[#201C1A] whitespace-nowrap">
                      {formatRupiah(item.product.price * item.quantity)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#F0ECE4]">
                    <button
                      type="button"
                      onClick={() =>
                        setEditingNoteItem({
                          id: item.id,
                          name: item.product.name,
                          notes: item.notes,
                        })
                      }
                      className="text-[10px] font-semibold text-[#8E867C] hover:text-[#201C1A] flex items-center gap-1"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>{item.notes ? 'Ubah Catatan' : 'Catatan'}</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, -1)}
                        className="w-6 h-6 rounded-lg bg-white border border-[#E5E0D6] flex items-center justify-center text-[#201C1A] hover:bg-[#F2ECE3]"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold text-[#201C1A] w-5 text-center">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-6 h-6 rounded-lg bg-white border border-[#E5E0D6] flex items-center justify-center text-[#201C1A] hover:bg-[#F2ECE3]"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="w-6 h-6 rounded-lg text-[#9E968B] hover:text-[#964B3B] flex items-center justify-center ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {cart.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#9E968B]">
                  <Coffee className="w-10 h-10 stroke-[1.2] mb-2 text-[#D5CEC2]" />
                  <p className="text-xs font-bold text-[#4A4238]">Keranjang Kosong</p>
                  <p className="text-[11px] text-[#9E968B] mt-0.5">
                    Pilih menu di sebelah kiri untuk membuat pesanan
                  </p>
                </div>
              )}
            </div>

            {/* Discount / Voucher Selector */}
            {discounts.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-[#F0ECE4]">
                <label className="text-[11px] font-bold text-[#4A4238]">Voucher / Diskon Promo</label>
                <select
                  value={selectedDiscountId}
                  onChange={(e) => setSelectedDiscountId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#EAE5DC] rounded-xl text-xs font-semibold text-[#201C1A] focus:outline-none"
                >
                  <option value="">-- Tanpa Diskon --</option>
                  {discounts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.type === 'percentage' ? `${d.value}%` : formatRupiah(d.value)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Calculations Breakdown */}
            <div className="space-y-2 pt-3 border-t border-[#F0ECE4] text-xs">
              <div className="flex justify-between text-[#7A7268]">
                <span>Subtotal</span>
                <span className="font-semibold text-[#201C1A]">{formatRupiah(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-[#2D7A47] font-semibold">
                  <span>Diskon Promo</span>
                  <span>-{formatRupiah(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#7A7268]">
                <span>PPN (11%)</span>
                <span>+{formatRupiah(taxAmount)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#F0ECE4] text-sm font-black text-[#201C1A]">
                <span>Total Tagihan</span>
                <span>{formatRupiah(total)}</span>
              </div>
            </div>

            {/* Payment Method Selector (Bento Chips) */}
            <div className="space-y-2 pt-2 border-t border-[#F0ECE4]">
              <label className="text-[11px] font-bold text-[#4A4238]">Metode Pembayaran</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`py-2.5 px-2 rounded-2xl text-[11px] font-bold border flex flex-col items-center gap-1 transition-all ${
                    paymentMethod === 'cash'
                      ? 'bg-[#2E2520] text-white border-[#2E2520] shadow-xs'
                      : 'bg-[#FAF8F5] text-[#4A4238] border-[#ECE7DE] hover:bg-[#F2ECE3]'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  <span>Tunai</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('qris')}
                  className={`py-2.5 px-2 rounded-2xl text-[11px] font-bold border flex flex-col items-center gap-1 transition-all ${
                    paymentMethod === 'qris'
                      ? 'bg-[#2E2520] text-white border-[#2E2520] shadow-xs'
                      : 'bg-[#FAF8F5] text-[#4A4238] border-[#ECE7DE] hover:bg-[#F2ECE3]'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>QRIS</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('debit')}
                  className={`py-2.5 px-2 rounded-2xl text-[11px] font-bold border flex flex-col items-center gap-1 transition-all ${
                    paymentMethod === 'debit'
                      ? 'bg-[#2E2520] text-white border-[#2E2520] shadow-xs'
                      : 'bg-[#FAF8F5] text-[#4A4238] border-[#ECE7DE] hover:bg-[#F2ECE3]'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Debit / EDC</span>
                </button>
              </div>
            </div>

            {/* Action Checkout Button */}
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={handleOpenCheckoutModal}
              className="w-full py-4 bg-[#2E2520] hover:bg-[#453932] disabled:opacity-40 text-white font-bold rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 text-xs tracking-wide cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Proses Bayar ({formatRupiah(total)})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL: EDIT NOTE ITEM */}
      {/* ============================================================ */}
      {editingNoteItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-[#EBE7DF] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0ECE4] pb-2">
              <h4 className="font-bold text-sm text-[#201C1A]">Catatan Menu</h4>
              <button
                onClick={() => setEditingNoteItem(null)}
                className="text-[#9E968B] hover:text-[#201C1A]"
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
                className="flex-1 py-2 px-3 bg-[#F4EFE7] hover:bg-[#EBE4D8] text-[#4A4238] font-bold rounded-xl text-xs"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  const input = document.getElementById('modalNoteInput') as HTMLTextAreaElement;
                  updateItemNotes(editingNoteItem.id, input?.value || '');
                }}
                className="flex-1 py-2 px-3 bg-[#2E2520] hover:bg-[#453932] text-white font-bold rounded-xl text-xs"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-[#EBE7DF] p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-[#F0ECE4] pb-3">
              <div>
                <h3 className="font-bold text-base text-[#201C1A]">Proses Pembayaran Kasir</h3>
                <p className="text-xs text-[#8E867C]">{currentOutlet.name}</p>
              </div>
              <button
                onClick={() => setIsCheckoutModalOpen(false)}
                className="text-[#9E968B] hover:text-[#201C1A]"
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
            <div className="bg-[#FAF8F5] border border-[#ECE7DE] p-4 rounded-2xl text-center">
              <span className="text-[11px] text-[#8E867C] font-semibold uppercase tracking-wider">
                Total Tagihan
              </span>
              <p className="text-3xl font-black text-[#201C1A] mt-0.5">{formatRupiah(total)}</p>
            </div>

            <div className="space-y-4 text-xs">
              {/* Customer Name */}
              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">
                  Nama Pelanggan / Nomor Meja
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Contoh: Meja 04 / Kak Fahmi"
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
                />
              </div>

              {/* PAYMENT METHOD SPECIFIC CONTROLS */}
              {paymentMethod === 'cash' && (
                <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EBE7DF] space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-[#201C1A]">Uang Diterima dari Pelanggan (Rp)</label>
                    <span className="text-[10px] text-[#8E867C]">Wajib &ge; Total</span>
                  </div>

                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={cashReceived || ''}
                    onChange={(e) => setCashReceived(Number(e.target.value))}
                    placeholder="Contoh: 100000"
                    className="w-full px-3.5 py-3 bg-white border border-[#E5E0D6] rounded-2xl text-base font-black focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
                  />

                  {/* Quick Cash Chips */}
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCashReceived(total)}
                      className="px-2.5 py-1.5 bg-white hover:bg-[#F2EDE5] text-[#201C1A] font-bold rounded-xl border border-[#E0D8CC] text-[11px]"
                    >
                      Uang Pas
                    </button>
                    <button
                      type="button"
                      onClick={() => setCashReceived((prev) => prev + 10000)}
                      className="px-2.5 py-1.5 bg-white hover:bg-[#F2EDE5] text-[#201C1A] font-bold rounded-xl border border-[#E0D8CC] text-[11px]"
                    >
                      +10.000
                    </button>
                    {[20000, 50000, 100000, 200000].map((nominal) => (
                      <button
                        key={nominal}
                        type="button"
                        onClick={() => setCashReceived(nominal)}
                        className="px-2.5 py-1.5 bg-white hover:bg-[#F2EDE5] text-[#201C1A] font-bold rounded-xl border border-[#E0D8CC] text-[11px]"
                      >
                        {formatRupiah(nominal)}
                      </button>
                    ))}
                  </div>

                  {/* Kembalian Feedback */}
                  <div className="pt-2 border-t border-[#ECE7DE] flex items-center justify-between text-xs font-bold">
                    <span>Kembalian:</span>
                    {cashReceived >= total ? (
                      <span className="text-base text-[#2D7A47] font-black">
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
                <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EBE7DF] text-center space-y-3">
                  <div className="p-4 bg-white rounded-2xl border border-[#E5E0D6] max-w-[220px] mx-auto shadow-xs">
                    <div className="border-b border-[#F0ECE4] pb-2 mb-2">
                      <span className="font-black text-xs text-[#964B3B] tracking-wider">QRIS STANDAR</span>
                      <p className="text-[9px] text-[#7A7268] font-bold uppercase">TOKO KOPI SERUNI</p>
                      <p className="text-[8px] text-[#9E968B] font-mono">NMID: ID1020039281729</p>
                    </div>
                    {/* Simulated visual QR pattern */}
                    <div className="w-36 h-36 mx-auto bg-[#201C1A] p-2 rounded-xl flex items-center justify-center text-white">
                      <QrCode className="w-32 h-32 text-white" />
                    </div>
                    <p className="text-xs font-black text-[#201C1A] mt-2">
                      {formatRupiah(total)}
                    </p>
                  </div>
                  <p className="text-[11px] text-[#7A7268]">
                    Arahkan kamera aplikasi bank/e-wallet pelanggan ke kode QRIS di atas.
                  </p>
                </div>
              )}

              {(paymentMethod === 'debit' || paymentMethod === 'transfer') && (
                <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EBE7DF] space-y-2">
                  <label className="font-bold text-[#4A4238]">Nomor Referensi / Approval Code EDC</label>
                  <input
                    type="text"
                    value={paymentRefNumber}
                    onChange={(e) => setPaymentRefNumber(e.target.value)}
                    placeholder="Contoh: BCA-839201 / TRF-8392"
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
                  />
                </div>
              )}
            </div>

            {/* Modal Bottom Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCheckoutModalOpen(false)}
                className="flex-1 py-3.5 px-4 bg-[#F2ECE3] hover:bg-[#E8E0D4] text-[#4A4238] font-bold rounded-2xl text-xs transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isPending || (paymentMethod === 'cash' && cashReceived < total)}
                onClick={handleProcessCheckout}
                className="flex-1 py-3.5 px-4 bg-[#2E2520] hover:bg-[#453932] disabled:opacity-50 text-white font-bold rounded-2xl text-xs transition-all shadow-md flex items-center justify-center gap-2"
              >
                <span>{isPending ? 'Menyimpan Transaksi...' : 'Konfirmasi & Cetak Struk'}</span>
                <ArrowRight className="w-4 h-4" />
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
