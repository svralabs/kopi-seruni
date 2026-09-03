import { describe, it, expect } from 'bun:test';
import { generateOrdersPdf, generateProfitLossPdf, generateExpensesPdf } from '@/lib/pdf-generator';

describe('Unit Test: Server-Side PDF Generator', () => {
  it('should generate valid PDF for Orders report with correct magic bytes', async () => {
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

    const buf = await generateOrdersPdf(dummyOrders, {
      outletName: 'Outlet Pusat',
      periodLabel: 'Hari Ini',
      statusLabel: 'Semua Status',
      printedAt: '3 Sep 2026, 14:00',
    });

    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(1000);
    // PDF Magic Header: "%PDF-"
    const magic = buf.subarray(0, 5).toString('ascii');
    expect(magic).toBe('%PDF-');
  });

  it('should generate valid PDF for Profit & Loss Statement report', async () => {
    const plData = {
      totalRevenue: 25000000,
      totalCOGS: 9500000,
      grossProfit: 15500000,
      totalExpenses: 4200000,
      netProfit: 11300000,
      netMargin: '45.2',
    };

    const buf = await generateProfitLossPdf(plData, {
      outletName: 'Semua Cabang',
      periodLabel: 'Bulan Ini',
      printedAt: '3 Sep 2026, 14:00',
    });

    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(1000);
    const magic = buf.subarray(0, 5).toString('ascii');
    expect(magic).toBe('%PDF-');
  });

  it('should generate valid PDF for Expenses report with empty and filled rows', async () => {
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
      },
    ];

    const buf = await generateExpensesPdf(dummyExpenses, {
      outletName: 'Dago',
      periodLabel: 'Minggu Ini',
      printedAt: '3 Sep 2026, 14:00',
    });

    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(1000);
    const magic = buf.subarray(0, 5).toString('ascii');
    expect(magic).toBe('%PDF-');
  });

  it('should accept and process filtered query parameters in export routes', async () => {
    const { NextRequest } = await import('next/server');
    const { GET: getOrders } = await import('@/app/api/export/orders/route');
    const { GET: getPL } = await import('@/app/api/export/profit-loss/route');
    const { GET: getExpenses } = await import('@/app/api/export/expenses/route');

    const ordersReq = new NextRequest('http://localhost:3000/api/export/orders?format=pdf&period=7d&status=completed&payment=qris&q=test');
    const ordersRes = await getOrders(ordersReq);
    expect(ordersRes.status).toBe(200);
    expect(ordersRes.headers.get('Content-Type')).toBe('application/pdf');

    const plReq = new NextRequest('http://localhost:3000/api/export/profit-loss?format=pdf&period=30d&outletId=out_default');
    const plRes = await getPL(plReq);
    expect(plRes.status).toBe(200);
    expect(plRes.headers.get('Content-Type')).toBe('application/pdf');

    const expReq = new NextRequest('http://localhost:3000/api/export/expenses?format=pdf&period=this_month&q=kopi');
    const expRes = await getExpenses(expReq);
    expect(expRes.status).toBe(200);
    expect(expRes.headers.get('Content-Type')).toBe('application/pdf');
  });
});
