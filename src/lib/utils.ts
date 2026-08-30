/** Money helpers — semua nominal uang dalam integer rupiah */

/** Format integer rupiah → "Rp 25.000" */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

/** Hitung diskon — selalu Math.floor, tidak ada float */
export function calcDiscount(subtotal: number, type: 'percentage' | 'fixed', value: number): number {
  if (type === 'fixed') return Math.min(value, subtotal);
  return Math.floor(subtotal * value / 100);
}

/** Hitung pajak — selalu Math.floor */
export function calcTax(afterDiscount: number, taxRate: number): number {
  return Math.floor(afterDiscount * taxRate / 100);
}

/** Hitung total final */
export function calcTotal(subtotal: number, discountAmount: number, taxAmount: number): number {
  return subtotal - discountAmount + taxAmount;
}

/** Hitung bagi hasil — selalu Math.floor */
export function calcShare(netProfit: number, percentage: number): number {
  return Math.floor(netProfit * percentage / 100);
}

/** Unix epoch (seconds) → Date object */
export function fromUnix(epoch: number): Date {
  return new Date(epoch * 1000);
}

/** Date → Unix epoch (seconds) */
export function toUnix(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

/** Format unix epoch → tanggal lokal Indonesia */
export function formatDate(epoch: number): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(fromUnix(epoch));
}

/** Format unix epoch → waktu lokal Indonesia */
export function formatDateTime(epoch: number): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(fromUnix(epoch));
}
