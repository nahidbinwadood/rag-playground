import type { Metadata } from 'next';
import { Hind_Siliguri, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

// Hind Siliguri was designed for Bangla and Latin together, so mixed-language answers look consistent.
const hind = Hind_Siliguri({ variable: '--font-hind', subsets: ['latin', 'bengali'], weight: ['400', '500', '600', '700'] });
const mono = IBM_Plex_Mono({ variable: '--font-plex-mono', subsets: ['latin'], weight: ['400', '500'] });

export const metadata: Metadata = {
  title: 'Pathao Help (unofficial demo)',
  description: 'Unofficial demo support chat for Pathao, answered from the help center with RAG.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${hind.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
