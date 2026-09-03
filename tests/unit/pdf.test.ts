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
});
