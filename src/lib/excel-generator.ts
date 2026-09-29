import ExcelJS from 'exceljs';
import { formatDate, formatDateTime } from './utils';

const BRAND_DARK = 'FF201C1A';
const BORDER_COLOR = 'FFE5DFD5';
const BG_ALT = 'FFFAF8F5';
const ACCENT_GREEN = 'FF2D7A47';
const ACCENT_RED = 'FF964B3B';

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: BORDER_COLOR } },
  bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
  left: { style: 'thin', color: { argb: BORDER_COLOR } },
  right: { style: 'thin', color: { argb: BORDER_COLOR } },
};

/**
 * Generate Excel (.xlsx) Report for Orders / Penjualan
 */
export async function generateOrdersExcel(
  rows: any[],
  meta: {
    outletName: string;
    periodLabel: string;
    statusLabel?: string;
    printedAt: string;
  }
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Kopi Seruni POS';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Penjualan', {
    views: [{ showGridLines: true }],
  });

  // 1. Header Information
  worksheet.addRow(['TOKO KOPI SERUNI — LAPORAN PENJUALAN']);
  worksheet.getRow(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: BRAND_DARK } };

  worksheet.addRow([
    `Cabang Outlet: ${meta.outletName}  |  Periode: ${meta.periodLabel}  |  ${meta.statusLabel || 'Semua Status'}  |  Dicetak: ${meta.printedAt}`,
  ]);
  worksheet.getRow(2).font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF7A7268' } };

  worksheet.addRow([]); // Blank spacer

  // 2. Table Column Definitions
  const startRow = 4;
  worksheet.getRow(startRow).values = [
    'No Struk',
    'Waktu Transaksi',
    'Cabang Outlet',
    'Kasir',
    'Pelanggan',
    'Subtotal (Rp)',
    'Diskon (Rp)',
    'PPN (Rp)',
    'Total (Rp)',
    'Metode Bayar',
    'Status',
  ];

  const headerRow = worksheet.getRow(startRow);
  headerRow.height = 26;
  headerRow.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_DARK } };
    cell.border = THIN_BORDER;
  });

  // 3. Data Rows
  let totalSubtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;
  let totalFinal = 0;

  rows.forEach((r, idx) => {
    const o = r.order;
    const subtotal = Number(o.subtotal || 0);
    const discount = Number(o.discountAmount || 0);
    const tax = Number(o.taxAmount || 0);
    const total = Number(o.total || 0);

    totalSubtotal += subtotal;
    totalDiscount += discount;
    totalTax += tax;
    totalFinal += total;

    const row = worksheet.addRow([
      o.id,
      formatDateTime(o.createdAt),
      r.outlet?.name || 'Pusat',
      r.user?.name || 'Kasir',
      o.customerName || 'Walk-in',
      subtotal,
      discount,
      tax,
      total,
      String(o.paymentMethod || '').toUpperCase(),
      String(o.status || '').toUpperCase(),
    ]);

    row.height = 20;
    row.font = { name: 'Calibri', size: 10 };
    row.alignment = { vertical: 'middle' };

    // Format numbers
    [6, 7, 8, 9].forEach((colIdx) => {
      const cell = row.getCell(colIdx);
      cell.numFmt = '#,##0';
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
    });

    // Format IDs & Dates
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(10).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(11).alignment = { vertical: 'middle', horizontal: 'center' };

    // Alternating background
    const isAlt = idx % 2 === 1;
    row.eachCell((cell) => {
      cell.border = THIN_BORDER;
      if (isAlt) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BG_ALT } };
      }
    });
  });

  // 4. Summary / Total Row
  const totalRow = worksheet.addRow([
    'TOTAL',
    '',
    '',
    '',
    `${rows.length} Transaksi`,
    totalSubtotal,
    totalDiscount,
    totalTax,
    totalFinal,
    '',
    '',
  ]);

  totalRow.height = 24;
  totalRow.font = { name: 'Calibri', size: 10, bold: true, color: { argb: BRAND_DARK } };
  totalRow.alignment = { vertical: 'middle' };

  [6, 7, 8, 9].forEach((colIdx) => {
    const cell = totalRow.getCell(colIdx);
    cell.numFmt = '#,##0';
    cell.alignment = { vertical: 'middle', horizontal: 'right' };
  });

  totalRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin', color: { argb: BRAND_DARK } },
      bottom: { style: 'double', color: { argb: BRAND_DARK } },
    };
  });

  // 5. Adjust column widths
  worksheet.columns = [
    { width: 18 }, // No Struk
    { width: 22 }, // Waktu
    { width: 22 }, // Outlet
    { width: 16 }, // Kasir
    { width: 20 }, // Pelanggan
    { width: 16 }, // Subtotal
    { width: 14 }, // Diskon
    { width: 14 }, // PPN
    { width: 18 }, // Total
    { width: 16 }, // Metode
    { width: 14 }, // Status
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Generate Excel (.xlsx) Report for Expenses / Pengeluaran
 */
export async function generateExpensesExcel(
  rows: any[],
  meta: {
    outletName: string;
    periodLabel: string;
    printedAt: string;
  }
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Kopi Seruni POS';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Pengeluaran', {
    views: [{ showGridLines: true }],
  });

  // 1. Header Information
  worksheet.addRow(['TOKO KOPI SERUNI — LAPORAN PENGELUARAN OPERASIONAL']);
  worksheet.getRow(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: BRAND_DARK } };

  worksheet.addRow([
    `Cabang Outlet: ${meta.outletName}  |  Periode: ${meta.periodLabel}  |  Dicetak: ${meta.printedAt}`,
  ]);
  worksheet.getRow(2).font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF7A7268' } };

  worksheet.addRow([]); // Blank spacer

  // 2. Table Column Definitions
  const startRow = 4;
  worksheet.getRow(startRow).values = [
    'ID Pengeluaran',
    'Tanggal',
    'Cabang Outlet',
    'Kategori',
    'Keterangan',
    'Metode Bayar',
    'Nominal (Rp)',
  ];

  const headerRow = worksheet.getRow(startRow);
  headerRow.height = 26;
  headerRow.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_DARK } };
    cell.border = THIN_BORDER;
  });

  // 3. Data Rows
  let totalExpenses = 0;

  rows.forEach((r, idx) => {
    const e = r.expense;
    const amount = Number(e.amount || 0);
    totalExpenses += amount;

    const row = worksheet.addRow([
      e.id,
      formatDate(e.expenseDate),
      r.outlet?.name || 'Pusat',
      r.category?.name || 'Umum',
      e.description,
      String(e.paymentMethod || '').toUpperCase(),
      amount,
    ]);

    row.height = 20;
    row.font = { name: 'Calibri', size: 10 };
    row.alignment = { vertical: 'middle' };

    // Format number
    const amountCell = row.getCell(7);
    amountCell.numFmt = '#,##0';
    amountCell.alignment = { vertical: 'middle', horizontal: 'right' };

    // Format center cells
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };

    // Alternating background
    const isAlt = idx % 2 === 1;
    row.eachCell((cell) => {
      cell.border = THIN_BORDER;
      if (isAlt) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BG_ALT } };
      }
    });
  });

  // 4. Summary / Total Row
  const totalRow = worksheet.addRow([
    'TOTAL PENGELUARAN',
    '',
    '',
    '',
    `${rows.length} Transaksi`,
    '',
    totalExpenses,
  ]);

  totalRow.height = 24;
  totalRow.font = { name: 'Calibri', size: 10, bold: true, color: { argb: BRAND_DARK } };
  totalRow.alignment = { vertical: 'middle' };

  const totalAmountCell = totalRow.getCell(7);
  totalAmountCell.numFmt = '#,##0';
  totalAmountCell.alignment = { vertical: 'middle', horizontal: 'right' };

  totalRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin', color: { argb: BRAND_DARK } },
      bottom: { style: 'double', color: { argb: BRAND_DARK } },
    };
  });

  // 5. Adjust column widths
  worksheet.columns = [
    { width: 18 }, // ID
    { width: 16 }, // Tanggal
    { width: 22 }, // Outlet
    { width: 20 }, // Kategori
    { width: 34 }, // Keterangan
    { width: 16 }, // Metode Bayar
    { width: 20 }, // Nominal
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Generate Excel (.xlsx) Report for Profit & Loss / Laba Rugi
 */
export async function generateProfitLossExcel(
  data: {
    totalRevenue: number;
    totalCOGS: number;
    grossProfit: number;
    totalExpenses: number;
    netProfit: number;
    netMargin: string;
  },
  meta: {
    outletName: string;
    periodLabel: string;
    printedAt: string;
  }
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Kopi Seruni POS';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Laba Rugi', {
    views: [{ showGridLines: true }],
  });

  // 1. Header Information
  worksheet.addRow(['TOKO KOPI SERUNI — LAPORAN LABA RUGI']);
  worksheet.getRow(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: BRAND_DARK } };

  worksheet.addRow([
    `Cabang Outlet: ${meta.outletName}  |  Periode: ${meta.periodLabel}  |  Dicetak: ${meta.printedAt}`,
  ]);
  worksheet.getRow(2).font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF7A7268' } };

  worksheet.addRow([]); // Blank spacer

  // 2. Table Column Definitions
  const startRow = 4;
  worksheet.getRow(startRow).values = ['Komponen Keuangan', 'Nominal (Rp)', 'Rasio Omset'];

  const headerRow = worksheet.getRow(startRow);
  headerRow.height = 26;
  headerRow.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_DARK } };
    cell.border = THIN_BORDER;
  });

  // Percentages relative to revenue
  const rev = data.totalRevenue || 1;
  const cogsPct = ((data.totalCOGS / rev) * 100).toFixed(1);
  const grossPct = ((data.grossProfit / rev) * 100).toFixed(1);
  const expPct = ((data.totalExpenses / rev) * 100).toFixed(1);

  const items = [
    { label: '1. Total Penjualan Bersih (Net Revenue / Omset)', amount: data.totalRevenue, pct: '100.0%', bold: false },
    { label: '2. Beban Pokok Penjualan (HPP / COGS)', amount: data.totalCOGS, pct: `${cogsPct}%`, bold: false },
    { label: '3. LABA KOTOR (GROSS PROFIT)', amount: data.grossProfit, pct: `${grossPct}%`, bold: true, color: ACCENT_GREEN },
    { label: '4. Beban Operasional Toko (Expenses)', amount: data.totalExpenses, pct: `${expPct}%`, bold: false },
    {
      label: '5. LABA BERSIH (NET PROFIT)',
      amount: data.netProfit,
      pct: `${data.netMargin}%`,
      bold: true,
      color: data.netProfit >= 0 ? ACCENT_GREEN : ACCENT_RED,
    },
  ];

  items.forEach((item) => {
    const row = worksheet.addRow([item.label, item.amount, item.pct]);
    row.height = 24;
    row.font = {
      name: 'Calibri',
      size: 10,
      bold: item.bold,
      color: item.color ? { argb: item.color } : { argb: BRAND_DARK },
    };
    row.alignment = { vertical: 'middle' };

    const amountCell = row.getCell(2);
    amountCell.numFmt = '#,##0';
    amountCell.alignment = { vertical: 'middle', horizontal: 'right' };

    const pctCell = row.getCell(3);
    pctCell.alignment = { vertical: 'middle', horizontal: 'center' };

    row.eachCell((cell) => {
      cell.border = THIN_BORDER;
      if (item.bold) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BG_ALT } };
      }
    });
  });

  // Adjust column widths
  worksheet.columns = [
    { width: 44 }, // Komponen Keuangan
    { width: 24 }, // Nominal (Rp)
    { width: 16 }, // Rasio
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Generate Excel (.xlsx) Report for Cashier Shifts / Rekap Shift Kasir
 */
export async function generateShiftsExcel(
  rows: any[],
  meta: {
    outletName: string;
    periodLabel: string;
    statusLabel?: string;
    printedAt: string;
  }
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Kopi Seruni POS';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Rekap Shift Kasir', {
    views: [{ showGridLines: true }],
  });

  // 1. Header Information
  worksheet.addRow(['TOKO KOPI SERUNI — LAPORAN REKAP SHIFT KASIR']);
  worksheet.getRow(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: BRAND_DARK } };

  worksheet.addRow([
    `Cabang Outlet: ${meta.outletName}  |  Periode: ${meta.periodLabel}  |  ${meta.statusLabel || 'Semua Status'}  |  Dicetak: ${meta.printedAt}`,
  ]);
  worksheet.getRow(2).font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF7A7268' } };

  worksheet.addRow([]); // Blank spacer

  // 2. Table Column Definitions
  const startRow = 4;
  worksheet.getRow(startRow).values = [
    'ID Shift',
    'Cabang Outlet',
    'Petugas Kasir',
    'Waktu Buka',
    'Waktu Tutup',
    'Status',
    'Modal Awal (Rp)',
    'Target Kas (Rp)',
    'Kas Fisik (Rp)',
    'Selisih (Rp)',
    'Catatan / Alasan Selisih',
  ];

  const headerRow = worksheet.getRow(startRow);
  headerRow.height = 26;
  headerRow.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_DARK } };
    cell.border = THIN_BORDER;
  });

  // 3. Add Data Rows
  let totalOpening = 0;
  let totalExpected = 0;
  let totalClosing = 0;
  let totalDiff = 0;

  rows.forEach((r, idx) => {
    const s = r.shift || r;
    const outletName = r.outlet?.name || s.outletName || meta.outletName;
    const kasirName = r.user?.name || r.kasir?.name || s.kasirName || 'Kasir';
    const isClosed = !!s.closedAt;
    const statusText = isClosed ? 'Selesai' : 'Sedang Berjalan';
    const diff = isClosed && s.closingCash != null && s.expectedCash != null
      ? s.closingCash - s.expectedCash
      : 0;

    totalOpening += s.openingCash || 0;
    if (s.expectedCash != null) totalExpected += s.expectedCash;
    if (s.closingCash != null) totalClosing += s.closingCash;
    if (isClosed) totalDiff += diff;

    const rowData = [
      s.id,
      outletName,
      kasirName,
      formatDateTime(s.openedAt),
      s.closedAt ? formatDateTime(s.closedAt) : 'Sedang Berjalan',
      statusText,
      s.openingCash || 0,
      s.expectedCash != null ? s.expectedCash : '-',
      s.closingCash != null ? s.closingCash : '-',
      isClosed ? diff : '-',
      s.notes || '-',
    ];

    const row = worksheet.addRow(rowData);
    row.height = 20;
    row.font = { name: 'Calibri', size: 9 };
    row.alignment = { vertical: 'middle' };

    // Align numbers to right & format
    [7, 8, 9, 10].forEach((colIdx) => {
      const cell = row.getCell(colIdx);
      if (typeof cell.value === 'number') {
        cell.numFmt = '#,##0';
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      }
    });

    // Colorize diff
    if (isClosed && diff !== 0) {
      const diffCell = row.getCell(10);
      diffCell.font = {
        name: 'Calibri',
        size: 9,
        bold: true,
        color: { argb: diff > 0 ? ACCENT_GREEN : ACCENT_RED },
      };
    }

    // Zebra striping
    const isAlt = idx % 2 === 1;
    row.eachCell((cell) => {
      cell.border = THIN_BORDER;
      if (isAlt) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BG_ALT } };
      }
    });
  });

  // 4. Total Summary Row
  const totalRow = worksheet.addRow([
    'TOTAL KESELURUHAN',
    '',
    '',
    '',
    '',
    `${rows.length} Sesi`,
    totalOpening,
    totalExpected,
    totalClosing,
    totalDiff,
    '',
  ]);

  totalRow.height = 24;
  totalRow.font = { name: 'Calibri', size: 10, bold: true, color: { argb: BRAND_DARK } };
  totalRow.alignment = { vertical: 'middle' };

  [7, 8, 9, 10].forEach((colIdx) => {
    const cell = totalRow.getCell(colIdx);
    cell.numFmt = '#,##0';
    cell.alignment = { vertical: 'middle', horizontal: 'right' };
  });

  totalRow.eachCell((cell) => {
    cell.border = THIN_BORDER;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEAE2' } };
  });

  // 5. Adjust column widths
  worksheet.columns = [
    { width: 18 }, // ID Shift
    { width: 22 }, // Outlet
    { width: 16 }, // Kasir
    { width: 20 }, // Buka
    { width: 20 }, // Tutup
    { width: 16 }, // Status
    { width: 16 }, // Modal Awal
    { width: 16 }, // Target Kas
    { width: 16 }, // Kas Fisik
    { width: 16 }, // Selisih
    { width: 30 }, // Catatan
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
