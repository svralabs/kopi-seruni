import { formatDateTime } from './utils';
import { SERUNI_LOGO_ESC_POS } from './logo-bitmap';

export interface ReceiptPrintData {
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
  paymentMethod: string;
  cashReceived?: number;
  change?: number;
  footerText?: string;
}

/**
 * Format currency with pure ASCII standard space (Rp 25.000)
 */
export function formatRp(amount: number): string {
  return 'Rp ' + Math.round(amount).toLocaleString('id-ID').replace(/[\u00A0\u202F]/g, ' ');
}

export class EscPosEncoder {
  private buffer: number[] = [];

  constructor() {
    this.init();
  }

  init() {
    this.buffer.push(0x1b, 0x40); // ESC @ (Initialize printer)
    this.buffer.push(0x1b, 0x74, 0x00); // ESC t 0 (Select Code Page 437 Standard ASCII)
    return this;
  }

  alignCenter() {
    this.buffer.push(0x1b, 0x61, 0x01); // ESC a 1
    return this;
  }

  alignLeft() {
    this.buffer.push(0x1b, 0x61, 0x00); // ESC a 0
    return this;
  }

  alignRight() {
    this.buffer.push(0x1b, 0x61, 0x02); // ESC a 2
    return this;
  }

  bold(enable: boolean) {
    this.buffer.push(0x1b, 0x45, enable ? 0x01 : 0x00); // ESC E n (Bold on/off)
    return this;
  }

  raw(bytes: Uint8Array | number[]) {
    for (const b of bytes) {
      this.buffer.push(b);
    }
    return this;
  }

  text(str: string) {
    // Sanitize all unicode whitespace, quotes, dashes to pure ASCII bytes
    const clean = str
      .replace(/[\u00A0\u202F\u2000-\u200B]/g, ' ')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/[\u2022\u25CF]/g, '*');

    for (let i = 0; i < clean.length; i++) {
      const code = clean.charCodeAt(i);
      // Valid printable ASCII (32..126) + newline (10) + carriage return (13)
      if (code === 10 || code === 13 || (code >= 32 && code <= 126)) {
        this.buffer.push(code);
      } else if (code > 126) {
        this.buffer.push(0x20); // space fallback for unprintable unicode
      }
    }
    return this;
  }

  line(str: string = '') {
    this.text(str + '\n');
    return this;
  }

  divider(char: string = '-', width: number = 32) {
    this.line(char.repeat(width));
    return this;
  }

  twoColumn(left: string, right: string, width: number = 32) {
    const maxLeftLen = width - right.length - 1;
    let safeLeft = left;
    if (safeLeft.length > maxLeftLen && maxLeftLen > 0) {
      safeLeft = safeLeft.substring(0, maxLeftLen);
    }
    const spaceCount = Math.max(1, width - safeLeft.length - right.length);
    this.line(safeLeft + ' '.repeat(spaceCount) + right);
    return this;
  }

  feed(lines: number = 3) {
    this.buffer.push(0x1b, 0x64, lines); // ESC d n
    return this;
  }

  cut() {
    // GS V 65 0 (Only send for large 80mm cutters)
    this.buffer.push(0x1d, 0x56, 0x41, 0x00);
    return this;
  }

  openCashDrawer() {
    this.buffer.push(0x1b, 0x70, 0x00, 0x19, 0xfa); // ESC p 0 25 250
    return this;
  }

  getUint8Array(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

/**
 * Generate binary ESC/POS payload for receipt identical to screen preview
 */
export function generateEscPosReceipt(data: ReceiptPrintData, paperWidth: 32 | 48 = 32): Uint8Array {
  const enc = new EscPosEncoder();

  // 1. Header: 1-Bit Thermal Bitmap Logo
  enc.alignCenter();
  enc.raw(SERUNI_LOGO_ESC_POS);
  enc.feed(1);

  // Store Outlet Info
  enc.bold(true).line(data.outletName);
  enc.bold(false);
  if (data.outletAddress) enc.line(data.outletAddress);
  if (data.outletPhone) enc.line(`Telp: ${data.outletPhone}`);
  enc.divider('=', paperWidth);

  // 2. Transaction Metadata
  enc.alignLeft().bold(false);
  enc.twoColumn('No. Nota', data.orderId, paperWidth);
  enc.twoColumn('Waktu', formatDateTime(data.createdAt), paperWidth);
  enc.twoColumn('Kasir', data.kasirName, paperWidth);
  enc.twoColumn('Pelanggan', data.customerName || 'Walk-in', paperWidth);
  enc.divider('-', paperWidth);

  // 3. Items
  for (const item of data.items) {
    enc.bold(true).twoColumn(item.productName, formatRp(item.subtotal), paperWidth);
    enc.bold(false);
    const qtyPrice = `${item.quantity} x ${formatRp(item.productPrice)}`;
    enc.line(`  ${qtyPrice}`);
    if (item.notes) {
      enc.line(`  * ${item.notes}`);
    }
  }
  enc.divider('-', paperWidth);

  // 4. Financial Calculation
  enc.twoColumn('Subtotal', formatRp(data.subtotal), paperWidth);
  if (data.discountAmount > 0) {
    enc.twoColumn('Diskon Promo', `-${formatRp(data.discountAmount)}`, paperWidth);
  }
  if (data.taxAmount > 0) {
    enc.twoColumn(`PPN (${data.taxRate}%)`, `+${formatRp(data.taxAmount)}`, paperWidth);
  }
  enc.divider('-', paperWidth);

  // 5. Total & Payment
  enc.bold(true).twoColumn('TOTAL', formatRp(data.total), paperWidth).bold(false);
  enc.divider('-', paperWidth);

  enc.twoColumn(`Metode: ${data.paymentMethod.toUpperCase()}`, formatRp(data.cashReceived || data.total), paperWidth);
  if (data.paymentMethod === 'cash' && data.change != null) {
    enc.bold(true).twoColumn('Kembalian', formatRp(data.change), paperWidth).bold(false);
  }
  enc.divider('=', paperWidth);

  // 6. Footer
  enc.alignCenter();
  enc.line(data.footerText || 'Terima kasih atas kunjungan Anda!');
  enc.line('Follow IG: @kopiseruni');
  enc.feed(paperWidth === 48 ? 2 : 4);

  // Only send automatic cutter command on 80mm printers
  if (paperWidth === 48) {
    enc.cut();
  }

  return enc.getUint8Array();
}
