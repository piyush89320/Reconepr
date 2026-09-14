import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ReconEPR',
  description: 'EPR compliance for plastic packaging producers and brand owners',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
