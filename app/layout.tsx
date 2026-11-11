import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth/auth-context';
import { AosProvider } from '@/components/public/aos-provider';

export const metadata: Metadata = {
  title: {
    default: 'The Youth Church',
    template: '%s · The Youth Church',
  },
  description: 'The Youth Church of the Epiphany — a community of faith, hope, and love.',
  icons: {
    icon: '/images/logo/image.png',
    shortcut: '/images/logo/image.png',
    apple: '/images/logo/image.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://player.vimeo.com" />
        <link rel="preconnect" href="https://f.vimeocdn.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://player.vimeo.com" />
        <link rel="dns-prefetch" href="https://i.vimeocdn.com" />
      </head>
      <body className="font-sans antialiased">
        <AosProvider />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
