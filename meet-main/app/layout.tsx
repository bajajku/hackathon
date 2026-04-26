import '@livekit/components-styles';
import '@livekit/components-styles/prefabs';
import '../styles/globals.css';
import type { Metadata, Viewport } from 'next';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Coda — Every meeting deserves a coda',
    template: '%s · Coda',
  },
  description:
    'Coda turns meeting transcripts into reports, podcasts, decks, quizzes, and more — automatically, the moment you leave the room.',
  twitter: {
    card: 'summary_large_image',
  },
  openGraph: {
    url: '/',
    siteName: 'Coda',
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
