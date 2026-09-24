import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Kopi Seruni POS',
    short_name: 'Kopi Seruni',
    description: 'Sistem Kasir dan Operasional Toko Kopi Seruni',
    start_url: '/',
    id: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#FFFAF5',
    theme_color: '#201C1A',
    lang: 'id',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Kasir',
        url: '/pos',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Dashboard',
        url: '/dashboard',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
    ],
  };
}
