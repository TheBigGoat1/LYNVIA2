import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import Script from 'next/script';

const fontBody = Inter({
  subsets: ['latin'],
  variable: '--font-body',
});

export const metadata: Metadata = {
  title: 'Lynvia Digital',
  description: 'Swiss financial and legal intelligence platform',
};

/** Lets iOS / Samsung browsers use safe-area insets (notch, home indicator). */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf9f6' },
    { media: '(prefers-color-scheme: dark)', color: '#020617' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning className="h-full min-h-0 overflow-x-hidden">
      <body
        className={cn(
          'antialiased min-h-dvh overflow-x-hidden overflow-y-auto [-webkit-tap-highlight-color:transparent]',
          fontBody.variable,
        )}
      >
        {/* Run before paint so marketing landing can hide scrollbars without a hydration flash */}
        <Script id="landing-scroll-init" strategy="beforeInteractive">
          {`(function(){try{var p=(location.pathname||'/').replace(/\\/+$/, '')||'/';var L=['en','de','fr','es','it'];var home=p==='/'||L.some(function(l){return p==='/'+l;});if(home)document.documentElement.setAttribute('data-landing-scroll','true');}catch(e){}})();`}
        </Script>
        {children}
      </body>
    </html>
  );
}
