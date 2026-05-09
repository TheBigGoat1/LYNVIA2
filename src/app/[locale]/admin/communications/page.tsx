'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import {
  addDoc,
  collection,
  collectionGroup,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { format } from 'date-fns';
import { firestore, storage } from '@/firebase/config';
import { useFirebase } from '@/firebase/firebase-provider';
import { useToast } from '@/hooks/use-toast';
import { createUserNotification } from '@/lib/user-notifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  MessageCircle,
  ArrowLeft,
  Send,
  Paperclip,
  Download,
  X,
  CheckCircle2,
  Clock,
  Loader2,
  FileText,
  RotateCcw,
  Search,
  Building2,
} from 'lucide-react';
import { useLocale } from 'next-intl';

type SupportedLocale = 'en' | 'fr' | 'de' | 'it' | 'es';

const resolveLocale = (locale: string): SupportedLocale => {
  const normalized = locale.toLowerCase().split('-')[0];
  if (['fr', 'de', 'it', 'es'].includes(normalized)) return normalized as SupportedLocale;
  return 'en';
};

const UI_BY_LOCALE: Record<SupportedLocale, Record<string, string>> = {
  en: {
    title: 'Communications',
    subtitle: 'Manage client conversations across all companies.',
    selectCompany: 'Select a Company',
    searchPlaceholder: 'Search companies…',
    noCompanies: 'No companies found.',
    allCompanies: 'All Companies',
    allConversations: 'All conversations',
    noThreads: 'No conversations for this company.',
    back: 'Back',
    open: 'Open',
    closed: 'Closed',
    closeThread: 'Close conversation',
    reopenThread: 'Reopen',
    sendReply: 'Send',
    quickGreeting: 'Greeting',
    quickWorking: 'Working on it',
    quickMissing: 'Documents needed',
    attachFiles: 'Attach files',
    closedFooter: 'Conversation closed.',
    greetingReply: 'Hi {name}, thank you for your message. We have received your request and will get back to you shortly.',
    workingReply: 'We are currently working on your request. We will update you as soon as we have more information.',
    missingDocReply: 'The following documents are missing:\n\n',
    lynviaName: 'Lynvia',
    adminLabel: 'Lynvia (admin)',
    notifReplyTitle: 'Lynvia replied to your message',
    notifReplyDesc: 'Your conversation "{subject}" has a new reply.',
    notifClosedTitle: 'Your conversation has been closed',
    notifClosedDesc: '"{subject}" has been marked as resolved by Lynvia.',
    toastErrorTitle: 'Error',
    toastSendError: 'Could not send reply.',
    toastThreadClosed: 'Thread closed',
    toastThreadReopened: 'Thread reopened',
    toastClientNotified: 'The client has been notified.',
    toastThreadReopenedDesc: 'The conversation has been reopened.',
    toastStatusError: 'Could not update thread status.',
    noMessages: 'No messages yet.',
    quickReplyLabel: 'Quick reply:',
    replyPlaceholder: 'Type your reply… (Ctrl+Enter to send)',
    companyCol: 'Company',
    conversationsCol: 'Conversations',
    unreadCol: 'Unread',
    lastActivityCol: 'Last Activity',
    unreadTitle: 'Unread',
    lastActivityPrefix: 'Last activity:',
    justNow: 'Just now',
    companyLabel: 'Company',
  },
  fr: {
    title: 'FR: Communications',
    subtitle: 'FR: Manage client conversations across all companies.',
    selectCompany: 'FR: Select a Company',
    searchPlaceholder: 'FR: Search companies…',
    noCompanies: 'FR: No companies found.',
    allCompanies: 'FR: All Companies',
    allConversations: 'FR: All conversations',
    noThreads: 'FR: No conversations for this company.',
    back: 'FR: Back',
    open: 'FR: Open',
    closed: 'FR: Closed',
    closeThread: 'FR: Close conversation',
    reopenThread: 'FR: Reopen',
    sendReply: 'FR: Send',
    quickGreeting: 'FR: Greeting',
    quickWorking: 'FR: Working on it',
    quickMissing: 'FR: Documents needed',
    attachFiles: 'FR: Attach files',
    closedFooter: 'FR: Conversation closed.',
    greetingReply: 'FR: Hi {name}, FR: thank you for your message...',
    workingReply: 'FR: We are currently working on your request...',
    missingDocReply: 'FR: The following documents are missing:\n\n',
    lynviaName: 'Lynvia',
    adminLabel: 'FR: Lynvia (admin)',
    notifReplyTitle: 'FR: Lynvia replied to your message',
    notifReplyDesc: 'FR: Your conversation "{subject}" has a new reply.',
    notifClosedTitle: 'FR: Your conversation has been closed',
    notifClosedDesc: 'FR: "{subject}" has been marked as resolved by Lynvia.',
    toastErrorTitle: 'FR: Error',
    toastSendError: 'FR: Could not send reply.',
    toastThreadClosed: 'FR: Thread closed',
    toastThreadReopened: 'FR: Thread reopened',
    toastClientNotified: 'FR: The client has been notified.',
    toastThreadReopenedDesc: 'FR: The conversation has been reopened.',
    toastStatusError: 'FR: Could not update thread status.',
    noMessages: 'FR: No messages yet.',
    quickReplyLabel: 'FR: Quick reply:',
    replyPlaceholder: 'FR: Type your reply… (Ctrl+Enter to send)',
    companyCol: 'FR: Company',
    conversationsCol: 'FR: Conversations',
    unreadCol: 'FR: Unread',
    lastActivityCol: 'FR: Last Activity',
    unreadTitle: 'FR: Unread',
    lastActivityPrefix: 'FR: Last activity:',
    justNow: 'FR: Just now',
    companyLabel: 'FR: Company',
  },
  de: {
    title: 'DE: Communications',
    subtitle: 'DE: Manage client conversations across all companies.',
    selectCompany: 'DE: Select a Company',
    searchPlaceholder: 'DE: Search companies…',
    noCompanies: 'DE: No companies found.',
    allCompanies: 'DE: All Companies',
    allConversations: 'DE: All conversations',
    noThreads: 'DE: No conversations for this company.',
    back: 'DE: Back',
    open: 'DE: Open',
    closed: 'DE: Closed',
    closeThread: 'DE: Close conversation',
    reopenThread: 'DE: Reopen',
    sendReply: 'DE: Send',
    quickGreeting: 'DE: Greeting',
    quickWorking: 'DE: Working on it',
    quickMissing: 'DE: Documents needed',
    attachFiles: 'DE: Attach files',
    closedFooter: 'DE: Conversation closed.',
    greetingReply: 'DE: Hi {name}, DE: thank you for your message...',
    workingReply: 'DE: We are currently working on your request...',
    missingDocReply: 'DE: The following documents are missing:\n\n',
    lynviaName: 'Lynvia',
    adminLabel: 'DE: Lynvia (admin)',
    notifReplyTitle: 'DE: Lynvia replied to your message',
    notifReplyDesc: 'DE: Your conversation "{subject}" has a new reply.',
    notifClosedTitle: 'DE: Your conversation has been closed',
    notifClosedDesc: 'DE: "{subject}" has been marked as resolved by Lynvia.',
    toastErrorTitle: 'DE: Error',
    toastSendError: 'DE: Could not send reply.',
    toastThreadClosed: 'DE: Thread closed',
    toastThreadReopened: 'DE: Thread reopened',
    toastClientNotified: 'DE: The client has been notified.',
    toastThreadReopenedDesc: 'DE: The conversation has been reopened.',
    toastStatusError: 'DE: Could not update thread status.',
    noMessages: 'DE: No messages yet.',
    quickReplyLabel: 'DE: Quick reply:',
    replyPlaceholder: 'DE: Type your reply… (Ctrl+Enter to send)',
    companyCol: 'DE: Company',
    conversationsCol: 'DE: Conversations',
    unreadCol: 'DE: Unread',
    lastActivityCol: 'DE: Last Activity',
    unreadTitle: 'DE: Unread',
    lastActivityPrefix: 'DE: Last activity:',
    justNow: 'DE: Just now',
    companyLabel: 'DE: Company',
  },
  it: {
    title: 'IT: Communications',
    subtitle: 'IT: Manage client conversations across all companies.',
    selectCompany: 'IT: Select a Company',
    searchPlaceholder: 'IT: Search companies…',
    noCompanies: 'IT: No companies found.',
    allCompanies: 'IT: All Companies',
    allConversations: 'IT: All conversations',
    noThreads: 'IT: No conversations for this company.',
    back: 'IT: Back',
    open: 'IT: Open',
    closed: 'IT: Closed',
    closeThread: 'IT: Close conversation',
    reopenThread: 'IT: Reopen',
    sendReply: 'IT: Send',
    quickGreeting: 'IT: Greeting',
    quickWorking: 'IT: Working on it',
    quickMissing: 'IT: Documents needed',
    attachFiles: 'IT: Attach files',
    closedFooter: 'IT: Conversation closed.',
    greetingReply: 'IT: Hi {name}, IT: thank you for your message...',
    workingReply: 'IT: We are currently working on your request...',
    missingDocReply: 'IT: The following documents are missing:\n\n',
    lynviaName: 'Lynvia',
    adminLabel: 'IT: Lynvia (admin)',
    notifReplyTitle: 'IT: Lynvia replied to your message',
    notifReplyDesc: 'IT: Your conversation "{subject}" has a new reply.',
    notifClosedTitle: 'IT: Your conversation has been closed',
    notifClosedDesc: 'IT: "{subject}" has been marked as resolved by Lynvia.',
    toastErrorTitle: 'IT: Error',
    toastSendError: 'IT: Could not send reply.',
    toastThreadClosed: 'IT: Thread closed',
    toastThreadReopened: 'IT: Thread reopened',
    toastClientNotified: 'IT: The client has been notified.',
    toastThreadReopenedDesc: 'IT: The conversation has been reopened.',
    toastStatusError: 'IT: Could not update thread status.',
    noMessages: 'IT: No messages yet.',
    quickReplyLabel: 'IT: Quick reply:',
    replyPlaceholder: 'IT: Type your reply… (Ctrl+Enter to send)',
    companyCol: 'IT: Company',
    conversationsCol: 'IT: Conversations',
    unreadCol: 'IT: Unread',
    lastActivityCol: 'IT: Last Activity',
    unreadTitle: 'IT: Unread',
    lastActivityPrefix: 'IT: Last activity:',
    justNow: 'IT: Just now',
    companyLabel: 'IT: Company',
  },
  es: {
    title: 'ES: Communications',
    subtitle: 'ES: Manage client conversations across all companies.',
    selectCompany: 'ES: Select a Company',
    searchPlaceholder: 'ES: Search companies…',
    noCompanies: 'ES: No companies found.',
    allCompanies: 'ES: All Companies',
    allConversations: 'ES: All conversations',
    noThreads: 'ES: No conversations for this company.',
    back: 'ES: Back',
    open: 'ES: Open',
    closed: 'ES: Closed',
    closeThread: 'ES: Close conversation',
    reopenThread: 'ES: Reopen',
    sendReply: 'ES: Send',
    quickGreeting: 'ES: Greeting',
    quickWorking: 'ES: Working on it',
    quickMissing: 'ES: Documents needed',
    attachFiles: 'ES: Attach files',
    closedFooter: 'ES: Conversation closed.',
    greetingReply: 'ES: Hi {name}, ES: thank you for your message...',
    workingReply: 'ES: We are currently working on your request...',
    missingDocReply: 'ES: The following documents are missing:\n\n',
    lynviaName: 'Lynvia',
    adminLabel: 'ES: Lynvia (admin)',
    notifReplyTitle: 'ES: Lynvia replied to your message',
    notifReplyDesc: 'ES: Your conversation "{subject}" has a new reply.',
    notifClosedTitle: 'ES: Your conversation has been closed',
    notifClosedDesc: 'ES: "{subject}" has been marked as resolved by Lynvia.',
    toastErrorTitle: 'ES: Error',
    toastSendError: 'ES: Could not send reply.',
    toastThreadClosed: 'ES: Thread closed',
    toastThreadReopened: 'ES: Thread reopened',
    toastClientNotified: 'ES: The client has been notified.',
    toastThreadReopenedDesc: 'ES: The conversation has been reopened.',
    toastStatusError: 'ES: Could not update thread status.',
    noMessages: 'ES: No messages yet.',
    quickReplyLabel: 'ES: Quick reply:',
    replyPlaceholder: 'ES: Type your reply… (Ctrl+Enter to send)',
    companyCol: 'ES: Company',
    conversationsCol: 'ES: Conversations',
    unreadCol: 'ES: Unread',
    lastActivityCol: 'ES: Last Activity',
    unreadTitle: 'ES: Unread',
    lastActivityPrefix: 'ES: Last activity:',
    justNow: 'ES: Just now',
    companyLabel: 'ES: Company',
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

type ThreadStatus = 'open' | 'closed';

type Company = {
  id: string;
  companyName: string;
  threadCount: number;
  unreadCount: number;
  lastActivityAt?: number;
};

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

function ts(seconds: number | undefined, ui: Record<string, string>): string {
  if (!seconds) return ui.justNow;
  return format(new Date(seconds * 1000), 'dd MMM yyyy HH:mm');
}

function bytesToSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminCommunicationsPage() {
  const { user } = useFirebase();
  const { toast } = useToast();
  const locale = resolveLocale(useLocale());
  const ui = UI_BY_LOCALE[locale];

  const QUICK_REPLIES: Record<'greeting' | 'working_on_it' | 'missing_documents', (name: string) => string> = {
    greeting: (name) => ui.greetingReply.replace('{name}', name),
    working_on_it: () => ui.workingReply,
    missing_documents: () => ui.missingDocReply,
  };

  const [companies, setCompanies] = useState<Company[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [companySearch, setCompanySearch] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [threads, setThreads] = useState<CommThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<CommThread | null>(null);
  const [messages, setMessages] = useState<CommMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // Reply
  const [replyText, setReplyText] = useState('');
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [replySending, setReplySending] = useState(false);
  const [quickReplyType, setQuickReplyType] = useState<'greeting' | 'working_on_it' | 'missing_documents' | null>(null);
  const replyFileRef = useRef<HTMLInputElement>(null);

  // Closing
  const [closingThread, setClosingThread] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Load companies + live thread counts via collectionGroup ───────────────
  useEffect(() => {
    // 1. Subscribe to all companies
    const companyUnsub = onSnapshot(
      query(collection(firestore, 'companies'), orderBy('companyName')),
      (snap) => {
        const base = snap.docs.map((d) => ({
          id: d.id,
          companyName: String(d.data().companyName ?? d.id),
          threadCount: 0,
          unreadCount: 0,
          lastActivityAt: undefined as number | undefined,
        }));
        setCompanies(base);
        setCompaniesLoading(false);
      },
    );

    // 2. Subscribe to all comm_threads via collectionGroup to get live counts
    const threadUnsub = onSnapshot(
      collectionGroup(firestore, 'comm_threads'),
      (snap) => {
        const counts: Record<string, { total: number; unread: number; lastAt: number }> = {};
        snap.docs.forEach((d) => {
          // parent path: companies/{companyId}/comm_threads/{threadId}
          const companyId = d.ref.parent.parent?.id;
          if (!companyId) return;
          if (!counts[companyId]) counts[companyId] = { total: 0, unread: 0, lastAt: 0 };
          counts[companyId].total += 1;
          if (d.data().unreadAdmin === true) counts[companyId].unread += 1;
          const lat = d.data().lastMessageAt?.seconds ?? 0;
          if (lat > counts[companyId].lastAt) counts[companyId].lastAt = lat;
        });
        setCompanies((prev) =>
          prev.map((c) => ({
            ...c,
            threadCount: counts[c.id]?.total ?? 0,
            unreadCount: counts[c.id]?.unread ?? 0,
            lastActivityAt: counts[c.id]?.lastAt,
          }))
        );
      },
    );

    return () => {
      companyUnsub();
      threadUnsub();
    };
  }, []);

  // ── Subscribe to threads ──────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedCompanyId) { setThreads([]); return; }
    const q = query(
      collection(firestore, 'companies', selectedCompanyId, 'comm_threads'),
      orderBy('lastMessageAt', 'desc'),
    );
    return onSnapshot(q, (snap) => {
      setThreads(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CommThread, 'id'>) })));
    });
  }, [selectedCompanyId]);

  // ── Subscribe to messages ─────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedCompanyId || !selectedThread) { setMessages([]); return; }
    setMessagesLoading(true);
    // Mark as read by admin
    updateDoc(
      doc(firestore, 'companies', selectedCompanyId, 'comm_threads', selectedThread.id),
      { unreadAdmin: false },
    ).catch(() => {});
    const q = query(
      collection(
        firestore,
        'companies',
        selectedCompanyId,
        'comm_threads',
        selectedThread.id,
        'messages',
      ),
      orderBy('createdAt', 'asc'),
    );
    return onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CommMessage, 'id'>) })));
      setMessagesLoading(false);
    });
  }, [selectedCompanyId, selectedThread?.id]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Upload helper ─────────────────────────────────────────────────────────
  const uploadFiles = async (files: File[], threadId: string): Promise<Attachment[]> => {
    const results: Attachment[] = [];
    for (const file of files) {
      const storageRef = ref(storage, `comm_attachments/${selectedCompanyId}/${threadId}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file, { contentType: file.type });
      const url = await getDownloadURL(storageRef);
      results.push({ name: file.name, url, contentType: file.type, size: file.size });
    }
    return results;
  };

  // ── Send admin reply ──────────────────────────────────────────────────────
  const handleSendReply = async () => {
    if (!selectedCompanyId || !selectedThread || !user) return;
    if (!replyText.trim() && replyFiles.length === 0) return;
    setReplySending(true);
    try {
      const attachments = replyFiles.length > 0 ? await uploadFiles(replyFiles, selectedThread.id) : [];

      await addDoc(
        collection(
          firestore,
          'companies',
          selectedCompanyId,
          'comm_threads',
          selectedThread.id,
          'messages',
        ),
        {
          text: replyText.trim(),
          senderUid: user.uid,
          senderName: ui.lynviaName,
          senderRole: 'admin',
          attachments,
          quickReplyType: quickReplyType ?? undefined,
          createdAt: serverTimestamp(),
        },
      );

      await updateDoc(
        doc(firestore, 'companies', selectedCompanyId, 'comm_threads', selectedThread.id),
        { lastMessageAt: serverTimestamp(), unreadAdmin: false, unreadClient: true },
      );

      await createUserNotification(selectedThread.createdByUid, {
        type: 'system',
        title: ui.notifReplyTitle,
        description: ui.notifReplyDesc.replace('{subject}', selectedThread.subject),
        link: '/business/announcements',
      });

      setReplyText('');
      setReplyFiles([]);
      setQuickReplyType(null);
    } catch (err) {
      console.error(err);
      toast({ title: ui.toastErrorTitle, description: ui.toastSendError, variant: 'destructive' });
    } finally {
      setReplySending(false);
    }
  };

  // ── Close / reopen thread ─────────────────────────────────────────────────
  const handleToggleStatus = async () => {
    if (!selectedCompanyId || !selectedThread) return;
    setClosingThread(true);
    const newStatus: ThreadStatus = selectedThread.status === 'open' ? 'closed' : 'open';
    try {
      const updatePayload: Record<string, unknown> = { status: newStatus };
      if (newStatus === 'closed') updatePayload.closedAt = serverTimestamp();

      await updateDoc(
        doc(firestore, 'companies', selectedCompanyId, 'comm_threads', selectedThread.id),
        updatePayload,
      );

      if (newStatus === 'closed') {
        await createUserNotification(selectedThread.createdByUid, {
          type: 'system',
          title: ui.notifClosedTitle,
          description: ui.notifClosedDesc.replace('{subject}', selectedThread.subject),
          link: '/business/announcements',
        });
      }

      setSelectedThread((prev) => prev ? { ...prev, status: newStatus } : prev);
      toast({
        title: newStatus === 'closed' ? ui.toastThreadClosed : ui.toastThreadReopened,
        description: newStatus === 'closed'
          ? ui.toastClientNotified
          : ui.toastThreadReopenedDesc,
      });
    } catch (err) {
      console.error(err);
      toast({ title: ui.toastErrorTitle, description: ui.toastStatusError, variant: 'destructive' });
    } finally {
      setClosingThread(false);
    }
  };

  const applyQuickReply = (type: 'greeting' | 'working_on_it' | 'missing_documents') => {
    const companyName =
      companies.find((c) => c.id === selectedCompanyId)?.companyName ?? selectedThread?.createdByName ?? 'client';
    setQuickReplyType(type);
    setReplyText(QUICK_REPLIES[type](companyName));
  };

  // ─── Thread Detail View ───────────────────────────────────────────────────
  if (selectedCompanyId && selectedThread) {
    const isOpen = selectedThread.status === 'open';
    return (
      <div className="flex flex-col gap-4" style={{ height: 'calc(100vh - 8rem)' }}>
        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => { setSelectedThread(null); setMessages([]); }}>
            <ArrowLeft className="mr-2 h-4 w-4" /> {ui.back}
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{selectedThread.subject}</h1>
            <p className="text-xs text-muted-foreground">
              {companies.find((c) => c.id === selectedCompanyId)?.companyName} ·{' '}
              {selectedThread.createdByName} · {ts(selectedThread.createdAt?.seconds, ui)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isOpen ? 'default' : 'secondary'}>
              {isOpen ? <><Clock className="mr-1 h-3 w-3" />{ui.open}</> : <><CheckCircle2 className="mr-1 h-3 w-3" />{ui.closed}</>}
            </Badge>
            <Button
              variant={isOpen ? 'destructive' : 'outline'}
              size="sm"
              className="gap-2"
              disabled={closingThread}
              onClick={handleToggleStatus}
            >
              {closingThread
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : isOpen
                  ? <CheckCircle2 className="h-4 w-4" />
                  : <RotateCcw className="h-4 w-4" />}
              {isOpen ? ui.closeThread : ui.reopenThread}
            </Button>
          </div>
        </div>

        {/* Messages */}
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
                <div key={msg.id} className={`flex flex-col gap-1 ${isAdmin ? 'items-end' : 'items-start'}`}>
                  <div className={`flex items-center gap-2 text-xs text-muted-foreground ${isAdmin ? 'flex-row-reverse' : ''}`}>
                    <span className="font-medium">{isAdmin ? ui.adminLabel : msg.senderName}</span>
                    <span>{ts(msg.createdAt?.seconds, ui)}</span>
                  </div>
                  <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                    isAdmin
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-muted text-foreground rounded-tl-sm'
                  }`}>
                    {msg.quickReplyType && (
                      <Badge variant="outline" className="mb-2 text-xs">
                        {msg.quickReplyType === 'greeting' && ui.quickGreeting}
                        {msg.quickReplyType === 'working_on_it' && ui.quickWorking}
                        {msg.quickReplyType === 'missing_documents' && ui.quickMissing}
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
                              isAdmin ? 'text-primary-foreground/80' : 'text-primary'
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
              <p className="text-center text-muted-foreground text-sm py-8">{ui.noMessages}</p>
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          {/* Admin reply area */}
          {isOpen ? (
            <div className="border-t p-4 space-y-3">
              {/* Quick reply buttons */}
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-muted-foreground self-center">{ui.quickReplyLabel}</span>
                {(['greeting', 'working_on_it', 'missing_documents'] as const).map((type) => (
                  <Button
                    key={type}
                    variant={quickReplyType === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => applyQuickReply(type)}
                    disabled={replySending}
                    className="text-xs"
                  >
                    {type === 'greeting' && ui.quickGreeting}
                    {type === 'working_on_it' && ui.quickWorking}
                    {type === 'missing_documents' && ui.quickMissing}
                  </Button>
                ))}
              </div>

              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={ui.replyPlaceholder}
                rows={4}
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
                  <Paperclip className="h-4 w-4" /> {ui.attachFiles}
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
                  {ui.sendReply}
                </Button>
              </div>
            </div>
          ) : (
            <div className="border-t p-4 text-center text-sm text-muted-foreground">
              <CheckCircle2 className="mx-auto mb-1 h-5 w-5 text-green-500" />
              {ui.closedFooter}
            </div>
          )}
        </Card>
      </div>
    );
  }

  // ─── Filtered companies for data table ───────────────────────────────────
  const filteredCompanies = useMemo(() => {
    const search = companySearch.trim().toLowerCase();
    const list = search
      ? companies.filter((c) => c.companyName.toLowerCase().includes(search))
      : companies;
    // Sort: companies with unread first, then by last activity
    return [...list].sort((a, b) => {
      if (b.unreadCount !== a.unreadCount) return b.unreadCount - a.unreadCount;
      return (b.lastActivityAt ?? 0) - (a.lastActivityAt ?? 0);
    });
  }, [companies, companySearch]);

  // ─── Thread List View ─────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{ui.title}</h1>
        <p className="text-muted-foreground">{ui.subtitle}</p>
      </div>

      {/* Company data table */}
      {!selectedCompanyId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" /> {ui.selectCompany}
            </CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={ui.searchPlaceholder}
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {companiesLoading ? (
              <div className="space-y-2 p-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{ui.companyCol}</TableHead>
                    <TableHead className="text-center">{ui.conversationsCol}</TableHead>
                    <TableHead className="text-center">{ui.unreadCol}</TableHead>
                    <TableHead>{ui.lastActivityCol}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompanies.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        {ui.noCompanies}
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredCompanies.map((c) => (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => { setSelectedCompanyId(c.id); setSelectedThread(null); }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium">{c.companyName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{c.threadCount}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {c.unreadCount > 0 ? (
                          <Badge className="bg-blue-500 text-white hover:bg-blue-600">{c.unreadCount}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.lastActivityAt ? ts(c.lastActivityAt, ui) : '—'}
                      </TableCell>
                      <TableCell>
                        <ArrowLeft className="h-4 w-4 rotate-180 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {selectedCompanyId && !selectedThread && (
        <div className="space-y-4">
          <Button variant="ghost" size="sm" onClick={() => { setSelectedCompanyId(null); setThreads([]); }}>
            <ArrowLeft className="mr-2 h-4 w-4" /> {ui.allCompanies}
          </Button>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                {companies.find((c) => c.id === selectedCompanyId)?.companyName ?? ui.companyLabel} — {ui.allConversations}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {threads.length === 0 && (
                <p className="text-center text-muted-foreground py-8">{ui.noThreads}</p>
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
                        {thread.unreadAdmin && (
                          <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" title={ui.unreadTitle} />
                        )}
                        <Badge variant={thread.status === 'open' ? 'default' : 'secondary'} className="shrink-0 text-xs">
                          {thread.status === 'open' ? ui.open : ui.closed}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {thread.createdByName} · {ui.lastActivityPrefix} {ts(thread.lastMessageAt?.seconds, ui)}
                      </p>
                    </div>
                    <ArrowLeft className="h-4 w-4 rotate-180 shrink-0 text-muted-foreground mt-1" />
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
