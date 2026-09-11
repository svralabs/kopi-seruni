import { config } from 'dotenv';
config({ path: '.env.local' });

import { describe, it, expect } from 'bun:test';
import { db } from '../../src/lib/db';
import { outlets, orders, orderItems, user } from '../../src/lib/schema';
import { eq, desc } from 'drizzle-orm';

describe('E2E Integration Test: Multi-Outlet & Order History Lifecycle', () => {
  const TEST_OUTLET_DAGO = `out_test_dago_${Date.now().toString().slice(-4)}`;
  const TEST_USER = `usr_test_cashier_${Date.now().toString().slice(-4)}`;

  it('Step 1: Create a new branch outlet', async () => {
    const now = Math.floor(Date.now() / 1000);
    await db.insert(outlets).values({
      id: TEST_OUTLET_DAGO,
      name: 'Kopi Seruni - Test Cabang Dago E2E',
      address: 'Jl. Ir. H. Juanda No. 99, Bandung',
      phone: '0812-9999-8888',
      createdAt: now,
    });

    const [savedOutlet] = await db.select().from(outlets).where(eq(outlets.id, TEST_OUTLET_DAGO));
    expect(savedOutlet).toBeDefined();
    expect(savedOutlet.name).toContain('Cabang Dago');
  });

  it('Step 2: Create a user and an order on this branch', async () => {
    const now = Math.floor(Date.now() / 1000);
    await db.insert(user).values({
      id: TEST_USER,
      name: 'Kasir Dago Test',
      email: `kasir_dago_${Date.now()}@seruni.test`,
      emailVerified: true,
    }).onConflictDoNothing();

    const orderId = `ord_test_dago_${Date.now().toString().slice(-4)}`;
    await db.insert(orders).values({
      id: orderId,
      outletId: TEST_OUTLET_DAGO,
      kasirId: TEST_USER,
      customerName: 'Meja 05 - Mas Dedi',
      subtotal: 50000,
      discountAmount: 0,
      taxRate: 11,
      taxAmount: 5500,
      total: 55500,
      paymentMethod: 'qris',
      status: 'completed',
      createdAt: now,
    });

    // Query order with outlet and user join
    const [fetched] = await db
      .select({
        order: orders,
        outlet: outlets,
        user: user,
      })
      .from(orders)
      .leftJoin(outlets, eq(orders.outletId, outlets.id))
      .leftJoin(user, eq(orders.kasirId, user.id))
      .where(eq(orders.id, orderId));

    expect(fetched).toBeDefined();
    expect(fetched.order.total).toBe(55500);
    expect(fetched.outlet?.name).toContain('Cabang Dago');
    expect(fetched.user?.name).toBe('Kasir Dago Test');

    // Cleanup test record
    await db.delete(orders).where(eq(orders.id, orderId));
    await db.delete(user).where(eq(user.id, TEST_USER));
    await db.delete(outlets).where(eq(outlets.id, TEST_OUTLET_DAGO));
  });

  it('Step 3: Update user profile details, role, and password hash', async () => {
    const { hashPassword, verifyPassword } = await import('better-auth/crypto');
    const { account } = await import('../../src/lib/auth-schema');
    const { userOutletRoles } = await import('../../src/lib/schema');

    const EDIT_USER_ID = `usr_test_edit_${Date.now().toString().slice(-4)}`;
    const originalEmail = `edit_test_${Date.now()}@seruni.test`;
    const updatedEmail = `updated_edit_test_${Date.now()}@seruni.test`;

    // 1. Insert initial user and credential account
    await db.insert(user).values({
      id: EDIT_USER_ID,
      name: 'Initial Staff Name',
      email: originalEmail,
      emailVerified: true,
    });

    const initialPassHash = await hashPassword('password123');
    await db.insert(account).values({
      id: `acc_test_${Date.now().toString().slice(-4)}`,
      accountId: EDIT_USER_ID,
      providerId: 'credential',
      userId: EDIT_USER_ID,
      password: initialPassHash,
    });

    // 2. Perform detail update: name, email, new password, and role
    const newPassHash = await hashPassword('newSecret456');
    await db.update(user).set({
      name: 'Updated Staff Manager',
      email: updatedEmail,
    }).where(eq(user.id, EDIT_USER_ID));

    await db.update(account).set({
      password: newPassHash,
    }).where(eq(account.userId, EDIT_USER_ID));

    await db.insert(userOutletRoles).values({
      id: `uor_test_${Date.now().toString().slice(-4)}`,
      userId: EDIT_USER_ID,
      outletId: 'out_default',
      role: 'manager',
      createdAt: Math.floor(Date.now() / 1000),
    });

    // 3. Verify user updated in database
    const [fetchedUser] = await db.select().from(user).where(eq(user.id, EDIT_USER_ID));
    expect(fetchedUser.name).toBe('Updated Staff Manager');
    expect(fetchedUser.email).toBe(updatedEmail);

    // 4. Verify new password validates correctly
    const [fetchedAccount] = await db.select().from(account).where(eq(account.userId, EDIT_USER_ID));
    expect(fetchedAccount.password).toBeDefined();
    const isNewPassValid = await verifyPassword({ hash: fetchedAccount.password!, password: 'newSecret456' });
    expect(isNewPassValid).toBe(true);

    // 5. Verify role assigned
    const [fetchedRole] = await db.select().from(userOutletRoles).where(eq(userOutletRoles.userId, EDIT_USER_ID));
    expect(fetchedRole.role).toBe('manager');

    // Cleanup
    await db.delete(userOutletRoles).where(eq(userOutletRoles.userId, EDIT_USER_ID));
    await db.delete(account).where(eq(account.userId, EDIT_USER_ID));
    await db.delete(user).where(eq(user.id, EDIT_USER_ID));
  });
});

