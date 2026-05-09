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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Search, FileDown, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { firestore } from '@/firebase/config';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';

type AuditLog = {
  id: string;
  timestamp: { seconds: number; nanoseconds: number };
  userName: string;
  userAvatar: string | null;
  action: string;
  description: string;
  clientName: string | null;
  ipAddress: string;
};
const safeInitials = (name: string): string => {
  const clean = name.trim();
  if (!clean) return 'SY';
  return clean
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('') || 'SY';
};

const exportCsv = (rows: string[][], fileName: string) => {
  const csvContent = rows
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

const toActionCategory = (log: AuditLog): string => {
  const action = log.action.toLowerCase();
  if (action.includes('auth') || action.includes('login') || action.includes('register')) return 'auth';
  if (action.includes('document') || action.includes('database') || action.includes('upload')) return 'document';
  if (action.includes('analysis') || action.includes('ai')) return 'analysis';
  return 'system';
};

export default function AuditLogsPage() {
  const [date, setDate] = useState<DateRange | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [userFilter, setUserFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const { toast } = useToast();
  const t = useTranslations('AccountingAuditLogs');

  const actionTypes = [
    { value: 'all', label: t('allActions') },
    { value: 'auth', label: t('auth') },
    { value: 'document', label: t('documents') },
    { value: 'analysis', label: t('analysis') },
    { value: 'system', label: t('system') },
  ];

  useEffect(() => {
    const logsQuery = query(collection(firestore, 'system_logs'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(logsQuery, (snapshot) => {
      const mapped = snapshot.docs.map((logDoc) => {
        const data = logDoc.data() as Record<string, any>;
        const details = (data.details ?? {}) as Record<string, any>;

        return {
          id: logDoc.id,
          timestamp: data.timestamp,
          userName: String(details.userName ?? details.userEmail ?? 'System'),
          userAvatar: details.userAvatar ? String(details.userAvatar) : null,
          action: String(data.service ?? 'system_update').toLowerCase(),
          description: String(data.message ?? 'System event'),
          clientName: typeof details.companyName === 'string' ? details.companyName : null,
          ipAddress: String(data.ipAddress ?? '127.0.0.1'),
        } satisfies AuditLog;
      });

      setLogs(mapped);
      setIsLoading(false);
    }, (error) => {
      console.error('Audit logs load error:', error);
      toast({
        title: t('errorTitle'),
        description: t('fetchError'),
        variant: 'destructive',
      });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast, t]);

  const userOptions = useMemo(() => {
    const uniqueUsers = Array.from(new Set(logs.map((log) => log.userName)));
    return [{ value: 'all', label: t('allUsers') }, ...uniqueUsers.map((name) => ({ value: name, label: name }))];
  }, [logs, t]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const dateValue = new Date(log.timestamp?.seconds ? log.timestamp.seconds * 1000 : Date.now());
      const inDateRange = !date?.from || (
        dateValue >= date.from &&
        (!date.to || dateValue <= date.to)
      );

      const queryText = searchTerm.trim().toLowerCase();
      const inSearch = !queryText || log.description.toLowerCase().includes(queryText) || (log.clientName ?? '').toLowerCase().includes(queryText);
      const inUser = userFilter === 'all' || log.userName === userFilter;
      const inAction = actionFilter === 'all' || toActionCategory(log) === actionFilter;

      return inDateRange && inSearch && inUser && inAction;
    });
  }, [actionFilter, date, logs, searchTerm, userFilter]);

  const handleExport = () => {
    const rows = [
      ['timestamp', 'userName', 'action', 'description', 'clientName', 'ipAddress'],
      ...filteredLogs.map((log) => [
        format(new Date(log.timestamp.seconds * 1000), 'yyyy-MM-dd HH:mm:ss'),
        log.userName,
        log.action,
        log.description,
        log.clientName ?? t('na'),
        log.ipAddress,
      ]),
    ];
    exportCsv(rows, 'accounting-audit-logs.csv');
  };

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
              <CardTitle>{t('sectionTitle')}</CardTitle>
              <CardDescription>
                {t('sectionSubtitle')}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <div className="relative flex-grow sm:flex-grow-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('searchPlaceholder')}
                  className="pl-9 w-full min-w-[200px]"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className="w-full justify-start text-left font-normal sm:w-auto">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date?.from ? (
                      date.to ? (
                        <>
                          {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(date.from, "LLL dd, y")
                      )
                    ) : (
                      <span>{t('pickDate')}</span>
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
              <Button variant="outline" onClick={handleExport} disabled={filteredLogs.length === 0}>
                <FileDown className="mr-2 h-4 w-4" />
                {t('export')}
              </Button>
            </div>
          </div>
          <div className="flex items-center space-x-2 pt-4">
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={t('filterByUser')} />
              </SelectTrigger>
              <SelectContent>
                {userOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={t('filterByAction')} />
              </SelectTrigger>
              <SelectContent>
                {actionTypes.map((action) => (
                  <SelectItem key={action.value} value={action.value}>{action.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" onClick={() => { setDate(undefined); setUserFilter('all'); setActionFilter('all'); setSearchTerm(''); }}>
              {t('clearFilters')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">{t('timestamp')}</TableHead>
                <TableHead>{t('user')}</TableHead>
                <TableHead>{t('action')}</TableHead>
                <TableHead className="hidden lg:table-cell">{t('client')}</TableHead>
                <TableHead className="text-right">{t('details')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> {t('loadingLogs')}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs">{format(new Date(log.timestamp.seconds * 1000), 'yyyy-MM-dd HH:mm:ss')}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        {log.userAvatar ? <AvatarImage src={log.userAvatar} alt={log.userName} /> : null}
                        <AvatarFallback>{safeInitials(log.userName)}</AvatarFallback>
                      </Avatar>
                      <span>{log.userName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{log.description}</span>
                      <span className="text-xs text-muted-foreground">{log.action}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {log.clientName || t('na')}
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
                        <DropdownMenuLabel>{t('logDetails')}</DropdownMenuLabel>
                        <DropdownMenuItem>{t('ipAddress')}: {log.ipAddress}</DropdownMenuItem>
                        <DropdownMenuItem>{t('user')}: {log.userName}</DropdownMenuItem>
                        <DropdownMenuItem>{t('action')}: {log.action}</DropdownMenuItem>
                        {log.clientName ? <DropdownMenuItem>{t('client')}: {log.clientName}</DropdownMenuItem> : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && filteredLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    {t('noLogsMatch')}
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
