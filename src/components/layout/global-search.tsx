"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  FileText, 
  Calculator, 
  Baby, 
  Heart, 
  Briefcase, 
  Upload, 
  Gavel, 
  Settings, 
  Bell, 
  Package, 
  Folder,
  PiggyBank,
  Landmark,
  ArrowRight,
  Command
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFirebase } from "@/firebase/firebase-provider";

interface GlobalAction {
  id: string;
  keywords: string[];
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
  category: "scenario" | "document" | "navigation" | "action";
}

// Define all global actions with keywords for fuzzy matching
const GLOBAL_ACTIONS: GlobalAction[] = [
  // Scenario actions
  {
    id: "add-child",
    keywords: ["add child", "new child", "baby", "child birth", "kid", "enfant", "kind", "bambino", "niño"],
    label: "Add a Child Scenario",
    description: "Calculate impact of adding a child",
    href: "/individual/scenario-calculator?tab=child_birth",
    icon: Baby,
    category: "scenario",
  },
  {
    id: "marriage",
    keywords: ["marriage", "marry", "wedding", "spouse", "mariage", "heirat", "matrimonio", "boda"],
    label: "Marriage Scenario",
    description: "Calculate marriage tax impact",
    href: "/individual/scenario-calculator?tab=marriage",
    icon: Heart,
    category: "scenario",
  },
  {
    id: "income-change",
    keywords: ["salary", "income", "raise", "promotion", "salary change", "income change", "gehalt", "salaire", "stipendio"],
    label: "Income Change Scenario",
    description: "Simulate salary changes",
    href: "/individual/scenario-calculator?tab=income_change",
    icon: Briefcase,
    category: "scenario",
  },
  {
    id: "job-loss",
    keywords: ["job loss", "unemployment", "fired", "laid off", "chômage", "arbeitslos", "disoccupazione"],
    label: "Job Loss Scenario",
    description: "Estimate unemployment benefits",
    href: "/individual/scenario-calculator?tab=job_loss",
    icon: Briefcase,
    category: "scenario",
  },
  {
    id: "pillar-3a",
    keywords: ["pillar 3a", "3a", "retirement", "pension", "save tax", "prévoyance", "vorsorge", "previdenza"],
    label: "Pillar 3a Contribution",
    description: "Calculate tax savings",
    href: "/individual/scenario-calculator?tab=pillar_3a",
    icon: PiggyBank,
    category: "scenario",
  },
  {
    id: "pillar-2",
    keywords: ["pillar 2", "2nd pillar", "buyback", "pension fund", "rachat", "einkauf", "riscatto"],
    label: "Pillar 2 Buyback",
    description: "Simulate pension buyback",
    href: "/individual/scenario-calculator?tab=pillar_2_buyback",
    icon: Landmark,
    category: "scenario",
  },
  // Document actions
  {
    id: "generate-doc",
    keywords: ["generate document", "create document", "new document", "template", "dokument", "documento"],
    label: "Generate Document",
    description: "Create a new document",
    href: "/individual/document-generator",
    icon: FileText,
    category: "document",
  },
  {
    id: "upload-tax",
    keywords: ["upload tax", "tax return", "tax documents", "upload documents", "steuererklärung", "déclaration", "dichiarazione"],
    label: "Upload Tax Documents",
    description: "Submit documents for tax return",
    href: "/individual/tax-services",
    icon: Upload,
    category: "action",
  },
  // Navigation
  {
    id: "legal-question",
    keywords: ["legal", "ask legal", "lawyer", "question", "juridique", "rechtlich", "legale"],
    label: "Ask Legal Question",
    description: "Chat with Legal AI",
    href: "/individual/legal-assistant",
    icon: Gavel,
    category: "navigation",
  },
  {
    id: "my-documents",
    keywords: ["my documents", "files", "downloads", "mes documents", "meine dokumente", "miei documenti"],
    label: "My Documents",
    description: "View generated documents",
    href: "/individual/my-documents",
    icon: Folder,
    category: "navigation",
  },
  {
    id: "my-orders",
    keywords: ["orders", "purchases", "services", "commandes", "bestellungen", "ordini"],
    label: "My Orders",
    description: "Track service purchases",
    href: "/individual/my-orders",
    icon: Package,
    category: "navigation",
  },
  {
    id: "notifications",
    keywords: ["notifications", "alerts", "messages", "benachrichtigungen", "notifiche"],
    label: "Notifications",
    description: "View all notifications",
    href: "/individual/notifications",
    icon: Bell,
    category: "navigation",
  },
  {
    id: "settings",
    keywords: ["settings", "profile", "account", "preferences", "paramètres", "einstellungen", "impostazioni"],
    label: "Profile Settings",
    description: "Manage your profile",
    href: "/individual/settings",
    icon: Settings,
    category: "navigation",
  },
  {
    id: "scenario-calc",
    keywords: ["calculator", "scenario", "tax calculator", "calculate", "rechner", "calculateur", "calcolatore"],
    label: "Scenario Calculator",
    description: "Run tax scenarios",
    href: "/individual/scenario-calculator",
    icon: Calculator,
    category: "navigation",
  },
];

export function GlobalSearch() {
  const t = useTranslations("Header");
  const locale = useLocale();
  const router = useRouter();
  const { userRole } = useFirebase();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter actions based on query
  const filteredActions = useMemo(() => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase().trim();
    
    return GLOBAL_ACTIONS.filter(action => 
      action.keywords.some(kw => kw.toLowerCase().includes(lowerQuery)) ||
      action.label.toLowerCase().includes(lowerQuery) ||
      action.description.toLowerCase().includes(lowerQuery)
    ).slice(0, 6); // Max 6 results
  }, [query]);

  // Show dropdown when there are results
  useEffect(() => {
    setIsOpen(filteredActions.length > 0);
    setSelectedIndex(0);
  }, [filteredActions]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredActions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case "Enter":
        e.preventDefault();
        if (filteredActions[selectedIndex]) {
          navigateTo(filteredActions[selectedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const navigateTo = (action: GlobalAction) => {
    setQuery("");
    setIsOpen(false);
    router.push(`/${locale}${action.href}`);
  };

  // Only show for individual users
  if (userRole !== "individual") {
    return (
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          className="pl-8 sm:pl-9 h-9 sm:h-10 text-sm"
          placeholder={t("searchPlaceholder")}
        />
      </div>
    );
  }

  return (
    <div className="relative flex-1 min-w-0">
      <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input 
        ref={inputRef}
        className="pl-8 sm:pl-9 pr-2 sm:pr-16 h-9 sm:h-10 text-sm"
        placeholder={t("searchPlaceholder")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => query.trim() && setIsOpen(filteredActions.length > 0)}
      />
      <kbd className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
        <Command className="h-3 w-3" />K
      </kbd>

      {/* Dropdown */}
      {isOpen && (
        <div 
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-50 overflow-hidden"
        >
          <div className="p-1">
            <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Quick Actions
            </p>
            {filteredActions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => navigateTo(action)}
                  className={cn(
                    "w-full flex items-center gap-3 px-2 py-2 rounded-md text-left transition-colors",
                    idx === selectedIndex 
                      ? "bg-accent text-accent-foreground" 
                      : "hover:bg-muted"
                  )}
                >
                  <div className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center",
                    action.category === "scenario" && "bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400",
                    action.category === "document" && "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400",
                    action.category === "navigation" && "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
                    action.category === "action" && "bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400",
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{action.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{action.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
