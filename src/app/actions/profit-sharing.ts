'use server';
import { db } from '@/lib/db';
import { profitSharingRules, profitSharingLedger } from '@/lib/schema';
import { requireRole } from '@/lib/auth-helpers';
import { calcShare } from '@/lib/utils';
import { eq, and } from 'drizzle-orm';

/**
 * Generate bagi hasil untuk periode tertentu.
 * - Ambil semua rule aktif untuk outlet
 * - Hitung share_amount = Math.floor(netProfit * percentage / 100)
 * - Insert ke ledger, 1 row per rule
 */
export async function generateProfitSharing(
  outletId: string,
  periodStart: number, // unixepoch
  periodEnd: number,   // unixepoch
  netProfit: number,   // integer rupiah — diambil dari kalkulasi L/R
) {
  await requireRole(outletId, ['owner']);

  const rules = await db
    .select()
    .from(profitSharingRules)
    .where(and(
      eq(profitSharingRules.outletId, outletId),
      eq(profitSharingRules.isActive, 1),
    ));

  if (rules.length === 0) throw new Error('Tidak ada rule bagi hasil aktif');

  const now = Math.floor(Date.now() / 1000);

  const entries = rules.map((rule) => ({
    id: `psl_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`,
    outletId,
    ruleId: rule.id,
    periodStart,
    periodEnd,
    netProfit,
    shareAmount: calcShare(netProfit, rule.percentage),
    status: 'pending' as const,
    createdAt: now,
  }));

  await db.insert(profitSharingLedger).values(entries);

  return entries.map((e) => ({
    name: rules.find((r) => r.id === e.ruleId)!.name,
    percentage: rules.find((r) => r.id === e.ruleId)!.percentage,
    shareAmount: e.shareAmount,
  }));
}

export async function markSharePaid(ledgerId: string, outletId: string) {
  await requireRole(outletId, ['owner']);
  const now = Math.floor(Date.now() / 1000);
  await db
    .update(profitSharingLedger)
    .set({ status: 'paid', paidAt: now })
    .where(eq(profitSharingLedger.id, ledgerId));
  return { success: true };
}
