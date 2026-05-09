"use client";

import { useEffect, useState } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { UserNav } from "./user-nav";
import { ThemeToggle } from "./theme-toggle";
import { LanguageToggle } from "./language-toggle";
import { useFirebase } from "@/firebase/firebase-provider";
import { NotificationBellMenu } from "@/components/notifications/notification-bell-menu";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { usePrivacyMode } from "@/components/privacy-mode-context";
import { GlobalSearch } from "./global-search";
import { useTranslations } from "next-intl";

export default function Header() {
  const { userRole, userProfile } = useFirebase();
  const tHeader = useTranslations("AppHeader");
  const isAdmin = userRole === 'admin';
  const isUserNotificationRole = userRole === 'individual' || userRole === 'business' || userRole === 'accounting_firm';

  const showNotifications = isAdmin || isUserNotificationRole;
  const showPrivacyToggle = userRole === 'individual';

  // Falls back to defaults when used outside PrivacyModeProvider
  const { isPrivacyMode, togglePrivacyMode } = usePrivacyMode();

  const [greetingKey, setGreetingKey] = useState<"morning" | "afternoon" | "evening">("morning");
  useEffect(() => {
    const h = new Date().getHours();
    setGreetingKey(h < 12 ? "morning" : h < 18 ? "afternoon" : "evening");
  }, []);

  const firstName = userProfile?.firstName?.trim();
  const showGreeting = userRole === "individual" && Boolean(firstName);

  return (
    <header className="sticky top-0 z-40 flex h-14 sm:h-16 shrink-0 items-center gap-x-2 sm:gap-x-4 border-b border-border/60 bg-background/85 px-2 shadow-sm backdrop-blur-md sm:px-4 dark:bg-background/90">
      <div className="flex shrink-0 items-center gap-2 rounded-lg border border-border/50 bg-muted/25 px-1 py-0.5 md:border-0 md:bg-transparent md:p-0">
        <SidebarTrigger
          className="h-9 w-9 shrink-0 md:h-8 md:w-8"
          aria-label={tHeader("toggleNavigation")}
        />
        <span className="inline max-w-[4.5rem] truncate text-xs font-medium text-muted-foreground md:hidden">
          {tHeader("menu")}
        </span>
      </div>

      <div className="mx-0.5 hidden h-7 w-px shrink-0 bg-border sm:block" aria-hidden />
      
      <div className="flex flex-1 min-w-0 items-center gap-x-1 sm:gap-x-4 self-stretch lg:gap-x-6">
        {showGreeting && (
          <p className="hidden min-w-0 max-w-[220px] truncate text-sm text-muted-foreground md:block lg:max-w-xs">
            <span>{tHeader(greetingKey)}, </span>
            <span className="font-semibold text-foreground sensitive-data">{firstName}</span>
          </p>
        )}
        <GlobalSearch />
        <div className="flex items-center gap-x-1 sm:gap-x-2 flex-shrink-0">
            <LanguageToggle />
            <ThemeToggle />

            {/* Privacy Mode Toggle – individual users only */}
            {showPrivacyToggle && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isPrivacyMode ? 'default' : 'outline'}
                      size="icon"
                      onClick={togglePrivacyMode}
                      className={
                        isPrivacyMode
                          ? 'h-10 w-10 border-2 border-amber-400 bg-amber-500 text-white shadow-md hover:bg-amber-600'
                          : 'h-10 w-10 border-2 border-border text-foreground hover:bg-muted'
                      }
                      aria-label={tHeader('togglePrivacyMode')}
                    >
                      {isPrivacyMode ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isPrivacyMode ? tHeader('showFinancialData') : tHeader('hideFinancialData')}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Swiss Data Trust Badge */}
            {showPrivacyToggle && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="hidden sm:flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400 cursor-default select-none">
                      <ShieldCheck className="h-3 w-3" />
                      {tHeader('swissData')}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {tHeader('dataEncrypted')}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {showNotifications && <NotificationBellMenu userRole={userRole} />}
            <UserNav />
        </div>
      </div>
    </header>
  );
}
