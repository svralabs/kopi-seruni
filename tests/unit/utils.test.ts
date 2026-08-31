import { describe, it, expect } from 'bun:test';
import {
  formatRupiah,
  calcDiscount,
  calcTax,
  calcTotal,
  calcShare,
  toUnix,
  fromUnix,
  formatDate,
} from '../../src/lib/utils';

describe('Unit Test: Utility & Money Helpers', () => {
  describe('formatRupiah', () => {
    it('should format integer rupiah correctly', () => {
      const formatted = formatRupiah(25000);
      expect(formatted).toContain('25.000');
    });

    it('should format zero rupiah correctly', () => {
      const formatted = formatRupiah(0);
      expect(formatted).toContain('0');
    });
  });

  describe('calcDiscount (Integer Math)', () => {
    it('should calculate percentage discount using Math.floor', () => {
      // 10% from 25,000 = 2,500
      expect(calcDiscount(25000, 'percentage', 10)).toBe(2500);

      // 15% from 33,333 = 4,999.95 -> 4,999 (integer safe)
      expect(calcDiscount(33333, 'percentage', 15)).toBe(4999);
    });

    it('should calculate fixed discount correctly', () => {
      expect(calcDiscount(50000, 'fixed', 10000)).toBe(10000);
    });

    it('should cap fixed discount at subtotal if discount > subtotal', () => {
      expect(calcDiscount(5000, 'fixed', 10000)).toBe(5000);
    });
  });

  describe('calcTax (Integer Math)', () => {
    it('should calculate 11% PPN tax accurately using integer floor', () => {
      // 11% from 50,000 = 5,500
      expect(calcTax(50000, 11)).toBe(5500);

      // 11% from 25,000 = 2,750
      expect(calcTax(25000, 11)).toBe(2750);
    });
  });

  describe('calcTotal', () => {
    it('should calculate total = subtotal - discount + tax', () => {
      const subtotal = 50000;
      const discount = 5000;
      const afterDiscount = subtotal - discount; // 45000
      const tax = calcTax(afterDiscount, 11); // 4950
      const total = calcTotal(subtotal, discount, tax);

      expect(total).toBe(49950);
      expect(Number.isInteger(total)).toBe(true);
    });
  });

  describe('calcShare (Profit Sharing Math)', () => {
    it('should calculate partner share percentage accurately', () => {
      const netProfit = 15000000; // Rp 15.000.000

      // 40% = 6.000.000
      expect(calcShare(netProfit, 40)).toBe(6000000);

      // 30% = 4.500.000
      expect(calcShare(netProfit, 30)).toBe(4500000);

      // 20% = 3.000.000
      expect(calcShare(netProfit, 20)).toBe(3000000);
    });
  });

  describe('Date conversion & formatting helpers', () => {
    it('should convert Date to Unix timestamp and back', () => {
      const now = new Date('2026-08-30T12:00:00Z');
      const unix = toUnix(now);
      expect(typeof unix).toBe('number');

      const converted = fromUnix(unix);
      expect(converted.getTime()).toBe(Math.floor(now.getTime() / 1000) * 1000);
    });

    it('should format date and dateTime deterministically in WIB (UTC+7)', () => {
      // 1756598400 = 2025-08-31 00:00:00 UTC -> 07:00 WIB
      const epoch = 1756598400;
      const formatted = formatDate(epoch);
      expect(formatted).toBe('31 Agu 2025');
    });
  });
});
