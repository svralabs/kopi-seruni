import { db } from '@/lib/db';
import { profitSharingRules, profitSharingLedger, outlets } from '@/lib/schema';
import { getOutlets, getProfitSharingRules } from '@/lib/queries';
import { requireAuthRole } from '@/lib/auth-helpers';
import BagiHasilClient from './bagi-hasil-client';
import { desc, eq } from 'drizzle-orm';

export default async function BagiHasilPage({
  searchParams,
}: {
  searchParams?: Promise<{ outletId?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const { effectiveOutletId, accessibleOutlets } = await requireAuthRole(
    ['owner'],
    resolvedParams.outletId
  );
  const outletId = effectiveOutletId;

  let allOutlets: any[] = accessibleOutlets;
  let rulesList: any[] = [];
  let ledgerList: any[] = [];

  try {
    const [rulesRes, rawLedger] = await Promise.all([
      getProfitSharingRules(outletId),
      db
        .select({
          ledger: profitSharingLedger,
          rule: profitSharingRules,
        })
        .from(profitSharingLedger)
        .leftJoin(profitSharingRules, eq(profitSharingLedger.ruleId, profitSharingRules.id))
        .where(eq(profitSharingLedger.outletId, outletId))
        .orderBy(desc(profitSharingLedger.createdAt)),
    ]);

    rulesList = rulesRes;
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
