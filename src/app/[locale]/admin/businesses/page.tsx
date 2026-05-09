
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
import { MoreHorizontal, PlusCircle, Search, Trash2, Eye, CheckCircle, Ban } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, where, writeBatch, addDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/firebase/config';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog } from '@/components/ui/dialog';
import { CreateBusinessForm } from '@/components/admin/create-business-form';
import { useLocale } from 'next-intl';


type Company = {
  id: string;
  companyName: string;
  adminUserId: string;
  registered: string;
  status: 'active' | 'pending_approval' | 'suspended';
};

type CompanyStatus = Company['status'];

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
  companyName: string;
  registered: string;
  status: string;
  actions: string;
  openMenu: string;
  viewDetails: string;
  approveCompany: string;
  suspendCompany: string;
  reactivateCompany: string;
  deleteCompany: string;
  statusActive: string;
  statusPendingApproval: string;
  statusSuspended: string;
  na: string;
  fetchErrorTitle: string;
  fetchErrorDescription: string;
  updateSuccess: string;
  updateErrorTitle: string;
  updateErrorDescription: string;
  deleteSuccess: string;
  deleteErrorTitle: string;
  deleteErrorDescription: string;
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
    companyName: 'Company Name',
    registered: 'Registered',
    status: 'Status',
    actions: 'Actions',
    openMenu: 'Open menu',
    viewDetails: 'View Details',
    approveCompany: 'Approve Company',
    suspendCompany: 'Suspend Company',
    reactivateCompany: 'Re-activate Company',
    deleteCompany: 'Delete Company',
    statusActive: 'active',
    statusPendingApproval: 'pending approval',
    statusSuspended: 'suspended',
    na: 'N/A',
    fetchErrorTitle: 'Error',
    fetchErrorDescription: 'Could not fetch business companies.',
    updateSuccess: 'Company status updated successfully',
    updateErrorTitle: 'Update Failed',
    updateErrorDescription: 'Could not update company status.',
    deleteSuccess: 'Company deleted successfully',
    deleteErrorTitle: 'Delete Failed',
    deleteErrorDescription: 'Could not delete company.',
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
    companyName: 'Nom de l entreprise',
    registered: 'Enregistre',
    status: 'Statut',
    actions: 'Actions',
    openMenu: 'Ouvrir le menu',
    viewDetails: 'Voir les details',
    approveCompany: 'Approuver l entreprise',
    suspendCompany: 'Suspendre l entreprise',
    reactivateCompany: 'Reactiver l entreprise',
    deleteCompany: 'Supprimer l entreprise',
    statusActive: 'actif',
    statusPendingApproval: 'en attente',
    statusSuspended: 'suspendu',
    na: 'N/A',
    fetchErrorTitle: 'Erreur',
    fetchErrorDescription: 'Impossible de recuperer les entreprises.',
    updateSuccess: 'Statut de l entreprise mis a jour avec succes',
    updateErrorTitle: 'Echec de mise a jour',
    updateErrorDescription: 'Impossible de mettre a jour le statut de l entreprise.',
    deleteSuccess: 'Entreprise supprimee avec succes',
    deleteErrorTitle: 'Echec de suppression',
    deleteErrorDescription: 'Impossible de supprimer l entreprise.',
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
    companyName: 'Unternehmensname',
    registered: 'Registriert',
    status: 'Status',
    actions: 'Aktionen',
    openMenu: 'Menue oeffnen',
    viewDetails: 'Details anzeigen',
    approveCompany: 'Unternehmen freigeben',
    suspendCompany: 'Unternehmen sperren',
    reactivateCompany: 'Unternehmen reaktivieren',
    deleteCompany: 'Unternehmen loeschen',
    statusActive: 'aktiv',
    statusPendingApproval: 'ausstehende freigabe',
    statusSuspended: 'gesperrt',
    na: 'N/A',
    fetchErrorTitle: 'Fehler',
    fetchErrorDescription: 'Unternehmen konnten nicht geladen werden.',
    updateSuccess: 'Unternehmensstatus erfolgreich aktualisiert',
    updateErrorTitle: 'Aktualisierung fehlgeschlagen',
    updateErrorDescription: 'Unternehmensstatus konnte nicht aktualisiert werden.',
    deleteSuccess: 'Unternehmen erfolgreich geloescht',
    deleteErrorTitle: 'Loeschen fehlgeschlagen',
    deleteErrorDescription: 'Unternehmen konnte nicht geloescht werden.',
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
    companyName: 'Nome azienda',
    registered: 'Registrata',
    status: 'Stato',
    actions: 'Azioni',
    openMenu: 'Apri menu',
    viewDetails: 'Visualizza dettagli',
    approveCompany: 'Approva azienda',
    suspendCompany: 'Sospendi azienda',
    reactivateCompany: 'Riattiva azienda',
    deleteCompany: 'Elimina azienda',
    statusActive: 'attivo',
    statusPendingApproval: 'in approvazione',
    statusSuspended: 'sospeso',
    na: 'N/A',
    fetchErrorTitle: 'Errore',
    fetchErrorDescription: 'Impossibile recuperare le aziende.',
    updateSuccess: 'Stato azienda aggiornato con successo',
    updateErrorTitle: 'Aggiornamento non riuscito',
    updateErrorDescription: 'Impossibile aggiornare lo stato dell azienda.',
    deleteSuccess: 'Azienda eliminata con successo',
    deleteErrorTitle: 'Eliminazione non riuscita',
    deleteErrorDescription: 'Impossibile eliminare l azienda.',
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
    companyName: 'Nombre de la empresa',
    registered: 'Registrada',
    status: 'Estado',
    actions: 'Acciones',
    openMenu: 'Abrir menu',
    viewDetails: 'Ver detalles',
    approveCompany: 'Aprobar empresa',
    suspendCompany: 'Suspender empresa',
    reactivateCompany: 'Reactivar empresa',
    deleteCompany: 'Eliminar empresa',
    statusActive: 'activa',
    statusPendingApproval: 'pendiente de aprobacion',
    statusSuspended: 'suspendida',
    na: 'N/A',
    fetchErrorTitle: 'Error',
    fetchErrorDescription: 'No se pudieron obtener las empresas.',
    updateSuccess: 'Estado de la empresa actualizado correctamente',
    updateErrorTitle: 'Actualizacion fallida',
    updateErrorDescription: 'No se pudo actualizar el estado de la empresa.',
    deleteSuccess: 'Empresa eliminada correctamente',
    deleteErrorTitle: 'Eliminacion fallida',
    deleteErrorDescription: 'No se pudo eliminar la empresa.',
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

const CompanyTable = ({ companies, onUpdateStatus, onDelete, isLoading, ui }: { companies: Company[], onUpdateStatus: (company: Company, status: CompanyStatus) => void, onDelete: (id: string) => void, isLoading: boolean, ui: (typeof UI_BY_LOCALE)[SupportedLocale] }) => (
    <Table>
        <TableHeader>
            <TableRow>
            <TableHead>{ui.companyName}</TableHead>
            <TableHead className="hidden md:table-cell">{ui.registered}</TableHead>
            <TableHead>{ui.status}</TableHead>
            <TableHead className="text-right">{ui.actions}</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {isLoading && Array.from({length: 5}).map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
            ))}
            {!isLoading && companies.map((company) => (
            <TableRow key={company.id}>
                <TableCell className="font-medium">{company.companyName}</TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">{company.registered}</TableCell>
                <TableCell>
                <Badge variant={getStatusBadgeVariant(company.status as CompanyStatus)}>
                  {company.status === 'active' ? ui.statusActive : company.status === 'pending_approval' ? ui.statusPendingApproval : ui.statusSuspended}
                </Badge>
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
                    <DropdownMenuLabel>{ui.actions}</DropdownMenuLabel>
                    <DropdownMenuItem disabled>
                        <Eye className="mr-2 h-4 w-4" />
                        {ui.viewDetails}
                    </DropdownMenuItem>
                     {company.status === "pending_approval" && (
                        <DropdownMenuItem onClick={() => onUpdateStatus(company, 'active')}>
                            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                            {ui.approveCompany}
                        </DropdownMenuItem>
                    )}
                    {company.status === "active" && (
                        <DropdownMenuItem onClick={() => onUpdateStatus(company, 'suspended')}>
                            <Ban className="mr-2 h-4 w-4 text-yellow-500" />
                            {ui.suspendCompany}
                        </DropdownMenuItem>
                    )}
                     {company.status === "suspended" && (
                        <DropdownMenuItem onClick={() => onUpdateStatus(company, 'active')}>
                            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                            {ui.reactivateCompany}
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
    const [companies, setCompanies] = useState<Company[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const locale = resolveLocale(useLocale());
    const ui = UI_BY_LOCALE[locale];

    useEffect(() => {
        setIsLoading(true);
        const q = query(collection(firestore, 'companies'), where('type', '==', 'business'));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const companyData = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    companyName: data.companyName,
                    adminUserId: data.adminUserId,
                    registered: data.createdAt ? format(data.createdAt.toDate(), 'yyyy-MM-dd') : ui.na,
                    status: data.status,
                } as Company;
            });
            setCompanies(companyData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching companies:", error);
            toast({ title: ui.fetchErrorTitle, description: ui.fetchErrorDescription, variant: "destructive" });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [toast, ui.fetchErrorDescription, ui.fetchErrorTitle, ui.na]);
    
    const handleUpdateStatus = async (company: Company, status: CompanyStatus) => {
        const docRef = doc(firestore, 'companies', company.id);
        try {
            const batch = writeBatch(firestore);
            
            // Update company status
            batch.update(docRef, { status });

            // If approving, update user status and send notification
            if (status === 'active' && company.adminUserId) {
                const userDocRef = doc(firestore, 'users', company.adminUserId);
                batch.update(userDocRef, { status: 'active' });

                const notificationRef = collection(firestore, 'users', company.adminUserId, 'notifications');
                const notificationDoc = doc(notificationRef);
                batch.set(notificationDoc, {
                    title: "Account Approved",
                    description: `Your company '${company.companyName}' has been approved. You can now access all features.`,
                    type: 'system',
                    read: false,
                    link: '/business/dashboard',
                    createdAt: serverTimestamp(),
                });
            }

            await batch.commit();
            
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
    
    const filteredCompanies = companies.filter(c => c.companyName.toLowerCase().includes(searchTerm.toLowerCase()));

    const allCount = filteredCompanies.length;
    const activeCount = filteredCompanies.filter(f => f.status === 'active').length;
    const pendingCount = filteredCompanies.filter(f => f.status === 'pending_approval').length;
    const suspendedCount = filteredCompanies.filter(f => f.status === 'suspended').length;


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
                      <TabsTrigger value="all">{ui.all} {allCount > 0 && <span className="ml-2 text-muted-foreground">({allCount})</span>}</TabsTrigger>
                      <TabsTrigger value="active">{ui.active} {activeCount > 0 && <span className="ml-2 text-muted-foreground">({activeCount})</span>}</TabsTrigger>
                      <TabsTrigger value="pending">{ui.pending} {pendingCount > 0 && <span className="ml-2 text-red-500">({pendingCount})</span>}</TabsTrigger>
                      <TabsTrigger value="suspended">{ui.suspended} {suspendedCount > 0 && <span className="ml-2 text-muted-foreground">({suspendedCount})</span>}</TabsTrigger>
                  </TabsList>
                  <TabsContent value="all" className="mt-4">
                    <CompanyTable companies={filteredCompanies} onUpdateStatus={handleUpdateStatus} onDelete={handleDelete} isLoading={isLoading} ui={ui} />
                  </TabsContent>
                  <TabsContent value="active" className="mt-4">
                      <CompanyTable companies={filteredCompanies.filter(c => c.status === 'active')} onUpdateStatus={handleUpdateStatus} onDelete={handleDelete} isLoading={isLoading} ui={ui} />
                  </TabsContent>
                  <TabsContent value="pending" className="mt-4">
                      <CompanyTable companies={filteredCompanies.filter(c => c.status === 'pending_approval')} onUpdateStatus={handleUpdateStatus} onDelete={handleDelete} isLoading={isLoading} ui={ui} />
                  </TabsContent>
                  <TabsContent value="suspended" className="mt-4">
                      <CompanyTable companies={filteredCompanies.filter(c => c.status === 'suspended')} onUpdateStatus={handleUpdateStatus} onDelete={handleDelete} isLoading={isLoading} ui={ui} />
                  </TabsContent>
              </Tabs>
          </CardContent>
        </Card>
      </div>
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <CreateBusinessForm onClose={() => setIsCreateOpen(false)} />
      </Dialog>
    </>
  );
}
