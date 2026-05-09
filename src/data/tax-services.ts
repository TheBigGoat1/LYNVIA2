import { 
  Landmark,
  Briefcase,
  User,
  Users,
  ScrollText,
  LucideIcon 
} from "lucide-react";

import {
  TAX_DECLARATION_SERVICE_CONFIG,
  type TaxDeclarationServiceId,
} from "@/lib/tax-service-pricing";

export type TaxService = {
  id: TaxDeclarationServiceId;
  title: string;
  description: string;
  basePrice: number; // Price in cents (CHF)
  hasVariants: boolean;
  icon: LucideIcon;
  actionText: string;
  requiresContact: boolean;
};

export const taxServices: TaxService[] = [
  {
    id: 'couple-inactive',
    title: TAX_DECLARATION_SERVICE_CONFIG['couple-inactive'].title,
    description: TAX_DECLARATION_SERVICE_CONFIG['couple-inactive'].description,
    basePrice: TAX_DECLARATION_SERVICE_CONFIG['couple-inactive'].basePriceCents,
    hasVariants: true,
    icon: Users,
    actionText: 'Configure & Continue',
    requiresContact: false,
  },
  {
    id: 'couple-retired',
    title: TAX_DECLARATION_SERVICE_CONFIG['couple-retired'].title,
    description: TAX_DECLARATION_SERVICE_CONFIG['couple-retired'].description,
    basePrice: TAX_DECLARATION_SERVICE_CONFIG['couple-retired'].basePriceCents,
    hasVariants: true,
    icon: Landmark,
    actionText: 'Configure & Continue',
    requiresContact: false,
  },
  {
    id: 'couple-salaried',
    title: TAX_DECLARATION_SERVICE_CONFIG['couple-salaried'].title,
    description: TAX_DECLARATION_SERVICE_CONFIG['couple-salaried'].description,
    basePrice: TAX_DECLARATION_SERVICE_CONFIG['couple-salaried'].basePriceCents,
    hasVariants: true,
    icon: Briefcase,
    actionText: 'Configure & Continue',
    requiresContact: false,
  },
  {
    id: 'single-inactive',
    title: TAX_DECLARATION_SERVICE_CONFIG['single-inactive'].title,
    description: TAX_DECLARATION_SERVICE_CONFIG['single-inactive'].description,
    basePrice: TAX_DECLARATION_SERVICE_CONFIG['single-inactive'].basePriceCents,
    hasVariants: true,
    icon: User,
    actionText: 'Configure & Continue',
    requiresContact: false,
  },
  {
    id: 'single-retired',
    title: TAX_DECLARATION_SERVICE_CONFIG['single-retired'].title,
    description: TAX_DECLARATION_SERVICE_CONFIG['single-retired'].description,
    basePrice: TAX_DECLARATION_SERVICE_CONFIG['single-retired'].basePriceCents,
    hasVariants: true,
    icon: Landmark,
    actionText: 'Configure & Continue',
    requiresContact: false,
  },
  {
    id: 'single-salaried',
    title: TAX_DECLARATION_SERVICE_CONFIG['single-salaried'].title,
    description: TAX_DECLARATION_SERVICE_CONFIG['single-salaried'].description,
    basePrice: TAX_DECLARATION_SERVICE_CONFIG['single-salaried'].basePriceCents,
    hasVariants: true,
    icon: Briefcase,
    actionText: 'Configure & Continue',
    requiresContact: false,
  },
  {
    id: 'permit-b-simplified',
    title: TAX_DECLARATION_SERVICE_CONFIG['permit-b-simplified'].title,
    description: TAX_DECLARATION_SERVICE_CONFIG['permit-b-simplified'].description,
    basePrice: TAX_DECLARATION_SERVICE_CONFIG['permit-b-simplified'].basePriceCents,
    hasVariants: false,
    icon: ScrollText,
    actionText: 'Continue to Checkout',
    requiresContact: false,
  },
];

export function getServiceById(id: string): TaxService | undefined {
  return taxServices.find(service => service.id === id);
}
