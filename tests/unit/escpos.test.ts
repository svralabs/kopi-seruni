import { describe, it, expect } from 'bun:test';
import { EscPosEncoder, generateEscPosReceipt, type ReceiptPrintData } from '@/lib/escpos';

describe('Unit Test: ESC/POS Thermal Printing Encoder', () => {
  it('should initialize ESC/POS buffer with ESC @ and feed/cut commands', () => {
    const encoder = new EscPosEncoder();
    encoder.alignCenter().bold(true).line('TEST HEADER').feed(2).cut();
    const bytes = encoder.getUint8Array();

    expect(bytes.length).toBeGreaterThan(0);
    // ESC @ is 0x1B, 0x40
    expect(bytes[0]).toBe(0x1b);
    expect(bytes[1]).toBe(0x40);
  });

  it('should format two-column lines accurately for 32 chars width (58mm)', () => {
    const encoder = new EscPosEncoder();
    encoder.twoColumn('TOTAL', 'Rp 50.000', 32);
    const text = new TextDecoder().decode(encoder.getUint8Array());
    
    expect(text).toContain('TOTAL');
    expect(text).toContain('Rp 50.000');
    // Lines end with newline
    expect(text.endsWith('\n')).toBe(true);
  });

  it('should generate complete ESC/POS binary receipt payload for standard order', () => {
    const sampleReceipt: ReceiptPrintData = {
      orderId: 'ORD-TEST-1234',
      outletName: 'Outlet Seruni Pusat',
      outletAddress: 'Jl. Melati No. 12',
      outletPhone: '08123456789',
      kasirName: 'Barista Fahmi',
      customerName: 'Meja 5',
      createdAt: 1700000000,
      items: [
        {
          productName: 'Kopi Susu Gula Aren',
          quantity: 2,
          productPrice: 18000,
          subtotal: 36000,
          notes: 'Less sugar',
        },
      ],
      subtotal: 36000,
      discountAmount: 5000,
      taxRate: 11,
      taxAmount: 3410,
      total: 34410,
      paymentMethod: 'cash',
      cashReceived: 50000,
      change: 15590,
      footerText: 'Terima kasih atas kunjungan Anda!',
    };

    const payload58 = generateEscPosReceipt(sampleReceipt, 32);
    expect(payload58).toBeInstanceOf(Uint8Array);
    expect(payload58.length).toBeGreaterThan(100);

    const payload80 = generateEscPosReceipt(sampleReceipt, 48);
    expect(payload80).toBeInstanceOf(Uint8Array);
    expect(payload80.length).toBeGreaterThan(100);
  });
});
