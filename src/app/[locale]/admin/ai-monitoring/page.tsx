'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { AdminChartCard } from "@/components/admin/admin-chart-card";
import { AdminChartTooltip, adminChartMargin } from "@/components/admin/admin-chart-primitives";
import { Bot, Clock, AlertTriangle, DollarSign, Search, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useLocale } from 'next-intl';

const kpiData = [
  {
    title: "Total AI Calls (24h)",
    value: "3,452",
    description: "+15% from last 24h",
    icon: <Bot className="h-6 w-6 text-muted-foreground" />,
  },
  {
    title: "Avg. Latency",
    value: "450ms",
    description: "Across all flows",
    icon: <Clock className="h-6 w-6 text-muted-foreground" />,
  },
  {
    title: "Error Rate (24h)",
    value: "1.2%",
    description: "3 errors in last hour",
    icon: <AlertTriangle className="h-6 w-6 text-muted-foreground" />,
  },
  {
    title: "Estimated Cost (24h)",
    value: "$12.87",
    description: "Based on token usage",
    icon: <DollarSign className="h-6 w-6 text-muted-foreground" />,
  },
];

const flowUsageData = [
    { date: "7 days ago", legalQAAIAssistant: 420, aiDocumentGenerator: 280, financialScenarioInterpreter: 150, payrollInsightsAnalyzer: 80 },
    { date: "6 days ago", legalQAAIAssistant: 450, aiDocumentGenerator: 300, financialScenarioInterpreter: 160, payrollInsightsAnalyzer: 90 },
    { date: "5 days ago", legalQAAIAssistant: 480, aiDocumentGenerator: 310, financialScenarioInterpreter: 170, payrollInsightsAnalyzer: 85 },
    { date: "4 days ago", legalQAAIAssistant: 510, aiDocumentGenerator: 330, financialScenarioInterpreter: 180, payrollInsightsAnalyzer: 95 },
    { date: "3 days ago", legalQAAIAssistant: 490, aiDocumentGenerator: 320, financialScenarioInterpreter: 175, payrollInsightsAnalyzer: 100 },
    { date: "2 days ago", legalQAAIAssistant: 550, aiDocumentGenerator: 350, financialScenarioInterpreter: 190, payrollInsightsAnalyzer: 110 },
    { date: "Yesterday", legalQAAIAssistant: 580, aiDocumentGenerator: 370, financialScenarioInterpreter: 200, payrollInsightsAnalyzer: 120 },
    { date: "Today", legalQAAIAssistant: 610, aiDocumentGenerator: 390, financialScenarioInterpreter: 210, payrollInsightsAnalyzer: 130 },
];

const recentTraces = [
    { id: "TRACE001", timestamp: "2024-07-22 10:15:30", flowName: "legalQAAIAssistant", status: "Success", duration: "1.2s", user: "user@example.com", cost: "$0.0015" },
    { id: "TRACE002", timestamp: "2024-07-22 10:14:55", flowName: "aiDocumentGenerator", status: "Success", duration: "3.5s", user: "business@example.com", cost: "$0.0040" },
    { id: "TRACE003", timestamp: "2024-07-22 10:12:05", flowName: "financialScenarioInterpreter", status: "Failed", duration: "0.5s", user: "firm@example.com", cost: "$0.0000" },
    { id: "TRACE004", timestamp: "2024-07-22 10:11:40", flowName: "payrollInsightsAnalyzer", status: "Success", duration: "4.1s", user: "business@example.com", cost: "$0.0052" },
    { id: "TRACE005", timestamp: "2024-07-22 10:10:10", flowName: "legalQAAIAssistant", status: "Success", duration: "1.8s", user: "user2@example.com", cost: "$0.0021" },
];

type TraceStatus = "Success" | "Failed";

type SupportedLocale = 'en' | 'fr' | 'de' | 'it' | 'es';

const resolveLocale = (locale: string): SupportedLocale => {
  const normalized = locale.toLowerCase().split('-')[0];
  if (normalized === 'fr' || normalized === 'de' || normalized === 'it' || normalized === 'es') {
    return normalized;
  }
  return 'en';
};

const UI_BY_LOCALE: Record<SupportedLocale, {
  pageTitle: string;
  pageSubtitle: string;
  flowUsageTitle: string;
  flowUsageDescription: string;
  recentTracesTitle: string;
  recentTracesDescription: string;
  searchPlaceholder: string;
  timestamp: string;
  flowName: string;
  status: string;
  duration: string;
  user: string;
  cost: string;
  actions: string;
  openMenu: string;
  traceActions: string;
  viewDetails: string;
  viewUserProfile: string;
  success: string;
  failed: string;
  kpiTotalCalls: string;
  kpiAvgLatency: string;
  kpiErrorRate: string;
  kpiEstimatedCost: string;
  kpiTotalCallsDesc: string;
  kpiAvgLatencyDesc: string;
  kpiErrorRateDesc: string;
  kpiEstimatedCostDesc: string;
}> = {
  en: {
    pageTitle: 'AI Monitoring',
    pageSubtitle: 'Monitor the performance, usage, and costs of your AI models.',
    flowUsageTitle: 'AI Flow Usage (Last 7 Days)',
    flowUsageDescription: 'Number of calls per AI flow.',
    recentTracesTitle: 'Recent Flow Traces',
    recentTracesDescription: 'A log of the most recent AI flow invocations.',
    searchPlaceholder: 'Search traces...',
    timestamp: 'Timestamp',
    flowName: 'Flow Name',
    status: 'Status',
    duration: 'Duration',
    user: 'User',
    cost: 'Cost',
    actions: 'Actions',
    openMenu: 'Open menu',
    traceActions: 'Trace Actions',
    viewDetails: 'View Details',
    viewUserProfile: 'View User Profile',
    success: 'Success',
    failed: 'Failed',
    kpiTotalCalls: 'Total AI Calls (24h)',
    kpiAvgLatency: 'Avg. Latency',
    kpiErrorRate: 'Error Rate (24h)',
    kpiEstimatedCost: 'Estimated Cost (24h)',
    kpiTotalCallsDesc: '+15% from last 24h',
    kpiAvgLatencyDesc: 'Across all flows',
    kpiErrorRateDesc: '3 errors in last hour',
    kpiEstimatedCostDesc: 'Based on token usage',
  },
  fr: {
    pageTitle: 'Suivi IA', pageSubtitle: 'Suivez les performances, l utilisation et les couts des modeles IA.',
    flowUsageTitle: 'Utilisation des flux IA (7 derniers jours)', flowUsageDescription: 'Nombre d appels par flux IA.',
    recentTracesTitle: 'Traces recentes des flux', recentTracesDescription: 'Journal des dernieres executions de flux IA.',
    searchPlaceholder: 'Rechercher des traces...', timestamp: 'Horodatage', flowName: 'Nom du flux', status: 'Statut', duration: 'Duree', user: 'Utilisateur', cost: 'Cout', actions: 'Actions',
    openMenu: 'Ouvrir le menu', traceActions: 'Actions de trace', viewDetails: 'Voir les details', viewUserProfile: 'Voir le profil utilisateur', success: 'Succes', failed: 'Echec',
    kpiTotalCalls: 'Total appels IA (24h)', kpiAvgLatency: 'Latence moy.', kpiErrorRate: 'Taux d erreurs (24h)', kpiEstimatedCost: 'Cout estime (24h)',
    kpiTotalCallsDesc: '+15% sur les dernieres 24h', kpiAvgLatencyDesc: 'Sur tous les flux', kpiErrorRateDesc: '3 erreurs la derniere heure', kpiEstimatedCostDesc: 'Base sur les tokens'
  },
  de: {
    pageTitle: 'KI Ueberwachung', pageSubtitle: 'Ueberwachen Sie Leistung, Nutzung und Kosten Ihrer KI Modelle.',
    flowUsageTitle: 'KI Flow Nutzung (letzte 7 Tage)', flowUsageDescription: 'Anzahl der Aufrufe pro KI Flow.',
    recentTracesTitle: 'Aktuelle Flow Traces', recentTracesDescription: 'Protokoll der letzten KI Flow Aufrufe.',
    searchPlaceholder: 'Traces suchen...', timestamp: 'Zeitstempel', flowName: 'Flow Name', status: 'Status', duration: 'Dauer', user: 'Benutzer', cost: 'Kosten', actions: 'Aktionen',
    openMenu: 'Menue oeffnen', traceActions: 'Trace Aktionen', viewDetails: 'Details anzeigen', viewUserProfile: 'Benutzerprofil anzeigen', success: 'Erfolg', failed: 'Fehlgeschlagen',
    kpiTotalCalls: 'Gesamte KI Aufrufe (24h)', kpiAvgLatency: 'Durchschn. Latenz', kpiErrorRate: 'Fehlerrate (24h)', kpiEstimatedCost: 'Geschaetzte Kosten (24h)',
    kpiTotalCallsDesc: '+15% in den letzten 24h', kpiAvgLatencyDesc: 'Ueber alle Flows', kpiErrorRateDesc: '3 Fehler in der letzten Stunde', kpiEstimatedCostDesc: 'Basierend auf Token Nutzung'
  },
  it: {
    pageTitle: 'Monitoraggio IA', pageSubtitle: 'Monitora prestazioni, utilizzo e costi dei modelli IA.',
    flowUsageTitle: 'Utilizzo flussi IA (ultimi 7 giorni)', flowUsageDescription: 'Numero di chiamate per flusso IA.',
    recentTracesTitle: 'Tracce flussi recenti', recentTracesDescription: 'Registro delle invocazioni IA piu recenti.',
    searchPlaceholder: 'Cerca tracce...', timestamp: 'Timestamp', flowName: 'Nome flusso', status: 'Stato', duration: 'Durata', user: 'Utente', cost: 'Costo', actions: 'Azioni',
    openMenu: 'Apri menu', traceActions: 'Azioni traccia', viewDetails: 'Visualizza dettagli', viewUserProfile: 'Visualizza profilo utente', success: 'Successo', failed: 'Fallito',
    kpiTotalCalls: 'Chiamate IA totali (24h)', kpiAvgLatency: 'Latenza media', kpiErrorRate: 'Tasso errori (24h)', kpiEstimatedCost: 'Costo stimato (24h)',
    kpiTotalCallsDesc: '+15% nelle ultime 24h', kpiAvgLatencyDesc: 'Su tutti i flussi', kpiErrorRateDesc: '3 errori nell ultima ora', kpiEstimatedCostDesc: 'Basato sull uso token'
  },
  es: {
    pageTitle: 'Monitorizacion IA', pageSubtitle: 'Supervisa rendimiento, uso y costos de tus modelos de IA.',
    flowUsageTitle: 'Uso de flujos IA (ultimos 7 dias)', flowUsageDescription: 'Numero de llamadas por flujo IA.',
    recentTracesTitle: 'Trazas recientes de flujos', recentTracesDescription: 'Registro de las invocaciones mas recientes de flujos IA.',
    searchPlaceholder: 'Buscar trazas...', timestamp: 'Marca temporal', flowName: 'Nombre del flujo', status: 'Estado', duration: 'Duracion', user: 'Usuario', cost: 'Costo', actions: 'Acciones',
    openMenu: 'Abrir menu', traceActions: 'Acciones de traza', viewDetails: 'Ver detalles', viewUserProfile: 'Ver perfil de usuario', success: 'Exito', failed: 'Fallido',
    kpiTotalCalls: 'Total llamadas IA (24h)', kpiAvgLatency: 'Latencia prom.', kpiErrorRate: 'Tasa de errores (24h)', kpiEstimatedCost: 'Costo estimado (24h)',
    kpiTotalCallsDesc: '+15% en las ultimas 24h', kpiAvgLatencyDesc: 'En todos los flujos', kpiErrorRateDesc: '3 errores en la ultima hora', kpiEstimatedCostDesc: 'Basado en uso de tokens'
  },
};

const getStatusBadgeVariant = (status: TraceStatus) => {
  return status === "Success" ? "default" : "destructive";
};

export default function AiMonitoringPage() {
  const locale = resolveLocale(useLocale());
  const ui = UI_BY_LOCALE[locale];
  const kpiDataLocalized = [
    { title: ui.kpiTotalCalls, value: '3,452', description: ui.kpiTotalCallsDesc, icon: <Bot className="h-6 w-6 text-muted-foreground" /> },
    { title: ui.kpiAvgLatency, value: '450ms', description: ui.kpiAvgLatencyDesc, icon: <Clock className="h-6 w-6 text-muted-foreground" /> },
    { title: ui.kpiErrorRate, value: '1.2%', description: ui.kpiErrorRateDesc, icon: <AlertTriangle className="h-6 w-6 text-muted-foreground" /> },
    { title: ui.kpiEstimatedCost, value: '$12.87', description: ui.kpiEstimatedCostDesc, icon: <DollarSign className="h-6 w-6 text-muted-foreground" /> },
  ];

  const axisStroke = "hsl(var(--muted-foreground))";
  const gridStroke = "hsl(var(--border) / 0.65)";

  return (
    <div className="space-y-8 pb-4">
      <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-muted/35 via-card to-accent/[0.06] p-6 shadow-sm ring-1 ring-border/30 md:p-8">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent/[0.1] blur-3xl"
          aria-hidden
        />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">AI</p>
          <h1 className="mt-2 font-headline text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {ui.pageTitle}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
            {ui.pageSubtitle}
          </p>
        </div>
      </div>

       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiDataLocalized.map((kpi, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              {kpi.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className="text-xs text-muted-foreground">{kpi.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AdminChartCard title={ui.flowUsageTitle} description={ui.flowUsageDescription}>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={flowUsageData} margin={adminChartMargin}>
            <CartesianGrid stroke={gridStroke} strokeDasharray="4 6" vertical={false} />
            <XAxis
              dataKey="date"
              stroke={axisStroke}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: gridStroke }}
            />
            <YAxis
              stroke={axisStroke}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip content={<AdminChartTooltip />} cursor={{ stroke: gridStroke, strokeDasharray: "4 4" }} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Line
              type="monotone"
              dataKey="legalQAAIAssistant"
              name="Legal Q&A"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2.25}
              dot={{ r: 2.5, strokeWidth: 2, fill: "hsl(var(--card))" }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="aiDocumentGenerator"
              name="Doc Gen"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2.25}
              dot={{ r: 2.5, strokeWidth: 2, fill: "hsl(var(--card))" }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="financialScenarioInterpreter"
              name="Financial Scenarios"
              stroke="hsl(var(--chart-3))"
              strokeWidth={2.25}
              dot={{ r: 2.5, strokeWidth: 2, fill: "hsl(var(--card))" }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="payrollInsightsAnalyzer"
              name="Payroll Insights"
              stroke="hsl(var(--chart-4))"
              strokeWidth={2.25}
              dot={{ r: 2.5, strokeWidth: 2, fill: "hsl(var(--card))" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </AdminChartCard>

      <Card className="overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-muted/15 shadow-sm ring-1 ring-border/35">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex-1">
                  <CardTitle>{ui.recentTracesTitle}</CardTitle>
                 <CardDescription>
                    {ui.recentTracesDescription}
                 </CardDescription>
              </div>
              <div className="relative flex-grow sm:flex-grow-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                 <Input placeholder={ui.searchPlaceholder} className="pl-9 w-full min-w-[200px]"/>
              </div>
          </div>
        </CardHeader>
        <CardContent>
           <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">{ui.timestamp}</TableHead>
                <TableHead>{ui.flowName}</TableHead>
                <TableHead>{ui.status}</TableHead>
                <TableHead>{ui.duration}</TableHead>
                <TableHead className="hidden lg:table-cell">{ui.user}</TableHead>
                <TableHead className="text-right">{ui.cost}</TableHead>
                 <TableHead className="w-[50px] text-right">{ui.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTraces.map((trace) => (
                <TableRow key={trace.id}>
                  <TableCell className="font-mono text-xs">{trace.timestamp}</TableCell>
                  <TableCell className="font-medium">{trace.flowName}</TableCell>
                   <TableCell>
                    <Badge variant={getStatusBadgeVariant(trace.status as TraceStatus)}>
                      {trace.status === 'Success' ? ui.success : ui.failed}
                    </Badge>
                  </TableCell>
                  <TableCell>{trace.duration}</TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">{trace.user}</TableCell>
                  <TableCell className="text-right">{trace.cost}</TableCell>
                  <TableCell className="text-right">
                     <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">{ui.openMenu}</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{ui.traceActions}</DropdownMenuLabel>
                        <DropdownMenuItem>{ui.viewDetails}</DropdownMenuItem>
                        <DropdownMenuItem>{ui.viewUserProfile}</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
