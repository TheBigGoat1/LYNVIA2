
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle, Search, Trash2, Edit, Eye, CheckCircle, ShieldX, Ban, Building } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, getDocs, where } from 'firebase/firestore';
import { firestore } from '@/firebase/config';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateBusinessForm } from '@/components/admin/create-business-form';
import { useLocale } from 'next-intl';

type Company = {
  id: string;
  companyName: string;
  type: 'Business' | 'Accounting Firm';
  adminUserId: string;
  registered: string;
  status: 'active' | 'pending_approval' | 'suspended';
  adminName?: string;
  adminEmail?: string;
  adminAvatar?: string | null;
  accountingFirmId?: string | null;
  assignedFirmName?: string | null;
};

type UserData = {
    id: string;
    email: string;
    profile: {
        firstName: string;
        lastName: string;
    };
    photoURL?: string | null;
};

type AccountingFirm = {
    id: string;
    name: string;
};

type CompanyStatus = Company['status'];
type CompanyType = Company['type'];

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
  createBusiness: string;
  all: string;
  active: string;
  pending: string;
  suspended: string;
  companyOrFirmName: string;
  type: string;
  primaryAdmin: string;
  assignedFirm: string;
  status: string;
  actions: string;
  openMenu: string;
  viewDetails: string;
  approveCompany: string;
  suspendCompany: string;
  reactivateCompany: string;
  assignToFirm: string;
  deleteCompany: string;
  na: string;
  statusActive: string;
  statusPendingApproval: string;
  statusSuspended: string;
  businessType: string;
  accountingFirmType: string;
  fetchErrorTitle: string;
  fetchErrorDescription: string;
  updateSuccess: string;
  updateErrorTitle: string;
  updateErrorDescription: string;
  deleteSuccess: string;
  deleteErrorTitle: string;
  deleteErrorDescription: string;
  assignSuccess: string;
  assignErrorTitle: string;
  assignErrorDescription: string;
  cancel: string;
  assign: string;
  assignTitle: string;
  assignDescription: string;
  assignPlaceholder: string;
}> = {
  en: {
    pageTitle: 'Business Management',
    pageSubtitle: 'View, manage, and approve all Business accounts on the platform.',
    sectionTitle: 'Business Accounts',
    sectionSubtitle: 'A complete list of all registered business accounts.',
    searchPlaceholder: 'Search businesses...',
    createBusiness: 'Create Business',
    all: 'All',
    active: 'Active',
    pending: 'Pending Approval',
    suspended: 'Suspended',
    companyOrFirmName: 'Company / Firm Name',
    type: 'Type',
    primaryAdmin: 'Primary Admin',
    assignedFirm: 'Assigned Firm',
    status: 'Status',
    actions: 'Actions',
    openMenu: 'Open menu',
    viewDetails: 'View Details',
    approveCompany: 'Approve Company',
    suspendCompany: 'Suspend Company',
    reactivateCompany: 'Re-activate Company',
    assignToFirm: 'Assign to Firm',
    deleteCompany: 'Delete Company',
    na: 'N/A',
    statusActive: 'active',
    statusPendingApproval: 'pending approval',
    statusSuspended: 'suspended',
    businessType: 'Business',
    accountingFirmType: 'Accounting Firm',
    fetchErrorTitle: 'Error',
    fetchErrorDescription: 'Could not fetch companies.',
    updateSuccess: 'Company status updated successfully',
    updateErrorTitle: 'Update Failed',
    updateErrorDescription: 'Could not update company status.',
    deleteSuccess: 'Company deleted successfully',
    deleteErrorTitle: 'Delete Failed',
    deleteErrorDescription: 'Could not delete company.',
    assignSuccess: 'Firm assigned successfully',
    assignErrorTitle: 'Assignment Failed',
    assignErrorDescription: 'Could not assign firm.',
    cancel: 'Cancel',
    assign: 'Assign',
    assignTitle: 'Assign company to a firm',
    assignDescription: 'Select an accounting firm to manage this client company.',
    assignPlaceholder: 'Select an accounting firm...',
  },
  fr: {
    pageTitle: 'Gestion des entreprises',
    pageSubtitle: 'Voir, gerer et approuver tous les comptes entreprises de la plateforme.',
    sectionTitle: 'Comptes entreprises',
    sectionSubtitle: 'Liste complete de tous les comptes entreprises enregistres.',
    searchPlaceholder: 'Rechercher des entreprises...',
    createBusiness: 'Creer une entreprise',
    all: 'Tous',
    active: 'Actif',
    pending: 'En attente',
    suspended: 'Suspendu',
    companyOrFirmName: 'Entreprise / Fiduciaire',
    type: 'Type',
    primaryAdmin: 'Admin principal',
    assignedFirm: 'Fiduciaire assignee',
    status: 'Statut',
    actions: 'Actions',
    openMenu: 'Ouvrir le menu',
    viewDetails: 'Voir les details',
    approveCompany: 'Approuver l entreprise',
    suspendCompany: 'Suspendre l entreprise',
    reactivateCompany: 'Reactiver l entreprise',
    assignToFirm: 'Assigner a une fiduciaire',
    deleteCompany: 'Supprimer l entreprise',
    na: 'N/A',
    statusActive: 'actif',
    statusPendingApproval: 'en attente',
    statusSuspended: 'suspendu',
    businessType: 'Entreprise',
    accountingFirmType: 'Fiduciaire',
    fetchErrorTitle: 'Erreur',
    fetchErrorDescription: 'Impossible de recuperer les entreprises.',
    updateSuccess: 'Statut de l entreprise mis a jour avec succes',
    updateErrorTitle: 'Echec de mise a jour',
    updateErrorDescription: 'Impossible de mettre a jour le statut de l entreprise.',
    deleteSuccess: 'Entreprise supprimee avec succes',
    deleteErrorTitle: 'Echec de suppression',
    deleteErrorDescription: 'Impossible de supprimer l entreprise.',
    assignSuccess: 'Fiduciaire assignee avec succes',
    assignErrorTitle: 'Echec d assignation',
    assignErrorDescription: 'Impossible d assigner la fiduciaire.',
    cancel: 'Annuler',
    assign: 'Assigner',
    assignTitle: 'Assigner une entreprise a une fiduciaire',
    assignDescription: 'Selectionnez une fiduciaire pour gerer cette entreprise cliente.',
    assignPlaceholder: 'Selectionner une fiduciaire...',
  },
  de: {
    pageTitle: 'Unternehmensverwaltung',
    pageSubtitle: 'Alle Unternehmenskonten auf der Plattform anzeigen, verwalten und freigeben.',
    sectionTitle: 'Unternehmenskonten',
    sectionSubtitle: 'Vollstandige Liste aller registrierten Unternehmenskonten.',
    searchPlaceholder: 'Unternehmen suchen...',
    createBusiness: 'Unternehmen erstellen',
    all: 'Alle',
    active: 'Aktiv',
    pending: 'Ausstehende Freigabe',
    suspended: 'Gesperrt',
    companyOrFirmName: 'Unternehmen / Kanzlei',
    type: 'Typ',
    primaryAdmin: 'Hauptadmin',
    assignedFirm: 'Zugewiesene Kanzlei',
    status: 'Status',
    actions: 'Aktionen',
    openMenu: 'Menue oeffnen',
    viewDetails: 'Details anzeigen',
    approveCompany: 'Unternehmen freigeben',
    suspendCompany: 'Unternehmen sperren',
    reactivateCompany: 'Unternehmen reaktivieren',
    assignToFirm: 'Kanzlei zuweisen',
    deleteCompany: 'Unternehmen loeschen',
    na: 'N/A',
    statusActive: 'aktiv',
    statusPendingApproval: 'ausstehende freigabe',
    statusSuspended: 'gesperrt',
    businessType: 'Unternehmen',
    accountingFirmType: 'Kanzlei',
    fetchErrorTitle: 'Fehler',
    fetchErrorDescription: 'Unternehmen konnten nicht geladen werden.',
    updateSuccess: 'Unternehmensstatus erfolgreich aktualisiert',
    updateErrorTitle: 'Aktualisierung fehlgeschlagen',
    updateErrorDescription: 'Unternehmensstatus konnte nicht aktualisiert werden.',
    deleteSuccess: 'Unternehmen erfolgreich geloescht',
    deleteErrorTitle: 'Loeschen fehlgeschlagen',
    deleteErrorDescription: 'Unternehmen konnte nicht geloescht werden.',
    assignSuccess: 'Kanzlei erfolgreich zugewiesen',
    assignErrorTitle: 'Zuweisung fehlgeschlagen',
    assignErrorDescription: 'Kanzlei konnte nicht zugewiesen werden.',
    cancel: 'Abbrechen',
    assign: 'Zuweisen',
    assignTitle: 'Unternehmen einer Kanzlei zuweisen',
    assignDescription: 'Wahlen Sie eine Kanzlei aus, die dieses Unternehmen verwalten soll.',
    assignPlaceholder: 'Kanzlei auswahlen...',
  },
  it: {
    pageTitle: 'Gestione aziende',
    pageSubtitle: 'Visualizza, gestisci e approva tutti gli account aziendali della piattaforma.',
    sectionTitle: 'Account aziendali',
    sectionSubtitle: 'Elenco completo di tutti gli account aziendali registrati.',
    searchPlaceholder: 'Cerca aziende...',
    createBusiness: 'Crea azienda',
    all: 'Tutti',
    active: 'Attivo',
    pending: 'In approvazione',
    suspended: 'Sospeso',
    companyOrFirmName: 'Azienda / Studio',
    type: 'Tipo',
    primaryAdmin: 'Admin principale',
    assignedFirm: 'Studio assegnato',
    status: 'Stato',
    actions: 'Azioni',
    openMenu: 'Apri menu',
    viewDetails: 'Visualizza dettagli',
    approveCompany: 'Approva azienda',
    suspendCompany: 'Sospendi azienda',
    reactivateCompany: 'Riattiva azienda',
    assignToFirm: 'Assegna allo studio',
    deleteCompany: 'Elimina azienda',
    na: 'N/A',
    statusActive: 'attivo',
    statusPendingApproval: 'in approvazione',
    statusSuspended: 'sospeso',
    businessType: 'Azienda',
    accountingFirmType: 'Studio',
    fetchErrorTitle: 'Errore',
    fetchErrorDescription: 'Impossibile recuperare le aziende.',
    updateSuccess: 'Stato azienda aggiornato con successo',
    updateErrorTitle: 'Aggiornamento non riuscito',
    updateErrorDescription: 'Impossibile aggiornare lo stato dell azienda.',
    deleteSuccess: 'Azienda eliminata con successo',
    deleteErrorTitle: 'Eliminazione non riuscita',
    deleteErrorDescription: 'Impossibile eliminare l azienda.',
    assignSuccess: 'Studio assegnato con successo',
    assignErrorTitle: 'Assegnazione non riuscita',
    assignErrorDescription: 'Impossibile assegnare lo studio.',
    cancel: 'Annulla',
    assign: 'Assegna',
    assignTitle: 'Assegna azienda a uno studio',
    assignDescription: 'Seleziona uno studio per gestire questa azienda cliente.',
    assignPlaceholder: 'Seleziona uno studio...',
  },
  es: {
    pageTitle: 'Gestion de empresas',
    pageSubtitle: 'Ver, gestionar y aprobar todas las cuentas empresariales de la plataforma.',
    sectionTitle: 'Cuentas empresariales',
    sectionSubtitle: 'Lista completa de todas las cuentas empresariales registradas.',
    searchPlaceholder: 'Buscar empresas...',
    createBusiness: 'Crear empresa',
    all: 'Todas',
    active: 'Activas',
    pending: 'Pendiente de aprobacion',
    suspended: 'Suspendidas',
    companyOrFirmName: 'Empresa / Despacho',
    type: 'Tipo',
    primaryAdmin: 'Admin principal',
    assignedFirm: 'Despacho asignado',
    status: 'Estado',
    actions: 'Acciones',
    openMenu: 'Abrir menu',
    viewDetails: 'Ver detalles',
    approveCompany: 'Aprobar empresa',
    suspendCompany: 'Suspender empresa',
    reactivateCompany: 'Reactivar empresa',
    assignToFirm: 'Asignar a despacho',
    deleteCompany: 'Eliminar empresa',
    na: 'N/A',
    statusActive: 'activa',
    statusPendingApproval: 'pendiente de aprobacion',
    statusSuspended: 'suspendida',
    businessType: 'Empresa',
    accountingFirmType: 'Despacho',
    fetchErrorTitle: 'Error',
    fetchErrorDescription: 'No se pudieron obtener las empresas.',
    updateSuccess: 'Estado de la empresa actualizado correctamente',
    updateErrorTitle: 'Actualizacion fallida',
    updateErrorDescription: 'No se pudo actualizar el estado de la empresa.',
    deleteSuccess: 'Empresa eliminada correctamente',
    deleteErrorTitle: 'Eliminacion fallida',
    deleteErrorDescription: 'No se pudo eliminar la empresa.',
    assignSuccess: 'Despacho asignado correctamente',
    assignErrorTitle: 'Asignacion fallida',
    assignErrorDescription: 'No se pudo asignar el despacho.',
    cancel: 'Cancelar',
    assign: 'Asignar',
    assignTitle: 'Asignar empresa a un despacho',
    assignDescription: 'Seleccione un despacho para gestionar esta empresa cliente.',
    assignPlaceholder: 'Seleccionar un despacho...',
  },
};

const getStatusBadgeVariant = (status: CompanyStatus) => {
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

const getTypeBadgeVariant = (type: CompanyType) => {
    return type === 'Business' ? 'default' : 'secondary';
};

const CompanyTable = ({ companies, onUpdateStatus, onDelete, isLoading, onAssign, onViewDetails, ui }: { companies: Company[], onUpdateStatus: (id: string, status: CompanyStatus) => void, onDelete: (id: string) => void, isLoading: boolean, onAssign: (company: Company) => void, onViewDetails: (company: Company) => void, ui: (typeof UI_BY_LOCALE)[SupportedLocale] }) => (
    <Table>
        <TableHeader>
            <TableRow>
      <TableHead>{ui.companyOrFirmName}</TableHead>
      <TableHead>{ui.type}</TableHead>
      <TableHead className="hidden md:table-cell">{ui.primaryAdmin}</TableHead>
      <TableHead className="hidden lg:table-cell">{ui.assignedFirm}</TableHead>
      <TableHead>{ui.status}</TableHead>
      <TableHead className="text-right">{ui.actions}</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {isLoading && Array.from({length: 5}).map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
            ))}
            {!isLoading && companies.map((company) => (
            <TableRow key={company.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onViewDetails(company)}>
                <TableCell className="font-medium">{company.companyName}</TableCell>
                 <TableCell>
                    <Badge variant={getTypeBadgeVariant(company.type as CompanyType)}>{company.type === 'Business' ? ui.businessType : ui.accountingFirmType}</Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                     <div className="flex items-center gap-3">
                         <Avatar className="h-9 w-9">
                            {company.adminAvatar && <AvatarImage src={company.adminAvatar} alt={company.adminName || ''} />}
                            <AvatarFallback>{company.adminName?.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="font-medium">{company.adminName || ui.na}</div>
                            <div className="text-xs text-muted-foreground">{company.adminEmail}</div>
                        </div>
                    </div>
                </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">{company.assignedFirmName || ui.na}</TableCell>
                <TableCell>
                <Badge variant={getStatusBadgeVariant(company.status as CompanyStatus)}>
                        {company.status === 'active' ? ui.statusActive : company.status === 'pending_approval' ? ui.statusPendingApproval : ui.statusSuspended}
                </Badge>
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">{ui.openMenu}</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{ui.actions}</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => onViewDetails(company)}>
                        <Eye className="mr-2 h-4 w-4" />
                          {ui.viewDetails}
                    </DropdownMenuItem>
                     {company.status === "pending_approval" && (
                        <DropdownMenuItem onClick={() => onUpdateStatus(company.id, 'active')}>
                            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                            {ui.approveCompany}
                        </DropdownMenuItem>
                    )}
                    {company.status === "active" && (
                        <DropdownMenuItem onClick={() => onUpdateStatus(company.id, 'suspended')}>
                            <Ban className="mr-2 h-4 w-4 text-yellow-500" />
                            {ui.suspendCompany}
                        </DropdownMenuItem>
                    )}
                     {company.status === "suspended" && (
                        <DropdownMenuItem onClick={() => onUpdateStatus(company.id, 'active')}>
                            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                            {ui.reactivateCompany}
                        </DropdownMenuItem>
                    )}
                    {company.type === 'Business' && (
                        <DropdownMenuItem onClick={() => onAssign(company)}>
                            <Building className="mr-2 h-4 w-4" />
                            {ui.assignToFirm}
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(company.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                          {ui.deleteCompany}
                    </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                </TableCell>
            </TableRow>
            ))}
        </TableBody>
    </Table>
);

export default function BusinessManagementPage() {
    const router = useRouter();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [firms, setFirms] = useState<AccountingFirm[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();
    const [assigningCompany, setAssigningCompany] = useState<Company | null>(null);
    const [selectedFirmId, setSelectedFirmId] = useState<string>('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const locale = resolveLocale(useLocale());
    const ui = UI_BY_LOCALE[locale];

    const handleViewDetails = (company: Company) => {
        router.push(`/${locale}/admin/company-management/${company.id}`);
    };

    useEffect(() => {
        const fetchCompaniesAndUsers = async () => {
            setIsLoading(true);
            const usersQuery = query(collection(firestore, 'users'));
            const usersSnapshot = await getDocs(usersQuery);
            const usersMap = new Map<string, UserData>();
            usersSnapshot.forEach(doc => {
                usersMap.set(doc.id, { id: doc.id, ...doc.data() } as UserData);
            });

            const firmsQuery = query(collection(firestore, 'companies'), where('type', '==', 'accounting_firm'));
            const firmsSnapshot = await getDocs(firmsQuery);
            const firmList = firmsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().companyName }));
            setFirms(firmList);

            const companiesQuery = query(collection(firestore, 'companies'), where('type', '==', 'business'));
            const unsubscribe = onSnapshot(companiesQuery, async (snapshot) => {
                // Re-fetch users on every snapshot so newly created users are included
                const freshUsersSnapshot = await getDocs(query(collection(firestore, 'users')));
                const freshUsersMap = new Map<string, UserData>();
                freshUsersSnapshot.forEach(doc => {
                    freshUsersMap.set(doc.id, { id: doc.id, ...doc.data() } as UserData);
                });

                const companyData = snapshot.docs.map(doc => {
                    const data = doc.data();
                    const adminUser = freshUsersMap.get(data.adminUserId);
                    const assignedFirm = firmList.find(f => f.id === data.accountingFirmId);
                    return {
                        id: doc.id,
                        companyName: data.companyName,
                        type: data.type === 'accounting_firm' ? 'Accounting Firm' : 'Business',
                        adminUserId: data.adminUserId,
                        registered: data.createdAt ? format(data.createdAt.toDate(), 'yyyy-MM-dd') : 'N/A',
                        status: data.status,
                        adminName: adminUser ? `${adminUser.profile.firstName} ${adminUser.profile.lastName}` : 'N/A',
                        adminEmail: adminUser ? adminUser.email : 'N/A',
                        adminAvatar: adminUser?.photoURL,
                        accountingFirmId: data.accountingFirmId,
                        assignedFirmName: assignedFirm?.name,
                    } as Company;
                });
                setCompanies(companyData);
                setIsLoading(false);
            }, (error) => {
                console.error("Error fetching companies:", error);
                toast({ title: ui.fetchErrorTitle, description: ui.fetchErrorDescription, variant: "destructive" });
                setIsLoading(false);
            });

            return unsubscribe;
        };

        const unsubscribePromise = fetchCompaniesAndUsers();

        return () => {
            unsubscribePromise.then(unsub => unsub && unsub());
        };
    }, [toast, ui.fetchErrorDescription, ui.fetchErrorTitle]);

    const handleUpdateStatus = async (id: string, status: CompanyStatus) => {
        const docRef = doc(firestore, 'companies', id);
        try {
            await updateDoc(docRef, { status });
            toast({ title: ui.updateSuccess });
        } catch (error) {
            console.error("Error updating company status: ", error);
            toast({ title: ui.updateErrorTitle, description: ui.updateErrorDescription, variant: "destructive" });
        }
    };

    const handleDelete = async (id: string) => {
        const docRef = doc(firestore, 'companies', id);
        try {
            await deleteDoc(docRef);
            toast({ title: ui.deleteSuccess });
        } catch (error) {
            console.error("Error deleting company: ", error);
            toast({ title: ui.deleteErrorTitle, description: ui.deleteErrorDescription, variant: "destructive" });
        }
    };

    const handleOpenAssignDialog = (company: Company) => {
        setAssigningCompany(company);
        setSelectedFirmId(company.accountingFirmId || '');
    };

    const handleAssignFirm = async () => {
        if (!assigningCompany || !selectedFirmId) return;
        const docRef = doc(firestore, 'companies', assigningCompany.id);
        try {
            await updateDoc(docRef, { accountingFirmId: selectedFirmId });
            toast({ title: ui.assignSuccess });
            setAssigningCompany(null);
        } catch (error) {
            toast({ title: ui.assignErrorTitle, description: ui.assignErrorDescription, variant: "destructive" });
        }
    };
    
    const filteredCompanies = companies.filter(c => c.companyName.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <>
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
                <div className="flex gap-2 w-full sm:w-auto">
                  <div className="relative flex-grow sm:flex-grow-0">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder={ui.searchPlaceholder} className="pl-9 w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
                    <Button onClick={() => setIsCreateOpen(true)}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      {ui.createBusiness}
                  </Button>
                </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
                  <TabsList className="grid w-full grid-cols-4 max-w-lg">
                        <TabsTrigger value="all">{ui.all}</TabsTrigger>
                        <TabsTrigger value="active">{ui.active}</TabsTrigger>
                        <TabsTrigger value="pending">{ui.pending}</TabsTrigger>
                        <TabsTrigger value="suspended">{ui.suspended}</TabsTrigger>
                  </TabsList>
                  <TabsContent value="all" className="mt-4">
                    <CompanyTable companies={filteredCompanies} onUpdateStatus={handleUpdateStatus} onDelete={handleDelete} isLoading={isLoading} onAssign={handleOpenAssignDialog} onViewDetails={handleViewDetails} ui={ui} />
                  </TabsContent>
                  <TabsContent value="active" className="mt-4">
                      <CompanyTable companies={filteredCompanies.filter(c => c.status === 'active')} onUpdateStatus={handleUpdateStatus} onDelete={handleDelete} isLoading={isLoading} onAssign={handleOpenAssignDialog} onViewDetails={handleViewDetails} ui={ui} />
                  </TabsContent>
                  <TabsContent value="pending" className="mt-4">
                      <CompanyTable companies={filteredCompanies.filter(c => c.status === 'pending_approval')} onUpdateStatus={handleUpdateStatus} onDelete={handleDelete} isLoading={isLoading} onAssign={handleOpenAssignDialog} onViewDetails={handleViewDetails} ui={ui} />
                  </TabsContent>
                  <TabsContent value="suspended" className="mt-4">
                      <CompanyTable companies={filteredCompanies.filter(c => c.status === 'suspended')} onUpdateStatus={handleUpdateStatus} onDelete={handleDelete} isLoading={isLoading} onAssign={handleOpenAssignDialog} onViewDetails={handleViewDetails} ui={ui} />
                  </TabsContent>
              </Tabs>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <CreateBusinessForm onClose={() => setIsCreateOpen(false)} />
      </Dialog>

      <Dialog open={!!assigningCompany} onOpenChange={(open) => !open && setAssigningCompany(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{ui.assignTitle}: {assigningCompany?.companyName}</DialogTitle>
            <DialogDescription>
              {ui.assignDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select onValueChange={setSelectedFirmId} defaultValue={selectedFirmId}>
              <SelectTrigger>
                <SelectValue placeholder={ui.assignPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {firms.map(firm => (
                  <SelectItem key={firm.id} value={firm.id}>{firm.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAssigningCompany(null)}>{ui.cancel}</Button>
            <Button onClick={handleAssignFirm} disabled={!selectedFirmId}>{ui.assign}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
