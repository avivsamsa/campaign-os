import type { ReactNode } from 'react';
import { Heebo } from 'next/font/google';
import './globals.css';
import Sidebar from './Sidebar';
import SplashScreen from './SplashScreen';

// Heebo — Hebrew-first sans serif designed by Oded Ezer; consistent latin + hebrew
const heebo = Heebo({
  subsets: ['hebrew', 'latin'],
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-heebo',
});

// אתחול theme לפני paint — מונע הבזק. dark = ברירת מחדל (בלי data-theme).
const themeInit = `(function(){try{var t=localStorage.getItem('theme');if(t==='light')document.documentElement.setAttribute('data-theme','light');}catch(e){}})();`;

export const metadata = {
  title: 'Campaign OS',
  description: 'Internal performance management for the campaign service.',
};

// mobile-first: התאמה למכשירים + תמיכה ב-safe areas (notch / home indicator)
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
  themeColor: '#0E0C0B',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <SplashScreen />
        <div className="app-shell">
          <Sidebar />
          <div className="app-main">{children}</div>
        </div>
      </body>
    </html>
  );
}
