# 🔄 Development Workflow — Kopi Seruni POS

Panduan alur kerja (*development workflow*) otomatis untuk memastikan setiap penambahan atau perubahan fitur diuji secara menyeluruh melalui **Unit Test** dan **End-to-End (E2E) Integration Test**.

---

## ⚡ 1. Alur Kerja Saat Coding (Live Watch Mode)

Saat kamu sedang mengembangkan fitur baru atau memperbaiki bug, jalankan test dalam mode **Watch**:

```bash
bun run test:watch
```
> **Apa yang terjadi:**
> Bun test runner akan memantau seluruh file di `src/` dan `tests/`. Setiap kali kamu menekan **Save (`Cmd+S`)**, Bun akan langsung menjalankan unit test dan E2E test secara otomatis dalam hitungan milidetik.

---

## 🛠️ 2. Perintah Workflow yang Tersedia

| Perintah | Deskripsi | Kapan Digunakan? |
|---|---|---|
| `bun run test:watch` | Menjalankan test secara live otomatis setiap ada file disimpan | **Saat sedang coding fitur baru** |
| `bun run test:unit` | Menjalankan unit test logika matematika & uang (< 50ms) | **Cek cepat kalkulasi harga/diskon** |
| `bun run test:e2e` | Menjalankan simulasi transaksi POS lengkap ke Turso DB | **Validasi integrasi database** |
| `bun run check` | Menjalankan validasi TypeScript + Semua Test (Unit & E2E) | **Sebelum commit perubahan** |
| `bun run verify` | Menjalankan Typecheck + Semua Test + Next.js Production Build | **Sebelum deploy / release** |

---

## 🔒 3. Otomatisasi Git Hooks (Pre-commit & Pre-push)

Git hooks sudah dikonfigurasi di direktori `.githooks/`:

1. **Pre-Commit Hook (`.githooks/pre-commit`):**
   - Saat kamu mengetik `git commit`, sistem akan otomatis menjalankan `bunx tsc --noEmit` (Typecheck) dan `bun run test:unit`.
   - Jika ada tipe TypeScript salah atau unit test gagal, **commit akan otomatis diblokir** dengan pesan error yang jelas.

2. **Pre-Push Hook (`.githooks/pre-push`):**
   - Saat kamu mengetik `git push`, sistem akan otomatis menjalankan seluruh rangkaian **E2E Lifecycle Integration Test** ke Turso.
   - Jika ada alur transaksi yang rusak, **push ke GitHub akan otomatis dibatalkan**.

---

## 🧪 4. Menambahkan Test Baru untuk Fitur Baru

- **Unit Test Baru:** Tambahkan file di `tests/unit/<nama-fitur>.test.ts`
- **E2E Workflow Test Baru:** Tambahkan skenario di `tests/e2e/<nama-workflow>.test.ts`

Contoh Unit Test:
```typescript
import { describe, it, expect } from 'bun:test';
import { calcDiscount } from '@/lib/utils';

describe('Fitur Promo Baru', () => {
  it('harus memotong harga dengan benar', () => {
    expect(calcDiscount(50000, 'percentage', 20)).toBe(10000);
  });
});
```
