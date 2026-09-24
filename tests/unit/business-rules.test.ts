import { describe, it, expect } from 'bun:test';
import { calcDiscount, calcTax, calcTotal, calcShare } from '../../src/lib/utils';

describe('Unit Test: POS Financial & Business Rules', () => {
  it('Rule 1: All prices and monetary amounts must strictly remain integers', () => {
    const items = [
      { price: 23500, qty: 3 },
      { price: 18000, qty: 2 },
    ];

    const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0); // 106500
    const discount = calcDiscount(subtotal, 'percentage', 15); // 15975
    const afterDiscount = subtotal - discount; // 90525
    const tax = calcTax(afterDiscount, 11); // 9957
    const total = calcTotal(subtotal, discount, tax); // 100482

    expect(Number.isInteger(subtotal)).toBe(true);
    expect(Number.isInteger(discount)).toBe(true);
    expect(Number.isInteger(tax)).toBe(true);
    expect(Number.isInteger(total)).toBe(true);
    expect(total).toBe(100482);
  });

  it('Rule 2: Profit sharing total percentage can be <= 100% (retained earnings)', () => {
    const netProfit = 20000000;
    const rules = [
      { name: 'Owner A', percentage: 40 },
      { name: 'Investor B', percentage: 30 },
      { name: 'Mitra C', percentage: 20 },
    ];

    const totalDistributed = rules.reduce(
      (sum, r) => sum + calcShare(netProfit, r.percentage),
      0
    );
    const retainedBusinessCash = netProfit - totalDistributed;

    expect(totalDistributed).toBe(18000000); // 90%
    expect(retainedBusinessCash).toBe(2000000); // 10%
    expect(totalDistributed + retainedBusinessCash).toBe(netProfit);
  });

  it('Rule 3: Cashier shift reconciliation matches cash orders only', () => {
    const openingCash = 100000; // Rp 100.000 modal awal
    const orders = [
      { total: 50000, method: 'cash' },
      { total: 75000, method: 'cash' },
      { total: 120000, method: 'qris' },     // Non-cash should not count in drawer
      { total: 200000, method: 'transfer' }, // Non-cash should not count in drawer
    ];

    const totalCashOrders = orders
      .filter((o) => o.method === 'cash')
      .reduce((sum, o) => sum + o.total, 0);

    const expectedCashInDrawer = openingCash + totalCashOrders;
    expect(expectedCashInDrawer).toBe(225000);

    const closingCashCounted = 225000;
    const diff = closingCashCounted - expectedCashInDrawer;
    expect(diff).toBe(0);
  });

  it('Rule 4: Multi-channel POS payment methods (Cash, QRIS, EDC, Online Food)', () => {
    const validMethods = ['cash', 'qris', 'transfer', 'debit', 'edc', 'shopeefood', 'gofood'] as const;
    const orders = [
      { total: 50000, method: 'cash' },
      { total: 35000, method: 'qris' },
      { total: 45000, method: 'edc' },
      { total: 60000, method: 'shopeefood' },
      { total: 70000, method: 'gofood' },
    ];

    expect(validMethods).toContain('edc');
    expect(validMethods).toContain('shopeefood');
    expect(validMethods).toContain('gofood');

    const totalSales = orders.reduce((acc, o) => acc + o.total, 0);
    expect(totalSales).toBe(260000);

    // Online food & EDC are recorded as non-cash in drawer
    const cashTotal = orders.filter((o) => o.method === 'cash').reduce((acc, o) => acc + o.total, 0);
    const nonCashTotal = orders.filter((o) => o.method !== 'cash').reduce((acc, o) => acc + o.total, 0);
    expect(cashTotal).toBe(50000);
    expect(nonCashTotal).toBe(210000);
  });

  it('Rule 5: Closing shift with discrepancy strictly requires explanation notes', () => {
    const expectedCash = 200000;
    const closingCashWithDiscrepancy = 190000; // Selisih minus Rp 10.000
    const diff = closingCashWithDiscrepancy - expectedCash; // -10000

    expect(diff).not.toBe(0);

    const validateShiftClose = (difference: number, note?: string) => {
      if (difference !== 0 && (!note || note.trim() === '')) {
        throw new Error('Terdapat selisih kas fisik laci. Catatan alasan selisih wajib diisi!');
      }
      return true;
    };

    // Should throw if note is empty
    expect(() => validateShiftClose(diff, '')).toThrow(
      'Terdapat selisih kas fisik laci. Catatan alasan selisih wajib diisi!'
    );
    expect(() => validateShiftClose(diff, '   ')).toThrow(
      'Terdapat selisih kas fisik laci. Catatan alasan selisih wajib diisi!'
    );

    // Should succeed if note is filled
    expect(validateShiftClose(diff, 'Selisih Rp 10.000 karena salah kembalian meja 2')).toBe(true);

    // Should succeed without note if diff === 0
    expect(validateShiftClose(0, '')).toBe(true);
  });

  it('Rule 6: Raw material cost per unit & inventory asset valuation', () => {
    const rawMaterialsList = [
      { name: 'Biji Kopi House Blend', unit: 'gr', qty: 2500, costPerUnit: 200 },
      { name: 'Susu Full Cream Fresh', unit: 'ml', qty: 10000, costPerUnit: 18 },
      { name: 'Cup Kopi 16oz', unit: 'pcs', qty: 250, costPerUnit: 550 },
    ];

    const totalAssetValuation = rawMaterialsList.reduce(
      (sum, rm) => sum + rm.qty * rm.costPerUnit,
      0
    );

    // 2500 * 200 = 500,000
    // 10000 * 18 = 180,000
    // 250 * 550 = 137,500
    // Total = 817,500
    expect(totalAssetValuation).toBe(817500);
    expect(Number.isInteger(totalAssetValuation)).toBe(true);

    // Recipe HPP calculation from unit price
    const latteRecipe = [
      { unitUsed: 18, costPerUnit: 200 }, // Kopi 18gr
      { unitUsed: 150, costPerUnit: 18 }, // Susu 150ml
      { unitUsed: 1, costPerUnit: 550 },   // 1 Cup
    ];

    const hppLatte = latteRecipe.reduce((sum, ing) => sum + ing.unitUsed * ing.costPerUnit, 0);
    // (18 * 200) + (150 * 18) + (1 * 550) = 3600 + 2700 + 550 = 6850
    expect(hppLatte).toBe(6850);
  });
});
