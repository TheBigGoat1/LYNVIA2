'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  MoreHorizontal,
  PlusCircle,
  Search,
  FileDown,
  Share2,
  Trash2,
  Eye,
  Send,
  FileText,
  Sparkles,
  Upload,
  CheckCircle,
  Clock,
  Download,
  Bell,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFirebase } from '@/firebase/firebase-provider';
import { firestore, storage } from '@/firebase/config';
import { collection, query, where, getDocs, getDoc, doc, addDoc, deleteDoc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from 'next-intl';
import { notifyAdmin } from '@/lib/admin-notifications';
import { resolveSwissLocale } from '@/lib/format';

type Document = {
  id: string;
  name: string;
  templateType: string;
  status: "Approved" | "Pending Review" | "Draft" | "Rejected" | "Sent";
  createdAt: { seconds: number; nanoseconds: number };
  userName: string;
  userAvatar?: string;
  content?: string;
  userId: string;
  source: 'documents' | 'companyDocuments';
};

type TransmittedDocument = {
  id: string;
  type: string;
  period: string;
  uploadDate: string;
  status: string;
  comment?: string;
};

type DocumentStatus = Document['status'];

const getStatusBadgeVariant = (status: DocumentStatus) => {
  switch (status) {
    case "Approved":
    case "Sent":
      return "default";
    case "Pending Review":
      return "secondary";
    case "Draft":
      return "outline";
    case "Rejected":
      return "destructive";
    default:
      return "outline";
  }
};

const getStatusKey = (status: DocumentStatus) => {
  return status.replace(/\s/g, '');
};

const transmittedStatusColors: Record<string, string> = {
  "pending": "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  "received": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "missing": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  "vatLate": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  "processing": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  "integratedCFO": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

export default function DocumentCenterPage() {
  const { user } = useFirebase();
  const { toast } = useToast();
  const t = useTranslations('DocumentCenter');
  const router = useRouter();
  const locale = useLocale();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadForm, setUploadForm] = useState({ type: '', period: '', comment: '' });
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewDoc, setViewDoc] = useState<Document | null>(null);
  const [transmittedDocs, setTransmittedDocs] = useState<TransmittedDocument[]>([]);

  // ── Pending Document Requests from Admin ──
  type PendingRequest = {
    id: string;
    subject: string;
    message: string;
    senderName: string;
    status: 'pending' | 'fulfilled' | 'acknowledged';
    createdAt: { seconds: number; nanoseconds: number } | null;
  };
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [requestUploadOpen, setRequestUploadOpen] = useState<string | null>(null);
  const [requestFile, setRequestFile] = useState<File | null>(null);
  const [isUploadingRequest, setIsUploadingRequest] = useState(false);
  const requestFileRef = useRef<HTMLInputElement>(null);

  // ── Documents sent freely by Admin (ad-hoc transfers) ──
  type ReceivedDocument = {
    id: string;
    subject: string;
    message: string;
    senderName: string;
    fileUrl: string;
    fileName: string;
    createdAt: { seconds: number; nanoseconds: number } | null;
  };
  const [receivedDocuments, setReceivedDocuments] = useState<ReceivedDocument[]>([]);

  // Real-time listener for document_exchanges targeting this user
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(firestore, 'document_exchanges'),
      where('recipientId', '==', user.uid),
      where('type', '==', 'document_request')
    );
    const unsub = onSnapshot(q, (snap) => {
      const reqs: PendingRequest[] = snap.docs.map(d => ({
        id: d.id,
        subject: d.data().subject || '',
        message: d.data().message || '',
        senderName: d.data().senderName || 'Admin',
        status: d.data().status || 'pending',
        createdAt: d.data().createdAt || null,
      }));
      reqs.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0);
      });
      setPendingRequests(reqs);
    });
    return () => unsub();
  }, [user]);

  // Upload a file to fulfill a document request
  const handleRequestUpload = async (requestId: string) => {
    if (!requestFile || !user) return;
    setIsUploadingRequest(true);
    try {
      const fileId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const fileRef = storageRef(storage, `document-exchanges/${fileId}/${requestFile.name}`);
      const snapshot = await uploadBytes(fileRef, requestFile);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      await updateDoc(doc(firestore, 'document_exchanges', requestId), {
        status: 'fulfilled',
        userFileUrl: downloadUrl,
        userFileName: requestFile.name,
        updatedAt: serverTimestamp(),
      });
      notifyAdmin({
        title: 'Document uploaded by business client',
        description: `${user.displayName || user.email} uploaded "${requestFile.name}" in response to a document request.`,
        type: 'document_request_fulfilled',
        link: '/admin/document-exchange',
        clientId: user.uid,
        clientName: user.displayName || user.email || 'Unknown',
      });
      toast({ title: t('toast.uploadSuccess.title'), description: t('toast.uploadSuccess.description') });
      setRequestUploadOpen(null);
      setRequestFile(null);
    } catch (err) {
      console.error('Error uploading request document:', err);
      toast({ title: t('toast.fetchError.title'), description: t('toast.uploadFailedDesc'), variant: 'destructive' });
    } finally {
      setIsUploadingRequest(false);
    }
  };

  // Real-time listener for ad-hoc documents freely sent by admin
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(firestore, 'document_exchanges'),
      where('recipientId', '==', user.uid),
      where('type', '==', 'document_sent')
    );
    const unsub = onSnapshot(q, (snap) => {
      const docs: ReceivedDocument[] = snap.docs
        .filter(d => d.data().fileUrl)
        .map(d => ({
          id: d.id,
          subject: d.data().subject || '',
          message: d.data().message || '',
          senderName: d.data().senderName || 'Admin',
          fileUrl: d.data().fileUrl || '',
          fileName: d.data().fileName || 'document',
          createdAt: d.data().createdAt || null,
        }));
      docs.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setReceivedDocuments(docs);
    });
    return () => unsub();
  }, [user]);

  const documentTypeKeys = [
    'bankStatementDetailed',
    'invoiceIssued',
    'invoicePaidPrivate',
    'invoicePaidCompany',
    'monthlySalarySlip',
    'vatStatement',
    'vehicleContract',
    'other',
  ];

  useEffect(() => {
    if (user) {
      const userDocRef = doc(firestore, 'users', user.uid);
      getDoc(userDocRef).then(docSnap => {
        if (docSnap.exists()) {
          const id = docSnap.data().companyId;
          setCompanyId(id);
        } else {
          setIsLoading(false);
        }
      });
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const fetchCompanyDocuments = useCallback(async () => {
    if (!companyId) {
      if (user) setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const usersQuery = query(collection(firestore, 'users'), where('companyId', '==', companyId));
      const usersSnapshot = await getDocs(usersQuery);
      const userIds = usersSnapshot.docs.map(d => d.id);

      if (userIds.length === 0) {
        setDocuments([]);
        setIsLoading(false);
        return;
      }

      const allDocsPromises = userIds.map(async userId => {
        const [personalDocsSnap, companyDocsSnap] = await Promise.all([
          getDocs(query(collection(firestore, 'users', userId, 'documents'))),
          getDocs(query(collection(firestore, 'users', userId, 'companyDocuments')))
        ]);
        return [personalDocsSnap, companyDocsSnap];
      });

      const allDocsSnapshots = await Promise.all(allDocsPromises);
      const allDocs: Document[] = [];
      allDocsSnapshots.forEach(([personalSnap, companySnap], idx) => {
        const uid = userIds[idx];
        personalSnap.forEach(d => {
          allDocs.push({ id: d.id, userId: uid, source: 'documents', ...(d.data() as Omit<Document, 'id' | 'userId' | 'source'>) });
        });
        companySnap.forEach(d => {
          allDocs.push({ id: d.id, userId: uid, source: 'companyDocuments', ...(d.data() as Omit<Document, 'id' | 'userId' | 'source'>) });
        });
      });

      allDocs.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
      setDocuments(allDocs);
    } catch (error) {
      console.error("Error fetching documents: ", error);
      toast({
        title: t('toast.fetchError.title'),
        description: t('toast.fetchError.description'),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [companyId, toast, user, t]);

  useEffect(() => {
    fetchCompanyDocuments();
  }, [fetchCompanyDocuments]);

  // Load transmitted docs from Firestore on mount
  const fetchTransmittedDocs = useCallback(async () => {
    if (!user) return;
    try {
      const snap = await getDocs(collection(firestore, 'users', user.uid, 'companyDocuments'));
      const docs: TransmittedDocument[] = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          type: data.templateType || 'other',
          period: data.period || '',
          uploadDate: data.createdAt?.seconds
            ? new Date(data.createdAt.seconds * 1000).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],
          status: data.transmittedStatus || 'pending',
          comment: data.comment || '',
        };
      });
      docs.sort((a, b) => b.uploadDate.localeCompare(a.uploadDate));
      setTransmittedDocs(docs);
    } catch (error) {
      console.error('Error fetching transmitted docs:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchTransmittedDocs();
  }, [fetchTransmittedDocs]);

  const handleDelete = async (fdoc: Document) => {
    if (!user) return;
    try {
      await deleteDoc(doc(firestore, 'users', fdoc.userId, fdoc.source, fdoc.id));
      setDocuments(prev => prev.filter(d => d.id !== fdoc.id));
      toast({ title: t('toast.deleteSuccess.title'), description: t('toast.deleteSuccessDesc', { name: fdoc.name }) });
    } catch {
      toast({ title: t('toast.deleteFailed.title'), description: t('toast.deleteFailedDesc'), variant: 'destructive' });
    }
  };

  const handleStatusUpdate = async (fdoc: Document, newStatus: Document['status']) => {
    if (!user) return;
    try {
      await updateDoc(doc(firestore, 'users', fdoc.userId, fdoc.source, fdoc.id), { status: newStatus });
      setDocuments(prev => prev.map(d => d.id === fdoc.id ? { ...d, status: newStatus } : d));
      toast({ title: t('toast.statusUpdated.title'), description: t('toast.statusUpdatedDesc', { status: newStatus }) });
    } catch {
      toast({ title: t('toast.updateFailed.title'), description: t('toast.updateFailedDesc'), variant: 'destructive' });
    }
  };

  const handleShare = (fdoc: Document) => {
    const url = `${window.location.origin}/${locale}/business/document-center`;
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: t('toast.linkCopied.title'), description: t('toast.linkCopiedDesc') });
    });
  };

  const handleUploadSubmit = async () => {
    if (!uploadForm.type || !uploadForm.period) {
      toast({
        title: t('toast.uploadValidation.title'),
        description: t('toast.uploadValidation.description'),
        variant: "destructive"
      });
      return;
    }

    const newDoc: TransmittedDocument = {
      id: Date.now().toString(),
      type: uploadForm.type,
      period: uploadForm.period,
      uploadDate: new Date().toISOString().split('T')[0],
      status: 'pending',
      comment: uploadForm.comment
    };

    // Upload file and save to Firebase
    if (user && companyId) {
      try {
        setIsUploading(true);
        let fileUrl: string | undefined;
        if (selectedFile) {
          const fileRef = storageRef(storage, `companies/${companyId}/documents/${Date.now()}_${selectedFile.name}`);
          const snapshot = await uploadBytes(fileRef, selectedFile);
          fileUrl = await getDownloadURL(snapshot.ref);
        }
        await addDoc(collection(firestore, 'users', user.uid, 'companyDocuments'), {
          name: t(`docTypes.${uploadForm.type}`),
          templateType: uploadForm.type,
          status: 'Pending Review',
          transmittedStatus: 'pending',
          createdAt: serverTimestamp(),
          userName: user.displayName || user.email || '',
          period: uploadForm.period,
          comment: uploadForm.comment,
          ...(fileUrl ? { fileUrl, fileName: selectedFile!.name } : {}),
        });
        await fetchCompanyDocuments();
        await fetchTransmittedDocs();
        notifyAdmin({
          title: 'New document uploaded by business client',
          description: `${user.displayName || user.email} uploaded a ${uploadForm.type} document for period ${uploadForm.period || 'N/A'}.`,
          type: 'document_uploaded',
          link: '/admin/document-approvals',
          clientId: user.uid,
          clientName: user.displayName || user.email || 'Unknown',
        });
      } catch (error) {
        console.error('Error saving document: ', error);
      } finally {
        setIsUploading(false);
      }
    }

    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setUploadForm({ type: '', period: '', comment: '' });
    setShowUploadDialog(false);
    toast({
      title: t('toast.uploadSuccess.title'),
      description: t('toast.uploadSuccess.description'),
    });
  };

  const filteredDocuments = documents.filter(d =>
    d.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Button onClick={() => router.push(`/${locale}/business/document-generator`)} className="shrink-0 gap-2">
          <Sparkles className="h-4 w-4" />
          {t('aiGenerator.title')}
        </Button>
      </div>

      {/* ── Pending Document Requests from Admin ── */}
      {pendingRequests.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <Bell className="mr-2 h-5 w-5 text-orange-600" />
              {t('docRequests.title')}
              {pendingRequests.filter(r => r.status === 'pending').length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {t('docRequests.pendingCount', { count: pendingRequests.filter(r => r.status === 'pending').length })}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>{t('docRequests.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                  req.status === 'pending'
                    ? 'bg-white dark:bg-gray-900 border-orange-300 dark:border-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/40'
                    : 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                }`}
                onClick={() => {
                  if (req.status === 'pending') setRequestUploadOpen(req.id);
                }}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`mt-1 rounded-full p-1.5 ${req.status === 'pending' ? 'bg-orange-100 dark:bg-orange-900' : 'bg-green-100 dark:bg-green-900'}`}>
                    {req.status === 'pending' ? (
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{req.subject}</p>
                    {req.message && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{req.message}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('docRequests.from')} {req.senderName}
                      {req.createdAt && <> &middot; {new Date(req.createdAt.seconds * 1000).toLocaleDateString(resolveSwissLocale(locale))}</>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  {req.status === 'pending' ? (
                    <Button
                      size="sm"
                      variant="default"
                      className="gap-1.5"
                      onClick={(e) => { e.stopPropagation(); setRequestUploadOpen(req.id); }}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {t('docRequests.upload')}
                    </Button>
                  ) : (
                    <Badge variant="outline" className="text-green-700 border-green-300">
                      <CheckCircle className="h-3 w-3 mr-1" /> {t('docRequests.uploaded')}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Upload dialog for a specific request */}
      <Dialog open={!!requestUploadOpen} onOpenChange={(v) => { if (!v) { setRequestUploadOpen(null); setRequestFile(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('dialog.requestUploadTitle')}</DialogTitle>
            <DialogDescription>
              {pendingRequests.find(r => r.id === requestUploadOpen)?.subject}
            </DialogDescription>
          </DialogHeader>
          {pendingRequests.find(r => r.id === requestUploadOpen)?.message && (
            <div className="bg-muted/50 rounded-md p-3 text-sm">
              {pendingRequests.find(r => r.id === requestUploadOpen)?.message}
            </div>
          )}
          <div
            className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center cursor-pointer"
            onClick={() => requestFileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setRequestFile(f); }}
          >
            <input
              ref={requestFileRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx,.csv"
              onChange={e => { const f = e.target.files?.[0]; if (f) setRequestFile(f); }}
            />
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            {requestFile ? (
              <p className="text-sm font-medium text-foreground">{requestFile.name}</p>
            ) : (
              <p className="text-sm text-muted-foreground">{t('dialog.dragDrop')}</p>
            )}
            <Button variant="outline" size="sm" className="mt-2" type="button" onClick={e => { e.stopPropagation(); requestFileRef.current?.click(); }}>
              {t('dialog.chooseFile')}
            </Button>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setRequestUploadOpen(null); setRequestFile(null); }}>{t('transmit.cancel')}</Button>
            <Button
              disabled={!requestFile || isUploadingRequest}
              onClick={() => requestUploadOpen && handleRequestUpload(requestUploadOpen)}
            >
              {isUploadingRequest ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('dialog.uploading')}</> : <><Upload className="mr-2 h-4 w-4" /> {t('dialog.submitDocument')}</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Documents freely sent by Admin (ad-hoc transfers) ── */}
      {receivedDocuments.length > 0 && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <Download className="mr-2 h-5 w-5 text-blue-600" />
              {t('received.title')}
              <Badge variant="secondary" className="ml-2">{receivedDocuments.length}</Badge>
            </CardTitle>
            <CardDescription>{t('received.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {receivedDocuments.map((rdoc) => (
              <div
                key={rdoc.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-white dark:bg-gray-900 border-blue-200 dark:border-blue-700"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="mt-1 rounded-full p-1.5 bg-blue-100 dark:bg-blue-900">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{rdoc.subject}</p>
                    {rdoc.message && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{rdoc.message}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {rdoc.fileName} &middot; From: {rdoc.senderName}
                      {rdoc.createdAt && <> &middot; {new Date(rdoc.createdAt.seconds * 1000).toLocaleDateString(resolveSwissLocale(locale))}</>}
                    </p>
                  </div>
                </div>
                <div className="ml-3 shrink-0">
                  <Button size="sm" variant="outline" className="gap-1.5" asChild>
                    <a href={rdoc.fileUrl} target="_blank" rel="noopener noreferrer" download={rdoc.fileName}>
                      <Download className="h-3.5 w-3.5" />
                      {t('received.download')}
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

        {/* Transmit documents to Lynvia */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Upload className="mr-2 h-5 w-5 text-green-600" />
              {t('transmit.title')}
            </CardTitle>
            <CardDescription>{t('transmit.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <Upload className="mr-2 h-4 w-4" />
                  {t('transmit.newDocument')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('transmit.dialogTitle')}</DialogTitle>
                  <DialogDescription>{t('transmit.dialogDescription')}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="docType">{t('transmit.typeLabel')} *</Label>
                    <Select value={uploadForm.type} onValueChange={(value) => setUploadForm({ ...uploadForm, type: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('transmit.typePlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {documentTypeKeys.map((key) => (
                          <SelectItem key={key} value={key}>{t(`docTypes.${key}`)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="period">{t('transmit.periodLabel')} *</Label>
                    <Input
                      id="period"
                      value={uploadForm.period}
                      onChange={(e) => setUploadForm({ ...uploadForm, period: e.target.value })}
                      placeholder={t('transmit.periodPlaceholder')}
                    />
                  </div>

                  <div>
                    <Label htmlFor="comment">{t('transmit.commentLabel')}</Label>
                    <Textarea
                      id="comment"
                      value={uploadForm.comment}
                      onChange={(e) => setUploadForm({ ...uploadForm, comment: e.target.value })}
                      placeholder={t('transmit.commentPlaceholder')}
                    />
                  </div>

                  <div
                    className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setSelectedFile(f); }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={e => { const f = e.target.files?.[0]; if (f) setSelectedFile(f); }}
                    />
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    {selectedFile ? (
                      <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t('transmit.dragDrop')}</p>
                    )}
                    <Button variant="outline" size="sm" className="mt-2" type="button" onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                      {t('transmit.chooseFiles')}
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                    {t('transmit.cancel')}
                  </Button>
                  <Button onClick={handleUploadSubmit} disabled={isUploading}>
                    {isUploading ? <><span className="mr-2 h-4 w-4 animate-spin inline-block border-2 border-current border-t-transparent rounded-full" />{t('transmit.submit')}...</> : t('transmit.submit')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <div className="mt-4 text-xs text-muted-foreground">
              {t('transmit.cfoNote')}
            </div>
          </CardContent>
        </Card>

      {/* Transmitted Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="mr-2 h-5 w-5 text-blue-600" />
            {t('transmitted.title')}
          </CardTitle>
          <CardDescription>{t('transmitted.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="p-2">{t('transmitted.type')}</th>
                  <th className="p-2">{t('transmitted.period')}</th>
                  <th className="p-2">{t('transmitted.sendDate')}</th>
                  <th className="p-2">{t('transmitted.status')}</th>
                  <th className="p-2">{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {transmittedDocs.map((tdoc) => (
                  <tr key={tdoc.id} className="border-b">
                    <td className="p-2">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{t(`docTypes.${tdoc.type}`)}</span>
                      </div>
                    </td>
                    <td className="p-2">{tdoc.period}</td>
                    <td className="p-2">{new Date(tdoc.uploadDate).toLocaleDateString(resolveSwissLocale(locale))}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${transmittedStatusColors[tdoc.status] || ''}`}>
                        {t(`transmittedStatus.${tdoc.status}`)}
                      </span>
                      {tdoc.status === 'integratedCFO' && (
                        <Badge variant="outline" className="ml-2 text-green-600">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {t('transmitted.cfoSource')}
                        </Badge>
                      )}
                    </td>
                    <td className="p-2">
                      <div className="flex space-x-1">
                        <Button size="sm" variant="outline">
                          <Eye className="h-3 w-3" />
                        </Button>
                        {tdoc.status === 'integratedCFO' && (
                          <Button size="sm" variant="outline">
                            <Download className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {transmittedDocs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {t('transmitted.empty')}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* All Documents from Firebase */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1">
              <CardTitle>{t('cardTitle')}</CardTitle>
              <CardDescription>{t('cardDescription')}</CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-grow sm:flex-grow-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder={t('searchPlaceholder')} className="pl-9 w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('table.name')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('table.createdBy')}</TableHead>
                <TableHead>{t('table.status')}</TableHead>
                <TableHead className="hidden lg:table-cell">{t('table.lastModified')}</TableHead>
                <TableHead className="text-right">{t('table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))}
              {!isLoading && filteredDocuments.map((fdoc) => (
                <TableRow key={fdoc.id}>
                  <TableCell className="font-medium">{fdoc.name}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        {fdoc.userAvatar && <AvatarImage src={fdoc.userAvatar} alt={fdoc.userName} />}
                        <AvatarFallback>{fdoc.userName ? fdoc.userName.split(' ').map(n => n[0]).join('') : 'U'}</AvatarFallback>
                      </Avatar>
                      <span className="text-muted-foreground">{fdoc.userName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(fdoc.status as DocumentStatus)}>
                      {t(`status.${getStatusKey(fdoc.status)}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">{fdoc.createdAt ? new Date(fdoc.createdAt.seconds * 1000).toLocaleDateString(resolveSwissLocale(locale)) : 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">{t('actions.openMenu')}</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{t('actions.label')}</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setViewDoc(fdoc)}>
                          <Eye className="mr-2 h-4 w-4" />
                          {t('actions.view')}
                        </DropdownMenuItem>
                        {fdoc.content && (
                          <DropdownMenuItem onClick={() => {
                            const blob = new Blob([fdoc.content!], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a'); a.href = url; a.download = `${fdoc.name}.txt`; a.click();
                            URL.revokeObjectURL(url);
                          }}>
                            <FileDown className="mr-2 h-4 w-4" />
                            {t('actions.download')}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleShare(fdoc)}>
                          <Share2 className="mr-2 h-4 w-4" />
                          {t('actions.share')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {fdoc.status === "Approved" && (
                          <DropdownMenuItem onClick={() => handleStatusUpdate(fdoc, 'Sent')}>
                            <Send className="mr-2 h-4 w-4" />
                            {t('actions.markAsSent')}
                          </DropdownMenuItem>
                        )}
                        {(fdoc.status === "Draft" || fdoc.status === "Rejected") && (
                          <DropdownMenuItem onClick={() => handleStatusUpdate(fdoc, 'Pending Review')}>
                            <Send className="mr-2 h-4 w-4" />
                            {t('actions.requestApproval')}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(fdoc)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('actions.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && filteredDocuments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    {searchTerm ? t('noMatch') : t('noDocuments')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* CFO Analyses Link */}
      {/* View Document Dialog */}
      <Dialog open={!!viewDoc} onOpenChange={open => { if (!open) setViewDoc(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewDoc?.name}</DialogTitle>
            <DialogDescription>
              {viewDoc && (
                <span>
                  {t(`status.${getStatusKey(viewDoc.status)}`)} &mdash;{' '}
                  {viewDoc.createdAt ? new Date(viewDoc.createdAt.seconds * 1000).toLocaleDateString(resolveSwissLocale(locale)) : ''}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          {viewDoc?.content ? (
            <div className="mt-2 max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm border rounded-md p-4 bg-muted/30">
              {viewDoc.content}
            </div>
          ) : (
            <div className="mt-2 text-muted-foreground text-sm py-8 text-center">
              {t('view.noContent')}
            </div>
          )}
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setViewDoc(null)}>{t('transmit.cancel')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="text-sm text-green-800 dark:text-green-300">
                <strong>{t('cfoLink.title')}</strong> {t('cfoLink.description')}
              </div>
            </div>
            <Button variant="outline" size="sm">
              {t('cfoLink.button')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
