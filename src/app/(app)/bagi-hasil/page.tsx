import { db } from '@/lib/db';
import { profitSharingRules, profitSharingLedger, outlets } from '@/lib/schema';
import BagiHasilClient from './bagi-hasil-client';
import { desc, eq } from 'drizzle-orm';

export default async function BagiHasilPage({
  searchParams,
}: {
  searchParams?: Promise<{ outletId?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const outletId = resolvedParams.outletId || 'out_default';

  let allOutlets: any[] = [];
  let rulesList: any[] = [];
  let ledgerList: any[] = [];

  try {
    allOutlets = await db.select().from(outlets);

    rulesList = await db
      .select()
      .from(profitSharingRules)
      .where(eq(profitSharingRules.outletId, outletId));

    const rawLedger = await db
      .select({
        ledger: profitSharingLedger,
        rule: profitSharingRules,
      })
      .from(profitSharingLedger)
      .leftJoin(profitSharingRules, eq(profitSharingLedger.ruleId, profitSharingRules.id))
      .where(eq(profitSharingLedger.outletId, outletId))
      .orderBy(desc(profitSharingLedger.createdAt));

    ledgerList = rawLedger.map((r) => ({
      ...r.ledger,
      ruleName: r.rule?.name || r.ledger.ruleId,
    }));
  } catch (e) {
    console.warn('Error fetching bagi hasil data:', e);
  }

  return (
    <BagiHasilClient
      rulesList={rulesList}
      ledgerList={ledgerList}
      outlets={allOutlets}
      currentOutletId={outletId}
    />
  );
}
