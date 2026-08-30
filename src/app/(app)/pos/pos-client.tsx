'use client';

import { useState, useTransition } from 'react';
import { formatRupiah, calcDiscount, calcTax, calcTotal } from '@/lib/utils';
import { checkout } from '@/app/actions/checkout';
import type { Product, Category, Discount } from '@/lib/schema';
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

  // Per-card active selection options state map
  const [cardOptions, setCardOptions] = useState<
    Record<string, { mood: 'Hot' | 'Ice'; size: 'S' | 'M' | 'L'; sugar: '30%' | '50%' | '70%' | 'Normal'; ice: '30%' | '50%' | '70%' | 'Normal' }>
  >({});

  // Note edit modal state
  const [editingNoteItem, setEditingNoteItem] = useState<{ id: string; name: string; notes: string } | null>(null);

  // Success / Modal states
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [successOrder, setSuccessOrder] = useState<{ id: string; total: number } | null>(null);
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

  const setOption = (
    prodId: string,
    field: 'mood' | 'size' | 'sugar' | 'ice',
    val: any
  ) => {
    setCardOptions((prev) => ({
      ...prev,
      [prodId]: {
        ...getOptions(prodId),
        [field]: val,
      },
    }));
  };

  // Cart operations
  const addToCartWithOptions = (product: Product) => {
    const opts = getOptions(product.id);
    const cartKey = `${product.id}-${opts.mood}-${opts.size}-${opts.sugar}-${opts.ice}`;

    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === cartKey);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += 1;
        return updated;
      }
      return [
        ...prev,
        {
          id: cartKey,
          product,
          quantity: 1,
          mood: opts.mood,
          size: opts.size,
          sugar: opts.sugar,
          ice: opts.ice,
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
          items: cart.map((item) => {
            const customDesc = `${item.mood}, Size ${item.size}, Gula ${item.sugar}, Es ${item.ice}${
              item.notes ? ` (${item.notes})` : ''
            }`;
            return {
              productId: item.product.id,
              productName: item.product.name,
              productPrice: item.product.price,
              costPrice: item.product.costPrice || 0,
              quantity: item.quantity,
              notes: customDesc,
            };
          }),
          discountId: selectedDiscount?.id,
          discountType: selectedDiscount?.type as 'percentage' | 'fixed' | undefined,
          discountValue: selectedDiscount?.value,
          taxRate,
          paymentMethod,
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

          <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
            {/* All Category Pill */}
            <button
              onClick={() => setSelectedCategory('all')}
              className={`flex flex-col items-center justify-center min-w-[76px] h-24 p-2 rounded-2xl border transition-all shrink-0 ${
                selectedCategory === 'all'
                  ? 'bg-[#F2ECE4] border-[#D8CFC2] shadow-xs'
                  : 'bg-[#FBF9F6] border-[#EDE8E0] hover:bg-[#F5F1E9]'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center mb-1.5 transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-[#2E2520] text-white shadow-xs'
                    : 'bg-white text-[#54382B] border border-[#E8E3D8]'
                }`}
              >
                <LayoutGrid className="w-5 h-5" />
              </div>
              <span
                className={`text-[11px] font-bold truncate max-w-[70px] ${
                  selectedCategory === 'all' ? 'text-[#201C1A]' : 'text-[#7A7268]'
                }`}
              >
                Semua
              </span>
            </button>

            {/* Individual Categories */}
            {categories.map((cat) => {
              const Icon = getCategoryIcon(cat.name);
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex flex-col items-center justify-center min-w-[76px] h-24 p-2 rounded-2xl border transition-all shrink-0 ${
                    isSelected
                      ? 'bg-[#F2ECE4] border-[#D8CFC2] shadow-xs'
                      : 'bg-[#FBF9F6] border-[#EDE8E0] hover:bg-[#F5F1E9]'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center mb-1.5 transition-colors ${
                      isSelected
                        ? 'bg-[#2E2520] text-white shadow-xs'
                        : 'bg-white text-[#54382B] border border-[#E8E3D8]'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span
                    className={`text-[11px] font-bold truncate max-w-[70px] ${
                      isSelected ? 'text-[#201C1A]' : 'text-[#7A7268]'
                    }`}
                  >
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bento Products Catalog */}
        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-6 shadow-xs flex-1 flex flex-col">
          {/* Header & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#F0ECE4]">
            <div>
              <h3 className="text-lg font-bold text-[#201C1A] tracking-tight">
                Daftar Menu Kopi Seruni
              </h3>
              <p className="text-xs text-[#8E867C] mt-0.5">
                {filteredProducts.length} menu ditemukan
              </p>
            </div>

            <div className="relative sm:w-80">
              <Search className="w-4 h-4 text-[#9E968B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kategori atau nama menu..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2E2520] focus:bg-white text-[#201C1A] placeholder-[#9E968B]"
              />
            </div>
          </div>

          {/* Grid Products Bento Cards */}
          <div className="pt-5 flex-1">
            {filteredProducts.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-[#9E968B] text-center">
                <Coffee className="w-10 h-10 mb-2 stroke-1 text-[#C4BCB0]" />
                <p className="text-sm font-semibold text-[#665E54]">Menu tidak ditemukan</p>
                <p className="text-xs text-[#9E968B] mt-1">Coba kata kunci pencarian atau kategori lain</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5">
                {filteredProducts.map((prod) => {
                  const opts = getOptions(prod.id);
                  return (
                    <div
                      key={prod.id}
                      className="bg-[#FAF8F5] border border-[#ECE7DE] rounded-3xl p-4 flex flex-col justify-between hover:shadow-md hover:border-[#D5CDC0] transition-all group"
                    >
                      {/* Top: Image + Info */}
                      <div className="flex items-start gap-3.5 mb-3.5">
                        <div className="w-20 h-20 rounded-2xl bg-white border border-[#E5DFD4] overflow-hidden flex items-center justify-center shrink-0 shadow-xs">
                          {prod.imageUrl ? (
                            <img
                              src={prod.imageUrl}
                              alt={prod.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <Coffee className="w-8 h-8 text-[#54382B] stroke-[1.5]" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-[#201C1A] text-sm leading-snug line-clamp-1 group-hover:text-[#54382B] transition-colors">
                            {prod.name}
                          </h4>
                          <p className="text-[11px] text-[#8E867C] line-clamp-2 mt-0.5">
                            {prod.description || 'Racikan menu istimewa Toko Kopi Seruni.'}
                          </p>
                          <p className="text-sm font-extrabold text-[#201C1A] mt-2">
                            {formatRupiah(prod.price)}
                          </p>
                        </div>
                      </div>

                      {/* Customization Pills (Mood, Size, Sugar, Ice) */}
                      <div className="space-y-2 bg-white/70 border border-[#ECE7DE] rounded-2xl p-2.5 mb-3 text-[10px]">
                        {/* Mood & Size */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[#8E867C] font-semibold block mb-1">Suhu</span>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => setOption(prod.id, 'mood', 'Ice')}
                                className={`flex-1 py-1 rounded-lg font-bold flex items-center justify-center gap-1 transition-colors ${
                                  opts.mood === 'Ice'
                                    ? 'bg-[#2E2520] text-white'
                                    : 'bg-[#F2ECE3] text-[#6E6458] hover:bg-[#E8E0D4]'
                                }`}
                              >
                                <Snowflake className="w-3 h-3" /> Dingin
                              </button>
                              <button
                                type="button"
                                onClick={() => setOption(prod.id, 'mood', 'Hot')}
                                className={`flex-1 py-1 rounded-lg font-bold flex items-center justify-center gap-1 transition-colors ${
                                  opts.mood === 'Hot'
                                    ? 'bg-[#A34730] text-white'
                                    : 'bg-[#F2ECE3] text-[#6E6458] hover:bg-[#E8E0D4]'
                                }`}
                              >
                                <Flame className="w-3 h-3" /> Panas
                              </button>
                            </div>
                          </div>

                          <div>
                            <span className="text-[#8E867C] font-semibold block mb-1">Ukuran</span>
                            <div className="flex gap-1">
                              {(['S', 'M', 'L'] as const).map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => setOption(prod.id, 'size', s)}
                                  className={`flex-1 py-1 rounded-lg font-bold transition-colors ${
                                    opts.size === s
                                      ? 'bg-[#2E2520] text-white'
                                      : 'bg-[#F2ECE3] text-[#6E6458] hover:bg-[#E8E0D4]'
                                  }`}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Sugar & Ice Levels */}
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#F0EBE2]">
                          <div>
                            <span className="text-[#8E867C] font-semibold block mb-1">Gula</span>
                            <div className="flex gap-1">
                              {(['30%', '50%', 'Normal'] as const).map((sg) => (
                                <button
                                  key={sg}
                                  type="button"
                                  onClick={() => setOption(prod.id, 'sugar', sg)}
                                  className={`flex-1 py-1 rounded-lg font-bold text-[9px] transition-colors ${
                                    opts.sugar === sg
                                      ? 'bg-[#2E2520] text-white'
                                      : 'bg-[#F2ECE3] text-[#6E6458] hover:bg-[#E8E0D4]'
                                  }`}
                                >
                                  {sg}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <span className="text-[#8E867C] font-semibold block mb-1">Es</span>
                            <div className="flex gap-1">
                              {(['30%', '50%', 'Normal'] as const).map((ic) => (
                                <button
                                  key={ic}
                                  type="button"
                                  onClick={() => setOption(prod.id, 'ice', ic)}
                                  className={`flex-1 py-1 rounded-lg font-bold text-[9px] transition-colors ${
                                    opts.ice === ic
                                      ? 'bg-[#2E2520] text-white'
                                      : 'bg-[#F2ECE3] text-[#6E6458] hover:bg-[#E8E0D4]'
                                  }`}
                                >
                                  {ic}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Add to Billing Button */}
                      <button
                        type="button"
                        onClick={() => addToCartWithOptions(prod)}
                        className="w-full py-2.5 px-4 bg-[#2E2520] hover:bg-[#453932] text-white font-bold rounded-2xl text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-[0.98]"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tambah ke Pesanan
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* RIGHT COLUMN: BENTO "BILLS" PANEL (35%) */}
      {/* ============================================================ */}
      <div className="w-full xl:w-[410px] flex flex-col bg-white rounded-3xl border border-[#EBE7DF] p-6 shadow-xs shrink-0 self-start sticky top-6">
        {/* Bills Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#F0ECE4]">
          <div>
            <h3 className="font-bold text-lg text-[#201C1A] tracking-tight">
              Pesanan (Bills)
            </h3>
            <p className="text-xs text-[#8E867C]">
              {cart.reduce((s, i) => s + i.quantity, 0)} item dalam keranjang
            </p>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs font-semibold text-[#A34730] hover:text-red-700 transition-colors"
            >
              Reset
            </button>
          )}
        </div>

        {/* Bills Item List */}
        <div className="py-4 space-y-3 max-h-[380px] overflow-y-auto pr-1">
          {cart.length === 0 ? (
            <div className="py-16 text-center text-[#9E968B]">
              <Coffee className="w-8 h-8 mx-auto mb-2 text-[#C8BFB2] stroke-[1.2]" />
              <p className="text-xs font-semibold text-[#70675D]">Belum ada pesanan</p>
              <p className="text-[11px] text-[#A69E93] mt-0.5">Pilih menu dari katalog di sebelah kiri</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="bg-[#FBF9F6] border border-[#ECE7DE] rounded-2xl p-3 flex items-start gap-3 transition-all hover:border-[#DCD5C8]"
              >
                <div className="w-12 h-12 rounded-xl bg-white border border-[#E4DDD2] overflow-hidden flex items-center justify-center shrink-0">
                  {item.product.imageUrl ? (
                    <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                  ) : (
                    <Coffee className="w-5 h-5 text-[#54382B]" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <h5 className="text-xs font-bold text-[#201C1A] truncate">{item.product.name}</h5>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-[#B5ADA1] hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-[10px] text-[#8E867C] mt-0.5">
                    {item.mood} · Size {item.size} · Gula {item.sugar} · Es {item.ice}
                  </p>

                  {/* Notes snippet button */}
                  <div className="mt-1.5 flex items-center justify-between">
                    <button
                      onClick={() =>
                        setEditingNoteItem({
                          id: item.id,
                          name: item.product.name,
                          notes: item.notes || '',
                        })
                      }
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#54382B] hover:text-[#201C1A] bg-[#F2EDE5] px-2 py-0.5 rounded-lg border border-[#E2DDD3]"
                    >
                      <Pencil className="w-2.5 h-2.5" />
                      <span className="truncate max-w-[100px]">
                        {item.notes ? `Catatan: ${item.notes}` : 'Tambah Catatan'}
                      </span>
                    </button>

                    <span className="text-xs font-extrabold text-[#201C1A]">
                      {formatRupiah(item.product.price * item.quantity)}
                    </span>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="mt-2 flex items-center justify-between pt-1.5 border-t border-[#EFE9DF]">
                    <span className="text-[10px] text-[#9E968B]">
                      {formatRupiah(item.product.price)} x {item.quantity}
                    </span>
                    <div className="flex items-center gap-1.5 bg-white border border-[#E4DDD2] rounded-lg p-0.5">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="w-5 h-5 rounded flex items-center justify-center text-[#201C1A] hover:bg-[#F2ECE3] transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center text-xs font-bold text-[#201C1A]">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-5 h-5 rounded flex items-center justify-center text-[#201C1A] hover:bg-[#F2ECE3] transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals & Discounts Breakdown */}
        <div className="pt-4 border-t border-[#F0ECE4] space-y-3">
          {discounts.length > 0 && (
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-[#7A7268] font-medium">Voucher Promo:</span>
              <select
                value={selectedDiscountId}
                onChange={(e) => setSelectedDiscountId(e.target.value)}
                className="px-2.5 py-1.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-xl text-xs font-semibold text-[#201C1A] focus:outline-none focus:ring-1 focus:ring-[#2E2520]"
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

          <div className="space-y-1.5 text-xs text-[#6B635A]">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-semibold text-[#201C1A]">{formatRupiah(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-[#A34730] font-semibold">
                <span>Diskon</span>
                <span>-{formatRupiah(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Pajak (PPN 11%)</span>
              <span className="font-semibold text-[#201C1A]">{formatRupiah(taxAmount)}</span>
            </div>
            <div className="flex justify-between text-base font-black text-[#201C1A] pt-2 border-t border-dashed border-[#DCD5C8]">
              <span>Total</span>
              <span className="text-[#201C1A]">{formatRupiah(total)}</span>
            </div>
          </div>

          {/* Payment Method Selector Cards matching reference */}
          <div className="space-y-1.5 pt-2">
            <span className="text-[11px] font-bold text-[#8E867C] uppercase tracking-wider block">
              Metode Pembayaran
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`py-2.5 px-2 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all ${
                  paymentMethod === 'cash'
                    ? 'bg-[#F2ECE3] border-[#2E2520] shadow-xs text-[#201C1A] font-bold'
                    : 'bg-[#FAF8F5] border-[#E8E2D6] text-[#7A7268] hover:bg-[#F5F0E7]'
                }`}
              >
                <Banknote className="w-4 h-4" />
                <span className="text-[10px]">Tunai</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('debit')}
                className={`py-2.5 px-2 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all ${
                  paymentMethod === 'debit'
                    ? 'bg-[#F2ECE3] border-[#2E2520] shadow-xs text-[#201C1A] font-bold'
                    : 'bg-[#FAF8F5] border-[#E8E2D6] text-[#7A7268] hover:bg-[#F5F0E7]'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span className="text-[10px]">Kartu Debit</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('qris')}
                className={`py-2.5 px-2 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all ${
                  paymentMethod === 'qris'
                    ? 'bg-[#F2ECE3] border-[#2E2520] shadow-xs text-[#201C1A] font-bold'
                    : 'bg-[#FAF8F5] border-[#E8E2D6] text-[#7A7268] hover:bg-[#F5F0E7]'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span className="text-[10px]">QRIS</span>
              </button>
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            disabled={cart.length === 0}
            onClick={() => setIsCheckoutModalOpen(true)}
            className="w-full py-3.5 bg-[#2E2520] hover:bg-[#453932] disabled:opacity-40 text-white font-bold rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 text-sm mt-2 active:scale-[0.99]"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Struk & Bayar ({formatRupiah(total)})</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL: EDIT NOTES */}
      {/* ============================================================ */}
      {editingNoteItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-xl border border-[#EBE7DF] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0ECE4] pb-3">
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
                placeholder="Contoh: Less ice, jangan terlalu manis, extra espresso..."
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
      {/* MODAL: CHECKOUT CONFIRMATION */}
      {/* ============================================================ */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-[#EBE7DF] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0ECE4] pb-3">
              <h3 className="font-bold text-base text-[#201C1A]">Konfirmasi Pesanan Kasir</h3>
              <button
                onClick={() => setIsCheckoutModalOpen(false)}
                className="text-[#9E968B] hover:text-[#201C1A]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 text-xs text-red-700 bg-red-50 rounded-xl border border-red-200">
                {errorMessage}
              </div>
            )}

            <div className="bg-[#FAF8F5] border border-[#ECE7DE] p-4 rounded-2xl text-center">
              <p className="text-[11px] text-[#8E867C] font-semibold uppercase tracking-wider">Total Tagihan Final</p>
              <p className="text-3xl font-black text-[#201C1A] mt-1">{formatRupiah(total)}</p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#4A4238] mb-1">Nama Pelanggan / Nomor Meja</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Contoh: Meja 03 / Kak Sarah"
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
                />
              </div>

              <div>
                <span className="block font-semibold text-[#4A4238] mb-1">Metode Bayar Terpilih</span>
                <div className="p-3 bg-[#F9F7F2] rounded-xl border border-[#E5E0D6] flex items-center justify-between font-bold text-[#201C1A]">
                  <span className="uppercase">{paymentMethod}</span>
                  <span className="text-[11px] font-normal text-[#8E867C]">Langsung Lunas</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCheckoutModalOpen(false)}
                className="flex-1 py-3 px-4 bg-[#F2ECE3] hover:bg-[#E8E0D4] text-[#4A4238] font-bold rounded-2xl text-xs transition-colors"
              >
                Kembali
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleProcessCheckout}
                className="flex-1 py-3 px-4 bg-[#2E2520] hover:bg-[#453932] disabled:opacity-50 text-white font-bold rounded-2xl text-xs transition-all shadow-md"
              >
                {isPending ? 'Memproses Transaksi...' : 'Konfirmasi & Selesai'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: SUCCESS CONFIRMATION */}
      {/* ============================================================ */}
      {successOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-[#EBE7DF] p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-[#EBF6EE] text-[#2D7A47] rounded-2xl flex items-center justify-center text-2xl mx-auto border border-[#D1EBD8]">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="font-bold text-lg text-[#201C1A]">Pembayaran Berhasil!</h3>
              <p className="text-xs text-[#8E867C] mt-1">
                ID Struk: <span className="font-mono font-bold text-[#201C1A]">{successOrder.id}</span>
              </p>
            </div>

            <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#ECE7DE]">
              <span className="text-[11px] text-[#8E867C]">Total Diterima</span>
              <p className="text-2xl font-black text-[#201C1A] mt-0.5">
                {formatRupiah(successOrder.total)}
              </p>
            </div>

            <button
              onClick={() => setSuccessOrder(null)}
              className="w-full py-3 bg-[#2E2520] hover:bg-[#453932] text-white font-bold rounded-2xl transition-all shadow text-xs"
            >
              Mulai Pesanan Baru
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
