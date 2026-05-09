'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { format, isBefore, startOfDay } from 'date-fns';
import { firestore } from '@/firebase/config';
import { useFirebase } from '@/firebase/firebase-provider';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarClock, Plus, Trash2 } from 'lucide-react';

type PersonalDeadline = {
  id: string;
  title: string;
  note?: string;
  dueDate: string;
  done: boolean;
  createdAt?: { seconds: number; nanoseconds: number };
};

type UserOrder = {
  id: string;
  serviceTitle?: string;
  status?: string;
  createdAt?: { seconds: number; nanoseconds: number };
};

export default function IndividualDeadlinesPage() {
  const { user } = useFirebase();
  const { toast } = useToast();
  const t = useTranslations('DeadlinesPage');

  const [deadlines, setDeadlines] = useState<PersonalDeadline[]>([]);
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const deadlinesQuery = query(
      collection(firestore, 'users', user.uid, 'deadlines'),
      orderBy('dueDate', 'asc')
    );
    const ordersQuery = query(
      collection(firestore, 'users', user.uid, 'orders'),
      orderBy('createdAt', 'desc')
    );

    const unsubDeadlines = onSnapshot(
      deadlinesQuery,
      (snapshot) => {
        setDeadlines(
          snapshot.docs.map((row) => ({
            id: row.id,
            ...(row.data() as Omit<PersonalDeadline, 'id'>),
          }))
        );
        setLoading(false);
      },
      () => {
        setLoading(false);
        toast({ title: t('toasts.errorTitle'), description: t('toasts.loadDeadlinesFailed'), variant: 'destructive' });
      }
    );

    const unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
      setOrders(
        snapshot.docs.map((row) => ({
          id: row.id,
          ...(row.data() as Omit<UserOrder, 'id'>),
        }))
      );
    });

    return () => {
      unsubDeadlines();
      unsubOrders();
    };
  }, [toast, user]);

  const derivedOrderDeadlines = useMemo(() => {
    return orders
      .filter((order) => order.status === 'pending_payment' || order.status === 'invoice_sent' || order.status === 'quote_requested')
      .slice(0, 10)
      .map((order) => {
        const created = order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000) : new Date();
        const target = new Date(created);
        target.setDate(target.getDate() + 7);

        return {
          id: order.id,
          title: `${order.serviceTitle ?? t('systemFallback.serviceOrder')} (${order.status?.replace('_', ' ') ?? t('systemFallback.pending')})`,
          dueDate: target,
        };
      });
  }, [orders]);

  const createDeadline = async () => {
    if (!user) return;
    if (!title.trim() || !dueDate) {
      toast({ title: t('toasts.missingFieldsTitle'), description: t('toasts.missingFieldsDescription'), variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(firestore, 'users', user.uid, 'deadlines'), {
        title: title.trim(),
        note: note.trim(),
        dueDate,
        done: false,
        createdAt: serverTimestamp(),
      });
      setTitle('');
      setNote('');
      setDueDate('');
    } catch {
      toast({ title: t('toasts.createFailedTitle'), description: t('toasts.createFailedDescription'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleDone = async (item: PersonalDeadline) => {
    if (!user) return;
    try {
      await updateDoc(doc(firestore, 'users', user.uid, 'deadlines', item.id), {
        done: !item.done,
      });
    } catch {
      toast({ title: t('toasts.updateFailedTitle'), description: t('toasts.updateFailedDescription'), variant: 'destructive' });
    }
  };

  const removeDeadline = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(firestore, 'users', user.uid, 'deadlines', id));
    } catch {
      toast({ title: t('toasts.deleteFailedTitle'), description: t('toasts.deleteFailedDescription'), variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {t('addDeadline.title')}
          </CardTitle>
          <CardDescription>{t('addDeadline.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="deadline-title">{t('form.titleLabel')}</Label>
              <Input
                id="deadline-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={t('form.titlePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline-date">{t('form.dueDateLabel')}</Label>
              <Input id="deadline-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="deadline-note">{t('form.noteLabel')}</Label>
            <Textarea
              id="deadline-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t('form.notePlaceholder')}
            />
          </div>
          <Button onClick={createDeadline} disabled={saving}>
            {saving ? t('form.saving') : t('form.submit')}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              {t('myDeadlines.title')}
            </CardTitle>
            <CardDescription>{loading ? t('myDeadlines.loading') : t('myDeadlines.count', { count: deadlines.length })}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!loading && deadlines.length === 0 && (
              <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">{t('myDeadlines.empty')}</div>
            )}

            {deadlines.map((item) => {
              const due = startOfDay(new Date(item.dueDate));
              const isLate = !item.done && isBefore(due, startOfDay(new Date()));
              return (
                <div key={item.id} className="rounded-lg border p-3">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <Checkbox checked={item.done} onCheckedChange={() => toggleDone(item)} />
                      <div>
                        <p className={item.done ? 'line-through text-muted-foreground' : 'font-medium'}>{item.title}</p>
                        <p className="text-xs text-muted-foreground">{t('myDeadlines.dueDate', { date: format(new Date(item.dueDate), 'dd MMM yyyy') })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isLate && <Badge variant="destructive">{t('badges.overdue')}</Badge>}
                      {item.done && <Badge variant="secondary">{t('badges.done')}</Badge>}
                      <Button variant="ghost" size="icon" onClick={() => removeDeadline(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {item.note ? <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.note}</p> : null}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('systemFollowUps.title')}</CardTitle>
            <CardDescription>{t('systemFollowUps.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {derivedOrderDeadlines.length === 0 && (
              <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">{t('systemFollowUps.empty')}</div>
            )}
            {derivedOrderDeadlines.map((item) => (
              <div key={item.id} className="rounded-lg border p-3">
                <p className="font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{t('systemFollowUps.suggestedBy', { date: format(item.dueDate, 'dd MMM yyyy') })}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
