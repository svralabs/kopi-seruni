import { config } from 'dotenv';
config({ path: '.env.local' });

import { describe, it, expect, afterAll } from 'bun:test';
import { db } from '../../src/lib/db';
import { user, userOutletRoles, outlets } from '../../src/lib/schema';
import { account } from '../../src/lib/auth-schema';
import { hashPassword, verifyPassword } from 'better-auth/crypto';
import { auth } from '../../src/lib/auth';
import { eq } from 'drizzle-orm';

describe('Unit Test: Staff & Account Management Lifecycle', () => {
  const TS = Date.now().toString().slice(-5);
  const TEST_USER_ID = `usr_unit_staff_${TS}`;
  const TEST_USERNAME = `kasir_unit_${TS}`;
  const TEST_EMAIL = `staff_unit_${TS}@kopiseruni.id`;
  const TEST_PASSWORD = 'password123';

  afterAll(async () => {
    // Cleanup any leftovers
    await db.delete(userOutletRoles).where(eq(userOutletRoles.userId, TEST_USER_ID));
    await db.delete(account).where(eq(account.userId, TEST_USER_ID));
    await db.delete(user).where(eq(user.id, TEST_USER_ID));
  });

  it('should create staff account with username, credential and allow BetterAuth username & email login', async () => {
    const hashedPassword = await hashPassword(TEST_PASSWORD);
    const now = new Date();
    const nowUnix = Math.floor(now.getTime() / 1000);

    // Atomic insert identical to createStaff action
    await db.transaction(async (tx) => {
      await tx.insert(user).values({
        id: TEST_USER_ID,
        name: 'Staf Unit Test',
        username: TEST_USERNAME,
        displayUsername: TEST_USERNAME,
        email: TEST_EMAIL,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
      });

      await tx.insert(account).values({
        id: `acc_unit_${TS}`,
        accountId: TEST_USER_ID,
        providerId: 'credential',
        userId: TEST_USER_ID,
        password: hashedPassword,
        issuer: 'local:credential',
        createdAt: now,
        updatedAt: now,
      });

      await tx.insert(userOutletRoles).values({
        id: `uor_unit_${TS}`,
        userId: TEST_USER_ID,
        outletId: 'out_default',
        role: 'kasir',
        createdAt: nowUnix,
      });
    });

    // Verify database presence
    const [savedUser] = await db.select().from(user).where(eq(user.id, TEST_USER_ID));
    expect(savedUser).toBeDefined();
    expect(savedUser.username).toBe(TEST_USERNAME);
    expect(savedUser.email).toBe(TEST_EMAIL);

    const [savedAccount] = await db.select().from(account).where(eq(account.userId, TEST_USER_ID));
    expect(savedAccount).toBeDefined();
    expect(savedAccount.issuer).toBe('local:credential');

    // Verify password match
    const isValid = await verifyPassword({ hash: savedAccount.password!, password: TEST_PASSWORD });
    expect(isValid).toBe(true);

    // Verify BetterAuth signInUsername succeeds
    const signInUsernameRes = await (auth.api as any).signInUsername({
      body: {
        username: TEST_USERNAME,
        password: TEST_PASSWORD,
      },
    });
    expect(signInUsernameRes?.user?.id).toBe(TEST_USER_ID);

    // Verify BetterAuth signInEmail also succeeds
    const signInEmailRes = await auth.api.signInEmail({
      body: {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      },
    });
    expect(signInEmailRes?.user?.id).toBe(TEST_USER_ID);
  }, 15000);

  it('should validate username, email and password constraints', () => {
    const usernameRegex = /^[a-z0-9_.-]{3,30}$/;
    expect(usernameRegex.test('ab')).toBe(false); // too short
    expect(usernameRegex.test('kasir-1')).toBe(true);
    expect(usernameRegex.test('kasir_seruni')).toBe(true);
    expect(usernameRegex.test('kasir.barat')).toBe(true);
    expect(usernameRegex.test('kasir@barat')).toBe(false); // special char not allowed
    expect(usernameRegex.test('kasir 1')).toBe(false); // spaces not allowed
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    expect(emailRegex.test('not-an-email')).toBe(false);
    expect(emailRegex.test('test@')).toBe(false);
    expect(emailRegex.test('valid@example.com')).toBe(true);

    const isPasswordValid = (p: string) => p.length >= 6;
    expect(isPasswordValid('12345')).toBe(false);
    expect(isPasswordValid('123456')).toBe(true);
  });

  it('should update password and verify new password hash works with credential issuer', async () => {
    const NEW_PASS = 'newSecretPass789';
    const newHash = await hashPassword(NEW_PASS);

    await db
      .update(account)
      .set({
        password: newHash,
        issuer: 'local:credential',
        updatedAt: new Date(),
      })
      .where(eq(account.userId, TEST_USER_ID));

    const [updatedAccount] = await db.select().from(account).where(eq(account.userId, TEST_USER_ID));
    const isNewValid = await verifyPassword({ hash: updatedAccount.password!, password: NEW_PASS });
    expect(isNewValid).toBe(true);

    const oldInvalid = await verifyPassword({ hash: updatedAccount.password!, password: TEST_PASSWORD });
    expect(oldInvalid).toBe(false);
  });

  it('should cleanly remove staff user, account, and outlet roles without orphan records', async () => {
    await db.transaction(async (tx) => {
      await tx.delete(userOutletRoles).where(eq(userOutletRoles.userId, TEST_USER_ID));
      await tx.delete(account).where(eq(account.userId, TEST_USER_ID));
      await tx.delete(user).where(eq(user.id, TEST_USER_ID));
    });

    const [deletedUser] = await db.select().from(user).where(eq(user.id, TEST_USER_ID));
    expect(deletedUser).toBeUndefined();

    const [deletedAccount] = await db.select().from(account).where(eq(account.userId, TEST_USER_ID));
    expect(deletedAccount).toBeUndefined();

    const [deletedRole] = await db.select().from(userOutletRoles).where(eq(userOutletRoles.userId, TEST_USER_ID));
    expect(deletedRole).toBeUndefined();
  });
});
