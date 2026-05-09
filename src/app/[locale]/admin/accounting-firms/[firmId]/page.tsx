'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Users, Building2, FileText, Mail, Phone, MapPin,
  Calendar, Search, ExternalLink, Shield, AlertCircle, CheckCircle,
  Briefcase, Globe
} from "lucide-react";
import { firestore } from '@/firebase/config';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useLocale } from 'next-intl';

// ─── Types ───────────────────────────────────────────────────────────────────

type Firm = {
  id: string;
  companyName: string;
  adminUserId: string;
  status: 'active' | 'pending_approval' | 'suspended';
  createdAt?: { seconds: number; nanoseconds: number };
  industry?: string;
  canton?: string;
  address?: string;
  phone?: string;
  website?: string;
};

type FirmAdmin = {
  id: string;
  email: string;
  profile: {
    firstName: string;
    lastName: string;
  };
  photoURL?: string;
};

type ClientCompany = {
  id: string;
  companyName: string;
  adminUserId: string;
  adminName?: string;
  adminEmail?: string;
  status: 'active' | 'pending_approval' | 'suspended';
  industry?: string;
  employeeCount?: number;
};

// ─── Locale ──────────────────────────────────────────────────────────────────

type SupportedLocale = 'en' | 'fr' | 'de' | 'it' | 'es';

const resolveLocale = (locale: string): SupportedLocale => {
  const n = locale.toLowerCase().split('-')[0];
  if (n === 'fr' || n === 'de' || n === 'it' || n === 'es') return n;
  return 'en';
};

const UI_BY_LOCALE: Record<SupportedLocale, {
  backToFirms: string;
  firmDashboard: string;
  loading: string;
  firmNotFound: string;
  // Tabs
  tabProfile: string;
  tabClients: string;
  // Profile
  profileTitle: string;
  profileDesc: string;
  firmName: string;
  adminUser: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  canton: string;
  registeredOn: string;
  status: string;
  industry: string;
  // Clients
  clientsTitle: string;
  clientsDesc: string;
  clientsNote: string;
  noClients: string;
  companyName: string;
  primaryContact: string;
  clientStatus: string;
  employeeCount: string;
  viewCompany: string;
  search: string;
  // Status
  statusActive: string;
  statusPending: string;
  statusSuspended: string;
  na: string;
  clientCount: string;
}> = {
  en: {
    backToFirms: 'Back to Accounting Firms',
    firmDashboard: 'Firm Dashboard',
    loading: 'Loading...',
    firmNotFound: 'Accounting firm not found',
    tabProfile: 'Profile',
    tabClients: 'Clients',
    profileTitle: 'Firm Profile',
    profileDesc: 'View accounting firm details and contact information.',
    firmName: 'Firm Name',
    adminUser: 'Admin User',
    email: 'Email',
    phone: 'Phone',
    website: 'Website',
    address: 'Address',
    canton: 'Canton',
    registeredOn: 'Registered On',
    status: 'Status',
    industry: 'Industry',
    clientsTitle: 'Client Companies',
    clientsDesc: 'Business accounts managed by this accounting firm.',
    clientsNote: 'Note: Accounting firms manage their own clients independently. This is a read-only view.',
    noClients: 'No client companies assigned to this firm.',
    companyName: 'Company Name',
    primaryContact: 'Primary Contact',
    clientStatus: 'Status',
    employeeCount: 'Employees',
    viewCompany: 'View Company',
    search: 'Search clients...',
    statusActive: 'Active',
    statusPending: 'Pending',
    statusSuspended: 'Suspended',
    na: 'N/A',
    clientCount: 'clients',
  },
  fr: {
    backToFirms: 'Retour aux fiduciaires',
    firmDashboard: 'Tableau de bord fiduciaire',
    loading: 'Chargement...',
    firmNotFound: 'Fiduciaire non trouvée',
    tabProfile: 'Profil',
    tabClients: 'Clients',
    profileTitle: 'Profil fiduciaire',
    profileDesc: 'Voir les détails et informations de contact de la fiduciaire.',
    firmName: 'Nom de la fiduciaire',
    adminUser: 'Administrateur',
    email: 'Email',
    phone: 'Téléphone',
    website: 'Site web',
    address: 'Adresse',
    canton: 'Canton',
    registeredOn: 'Enregistré le',
    status: 'Statut',
    industry: 'Industrie',
    clientsTitle: 'Entreprises clientes',
    clientsDesc: 'Comptes entreprises gérés par cette fiduciaire.',
    clientsNote: 'Note: Les fiduciaires gèrent leurs propres clients de manière indépendante. Ceci est une vue en lecture seule.',
    noClients: 'Aucune entreprise cliente assignée à cette fiduciaire.',
    companyName: 'Nom de l\'entreprise',
    primaryContact: 'Contact principal',
    clientStatus: 'Statut',
    employeeCount: 'Employés',
    viewCompany: 'Voir l\'entreprise',
    search: 'Rechercher des clients...',
    statusActive: 'Actif',
    statusPending: 'En attente',
    statusSuspended: 'Suspendu',
    na: 'N/A',
    clientCount: 'clients',
  },
  de: {
    backToFirms: 'Zurück zu Kanzleien',
    firmDashboard: 'Kanzlei-Dashboard',
    loading: 'Laden...',
    firmNotFound: 'Kanzlei nicht gefunden',
    tabProfile: 'Profil',
    tabClients: 'Kunden',
    profileTitle: 'Kanzleiprofil',
    profileDesc: 'Kanzleidetails und Kontaktinformationen anzeigen.',
    firmName: 'Kanzleiname',
    adminUser: 'Admin-Benutzer',
    email: 'E-Mail',
    phone: 'Telefon',
    website: 'Webseite',
    address: 'Adresse',
    canton: 'Kanton',
    registeredOn: 'Registriert am',
    status: 'Status',
    industry: 'Branche',
    clientsTitle: 'Kundenunternehmen',
    clientsDesc: 'Von dieser Kanzlei verwaltete Unternehmenskonten.',
    clientsNote: 'Hinweis: Kanzleien verwalten ihre Kunden eigenständig. Dies ist eine schreibgeschützte Ansicht.',
    noClients: 'Dieser Kanzlei sind keine Kundenunternehmen zugewiesen.',
    companyName: 'Unternehmensname',
    primaryContact: 'Hauptkontakt',
    clientStatus: 'Status',
    employeeCount: 'Mitarbeiter',
    viewCompany: 'Unternehmen anzeigen',
    search: 'Kunden suchen...',
    statusActive: 'Aktiv',
    statusPending: 'Ausstehend',
    statusSuspended: 'Gesperrt',
    na: 'N/A',
    clientCount: 'Kunden',
  },
  it: {
    backToFirms: 'Torna agli studi',
    firmDashboard: 'Dashboard studio',
    loading: 'Caricamento...',
    firmNotFound: 'Studio non trovato',
    tabProfile: 'Profilo',
    tabClients: 'Clienti',
    profileTitle: 'Profilo studio',
    profileDesc: 'Visualizza i dettagli e le informazioni di contatto dello studio.',
    firmName: 'Nome studio',
    adminUser: 'Amministratore',
    email: 'Email',
    phone: 'Telefono',
    website: 'Sito web',
    address: 'Indirizzo',
    canton: 'Cantone',
    registeredOn: 'Registrato il',
    status: 'Stato',
    industry: 'Settore',
    clientsTitle: 'Aziende clienti',
    clientsDesc: 'Account aziendali gestiti da questo studio.',
    clientsNote: 'Nota: Gli studi gestiscono i propri clienti in modo indipendente. Questa è una visualizzazione di sola lettura.',
    noClients: 'Nessuna azienda cliente assegnata a questo studio.',
    companyName: 'Nome azienda',
    primaryContact: 'Contatto principale',
    clientStatus: 'Stato',
    employeeCount: 'Dipendenti',
    viewCompany: 'Visualizza azienda',
    search: 'Cerca clienti...',
    statusActive: 'Attivo',
    statusPending: 'In attesa',
    statusSuspended: 'Sospeso',
    na: 'N/A',
    clientCount: 'clienti',
  },
  es: {
    backToFirms: 'Volver a despachos',
    firmDashboard: 'Panel del despacho',
    loading: 'Cargando...',
    firmNotFound: 'Despacho no encontrado',
    tabProfile: 'Perfil',
    tabClients: 'Clientes',
    profileTitle: 'Perfil del despacho',
    profileDesc: 'Ver detalles e información de contacto del despacho.',
    firmName: 'Nombre del despacho',
    adminUser: 'Usuario administrador',
    email: 'Correo',
    phone: 'Teléfono',
    website: 'Sitio web',
    address: 'Dirección',
    canton: 'Cantón',
    registeredOn: 'Registrado el',
    status: 'Estado',
    industry: 'Industria',
    clientsTitle: 'Empresas clientes',
    clientsDesc: 'Cuentas de empresas gestionadas por este despacho.',
    clientsNote: 'Nota: Los despachos gestionan sus propios clientes de forma independiente. Esta es una vista de solo lectura.',
    noClients: 'No hay empresas clientes asignadas a este despacho.',
    companyName: 'Nombre de la empresa',
    primaryContact: 'Contacto principal',
    clientStatus: 'Estado',
    employeeCount: 'Empleados',
    viewCompany: 'Ver empresa',
    search: 'Buscar clientes...',
    statusActive: 'Activo',
    statusPending: 'Pendiente',
    statusSuspended: 'Suspendido',
    na: 'N/A',
    clientCount: 'clientes',
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatTimestamp = (ts: { seconds: number; nanoseconds: number } | undefined) => {
  if (!ts) return '-';
  return format(new Date(ts.seconds * 1000), 'dd MMM yyyy');
};

const getStatusBadge = (status: string, ui: typeof UI_BY_LOCALE['en']) => {
  const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
    active: 'default',
    pending_approval: 'secondary',
    suspended: 'destructive',
  };
  const labels: Record<string, string> = {
    active: ui.statusActive,
    pending_approval: ui.statusPending,
    suspended: ui.statusSuspended,
  };
  return <Badge variant={variants[status] || 'secondary'}>{labels[status] || status}</Badge>;
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function FirmDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const currentLocale = useLocale();
  const locale = resolveLocale(currentLocale);
  const ui = UI_BY_LOCALE[locale];
  
  const firmId = params.firmId as string;
  
  const [firm, setFirm] = useState<Firm | null>(null);
  const [firmAdmin, setFirmAdmin] = useState<FirmAdmin | null>(null);
  const [clients, setClients] = useState<ClientCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch firm data
  useEffect(() => {
    if (!firmId) return;
    
    const fetchFirm = async () => {
      try {
        const firmDoc = await getDoc(doc(firestore, 'companies', firmId));
        if (firmDoc.exists()) {
          const firmData = { id: firmDoc.id, ...firmDoc.data() } as Firm;
          setFirm(firmData);
          
          // Fetch admin user
          if (firmData.adminUserId) {
            const adminDoc = await getDoc(doc(firestore, 'users', firmData.adminUserId));
            if (adminDoc.exists()) {
              setFirmAdmin({ id: adminDoc.id, ...adminDoc.data() } as FirmAdmin);
            }
          }
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching firm:', error);
        setIsLoading(false);
      }
    };
    
    fetchFirm();
  }, [firmId]);

  // Fetch client companies assigned to this firm
  useEffect(() => {
    if (!firmId) return;
    
    const fetchClients = async () => {
      try {
        // Get all companies where accountingFirmId matches this firm
        const q = query(
          collection(firestore, 'companies'),
          where('accountingFirmId', '==', firmId),
          where('type', '==', 'business')
        );
        
        const snapshot = await getDocs(q);
        
        // Get user info for each company's admin
        const usersSnapshot = await getDocs(collection(firestore, 'users'));
        const usersMap = new Map<string, { firstName: string; lastName: string; email: string }>();
        usersSnapshot.docs.forEach(d => {
          const data = d.data();
          usersMap.set(d.id, {
            firstName: data.profile?.firstName || '',
            lastName: data.profile?.lastName || '',
            email: data.email || '',
          });
        });
        
        // Get employee counts
        const clientsList: ClientCompany[] = await Promise.all(
          snapshot.docs.map(async (d) => {
            const data = d.data();
            const adminUser = usersMap.get(data.adminUserId);
            
            // Count employees
            let employeeCount = 0;
            try {
              const empSnapshot = await getDocs(collection(firestore, `companies/${d.id}/employees`));
              employeeCount = empSnapshot.size;
            } catch (e) {
              // ignore
            }
            
            return {
              id: d.id,
              companyName: data.companyName,
              adminUserId: data.adminUserId,
              adminName: adminUser ? `${adminUser.firstName} ${adminUser.lastName}`.trim() : undefined,
              adminEmail: adminUser?.email,
              status: data.status,
              industry: data.industry,
              employeeCount,
            };
          })
        );
        
        setClients(clientsList);
      } catch (error) {
        console.error('Error fetching clients:', error);
      }
    };
    
    fetchClients();
  }, [firmId]);

  const filteredClients = clients.filter(c =>
    c.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.adminName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.adminEmail?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!firm && !isLoading) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {ui.backToFirms}
        </Button>
        <Card className="mt-6">
          <CardContent className="p-6 text-center text-muted-foreground">
            {ui.firmNotFound}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/${locale}/admin/accounting-firms`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Briefcase className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">{firm?.companyName || ui.loading}</h1>
          </div>
          <p className="text-muted-foreground">{ui.firmDashboard}</p>
        </div>
        {firm && getStatusBadge(firm.status, ui)}
        <Badge variant="outline" className="gap-1">
          <Users className="h-3 w-3" />
          {clients.length} {ui.clientCount}
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            {ui.tabProfile}
          </TabsTrigger>
          <TabsTrigger value="clients" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {ui.tabClients}
            {clients.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {clients.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ─── Profile Tab ─── */}
        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{ui.profileTitle}</CardTitle>
              <CardDescription>{ui.profileDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoading ? (
                <div className="space-y-4">
                  {[1,2,3,4].map(i => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Left column */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">{ui.firmName}</label>
                      <p className="text-lg font-semibold">{firm?.companyName}</p>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">{ui.adminUser}</label>
                      {firmAdmin ? (
                        <div className="flex items-center gap-3 mt-1">
                          <Avatar className="h-10 w-10">
                            {firmAdmin.photoURL && <AvatarImage src={firmAdmin.photoURL} />}
                            <AvatarFallback>
                              {firmAdmin.profile.firstName?.[0]}{firmAdmin.profile.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {firmAdmin.profile.firstName} {firmAdmin.profile.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">{firmAdmin.email}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">{ui.na}</p>
                      )}
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">{ui.email}</label>
                        <p>{firmAdmin?.email || ui.na}</p>
                      </div>
                    </div>
                    
                    {firm?.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">{ui.phone}</label>
                          <p>{firm.phone}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Right column */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">{ui.status}</label>
                      <div className="mt-1">{firm && getStatusBadge(firm.status, ui)}</div>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">{ui.registeredOn}</label>
                        <p>{formatTimestamp(firm?.createdAt)}</p>
                      </div>
                    </div>
                    
                    {firm?.canton && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">{ui.canton}</label>
                          <p>{firm.canton}</p>
                        </div>
                      </div>
                    )}
                    
                    {firm?.website && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">{ui.website}</label>
                          <a 
                            href={firm.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            {firm.website}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    )}
                    
                    {firm?.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">{ui.address}</label>
                          <p>{firm.address}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Clients Tab ─── */}
        <TabsContent value="clients" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle>{ui.clientsTitle}</CardTitle>
                  <CardDescription>{ui.clientsDesc}</CardDescription>
                </div>
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={ui.search}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Info notice */}
              <div className="flex items-start gap-3 p-4 mb-4 bg-muted/50 rounded-lg border">
                <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">{ui.clientsNote}</p>
              </div>
              
              {filteredClients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {ui.noClients}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{ui.companyName}</TableHead>
                      <TableHead className="hidden md:table-cell">{ui.primaryContact}</TableHead>
                      <TableHead className="hidden lg:table-cell">{ui.industry}</TableHead>
                      <TableHead className="hidden lg:table-cell">{ui.employeeCount}</TableHead>
                      <TableHead>{ui.clientStatus}</TableHead>
                      <TableHead className="text-right">{ui.viewCompany}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map(client => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">{client.companyName}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div>
                            <p className="font-medium">{client.adminName || ui.na}</p>
                            <p className="text-sm text-muted-foreground">{client.adminEmail}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {client.industry || ui.na}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {client.employeeCount || 0}
                        </TableCell>
                        <TableCell>{getStatusBadge(client.status, ui)}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => router.push(`/${locale}/admin/company-management/${client.id}`)}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            {ui.viewCompany}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
