import type { LucideIcon } from "lucide-react";

export type UserRole = "individual" | "business" | "accounting_firm" | "admin";

export type User = {
  userId: string;
  email: string;
  role: UserRole;
  companyId: string | null;
  profile: {
    firstName: string;
    lastName: string;
    phone: string;
    canton: string;
  };
  createdAt: Date;
  status: "active" | "pending" | "suspended";
};

export type NavItem = {
  title: string;
  tKey?: string;
  href: string;
  icon: keyof typeof import("lucide-react");
  badge?: number;
  items?: NavItem[];
};
