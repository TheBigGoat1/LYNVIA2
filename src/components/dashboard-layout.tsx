"use client";

import React from 'react';
import { SidebarProvider, Sidebar, SidebarInset, SidebarRail } from '@/components/ui/sidebar';
import Header from './layout/header';
import SidebarNav from './layout/sidebar-nav';
import type { NavItem } from '@/lib/types';
import { useTranslations } from 'next-intl';

interface DashboardLayoutProps {
  children: React.ReactNode;
  navItems: NavItem[];
}

export function DashboardLayout({ children, navItems }: DashboardLayoutProps) {
  const t = useTranslations('DashboardLayout');
  return (
    <SidebarProvider className="bg-background">
      <div className="relative flex min-h-svh w-full">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-90 dark:opacity-40" aria-hidden>
          <div className="absolute -top-32 right-0 h-[420px] w-[420px] rounded-full bg-accent/15 blur-[100px] dark:bg-primary/10" />
          <div className="absolute bottom-0 left-0 h-[360px] w-[360px] rounded-full bg-primary/10 blur-[90px] dark:bg-muted/20" />
        </div>
        <Sidebar
          collapsible="icon"
          className="border-r border-border/60 bg-background/65 backdrop-blur-xl supports-[backdrop-filter]:bg-background/55 dark:bg-sidebar/90"
        >
          <SidebarNav navItems={navItems} />
          <SidebarRail />
        </Sidebar>
        <SidebarInset className="flex min-h-svh max-h-screen w-full min-w-0 flex-col border-l border-border/40 bg-background/80 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 dark:border-border dark:bg-background">
          <Header />
          <main className="relative flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6 lg:p-8 w-full min-w-0">
            {children}
          </main>
          <footer className="shrink-0 border-t border-border/50 bg-background/60 px-3 py-2.5 backdrop-blur-sm sm:px-4">
            <div className="mx-auto flex max-w-4xl items-center justify-center gap-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              <svg
                className="h-4 w-4 shrink-0 text-primary"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              <span className="text-center leading-tight">
                {t('footer')}
              </span>
            </div>
          </footer>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
