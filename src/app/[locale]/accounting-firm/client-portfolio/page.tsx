'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { MoreHorizontal, UserPlus, Search, Eye, FileBarChart2, FileText, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "@/navigation";
import { firestore } from '@/firebase/config';
import { useToast } from '@/hooks/use-toast';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase/firebase-provider';
import { useTranslations } from 'next-intl';

type ClientStatus = "Active" | "Onboarding" | "Inactive";

type Client = {
  id: string;
  name: string;
  type: string;
  primaryContact: string;
  email: string;
  status: ClientStatus;
  avatar: string;
};
const getStatusBadgeVariant = (status: ClientStatus) => {
  switch (status) {
    case "Active":
      return "default";
    case "Onboarding":
      return "secondary";
    case "Inactive":
      return "destructive";
    default:
      return "outline";
  }
};

const safeInitials = (name: string): string => {
  const clean = name.trim();
  if (!clean) return 'CL';
  return clean
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('') || 'CL';
};

const mapCompanyStatus = (status: string): ClientStatus => {
  if (status === 'active') return 'Active';
  if (status === 'pending_approval') return 'Onboarding';
  return 'Inactive';
};

const getStatusLabel = (status: ClientStatus, t: (key: string) => string): string => {
  if (status === 'Active') return t('active');
  if (status === 'Onboarding') return t('onboarding');
  return t('inactive');
};

export default function ClientPortfolioPage() {
  const { toast } = useToast();
  const { user } = useFirebase();
  const t = useTranslations('AccountingClientPortfolio');
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    const loadClients = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      };

      setIsLoading(true);
      try {
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (!userDocSnap.exists() || !userDocSnap.data().companyId) {
            throw new Error("Could not determine your firm's ID.");
        }
        const firmCompanyId = userDocSnap.data().companyId;
        
        const companiesQuery = query(collection(firestore, 'companies'), where('accountingFirmId', '==', firmCompanyId));
        const companySnapshot = await getDocs(companiesQuery);

        const usersSnapshot = await getDocs(collection(firestore, 'users'));
        const usersMap = new Map<string, Record<string, any>>();
        usersSnapshot.docs.forEach((userDoc) => {
          usersMap.set(userDoc.id, userDoc.data());
        });

        const mappedClients: Client[] = companySnapshot.docs.map((companyDoc) => {
          const company = companyDoc.data() as Record<string, any>;
          const adminUser = usersMap.get(String(company.adminUserId ?? ''));
          const profile = (adminUser?.profile ?? {}) as Record<string, any>;
          const firstName = String(profile.firstName ?? '').trim();
          const lastName = String(profile.lastName ?? '').trim();
          const fullName = `${firstName} ${lastName}`.trim() || 'Primary Admin';

          return {
            id: companyDoc.id,
            name: String(company.companyName ?? 'Unnamed Client'),
            type: String(company.sector ?? company.clientType ?? 'Business'),
            primaryContact: fullName,
            email: String(adminUser?.email ?? 'N/A'),
            status: mapCompanyStatus(String(company.status ?? 'pending_approval')),
            avatar: String(adminUser?.photoURL ?? ''),
          };
        });

        setClients(mappedClients);
      } catch (error) {
        console.error('Client portfolio load error:', error);
        toast({
          title: t('errorTitle'),
          description: t('loadFailed'),
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadClients();
  }, [toast, t, user]);

  const filteredClients = useMemo(() => {
    const queryText = searchTerm.trim().toLowerCase();
    if (!queryText) return clients;
    return clients.filter((client) => (
      client.name.toLowerCase().includes(queryText)
      || client.primaryContact.toLowerCase().includes(queryText)
      || client.email.toLowerCase().includes(queryText)
    ));
  }, [clients, searchTerm]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('pageTitle')}</h1>
        <p className="text-muted-foreground">
          {t('pageSubtitle')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1">
              <CardTitle>{t('allClients')}</CardTitle>
              <CardDescription>
                {t('allClientsDesc')}
              </CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-grow sm:flex-grow-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('searchPlaceholder')}
                  className="pl-9 w-full"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
              <Button asChild>
                <Link href="/accounting-firm/document-generator">
                  <UserPlus className="mr-2 h-4 w-4" />
                  {t('onboardClient')}
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('clientName')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('type')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead className="hidden lg:table-cell">{t('primaryContact')}</TableHead>
                <TableHead className="text-right">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> {t('loadingClients')}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={client.avatar} alt={client.name} />
                        <AvatarFallback>{safeInitials(client.name)}</AvatarFallback>
                      </Avatar>
                      <div className="font-medium">{client.name}</div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{client.type}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(client.status)}>
                      {getStatusLabel(client.status, t)}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex flex-col">
                      <span>{client.primaryContact}</span>
                      <span className="text-xs text-muted-foreground">{client.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">{t('openMenu')}</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href="/accounting-firm/client-documents">
                            <Eye className="mr-2 h-4 w-4" />
                            {t('viewClientDocuments')}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/accounting-firm/scenario-analysis">
                            <FileBarChart2 className="mr-2 h-4 w-4" />
                            {t('runScenarioAnalysis')}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/accounting-firm/document-generator">
                            <FileText className="mr-2 h-4 w-4" />
                            {t('generateClientDocument')}
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && filteredClients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    {t('noClientsFound')}
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