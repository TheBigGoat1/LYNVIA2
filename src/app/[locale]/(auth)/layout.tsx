'use client';
import { Link } from '@/navigation';
import { LanguageToggle } from '@/components/layout/language-toggle';
import { BrandWordmark } from '@/components/brand/brand-wordmark';
import { Calculator, BarChart3, ReceiptSwissFranc, ShieldCheck } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-full overflow-hidden lg:grid lg:grid-cols-2">
      {/* Left Panel - Hero Section */}
      <div className="relative hidden h-full flex-col overflow-hidden bg-slate-950 text-white lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(93,109,58,0.35)_0%,transparent_45%),radial-gradient(ellipse_at_90%_20%,rgba(91,77,128,0.3)_0%,transparent_42%),linear-gradient(165deg,var(--swiss-midnight-void)_0%,var(--swiss-alpine-slate)_55%,#0f172a_100%)]" />
        <svg
          className="absolute inset-0 h-full w-full opacity-30"
          viewBox="0 0 800 1000"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="lineA" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.5" />
            </linearGradient>
          </defs>
          <path d="M70 780 C 190 640, 260 680, 380 520 S 620 320, 740 120" stroke="url(#lineA)" strokeWidth="3" fill="none" />
          <path d="M70 830 C 180 720, 280 760, 380 650 S 610 470, 740 300" stroke="url(#lineA)" strokeWidth="2" fill="none" />
          <rect x="120" y="680" width="84" height="180" rx="12" fill="#0f172a" opacity="0.8" />
          <rect x="230" y="620" width="84" height="240" rx="12" fill="#1e293b" opacity="0.8" />
          <rect x="340" y="560" width="84" height="300" rx="12" fill="#334155" opacity="0.8" />
        </svg>

        <div className="relative z-20 flex h-full flex-col p-8 lg:p-10">
          {/* Logo */}
          <Link
            href="/"
            className="min-w-0 text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          >
            <BrandWordmark invertOnDark tone="dashboard" className="min-w-0" />
          </Link>

          <div className="flex-1" />

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm">
              <div className="mb-2 flex items-center gap-2 text-white/85">
                <ReceiptSwissFranc className="h-4 w-4" />
                Tax filing
              </div>
              <p className="text-xs text-white/70">Swiss-ready templates and guided workflows.</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm">
              <div className="mb-2 flex items-center gap-2 text-white/85">
                <Calculator className="h-4 w-4" />
                Smart estimates
              </div>
              <p className="text-xs text-white/70">Transparent costs before submission.</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm">
              <div className="mb-2 flex items-center gap-2 text-white/85">
                <BarChart3 className="h-4 w-4" />
                Financial clarity
              </div>
              <p className="text-xs text-white/70">Track progress and service status in one place.</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm">
              <div className="mb-2 flex items-center gap-2 text-white/85">
                <ShieldCheck className="h-4 w-4" />
                Secure onboarding
              </div>
              <p className="text-xs text-white/70">Protected identity and document handling.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form Section */}
      <div className="flex h-screen flex-col bg-[var(--swiss-mineral-cream)] dark:bg-background">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 lg:px-8 lg:py-5">
          {/* Mobile Logo */}
          <Link href="/" className="min-w-0 lg:hidden">
            <BrandWordmark tone="dashboard" className="min-w-0" />
          </Link>

          <div className="hidden lg:block" />

          <LanguageToggle />
        </div>

        {/* Form Container */}
        <div className="flex flex-1 items-start justify-center px-4 pt-1 pb-2 sm:px-6 lg:px-8">
          <div className="w-full max-w-[520px]">
            {children}
          </div>
        </div>

        {/* Footer */}
        <div className="hidden p-3 text-center lg:block">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Lynvia Digital. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}