import '@livekit/components-styles';
import '@livekit/components-styles/prefabs';
import '../styles/globals.css';
import type { Metadata, Viewport } from 'next';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'SpacePresent | Spatial interactive meetings',
    template: '%s',
  },
  description:
    'SpacePresent turns meetings and dense information into navigable collaborative knowledge spaces.',
  twitter: {
    card: 'summary_large_image',
  },
  openGraph: {
    url: '/',
    images: [
      {
        url: '/images/spacepresent-logo.svg',
        width: 520,
        height: 96,
        type: 'image/svg+xml',
      },
    ],
    siteName: 'SpacePresent',
  },
  icons: {
    icon: {
      rel: 'icon',
      url: '/images/spacepresent-mark.svg',
    },
    apple: [
      {
        rel: 'apple-touch-icon',
        url: '/images/spacepresent-mark.svg',
        sizes: '180x180',
      },
      { rel: 'mask-icon', url: '/images/spacepresent-mark.svg', color: '#050912' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#050912',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body data-lk-theme="default">
        <Toaster />
        {children}
      </body>
    </html>
  );
}
