
'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Search, FileDown, Calendar as CalendarIcon, Server, ShieldAlert, Bot, Info, AlertTriangle, CircleX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { firestore } from '@/firebase/config';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocale } from 'next-intl';

type SystemLog = {
  id: string;
  timestamp: { seconds: number; nanoseconds: number };
  level: "INFO" | "WARN" | "ERROR" | "SECURITY";
  service: string;
  message: string;
  ipAddress: string;
  details: Record<string, any>;
};

type LogLevel = SystemLog['level'];

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
  sectionTitle: string;
  sectionSubtitle: string;
  searchPlaceholder: string;
  export: string;
  pickDateRange: string;
  filterByLevel: string;
  filterByService: string;
  clearFilters: string;
  timestamp: string;
  level: string;
  service: string;
  message: string;
  details: string;
  openMenu: string;
  logDetails: string;
  noLogsMatch: string;
  errorTitle: string;
  errorDescription: string;
}> = {
  en: {
    pageTitle: 'System Logs',
    pageSubtitle: 'Monitor system-wide events, errors, and activities across all platform services.',
    sectionTitle: 'System Event Log',
    sectionSubtitle: 'A chronological record of all system-level actions and events.',
    searchPlaceholder: 'Search logs...',
    export: 'Export',
    pickDateRange: 'Pick a date range',
    filterByLevel: 'Filter by level',
    filterByService: 'Filter by service',
    clearFilters: 'Clear Filters',
    timestamp: 'Timestamp',
    level: 'Level',
    service: 'Service',
    message: 'Message',
    details: 'Details',
    openMenu: 'Open menu',
    logDetails: 'Log Details',
    noLogsMatch: 'No logs match your filters.',
    errorTitle: 'Error',
    errorDescription: 'Could not fetch system logs.',
  },
  fr: {
    pageTitle: 'Journaux systeme', pageSubtitle: 'Surveillez les evenements, erreurs et activites sur tous les services.',
    sectionTitle: 'Journal des evenements', sectionSubtitle: 'Enregistrement chronologique des actions et evenements systeme.',
    searchPlaceholder: 'Rechercher des journaux...', export: 'Exporter', pickDateRange: 'Choisir une plage de dates',
    filterByLevel: 'Filtrer par niveau', filterByService: 'Filtrer par service', clearFilters: 'Effacer les filtres',
    timestamp: 'Horodatage', level: 'Niveau', service: 'Service', message: 'Message', details: 'Details', openMenu: 'Ouvrir le menu', logDetails: 'Details du journal',
    noLogsMatch: 'Aucun journal ne correspond aux filtres.', errorTitle: 'Erreur', errorDescription: 'Impossible de recuperer les journaux systeme.'
  },
  de: {
    pageTitle: 'Systemprotokolle', pageSubtitle: 'Ueberwachen Sie systemweite Ereignisse, Fehler und Aktivitaeten.',
    sectionTitle: 'System Ereignisprotokoll', sectionSubtitle: 'Chronologische Aufzeichnung aller Systemereignisse.',
    searchPlaceholder: 'Protokolle suchen...', export: 'Exportieren', pickDateRange: 'Datumsbereich waehlen',
    filterByLevel: 'Nach Level filtern', filterByService: 'Nach Service filtern', clearFilters: 'Filter zuruecksetzen',
    timestamp: 'Zeitstempel', level: 'Level', service: 'Service', message: 'Nachricht', details: 'Details', openMenu: 'Menue oeffnen', logDetails: 'Protokolldetails',
    noLogsMatch: 'Keine Protokolle entsprechen den Filtern.', errorTitle: 'Fehler', errorDescription: 'Systemprotokolle konnten nicht geladen werden.'
  },
  it: {
    pageTitle: 'Log di sistema', pageSubtitle: 'Monitora eventi, errori e attivita di sistema su tutti i servizi.',
    sectionTitle: 'Registro eventi di sistema', sectionSubtitle: 'Registro cronologico di tutte le azioni ed eventi di sistema.',
    searchPlaceholder: 'Cerca log...', export: 'Esporta', pickDateRange: 'Seleziona intervallo date',
    filterByLevel: 'Filtra per livello', filterByService: 'Filtra per servizio', clearFilters: 'Cancella filtri',
    timestamp: 'Timestamp', level: 'Livello', service: 'Servizio', message: 'Messaggio', details: 'Dettagli', openMenu: 'Apri menu', logDetails: 'Dettagli log',
    noLogsMatch: 'Nessun log corrisponde ai filtri.', errorTitle: 'Errore', errorDescription: 'Impossibile recuperare i log di sistema.'
  },
  es: {
    pageTitle: 'Registros del sistema', pageSubtitle: 'Supervisa eventos, errores y actividades en todos los servicios.',
    sectionTitle: 'Registro de eventos del sistema', sectionSubtitle: 'Registro cronologico de acciones y eventos del sistema.',
    searchPlaceholder: 'Buscar registros...', export: 'Exportar', pickDateRange: 'Elegir rango de fechas',
    filterByLevel: 'Filtrar por nivel', filterByService: 'Filtrar por servicio', clearFilters: 'Limpiar filtros',
    timestamp: 'Marca temporal', level: 'Nivel', service: 'Servicio', message: 'Mensaje', details: 'Detalles', openMenu: 'Abrir menu', logDetails: 'Detalles del registro',
    noLogsMatch: 'Ningun registro coincide con tus filtros.', errorTitle: 'Error', errorDescription: 'No se pudieron obtener los registros del sistema.'
  },
};

const logLevels = [
    { value: 'all', label: 'All Levels' },
    { value: 'INFO', label: 'Info' },
    { value: 'WARN', label: 'Warning' },
    { value: 'ERROR', label: 'Error' },
    { value: 'SECURITY', label: 'Security' },
];

const services = [
    { value: 'all', label: 'All Services' },
    { value: 'Authentication', label: 'Authentication' },
    { value: 'Database', label: 'Database' },
    { value: 'AI-Model', label: 'AI Model' },
    { value: 'System', label: 'System' },
];

const getLevelConfig = (level: LogLevel) => {
  switch (level) {
    case "INFO":
      return { variant: "secondary", icon: <Info className="h-4 w-4" /> };
    case "WARN":
      return { variant: "default", className: "bg-yellow-500/80 text-yellow-50 hover:bg-yellow-500/70", icon: <AlertTriangle className="h-4 w-4" /> };
    case "ERROR":
      return { variant: "destructive", icon: <CircleX className="h-4 w-4" /> };
    case "SECURITY":
        return { variant: "destructive", className: "bg-orange-600 text-orange-50 hover:bg-orange-500", icon: <ShieldAlert className="h-4 w-4" /> };
    default:
      return { variant: "outline", icon: null };
  }
};

export default function SystemLogsPage() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [date, setDate] = useState<DateRange | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const { toast } = useToast();
  const locale = resolveLocale(useLocale());
  const ui = UI_BY_LOCALE[locale];

  useEffect(() => {
    setIsLoading(true);
    const q = query(collection(firestore, 'system_logs'), orderBy('timestamp', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<SystemLog, 'id'>)
      }));
      setLogs(logData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching system logs: ", error);
      toast({ title: ui.errorTitle, description: ui.errorDescription, variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast, ui.errorDescription, ui.errorTitle]);
  
  const filteredLogs = logs.filter(log => {
    const searchMatch = log.message.toLowerCase().includes(searchTerm.toLowerCase());
    const levelMatch = levelFilter === 'all' || log.level === levelFilter;
    const serviceMatch = serviceFilter === 'all' || log.service === serviceFilter;
    const dateMatch = !date?.from || (
        new Date(log.timestamp.seconds * 1000) >= date.from &&
        (!date.to || new Date(log.timestamp.seconds * 1000) <= date.to)
    );
    return searchMatch && levelMatch && serviceMatch && dateMatch;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{ui.pageTitle}</h1>
        <p className="text-muted-foreground">
          {ui.pageSubtitle}
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex-1">
                  <CardTitle>{ui.sectionTitle}</CardTitle>
                 <CardDescription>
                    {ui.sectionSubtitle}
                 </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                 <div className="relative flex-grow sm:flex-grow-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder={ui.searchPlaceholder} className="pl-9 w-full min-w-[200px]" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                 </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className="w-full justify-start text-left font-normal sm:w-auto"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                          date.to ? (
                            <>
                              {format(date.from, "LLL dd, y")} -{" "}
                              {format(date.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(date.from, "LLL dd, y")
                          )
                        ) : (
                          <span>{ui.pickDateRange}</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={setDate}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                 <Button variant="outline" disabled>
                    <FileDown className="mr-2 h-4 w-4" />
                    {ui.export}
                 </Button>
              </div>
          </div>
          <div className="flex items-center space-x-2 pt-4">
            <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder={ui.filterByLevel} />
                </SelectTrigger>
                <SelectContent>
                    {logLevels.map(level => (
                        <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={serviceFilter} onValueChange={setServiceFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder={ui.filterByService} />
                </SelectTrigger>
                <SelectContent>
                    {services.map(service => (
                         <SelectItem key={service.value} value={service.value}>{service.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Button variant="ghost" onClick={() => { setSearchTerm(''); setLevelFilter('all'); setServiceFilter('all'); setDate(undefined); }}>{ui.clearFilters}</Button>
        </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">{ui.timestamp}</TableHead>
                <TableHead>{ui.level}</TableHead>
                <TableHead>{ui.service}</TableHead>
                <TableHead>{ui.message}</TableHead>
                <TableHead className="text-right">{ui.details}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({length: 5}).map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-36" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))}
              {!isLoading && filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs">{log.timestamp ? format(new Date(log.timestamp.seconds * 1000), 'yyyy-MM-dd HH:mm:ss') : 'N/A'}</TableCell>
                   <TableCell>
                      <Badge variant={getLevelConfig(log.level).variant} className={cn(getLevelConfig(log.level).className)}>
                        {getLevelConfig(log.level).icon}
                        <span className="ml-1.5">{log.level}</span>
                      </Badge>
                   </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                        {log.service === 'Authentication' && <ShieldAlert className="h-4 w-4 text-muted-foreground" />}
                        {log.service === 'Database' && <Server className="h-4 w-4 text-muted-foreground" />}
                        {log.service === 'AI-Model' && <Bot className="h-4 w-4 text-muted-foreground" />}
                        {log.service === 'System' && <Server className="h-4 w-4 text-muted-foreground" />}
                        <span className="font-medium">{log.service}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                      {log.message}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">{ui.openMenu}</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{ui.logDetails}</DropdownMenuLabel>
                        <DropdownMenuItem>IP Address: {log.ipAddress}</DropdownMenuItem>
                        {Object.entries(log.details).map(([key, value]) => (
                             <DropdownMenuItem key={key}>{key}: {JSON.stringify(value)}</DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && filteredLogs.length === 0 && (
                 <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                        {ui.noLogsMatch}
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
