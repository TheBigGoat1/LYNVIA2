
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
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle, Search, Trash2, Eye, CheckCircle, Ban } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, where, getDocs, writeBatch, addDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/firebase/config';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog } from '@/components/ui/dialog';
import { CreateFirmForm } from '@/components/admin/create-firm-form';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLocale } from 'next-intl';


type Firm = {
  id: string;
  companyName: string;
  adminUserId: string;
  registered: string;
  status: 'active' | 'pending_approval' | 'suspended';
  adminName?: string;
  adminEmail?: string;
  adminAvatar?: string | null;
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

type FirmStatus = Firm['status'];

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
    createFirm: string;
    all: string;
    active: string;
    pending: string;
    suspended: string;
    firmName: string;
    primaryAdmin: string;
    registered: string;
    status: string;
    actions: string;
    openMenu: string;
    viewDetails: string;
    approveFirm: string;
    suspendFirm: string;
    reactivateFirm: string;
    deleteFirm: string;
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
        pageTitle: 'Accounting Firm Management',
        pageSubtitle: 'View, manage, and approve all Accounting Firm accounts on the platform.',
        sectionTitle: 'Accounting Firm Accounts',
        sectionSubtitle: 'A complete list of all registered accounting firm accounts.',
        searchPlaceholder: 'Search firms...',
        createFirm: 'Create Firm',
        all: 'All',
        active: 'Active',
        pending: 'Pending Approval',
        suspended: 'Suspended',
        firmName: 'Firm Name',
        primaryAdmin: 'Primary Admin',
        registered: 'Registered',
        status: 'Status',
        actions: 'Actions',
        openMenu: 'Open menu',
        viewDetails: 'View Details',
        approveFirm: 'Approve Firm',
        suspendFirm: 'Suspend Firm',
        reactivateFirm: 'Re-activate Firm',
        deleteFirm: 'Delete Firm',
        statusActive: 'active',
        statusPendingApproval: 'pending approval',
        statusSuspended: 'suspended',
        na: 'N/A',
        fetchErrorTitle: 'Error',
        fetchErrorDescription: 'Could not fetch accounting firms.',
        updateSuccess: 'Firm status updated successfully',
        updateErrorTitle: 'Update Failed',
        updateErrorDescription: 'Could not update firm status.',
        deleteSuccess: 'Firm deleted successfully',
        deleteErrorTitle: 'Delete Failed',
        deleteErrorDescription: 'Could not delete firm.',
    },
    fr: {
        pageTitle: 'Gestion des fiduciaires',
        pageSubtitle: 'Voir, gerer et approuver tous les comptes fiduciaires de la plateforme.',
        sectionTitle: 'Comptes fiduciaires',
        sectionSubtitle: 'Liste complete de tous les comptes fiduciaires enregistres.',
        searchPlaceholder: 'Rechercher des fiduciaires...',
        createFirm: 'Creer une fiduciaire',
        all: 'Tous',
        active: 'Actif',
        pending: 'En attente',
        suspended: 'Suspendu',
        firmName: 'Nom de la fiduciaire',
        primaryAdmin: 'Admin principal',
        registered: 'Enregistre',
        status: 'Statut',
        actions: 'Actions',
        openMenu: 'Ouvrir le menu',
        viewDetails: 'Voir les details',
        approveFirm: 'Approuver la fiduciaire',
        suspendFirm: 'Suspendre la fiduciaire',
        reactivateFirm: 'Reactiver la fiduciaire',
        deleteFirm: 'Supprimer la fiduciaire',
        statusActive: 'actif',
        statusPendingApproval: 'en attente',
        statusSuspended: 'suspendu',
        na: 'N/A',
        fetchErrorTitle: 'Erreur',
        fetchErrorDescription: 'Impossible de recuperer les fiduciaires.',
        updateSuccess: 'Statut de la fiduciaire mis a jour avec succes',
        updateErrorTitle: 'Echec de mise a jour',
        updateErrorDescription: 'Impossible de mettre a jour le statut de la fiduciaire.',
        deleteSuccess: 'Fiduciaire supprimee avec succes',
        deleteErrorTitle: 'Echec de suppression',
        deleteErrorDescription: 'Impossible de supprimer la fiduciaire.',
    },
    de: {
        pageTitle: 'Kanzleiverwaltung',
        pageSubtitle: 'Alle Kanzleikonten auf der Plattform anzeigen, verwalten und freigeben.',
        sectionTitle: 'Kanzleikonten',
        sectionSubtitle: 'Vollstandige Liste aller registrierten Kanzleikonten.',
        searchPlaceholder: 'Kanzleien suchen...',
        createFirm: 'Kanzlei erstellen',
        all: 'Alle',
        active: 'Aktiv',
        pending: 'Ausstehende Freigabe',
        suspended: 'Gesperrt',
        firmName: 'Kanzleiname',
        primaryAdmin: 'Hauptadmin',
        registered: 'Registriert',
        status: 'Status',
        actions: 'Aktionen',
        openMenu: 'Menue oeffnen',
        viewDetails: 'Details anzeigen',
        approveFirm: 'Kanzlei freigeben',
        suspendFirm: 'Kanzlei sperren',
        reactivateFirm: 'Kanzlei reaktivieren',
        deleteFirm: 'Kanzlei loeschen',
        statusActive: 'aktiv',
        statusPendingApproval: 'ausstehende freigabe',
        statusSuspended: 'gesperrt',
        na: 'N/A',
        fetchErrorTitle: 'Fehler',
        fetchErrorDescription: 'Kanzleien konnten nicht geladen werden.',
        updateSuccess: 'Kanzleistatus erfolgreich aktualisiert',
        updateErrorTitle: 'Aktualisierung fehlgeschlagen',
        updateErrorDescription: 'Kanzleistatus konnte nicht aktualisiert werden.',
        deleteSuccess: 'Kanzlei erfolgreich geloescht',
        deleteErrorTitle: 'Loeschen fehlgeschlagen',
        deleteErrorDescription: 'Kanzlei konnte nicht geloescht werden.',
    },
    it: {
        pageTitle: 'Gestione studi',
        pageSubtitle: 'Visualizza, gestisci e approva tutti gli account studio della piattaforma.',
        sectionTitle: 'Account studio',
        sectionSubtitle: 'Elenco completo di tutti gli account studio registrati.',
        searchPlaceholder: 'Cerca studi...',
        createFirm: 'Crea studio',
        all: 'Tutti',
        active: 'Attivo',
        pending: 'In approvazione',
        suspended: 'Sospeso',
        firmName: 'Nome studio',
        primaryAdmin: 'Admin principale',
        registered: 'Registrato',
        status: 'Stato',
        actions: 'Azioni',
        openMenu: 'Apri menu',
        viewDetails: 'Visualizza dettagli',
        approveFirm: 'Approva studio',
        suspendFirm: 'Sospendi studio',
        reactivateFirm: 'Riattiva studio',
        deleteFirm: 'Elimina studio',
        statusActive: 'attivo',
        statusPendingApproval: 'in approvazione',
        statusSuspended: 'sospeso',
        na: 'N/A',
        fetchErrorTitle: 'Errore',
        fetchErrorDescription: 'Impossibile recuperare gli studi.',
        updateSuccess: 'Stato studio aggiornato con successo',
        updateErrorTitle: 'Aggiornamento non riuscito',
        updateErrorDescription: 'Impossibile aggiornare lo stato dello studio.',
        deleteSuccess: 'Studio eliminato con successo',
        deleteErrorTitle: 'Eliminazione non riuscita',
        deleteErrorDescription: 'Impossibile eliminare lo studio.',
    },
    es: {
        pageTitle: 'Gestion de despachos',
        pageSubtitle: 'Ver, gestionar y aprobar todas las cuentas de despachos de la plataforma.',
        sectionTitle: 'Cuentas de despachos',
        sectionSubtitle: 'Lista completa de todas las cuentas de despachos registradas.',
        searchPlaceholder: 'Buscar despachos...',
        createFirm: 'Crear despacho',
        all: 'Todas',
        active: 'Activas',
        pending: 'Pendiente de aprobacion',
        suspended: 'Suspendidas',
        firmName: 'Nombre del despacho',
        primaryAdmin: 'Admin principal',
        registered: 'Registrado',
        status: 'Estado',
        actions: 'Acciones',
        openMenu: 'Abrir menu',
        viewDetails: 'Ver detalles',
        approveFirm: 'Aprobar despacho',
        suspendFirm: 'Suspender despacho',
        reactivateFirm: 'Reactivar despacho',
        deleteFirm: 'Eliminar despacho',
        statusActive: 'activa',
        statusPendingApproval: 'pendiente de aprobacion',
        statusSuspended: 'suspendida',
        na: 'N/A',
        fetchErrorTitle: 'Error',
        fetchErrorDescription: 'No se pudieron obtener los despachos.',
        updateSuccess: 'Estado del despacho actualizado correctamente',
        updateErrorTitle: 'Actualizacion fallida',
        updateErrorDescription: 'No se pudo actualizar el estado del despacho.',
        deleteSuccess: 'Despacho eliminado correctamente',
        deleteErrorTitle: 'Eliminacion fallida',
        deleteErrorDescription: 'No se pudo eliminar el despacho.',
    },
};

const getStatusBadgeVariant = (status: FirmStatus) => {
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

const FirmTable = ({ firms, onUpdateStatus, onDelete, onViewDetails, isLoading, ui }: { firms: Firm[], onUpdateStatus: (firm: Firm, status: FirmStatus) => void, onDelete: (id: string) => void, onViewDetails: (firm: Firm) => void, isLoading: boolean, ui: (typeof UI_BY_LOCALE)[SupportedLocale] }) => (
    <Table>
        <TableHeader>
            <TableRow>
            <TableHead>{ui.firmName}</TableHead>
            <TableHead className="hidden md:table-cell">{ui.primaryAdmin}</TableHead>
            <TableHead className="hidden lg:table-cell">{ui.registered}</TableHead>
            <TableHead>{ui.status}</TableHead>
            <TableHead className="text-right">{ui.actions}</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {isLoading && Array.from({length: 5}).map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-10 w-40" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
            ))}
            {!isLoading && firms.map((firm) => (
            <TableRow key={firm.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onViewDetails(firm)}>
                <TableCell className="font-medium">{firm.companyName}</TableCell>
                <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                           {firm.adminAvatar && <AvatarImage src={firm.adminAvatar} alt={firm.adminName || ''} />}
                           <AvatarFallback>{firm.adminName?.split(' ').map(n => n[0]).join('') || 'A'}</AvatarFallback>
                       </Avatar>
                       <div>
                           <div className="font-medium">{firm.adminName || ui.na}</div>
                           <div className="text-xs text-muted-foreground">{firm.adminEmail}</div>
                       </div>
                   </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground">{firm.registered}</TableCell>
                <TableCell>
                <Badge variant={getStatusBadgeVariant(firm.status as FirmStatus)}>
                    {firm.status === 'active' ? ui.statusActive : firm.status === 'pending_approval' ? ui.statusPendingApproval : ui.statusSuspended}
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
                    <DropdownMenuItem onClick={() => onViewDetails(firm)}>
                        <Eye className="mr-2 h-4 w-4" />
                        {ui.viewDetails}
                    </DropdownMenuItem>
                     {firm.status === "pending_approval" && (
                        <DropdownMenuItem onClick={() => onUpdateStatus(firm, 'active')}>
                            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                            {ui.approveFirm}
                        </DropdownMenuItem>
                    )}
                    {firm.status === "active" && (
                        <DropdownMenuItem onClick={() => onUpdateStatus(firm, 'suspended')}>
                            <Ban className="mr-2 h-4 w-4 text-yellow-500" />
                            {ui.suspendFirm}
                        </DropdownMenuItem>
                    )}
                     {firm.status === "suspended" && (
                        <DropdownMenuItem onClick={() => onUpdateStatus(firm, 'active')}>
                            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                            {ui.reactivateFirm}
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(firm.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        {ui.deleteFirm}
                    </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                </TableCell>
            </TableRow>
            ))}
        </TableBody>
    </Table>
);

export default function AccountingFirmsManagementPage() {
    const router = useRouter();
    const [firms, setFirms] = useState<Firm[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();
    const [isCreateFirmOpen, setIsCreateFirmOpen] = useState(false);
    const locale = resolveLocale(useLocale());
    const ui = UI_BY_LOCALE[locale];

    const handleViewDetails = (firm: Firm) => {
        router.push(`/${locale}/admin/accounting-firms/${firm.id}`);
    };

    useEffect(() => {
        const fetchFirmsAndUsers = async () => {
            setIsLoading(true);
            
            const usersQuery = query(collection(firestore, 'users'));
            const usersSnapshot = await getDocs(usersQuery);
            const usersMap = new Map<string, UserData>();
            usersSnapshot.forEach(doc => {
                usersMap.set(doc.id, { id: doc.id, ...doc.data() } as UserData);
            });

            const q = query(collection(firestore, 'companies'), where('type', '==', 'accounting_firm'));
            
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const firmData = snapshot.docs.map(doc => {
                    const data = doc.data();
                    const adminUser = usersMap.get(data.adminUserId);
                    const adminName = adminUser ? `${adminUser.profile?.firstName || ''} ${adminUser.profile?.lastName || ''}`.trim() : ui.na;
                    return {
                        id: doc.id,
                        companyName: data.companyName,
                        adminUserId: data.adminUserId,
                        registered: data.createdAt ? format(data.createdAt.toDate(), 'yyyy-MM-dd') : ui.na,
                        status: data.status,
                        adminName: adminName,
                        adminEmail: adminUser ? adminUser.email : ui.na,
                        adminAvatar: adminUser?.photoURL,
                    } as Firm;
                });
                setFirms(firmData);
                setIsLoading(false);
            }, (error) => {
                console.error("Error fetching accounting firms:", error);
                toast({ title: ui.fetchErrorTitle, description: ui.fetchErrorDescription, variant: "destructive" });
                setIsLoading(false);
            });

            return unsubscribe;
        }

        const unsubPromise = fetchFirmsAndUsers();
        return () => {
            unsubPromise.then(unsub => unsub && unsub());
        }
    }, [toast, ui.fetchErrorDescription, ui.fetchErrorTitle, ui.na]);
    
    const handleUpdateStatus = async (firm: Firm, status: FirmStatus) => {
        const docRef = doc(firestore, 'companies', firm.id);
        try {
            const batch = writeBatch(firestore);

            // Update company status
            batch.update(docRef, { status });

            // If approving, update user status and send notification
            if (status === 'active' && firm.adminUserId) {
                const userDocRef = doc(firestore, 'users', firm.adminUserId);
                batch.update(userDocRef, { status: 'active' });
                
                const notificationRef = collection(firestore, 'users', firm.adminUserId, 'notifications');
                const notificationDoc = doc(notificationRef);
                batch.set(notificationDoc, {
                    title: "Account Approved",
                    description: `Your firm '${firm.companyName}' has been approved. You can now access all features.`,
                    type: 'system',
                    read: false,
                    link: '/accounting-firm/dashboard',
                    createdAt: serverTimestamp(),
                });
            }

            await batch.commit();

            toast({ title: ui.updateSuccess });
        } catch (error) {
            console.error("Error updating firm status: ", error);
            toast({ title: ui.updateErrorTitle, description: ui.updateErrorDescription, variant: "destructive" });
        }
    };

    const handleDelete = async (id: string) => {
        const docRef = doc(firestore, 'companies', id);
        try {
            await deleteDoc(docRef);
            toast({ title: ui.deleteSuccess });
        } catch (error) {
            console.error("Error deleting firm: ", error);
            toast({ title: ui.deleteErrorTitle, description: ui.deleteErrorDescription, variant: "destructive" });
        }
    };
    
    const filteredFirms = firms.filter(c => c.companyName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const allCount = filteredFirms.length;
    const activeCount = filteredFirms.filter(f => f.status === 'active').length;
    const pendingCount = filteredFirms.filter(f => f.status === 'pending_approval').length;
    const suspendedCount = filteredFirms.filter(f => f.status === 'suspended').length;


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
                  <Button onClick={() => setIsCreateFirmOpen(true)}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      {ui.createFirm}
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
                                        <FirmTable firms={filteredFirms} onUpdateStatus={handleUpdateStatus} onDelete={handleDelete} onViewDetails={handleViewDetails} isLoading={isLoading} ui={ui} />
                  </TabsContent>
                  <TabsContent value="active" className="mt-4">
                                            <FirmTable firms={filteredFirms.filter(c => c.status === 'active')} onUpdateStatus={handleUpdateStatus} onDelete={handleDelete} onViewDetails={handleViewDetails} isLoading={isLoading} ui={ui} />
                  </TabsContent>
                  <TabsContent value="pending" className="mt-4">
                                            <FirmTable firms={filteredFirms.filter(c => c.status === 'pending_approval')} onUpdateStatus={handleUpdateStatus} onDelete={handleDelete} onViewDetails={handleViewDetails} isLoading={isLoading} ui={ui} />
                  </TabsContent>
                  <TabsContent value="suspended" className="mt-4">
                                            <FirmTable firms={filteredFirms.filter(c => c.status === 'suspended')} onUpdateStatus={handleUpdateStatus} onDelete={handleDelete} onViewDetails={handleViewDetails} isLoading={isLoading} ui={ui} />
                  </TabsContent>
              </Tabs>
          </CardContent>
        </Card>
      </div>
      <Dialog open={isCreateFirmOpen} onOpenChange={setIsCreateFirmOpen}>
          <CreateFirmForm onClose={() => setIsCreateFirmOpen(false)} />
      </Dialog>
    </>
  );
}
