
'use client';

import { useState, useEffect, useMemo } from 'react';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Search, CheckCircle, Clock, DollarSign, Eye, MessageSquare, Send, Loader2, FileText, User, Calendar, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { auth, firestore } from '@/firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from 'next-intl';

type OrderStatus = "quote_requested" | "invoice_sent" | "paid" | "in_progress" | "pending_review" | "completed" | "cancelled" | "pending_payment";

type Order = {
  id: string;
  path: string;
  userId: string;
  userName: string;
  userEmail: string;
  serviceTitle: string;
  serviceDescription?: string;
  status: OrderStatus;
  createdAt: { seconds: number; nanoseconds: number };
  priceAmount: number;
  notes?: string;
};

const getStatusBadgeVariant = (status: OrderStatus): "default" | "secondary" | "outline" | "destructive" => {
  switch (status) {
    case "completed":
      return "default";
    case "paid":
    case "in_progress":
    case "pending_review":
      return "secondary";
    case "quote_requested":
    case "invoice_sent":
    case "pending_payment":
      return "outline";
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
};

const OrderTable = ({ 
    orders, 
    isLoading, 
    onUpdateStatus, 
    onViewOrder,
    noOrdersMessage 
}: { 
    orders: Order[], 
    isLoading: boolean, 
    onUpdateStatus: (path: string, status: OrderStatus) => void, 
    onViewOrder: (order: Order) => void,
    noOrdersMessage: string 
}) => {
    const t = useTranslations('OrderManagement');

    return (
        <Table>
            <TableHeader>
                <TableRow>
                <TableHead>{t('table.service')}</TableHead>
                <TableHead>{t('table.customer')}</TableHead>
                <TableHead>{t('table.date')}</TableHead>
                <TableHead>{t('table.status')}</TableHead>
                <TableHead className="text-right">{t('table.actions')}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading && Array.from({length: 5}).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                ))}
                {!isLoading && orders.map((order) => (
                <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.serviceTitle}</TableCell>
                    <TableCell>
                        <div>{order.userName}</div>
                        <div className="text-xs text-muted-foreground">{order.userEmail}</div>
                    </TableCell>
                    <TableCell>{order.createdAt ? format(new Date(order.createdAt.seconds * 1000), 'dd MMM yyyy') : 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(order.status)}>
                        {t(`status.${order.status}` as any)}
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
                            <DropdownMenuItem onClick={() => onViewOrder(order)}>
                                <Eye className="mr-2 h-4 w-4" />
                                {t('actions.view')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onUpdateStatus(order.path, 'paid')}>
                                <DollarSign className="mr-2 h-4 w-4" />
                                {t('actions.markPaid')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onUpdateStatus(order.path, 'in_progress')}>
                                <Clock className="mr-2 h-4 w-4" />
                                {t('actions.markInProgress')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onUpdateStatus(order.path, 'completed')}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                {t('actions.markCompleted')}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    </TableCell>
                </TableRow>
                ))}
                {!isLoading && orders.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">{noOrdersMessage}</TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
};

export default function OrderManagementPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();

    // Order detail dialog state
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [orderDialogOpen, setOrderDialogOpen] = useState(false);

    // Ask a question dialog state
    const [askQuestionDialogOpen, setAskQuestionDialogOpen] = useState(false);
    const [questionSubject, setQuestionSubject] = useState('');
    const [questionMessage, setQuestionMessage] = useState('');
    const [isSendingQuestion, setIsSendingQuestion] = useState(false);
    const t = useTranslations('OrderManagement');

    useEffect(() => {
        const fetchOrders = async () => {
          try {
            setIsLoading(true);
            const currentUser = auth.currentUser;
            if (!currentUser) {
              throw new Error('Not authenticated');
            }

            const idToken = await currentUser.getIdToken();
            const response = await fetch('/api/admin/orders', {
              headers: {
                Authorization: `Bearer ${idToken}`,
              },
            });

            const payload = await response.json();
            if (!response.ok) {
              throw new Error(payload?.error || 'Failed to fetch orders');
            }

            setOrders((payload.orders || []) as Order[]);
          } catch (error) {
            console.error('Error fetching orders:', error);
            toast({ title: 'Error', description: t('toast.fetchError'), variant: 'destructive' });
          } finally {
            setIsLoading(false);
          }
        };

        fetchOrders();
    }, [toast, t]);
    
    const handleUpdateStatus = async (path: string, status: OrderStatus) => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
              throw new Error('Not authenticated');
            }

            const idToken = await currentUser.getIdToken();
            const response = await fetch('/api/admin/orders', {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${idToken}`,
              },
              body: JSON.stringify({ path, status }),
            });

            const payload = await response.json();
            if (!response.ok) {
              throw new Error(payload?.error || 'Failed to update order status');
            }

            setOrders((prev) =>
              prev.map((o) =>
                o.path === path ? { ...o, status } : o
              )
            );
            toast({ title: t('toast.updateSuccess') });
        } catch (error) {
            console.error("Error updating order status: ", error);
            toast({ title: "Update Failed", description: t('toast.updateError'), variant: "destructive" });
        }
    };

    // Handle viewing an order
    const handleViewOrder = (order: Order) => {
        setSelectedOrder(order);
        setOrderDialogOpen(true);
    };

    // Handle opening the ask question dialog
    const handleOpenAskQuestion = () => {
        setQuestionSubject('');
        setQuestionMessage('');
        setAskQuestionDialogOpen(true);
    };

    // Handle sending a question to the client
    const handleSendQuestion = async () => {
        if (!selectedOrder || !questionMessage.trim()) return;

        setIsSendingQuestion(true);
        try {
            // Send notification to the user
            await addDoc(collection(firestore, 'users', selectedOrder.userId, 'notifications'), {
                title: questionSubject.trim() || `Question about your order: ${selectedOrder.serviceTitle}`,
                description: questionMessage.trim(),
                type: 'order_question',
                read: false,
                link: '/my-orders',
                orderId: selectedOrder.id,
                orderPath: selectedOrder.path,
                serviceTitle: selectedOrder.serviceTitle,
                createdAt: serverTimestamp(),
            });

            // Also store message in the order's messages subcollection for tracking
            await addDoc(collection(firestore, 'users', selectedOrder.userId, 'orders', selectedOrder.id, 'messages'), {
                from: 'admin',
                subject: questionSubject.trim() || `Question about: ${selectedOrder.serviceTitle}`,
                message: questionMessage.trim(),
                createdAt: serverTimestamp(),
            });

            toast({ title: t('toast.questionSent') ?? 'Question sent', description: t('toast.questionSentDescription') ?? 'The client has been notified.' });
            setAskQuestionDialogOpen(false);
            setQuestionSubject('');
            setQuestionMessage('');
        } catch (error) {
            console.error("Error sending question:", error);
            toast({ title: "Error", description: t('toast.questionError') ?? "Could not send the question.", variant: "destructive" });
        } finally {
            setIsSendingQuestion(false);
        }
    };
    
    const filteredOrders = useMemo(() => orders.filter(c => 
        c.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.serviceTitle.toLowerCase().includes(searchTerm.toLowerCase())
    ), [orders, searchTerm]);

    const filterByStatus = (status: OrderStatus) => {
        return filteredOrders.filter(o => o.status === status);
    }

  return (
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
              <div className="relative flex-grow sm:flex-grow-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder={t('searchPlaceholder')} className="pl-9 w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
          </div>
        </CardHeader>
        <CardContent>
           <Tabs defaultValue="all">
                <TabsList className="grid w-full grid-cols-5 max-w-2xl">
                    <TabsTrigger value="all">{t('tabs.all')}</TabsTrigger>
                    <TabsTrigger value="quote_requested">{t('tabs.quote_requested')}</TabsTrigger>
                    <TabsTrigger value="paid">{t('tabs.paid')}</TabsTrigger>
                    <TabsTrigger value="in_progress">{t('tabs.in_progress')}</TabsTrigger>
                    <TabsTrigger value="completed">{t('tabs.completed')}</TabsTrigger>
                </TabsList>
                <TabsContent value="all" className="mt-4">
                   <OrderTable orders={filteredOrders} isLoading={isLoading} onUpdateStatus={handleUpdateStatus} onViewOrder={handleViewOrder} noOrdersMessage={searchTerm ? t('noMatch') : t('noOrders')} />
                </TabsContent>
                <TabsContent value="quote_requested" className="mt-4">
                    <OrderTable orders={filterByStatus('quote_requested')} isLoading={isLoading} onUpdateStatus={handleUpdateStatus} onViewOrder={handleViewOrder} noOrdersMessage={t('noOrders')} />
                </TabsContent>
                <TabsContent value="paid" className="mt-4">
                    <OrderTable orders={filterByStatus('paid')} isLoading={isLoading} onUpdateStatus={handleUpdateStatus} onViewOrder={handleViewOrder} noOrdersMessage={t('noOrders')} />
                </TabsContent>
                 <TabsContent value="in_progress" className="mt-4">
                    <OrderTable orders={filterByStatus('in_progress')} isLoading={isLoading} onUpdateStatus={handleUpdateStatus} onViewOrder={handleViewOrder} noOrdersMessage={t('noOrders')} />
                </TabsContent>
                 <TabsContent value="completed" className="mt-4">
                    <OrderTable orders={filterByStatus('completed')} isLoading={isLoading} onUpdateStatus={handleUpdateStatus} onViewOrder={handleViewOrder} noOrdersMessage={t('noOrders')} />
                </TabsContent>
            </Tabs>
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Details
            </DialogTitle>
            <DialogDescription>
              View order information and communicate with the client.
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              {/* Service info */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Service</div>
                    <div className="font-semibold">{selectedOrder.serviceTitle}</div>
                    {selectedOrder.serviceDescription && (
                      <div className="text-sm text-muted-foreground mt-1">{selectedOrder.serviceDescription}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Customer</div>
                    <div className="font-semibold">{selectedOrder.userName}</div>
                    <div className="text-sm text-muted-foreground">{selectedOrder.userEmail}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Date</div>
                    <div>{selectedOrder.createdAt ? format(new Date(selectedOrder.createdAt.seconds * 1000), 'dd MMM yyyy, HH:mm') : 'N/A'}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Status</div>
                    <Badge variant={getStatusBadgeVariant(selectedOrder.status)} className="mt-1">
                      {t(`status.${selectedOrder.status}` as any)}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-muted-foreground">Amount</div>
                    <div className="font-semibold text-lg">
                      {selectedOrder.priceAmount > 0 ? `CHF ${selectedOrder.priceAmount.toLocaleString()}` : '—'}
                    </div>
                  </div>
                </div>

                {selectedOrder.notes && (
                  <div className="pt-2 border-t">
                    <div className="text-sm font-medium text-muted-foreground mb-1">Notes</div>
                    <div className="text-sm bg-muted p-3 rounded-lg">{selectedOrder.notes}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setOrderDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={handleOpenAskQuestion}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Ask a question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ask a Question Dialog */}
      <Dialog open={askQuestionDialogOpen} onOpenChange={setAskQuestionDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Ask a question
            </DialogTitle>
            <DialogDescription>
              Send a question or document request to <span className="font-medium">{selectedOrder?.userName}</span> regarding their order: <span className="font-medium">{selectedOrder?.serviceTitle}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="question-subject">Subject (optional)</Label>
              <Input
                id="question-subject"
                placeholder={`Question about: ${selectedOrder?.serviceTitle ?? 'order'}`}
                value={questionSubject}
                onChange={(e) => setQuestionSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="question-message">Message *</Label>
              <Textarea
                id="question-message"
                placeholder="e.g., We need the following documents to proceed with your tax return: last 3 salary slips, 2025 pension certificate..."
                className="min-h-[150px]"
                value={questionMessage}
                onChange={(e) => setQuestionMessage(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAskQuestionDialogOpen(false)} disabled={isSendingQuestion}>
              Cancel
            </Button>
            <Button onClick={handleSendQuestion} disabled={isSendingQuestion || !questionMessage.trim()}>
              {isSendingQuestion ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send to client
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
