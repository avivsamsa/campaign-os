import type { ReactNode } from 'react';
import './globals.css';
import Sidebar from './Sidebar';

export const metadata = {
  title: 'Campaign OS',
  description: 'Internal performance management for the campaign service.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <div className="app-shell">
          <Sidebar />
          <div className="app-main">{children}</div>
        </div>
      </body>
    </html>
  );
}
