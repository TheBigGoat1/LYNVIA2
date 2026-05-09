'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, MoreHorizontal, Check, Clock, AlertTriangle, Building2, Filter, Calendar, Loader2, CheckCircle2 } from "lucide-react";
import { firestore } from '@/firebase/config';
import { useFirebase } from '@/firebase/firebase-provider';
import { useToast } from '@/hooks/use-toast';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, query, where, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useLocale, useTranslations } from 'next-intl';

type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
type TaskStatus = 'pending' | 'in-progress' | 'completed';

type Task = {
  id: string;
  title: string;
  description: string;
  companyId: string;
  companyName: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  createdAt: Date;
  completedAt?: Date;
  assignedBy: string;
};

type ClientCompany = {
  id: string;
  name: string;
};
const getPriorityBadge = (priority: TaskPriority, t: (key: string) => string) => {
  const variants: Record<TaskPriority, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
    low: { variant: 'outline', label: t('lowPriority') },
    medium: { variant: 'secondary', label: t('mediumPriority') },
    high: { variant: 'default', label: t('highPriority') },
    urgent: { variant: 'destructive', label: t('urgentPriority') },
  };
  return variants[priority];
};

const getStatusBadge = (status: TaskStatus, t: (key: string) => string) => {
  const variants: Record<TaskStatus, { variant: 'default' | 'secondary' | 'outline'; label: string; icon: React.ReactNode }> = {
    pending: { variant: 'secondary', label: t('pendingStatus'), icon: <Clock className="h-3 w-3 mr-1" /> },
    'in-progress': { variant: 'default', label: t('inProgressStatus'), icon: <AlertTriangle className="h-3 w-3 mr-1" /> },
    completed: { variant: 'outline', label: t('completedStatus'), icon: <Check className="h-3 w-3 mr-1" /> },
  };
  return variants[status];
};

const getDueDateBadge = (dueDate: string, t: (key: string) => string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { variant: 'destructive' as const, label: t('overdue') };
  if (diffDays === 0) return { variant: 'default' as const, label: t('dueToday') };
  if (diffDays <= 3) return { variant: 'secondary' as const, label: t('dueSoon') };
  return null;
};

export default function AccountingFirmTasksPage() {
  const locale = useLocale();
  const t = useTranslations('AccountingTasks');
  const { user, userProfile } = useFirebase();
  const { toast } = useToast();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<ClientCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // New task form state
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    companyId: '',
    priority: 'medium' as TaskPriority,
    dueDate: '',
  });
  const [saving, setSaving] = useState(false);

  // Load clients and tasks
  useEffect(() => {
    if (!user || !userProfile?.accountingFirmId) return;

    const loadData = async () => {
      try {
        setLoading(true);

        // Load client companies assigned to this firm
        const companiesQuery = query(
          collection(firestore, 'companies'),
          where('accountingFirmId', '==', userProfile.accountingFirmId)
        );
        const companiesSnap = await getDocs(companiesQuery);
        const clientsData: ClientCompany[] = companiesSnap.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || 'Unnamed Company',
        }));
        setClients(clientsData);

        // Load tasks for these clients
        const clientIds = clientsData.map(c => c.id);
        if (clientIds.length > 0) {
          const tasksQuery = query(
            collection(firestore, 'accounting_firm_tasks'),
            where('firmId', '==', userProfile.accountingFirmId),
            orderBy('createdAt', 'desc')
          );
          const tasksSnap = await getDocs(tasksQuery);
          const tasksData: Task[] = tasksSnap.docs.map(doc => {
            const data = doc.data();
            const client = clientsData.find(c => c.id === data.companyId);
            return {
              id: doc.id,
              title: data.title || '',
              description: data.description || '',
              companyId: data.companyId || '',
              companyName: client?.name || 'Unknown',
              priority: data.priority || 'medium',
              status: data.status || 'pending',
              dueDate: data.dueDate || '',
              createdAt: data.createdAt?.toDate() || new Date(),
              completedAt: data.completedAt?.toDate(),
              assignedBy: data.assignedBy || '',
            };
          });
          setTasks(tasksData);
        } else {
          setTasks([]);
        }
      } catch (error) {
        console.error('Error loading tasks:', error);
        toast({ title: t('error'), description: t('errorLoading'), variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, userProfile, toast, t]);

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.companyName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesClient = clientFilter === 'all' || task.companyId === clientFilter;
    return matchesSearch && matchesStatus && matchesClient;
  });

  // Create new task
  const handleCreateTask = async () => {
    if (!newTask.title || !newTask.companyId || !newTask.dueDate) return;
    if (!userProfile?.accountingFirmId) return;

    setSaving(true);
    try {
      const client = clients.find(c => c.id === newTask.companyId);
      const taskDoc = await addDoc(collection(firestore, 'accounting_firm_tasks'), {
        ...newTask,
        firmId: userProfile.accountingFirmId,
        companyName: client?.name || 'Unknown',
        status: 'pending',
        assignedBy: user?.uid || '',
        createdAt: serverTimestamp(),
      });

      const createdTask: Task = {
        id: taskDoc.id,
        ...newTask,
        companyName: client?.name || 'Unknown',
        status: 'pending',
        createdAt: new Date(),
        assignedBy: user?.uid || '',
      };
      setTasks(prev => [createdTask, ...prev]);
      setAddDialogOpen(false);
      setNewTask({ title: '', description: '', companyId: '', priority: 'medium', dueDate: '' });
      toast({ title: t('taskCreated'), description: t('taskCreatedDesc') });
    } catch (error) {
      console.error('Error creating task:', error);
      toast({ title: t('error'), description: t('errorCreating'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Update task status
  const handleUpdateStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const updateData: Record<string, unknown> = { status: newStatus };
      if (newStatus === 'completed') {
        updateData.completedAt = serverTimestamp();
      }
      await updateDoc(doc(firestore, 'accounting_firm_tasks', taskId), updateData);
      setTasks(prev => prev.map(task =>
        task.id === taskId
          ? { ...task, status: newStatus, completedAt: newStatus === 'completed' ? new Date() : task.completedAt }
          : task
      ));
      toast({ title: t('taskUpdated'), description: t('taskUpdatedDesc') });
    } catch (error) {
      console.error('Error updating task:', error);
      toast({ title: t('error'), description: t('errorCreating'), variant: 'destructive' });
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('pageTitle')}</h1>
          <p className="text-muted-foreground">{t('pageSubtitle')}</p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t('addTask')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{t('addTask')}</DialogTitle>
              <DialogDescription>{t('addTaskDesc')}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="task-title">{t.title}</Label>
                <Input
                  id="task-title"
                  value={newTask.title}
                  onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                  placeholder={t.title}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="task-description">{t.description}</Label>
                <Textarea
                  id="task-description"
                  value={newTask.description}
                  onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={t.description}
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="task-client">{t('client')}</Label>
                <Select
                  value={newTask.companyId}
                  onValueChange={(value) => setNewTask(prev => ({ ...prev, companyId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectClient')} />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {client.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="task-priority">{t.priority}</Label>
                  <Select
                    value={newTask.priority}
                    onValueChange={(value) => setNewTask(prev => ({ ...prev, priority: value as TaskPriority }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectPriority')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t('lowPriority')}</SelectItem>
                      <SelectItem value="medium">{t('mediumPriority')}</SelectItem>
                      <SelectItem value="high">{t('highPriority')}</SelectItem>
                      <SelectItem value="urgent">{t('urgentPriority')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="task-due">{t.dueDate}</Label>
                  <Input
                    id="task-due"
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                {t('cancel')}
              </Button>
              <Button onClick={handleCreateTask} disabled={saving || !newTask.title || !newTask.companyId || !newTask.dueDate}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t('taskHub')}</CardTitle>
          <CardDescription>{t('taskHubDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder={t('filterByClient')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allClients')}</SelectItem>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | TaskStatus)}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">{t('all')}</TabsTrigger>
              <TabsTrigger value="pending">{t('pending')}</TabsTrigger>
              <TabsTrigger value="in-progress">{t('inProgress')}</TabsTrigger>
              <TabsTrigger value="completed">{t('completed')}</TabsTrigger>
            </TabsList>

            <TabsContent value={statusFilter} className="mt-0">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">{t('loading')}</span>
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">{t('noTasks')}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('title')}</TableHead>
                      <TableHead>{t('client')}</TableHead>
                      <TableHead>{t('priority')}</TableHead>
                      <TableHead>{t('status')}</TableHead>
                      <TableHead>{t('dueDate')}</TableHead>
                      <TableHead className="text-right">{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.map((task) => {
                      const priorityBadge = getPriorityBadge(task.priority, t);
                      const statusBadge = getStatusBadge(task.status, t);
                      const dueBadge = task.status !== 'completed' ? getDueDateBadge(task.dueDate, t) : null;

                      return (
                        <TableRow key={task.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{task.title}</div>
                              {task.description && (
                                <div className="text-sm text-muted-foreground line-clamp-1">
                                  {task.description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              {task.companyName}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={priorityBadge.variant}>{priorityBadge.label}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusBadge.variant} className="flex items-center w-fit">
                              {statusBadge.icon}
                              {statusBadge.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">{new Date(task.dueDate).toLocaleDateString(locale)}</span>
                              </div>
                              {dueBadge && (
                                <Badge variant={dueBadge.variant} className="text-xs w-fit">
                                  {dueBadge.label}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {task.status !== 'completed' && (
                                  <>
                                    {task.status === 'pending' && (
                                      <DropdownMenuItem onClick={() => handleUpdateStatus(task.id, 'in-progress')}>
                                        <AlertTriangle className="mr-2 h-4 w-4" />
                                        {t('markInProgress')}
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={() => handleUpdateStatus(task.id, 'completed')}>
                                      <CheckCircle2 className="mr-2 h-4 w-4" />
                                      {t('markComplete')}
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {task.status === 'completed' && (
                                  <DropdownMenuItem onClick={() => handleUpdateStatus(task.id, 'pending')}>
                                    <Clock className="mr-2 h-4 w-4" />
                                    {t('pendingStatus')}
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
