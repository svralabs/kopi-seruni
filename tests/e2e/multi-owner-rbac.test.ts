import { config } from 'dotenv';
config({ path: '.env.local' });

import { describe, it, expect } from 'bun:test';
import { db } from '../../src/lib/db';
import {
  outlets,
  profitSharingRules,
  profitSharingLedger,
  user,
  userOutletRoles,
} from '../../src/lib/schema';
import { eq, and } from 'drizzle-orm';
import { calcShare } from '../../src/lib/utils';

describe('E2E Integration Test: Multi-Owner Profit Sharing & Outlet-Scoped RBAC', () => {
  const OUTLET_1 = `out_mo_1_${Date.now().toString().slice(-4)}`;
  const OUTLET_2 = `out_mo_2_${Date.now().toString().slice(-4)}`;
  const now = Math.floor(Date.now() / 1000);

  it('Step 1: Setup 2 distinct outlets', async () => {
    await db.insert(outlets).values([
      {
        id: OUTLET_1,
        name: 'Kopi Seruni - Outlet 1 (Multi Owner A, B, C)',
        createdAt: now,
      },
      {
        id: OUTLET_2,
        name: 'Kopi Seruni - Outlet 2 (Multi Owner A, C)',
        createdAt: now,
      },
    ]);

    const [o1] = await db.select().from(outlets).where(eq(outlets.id, OUTLET_1));
    const [o2] = await db.select().from(outlets).where(eq(outlets.id, OUTLET_2));
    expect(o1).toBeDefined();
    expect(o2).toBeDefined();
  });

  it('Step 2: Configure distinct Multi-Owner shares for Outlet 1 and Outlet 2', async () => {
    // Outlet 1: Owner A (50%), Owner B (30%), Owner C (20%) -> Total 100%
    await db.insert(profitSharingRules).values([
      { id: `psr_o1_a_${now}`, outletId: OUTLET_1, name: 'Owner A', percentage: 50, isActive: 1, createdAt: now },
      { id: `psr_o1_b_${now}`, outletId: OUTLET_1, name: 'Owner B', percentage: 30, isActive: 1, createdAt: now },
      { id: `psr_o1_c_${now}`, outletId: OUTLET_1, name: 'Owner C', percentage: 20, isActive: 1, createdAt: now },
    ]);

    // Outlet 2: Owner A (70%), Owner C (30%) -> Total 100%
    await db.insert(profitSharingRules).values([
      { id: `psr_o2_a_${now}`, outletId: OUTLET_2, name: 'Owner A', percentage: 70, isActive: 1, createdAt: now },
      { id: `psr_o2_c_${now}`, outletId: OUTLET_2, name: 'Owner C', percentage: 30, isActive: 1, createdAt: now },
    ]);

    const o1Rules = await db.select().from(profitSharingRules).where(eq(profitSharingRules.outletId, OUTLET_1));
    const o2Rules = await db.select().from(profitSharingRules).where(eq(profitSharingRules.outletId, OUTLET_2));

    expect(o1Rules.length).toBe(3);
    expect(o2Rules.length).toBe(2);

    const sum1 = o1Rules.reduce((s, r) => s + r.percentage, 0);
    const sum2 = o2Rules.reduce((s, r) => s + r.percentage, 0);
    expect(sum1).toBe(100);
    expect(sum2).toBe(100);
  });

  it('Step 3: Generate profit sharing ledger for both outlets independently', async () => {
    // Outlet 1 Net Profit = Rp 20.000.000
    const netProfit1 = 20000000;
    const o1Rules = await db.select().from(profitSharingRules).where(eq(profitSharingRules.outletId, OUTLET_1));
    for (const r of o1Rules) {
      await db.insert(profitSharingLedger).values({
        id: `psl_o1_${r.name.replace(/\s/g, '')}_${now}`,
        outletId: OUTLET_1,
        ruleId: r.id,
        periodStart: now - 86400 * 30,
        periodEnd: now,
        netProfit: netProfit1,
        shareAmount: calcShare(netProfit1, r.percentage),
        status: 'pending',
        createdAt: now,
      });
    }

    // Outlet 2 Net Profit = Rp 10.000.000
    const netProfit2 = 10000000;
    const o2Rules = await db.select().from(profitSharingRules).where(eq(profitSharingRules.outletId, OUTLET_2));
    for (const r of o2Rules) {
      await db.insert(profitSharingLedger).values({
        id: `psl_o2_${r.name.replace(/\s/g, '')}_${now}`,
        outletId: OUTLET_2,
        ruleId: r.id,
        periodStart: now - 86400 * 30,
        periodEnd: now,
        netProfit: netProfit2,
        shareAmount: calcShare(netProfit2, r.percentage),
        status: 'pending',
        createdAt: now,
      });
    }

    // Verify Owner A received 50% from Outlet 1 (Rp 10.000.000) and 70% from Outlet 2 (Rp 7.000.000)
    const o1Ledger = await db.select().from(profitSharingLedger).where(eq(profitSharingLedger.outletId, OUTLET_1));
    const o2Ledger = await db.select().from(profitSharingLedger).where(eq(profitSharingLedger.outletId, OUTLET_2));

    const o1RuleA = o1Rules.find((r) => r.name === 'Owner A')!;
    const o1LedgerA = o1Ledger.find((l) => l.ruleId === o1RuleA.id)!;
    expect(o1LedgerA.shareAmount).toBe(10000000);

    const o2RuleA = o2Rules.find((r) => r.name === 'Owner A')!;
    const o2LedgerA = o2Ledger.find((l) => l.ruleId === o2RuleA.id)!;
    expect(o2LedgerA.shareAmount).toBe(7000000);
  });

  it('Step 4: Outlet-Scoped RBAC assignment and responsibility switch', async () => {
    const testUserId = `usr_rbac_test_${now}`;
    await db.insert(user).values({
      id: testUserId,
      name: 'Budi Staf Seruni',
      email: `budi_${now}@seruni.test`,
      emailVerified: true,
    });

    // 1. Assign as Kasir in Outlet 1
    const roleId = `uor_test_${now}`;
    await db.insert(userOutletRoles).values({
      id: roleId,
      userId: testUserId,
      outletId: OUTLET_1,
      role: 'kasir',
      createdAt: now,
    });

    const [role1] = await db.select().from(userOutletRoles).where(eq(userOutletRoles.userId, testUserId));
    expect(role1.role).toBe('kasir');
    expect(role1.outletId).toBe(OUTLET_1);

    // 2. Promote to Manager and move to Outlet 2
    await db
      .update(userOutletRoles)
      .set({ outletId: OUTLET_2, role: 'manager' })
      .where(eq(userOutletRoles.userId, testUserId));

    const [updatedRole] = await db.select().from(userOutletRoles).where(eq(userOutletRoles.userId, testUserId));
    expect(updatedRole.role).toBe('manager');
    expect(updatedRole.outletId).toBe(OUTLET_2);
  });
});
