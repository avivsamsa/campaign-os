import type { ReactNode } from 'react';
import { Heebo } from 'next/font/google';
import './globals.css';
import Sidebar from './Sidebar';

// Heebo — Hebrew-first sans serif designed by Oded Ezer; consistent latin + hebrew
const heebo = Heebo({
  subsets: ['hebrew', 'latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-heebo',
});

export const metadata = {
  title: 'Campaign OS',
  description: 'Internal performance management for the campaign service.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
      <body>
        <div className="app-shell">
          <Sidebar />
          <div className="app-main">{children}</div>
        </div>
      </body>
    </html>
  );
}
