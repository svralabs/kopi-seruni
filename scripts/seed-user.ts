#!/usr/bin/env bun
import { config } from 'dotenv';
config({ path: '.env.local' });

import { auth } from '../src/lib/auth';
import { db } from '../src/lib/db';
import { userOutletRoles } from '../src/lib/schema';

console.log('🌱 Membuat akun Owner awal...');

try {
  const user = await auth.api.signUpEmail({
    body: {
      email: 'owner@kopiseruni.com',
      password: 'password123',
      name: 'Owner Seruni',
    },
  });

  if (user?.user?.id) {
    // Assign role owner ke outlet default
    await db.insert(userOutletRoles).values({
      id: `uor_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`,
      userId: user.user.id,
      outletId: 'out_default',
      role: 'owner',
    }).onConflictDoNothing();

    console.log('✅ Akun Owner berhasil dibuat:');
    console.log('---------------------------------');
    console.log('Email   : owner@kopiseruni.com');
    console.log('Password: password123');
    console.log('---------------------------------');
  }
} catch (e: any) {
  console.error('Error saat membuat akun:', e);
}

process.exit(0);
