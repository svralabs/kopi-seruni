import { describe, it, expect } from 'bun:test';
import { generateOrdersExcel, generateProfitLossExcel, generateExpensesExcel } from '@/lib/excel-generator';

describe('Unit Test: Server-Side Excel (.xlsx) Generator', () => {
  it('should generate valid XLSX for Orders report with ZIP magic bytes PK\\x03\\x04', async () => {
    const dummyOrders = [
      {
        order: {
          id: 'ord_test_01',
          createdAt: 1725350000,
          customerName: 'Budi Santoso',
          paymentMethod: 'qris',
          status: 'completed',
          subtotal: 50000,
          discountAmount: 5000,
          taxAmount: 4950,
          total: 49950,
        },
        outlet: { name: 'Outlet Pusat' },
        user: { name: 'Kasir Utama' },
      },
    ];

    const buf = await generateOrdersExcel(dummyOrders, {
      outletName: 'Outlet Pusat',
      periodLabel: 'Hari Ini',
      statusLabel: 'Semua Status',
      printedAt: '30 Sep 2026, 14:00',
    });

    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(1000);
    // ZIP / XLSX Magic Header: "PK\x03\x04"
    const magic = buf.subarray(0, 4).toString('binary');
    expect(magic).toBe('PK\x03\x04');
  });

  it('should generate valid XLSX for Profit & Loss Statement report', async () => {
    const plData = {
      totalRevenue: 25000000,
      totalCOGS: 9500000,
      grossProfit: 15500000,
      totalExpenses: 4200000,
      netProfit: 11300000,
      netMargin: '45.2',
    };

    const buf = await generateProfitLossExcel(plData, {
      outletName: 'Semua Cabang',
      periodLabel: 'Bulan Ini',
      printedAt: '30 Sep 2026, 14:00',
    });

    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(1000);
    const magic = buf.subarray(0, 4).toString('binary');
    expect(magic).toBe('PK\x03\x04');
  });

  it('should generate valid XLSX for Expenses report with rows', async () => {
    const dummyExpenses = [
      {
        expense: {
          id: 'exp_01',
          expenseDate: 1725350000,
          description: 'Beli Susu Segar & Gula Aren',
          paymentMethod: 'cash',
          amount: 350000,
        },
        outlet: { name: 'Dago' },
        category: { name: 'Bahan Baku' },
      },
    ];

    const buf = await generateExpensesExcel(dummyExpenses, {
      outletName: 'Dago',
      periodLabel: 'Minggu Ini',
      printedAt: '30 Sep 2026, 14:00',
    });

    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(1000);
    const magic = buf.subarray(0, 4).toString('binary');
    expect(magic).toBe('PK\x03\x04');
  });

  it('should return XLSX by default and with format=xlsx from export API routes', async () => {
    const { NextRequest } = await import('next/server');
    const { GET: getOrders } = await import('@/app/api/export/orders/route');
    const { GET: getPL } = await import('@/app/api/export/profit-loss/route');
    const { GET: getExpenses } = await import('@/app/api/export/expenses/route');

    const expectedMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    // 1. Orders Export Route
    const ordersReq = new NextRequest('http://localhost:3000/api/export/orders?format=xlsx&period=7d');
    const ordersRes = await getOrders(ordersReq);
    expect(ordersRes.status).toBe(200);
    expect(ordersRes.headers.get('Content-Type')).toBe(expectedMime);
    const ordersDisposition = ordersRes.headers.get('Content-Disposition') || '';
    expect(ordersDisposition).toContain('.xlsx');

    // 2. Profit & Loss Export Route (Default format)
    const plReq = new NextRequest('http://localhost:3000/api/export/profit-loss?period=30d');
    const plRes = await getPL(plReq);
    expect(plRes.status).toBe(200);
    expect(plRes.headers.get('Content-Type')).toBe(expectedMime);
    const plDisposition = plRes.headers.get('Content-Disposition') || '';
    expect(plDisposition).toContain('.xlsx');

    // 3. Expenses Export Route
    const expReq = new NextRequest('http://localhost:3000/api/export/expenses?format=xlsx&period=this_month');
    const expRes = await getExpenses(expReq);
    expect(expRes.status).toBe(200);
    expect(expRes.headers.get('Content-Type')).toBe(expectedMime);
    const expDisposition = expRes.headers.get('Content-Disposition') || '';
    expect(expDisposition).toContain('.xlsx');

    // 4. Shifts Export Route
    const { GET: getShifts } = await import('@/app/api/export/shifts/route');
    const shiftsReq = new NextRequest('http://localhost:3000/api/export/shifts?format=xlsx&period=7d');
    const shiftsRes = await getShifts(shiftsReq);
    expect(shiftsRes.status).toBe(200);
    expect(shiftsRes.headers.get('Content-Type')).toBe(expectedMime);
    const shiftsDisposition = shiftsRes.headers.get('Content-Disposition') || '';
    expect(shiftsDisposition).toContain('.xlsx');
  }, 15000);

  it('should generate valid XLSX for Shifts report with rows', async () => {
    const { generateShiftsExcel } = await import('@/lib/excel-generator');
    const dummyShifts = [
      {
        shift: {
          id: 'shf_01',
          openedAt: 1725350000,
          closedAt: 1725380000,
          openingCash: 100000,
          expectedCash: 350000,
          closingCash: 350000,
          notes: 'Shift pagi lancar',
        },
        outlet: { name: 'Outlet Pusat' },
        user: { name: 'Kasir Satu' },
      },
    ];

    const buf = await generateShiftsExcel(dummyShifts, {
      outletName: 'Outlet Pusat',
      periodLabel: 'Minggu Ini',
      statusLabel: 'Semua Status',
      printedAt: '30 Sep 2026, 14:00',
    });

    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(1000);
    const magic = buf.subarray(0, 4).toString('binary');
    expect(magic).toBe('PK\x03\x04');
  });
});
