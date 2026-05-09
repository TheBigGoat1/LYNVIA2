'use client';

import { useEffect, useRef, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { format } from 'date-fns';
import { firestore, storage } from '@/firebase/config';
import { useFirebase } from '@/firebase/firebase-provider';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';
import { notifyAdmin } from '@/lib/admin-notifications';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  MessageCircle,
  Plus,
  ArrowLeft,
  Send,
  Paperclip,
  Download,
  X,
  CheckCircle2,
  Clock,
  Loader2,
  FileText,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ThreadStatus = 'open' | 'closed';

type CommThread = {
  id: string;
  subject: string;
  status: ThreadStatus;
  createdAt?: { seconds: number };
  lastMessageAt?: { seconds: number };
  createdByUid: string;
  createdByName: string;
  unreadAdmin?: boolean;
};

type Attachment = {
  name: string;
  url: string;
  contentType: string;
  size?: number;
};

type CommMessage = {
  id: string;
  text: string;
  senderUid: string;
  senderName: string;
  senderRole: 'client' | 'admin';
  createdAt?: { seconds: number };
  attachments: Attachment[];
  quickReplyType?: 'greeting' | 'working_on_it' | 'missing_documents';
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ts(seconds?: number, justNowLabel = 'Just now'): string {
  if (!seconds) return justNowLabel;
  return format(new Date(seconds * 1000), 'dd MMM yyyy HH:mm');
}

function bytesToSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BusinessCommunicationsPage() {
  const { user } = useFirebase();
  const { toast } = useToast();
  const t = useTranslations('BusinessCommunications');

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Thread list
  const [threads, setThreads] = useState<CommThread[]>([]);

  // Detail view
  const [selectedThread, setSelectedThread] = useState<CommThread | null>(null);
  const [messages, setMessages] = useState<CommMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // New communication dialog
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newSaving, setNewSaving] = useState(false);
  const newFileRef = useRef<HTMLInputElement>(null);

  // Reply
  const [replyText, setReplyText] = useState('');
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [replySending, setReplySending] = useState(false);
  const replyFileRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Load company ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    getDoc(doc(firestore, 'users', user.uid))
      .then((snap) => {
        if (snap.exists()) setCompanyId((snap.data().companyId as string | undefined) ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  // ── Subscribe to threads ──────────────────────────────────────────────────
  useEffect(() => {
    if (!companyId) return;
    const q = query(
      collection(firestore, 'companies', companyId, 'comm_threads'),
      orderBy('lastMessageAt', 'desc'),
    );
    return onSnapshot(q, (snap) => {
      setThreads(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CommThread, 'id'>) })));
    });
  }, [companyId]);

  // ── Subscribe to messages ─────────────────────────────────────────────────
  useEffect(() => {
    if (!companyId || !selectedThread) { setMessages([]); return; }
    setMessagesLoading(true);    // Mark as read by the business user
    updateDoc(doc(firestore, 'companies', companyId, 'comm_threads', selectedThread.id), {
      unreadClient: false,
    }).catch(() => {});    const q = query(
      collection(firestore, 'companies', companyId, 'comm_threads', selectedThread.id, 'messages'),
      orderBy('createdAt', 'asc'),
    );
    return onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CommMessage, 'id'>) })));
      setMessagesLoading(false);
    });
  }, [companyId, selectedThread?.id]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Upload helper ─────────────────────────────────────────────────────────
  const uploadFiles = async (files: File[], threadId: string): Promise<Attachment[]> => {
    const results: Attachment[] = [];
    for (const file of files) {
      const storageRef = ref(storage, `comm_attachments/${companyId}/${threadId}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file, { contentType: file.type });
      const url = await getDownloadURL(storageRef);
      results.push({ name: file.name, url, contentType: file.type, size: file.size });
    }
    return results;
  };

  // ── Create new thread ─────────────────────────────────────────────────────
  const handleCreateThread = async () => {
    if (!companyId || !user) return;
    if (!newSubject.trim() || !newMessage.trim()) {
      toast({ title: t('missingFields'), description: t('missingFieldsDesc'), variant: 'destructive' });
      return;
    }
    setNewSaving(true);
    try {
      const threadRef = await addDoc(collection(firestore, 'companies', companyId, 'comm_threads'), {
        subject: newSubject.trim(),
        status: 'open' as ThreadStatus,
        createdByUid: user.uid,
        createdByName: user.displayName ?? user.email ?? '',
        createdAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
        unreadAdmin: true,
      });

      const attachments = newFiles.length > 0 ? await uploadFiles(newFiles, threadRef.id) : [];

      await addDoc(
        collection(firestore, 'companies', companyId, 'comm_threads', threadRef.id, 'messages'),
        {
          text: newMessage.trim(),
          senderUid: user.uid,
          senderName: user.displayName ?? user.email ?? '',
          senderRole: 'client',
          attachments,
          createdAt: serverTimestamp(),
        },
      );

      const companySnap = await getDoc(doc(firestore, 'companies', companyId));
      const companyName = String(companySnap.data()?.companyName ?? companyId);

      await notifyAdmin({
        type: 'client_message',
        title: t('newClientMessage'),
        description: t('newClientMessageDesc', { company: companyName, subject: newSubject.trim() }),
        link: '/admin/communications',
        clientId: user.uid,
        companyId,
        companyName,
      });

      toast({ title: t('communicationSent'), description: t('communicationSentDesc') });
      setNewDialogOpen(false);
      setNewSubject('');
      setNewMessage('');
      setNewFiles([]);
    } catch (err) {
      console.error(err);
      toast({ title: t('toast.sendFailed'), description: t('toast.sendFailedDesc'), variant: 'destructive' });
    } finally {
      setNewSaving(false);
    }
  };

  // ── Reply ─────────────────────────────────────────────────────────────────
  const handleSendReply = async () => {
    if (!companyId || !user || !selectedThread) return;
    if (!replyText.trim() && replyFiles.length === 0) return;
    if (selectedThread.status === 'closed') {
      toast({ title: t('threadClosed'), description: t('threadClosedDesc'), variant: 'destructive' });
      return;
    }
    setReplySending(true);
    try {
      const attachments = replyFiles.length > 0 ? await uploadFiles(replyFiles, selectedThread.id) : [];

      await addDoc(
        collection(firestore, 'companies', companyId, 'comm_threads', selectedThread.id, 'messages'),
        {
          text: replyText.trim(),
          senderUid: user.uid,
          senderName: user.displayName ?? user.email ?? 'Client',
          senderRole: 'client',
          attachments,
          createdAt: serverTimestamp(),
        },
      );

      await updateDoc(doc(firestore, 'companies', companyId, 'comm_threads', selectedThread.id), {
        lastMessageAt: serverTimestamp(),
        unreadAdmin: true,
      });

      const companySnap = await getDoc(doc(firestore, 'companies', companyId));
      const companyName = String(companySnap.data()?.companyName ?? companyId);

      await notifyAdmin({
        type: 'client_message',
        title: t('newReplyTitle'),
        description: t('newReplyDesc', { company: companyName, subject: selectedThread.subject }),
        link: '/admin/communications',
        clientId: user.uid,
        companyId,
        companyName,
      });

      setReplyText('');
      setReplyFiles([]);
    } catch (err) {
      console.error(err);
      toast({ title: t('toast.replyFailed'), description: t('toast.replyFailedDesc'), variant: 'destructive' });
    } finally {
      setReplySending(false);
    }
  };

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  // ─── Thread Detail View ───────────────────────────────────────────────────
  if (selectedThread) {
    const isOpen = selectedThread.status === 'open';
    return (
      <div className="flex flex-col gap-4" style={{ height: 'calc(100vh - 8rem)' }}>
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setSelectedThread(null); setMessages([]); }}>
            <ArrowLeft className="mr-2 h-4 w-4" /> {t('back')}
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{selectedThread.subject}</h1>
            <p className="text-xs text-muted-foreground">
              {t('startedBy', { date: ts(selectedThread.createdAt?.seconds), name: selectedThread.createdByName })}
            </p>
          </div>
          <Badge variant={isOpen ? 'default' : 'secondary'} className="shrink-0">
            {isOpen
              ? <><Clock className="mr-1 h-3 w-3" />{t('open')}</>
              : <><CheckCircle2 className="mr-1 h-3 w-3" />{t('closed')}</>}
          </Badge>
        </div>

        {/* Messages card */}
        <Card className="flex-1 overflow-hidden flex flex-col">
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messagesLoading && (
              <div className="space-y-3">
                <Skeleton className="h-16 w-3/4" />
                <Skeleton className="h-16 w-3/4 ml-auto" />
              </div>
            )}
            {!messagesLoading && messages.map((msg) => {
              const isAdmin = msg.senderRole === 'admin';
              return (
                <div key={msg.id} className={`flex flex-col gap-1 ${isAdmin ? 'items-start' : 'items-end'}`}>
                  <div className={`flex items-center gap-2 text-xs text-muted-foreground ${isAdmin ? '' : 'flex-row-reverse'}`}>
                    <span className="font-medium">{isAdmin ? t('lynvia') : msg.senderName}</span>
                    <span>{ts(msg.createdAt?.seconds, t('justNow'))}</span>
                  </div>
                  <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                    isAdmin
                      ? 'bg-muted text-foreground rounded-tl-sm'
                      : 'bg-primary text-primary-foreground rounded-tr-sm'
                  }`}>
                    {msg.quickReplyType && (
                      <Badge variant="outline" className="mb-2 text-xs">
                        {msg.quickReplyType === 'greeting' && t('quickReplyGreeting')}
                        {msg.quickReplyType === 'working_on_it' && t('quickReplyWorking')}
                        {msg.quickReplyType === 'missing_documents' && t('quickReplyDocuments')}
                      </Badge>
                    )}
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {msg.attachments.map((att, i) => (
                          <a
                            key={i}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-1.5 text-xs underline-offset-2 hover:underline ${
                              isAdmin ? 'text-primary' : 'text-primary-foreground/80'
                            }`}
                          >
                            <Download className="h-3 w-3 shrink-0" />
                            <span className="truncate">{att.name}</span>
                            {att.size && <span className="opacity-70">({bytesToSize(att.size)})</span>}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {!messagesLoading && messages.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">{t('noMessages')}</p>
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          {/* Reply / closed footer */}
          {isOpen ? (
            <div className="border-t p-4 space-y-3">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={t('ctrlEnterSend')}
                rows={3}
                disabled={replySending}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSendReply();
                }}
              />
              {replyFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {replyFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 rounded-md border bg-muted px-2 py-1 text-xs">
                      <FileText className="h-3 w-3" />
                      <span className="max-w-[120px] truncate">{f.name}</span>
                      <button onClick={() => setReplyFiles((prev) => prev.filter((_, j) => j !== i))}>
                        <X className="h-3 w-3 hover:text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={replySending}
                  onClick={() => replyFileRef.current?.click()}
                >
                  <Paperclip className="h-4 w-4" /> {t('attachFiles')}
                </Button>
                <input
                  ref={replyFileRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => setReplyFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])])}
                />
                <Button
                  onClick={handleSendReply}
                  disabled={replySending || (!replyText.trim() && replyFiles.length === 0)}
                  className="gap-2"
                >
                  {replySending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {t('send')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="border-t p-4 text-center text-sm text-muted-foreground">
              <CheckCircle2 className="mx-auto mb-1 h-5 w-5 text-green-500" />
              {t('closedByLynvia')}
            </div>
          )}
        </Card>
      </div>
    );
  }

  // ─── Thread List View ─────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>
        <Button onClick={() => setNewDialogOpen(true)} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" /> {t('newButton')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" /> {t('yourConversations')}
          </CardTitle>
          <CardDescription>
            {threads.length === 0 ? t('noThreads') : t('count', { count: threads.length })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {threads.length === 0 && (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              <MessageCircle className="mx-auto mb-3 h-10 w-10" />
              <p className="font-medium">{t('noThreads')}</p>
              <p className="text-sm">{t('noThreadsDesc')}</p>
            </div>
          )}
          {threads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => setSelectedThread(thread)}
              className="w-full text-left rounded-lg border p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold truncate">{thread.subject}</p>
                    <Badge
                      variant={thread.status === 'open' ? 'default' : 'secondary'}
                      className="shrink-0 text-xs"
                    >
                      {thread.status === 'open' ? t('open') : t('closed')}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('lastActivity', { date: ts(thread.lastMessageAt?.seconds, t('justNow')) })}
                  </p>
                </div>
                <ArrowLeft className="h-4 w-4 rotate-180 shrink-0 text-muted-foreground mt-1" />
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* New communication dialog */}
      <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('dialog.title')}</DialogTitle>
            <DialogDescription>
              {t('dialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-subject">{t('dialog.subjectLabel')}</Label>
              <Input
                id="new-subject"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder={t('dialog.subjectPlaceholder')}
                disabled={newSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-message">{t('dialog.messageLabel')}</Label>
              <Textarea
                id="new-message"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={t('dialog.messagePlaceholder')}
                rows={4}
                disabled={newSaving}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('dialog.attachmentsLabel')}</Label>
              {newFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {newFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 rounded-md border bg-muted px-2 py-1 text-xs">
                      <FileText className="h-3 w-3" />
                      <span className="max-w-[140px] truncate">{f.name}</span>
                      <button
                        onClick={() => setNewFiles((prev) => prev.filter((_, j) => j !== i))}
                        disabled={newSaving}
                      >
                        <X className="h-3 w-3 hover:text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={newSaving}
                onClick={() => newFileRef.current?.click()}
              >
                <Paperclip className="h-4 w-4" /> {t('dialog.addFiles')}
              </Button>
              <input
                ref={newFileRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => setNewFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])])}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDialogOpen(false)} disabled={newSaving}>
              {t('dialog.cancel')}
            </Button>
            <Button
              onClick={handleCreateThread}
              disabled={newSaving || !newSubject.trim() || !newMessage.trim()}
              className="gap-2"
            >
              {newSaving
                ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('dialog.sending')}</>
                : <><Send className="h-4 w-4" /> {t('dialog.send')}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
