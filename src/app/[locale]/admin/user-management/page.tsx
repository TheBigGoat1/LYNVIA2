
'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
const CostOverview = dynamic(() => import('../../business/company-rates'), { ssr: false });
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
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle, Search, Trash2, Edit, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { collection, onSnapshot, query, getDocs } from 'firebase/firestore';
import { firestore } from '@/firebase/config';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog } from '@/components/ui/dialog';
import { CreateUserForm } from '@/components/admin/create-user-form';
import { useLocale } from 'next-intl';

type User = {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  role: "admin" | "business" | "individual" | "accounting_firm";
  company?: string;
  companyId?: string | null;
  registered: string;
  status: "active" | "pending_approval" | "suspended";
};

type CompanyData = {
    id: string;
    companyName: string;
}

type UserStatus = User['status'];
type UserRole = User['role'];

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
  createUser: string;
  all: string;
  businesses: string;
  accountingFirms: string;
  individuals: string;
  user: string;
  role: string;
  companyOrFirm: string;
  registered: string;
  status: string;
  actions: string;
  openMenu: string;
  viewProfile: string;
  viewMore: string;
  editUser: string;
  deleteUser: string;
  roleAdmin: string;
  roleBusiness: string;
  roleAccountingFirm: string;
  roleIndividual: string;
  statusActive: string;
  statusPendingApproval: string;
  statusSuspended: string;
  na: string;
  lynviaDigital: string;
  fetchErrorTitle: string;
  fetchErrorDescription: string;
    costOverviewLabel: string;
    viewCosts: string;
    hideOverview: string;
}> = {
  en: {
    pageTitle: 'User Management',
    pageSubtitle: 'View, manage, and approve all users on the platform.',
    sectionTitle: 'Platform Users',
    sectionSubtitle: 'A complete list of all registered user accounts.',
    searchPlaceholder: 'Search users...',
    createUser: 'Create User',
    costOverviewLabel: 'Salary cost overview by company:',
    viewCosts: 'View costs',
    hideOverview: 'Hide overview',
    all: 'All',
    businesses: 'Businesses',
    accountingFirms: 'Accounting Firms',
    individuals: 'Individuals',
    user: 'User',
    role: 'Role',
    companyOrFirm: 'Company / Firm',
    registered: 'Registered',
    status: 'Status',
    actions: 'Actions',
    openMenu: 'Open menu',
    viewProfile: 'View Profile',
    viewMore: 'View More',
    editUser: 'Edit User',
    deleteUser: 'Delete User',
    roleAdmin: 'Admin',
    roleBusiness: 'Business',
    roleAccountingFirm: 'Accounting Firm',
    roleIndividual: 'Individual',
    statusActive: 'active',
    statusPendingApproval: 'pending approval',
    statusSuspended: 'suspended',
    na: 'N/A',
    lynviaDigital: 'Lynvia Digital',
    fetchErrorTitle: 'Error',
    fetchErrorDescription: 'Could not fetch users.',
  },
  fr: {
    pageTitle: 'Gestion des utilisateurs',
    pageSubtitle: 'Voir, gerer et approuver tous les utilisateurs de la plateforme.',
    sectionTitle: 'Utilisateurs de la plateforme',
    sectionSubtitle: 'Liste complete de tous les comptes utilisateurs enregistres.',
    searchPlaceholder: 'Rechercher des utilisateurs...',
    createUser: 'Creer un utilisateur',
    all: 'Tous',
    businesses: 'Entreprises',
    accountingFirms: 'Fiduciaires',
    individuals: 'Particuliers',
    user: 'Utilisateur',
    role: 'Role',
    companyOrFirm: 'Entreprise / Fiduciaire',
    registered: 'Enregistre',
    status: 'Statut',
    actions: 'Actions',
    openMenu: 'Ouvrir le menu',
    viewProfile: 'Voir le profil',
    viewMore: 'Voir plus',
    editUser: 'Modifier l utilisateur',
    deleteUser: 'Supprimer l utilisateur',
    roleAdmin: 'Admin',
    roleBusiness: 'Entreprise',
    roleAccountingFirm: 'Fiduciaire',
    roleIndividual: 'Particulier',
    statusActive: 'actif',
    statusPendingApproval: 'en attente',
    statusSuspended: 'suspendu',
    na: 'N/A',
    lynviaDigital: 'Lynvia Digital',
    fetchErrorTitle: 'Erreur',
    fetchErrorDescription: 'Impossible de recuperer les utilisateurs.',
    costOverviewLabel: 'Apercu des coûts salariaux par entreprise :',
    viewCosts: 'Voir coûts',
    hideOverview: 'Masquer l\'apercu',
  },
  de: {
    pageTitle: 'Benutzerverwaltung',
    pageSubtitle: 'Alle Benutzer auf der Plattform anzeigen, verwalten und freigeben.',
    sectionTitle: 'Plattformbenutzer',
    sectionSubtitle: 'Vollstandige Liste aller registrierten Benutzerkonten.',
    searchPlaceholder: 'Benutzer suchen...',
    createUser: 'Benutzer erstellen',
    all: 'Alle',
    businesses: 'Unternehmen',
    accountingFirms: 'Kanzleien',
    individuals: 'Privatpersonen',
    user: 'Benutzer',
    role: 'Rolle',
    companyOrFirm: 'Unternehmen / Kanzlei',
    registered: 'Registriert',
    status: 'Status',
    actions: 'Aktionen',
    openMenu: 'Menue oeffnen',
    viewProfile: 'Profil anzeigen',
    viewMore: 'Mehr anzeigen',
    editUser: 'Benutzer bearbeiten',
    deleteUser: 'Benutzer loeschen',
    roleAdmin: 'Admin',
    roleBusiness: 'Unternehmen',
    roleAccountingFirm: 'Kanzlei',
    roleIndividual: 'Privatperson',
    statusActive: 'aktiv',
    statusPendingApproval: 'ausstehende freigabe',
    statusSuspended: 'gesperrt',
    na: 'N/A',
    lynviaDigital: 'Lynvia Digital',
    fetchErrorTitle: 'Fehler',
    fetchErrorDescription: 'Benutzer konnten nicht geladen werden.',    costOverviewLabel: 'Gehaltskosten-Übersicht nach Unternehmen:',
    viewCosts: 'Kosten anzeigen',
    hideOverview: 'Übersicht ausblenden',  },
  it: {
    pageTitle: 'Gestione utenti',
    pageSubtitle: 'Visualizza, gestisci e approva tutti gli utenti della piattaforma.',
    sectionTitle: 'Utenti della piattaforma',
    sectionSubtitle: 'Elenco completo di tutti gli account utente registrati.',
    searchPlaceholder: 'Cerca utenti...',
    createUser: 'Crea utente',
    all: 'Tutti',
    businesses: 'Aziende',
    accountingFirms: 'Studi',
    individuals: 'Privati',
    user: 'Utente',
    role: 'Ruolo',
    companyOrFirm: 'Azienda / Studio',
    registered: 'Registrato',
    status: 'Stato',
    actions: 'Azioni',
    openMenu: 'Apri menu',
    viewProfile: 'Visualizza profilo',
    viewMore: 'Vedi altro',
    editUser: 'Modifica utente',
    deleteUser: 'Elimina utente',
    roleAdmin: 'Admin',
    roleBusiness: 'Azienda',
    roleAccountingFirm: 'Studio',
    roleIndividual: 'Privato',
    statusActive: 'attivo',
    statusPendingApproval: 'in approvazione',
    statusSuspended: 'sospeso',
    na: 'N/A',
    lynviaDigital: 'Lynvia Digital',
    fetchErrorTitle: 'Errore',
    fetchErrorDescription: 'Impossibile recuperare gli utenti.',
    costOverviewLabel: 'Panoramica dei costi salariali per azienda:',
    viewCosts: 'Visualizza costi',
    hideOverview: 'Nascondi panoramica',
  },
  es: {
    pageTitle: 'Gestion de usuarios',
    pageSubtitle: 'Ver, gestionar y aprobar todos los usuarios de la plataforma.',
    sectionTitle: 'Usuarios de la plataforma',
    sectionSubtitle: 'Lista completa de todas las cuentas de usuario registradas.',
    searchPlaceholder: 'Buscar usuarios...',
    createUser: 'Crear usuario',
    all: 'Todos',
    businesses: 'Empresas',
    accountingFirms: 'Despachos',
    individuals: 'Particulares',
    user: 'Usuario',
    role: 'Rol',
    companyOrFirm: 'Empresa / Despacho',
    registered: 'Registrado',
    status: 'Estado',
    actions: 'Acciones',
    openMenu: 'Abrir menu',
    viewProfile: 'Ver perfil',
    viewMore: 'Ver mas',
    editUser: 'Editar usuario',
    deleteUser: 'Eliminar usuario',
    roleAdmin: 'Admin',
    roleBusiness: 'Empresa',
    roleAccountingFirm: 'Despacho',
    roleIndividual: 'Particular',
    statusActive: 'activa',
    statusPendingApproval: 'pendiente de aprobacion',
    statusSuspended: 'suspendida',
    na: 'N/A',
    lynviaDigital: 'Lynvia Digital',
    fetchErrorTitle: 'Error',
    fetchErrorDescription: 'No se pudieron obtener los usuarios.',
    costOverviewLabel: 'Descripción general de costos salariales por empresa:',
    viewCosts: 'Ver costos',
    hideOverview: 'Ocultar descripción general',
  },
};

const getStatusBadgeVariant = (status: UserStatus) => {
  switch (status) {
    case "active":
      return "default";
    case "pending_approval":
      return "secondary";
    case "suspended":
      return "destructive";
    default:
      return "outline";
  }
};

const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "business":
      case "accounting_firm":
        return "secondary";
      case "individual":
        return "outline";
      default:
        return "outline";
    }
}


const UserTable = ({ users, isLoading, ui, locale, currentPage, onPageChange, totalPages }: { users: User[], isLoading: boolean, ui: (typeof UI_BY_LOCALE)[SupportedLocale], locale: SupportedLocale, currentPage: number, onPageChange: (page: number) => void, totalPages: number }) => (
  <>
    <div className="md:hidden space-y-3">
      {isLoading && Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 space-y-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
      ))}

      {!isLoading && users.map((user) => (
        <Card key={user.id}>
          <CardContent className="p-4 space-y-3">
            <div className="font-medium">{user.name || ui.na}</div>
            <div className="text-sm text-muted-foreground break-all">{user.email}</div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={getRoleBadgeVariant(user.role)}>{user.role}</Badge>
              <Badge variant={getStatusBadgeVariant(user.status)}>{user.status}</Badge>
            </div>
            <Button asChild className="w-full" variant="outline">
              <Link href={`/${locale}/admin/user-management/${user.id}`}>{ui.viewMore}</Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>

    <div className="hidden md:block overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{ui.user}</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>{ui.role}</TableHead>
            <TableHead>{ui.status}</TableHead>
            <TableHead className="text-right">{ui.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && Array.from({ length: 4 }).map((_, i) => (
            <TableRow key={i}>
              {[...Array(5)].map((_, j) => (
                <TableCell key={j}><Skeleton className="h-5 w-24" /></TableCell>
              ))}
            </TableRow>
          ))}

          {!isLoading && users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.name || ui.na}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell><Badge variant={getRoleBadgeVariant(user.role)}>{user.role}</Badge></TableCell>
              <TableCell><Badge variant={getStatusBadgeVariant(user.status)}>{user.status}</Badge></TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">{ui.openMenu}</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{ui.actions}</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                      <Link href={`/${locale}/admin/user-management/${user.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        {ui.viewMore}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled>
                      <Edit className="mr-2 h-4 w-4" />
                      {ui.editUser}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive" disabled={user.role === 'admin'}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      {ui.deleteUser}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
    
    <div className="flex items-center justify-between gap-2 mt-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 0}
      >
        Previous
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {currentPage + 1} of {totalPages || 1}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages - 1}
      >
        Next
      </Button>
    </div>
  </>
)

const ITEMS_PER_PAGE = 4;

export default function UserManagementPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();
    const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [showCostOverview, setShowCostOverview] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [currentTab, setCurrentTab] = useState('all');
    const locale = resolveLocale(useLocale());
    const ui = UI_BY_LOCALE[locale];

    useEffect(() => {
        const fetchUsersAndCompanies = async () => {
            setIsLoading(true);
            const companiesQuery = query(collection(firestore, 'companies'));
            const companiesSnapshot = await getDocs(companiesQuery);
            const companiesMap = new Map<string, CompanyData>();
            companiesSnapshot.forEach(doc => {
                companiesMap.set(doc.id, { id: doc.id, ...doc.data() } as CompanyData);
            });

            const usersQuery = query(collection(firestore, 'users'));
            const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
                const userData = snapshot.docs.map(doc => {
                    const data = doc.data();
                    const company = data.companyId ? companiesMap.get(data.companyId) : undefined;
                    return {
                        id: doc.id,
                        name: `${data.profile.firstName} ${data.profile.lastName}`,
                        email: data.email,
                        avatar: data.photoURL,
                        role: data.role,
                        company: company ? company.companyName : (data.role === 'admin' ? ui.lynviaDigital : ui.na),
                        companyId: data.companyId,
                        registered: data.createdAt ? format(data.createdAt.toDate(), 'yyyy-MM-dd') : ui.na,
                        status: data.status,
                    } as User;
                });
                setUsers(userData);
                setIsLoading(false);
            }, (error) => {
                console.error("Error fetching users:", error);
                toast({ title: ui.fetchErrorTitle, description: ui.fetchErrorDescription, variant: "destructive" });
                setIsLoading(false);
            });

            return unsubscribe;
        };

        const unsubscribePromise = fetchUsersAndCompanies();
        
        return () => {
            unsubscribePromise.then(unsub => unsub && unsub());
        };
    }, [toast, ui.fetchErrorDescription, ui.fetchErrorTitle, ui.lynviaDigital, ui.na]);
    
    const filteredUsers = users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const allFiltered = filteredUsers;
    const businessFiltered = filteredUsers.filter(u => u.role === 'business');
    const firmFiltered = filteredUsers.filter(u => u.role === 'accounting_firm');
    const individualFiltered = filteredUsers.filter(u => u.role === 'individual');

    const getCurrentPageUsers = () => {
      const start = currentPage * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE;
      
      if (currentTab === 'all') return allFiltered.slice(start, end);
      if (currentTab === 'business') return businessFiltered.slice(start, end);
      if (currentTab === 'accounting_firm') return firmFiltered.slice(start, end);
      if (currentTab === 'individual') return individualFiltered.slice(start, end);
      return [];
    };

    const getTotalPages = (list: User[]) => Math.ceil(list.length / ITEMS_PER_PAGE) || 1;

    const handleTabChange = (tab: string) => {
      setCurrentTab(tab);
      setCurrentPage(0);
    };

    const allCount = allFiltered.length;
    const businessCount = businessFiltered.length;
    const firmCount = firmFiltered.length;
    const individualCount = individualFiltered.length;
    const companies = Array.from(new Set(users.map(u => u.companyId).filter((cid): cid is string => Boolean(cid))));

    const handleShowCostOverview = (companyId: string) => {
      setSelectedCompanyId(companyId);
      setShowCostOverview(true);
    };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{ui.pageTitle}</h1>
          <p className="text-muted-foreground">{ui.pageSubtitle}</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex-1">
                <CardTitle>{ui.pageTitle}</CardTitle>
                <CardDescription>{ui.sectionSubtitle}</CardDescription>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-grow sm:flex-grow-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder={ui.searchPlaceholder} className="pl-9 w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <Button onClick={() => setIsCreateUserOpen(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {ui.createUser}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={currentTab} onValueChange={handleTabChange}>
              <TabsList className="grid w-full grid-cols-4 max-w-lg">
                <TabsTrigger value="all">{ui.all} {allCount > 0 && <span className="ml-2 text-muted-foreground">({allCount})</span>}</TabsTrigger>
                <TabsTrigger value="business">{ui.businesses} {businessCount > 0 && <span className="ml-2 text-muted-foreground">({businessCount})</span>}</TabsTrigger>
                <TabsTrigger value="accounting_firm">{ui.accountingFirms} {firmCount > 0 && <span className="ml-2 text-muted-foreground">({firmCount})</span>}</TabsTrigger>
                <TabsTrigger value="individual">{ui.individuals} {individualCount > 0 && <span className="ml-2 text-muted-foreground">({individualCount})</span>}</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-4">
                <UserTable users={getCurrentPageUsers()} isLoading={isLoading} ui={ui} locale={locale} currentPage={currentPage} onPageChange={setCurrentPage} totalPages={getTotalPages(allFiltered)} />
              </TabsContent>
              <TabsContent value="business" className="mt-4">
                <UserTable users={getCurrentPageUsers()} isLoading={isLoading} ui={ui} locale={locale} currentPage={currentPage} onPageChange={setCurrentPage} totalPages={getTotalPages(businessFiltered)} />
              </TabsContent>
              <TabsContent value="accounting_firm" className="mt-4">
                <UserTable users={getCurrentPageUsers()} isLoading={isLoading} ui={ui} locale={locale} currentPage={currentPage} onPageChange={setCurrentPage} totalPages={getTotalPages(firmFiltered)} />
              </TabsContent>
              <TabsContent value="individual" className="mt-4">
                <UserTable users={getCurrentPageUsers()} isLoading={isLoading} ui={ui} locale={locale} currentPage={currentPage} onPageChange={setCurrentPage} totalPages={getTotalPages(individualFiltered)} />
              </TabsContent>
            </Tabs>

            {/* Cost overview controls */}
            <div className="mt-8">
              <label className="block mb-2 font-medium">{ui.costOverviewLabel}</label>
              <div className="flex flex-wrap gap-2">
                {companies.length === 0 ? (
                  <span className="text-muted-foreground">{ui.na}</span>
                ) : companies.map(cid => (
                  <Button key={cid as string} variant="outline" onClick={() => handleShowCostOverview(cid as string)}>
                    {ui.viewCosts} - {cid}
                  </Button>
                ))}
                {showCostOverview && selectedCompanyId && (
                  <Button variant="ghost" onClick={() => setShowCostOverview(false)}>
                    {ui.hideOverview}
                  </Button>
                )}
              </div>
              {showCostOverview && selectedCompanyId && (
                <div className="mt-6">
                  <CostOverview companyId={selectedCompanyId} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
        <CreateUserForm onClose={() => setIsCreateUserOpen(false)} />
      </Dialog>
    </>
  );
}
