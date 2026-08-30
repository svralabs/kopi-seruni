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

/** Parse searchParams (period, from, to) menjadi rentang UNIX epoch & label teks */
export function getDateRangeFromParams(params?: {
  period?: string;
  from?: string | number;
  to?: string | number;
}): {
  startEpoch: number;
  endEpoch: number;
  label: string;
} {
  const now = new Date();
  const period = params?.period || 'today';

  if (period === 'custom') {
    let startEpoch = 0;
    let endEpoch = Math.floor(Date.now() / 1000);

    if (params?.from) {
      const fromVal = Number(params.from);
      if (!isNaN(fromVal) && fromVal > 1000000000) {
        startEpoch = fromVal;
      } else {
        startEpoch = Math.floor(new Date(String(params.from) + 'T00:00:00').getTime() / 1000);
      }
    }

    if (params?.to) {
      const toVal = Number(params.to);
      if (!isNaN(toVal) && toVal > 1000000000) {
        endEpoch = toVal;
      } else {
        endEpoch = Math.floor(new Date(String(params.to) + 'T23:59:59').getTime() / 1000);
      }
    }

    const fromDateStr = startEpoch > 0 ? formatDate(startEpoch) : '';
    const toDateStr = endEpoch > 0 ? formatDate(endEpoch) : '';
    const label = fromDateStr && toDateStr ? `${fromDateStr} - ${toDateStr}` : 'Kustom';

    return { startEpoch, endEpoch, label };
  }

  if (period === 'today') {
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    return {
      startEpoch: Math.floor(startOfDay.getTime() / 1000),
      endEpoch: Math.floor(endOfDay.getTime() / 1000),
      label: 'Hari Ini',
    };
  }

  if (period === '7d') {
    const startOf7d = new Date(now.getTime() - 7 * 86400 * 1000);
    return {
      startEpoch: Math.floor(startOf7d.getTime() / 1000),
      endEpoch: Math.floor(now.getTime() / 1000),
      label: 'Minggu Ini (7 Hari)',
    };
  }

  if (period === 'this_month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    return {
      startEpoch: Math.floor(startOfMonth.getTime() / 1000),
      endEpoch: Math.floor(now.getTime() / 1000),
      label: now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
    };
  }

  if (period === 'all') {
    return {
      startEpoch: 0,
      endEpoch: 0,
      label: 'Semua Periode',
    };
  }

  if (period === '30d') {
    const startOf30d = new Date(now.getTime() - 30 * 86400 * 1000);
    return {
      startEpoch: Math.floor(startOf30d.getTime() / 1000),
      endEpoch: Math.floor(now.getTime() / 1000),
      label: '30 Hari Terakhir',
    };
  }

  return {
    startEpoch: 0,
    endEpoch: 0,
    label: 'Semua Periode',
  };
}

