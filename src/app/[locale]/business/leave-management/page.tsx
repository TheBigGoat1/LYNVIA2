// Leave management removed as per updated requirements.
// This file has been deprecated and is no longer in use.
// Please refer to the updated documentation for further details.
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { differenceInDays, format as formatDate } from 'date-fns';
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
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Check, X, Eye, PlusCircle, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFirebase } from '@/firebase/firebase-provider';
import { firestore } from '@/firebase/config';
import {
    addDoc,
    collection,
    doc,
    getDoc,
    onSnapshot,
    orderBy,
    query,
    runTransaction,
    serverTimestamp,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useTranslations } from 'next-intl';

type LeaveRequest = {
  id: string;
    employeeId: string;
  employeeName: string;
    employeeAvatar: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  status: "Pending" | "Approved" | "Rejected";
    requestedAt: string;
    requesterUserId?: string;
    employeeUserId?: string;
    reviewedAt?: string;
    reviewedByUserId?: string;
};

type Employee = {
    id: string;
    name: string;
    avatar: string;
};

type LeaveStatus = LeaveRequest['status'];

const getStatusBadgeVariant = (status: LeaveStatus) => {
  switch (status) {
    case "Approved":
      return "default";
    case "Pending":
      return "secondary";
    case "Rejected":
      return "destructive";
    default:
      return "outline";
  }
};

const parseNumber = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number(value.replace(/[^\d.-]/g, ''));
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
};

const toIsoDateString = (value: unknown): string => {
    if (typeof value === 'string' && value.trim()) return value;
    if (value && typeof value === 'object' && 'toDate' in (value as any)) {
        try {
            return (value as any).toDate().toISOString();
        } catch {
            return new Date().toISOString();
        }
    }
    return new Date().toISOString();
};

const normalizeLeaveStatus = (value: unknown): LeaveStatus => {
    if (value === 'Approved' || value === 'Rejected' || value === 'Pending') {
        return value;
    }
    return 'Pending';
};

const safeInitials = (name: string): string => {
    const safeName = name.trim();
    if (!safeName) return 'NA';
    return safeName
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .slice(0, 2)
        .join('') || 'NA';
};

const parseLeaveRequestDoc = (id: string, data: Record<string, unknown>): LeaveRequest => {
    const employeeId = String(data.employeeId ?? id).trim();
    const employeeName = String(data.employeeName ?? 'Unknown Employee').trim() || 'Unknown Employee';
    const days = parseNumber(data.days);

    return {
        id,
        employeeId,
        employeeName,
        employeeAvatar: String(data.employeeAvatar ?? ''),
        leaveType: String(data.leaveType ?? 'Leave').trim() || 'Leave',
        startDate: String(data.startDate ?? '').trim() || 'N/A',
        endDate: String(data.endDate ?? '').trim() || 'N/A',
        days: days && days > 0 ? Math.round(days) : 0,
        status: normalizeLeaveStatus(data.status),
        requestedAt: toIsoDateString(data.requestedAt),
        requesterUserId: typeof data.requesterUserId === 'string' ? data.requesterUserId : undefined,
        employeeUserId: typeof data.employeeUserId === 'string' ? data.employeeUserId : undefined,
        reviewedAt: typeof data.reviewedAt === 'string' ? data.reviewedAt : undefined,
        reviewedByUserId: typeof data.reviewedByUserId === 'string' ? data.reviewedByUserId : undefined,
    };
};

const LeaveRequestTable = ({ requests, onUpdateRequest, isLoading }: { requests: LeaveRequest[], onUpdateRequest: (request: LeaveRequest, status: LeaveStatus) => void, isLoading: boolean }) => {
    const t = useTranslations('LeaveManagement');
    
    return (
    <Table>
        <TableHeader>
            <TableRow>
            <TableHead>{t('table.employee')}</TableHead>
            <TableHead className="hidden md:table-cell">{t('table.leaveType')}</TableHead>
            <TableHead className="hidden lg:table-cell">{t('table.dates')}</TableHead>
            <TableHead>{t('table.days')}</TableHead>
            <TableHead className="text-center">{t('table.status')}</TableHead>
            <TableHead className="text-right">{t('table.actions')}</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {isLoading && Array.from({length: 3}).map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-6 w-24 mx-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
            ))}
            {!isLoading && requests.map((request) => (
            <TableRow key={request.id}>
                <TableCell>
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={request.employeeAvatar} alt={request.employeeName} />
                        <AvatarFallback>{safeInitials(request.employeeName)}</AvatarFallback>
                    </Avatar>
                    <div className="font-medium">{request.employeeName}</div>
                </div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">{request.leaveType}</TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {request.startDate} to {request.endDate}
                </TableCell>
                <TableCell>{request.days}</TableCell>
                <TableCell className="text-center">
                <Badge variant={getStatusBadgeVariant(request.status as LeaveStatus)}>
                    {t(`status.${request.status}`)}
                </Badge>
                </TableCell>
                <TableCell className="text-right">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{t('actions.label')}</DropdownMenuLabel>
                    {request.status === 'Pending' && (
                        <>
                        <DropdownMenuItem onClick={() => onUpdateRequest(request, 'Approved')}>
                            <Check className="mr-2 h-4 w-4 text-green-500" />
                            {t('actions.approve')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onUpdateRequest(request, 'Rejected')}>
                            <X className="mr-2 h-4 w-4 text-red-500" />
                            {t('actions.reject')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        </>
                    )}
                    <DropdownMenuItem>
                        <Eye className="mr-2 h-4 w-4" />
                        {t('actions.view')}
                    </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                </TableCell>
            </TableRow>
            ))}
             {!isLoading && requests.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                        {t('noRequests')}
                    </TableCell>
                </TableRow>
              )}
        </TableBody>
    </Table>
)}


export default function LeaveManagementPage() {
    const { user } = useFirebase();
    const { toast } = useToast();
    const t = useTranslations('LeaveManagement');
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [companyId, setCompanyId] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            const userDocRef = doc(firestore, 'users', user.uid);
            getDoc(userDocRef).then(docSnap => {
                if (docSnap.exists()) {
                    const id = docSnap.data().companyId;
                    setCompanyId(id);
                }
            });
        }
    }, [user]);

    useEffect(() => {
        if (!companyId) {
            setIsLoading(false);
            return;
        };

        const employeesQuery = query(collection(firestore, 'companies', companyId, 'employees'));
        const unsubEmployees = onSnapshot(employeesQuery, (snapshot) => {
            const companyEmployees = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    name: `${data.firstName} ${data.lastName}`,
                    avatar: data.avatar || '',
                };
            });
            setEmployees(companyEmployees);
        });

        const leaveQuery = query(collection(firestore, 'companies', companyId, 'leave_requests'), orderBy('requestedAt', 'desc'));
        const unsubLeave = onSnapshot(leaveQuery, (snapshot) => {
            const requests = snapshot.docs.map((requestDoc) =>
                parseLeaveRequestDoc(requestDoc.id, requestDoc.data() as Record<string, unknown>)
            );
            setLeaveRequests(requests);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching leave requests: ", error);
            toast({
                title: "Error",
                description: t('toast.updateError'),
                variant: "destructive"
            });
            setIsLoading(false);
        });

        return () => {
            unsubEmployees();
            unsubLeave();
        };
    }, [companyId, toast, t]);

    const handleUpdateRequest = async (request: LeaveRequest, status: LeaveStatus) => {
        if (!companyId || !user) return;
        const docRef = doc(firestore, 'companies', companyId, 'leave_requests', request.id);
        try {
            let targetEmployeeUserId: string | null = null;
            await runTransaction(firestore, async (transaction) => {
                const leaveDoc = await transaction.get(docRef);
                if (!leaveDoc.exists()) throw new Error('Leave request not found.');
    
                const leaveData = leaveDoc.data();
                const currentStatus = normalizeLeaveStatus(leaveData.status);
                if (currentStatus !== 'Pending') {
                    throw new Error(t('toast.alreadyProcessed', { status: currentStatus.toLowerCase() }));
                }
                
                targetEmployeeUserId = leaveData.requesterUserId ?? leaveData.employeeUserId ?? null;
    
                let employeeRef;
                let employeeDoc;
    
                if (status === 'Approved') {
                    employeeRef = doc(firestore, 'companies', companyId, request.employeeId);
                    employeeDoc = await transaction.get(employeeRef);
    
                    if (employeeDoc.exists()) {
                        const employeeData = employeeDoc.data();
                        
                        if (!targetEmployeeUserId) {
                            targetEmployeeUserId = employeeData.userId ?? employeeData.employeeUserId ?? null;
                        }
                        
                        const annualLeaveDays = parseNumber(employeeData.annualLeaveDays) ?? 25;
                        const usedLeaveDays = parseNumber(employeeData.usedLeaveDays) ?? 0;
                        const remainingLeaveDays = parseNumber(employeeData.remainingLeaveDays) ?? Math.max(annualLeaveDays - usedLeaveDays, 0);
                        const requestedDays = Math.max(parseNumber(leaveData.days) ?? request.days, 0);
                        const nextUsed = usedLeaveDays + requestedDays;
                        const nextRemaining = Math.max(remainingLeaveDays - requestedDays, 0);
    
                        transaction.update(employeeRef, {
                            annualLeaveDays,
                            usedLeaveDays: nextUsed,
                            remainingLeaveDays: nextRemaining,
                            lastLeaveDecisionAt: serverTimestamp(),
                            lastLeaveRequestId: request.id,
                        });
                    }
                }
                
                transaction.update(docRef, {
                    status,
                    reviewedAt: serverTimestamp(),
                    reviewedByUserId: user.uid,
                });
            });

            const notificationRef = collection(firestore, 'users', user.uid, 'notifications');
            await addDoc(notificationRef, {
                title: `Leave Request ${status}`,
                description: `A leave request has been ${status.toLowerCase()}.`,
                type: 'system',
                read: false,
                link: '/business/leave-management',
                createdAt: serverTimestamp(),
            });

            if (targetEmployeeUserId && targetEmployeeUserId !== user.uid) {
                const employeeNotificationRef = collection(firestore, 'users', targetEmployeeUserId, 'notifications');
                await addDoc(employeeNotificationRef, {
                    title: `Your leave request was ${status.toLowerCase()}`,
                    description: `${request.leaveType} request (${request.startDate} to ${request.endDate}) has been ${status.toLowerCase()}.`,
                    type: 'system',
                    read: false,
                    link: '/individual/dashboard',
                    createdAt: serverTimestamp(),
                });
            }

            toast({ title: t('toast.updateSuccess', { status: status }) });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error?.message || t('toast.updateError'),
                variant: "destructive"
            });
        }
    };
    
    const pendingCount = leaveRequests.filter(r => r.status === 'Pending').length;
    const approvedCount = leaveRequests.filter(r => r.status === 'Approved').length;
    const rejectedCount = leaveRequests.filter(r => r.status === 'Rejected').length;

  return (
    <>
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>

       <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1">
                <CardTitle>{t('cardTitle')}</CardTitle>
                <CardDescription>
                    {t('cardDescription')}
                </CardDescription>
            </div>
            <Button onClick={() => setIsFormOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                {t('newRequest')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
            <Tabs defaultValue="pending">
                <TabsList className="grid w-full grid-cols-4 max-w-lg">
                    <TabsTrigger value="pending">{t('tabs.pending')} {pendingCount > 0 && `(${pendingCount})`}</TabsTrigger>
                    <TabsTrigger value="approved">{t('tabs.approved')} {approvedCount > 0 && `(${approvedCount})`}</TabsTrigger>
                    <TabsTrigger value="rejected">{t('tabs.rejected')} {rejectedCount > 0 && `(${rejectedCount})`}</TabsTrigger>
                    <TabsTrigger value="all">{t('tabs.all')} ({leaveRequests.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="pending" className="mt-4">
                    <LeaveRequestTable requests={leaveRequests.filter(r => r.status === 'Pending')} onUpdateRequest={handleUpdateRequest} isLoading={isLoading} />
                </TabsContent>
                 <TabsContent value="approved" className="mt-4">
                    <LeaveRequestTable requests={leaveRequests.filter(r => r.status === 'Approved')} onUpdateRequest={handleUpdateRequest} isLoading={isLoading} />
                </TabsContent>
                 <TabsContent value="rejected" className="mt-4">
                    <LeaveRequestTable requests={leaveRequests.filter(r => r.status === 'Rejected')} onUpdateRequest={handleUpdateRequest} isLoading={isLoading} />
                </TabsContent>
                 <TabsContent value="all" className="mt-4">
                    <LeaveRequestTable requests={leaveRequests} onUpdateRequest={handleUpdateRequest} isLoading={isLoading} />
                </TabsContent>
            </Tabs>
        </CardContent>
      </Card>
    </div>
    <LeaveRequestForm 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)}
        employees={employees} 
        companyId={companyId}
    />
    </>
  );
}




function LeaveRequestForm({ isOpen, onClose, employees, companyId }: { isOpen: boolean, onClose: () => void, employees: Employee[], companyId: string | null }) {
    const form = useForm<LeaveRequestFormValues>({
        resolver: zodResolver(leaveRequestSchema),
        defaultValues: {
            employeeId: undefined,
            leaveType: undefined,
            startDate: '',
            endDate: '',
            reason: '',
        }
    });
    const { user } = useFirebase();
    const { toast } = useToast();
    const t = useTranslations('LeaveManagement.dialog');
    const [isLoading, setIsLoading] = useState(false);

    const leaveRequestSchema = z.object({
        employeeId: z.string().min(1, () => t('errors.employeeRequired')),
        leaveType: z.string().min(1, () => t('errors.leaveTypeRequired')),
        startDate: z.string().min(1, () => t('errors.startDateRequired')),
        endDate: z.string().min(1, () => t('errors.endDateRequired')),
        reason: z.string().optional(),
    }).refine(data => new Date(data.endDate) >= new Date(data.startDate), {
        message: () => t('errors.endDateBeforeStart'),
        path: ['endDate'],
    });

    type LeaveRequestFormValues = z.infer<typeof leaveRequestSchema>;

    const onSubmit = async (values: LeaveRequestFormValues) => {
        if (!companyId || !user) return;
        setIsLoading(true);

        const start = new Date(values.startDate);
        const end = new Date(values.endDate);
        const diffDays = differenceInDays(end, start) + 1;

        const selectedEmployee = employees.find(e => e.id === values.employeeId);
        if (!selectedEmployee) {
            toast({ title: 'Error', description: t('toast.employeeNotFound'), variant: 'destructive' });
            setIsLoading(false);
            return;
        }

        try {
            await addDoc(collection(firestore, 'companies', companyId, 'leave_requests'), {
                employeeId: values.employeeId,
                employeeName: selectedEmployee.name,
                employeeAvatar: selectedEmployee.avatar,
                leaveType: values.leaveType,
                startDate: values.startDate,
                endDate: values.endDate,
                days: diffDays,
                reason: values.reason || '',
                status: 'Pending',
                requestedAt: serverTimestamp(),
                requesterUserId: user.uid,
            });
            toast({ title: t('toast.submitSuccess') });
            onClose();
            form.reset();
        } catch (error) {
            toast({ title: 'Error', description: t('toast.submitError'), variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }
    
    useEffect(() => {
        if (!isOpen) {
            form.reset();
        }
    }, [isOpen, form]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('title')}</DialogTitle>
                    <DialogDescription>{t('description')}</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="employeeId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('employeeLabel')}</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('employeePlaceholder')} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {employees.map(employee => (
                                                <SelectItem key={employee.id} value={employee.id}>{employee.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="leaveType"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('leaveTypeLabel')}</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('leaveTypePlaceholder')} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Vacation">{t('leaveTypes.vacation')}</SelectItem>
                                            <SelectItem value="Sick Leave">{t('leaveTypes.sick')}</SelectItem>
                                            <SelectItem value="Parental Leave">{t('leaveTypes.parental')}</SelectItem>
                                            <SelectItem value="Unpaid Leave">{t('leaveTypes.unpaid')}</SelectItem>
                                            <SelectItem value="Other">{t('leaveTypes.other')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="startDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('startDateLabel')}</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="endDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('endDateLabel')}</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="reason"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('reasonLabel')}</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder={t('reasonPlaceholder')} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="ghost">{t('cancel')}</Button>
                            </DialogClose>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>{t('submitting')}</> : t('submit')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
