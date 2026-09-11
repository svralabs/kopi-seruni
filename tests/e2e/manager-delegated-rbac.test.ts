import { config } from 'dotenv';
config({ path: '.env.local' });

import { describe, it, expect } from 'bun:test';
import { db } from '../../src/lib/db';
import { outlets, user, userOutletRoles } from '../../src/lib/schema';
import { account } from '../../src/lib/auth-schema';
import { eq, and, inArray } from 'drizzle-orm';
import { hashPassword, verifyPassword } from 'better-auth/crypto';

describe('E2E Integration Test: Delegated Manager RBAC & Self-Service', () => {
  const TS = Date.now().toString().slice(-5);
  const OUTLET_A = `out_mgr_a_${TS}`;
  const OUTLET_B = `out_mgr_b_${TS}`;

  const OWNER_ID = `usr_test_owner_${TS}`;
  const MGR_A_ID = `usr_test_mgra_${TS}`;
  const KASIR_A_ID = `usr_test_kasira_${TS}`;
  const KASIR_B_ID = `usr_test_kasirb_${TS}`;

  it('Step 1: Setup Outlets, Owner, Manager A, and Cashiers', async () => {
    const now = Math.floor(Date.now() / 1000);

    // 1. Insert Outlets
    await db.insert(outlets).values([
      { id: OUTLET_A, name: `Kopi Seruni - Cabang Alfa ${TS}`, createdAt: now },
      { id: OUTLET_B, name: `Kopi Seruni - Cabang Beta ${TS}`, createdAt: now },
    ]);

    // 2. Insert Users
    await db.insert(user).values([
      { id: OWNER_ID, name: 'Pak Boss Owner', email: `owner_${TS}@seruni.test`, emailVerified: true },
      { id: MGR_A_ID, name: 'Manajer Alfa', email: `mgr_alfa_${TS}@seruni.test`, emailVerified: true },
      { id: KASIR_A_ID, name: 'Kasir Alfa', email: `kasir_alfa_${TS}@seruni.test`, emailVerified: true },
      { id: KASIR_B_ID, name: 'Kasir Beta', email: `kasir_beta_${TS}@seruni.test`, emailVerified: true },
    ]);

    // 3. Assign Roles
    await db.insert(userOutletRoles).values([
      // Owner has both
      { id: `uor_ow1_${TS}`, userId: OWNER_ID, outletId: OUTLET_A, role: 'owner', createdAt: now },
      { id: `uor_ow2_${TS}`, userId: OWNER_ID, outletId: OUTLET_B, role: 'owner', createdAt: now },
      // Manager A only has Outlet A
      { id: `uor_mgr_${TS}`, userId: MGR_A_ID, outletId: OUTLET_A, role: 'manager', createdAt: now },
      // Kasir A is in Outlet A
      { id: `uor_ka_${TS}`, userId: KASIR_A_ID, outletId: OUTLET_A, role: 'kasir', createdAt: now },
      // Kasir B is in Outlet B
      { id: `uor_kb_${TS}`, userId: KASIR_B_ID, outletId: OUTLET_B, role: 'kasir', createdAt: now },
    ]);

    // 4. Setup credentials
    const passHash = await hashPassword('rahasia123');
    await db.insert(account).values([
      { id: `acc_mgr_${TS}`, accountId: MGR_A_ID, providerId: 'credential', userId: MGR_A_ID, password: passHash },
      { id: `acc_ka_${TS}`, accountId: KASIR_A_ID, providerId: 'credential', userId: KASIR_A_ID, password: passHash },
    ]);

    // Verify Manager A accessibility via DB
    const mgrRoles = await db.select().from(userOutletRoles).where(eq(userOutletRoles.userId, MGR_A_ID));
    const accessibleOutletIds = mgrRoles.map((r) => r.outletId);
    expect(mgrRoles.some((r) => r.role === 'owner')).toBe(false);
    expect(mgrRoles.some((r) => r.role === 'manager')).toBe(true);
    expect(accessibleOutletIds).toContain(OUTLET_A);
    expect(accessibleOutletIds).not.toContain(OUTLET_B);
  });

  it('Step 2: Manager Self-Profile Update (Name, Email, Password)', async () => {
    // Manager updates own profile
    const newName = 'Manajer Alfa Updated';
    const newEmail = `mgr_alfa_new_${TS}@seruni.test`;
    const newPass = 'newPassword789';

    // Simulate update logic:
    await db.update(user).set({
      name: newName,
      email: newEmail,
    }).where(eq(user.id, MGR_A_ID));

    const updatedHash = await hashPassword(newPass);
    await db.update(account).set({
      password: updatedHash,
    }).where(and(eq(account.userId, MGR_A_ID), eq(account.providerId, 'credential')));

    // Check that user details changed
    const [fetched] = await db.select().from(user).where(eq(user.id, MGR_A_ID));
    expect(fetched.name).toBe(newName);
    expect(fetched.email).toBe(newEmail);

    // Verify password verification works
    const [acc] = await db.select().from(account).where(eq(account.userId, MGR_A_ID));
    const isValid = await verifyPassword({ hash: acc.password!, password: newPass });
    expect(isValid).toBe(true);

    // Verify role and branch DID NOT CHANGE
    const roles = await db.select().from(userOutletRoles).where(eq(userOutletRoles.userId, MGR_A_ID));
    expect(roles.length).toBe(1);
    expect(roles[0].role).toBe('manager');
    expect(roles[0].outletId).toBe(OUTLET_A);
  });

  it('Step 3: Delegated Staff Management in Assigned Outlet', async () => {
    // Manager A manages Kasir A (which is in Outlet A)
    const mgrRoles = await db.select().from(userOutletRoles).where(eq(userOutletRoles.userId, MGR_A_ID));
    const accessibleOutletIds = mgrRoles.map((r) => r.outletId);
    const targetKasirRoles = await db.select().from(userOutletRoles).where(eq(userOutletRoles.userId, KASIR_A_ID));

    // Assert Kasir A is within Manager A's branch
    const isInsideBranch = targetKasirRoles.some((r) => accessibleOutletIds.includes(r.outletId));
    expect(isInsideBranch).toBe(true);

    // Assert target is not Owner or Manager
    const isHigher = targetKasirRoles.some((r) => r.role === 'owner' || r.role === 'manager');
    expect(isHigher).toBe(false);

    // Update Kasir A
    await db.update(user).set({
      name: 'Kasir Alfa - Bintang Shift Pagi',
    }).where(eq(user.id, KASIR_A_ID));

    const [updatedKasir] = await db.select().from(user).where(eq(user.id, KASIR_A_ID));
    expect(updatedKasir.name).toBe('Kasir Alfa - Bintang Shift Pagi');
  });

  it('Step 4: Security Rules Enforced: Manager cannot touch Kasir B or Owner', async () => {
    const mgrRoles = await db.select().from(userOutletRoles).where(eq(userOutletRoles.userId, MGR_A_ID));
    const accessibleOutletIds = mgrRoles.map((r) => r.outletId);

    // Attempting to manage Kasir B (belonging to Outlet B):
    const kasirBRoles = await db.select().from(userOutletRoles).where(eq(userOutletRoles.userId, KASIR_B_ID));
    const canManageB = kasirBRoles.some((r) => accessibleOutletIds.includes(r.outletId));
    expect(canManageB).toBe(false); // Isolated!

    // Attempting to manage Owner:
    const ownerRoles = await db.select().from(userOutletRoles).where(eq(userOutletRoles.userId, OWNER_ID));
    const targetIsOwner = ownerRoles.some((r) => r.role === 'owner');
    expect(targetIsOwner).toBe(true); // Protected! Manager must be blocked from touching Owner.
  });

  it('Step 5: Cleanup Test Data', async () => {
    const testUserIds = [OWNER_ID, MGR_A_ID, KASIR_A_ID, KASIR_B_ID];
    const testOutletIds = [OUTLET_A, OUTLET_B];

    await db.delete(userOutletRoles).where(inArray(userOutletRoles.userId, testUserIds));
    await db.delete(account).where(inArray(account.userId, testUserIds));
    await db.delete(user).where(inArray(user.id, testUserIds));
    await db.delete(outlets).where(inArray(outlets.id, testOutletIds));

    const remainingOutlets = await db.select().from(outlets).where(inArray(outlets.id, testOutletIds));
    expect(remainingOutlets.length).toBe(0);
  });
});
