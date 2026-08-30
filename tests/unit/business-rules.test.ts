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
});
