/**
 * Direct Web Bluetooth Thermal Printing Engine
 * Prints directly from Chrome / Edge to portable Bluetooth thermal printers
 * without requiring any desktop bridge app (QZ Tray / RawBT).
 */

const BLUETOOTH_PRINT_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard POS Printer service
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Common mini printer service
  '49535343-fe7d-4e58-8350-d4b96707323e', // ISSC transparent UART
  '0000ff00-0000-1000-8000-00805f9b34fb', // Custom thermal printer service
  '0000fff0-0000-1000-8000-00805f9b34fb', // Custom Bluetooth POS
];

// In-memory reference to previously connected printer for 1-click silent printing
let activeBluetoothDevice: any = null;

export function isBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

export function getActivePrinterName(): string | null {
  return activeBluetoothDevice?.name || null;
}

export function isPrinterConnected(): boolean {
  return !!activeBluetoothDevice?.gatt?.connected;
}

/**
 * Get active or previously permitted Bluetooth printer without showing picker dialog
 */
async function resolveBluetoothDevice(nav: any, forcePicker: boolean = false): Promise<any> {
  // 1. If we already have an active device reference and forcePicker is false, try reusing it
  if (!forcePicker && activeBluetoothDevice?.gatt) {
    return activeBluetoothDevice;
  }

  // 2. Check if browser has previously permitted devices (Web Bluetooth getDevices API)
  if (!forcePicker && typeof nav.bluetooth.getDevices === 'function') {
    try {
      const permittedDevices = await nav.bluetooth.getDevices();
      if (permittedDevices && permittedDevices.length > 0) {
        activeBluetoothDevice = permittedDevices[0];
        return activeBluetoothDevice;
      }
    } catch {
      // Fallback to requestDevice if getDevices fails
    }
  }

  // 3. Prompt user once to select printer from Bluetooth picker dialog
  const device = await nav.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: BLUETOOTH_PRINT_SERVICES,
  });

  activeBluetoothDevice = device;
  return device;
}

/**
 * Connect to Bluetooth printer in advance (e.g. from Settings or Shift start)
 */
export async function connectBluetoothPrinter(forcePicker: boolean = true): Promise<{
  success: boolean;
  message: string;
  deviceName?: string;
}> {
  const nav = navigator as any;
  if (!nav.bluetooth) {
    return {
      success: false,
      message: 'Web Bluetooth tidak didukung di browser ini. Gunakan Google Chrome atau Microsoft Edge.',
    };
  }

  try {
    const device = await resolveBluetoothDevice(nav, forcePicker);
    if (!device?.gatt) {
      return { success: false, message: 'Perangkat tidak memiliki antarmuka Bluetooth GATT.' };
    }
    if (!device.gatt.connected) {
      await device.gatt.connect();
    }
    const name = device.name || 'Printer Bluetooth';
    return {
      success: true,
      message: `Printer [${name}] berhasil terhubung!`,
      deviceName: name,
    };
  } catch (err: any) {
    if (err?.name === 'NotFoundError') {
      return { success: false, message: 'Pemilihan printer dibatalkan.' };
    }
    return { success: false, message: `Gagal menghubungkan printer: ${err.message || err}` };
  }
}

/**
 * Disconnect and clear active printer cache
 */
export function forgetBluetoothPrinter() {
  if (activeBluetoothDevice?.gatt?.connected) {
    try {
      activeBluetoothDevice.gatt.disconnect();
    } catch {}
  }
  activeBluetoothDevice = null;
}

export async function printDirectBluetooth(
  data: Uint8Array,
  forcePicker: boolean = false
): Promise<{ success: boolean; message: string; deviceName?: string }> {
  const nav = navigator as any;
  if (!nav.bluetooth) {
    return {
      success: false,
      message: 'Web Bluetooth tidak didukung di browser ini. Gunakan Google Chrome atau Microsoft Edge.',
    };
  }

  try {
    // 1. Resolve device (Cached / Previously Permitted / Picker Dialog)
    let device: any;
    try {
      device = await resolveBluetoothDevice(nav, forcePicker);
    } catch (e: any) {
      if (forcePicker || activeBluetoothDevice == null) {
        throw e;
      }
      // If cached device failed to resolve, retry with picker dialog
      device = await resolveBluetoothDevice(nav, true);
    }

    if (!device?.gatt) {
      return { success: false, message: 'Perangkat printer tidak memiliki antarmuka Bluetooth GATT.' };
    }

    // 2. Connect to GATT Server
    let server = device.gatt;
    if (!server.connected) {
      server = await device.gatt.connect();
    }

    // 3. Find writable characteristic
    let writeChar: any = null;
    const services = await server.getPrimaryServices();
    for (const service of services) {
      const chars = await service.getCharacteristics();
      for (const c of chars) {
        if (c.properties.write || c.properties.writeWithoutResponse) {
          writeChar = c;
          break;
        }
      }
      if (writeChar) break;
    }

    if (!writeChar) {
      server.disconnect();
      return { success: false, message: 'Tidak menemukan port cetak (write characteristic) pada printer.' };
    }

    // 4. Send ESC/POS binary chunks (chunking 128 bytes per packet for Bluetooth MTU)
    const CHUNK_SIZE = 128;
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE);
      if (writeChar.properties.writeWithoutResponse) {
        await writeChar.writeValueWithoutResponse(chunk);
      } else {
        await writeChar.writeValueWithResponse(chunk);
      }
      // Small pause to allow printer buffer to consume bytes
      await new Promise((r) => setTimeout(r, 20));
    }

    const deviceName = device.name || 'Printer Bluetooth';
    return {
      success: true,
      message: `Struk berhasil dicetak ke [${deviceName}]!`,
      deviceName,
    };
  } catch (error: any) {
    if (error?.name === 'NotFoundError') {
      return { success: false, message: 'Pencarian perangkat dibatalkan.' };
    }
    const msg = error?.message || String(error);
    if (
      error?.name === 'NotAllowedError' ||
      error?.name === 'SecurityError' ||
      msg.toLowerCase().includes('permission') ||
      msg.toLowerCase().includes('blocked')
    ) {
      return {
        success: false,
        message:
          'Izin Bluetooth diblokir browser. Buka Pengaturan Situs browser untuk Mengizinkan Bluetooth, atau gunakan tombol Cetak via Dialog OS.',
      };
    }
    return { success: false, message: `Gagal cetak Bluetooth: ${msg}` };
  }
}
