'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Bell,
  Upload,
  CheckCircle,
  AlertCircle,
  Loader2,
  Inbox,
  Download,
  FileText,
} from 'lucide-react';
import { useFirebase } from '@/firebase/firebase-provider';
import { firestore, storage } from '@/firebase/config';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { notifyAdmin } from '@/lib/admin-notifications';
import { useTranslations } from 'next-intl';

type DocumentRequest = {
  id: string;
  subject: string;
  message: string;
  senderName: string;
  status: 'pending' | 'fulfilled' | 'acknowledged';
  createdAt: { seconds: number; nanoseconds: number } | null;
};

type SentDocument = {
  id: string;
  subject: string;
  message: string;
  senderName: string;
  fileUrl: string;
  fileName: string;
  createdAt: { seconds: number; nanoseconds: number } | null;
};

export default function AccountingFirmDocumentInboxPage() {
  const { user } = useFirebase();
  const { toast } = useToast();
  const t = useTranslations('AccountingDocumentInbox');

  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sentDocuments, setSentDocuments] = useState<SentDocument[]>([]);

  // Real-time listener for document requests from admin
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(firestore, 'document_exchanges'),
      where('recipientId', '==', user.uid),
      where('type', '==', 'document_request')
    );
    const unsub = onSnapshot(q, (snap) => {
      const docs: DocumentRequest[] = snap.docs.map((d) => ({
        id: d.id,
        subject: d.data().subject || '',
        message: d.data().message || '',
        senderName: d.data().senderName || t('adminLabel'),
        status: d.data().status || 'pending',
        createdAt: d.data().createdAt || null,
      }));
      docs.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0);
      });
      setRequests(docs);
      setIsLoading(false);
    });
    return () => unsub();
  }, [t, user]);

  // Real-time listener for ad-hoc documents freely sent by admin
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(firestore, 'document_exchanges'),
      where('recipientId', '==', user.uid),
      where('type', '==', 'document_sent')
    );
    const unsub = onSnapshot(q, (snap) => {
      const docs: SentDocument[] = snap.docs
        .filter((d) => d.data().fileUrl)
        .map((d) => ({
          id: d.id,
          subject: d.data().subject || '',
          message: d.data().message || '',
          senderName: d.data().senderName || t('adminLabel'),
          fileUrl: d.data().fileUrl || '',
          fileName: d.data().fileName || t('defaultFileName'),
          createdAt: d.data().createdAt || null,
        }));
      docs.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setSentDocuments(docs);
    });
    return () => unsub();
  }, [t, user]);

  const handleUpload = async (requestId: string) => {
    if (!uploadFile || !user) return;
    setIsUploading(true);
    try {
      const fileId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const fileRef = storageRef(
        storage,
        `document-exchanges/${fileId}/${uploadFile.name}`
      );
      const snapshot = await uploadBytes(fileRef, uploadFile);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      await updateDoc(doc(firestore, 'document_exchanges', requestId), {
        status: 'fulfilled',
        userFileUrl: downloadUrl,
        userFileName: uploadFile.name,
        updatedAt: serverTimestamp(),
      });

      notifyAdmin({
        title: t('adminNotificationTitle'),
        description: `${user.displayName || user.email} ${t('adminNotificationDescription', { fileName: uploadFile.name })}`,
        type: 'document_request_fulfilled',
        link: '/admin/document-exchange',
        clientId: user.uid,
        clientName: user.displayName || user.email || t('unknownLabel'),
      });

      toast({
        title: t('toast.submittedTitle'),
        description: t('toast.submittedDescription'),
      });
      setUploadOpen(null);
      setUploadFile(null);
    } catch (err) {
      console.error('Error uploading document:', err);
      toast({
        title: t('toast.uploadFailedTitle'),
        description: t('toast.uploadFailedDescription'),
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const activeRequest = requests.find((r) => r.id === uploadOpen);
  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>

      {/* ── Documents freely sent by Admin (ad-hoc transfers) ── */}
      {sentDocuments.length > 0 && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <Download className="mr-2 h-5 w-5 text-blue-600" />
              {t('sentDocumentsTitle')}
              <Badge variant="secondary" className="ml-2">{sentDocuments.length}</Badge>
            </CardTitle>
            <CardDescription>
              {t('sentDocumentsDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sentDocuments.map((sdoc) => (
              <div
                key={sdoc.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-white dark:bg-gray-900 border-blue-200 dark:border-blue-700"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="mt-1 rounded-full p-1.5 bg-blue-100 dark:bg-blue-900">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{sdoc.subject}</p>
                    {sdoc.message && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {sdoc.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {sdoc.fileName} &middot; {t('fromLabel')}: {sdoc.senderName}
                      {sdoc.createdAt && (
                        <> &middot; {new Date(sdoc.createdAt.seconds * 1000).toLocaleDateString()}</>
                      )}
                    </p>
                  </div>
                </div>
                <div className="ml-3 shrink-0">
                  <Button size="sm" variant="outline" className="gap-1.5" asChild>
                    <a
                      href={sdoc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={sdoc.fileName}
                    >
                      <Download className="h-3.5 w-3.5" />
                      {t('downloadButton')}
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : requests.length === 0 && sentDocuments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">{t('emptyTitle')}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t('emptyDescription')}
            </p>
          </CardContent>
        </Card>
      ) : requests.length > 0 ? (
        <Card className="border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <Bell className="mr-2 h-5 w-5 text-orange-600" />
              {t('requestsTitle')}
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {t('pendingCount', { count: pendingCount })}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {t('requestsDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {requests.map((req) => (
              <div
                key={req.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  req.status === 'pending'
                    ? 'bg-white dark:bg-gray-900 border-orange-300 dark:border-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/40 cursor-pointer'
                    : 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                }`}
                onClick={() => {
                  if (req.status === 'pending') setUploadOpen(req.id);
                }}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div
                    className={`mt-1 rounded-full p-1.5 ${
                      req.status === 'pending'
                        ? 'bg-orange-100 dark:bg-orange-900'
                        : 'bg-green-100 dark:bg-green-900'
                    }`}
                  >
                    {req.status === 'pending' ? (
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{req.subject}</p>
                    {req.message && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {req.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('fromLabel')}: {req.senderName}
                      {req.createdAt && (
                        <>
                          {' '}
                          &middot;{' '}
                          {new Date(
                            req.createdAt.seconds * 1000
                          ).toLocaleDateString()}
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  {req.status === 'pending' ? (
                    <Button
                      size="sm"
                      variant="default"
                      className="gap-1.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadOpen(req.id);
                      }}
                    >
                      <Upload className="h-3.5 w-3.5" />
                        {t('uploadButton')}
                    </Button>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-green-700 border-green-300"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" /> {t('uploadedBadge')}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {/* Upload dialog */}
      <Dialog
        open={!!uploadOpen}
        onOpenChange={(v) => {
          if (!v) {
            setUploadOpen(null);
            setUploadFile(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('dialog.title')}</DialogTitle>
            <DialogDescription>{activeRequest?.subject}</DialogDescription>
          </DialogHeader>
          {activeRequest?.message && (
            <div className="bg-muted/50 rounded-md p-3 text-sm">
              {activeRequest.message}
            </div>
          )}
          <div
            className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) setUploadFile(f);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx,.csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setUploadFile(f);
              }}
            />
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            {uploadFile ? (
              <p className="text-sm font-medium text-foreground">
                {uploadFile.name}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('dialog.dropzoneHint')}
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              {t('dialog.chooseFile')}
            </Button>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setUploadOpen(null);
                setUploadFile(null);
              }}
            >
              {t('dialog.cancel')}
            </Button>
            <Button
              disabled={!uploadFile || isUploading}
              onClick={() => uploadOpen && handleUpload(uploadOpen)}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('dialog.uploading')}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {t('dialog.submit')}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
