/**
 * Unified Direct Thermal Printing Engine
 * Supports:
 * 1. Web Serial API (Bluetooth Classic SPP like RPP02N / POS-58 & USB Thermal Printers)
 * 2. Web Bluetooth API (Bluetooth Low Energy / BLE GATT Printers)
 * 
 * Works seamlessly on Chrome, Edge, Brave without requiring desktop bridge apps (QZ Tray / RawBT).
 */

const BLUETOOTH_PRINT_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard POS Printer service
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Common mini printer service
  '49535343-fe7d-4e58-8350-d4b96707323e', // ISSC transparent UART
  '0000ff00-0000-1000-8000-00805f9b34fb', // Custom thermal printer service
  '0000fff0-0000-1000-8000-00805f9b34fb', // Custom Bluetooth POS
];

// Persistent references
let activeSerialPort: any = null;
let activeBluetoothDevice: any = null;
let activePrinterType: 'serial' | 'bluetooth' | null = null;
let activePrinterName: string | null = null;

export function isWebSerialSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

export function isDirectPrintSupported(): boolean {
  return isWebSerialSupported() || isWebBluetoothSupported();
}

export function getActivePrinterInfo(): {
  isConnected: boolean;
  type: 'serial' | 'bluetooth' | null;
  name: string | null;
} {
  const isSerialConnected = !!activeSerialPort?.writable;
  const isBtConnected = !!activeBluetoothDevice?.gatt?.connected;
  return {
    isConnected: !!(isSerialConnected || isBtConnected),
    type: activePrinterType,
    name: activePrinterName,
  };
}

/**
 * Disconnect current printer
 */
export async function disconnectThermalPrinter(): Promise<void> {
  if (activeSerialPort) {
    try {
      await activeSerialPort.close();
    } catch {}
    activeSerialPort = null;
  }
  if (activeBluetoothDevice?.gatt?.connected) {
    try {
      activeBluetoothDevice.gatt.disconnect();
    } catch {}
    activeBluetoothDevice = null;
  }
  activePrinterType = null;
  activePrinterName = null;
}

/**
 * Connect via Web Serial (Primary for paired macOS/Windows Bluetooth SPP like RPP02N & USB)
 */
export async function connectSerialPrinter(): Promise<{
  success: boolean;
  message: string;
  deviceName?: string;
}> {
  const nav = navigator as any;
  if (!nav.serial) {
    return {
      success: false,
      message: 'Web Serial tidak didukung. Gunakan Google Chrome atau Microsoft Edge.',
    };
  }

  try {
    const port = await nav.serial.requestPort();
    try {
      await port.open({ baudRate: 9600 });
    } catch (openErr: any) {
      // If already open, continue
      if (!openErr.message?.includes('already open')) {
        throw openErr;
      }
    }

    activeSerialPort = port;
    activePrinterType = 'serial';
    const info = port.getInfo ? port.getInfo() : {};
    activePrinterName = info.usbProductId ? 'Thermal Printer (USB)' : 'RPP02N / Bluetooth Serial';

    return {
      success: true,
      message: `Printer [${activePrinterName}] berhasil terhubung via Serial/Bluetooth SPP!`,
      deviceName: activePrinterName,
    };
  } catch (err: any) {
    if (err?.name === 'NotFoundError') {
      return { success: false, message: 'Pemilihan port printer dibatalkan.' };
    }
    return { success: false, message: `Gagal menyambungkan port: ${err?.message || err}` };
  }
}

/**
 * Connect via Web Bluetooth (BLE GATT)
 */
export async function connectBluetoothBlePrinter(): Promise<{
  success: boolean;
  message: string;
  deviceName?: string;
}> {
  const nav = navigator as any;
  if (!nav.bluetooth) {
    return {
      success: false,
      message: 'Web Bluetooth tidak didukung di browser ini.',
    };
  }

  try {
    const device = await nav.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: BLUETOOTH_PRINT_SERVICES,
    });

    if (!device?.gatt) {
      return { success: false, message: 'Perangkat tidak memiliki antarmuka Bluetooth GATT.' };
    }
    if (!device.gatt.connected) {
      await device.gatt.connect();
    }

    activeBluetoothDevice = device;
    activePrinterType = 'bluetooth';
    activePrinterName = device.name || 'Bluetooth Printer';

    return {
      success: true,
      message: `Printer [${activePrinterName}] berhasil terhubung via Bluetooth BLE!`,
      deviceName: activePrinterName || undefined,
    };
  } catch (err: any) {
    if (err?.name === 'NotFoundError') {
      return { success: false, message: 'Pemilihan printer dibatalkan.' };
    }
    return { success: false, message: `Gagal menyambungkan Bluetooth: ${err?.message || err}` };
  }
}

/**
 * Send raw binary ESC/POS payload to active Serial port
 */
async function sendToSerialPort(port: any, data: Uint8Array): Promise<void> {
  const writer = port.writable.getWriter();
  try {
    await writer.write(data);
  } finally {
    writer.releaseLock();
  }
}

/**
 * Send raw binary ESC/POS payload to active Bluetooth GATT device
 */
async function sendToBluetoothGatt(device: any, data: Uint8Array): Promise<void> {
  let server = device.gatt;
  if (!server.connected) {
    server = await device.gatt.connect();
  }

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
    throw new Error('Tidak menemukan port tulis (write characteristic) pada printer.');
  }

  const CHUNK_SIZE = 128;
  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const chunk = data.slice(i, i + CHUNK_SIZE);
    if (writeChar.properties.writeWithoutResponse) {
      await writeChar.writeValueWithoutResponse(chunk);
    } else {
      await writeChar.writeValueWithResponse(chunk);
    }
    await new Promise((r) => setTimeout(r, 20));
  }
}

/**
 * Universal Direct Thermal Print
 * Automatically routes to active Serial Port, active Bluetooth device, or prompts user.
 */
export async function printDirectThermal(
  data: Uint8Array,
  forcePicker: boolean = false
): Promise<{ success: boolean; message: string; deviceName?: string }> {
  // 1. If Serial Port is already connected and not forcing picker, use it!
  if (!forcePicker && activeSerialPort?.writable) {
    try {
      await sendToSerialPort(activeSerialPort, data);
      return {
        success: true,
        message: `Struk berhasil dicetak ke [${activePrinterName || 'Printer Serial'}]!`,
        deviceName: activePrinterName || 'Printer Serial',
      };
    } catch (e) {
      // Serial write failed, fallback to re-opening
    }
  }

  // 2. If Bluetooth GATT device is already connected and not forcing picker, use it!
  if (!forcePicker && activeBluetoothDevice?.gatt) {
    try {
      await sendToBluetoothGatt(activeBluetoothDevice, data);
      return {
        success: true,
        message: `Struk berhasil dicetak ke [${activePrinterName || 'Printer Bluetooth'}]!`,
        deviceName: activePrinterName || 'Printer Bluetooth',
      };
    } catch (e) {
      // Bluetooth GATT write failed, fallback to picker
    }
  }

  // 3. Check previously permitted serial ports (navigator.serial.getPorts())
  const nav = navigator as any;
  if (!forcePicker && nav.serial && typeof nav.serial.getPorts === 'function') {
    try {
      const ports = await nav.serial.getPorts();
      if (ports && ports.length > 0) {
        const port = ports[0];
        try {
          await port.open({ baudRate: 9600 });
        } catch {}
        if (port.writable) {
          activeSerialPort = port;
          activePrinterType = 'serial';
          activePrinterName = 'RPP02N / Serial Printer';
          await sendToSerialPort(port, data);
          return {
            success: true,
            message: `Struk berhasil dicetak ke [${activePrinterName}]!`,
            deviceName: activePrinterName,
          };
        }
      }
    } catch {}
  }

  // 4. Prompt user to select port/device:
  // On Desktop Chrome (Mac/Win), Web Serial is preferred for Bluetooth SPP (like RPP02N) & USB
  if (isWebSerialSupported()) {
    try {
      const conn = await connectSerialPrinter();
      if (conn.success && activeSerialPort) {
        await sendToSerialPort(activeSerialPort, data);
        return {
          success: true,
          message: `Struk berhasil dicetak ke [${conn.deviceName}]!`,
          deviceName: conn.deviceName,
        };
      }
      return conn;
    } catch (serialErr: any) {
      if (serialErr?.name === 'NotFoundError') {
        return { success: false, message: 'Pemilihan printer dibatalkan.' };
      }
    }
  }

  // 5. Fallback to Web Bluetooth (BLE)
  if (isWebBluetoothSupported()) {
    try {
      const conn = await connectBluetoothBlePrinter();
      if (conn.success && activeBluetoothDevice) {
        await sendToBluetoothGatt(activeBluetoothDevice, data);
        return {
          success: true,
          message: `Struk berhasil dicetak ke [${conn.deviceName}]!`,
          deviceName: conn.deviceName,
        };
      }
      return conn;
    } catch (btErr: any) {
      return { success: false, message: `Gagal mencetak: ${btErr.message || btErr}` };
    }
  }

  return {
    success: false,
    message: 'Browser tidak mendukung Web Serial atau Web Bluetooth. Gunakan tombol Cetak via Dialog OS.',
  };
}
