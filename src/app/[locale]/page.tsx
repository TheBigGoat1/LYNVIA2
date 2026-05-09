'use client';

import { useState, useLayoutEffect, Suspense } from 'react';
import { Link } from '@/navigation';
import { useLocale } from 'next-intl';
import { LanguageToggle } from '@/components/layout/language-toggle';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { ScrollReveal } from '@/components/ui/scroll-reveal';
import { BrandWordmark } from '@/components/brand/brand-wordmark';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  Calculator,
  Clock,
  FileUp,
  Users,
  AlertCircle,
  Bell,
  Lock,
  ArrowRight,
  Brain,
  TrendingUp,
  ShieldCheck,
  Briefcase,
  Sparkles,
} from 'lucide-react';
import { LandingOnboardingSync } from '@/components/landing/landing-onboarding-sync';

// ── Supported Locales ──────────────────────────────────────────────────────
type SupportedLocale = 'en' | 'fr' | 'de' | 'it' | 'es';

const resolveLocale = (locale: string): SupportedLocale => {
  const normalized = locale.toLowerCase().split('-')[0];
  if (normalized === 'fr' || normalized === 'de' || normalized === 'it' || normalized === 'es') {
    return normalized;
  }
  return 'en'; // Default to English
};

// ── Localization Strings ───────────────────────────────────────────────────
interface UIStrings {
  tagline: string;
  clientAccess: string;
  explorePlatform: string;
  workflowTitle: string;
  tabParticuliers: string;
  tabBusiness: string;
  tabFiduciaires: string;
  particuliersBadge: string;
  particuliersTitle1: string;
  particuliersTitle2: string;
  particuliersDesc: string;
  businessBadge: string;
  businessTitle1: string;
  businessTitle2: string;
  businessDesc: string;
  fiduciairesBadge: string;
  fiduciairesTitle1: string;
  fiduciairesTitle2: string;
  fiduciairesDesc: string;
  featureAITitle: string;
  featureAIDesc: string;
  featureScenariosTitle: string;
  featureScenariosDesc: string;
  featureComplianceTitle: string;
  featureComplianceDesc: string;
  footerTagline: string;
  footerCopyright: string;
  footerHosted: string;
  registerCta: string;
  notifDocReady: string;
  notifDocReadyDesc: string;
  notifScenarioCalc: string;
  notifScenarioCalcDesc: string;
  notifTimeEntry: string;
  notifTimeEntryDesc: string;
  notifHRDocs: string;
  notifHRDocsDesc: string;
  notifNewClient: string;
  notifNewClientDesc: string;
  notifDeadline: string;
  notifDeadlineDesc: string;
}

const UI_STRINGS: Record<SupportedLocale, UIStrings> = {
  en: {
    tagline: 'All-in-One Financial Solution',
    clientAccess: 'Client Access',
    explorePlatform: 'Explore the platform',
    workflowTitle: 'Workflow',
    tabParticuliers: 'Individuals',
    tabBusiness: 'Business',
    tabFiduciaires: 'Fiduciaries Pro',
    particuliersBadge: 'Individuals',
    particuliersTitle1: 'Financial clarity',
    particuliersTitle2: 'for the long term.',
    particuliersDesc: 'Use AI to create your legal documents and compare your financial scenarios via our APIs. Each document is subject to human validation for total reliability.',
    businessBadge: 'Business Exclusive',
    businessTitle1: 'Quality service',
    businessTitle2: 'exchange.',
    businessDesc: 'Reserved for our clients. Exchange your documents securely, receive your payroll notifications and access Virtual CFO analysis in real time.',
    fiduciairesBadge: 'Fiduciaries Pro',
    fiduciairesTitle1: 'A reference for',
    fiduciairesTitle2: 'fiduciaries.',
    fiduciairesDesc: 'Offer your own clients Lynvia tools: dedicated section per client, notifications, document exchange and Swiss legal database.',
    featureAITitle: 'AI & Database',
    featureAIDesc: 'Responses based exclusively on our updated legal database to guarantee zero margin of error.',
    featureScenariosTitle: 'Financial Scenarios',
    featureScenariosDesc: 'Compare different complex scenarios through our API calls and receive structural analysis by AI.',
    featureComplianceTitle: 'Swiss Compliance',
    featureComplianceDesc: 'Tools designed to comply with Swiss law specifics (payroll, legal and tax contracts).',
    footerTagline: 'Financial reference tool',
    footerCopyright: '© 2026 Lynvia Digital – Excellence & Compliance',
    footerHosted: 'Hosted in Switzerland',
    registerCta: 'Create account',
    notifDocReady: 'Document Ready',
    notifDocReadyDesc: 'Your contract has been validated by admin and sent.',
    notifScenarioCalc: 'Scenario Calculated',
    notifScenarioCalcDesc: 'Your LPP buyback analysis is available.',
    notifTimeEntry: 'Time Entry',
    notifTimeEntryDesc: 'Don\'t forget to fill in the hours for payroll.',
    notifHRDocs: 'HR Documents',
    notifHRDocsDesc: 'Payslips generated and available.',
    notifNewClient: 'New Client',
    notifNewClientDesc: 'A new client file has been created in your section.',
    notifDeadline: 'Deadline',
    notifDeadlineDesc: 'Reminder: VAT deadline for InnovTech group.',
  },
  fr: {
    tagline: 'Solution Financière All-in-One',
    clientAccess: 'Accès Client',
    explorePlatform: 'Explorer la plateforme',
    workflowTitle: 'Flux de Travail',
    tabParticuliers: 'Particuliers',
    tabBusiness: 'Business',
    tabFiduciaires: 'Fiduciaires Pro',
    particuliersBadge: 'Individuels',
    particuliersTitle1: 'Clarté financière',
    particuliersTitle2: 'à long terme.',
    particuliersDesc: 'Utilisez l\'IA pour créer vos documents juridiques et comparer vos scénarios financiers via nos APIs. Chaque document est soumis à validation humaine pour une fiabilité totale.',
    businessBadge: 'Business Exclusive',
    businessTitle1: 'Qualité de service',
    businessTitle2: 'échange.',
    businessDesc: 'Réservé à nos clients. Échangez vos documents en toute sécurité, recevez vos notifications payroll et accédez à l\'analyse Virtual CFO en temps réel.',
    fiduciairesBadge: 'Fiduciaires Pro',
    fiduciairesTitle1: 'Une référence pour',
    fiduciairesTitle2: 'les fiduciaires.',
    fiduciairesDesc: 'Proposez à vos propres clients les outils Lynvia : section dédiée par client, notifications, échange de documents et base de données légale suisse.',
    featureAITitle: 'IA & Base de Données',
    featureAIDesc: 'Réponses basées exclusivement sur notre base juridique mise à jour pour garantir l\'absence de marge d\'erreur.',
    featureScenariosTitle: 'Scénarios Financiers',
    featureScenariosDesc: 'Comparez différents scénarios complexes grâce à nos appels API et recevez une analyse structurelle par l\'IA.',
    featureComplianceTitle: 'Conformité Suisse',
    featureComplianceDesc: 'Outils conçus pour respecter les spécificités du droit suisse (payroll, contrats juridiques et fiscaux).',
    footerTagline: 'Outil de référence financière',
    footerCopyright: '© 2026 Lynvia Digital – Excellence & Conformité',
    footerHosted: 'Hébergé en Suisse',
    registerCta: 'Créer un compte',
    notifDocReady: 'Document Prêt',
    notifDocReadyDesc: 'Votre contrat a été validé par l\'admin et envoyé.',
    notifScenarioCalc: 'Scénario Calculé',
    notifScenarioCalcDesc: 'L\'analyse de votre rachat LPP est disponible.',
    notifTimeEntry: 'Saisie des heures',
    notifTimeEntryDesc: 'N\'oubliez pas de remplir les heures pour le payroll.',
    notifHRDocs: 'Documents RH',
    notifHRDocsDesc: 'Fiches de salaire générées et disponibles.',
    notifNewClient: 'Nouveau Client',
    notifNewClientDesc: 'Un nouveau dossier client a été créé dans votre section.',
    notifDeadline: 'Échéance',
    notifDeadlineDesc: 'Rappel : Échéance TVA pour le groupe InnovTech.',
  },
  de: {
    tagline: 'All-in-One Finanzlösung',
    clientAccess: 'Kundenzugang',
    explorePlatform: 'Plattform erkunden',
    workflowTitle: 'Arbeitsablauf',
    tabParticuliers: 'Privatpersonen',
    tabBusiness: 'Business',
    tabFiduciaires: 'Treuhand Pro',
    particuliersBadge: 'Privatpersonen',
    particuliersTitle1: 'Finanzielle Klarheit',
    particuliersTitle2: 'langfristig.',
    particuliersDesc: 'Nutzen Sie KI, um Ihre Rechtsdokumente zu erstellen und Ihre Finanzszenarien über unsere APIs zu vergleichen. Jedes Dokument wird menschlich validiert für totale Zuverlässigkeit.',
    businessBadge: 'Business Exklusiv',
    businessTitle1: 'Servicequalität',
    businessTitle2: 'Austausch.',
    businessDesc: 'Reserviert für unsere Kunden. Tauschen Sie Ihre Dokumente sicher aus, erhalten Sie Ihre Lohnabrechnungsbenachrichtigungen und greifen Sie in Echtzeit auf Virtual CFO-Analysen zu.',
    fiduciairesBadge: 'Treuhand Pro',
    fiduciairesTitle1: 'Eine Referenz für',
    fiduciairesTitle2: 'Treuhänder.',
    fiduciairesDesc: 'Bieten Sie Ihren eigenen Kunden Lynvia-Tools: dedizierter Bereich pro Kunde, Benachrichtigungen, Dokumentenaustausch und Schweizer Rechtsdatenbank.',
    featureAITitle: 'KI & Datenbank',
    featureAIDesc: 'Antworten basieren ausschließlich auf unserer aktualisierten Rechtsdatenbank, um eine Null-Fehlerquote zu garantieren.',
    featureScenariosTitle: 'Finanzszenarien',
    featureScenariosDesc: 'Vergleichen Sie verschiedene komplexe Szenarien durch unsere API-Aufrufe und erhalten Sie Strukturanalysen durch KI.',
    featureComplianceTitle: 'Schweizer Konformität',
    featureComplianceDesc: 'Tools, die auf die Besonderheiten des Schweizer Rechts zugeschnitten sind (Lohnabrechnung, Rechts- und Steuerverträge).',
    footerTagline: 'Finanzreferenz-Tool',
    footerCopyright: '© 2026 Lynvia Digital – Exzellenz & Konformität',
    footerHosted: 'Gehostet in der Schweiz',
    registerCta: 'Konto erstellen',
    notifDocReady: 'Dokument bereit',
    notifDocReadyDesc: 'Ihr Vertrag wurde vom Admin validiert und gesendet.',
    notifScenarioCalc: 'Szenario berechnet',
    notifScenarioCalcDesc: 'Ihre BVG-Rückkaufanalyse ist verfügbar.',
    notifTimeEntry: 'Zeiterfassung',
    notifTimeEntryDesc: 'Vergessen Sie nicht, die Stunden für die Lohnabrechnung auszufüllen.',
    notifHRDocs: 'HR-Dokumente',
    notifHRDocsDesc: 'Gehaltsabrechnungen erstellt und verfügbar.',
    notifNewClient: 'Neuer Kunde',
    notifNewClientDesc: 'Ein neues Kundendossier wurde in Ihrem Bereich erstellt.',
    notifDeadline: 'Frist',
    notifDeadlineDesc: 'Erinnerung: MwSt-Frist für InnovTech Gruppe.',
  },
  it: {
    tagline: 'Soluzione Finanziaria All-in-One',
    clientAccess: 'Accesso Cliente',
    explorePlatform: 'Esplora la piattaforma',
    workflowTitle: 'Flusso di Lavoro',
    tabParticuliers: 'Privati',
    tabBusiness: 'Business',
    tabFiduciaires: 'Fiduciari Pro',
    particuliersBadge: 'Privati',
    particuliersTitle1: 'Chiarezza finanziaria',
    particuliersTitle2: 'a lungo termine.',
    particuliersDesc: 'Usa l\'IA per creare i tuoi documenti legali e confrontare i tuoi scenari finanziari tramite le nostre API. Ogni documento è soggetto a validazione umana per una totale affidabilità.',
    businessBadge: 'Business Esclusivo',
    businessTitle1: 'Qualità del servizio',
    businessTitle2: 'scambio.',
    businessDesc: 'Riservato ai nostri clienti. Scambia i tuoi documenti in sicurezza, ricevi le notifiche payroll e accedi all\'analisi Virtual CFO in tempo reale.',
    fiduciairesBadge: 'Fiduciari Pro',
    fiduciairesTitle1: 'Un riferimento per',
    fiduciairesTitle2: 'i fiduciari.',
    fiduciairesDesc: 'Offrite ai vostri clienti gli strumenti Lynvia: sezione dedicata per cliente, notifiche, scambio documenti e database legale svizzero.',
    featureAITitle: 'IA & Database',
    featureAIDesc: 'Risposte basate esclusivamente sul nostro database legale aggiornato per garantire zero margine di errore.',
    featureScenariosTitle: 'Scenari Finanziari',
    featureScenariosDesc: 'Confronta diversi scenari complessi tramite le nostre chiamate API e ricevi analisi strutturali dall\'IA.',
    featureComplianceTitle: 'Conformità Svizzera',
    featureComplianceDesc: 'Strumenti progettati per rispettare le specificità del diritto svizzero (payroll, contratti legali e fiscali).',
    footerTagline: 'Strumento di riferimento finanziario',
    footerCopyright: '© 2026 Lynvia Digital – Eccellenza & Conformità',
    footerHosted: 'Ospitato in Svizzera',
    registerCta: 'Crea account',
    notifDocReady: 'Documento Pronto',
    notifDocReadyDesc: 'Il tuo contratto è stato validato dall\'admin e inviato.',
    notifScenarioCalc: 'Scenario Calcolato',
    notifScenarioCalcDesc: 'L\'analisi del tuo riscatto LPP è disponibile.',
    notifTimeEntry: 'Inserimento Ore',
    notifTimeEntryDesc: 'Non dimenticare di inserire le ore per il payroll.',
    notifHRDocs: 'Documenti HR',
    notifHRDocsDesc: 'Buste paga generate e disponibili.',
    notifNewClient: 'Nuovo Cliente',
    notifNewClientDesc: 'Un nuovo fascicolo cliente è stato creato nella tua sezione.',
    notifDeadline: 'Scadenza',
    notifDeadlineDesc: 'Promemoria: Scadenza IVA per il gruppo InnovTech.',
  },
  es: {
    tagline: 'Solución Financiera All-in-One',
    clientAccess: 'Acceso Cliente',
    explorePlatform: 'Explorar la plataforma',
    workflowTitle: 'Flujo de Trabajo',
    tabParticuliers: 'Particulares',
    tabBusiness: 'Business',
    tabFiduciaires: 'Fiduciarios Pro',
    particuliersBadge: 'Particulares',
    particuliersTitle1: 'Claridad financiera',
    particuliersTitle2: 'a largo plazo.',
    particuliersDesc: 'Use la IA para crear sus documentos legales y comparar sus escenarios financieros a través de nuestras APIs. Cada documento está sujeto a validación humana para una fiabilidad total.',
    businessBadge: 'Business Exclusivo',
    businessTitle1: 'Calidad de servicio',
    businessTitle2: 'intercambio.',
    businessDesc: 'Reservado para nuestros clientes. Intercambie sus documentos de forma segura, reciba sus notificaciones de nómina y acceda al análisis Virtual CFO en tiempo real.',
    fiduciairesBadge: 'Fiduciarios Pro',
    fiduciairesTitle1: 'Una referencia para',
    fiduciairesTitle2: 'los fiduciarios.',
    fiduciairesDesc: 'Ofrezca a sus propios clientes las herramientas Lynvia: sección dedicada por cliente, notificaciones, intercambio de documentos y base de datos legal suiza.',
    featureAITitle: 'IA & Base de Datos',
    featureAIDesc: 'Respuestas basadas exclusivamente en nuestra base de datos legal actualizada para garantizar cero margen de error.',
    featureScenariosTitle: 'Escenarios Financieros',
    featureScenariosDesc: 'Compare diferentes escenarios complejos a través de nuestras llamadas API y reciba análisis estructurales por IA.',
    featureComplianceTitle: 'Conformidad Suiza',
    featureComplianceDesc: 'Herramientas diseñadas para cumplir con las especificidades del derecho suizo (nóminas, contratos legales y fiscales).',
    footerTagline: 'Herramienta de referencia financiera',
    footerCopyright: '© 2026 Lynvia Digital – Excelencia & Conformidad',
    footerHosted: 'Alojado en Suiza',
    registerCta: 'Crear cuenta',
    notifDocReady: 'Documento Listo',
    notifDocReadyDesc: 'Su contrato ha sido validado por el admin y enviado.',
    notifScenarioCalc: 'Escenario Calculado',
    notifScenarioCalcDesc: 'El análisis de su rescate LPP está disponible.',
    notifTimeEntry: 'Registro de Horas',
    notifTimeEntryDesc: 'No olvide completar las horas para la nómina.',
    notifHRDocs: 'Documentos RRHH',
    notifHRDocsDesc: 'Nóminas generadas y disponibles.',
    notifNewClient: 'Nuevo Cliente',
    notifNewClientDesc: 'Se ha creado un nuevo expediente de cliente en su sección.',
    notifDeadline: 'Vencimiento',
    notifDeadlineDesc: 'Recordatorio: Vencimiento IVA para el grupo InnovTech.',
  },
};

type TabType = 'particuliers' | 'business' | 'fiduciaires';

type Notification = {
  id: number;
  icon: 'check-circle-2' | 'calculator' | 'clock' | 'file-up' | 'users' | 'alert-circle';
  titleKey: keyof UIStrings;
  descKey: keyof UIStrings;
  time: string;
  color: string;
  bg: string;
};

const IconMap = {
  'check-circle-2': CheckCircle2,
  'calculator': Calculator,
  'clock': Clock,
  'file-up': FileUp,
  'users': Users,
  'alert-circle': AlertCircle,
};

const notificationsByTab: Record<TabType, Notification[]> = {
  particuliers: [
    { id: 1, icon: 'check-circle-2', titleKey: 'notifDocReady', descKey: 'notifDocReadyDesc', time: '10m', color: 'text-primary', bg: 'bg-primary/10' },
    { id: 2, icon: 'calculator', titleKey: 'notifScenarioCalc', descKey: 'notifScenarioCalcDesc', time: '1h', color: 'text-accent', bg: 'bg-accent/10' },
  ],
  business: [
    { id: 1, icon: 'clock', titleKey: 'notifTimeEntry', descKey: 'notifTimeEntryDesc', time: '5m', color: 'text-primary', bg: 'bg-primary/10' },
    { id: 2, icon: 'file-up', titleKey: 'notifHRDocs', descKey: 'notifHRDocsDesc', time: '2h', color: 'text-primary', bg: 'bg-primary/10' },
  ],
  fiduciaires: [
    { id: 1, icon: 'users', titleKey: 'notifNewClient', descKey: 'notifNewClientDesc', time: '2m', color: 'text-accent', bg: 'bg-accent/10' },
    { id: 2, icon: 'alert-circle', titleKey: 'notifDeadline', descKey: 'notifDeadlineDesc', time: '1h', color: 'text-destructive', bg: 'bg-destructive/10' },
  ],
};

function WorkflowTabs({
  activeTab,
  onChange,
  getLabel,
  className,
}: {
  activeTab: TabType;
  onChange: (tab: TabType) => void;
  getLabel: (tab: TabType) => string;
  className?: string;
}) {
  const tabs = ['particuliers', 'business', 'fiduciaires'] as const;
  return (
    <div
      role="tablist"
      aria-label="Audience"
      className={cn(
        'scrollbar-invisible flex w-full min-w-0 max-w-full flex-nowrap gap-1 overflow-x-auto overscroll-x-contain rounded-full border p-1 shadow-sm',
        'border-[var(--swiss-alpine-slate)]/15 bg-[color:color-mix(in_srgb,var(--swiss-mineral-cream)_88%,var(--swiss-alpine-slate)_12%)]',
        'dark:border-white/15 dark:bg-[color:color-mix(in_srgb,var(--swiss-midnight-void)_92%,white_8%)]',
        className,
      )}
    >
      {tabs.map((tab) => {
        const selected = activeTab === tab;
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab)}
            className={cn(
              'min-h-[44px] min-w-0 flex-1 truncate rounded-full px-2 py-2.5 text-center text-[9px] font-semibold uppercase tracking-wide transition-colors sm:px-3 sm:text-[10px]',
              selected
                ? 'bg-[var(--swiss-alpine-slate)] text-white shadow-md ring-1 ring-[var(--swiss-alpine-slate)]/20 dark:bg-[var(--swiss-mineral-cream)] dark:text-[var(--swiss-alpine-slate)] dark:ring-white/25'
                : 'bg-transparent text-[var(--swiss-alpine-slate)] hover:bg-white/90 dark:text-white/90 dark:hover:bg-white/10',
            )}
          >
            {getLabel(tab)}
          </button>
        );
      })}
    </div>
  );
}

export default function Home() {
  const rawLocale = useLocale();
  const locale = resolveLocale(rawLocale);
  const t = UI_STRINGS[locale];
  
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('fiduciaires');

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.landingScroll = 'true';

    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      delete root.dataset.landingScroll;
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const getTabLabel = (tab: TabType) => {
    switch (tab) {
      case 'particuliers': return t.tabParticuliers;
      case 'business': return t.tabBusiness;
      case 'fiduciaires': return t.tabFiduciaires;
    }
  };

  return (
    <div className="flex min-h-dvh w-full min-w-0 max-w-full flex-col overflow-x-hidden bg-background text-foreground selection:bg-primary/15">
      <nav
        className={`fixed z-50 w-full min-w-0 max-w-full shrink-0 border-b pt-[env(safe-area-inset-top,0px)] transition-all duration-300 ${
          isScrolled
            ? 'border-border bg-card/98 py-2.5 shadow-sm backdrop-blur-md sm:py-3'
            : 'border-border/50 bg-background/95 py-3 shadow-sm backdrop-blur-md sm:py-4'
        }`}
      >
        <div className="mx-auto max-w-7xl pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] sm:pl-6 sm:pr-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 sm:flex-nowrap sm:gap-4">
            <Link
              href="/"
              className="group min-w-0 flex-1 transition-opacity hover:opacity-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:flex-none"
            >
              <BrandWordmark tone="marketing" tagline={t.tagline} className="min-w-0 max-w-[min(100%,220px)] sm:max-w-none" />
            </Link>

            <div className="hidden min-w-0 max-w-xl flex-1 justify-center px-2 lg:flex">
              <WorkflowTabs activeTab={activeTab} onChange={setActiveTab} getLabel={getTabLabel} className="max-w-md" />
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <LanguageToggle />
              <ThemeToggle />
              <Link href="/login">
                <button
                  type="button"
                  className="flex min-h-[44px] max-w-[min(100%,11rem)] items-center justify-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-[9px] font-semibold uppercase leading-snug tracking-wide text-primary-foreground shadow-md ring-1 ring-primary/20 transition-opacity hover:opacity-95 sm:max-w-none sm:gap-2 sm:px-6 sm:text-[10px] sm:tracking-widest lg:px-8"
                >
                  <Lock className="h-3.5 w-3.5 shrink-0 opacity-95" aria-hidden />
                  <span className="line-clamp-2 text-center sm:max-w-[14rem] sm:text-left">{t.clientAccess}</span>
                </button>
              </Link>
            </div>
          </div>

          <div className="mt-2 w-full min-w-0 pb-0.5 lg:hidden">
            <WorkflowTabs activeTab={activeTab} onChange={setActiveTab} getLabel={getTabLabel} />
          </div>
        </div>
      </nav>

      <Suspense fallback={null}>
        <LandingOnboardingSync />
      </Suspense>

      <main
        id="main-content"
        className="flex min-h-dvh w-full min-w-0 flex-1 flex-col pt-[calc(7.5rem+env(safe-area-inset-top,0px))] sm:pt-[calc(7.85rem+env(safe-area-inset-top,0px))] md:pt-[calc(8rem+env(safe-area-inset-top,0px))] lg:pt-[calc(8.1rem+env(safe-area-inset-top,0px))]"
      >
        {/* Hero: natural flow on phones; first-viewport balance from md (tablet / laptop) through desktop */}
        <section
          id="audience"
          aria-labelledby="hero-heading"
          className="relative flex flex-1 flex-col overflow-x-hidden overflow-y-visible pb-10 pt-6 sm:pb-12 sm:pt-8 md:min-h-[calc(100dvh-8rem-env(safe-area-inset-top,0px))] md:justify-center md:pb-12 md:pt-5 supports-[min-height:100svh]:md:min-h-[calc(100svh-8rem-env(safe-area-inset-top,0px))] lg:min-h-[calc(100dvh-8.1rem-env(safe-area-inset-top,0px))] lg:pb-14 lg:pt-4 supports-[min-height:100svh]:lg:min-h-[calc(100svh-8.1rem-env(safe-area-inset-top,0px))]"
        >
          <div
            className="pointer-events-none absolute -right-1/4 top-0 hidden h-[min(90vw,520px)] w-[min(90vw,520px)] rounded-full bg-accent/15 blur-[100px] dark:bg-primary/15 sm:block lg:h-[640px] lg:w-[640px] lg:blur-[130px]"
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-x-0 top-24 h-40 bg-gradient-to-b from-accent/10 to-transparent sm:hidden" aria-hidden />

          <div className="relative mx-auto flex w-full min-w-0 max-w-7xl flex-1 flex-col justify-start md:justify-center pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] sm:pl-6 sm:pr-6 lg:px-8">
            <div className="grid grid-cols-1 items-start gap-8 sm:gap-10 md:items-center lg:grid-cols-12 lg:gap-10 xl:gap-12">
              <div
                key={activeTab}
                className="flex min-w-0 flex-col justify-start space-y-4 sm:space-y-5 md:justify-center lg:col-span-7 motion-reduce:animate-none motion-reduce:opacity-100 animate-tab-content"
              >
                {activeTab === 'particuliers' ? (
                  <>
                    <div className="inline-flex w-fit max-w-full items-center gap-2 rounded-full border border-border bg-card px-3 py-2 shadow-sm sm:px-4">
                      <Users className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] sm:text-[10px] sm:tracking-[0.25em]">
                        {t.particuliersBadge}
                      </span>
                    </div>
                    <h1
                      id="hero-heading"
                      className="font-headline text-balance text-[clamp(1.5rem,5.2vw+0.4rem,3.25rem)] leading-[1.08] tracking-tight text-foreground max-[380px]:leading-[1.1] lg:text-[clamp(1.85rem,5vw,3.5rem)]"
                    >
                      {t.particuliersTitle1} <br />
                      <span className="italic text-accent">{t.particuliersTitle2}</span>
                    </h1>
                    <p className="max-w-xl text-pretty text-sm font-normal leading-relaxed text-foreground/80 dark:text-foreground/85 sm:text-base md:text-lg">
                      {t.particuliersDesc}
                    </p>
                  </>
                ) : activeTab === 'business' ? (
                  <>
                    <div className="inline-flex w-fit max-w-full items-center gap-2 rounded-full bg-[var(--swiss-alpine-slate)] px-4 py-2.5 text-white sm:px-5">
                      <Sparkles className="h-3.5 w-3.5 shrink-0 text-[var(--swiss-mineral-cream)]" aria-hidden />
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] sm:text-[10px] sm:tracking-[0.25em]">
                        {t.businessBadge}
                      </span>
                    </div>
                    <h1
                      id="hero-heading"
                      className="font-headline text-balance text-[clamp(1.5rem,5.2vw+0.4rem,3.25rem)] leading-[1.08] tracking-tight text-foreground max-[380px]:leading-[1.1] lg:text-[clamp(1.85rem,5vw,3.5rem)]"
                    >
                      {t.businessTitle1} <br />
                      <span className="italic text-primary">{t.businessTitle2}</span>
                    </h1>
                    <p className="max-w-xl text-pretty text-sm font-normal leading-relaxed text-foreground/80 dark:text-foreground/85 sm:text-base md:text-lg">
                      {t.businessDesc}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="inline-flex w-fit max-w-full items-center gap-2 rounded-full border border-border bg-card px-3 py-2 shadow-sm sm:px-4">
                      <Briefcase className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] sm:text-[10px] sm:tracking-[0.25em]">
                        {t.fiduciairesBadge}
                      </span>
                    </div>
                    <h1
                      id="hero-heading"
                      className="font-headline text-balance text-[clamp(1.5rem,5.2vw+0.4rem,3.25rem)] leading-[1.08] tracking-tight text-foreground max-[380px]:leading-[1.1] lg:text-[clamp(1.85rem,5vw,3.5rem)]"
                    >
                      {t.fiduciairesTitle1} <br />
                      <span className="italic text-primary">{t.fiduciairesTitle2}</span>
                    </h1>
                    <p className="max-w-xl text-pretty text-sm font-normal leading-relaxed text-foreground/80 dark:text-foreground/85 sm:text-base md:text-lg">
                      {t.fiduciairesDesc}
                    </p>
                  </>
                )}
                <div className="flex flex-col gap-2.5 pt-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:pt-2">
                  <Link href="/login" className="w-full min-w-0 sm:w-auto">
                    <button
                      type="button"
                      className="btn-gradient group flex min-h-[52px] w-full min-w-0 items-center justify-center rounded-2xl px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-primary/25 ring-1 ring-white/25 transition-shadow hover:shadow-xl sm:inline-flex sm:min-w-[220px] sm:px-10 sm:py-4 sm:text-[11px]"
                    >
                      {t.explorePlatform}{' '}
                      <ArrowRight className="ml-2 h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1 sm:ml-3" aria-hidden />
                    </button>
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex min-h-[44px] items-center justify-center self-center text-center text-xs font-semibold uppercase tracking-wide text-foreground/75 underline decoration-foreground/30 underline-offset-4 hover:text-foreground hover:decoration-foreground/50 sm:self-center sm:text-left"
                  >
                    {t.registerCta}
                  </Link>
                </div>
              </div>

              <div className="mx-auto flex w-full min-w-0 max-w-lg flex-col justify-start md:justify-center lg:col-span-5 lg:mx-0 lg:max-w-none">
                <div className="rounded-2xl border border-border bg-card p-4 shadow-md ring-1 ring-border/60 backdrop-blur-sm sm:rounded-[28px] sm:p-7 sm:shadow-lg lg:p-8">
                  <div className="mb-4 flex items-center gap-3 sm:mb-5">
                    <Bell className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                    <h2 className="text-[10px] font-black uppercase tracking-[0.28em] sm:text-[11px] sm:tracking-[0.3em]">
                      {t.workflowTitle}
                    </h2>
                  </div>
                  <ul className="space-y-2.5 sm:space-y-3" aria-label={t.workflowTitle}>
                    {notificationsByTab[activeTab]?.map((n) => {
                      const IconComponent = IconMap[n.icon];
                      return (
                        <li
                          key={n.id}
                          className="flex items-start gap-3 rounded-2xl border border-border bg-background p-3 shadow-sm ring-1 ring-border/40 transition-shadow duration-200 hover:shadow-md sm:gap-3.5 sm:p-3.5"
                        >
                          <div className={`mt-0.5 shrink-0 rounded-xl p-2 sm:mt-1 ${n.bg} ${n.color}`}>
                            <IconComponent className="h-4 w-4" aria-hidden />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                              <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground/95 sm:text-[10px]">
                                {t[n.titleKey]}
                              </h3>
                              <span className="text-[9px] font-bold tabular-nums text-muted-foreground/90 sm:text-[10px]">
                              {n.time}
                            </span>
                            </div>
                            <p className="text-[12px] font-normal leading-snug text-foreground/75 dark:text-foreground/80 sm:text-xs">
                              {t[n.descKey]}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="pillars"
          aria-label={t.featureAITitle}
          className="border-t border-border/70 bg-gradient-to-b from-muted/30 via-background to-muted/20 py-8 sm:py-12 lg:py-14"
        >
          <div className="mx-auto max-w-7xl pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] sm:pl-6 sm:pr-6 lg:px-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8">
              <ScrollReveal>
                <div className="flex h-full min-w-0 flex-col space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm ring-1 ring-border/50 transition-shadow duration-200 hover:shadow-md sm:space-y-6 sm:rounded-3xl sm:p-8">
                  <Brain className="h-7 w-7 shrink-0 text-primary sm:h-8 sm:w-8" aria-hidden />
                  <h2 className="font-headline text-balance text-xs font-black uppercase tracking-widest text-foreground sm:text-[12px]">
                    {t.featureAITitle}
                  </h2>
                  <p className="text-pretty text-sm font-normal leading-relaxed text-foreground/80 dark:text-foreground/85">
                    {t.featureAIDesc}
                  </p>
                </div>
              </ScrollReveal>
              <ScrollReveal delayMs={80}>
                <div className="flex h-full min-w-0 flex-col space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm ring-1 ring-border/50 transition-shadow duration-200 hover:shadow-md sm:space-y-6 sm:rounded-3xl sm:p-8">
                  <TrendingUp className="h-7 w-7 shrink-0 text-accent sm:h-8 sm:w-8" aria-hidden />
                  <h2 className="font-headline text-balance text-xs font-black uppercase tracking-widest text-foreground sm:text-[12px]">
                    {t.featureScenariosTitle}
                  </h2>
                  <p className="text-pretty text-sm font-normal leading-relaxed text-foreground/80 dark:text-foreground/85">
                    {t.featureScenariosDesc}
                  </p>
                </div>
              </ScrollReveal>
              <ScrollReveal delayMs={160} className="sm:col-span-2 sm:mx-auto sm:max-w-xl lg:col-span-1 lg:mx-0 lg:max-w-none">
                <div className="flex h-full min-w-0 flex-col space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm ring-1 ring-border/50 transition-shadow duration-200 hover:shadow-md sm:space-y-6 sm:rounded-3xl sm:p-8">
                  <ShieldCheck className="h-7 w-7 shrink-0 text-foreground sm:h-8 sm:w-8" aria-hidden />
                  <h2 className="font-headline text-balance text-xs font-black uppercase tracking-widest text-foreground sm:text-[12px]">
                    {t.featureComplianceTitle}
                  </h2>
                  <p className="text-pretty text-sm font-normal leading-relaxed text-foreground/80 dark:text-foreground/85">
                    {t.featureComplianceDesc}
                  </p>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        <footer
          id="site-footer"
          className="mt-auto border-t border-border/80 bg-muted/10 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] pt-8 sm:pb-[max(1.75rem,env(safe-area-inset-bottom,0px))] sm:pt-10 lg:pt-12 lg:pb-[max(2rem,env(safe-area-inset-bottom,0px))]"
        >
          <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] text-center sm:gap-8 sm:pl-6 sm:pr-6 lg:px-8">
            <BrandWordmark
              layout="stacked"
              tone="marketing"
              tagline={t.footerTagline}
              className="max-w-md px-1 sm:px-2"
              wordmarkClassName="italic !text-lg sm:!text-2xl"
            />
            <div className="flex w-full max-w-2xl flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 text-[10px] font-bold uppercase not-italic tracking-[0.18em] text-foreground/70 dark:text-foreground/75 sm:flex-row sm:gap-4 sm:pt-8 sm:text-[11px] sm:tracking-[0.22em]">
              <p className="text-balance">{t.footerCopyright}</p>
              <p className="text-balance">{t.footerHosted}</p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
