/**
 * Server-Side PDF Report Generator for Kopi Seruni POS
 * 
 * Generates high-fidelity, printable PDF documents on the backend (Node.js/Bun server-side)
 * without relying on client-side canvas/window.print.
 */

import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { formatRupiah } from './utils';

// Helper to sanitize Rupiah string for PDF standard font WinAnsiEncoding
function cleanRp(amount: number): string {
  return formatRupiah(amount).replace(/\u00A0/g, ' ');
}

// Brand Colors
const COLORS = {
  primary: '#201C1A',      // Espresso Dark
  secondary: '#54382B',    // Roasted Coffee
  textDark: '#2E2A27',     // Main Text
  textMuted: '#7A7268',    // Muted Gray
  bgHeader: '#201C1A',     // Table Header Dark
  bgRowAlt: '#FAF8F5',     // Soft Cream
  borderColor: '#E5DFD5',  // Border Line
  accentGreen: '#2D7A47',  // Success / Profit
  accentRed: '#964B3B',    // Danger / Expense
  white: '#FFFFFF',
};

/**
 * Draw Document Header with Seruni Logo & Metadata Box
 */
function drawHeader(
  doc: PDFKit.PDFDocument,
  title: string,
  metaItems: { label: string; value: string }[]
): number {
  let y = 36;
  const left = 36;
  const contentWidth = 523;

  // 1. Logo or Brand Text
  const logoPath = path.join(process.cwd(), 'public/logo-receipt.png');
  let hasLogo = false;
  try {
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, left, y, { width: 95 });
      hasLogo = true;
    }
  } catch {}

  // Brand Name & Subtitle
  const textX = hasLogo ? left + 105 : left;
  doc.font('Helvetica-Bold').fontSize(14).fillColor(COLORS.primary);
  doc.text('TOKO KOPI SERUNI', textX, y + 2);
  doc.font('Helvetica').fontSize(8).fillColor(COLORS.textMuted);
  doc.text('Sistem POS & Manajemen Multi-Outlet', textX, y + 18);

  // Document Title (Right Aligned)
  doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.secondary);
  doc.text(title.toUpperCase(), left, y + 6, { width: contentWidth, align: 'right' });

  y += 42;

  // Thin separator
  doc.strokeColor(COLORS.primary).lineWidth(1.2).moveTo(left, y).lineTo(left + contentWidth, y).stroke();
  y += 10;

  // Metadata Card Box
  const boxHeight = 38;
  doc.rect(left, y, contentWidth, boxHeight).fillAndStroke(COLORS.bgRowAlt, COLORS.borderColor);

  const colWidth = contentWidth / Math.min(metaItems.length, 4);
  metaItems.forEach((item, idx) => {
    const colX = left + 10 + (idx * colWidth);
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLORS.textMuted);
    doc.text(item.label.toUpperCase(), colX, y + 8);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.textDark);
    doc.text(item.value, colX, y + 20, { width: colWidth - 10, lineBreak: false });
  });

  y += boxHeight + 14;
  return y;
}

/**
 * Draw Page Running Footers with Page Numbers & Svralabs Credit
 */
function applyFooters(doc: PDFKit.PDFDocument) {
  const range = doc.bufferedPageRange();
  const left = 36;
  const contentWidth = 523;

  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const bottomY = doc.page.height - 32;

    // Footer divider line
    doc.strokeColor(COLORS.borderColor).lineWidth(0.5).moveTo(left, bottomY - 6).lineTo(left + contentWidth, bottomY - 6).stroke();

    // Left Credit
    doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.textMuted);
    doc.text('Toko Kopi Seruni POS • Dibuat oleh Svralabs (svralabs.com)', left, bottomY);

    // Right Page Counter
    doc.text(`Halaman ${i + 1} dari ${range.count}`, left, bottomY, {
      width: contentWidth,
      align: 'right',
    });
  }
}

// ============================================================================
// 1. LAPORAN PENJUALAN / TRANSAKSI (ORDERS REPORT)
// ============================================================================
export interface OrderPdfRow {
  order: {
    id: string;
    createdAt: number;
    customerName?: string | null;
    paymentMethod: string;
    status: string;
    subtotal: number;
    discountAmount?: number | null;
    taxAmount?: number | null;
    total: number;
  };
  outlet?: { name: string } | null;
  user?: { name: string } | null;
}

export async function generateOrdersPdf(
  rows: OrderPdfRow[],
  meta: {
    outletName: string;
    periodLabel: string;
    statusLabel: string;
    printedAt: string;
  }
): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 36, size: 'A4', bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on('data', (c) => chunks.push(c));

  const promise = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const totalOmset = rows.reduce((acc, r) => acc + (r.order.status === 'completed' ? r.order.total : 0), 0);
  const totalCompleted = rows.filter((r) => r.order.status === 'completed').length;

  let y = drawHeader(doc, 'Laporan Transaksi Penjualan', [
    { label: 'Cabang Outlet', value: meta.outletName },
    { label: 'Periode Waktu', value: meta.periodLabel },
    { label: 'Filter / Status', value: meta.statusLabel },
    { label: 'Total Omset', value: cleanRp(totalOmset) },
  ]);

  const left = 36;
  const contentWidth = 523;

  // Column definitions
  const cols = [
    { label: 'No', width: 24, align: 'center' as const },
    { label: 'No. Struk', width: 74, align: 'left' as const },
    { label: 'Waktu (WIB)', width: 84, align: 'left' as const },
    { label: 'Cabang', width: 66, align: 'left' as const },
    { label: 'Kasir / Pelanggan', width: 105, align: 'left' as const },
    { label: 'Metode', width: 55, align: 'left' as const },
    { label: 'Status', width: 45, align: 'center' as const },
    { label: 'Total (Rp)', width: 70, align: 'right' as const },
  ];

  const drawTableHeader = (currY: number) => {
    doc.rect(left, currY, contentWidth, 18).fill(COLORS.bgHeader);
    let curX = left;
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLORS.white);
    cols.forEach((col) => {
      doc.text(col.label, curX + 2, currY + 5, { width: col.width - 4, align: col.align });
      curX += col.width;
    });
    return currY + 18;
  };

  y = drawTableHeader(y);

  // Rows
  rows.forEach((r, idx) => {
    // Check page break
    if (y > doc.page.height - 55) {
      doc.addPage();
      y = drawTableHeader(36);
    }

    const isAlt = idx % 2 === 1;
    if (isAlt) {
      doc.rect(left, y, contentWidth, 16).fill(COLORS.bgRowAlt);
    }

    // Border line bottom
    doc.strokeColor(COLORS.borderColor).lineWidth(0.5).moveTo(left, y + 16).lineTo(left + contentWidth, y + 16).stroke();

    let curX = left;
    const dateStr = new Date(r.order.createdAt * 1000).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const cashierCustomer = `${r.user?.name || 'Kasir'} / ${r.order.customerName || 'Walk-in'}`;
    const statusColor = r.order.status === 'completed' ? COLORS.accentGreen : COLORS.accentRed;

    doc.font('Helvetica').fontSize(7).fillColor(COLORS.textDark);
    
    // No
    doc.text(String(idx + 1), curX + 2, y + 4.5, { width: cols[0].width - 4, align: cols[0].align });
    curX += cols[0].width;

    // Order ID
    doc.font('Helvetica-Bold').text(r.order.id, curX + 2, y + 4.5, { width: cols[1].width - 4, align: cols[1].align });
    curX += cols[1].width;

    // Waktu
    doc.font('Helvetica').text(dateStr, curX + 2, y + 4.5, { width: cols[2].width - 4, align: cols[2].align });
    curX += cols[2].width;

    // Cabang
    doc.text(r.outlet?.name || 'Pusat', curX + 2, y + 4.5, { width: cols[3].width - 4, align: cols[3].align });
    curX += cols[3].width;

    // Kasir / Cust
    doc.text(cashierCustomer, curX + 2, y + 4.5, { width: cols[4].width - 4, align: cols[4].align, lineBreak: false });
    curX += cols[4].width;

    // Metode
    doc.text(r.order.paymentMethod.toUpperCase(), curX + 2, y + 4.5, { width: cols[5].width - 4, align: cols[5].align });
    curX += cols[5].width;

    // Status
    doc.font('Helvetica-Bold').fillColor(statusColor).text(r.order.status.toUpperCase(), curX + 2, y + 4.5, { width: cols[6].width - 4, align: cols[6].align });
    curX += cols[6].width;

    // Total
    doc.font('Helvetica-Bold').fillColor(COLORS.textDark).text(cleanRp(r.order.total), curX + 2, y + 4.5, { width: cols[7].width - 4, align: cols[7].align });

    y += 16;
  });

  // Table summary row
  if (y > doc.page.height - 55) {
    doc.addPage();
    y = 36;
  }
  doc.rect(left, y, contentWidth, 20).fill('#EDE8DF');
  doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.primary);
  doc.text('TOTAL AKUMULASI PENJUALAN', left + 10, y + 6);
  doc.text(cleanRp(totalOmset), left + contentWidth - 130, y + 6, { width: 120, align: 'right' });

  applyFooters(doc);
  doc.end();
  return promise;
}

// ============================================================================
// 2. LAPORAN LABA RUGI (PROFIT & LOSS REPORT)
// ============================================================================
export interface ProfitLossPdfData {
  totalRevenue: number;
  totalCOGS: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
  netMargin: string;
}

export async function generateProfitLossPdf(
  data: ProfitLossPdfData,
  meta: {
    outletName: string;
    periodLabel: string;
    printedAt: string;
  }
): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 36, size: 'A4', bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on('data', (c) => chunks.push(c));

  const promise = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  let y = drawHeader(doc, 'Laporan Laba Rugi', [
    { label: 'Cabang Outlet', value: meta.outletName },
    { label: 'Periode Laporan', value: meta.periodLabel },
    { label: 'Waktu Cetak', value: meta.printedAt },
    { label: 'Net Profit Margin', value: `${data.netMargin}%` },
  ]);

  const left = 36;
  const contentWidth = 523;

  // 1. Executive Summary Cards (4 Cards Grid)
  const cardWidth = (contentWidth - 18) / 4;
  const cards = [
    { label: 'Total Omset (Net)', val: cleanRp(data.totalRevenue), color: COLORS.textDark },
    { label: 'Beban Pokok (HPP)', val: cleanRp(data.totalCOGS), color: COLORS.textDark },
    { label: 'Laba Kotor', val: cleanRp(data.grossProfit), color: COLORS.accentGreen },
    { label: 'Laba Bersih', val: cleanRp(data.netProfit), color: data.netProfit >= 0 ? COLORS.accentGreen : COLORS.accentRed },
  ];

  cards.forEach((c, idx) => {
    const cardX = left + idx * (cardWidth + 6);
    doc.rect(cardX, y, cardWidth, 46).fillAndStroke(COLORS.bgRowAlt, COLORS.borderColor);
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLORS.textMuted);
    doc.text(c.label.toUpperCase(), cardX + 8, y + 8, { width: cardWidth - 16 });
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor(c.color);
    doc.text(c.val, cardX + 8, y + 24, { width: cardWidth - 16 });
  });

  y += 62;

  // 2. Waterfall Statement Table
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.primary);
  doc.text('RINCIAN STRUKTUR LABA RUGI (WATERFALL STATEMENT)', left, y);
  y += 16;

  // Table header
  doc.rect(left, y, contentWidth, 20).fill(COLORS.bgHeader);
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.white);
  doc.text('Komponen Keuangan', left + 12, y + 6);
  doc.text('Nominal (Rupiah)', left + contentWidth - 160, y + 6, { width: 148, align: 'right' });
  y += 20;

  const rows = [
    { label: '1. Total Pendapatan Penjualan (Revenue / Net Sales)', val: cleanRp(data.totalRevenue), isBold: true, isTotal: false, indent: 0 },
    { label: '2. Beban Pokok Penjualan (HPP / Biaya Pokok Produk)', val: `(${cleanRp(data.totalCOGS)})`, isBold: false, isTotal: false, indent: 14 },
    { label: 'LABA KOTOR (GROSS PROFIT)', val: cleanRp(data.grossProfit), isBold: true, isTotal: true, indent: 0, color: COLORS.accentGreen },
    { label: '3. Beban Pengeluaran Operasional (Listrik, Bahan, Gaji, dll)', val: `(${cleanRp(data.totalExpenses)})`, isBold: false, isTotal: false, indent: 14 },
    { label: 'LABA BERSIH OPERASIONAL (NET PROFIT)', val: cleanRp(data.netProfit), isBold: true, isTotal: true, indent: 0, color: data.netProfit >= 0 ? COLORS.accentGreen : COLORS.accentRed },
  ];

  rows.forEach((row, idx) => {
    const rowHeight = row.isTotal ? 26 : 22;
    const bg = row.isTotal ? '#EFEAE1' : idx % 2 === 1 ? COLORS.bgRowAlt : COLORS.white;
    doc.rect(left, y, contentWidth, rowHeight).fill(bg);
    doc.strokeColor(COLORS.borderColor).lineWidth(0.5).moveTo(left, y + rowHeight).lineTo(left + contentWidth, y + rowHeight).stroke();

    const font = row.isBold ? 'Helvetica-Bold' : 'Helvetica';
    const fontSize = row.isTotal ? 9.5 : 8.5;
    const color = row.color || COLORS.textDark;

    doc.font(font).fontSize(fontSize).fillColor(color);
    doc.text(row.label, left + 12 + row.indent, y + (rowHeight / 2 - 4.5));
    doc.text(row.val, left + contentWidth - 160, y + (rowHeight / 2 - 4.5), { width: 148, align: 'right' });

    y += rowHeight;
  });

  y += 24;

  // Summary Note Box
  doc.rect(left, y, contentWidth, 42).fillAndStroke('#FAF6EE', '#E2D9CA');
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.secondary);
  doc.text('Catatan Analisa Performa:', left + 12, y + 9);
  doc.font('Helvetica').fontSize(8).fillColor(COLORS.textDark);
  const analysisText = `Dengan total omset ${cleanRp(data.totalRevenue)}, kedai menghasilkan laba kotor ${cleanRp(data.grossProfit)} dan laba bersih sebesar ${cleanRp(data.netProfit)} dengan marjin laba bersih ${data.netMargin}%.`;
  doc.text(analysisText, left + 12, y + 22, { width: contentWidth - 24 });

  applyFooters(doc);
  doc.end();
  return promise;
}

// ============================================================================
// 3. LAPORAN PENGELUARAN (EXPENSES REPORT)
// ============================================================================
export interface ExpensePdfRow {
  expense: {
    id: string;
    expenseDate: number;
    description: string;
    paymentMethod: string;
    amount: number;
  };
  outlet?: { name: string } | null;
}

export async function generateExpensesPdf(
  rows: ExpensePdfRow[],
  meta: {
    outletName: string;
    periodLabel: string;
    printedAt: string;
  }
): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 36, size: 'A4', bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on('data', (c) => chunks.push(c));

  const promise = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const totalAmount = rows.reduce((acc, r) => acc + r.expense.amount, 0);

  let y = drawHeader(doc, 'Laporan Pengeluaran Toko', [
    { label: 'Cabang Outlet', value: meta.outletName },
    { label: 'Periode Laporan', value: meta.periodLabel },
    { label: 'Jumlah Item', value: `${rows.length} transaksi` },
    { label: 'Total Kas Keluar', value: cleanRp(totalAmount) },
  ]);

  const left = 36;
  const contentWidth = 523;

  const cols = [
    { label: 'No', width: 25, align: 'center' as const },
    { label: 'ID Biaya', width: 80, align: 'left' as const },
    { label: 'Tanggal', width: 80, align: 'left' as const },
    { label: 'Cabang', width: 75, align: 'left' as const },
    { label: 'Keterangan Pengeluaran', width: 143, align: 'left' as const },
    { label: 'Metode', width: 50, align: 'left' as const },
    { label: 'Nominal (Rp)', width: 70, align: 'right' as const },
  ];

  const drawTableHeader = (currY: number) => {
    doc.rect(left, currY, contentWidth, 18).fill(COLORS.bgHeader);
    let curX = left;
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLORS.white);
    cols.forEach((col) => {
      doc.text(col.label, curX + 2, currY + 5, { width: col.width - 4, align: col.align });
      curX += col.width;
    });
    return currY + 18;
  };

  y = drawTableHeader(y);

  rows.forEach((r, idx) => {
    if (y > doc.page.height - 55) {
      doc.addPage();
      y = drawTableHeader(36);
    }

    const isAlt = idx % 2 === 1;
    if (isAlt) {
      doc.rect(left, y, contentWidth, 16).fill(COLORS.bgRowAlt);
    }

    doc.strokeColor(COLORS.borderColor).lineWidth(0.5).moveTo(left, y + 16).lineTo(left + contentWidth, y + 16).stroke();

    let curX = left;
    const dateStr = new Date(r.expense.expenseDate * 1000).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.textDark);

    // No
    doc.text(String(idx + 1), curX + 2, y + 4.5, { width: cols[0].width - 4, align: cols[0].align });
    curX += cols[0].width;

    // ID
    doc.font('Helvetica-Bold').text(r.expense.id, curX + 2, y + 4.5, { width: cols[1].width - 4, align: cols[1].align });
    curX += cols[1].width;

    // Tanggal
    doc.font('Helvetica').text(dateStr, curX + 2, y + 4.5, { width: cols[2].width - 4, align: cols[2].align });
    curX += cols[2].width;

    // Cabang
    doc.text(r.outlet?.name || 'Pusat', curX + 2, y + 4.5, { width: cols[3].width - 4, align: cols[3].align });
    curX += cols[3].width;

    // Keterangan
    doc.text(r.expense.description, curX + 2, y + 4.5, { width: cols[4].width - 4, align: cols[4].align, lineBreak: false });
    curX += cols[4].width;

    // Metode
    doc.text(r.expense.paymentMethod.toUpperCase(), curX + 2, y + 4.5, { width: cols[5].width - 4, align: cols[5].align });
    curX += cols[5].width;

    // Nominal
    doc.font('Helvetica-Bold').fillColor(COLORS.accentRed).text(cleanRp(r.expense.amount), curX + 2, y + 4.5, { width: cols[6].width - 4, align: cols[6].align });

    y += 16;
  });

  if (y > doc.page.height - 55) {
    doc.addPage();
    y = 36;
  }
  doc.rect(left, y, contentWidth, 20).fill('#EDE8DF');
  doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.primary);
  doc.text('TOTAL PENGELUARAN OPERASIONAL', left + 10, y + 6);
  doc.fillColor(COLORS.accentRed).text(cleanRp(totalAmount), left + contentWidth - 130, y + 6, { width: 120, align: 'right' });

  applyFooters(doc);
  doc.end();
  return promise;
}
