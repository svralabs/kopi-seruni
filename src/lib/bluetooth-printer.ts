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

export function isBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

export async function printDirectBluetooth(data: Uint8Array): Promise<{ success: boolean; message: string }> {
  const nav = navigator as any;
  if (!nav.bluetooth) {
    return {
      success: false,
      message: 'Web Bluetooth tidak didukung di browser ini. Gunakan Google Chrome atau Microsoft Edge.',
    };
  }

  try {
    // 1. Request Bluetooth Device with printer service filter
    const device = await nav.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: BLUETOOTH_PRINT_SERVICES,
    });

    if (!device.gatt) {
      return { success: false, message: 'Printer tidak mendukung koneksi GATT Bluetooth.' };
    }

    // 2. Connect to GATT Server
    const server = await device.gatt.connect();

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
      return { success: false, message: 'Tidak menemukan port tulis (write characteristic) pada printer.' };
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

    // Disconnect after print finished
    setTimeout(() => {
      if (device.gatt?.connected) {
        device.gatt.disconnect();
      }
    }, 1000);

    return { success: true, message: 'Struk berhasil dicetak langsung ke printer Bluetooth!' };
  } catch (error: any) {
    if (error.name === 'NotFoundError') {
      return { success: false, message: 'Pencarian perangkat dibatalkan.' };
    }
    return { success: false, message: `Gagal cetak Bluetooth: ${error.message || error}` };
  }
}
