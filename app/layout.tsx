import type { Metadata } from 'next';
import { Geist_Mono } from 'next/font/google';
import './globals.css';

const mono = Geist_Mono({ variable: '--font-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Mare Infinitus — Material Study',
  description: 'A living pixel simulation of an endless alien ocean.',
  openGraph: {
    title: 'Mare Infinitus',
    description: 'A living pixel simulation of an endless alien ocean.',
    images: [{ url: '/og.png', width: 1672, height: 941, alt: 'Mare Infinitus — a violet ocean beneath an enormous orange world' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mare Infinitus',
    description: 'A living pixel simulation of an endless alien ocean.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={mono.variable}>{children}</body>
    </html>
  );
}
