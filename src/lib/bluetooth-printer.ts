/**
 * Direct Thermal Printing Module (Serial & Bluetooth)
 * Bridged to unified thermal-printer engine.
 */

import {
  isDirectPrintSupported,
  isWebBluetoothSupported,
  isWebSerialSupported,
  getActivePrinterInfo,
  connectSerialPrinter,
  connectBluetoothBlePrinter,
  disconnectThermalPrinter,
  printDirectThermal,
} from './thermal-printer';

export function isBluetoothSupported(): boolean {
  return isDirectPrintSupported();
}

export function getActivePrinterName(): string | null {
  return getActivePrinterInfo().name;
}

export function isPrinterConnected(): boolean {
  return getActivePrinterInfo().isConnected;
}

export async function connectBluetoothPrinter(forcePicker: boolean = true) {
  // On desktop Chrome/Brave/Edge, try Web Serial first (macOS/Win Bluetooth SPP RPP02N)
  if (isWebSerialSupported()) {
    try {
      const res = await connectSerialPrinter();
      if (res.success) return res;
    } catch {}
  }
  // Fallback to Web Bluetooth
  if (isWebBluetoothSupported()) {
    return connectBluetoothBlePrinter();
  }
  return {
    success: false,
    message: 'Browser tidak mendukung Web Serial atau Web Bluetooth.',
  };
}

export function forgetBluetoothPrinter() {
  disconnectThermalPrinter();
}

export async function printDirectBluetooth(
  data: Uint8Array,
  forcePicker: boolean = false
) {
  return printDirectThermal(data, forcePicker);
}
