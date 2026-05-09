"use client"

import { useState, useEffect, useRef, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Copy, Mic, Plus, Send, ThumbsDown, ThumbsUp, Trash2, User, MessageSquare, Scale, Sparkles, Building2, FileText, ClipboardList, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFirebase } from "@/firebase/firebase-provider";
import { useToast } from "@/hooks/use-toast";
import { doc, getDoc, addDoc, collection, serverTimestamp, query, orderBy, onSnapshot, updateDoc, arrayUnion, where, getDocs, Query } from "firebase/firestore";
import { firestore } from "@/firebase/config";
import { legalQAAIAssistant } from "@/ai/flows/legal-qa-assistant";
import {
  buildLegalAssistantContext,
  resolveKnowledgeBaseStatus,
} from '@/lib/legal-assistant-knowledge-base';
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CLA_RULES, resolveClaSafe, buildClaContextForAI, type ClaRule } from "@/lib/cla-rules";

type Message = {
  from: 'user' | 'ai';
  text: string;
  sources?: { title: string; documentId: string }[];
  messageType?: 'greeting' | 'legal' | 'conversational' | 'clarification';
  timestamp?: Date;
};

type Conversation = {
  id: string;
  title: string;
  messages: Message[];
};

type UserProfile = {
  canton?: string;
  firstName?: string;
  lastName?: string;
};

const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

const normalizeAnswerMarkup = (text: string): string => {
  return text
    .replace(/\r/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?p>/gi, '\n')
    .replace(/<\/?(ul|ol)>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

function RenderAnswer({ text }: { text: string }) {
  if (!text) return <p className="text-sm italic text-muted-foreground">No content</p>;

  const lines = normalizeAnswerMarkup(text).split('\n');
  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (!line || !line.trim()) return <div key={i} className="h-1" />;

        const formatInline = (str: string) => {
          if (!str) return str;
          // Handle bold: **text**
          const boldRegex = /\*\*(.+?)\*\*/g;
          // Process bold simply
          const parts = str.split(/(\*\*(.+?)\*\*)/g);
          return parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={j} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
            }
            return part;
          });
        };

        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('• ') || trimmedLine.startsWith('- ')) {
          return (
            <div key={i} className="flex items-start gap-2 pl-1">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
              <span>{formatInline(trimmedLine.slice(2))}</span>
            </div>
          );
        }

        if (trimmedLine.startsWith('## ')) {
          return <p key={i} className="font-bold text-base mt-2">{formatInline(trimmedLine.slice(3))}</p>;
        }
        if (trimmedLine.startsWith('# ')) {
          return <p key={i} className="font-bold text-lg mt-2">{formatInline(trimmedLine.slice(2))}</p>;
        }

        return <p key={i}>{formatInline(line)}</p>;
      })}
    </div>
  );
}

type SupportedLocale = 'en' | 'fr' | 'de' | 'it' | 'es';

const resolveLocale = (locale: string): SupportedLocale => {
  const normalized = locale.toLowerCase().split('-')[0];
  if (normalized === 'fr' || normalized === 'de' || normalized === 'it' || normalized === 'es') {
    return normalized;
  }
  return 'en';
};

// --- Filing/Task Intent Detection ---
type DetectedIntent = {
  type: 'document_filing' | 'task_creation' | null;
  subject: string;
  description: string;
};

const FILING_KEYWORDS: Record<SupportedLocale, string[]> = {
  en: ['send document', 'file document', 'submit document', 'upload document', 'send to client', 'send this to', 'forward to', 'deliver document'],
  fr: ['envoyer document', 'transmettre document', 'soumettre document', 'envoyer au client', 'transférer à', 'livrer document'],
  de: ['dokument senden', 'dokument übermitteln', 'dokument einreichen', 'an mandant senden', 'weiterleiten an', 'dokument liefern'],
  it: ['inviare documento', 'trasmettere documento', 'inviare al cliente', 'inoltrare a', 'consegnare documento'],
  es: ['enviar documento', 'presentar documento', 'enviar al cliente', 'reenviar a', 'entregar documento'],
};

const TASK_KEYWORDS: Record<SupportedLocale, string[]> = {
  en: ['create task', 'add task', 'new task', 'remind me to', 'schedule task', 'set reminder', 'follow up on', 'todo'],
  fr: ['créer tâche', 'ajouter tâche', 'nouvelle tâche', 'me rappeler de', 'planifier tâche', 'définir rappel', 'suivi de', 'à faire'],
  de: ['aufgabe erstellen', 'aufgabe hinzufügen', 'neue aufgabe', 'erinnere mich an', 'aufgabe planen', 'erinnerung setzen', 'nachverfolgen', 'zu erledigen'],
  it: ['creare attività', 'aggiungere attività', 'nuova attività', 'ricordami di', 'pianificare attività', 'impostare promemoria', 'seguire', 'da fare'],
  es: ['crear tarea', 'agregar tarea', 'nueva tarea', 'recordarme', 'programar tarea', 'establecer recordatorio', 'seguimiento de', 'pendiente'],
};

const detectIntent = (text: string, locale: SupportedLocale): DetectedIntent => {
  const normalized = normalizeText(text);
  
  // Check for filing keywords
  const filingKeywords = FILING_KEYWORDS[locale] || FILING_KEYWORDS.en;
  for (const keyword of filingKeywords) {
    if (normalized.includes(normalizeText(keyword))) {
      return {
        type: 'document_filing',
        subject: text.substring(0, 50),
        description: text,
      };
    }
  }
  
  // Check for task keywords
  const taskKeywords = TASK_KEYWORDS[locale] || TASK_KEYWORDS.en;
  for (const keyword of taskKeywords) {
    if (normalized.includes(normalizeText(keyword))) {
      return {
        type: 'task_creation',
        subject: text.substring(0, 50),
        description: text,
      };
    }
  }
  
  return { type: null, subject: '', description: '' };
};

const OUTPUT_LANGUAGE_BY_LOCALE: Record<SupportedLocale, string> = {
  en: 'English',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  es: 'Spanish',
};

const UI_BY_LOCALE: Record<SupportedLocale, {
  assistantSubtitle: string;
  online: string;
  noConversations: string;
  tryAsking: string;
  disclaimer: string;
  legalBadge: string;
  generalBadge: string;
  clarificationBadge: string;
  feedbackUp: string;
  feedbackDown: string;
  limitedSourceTitle: string;
  restrictedKbWarning: string;
  genericKbWarning: string;
  untitledSource: string;
  quickSuggestions: string[];
}> = {
  en: {
    assistantSubtitle: 'Swiss Legal & Financial Assistant',
    online: 'Online',
    noConversations: 'No conversations yet. Start by asking a legal question.',
    tryAsking: 'Try asking',
    disclaimer: 'LYNVIA provides legal information, not legal advice. Always consult a qualified professional.',
    legalBadge: '⚖️ Legal Answer',
    generalBadge: '💬 General',
    clarificationBadge: '❓ Clarification',
    feedbackUp: '👍 Thank you for your feedback!',
    feedbackDown: "👎 We'll work to improve this.",
    limitedSourceTitle: 'Limited source access',
    restrictedKbWarning: 'Knowledge base access is restricted for this account. Using assistant response without direct citations.',
    genericKbWarning: 'Could not load legal sources right now. Continuing without direct citations.',
    untitledSource: 'Untitled source',
    quickSuggestions: [
      'Who can represent a VAT group?',
      'What are the transitional provisions for the VAT ordinance amendment?',
      'When does the VAT ordinance amendment take effect?',
      'Who may act as the representative of a VAT group in Switzerland?',
    ],
  },
  fr: {
    assistantSubtitle: 'Assistant juridique et financier suisse',
    online: 'En ligne',
    noConversations: 'Aucune conversation pour le moment. Commencez par poser une question juridique.',
    tryAsking: 'Essayez de demander',
    disclaimer: 'LYNVIA fournit des informations juridiques, pas des conseils juridiques. Consultez toujours un professionnel qualifié.',
    legalBadge: '⚖️ Réponse juridique',
    generalBadge: '💬 Général',
    clarificationBadge: '❓ Clarification',
    feedbackUp: '👍 Merci pour votre retour !',
    feedbackDown: "👎 Nous allons nous améliorer.",
    limitedSourceTitle: 'Accès limité aux sources',
    restrictedKbWarning: 'L’accès à la base de connaissances est restreint pour ce compte. Réponse fournie sans citations directes.',
    genericKbWarning: 'Impossible de charger les sources juridiques pour le moment. Réponse fournie sans citations directes.',
    untitledSource: 'Source sans titre',
    quickSuggestions: [
      'Qui peut représenter un groupe TVA ?',
      'Quelles sont les dispositions transitoires de la modification de l’ordonnance TVA ?',
      'Quand la modification de l’ordonnance TVA entre-t-elle en vigueur ?',
      'Qui peut agir comme représentant d’un groupe TVA en Suisse ?',
    ],
  },
  de: {
    assistantSubtitle: 'Schweizer Rechts- und Finanzassistent',
    online: 'Online',
    noConversations: 'Noch keine Konversationen. Starten Sie mit einer Rechtsfrage.',
    tryAsking: 'Versuchen Sie zu fragen',
    disclaimer: 'LYNVIA bietet rechtliche Informationen, aber keine Rechtsberatung. Konsultieren Sie immer eine qualifizierte Fachperson.',
    legalBadge: '⚖️ Rechtliche Antwort',
    generalBadge: '💬 Allgemein',
    clarificationBadge: '❓ Klärung',
    feedbackUp: '👍 Danke für Ihr Feedback!',
    feedbackDown: '👎 Wir werden uns verbessern.',
    limitedSourceTitle: 'Eingeschränkter Quellenzugriff',
    restrictedKbWarning: 'Der Zugriff auf die Wissensdatenbank ist für dieses Konto eingeschränkt. Antwort ohne direkte Zitate.',
    genericKbWarning: 'Rechtsquellen konnten derzeit nicht geladen werden. Antwort ohne direkte Zitate.',
    untitledSource: 'Unbenannte Quelle',
    quickSuggestions: [
      'Wer kann eine MWST-Gruppe vertreten?',
      'Welche Übergangsbestimmungen gelten für die Änderung der MWST-Verordnung?',
      'Wann tritt die Änderung der MWST-Verordnung in Kraft?',
      'Wer darf in der Schweiz als Vertreter einer MWST-Gruppe handeln?',
    ],
  },
  it: {
    assistantSubtitle: 'Assistente legale e finanziario svizzero',
    online: 'Online',
    noConversations: 'Nessuna conversazione al momento. Inizia con una domanda legale.',
    tryAsking: 'Prova a chiedere',
    disclaimer: 'LYNVIA fornisce informazioni legali, non consulenza legale. Consulta sempre un professionista qualificato.',
    legalBadge: '⚖️ Risposta legale',
    generalBadge: '💬 Generale',
    clarificationBadge: '❓ Chiarimento',
    feedbackUp: '👍 Grazie per il tuo feedback!',
    feedbackDown: '👎 Ci impegneremo a migliorare.',
    limitedSourceTitle: 'Accesso limitato alle fonti',
    restrictedKbWarning: 'L’accesso alla base di conoscenza è limitato per questo account. Risposta fornita senza citazioni dirette.',
    genericKbWarning: 'Impossibile caricare le fonti legali al momento. Risposta fornita senza citazioni dirette.',
    untitledSource: 'Fonte senza titolo',
    quickSuggestions: [
      'Chi può rappresentare un gruppo IVA?',
      'Quali sono le disposizioni transitorie della modifica dell’ordinanza IVA?',
      'Quando entra in vigore la modifica dell’ordinanza IVA?',
      'Chi può agire come rappresentante di un gruppo IVA in Svizzera?',
    ],
  },
  es: {
    assistantSubtitle: 'Asistente legal y financiero suizo',
    online: 'En línea',
    noConversations: 'Aún no hay conversaciones. Empieza haciendo una pregunta legal.',
    tryAsking: 'Prueba preguntar',
    disclaimer: 'LYNVIA proporciona información legal, no asesoría legal. Consulta siempre con un profesional cualificado.',
    legalBadge: '⚖️ Respuesta legal',
    generalBadge: '💬 General',
    clarificationBadge: '❓ Aclaración',
    feedbackUp: '👍 ¡Gracias por tus comentarios!',
    feedbackDown: '👎 Trabajaremos para mejorar.',
    limitedSourceTitle: 'Acceso limitado a fuentes',
    restrictedKbWarning: 'El acceso a la base de conocimiento está restringido para esta cuenta. Respuesta sin citas directas.',
    genericKbWarning: 'No se pudieron cargar las fuentes legales ahora. Respuesta sin citas directas.',
    untitledSource: 'Fuente sin título',
    quickSuggestions: [
      '¿Quién puede representar a un grupo de IVA?',
      '¿Cuáles son las disposiciones transitorias de la modificación de la ordenanza del IVA?',
      '¿Cuándo entra en vigor la modificación de la ordenanza del IVA?',
      '¿Quién puede actuar como representante de un grupo de IVA en Suiza?',
    ],
  },
};

export default function LegalAssistantPage() {
  const [conversations, setConversations] = useState<{ id: string; title: string }[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [feedback, setFeedback] = useState<Record<number, 'up' | 'down'>>({});

  // --- Action detection state (document filing / task creation) ---
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [detectedAction, setDetectedAction] = useState<DetectedIntent>({ type: null, subject: '', description: '' });
  const [actionForm, setActionForm] = useState({
    subject: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    dueDate: '',
  });
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // --- Client company & CLA state ---
  type ClientEntry = { id: string; name: string; industry?: string };
  const [clientCompanies, setClientCompanies] = useState<ClientEntry[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientCla, setClientCla] = useState<ClaRule | null>(null);
  const [claContext, setClaContext] = useState<string>('');
  // Manual field-of-work fallback (when client not in system)
  const [manualIndustry, setManualIndustry] = useState<string>('');
  const [manualCla, setManualCla] = useState<ClaRule | null>(null);

  const locale = resolveLocale(useLocale());
  const localeUi = UI_BY_LOCALE[locale];
  const outputLanguage = OUTPUT_LANGUAGE_BY_LOCALE[locale];
  const router = useRouter();

  const t = useTranslations('LegalAssistant');
  const { user } = useFirebase();
  const { toast } = useToast();
  const userAvatar = PlaceHolderImages.find(p => p.id === 'user-avatar');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && !userProfile) {
      const fetchUserProfile = async () => {
        try {
          const userDocRef = doc(firestore, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            setUserProfile(userDocSnap.data().profile as UserProfile);
          }
        } catch (error) {
          toast({ variant: "destructive", title: t('toast.profileError.title'), description: t('toast.profileError.description') });
        }
      };
      fetchUserProfile();
    }
  }, [user, userProfile, toast, t]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(firestore, 'users', user.uid, 'legalConversations'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const convos = querySnapshot.docs.map(doc => ({ id: doc.id, title: doc.data().title }));
      setConversations(convos);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user || !activeConversationId) { setMessages([]); return; }
    const unsub = onSnapshot(doc(firestore, 'users', user.uid, 'legalConversations', activeConversationId), (doc) => {
      if (doc.exists()) setMessages(doc.data().messages || []);
    });
    return () => unsub();
  }, [user, activeConversationId]);

  // --- Load client companies for this accounting firm ---
  useEffect(() => {
    if (!user) return;
    const loadClients = async () => {
      try {
        const userSnap = await getDoc(doc(firestore, 'users', user.uid));
        const firmCompanyId = userSnap.data()?.companyId;
        if (!firmCompanyId) return;
        const companiesSnap = await getDocs(
          query(collection(firestore, 'companies'), where('accountingFirmId', '==', firmCompanyId))
        );
        const list: ClientEntry[] = companiesSnap.docs.map(d => {
          const data = d.data();
          return { id: d.id, name: data.companyName || d.id, industry: data.industry || data.secteurActivite || '' };
        });
        setClientCompanies(list);
      } catch (err) {
        console.error('Error loading client companies:', err);
      }
    };
    loadClients();
  }, [user]);

  // --- Fetch CLA when client company changes ---
  useEffect(() => {
    if (!selectedClientId) { setClientCla(null); setClaContext(''); return; }
    const fetchClientCla = async () => {
      try {
        const compSnap = await getDoc(doc(firestore, 'companies', selectedClientId));
        if (!compSnap.exists()) return;
        const data = compSnap.data();
        if (data.cla?.id) {
          const rule = CLA_RULES.find(r => r.id === data.cla.id) || null;
          setClientCla(rule);
          if (rule) setClaContext(buildClaContextForAI(rule));
          else setClaContext('');
        } else {
          const industry = data.industry || data.secteurActivite || '';
          if (industry) {
            const resolved = resolveClaSafe(industry);
            setClientCla(resolved.cla);
            setClaContext(buildClaContextForAI(resolved.cla));
          }
        }
      } catch (err) {
        console.error('Error fetching client CLA:', err);
      }
    };
    fetchClientCla();
  }, [selectedClientId]);

  // --- Resolve CLA from manual field-of-work when no client is selected ---
  useEffect(() => {
    if (selectedClientId) return; // client selection takes precedence
    const trimmed = manualIndustry.trim();
    if (trimmed.length < 2) { setManualCla(null); setClaContext(''); return; }
    const resolved = resolveClaSafe(trimmed);
    setManualCla(resolved.cla);
    setClaContext(buildClaContextForAI(resolved.cla));
  }, [manualIndustry, selectedClientId]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
    setInput("");
    setFeedback({});
  };

  const firestoreTextSearch = async (
    searchText: string,
    options: { limit?: number }
  ): Promise<Array<{ documentId: string; title: string; chunkId: string; text: string; score: number }>> => {
    const normalizedQuery = normalizeText(searchText);
    const keywords = normalizedQuery.split(/\s+/).filter(k => k.length >= 2);
    if (keywords.length === 0) return [];

    const allChunks: Array<{ documentId: string; title: string; chunkId: string; text: string; docCanton: string }> = [];
    const docSnapshots = await getDocs(query(collection(firestore, 'legal_documents'), where('status', '==', 'Indexed')));

    for (const docSnap of docSnapshots.docs) {
      const docData = docSnap.data();
      const chunksSnapshot = await getDocs(collection(docSnap.ref, 'chunks'));
      chunksSnapshot.forEach(chunkSnap => {
        allChunks.push({ documentId: docSnap.id, title: docData.title, chunkId: chunkSnap.id, text: chunkSnap.data().text, docCanton: docData.canton });
      });
    }

    return allChunks
      .map(chunk => {
        let score = 0;
        const normalizedChunkText = normalizeText(chunk.text);
        const normalizedChunkTitle = normalizeText(chunk.title);

        for (const kw of keywords) {
          if (normalizedChunkText.includes(kw)) score += 1;
          if (normalizedChunkTitle.includes(kw)) score += 3;
        }

        if (normalizedChunkText.includes(normalizedQuery)) score += 5;

        return { ...chunk, score };
      })
      .filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit || 5);
  };

  const handleSend = async (overrideInput?: string) => {
    const trimmedInput = (overrideInput ?? input).trim();
    if (!trimmedInput || !user || !userProfile || isLoading) return;

    // Redirect document drafting requests to the dedicated document generator.
    const documentKeywords = [
      'generate', 'create', 'draft', 'write', 'make', 'prepare',
      'letter', 'document', 'template', 'resiliation', 'termination',
      'contract', 'agreement', 'notice', 'affiliation', 'demande',
    ];
    const inputLower = trimmedInput.toLowerCase();
    const wantsDocument = documentKeywords.some((kw) => inputLower.includes(kw));
    if (wantsDocument) {
      const docGenPath = `/${locale}/accounting-firm/document-generator`;
      toast({
        title: t('openingDocGen'),
        description: t('openingDocGenDesc'),
      });
      router.push(docGenPath);
      return;
    }

    // Require client or manual field-of-work before CLA-sensitive AI requests
    if (!selectedClientId && !manualIndustry.trim()) return;

    // Detect filing/task intent
    const intent = detectIntent(trimmedInput, locale);
    if (intent.type) {
      setDetectedAction(intent);
      setActionForm({
        subject: intent.subject,
        description: intent.description,
        priority: 'medium',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default: 1 week from now
      });
      setActionDialogOpen(true);
      return; // Don't send to AI, show action dialog instead
    }

    const userMessage: Message = { from: "user", text: trimmedInput, timestamp: new Date() };
    const currentInput = trimmedInput;
    setInput("");
    setIsLoading(true);
    let conversationId = activeConversationId;

    try {
      const conversationCollectionRef = collection(firestore, 'users', user.uid, 'legalConversations');

      if (!conversationId) {
        const newConversationDoc = await addDoc(conversationCollectionRef, {
          title: currentInput.substring(0, 50),
          messages: [userMessage],
          createdAt: serverTimestamp(),
        });
        conversationId = newConversationDoc.id;
        setActiveConversationId(conversationId);
      } else {
        await updateDoc(doc(firestore, 'users', user.uid, 'legalConversations', conversationId), {
          messages: arrayUnion(userMessage)
        });
      }

      let relevantChunks: Array<{ documentId: string; title: string; chunkId: string; text: string; score: number }> = [];
      let retrievalFailed = false;
      let retrievalWarning: string | null = null;
      try {
        relevantChunks = await firestoreTextSearch(currentInput, { limit: 5 });
      } catch (retrievalError: any) {
        retrievalFailed = true;
        console.error('Legal document retrieval failed:', retrievalError);
        retrievalWarning = retrievalError?.code === 'permission-denied'
          ? localeUi.restrictedKbWarning
          : localeUi.genericKbWarning;
      }

      const kbStatus = resolveKnowledgeBaseStatus(retrievalFailed, relevantChunks.length);
      const claBlock = claContext ? `[CLA / CCT applicable to the client company]\n${claContext}` : '';
      const context = buildLegalAssistantContext({
        claContext: claBlock || undefined,
        documentChunks: relevantChunks.map((c) => ({ title: c.title, text: c.text })),
        kbStatus,
      });

      const uniqueSources = relevantChunks.reduce((acc: { title: string; documentId: string }[], chunk) => {
        if (!chunk?.documentId) {
          return acc;
        }
        if (!acc.find(source => source.documentId === chunk.documentId)) {
          acc.push({
            title: chunk.title || 'Untitled source',
            documentId: chunk.documentId,
          });
        }
        return acc;
      }, []);

      const normalizedResponseSources = (response: any) =>
        Array.isArray(response?.sources)
          ? response.sources
              .filter((source: any) => source?.documentId)
              .map((source: any) => ({
                title: source?.title || localeUi.untitledSource,
                documentId: source.documentId,
              }))
          : [];

      const response = await legalQAAIAssistant({ query: currentInput, context, outputLanguage });
      const aiMessage: Message = {
        from: 'ai',
        text: response.answer,
        sources: uniqueSources.length > 0 ? uniqueSources : normalizedResponseSources(response),
        messageType: response.messageType ?? 'legal',
        timestamp: new Date()
      };

      await updateDoc(doc(firestore, 'users', user.uid, 'legalConversations', conversationId), {
        messages: arrayUnion(aiMessage)
      });

      if (retrievalWarning) {
        toast({
          title: localeUi.limitedSourceTitle,
          description: retrievalWarning,
        });
      }

    } catch (error) {
      console.error("AI Error:", error);
      const errorMessage: Message = { from: 'ai', text: t('errorMessage') };
      if (conversationId) {
        try {
          await updateDoc(doc(firestore, 'users', user.uid, 'legalConversations', conversationId), {
            messages: arrayUnion(errorMessage)
          });
        } catch (writeError) {
          console.error('Failed to save fallback error message:', writeError);
        }
      }
      toast({ variant: "destructive", title: t('toast.aiError.title'), description: t('toast.aiError.description') });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: t('toast.copied') });
  };

  const handleFeedback = (index: number, type: 'up' | 'down') => {
    setFeedback(prev => ({ ...prev, [index]: prev[index] === type ? undefined as any : type }));
    if (feedback[index] !== type) {
      toast({ title: type === 'up' ? localeUi.feedbackUp : localeUi.feedbackDown });
    }
  };

  // --- Handle filing/task action submission ---
  const handleSubmitAction = useCallback(async () => {
    if (!user || !selectedClientId) {
      toast({
        variant: 'destructive',
        title: t('clientRequired'),
        description: t('clientRequiredDesc'),
      });
      return;
    }

    const client = clientCompanies.find(c => c.id === selectedClientId);
    if (!client) return;

    setIsSubmittingAction(true);

    try {
      if (detectedAction.type === 'task_creation') {
        // Create a task in accounting_firm_tasks
        const userSnap = await getDoc(doc(firestore, 'users', user.uid));
        const firmId = userSnap.data()?.companyId || userSnap.data()?.accountingFirmId;

        await addDoc(collection(firestore, 'accounting_firm_tasks'), {
          title: actionForm.subject,
          description: actionForm.description,
          companyId: selectedClientId,
          companyName: client.name,
          firmId: firmId,
          priority: actionForm.priority,
          status: 'pending',
          dueDate: actionForm.dueDate,
          assignedBy: user.uid,
          createdAt: serverTimestamp(),
          source: 'ai_assistant',
        });

        toast({
          title: t('taskCreated'),
          description: t('taskCreatedDesc'),
        });
      } else if (detectedAction.type === 'document_filing') {
        // Create a document exchange
        const userSnap = await getDoc(doc(firestore, 'users', user.uid));
        const firmData = userSnap.data();

        await addDoc(collection(firestore, 'document_exchanges'), {
          senderId: user.uid,
          senderName: firmData?.firstName
            ? `${firmData.firstName} ${firmData.lastName || ''}`
            : user.email || 'Accounting Firm',
          senderRole: 'accounting',
          recipientId: selectedClientId,
          recipientName: client.name,
          recipientRole: 'business',
          subject: actionForm.subject,
          message: actionForm.description,
          type: 'document_filing',
          status: 'pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          source: 'ai_assistant',
        });

        toast({
          title: t('documentSent'),
          description: t('documentSentDesc'),
        });
      }

      setActionDialogOpen(false);
      setDetectedAction({ type: null, subject: '', description: '' });
      setInput('');
    } catch (error) {
      console.error('Action submission failed:', error);
      toast({
        variant: 'destructive',
        title: t('actionFailed'),
        description: t('actionFailedDesc'),
      });
    } finally {
      setIsSubmittingAction(false);
    }
  }, [user, selectedClientId, clientCompanies, detectedAction, actionForm, locale, toast]);

  const isEmpty = messages.length === 0 && !isLoading;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 h-[calc(100vh-8rem)]">
      <Card className="hidden lg:flex flex-col overflow-hidden border-border/60">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              {t('conversations')}
            </CardTitle>
          </div>
          <Button
            onClick={handleNewConversation}
            className="w-full mt-2 gap-2 bg-primary hover:bg-primary/90 text-white"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            {t('newChat')}
          </Button>
        </CardHeader>

        <CardContent className="flex-grow p-2 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-center px-4">
              <MessageSquare className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-xs">{localeUi.noConversations}</p>
            </div>
          ) : (
            <div className="space-y-1 mt-1">
              {conversations.map((convo) => (
                <button
                  key={convo.id}
                  onClick={() => setActiveConversationId(convo.id)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-150 truncate",
                    activeConversationId === convo.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {convo.title}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="flex flex-col h-full overflow-hidden border-border/60">
        <CardHeader className="py-3 px-5 border-b border-border/40 shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                <Scale className="h-4 w-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold leading-none">{t('title')}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{localeUi.assistantSubtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-[10px] text-green-600 border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800 dark:text-green-400 gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
                {localeUi.online}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => setMessages([])}
                disabled={isLoading || messages.length === 0}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Client company selector — accounting firm special rule */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2">
              <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Select value={selectedClientId ?? ''} onValueChange={(v) => { setSelectedClientId(v || null); if (v) setManualIndustry(''); }}>
                <SelectTrigger className="h-8 text-xs border-0 bg-transparent shadow-none flex-1">
                  <SelectValue placeholder={locale === 'fr' ? 'Sélectionnez une entreprise cliente...' : locale === 'de' ? 'Mandantenunternehmen wählen...' : 'Select client company...'} />
                </SelectTrigger>
                <SelectContent>
                  {clientCompanies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}{c.industry ? ` (${c.industry})` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {clientCla && (
                <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950/30 whitespace-nowrap">
                  CLA: {clientCla.name.substring(0, 30)}{clientCla.name.length > 30 ? '…' : ''}
                </Badge>
              )}
              {selectedClientId && !clientCla && (
                <Badge variant="outline" className="text-[10px] text-orange-600 border-orange-200 bg-orange-50 dark:bg-orange-950/30 whitespace-nowrap">
                  {locale === 'fr' ? 'Aucune CCT trouvée' : 'No CLA found'}
                </Badge>
              )}
            </div>
            {!selectedClientId && (
              <div className="flex items-center gap-2 px-1">
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {locale === 'fr' ? '— ou secteur d\'activité' : locale === 'de' ? '— oder Branche eingeben' : '— or field of work'}
                </span>
                <div className="relative flex-1">
                  <input
                    className="h-7 w-full rounded-md border border-input bg-background px-2.5 text-xs shadow-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder={locale === 'fr' ? 'ex: Hôtellerie, Construction…' : locale === 'de' ? 'z.B. Hotellerie, Bau…' : 'e.g. Hotel & Gastgewerbe, construction…'}
                    value={manualIndustry}
                    onChange={(e) => setManualIndustry(e.target.value)}
                    list="af-legal-industry-list"
                  />
                  <datalist id="af-legal-industry-list">
                    {CLA_RULES.flatMap(r => r.industries).map((alias, i) => (
                      <option key={i} value={alias} />
                    ))}
                  </datalist>
                </div>
                {manualCla && manualIndustry.trim().length >= 2 && (
                  <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 whitespace-nowrap">
                    CLA: {manualCla.name.substring(0, 25)}{manualCla.name.length > 25 ? '…' : ''}
                  </Badge>
                )}
              </div>
            )}
            {!selectedClientId && !manualIndustry.trim() && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 px-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                {locale === 'fr'
                  ? 'Sélectionnez un client ou précisez le secteur d\'activité pour activer l\'assistant CCT.'
                  : locale === 'de'
                  ? 'Wählen Sie einen Mandanten oder geben Sie die Branche ein, um den GAV-Assistenten zu aktivieren.'
                  : 'Select a client or specify the field of work to activate CLA-aware assistance.'}
              </p>
            )}
          </div>
        </CardHeader>

        <div ref={scrollAreaRef} className="flex-1 overflow-y-auto px-5 py-4">
          <div className="max-w-3xl mx-auto space-y-5">
            {isEmpty && (
              <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Scale className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-1">{t('placeholder.title')}</h3>
                <p className="text-muted-foreground text-sm mb-8 max-w-xs">{t('placeholder.subtitle')}</p>

                <div className="w-full max-w-lg">
                  {(!selectedClientId && !manualIndustry.trim()) && (
                    <div className="flex items-start gap-2.5 text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-4 py-3 border border-amber-200 dark:border-amber-800 mb-6">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span>
                        {locale === 'fr'
                          ? 'Sélectionnez une entreprise cliente dans l\'en-tête, ou précisez le secteur d\'activité, avant d\'utiliser l\'assistant.'
                          : locale === 'de'
                          ? 'Wählen Sie im Header ein Mandantenunternehmen oder geben Sie die Branche ein, bevor Sie den Assistenten verwenden.'
                          : 'Select a client company or specify the field of work in the header above before sending messages.'}
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">{localeUi.tryAsking}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {localeUi.quickSuggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => { setInput(s); handleSend(s); }}
                        disabled={!selectedClientId && !manualIndustry.trim()}
                        className="text-left text-sm px-4 py-3 rounded-xl border border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-all text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-border/60 disabled:hover:bg-transparent"
                      >
                        <Sparkles className="h-3 w-3 inline mr-1.5 text-primary opacity-60" />
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((msg, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-end gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
                  msg.from === "user" && "justify-end"
                )}
              >
                {msg.from === "ai" && (
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mb-1">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}

                <div className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-3 shadow-sm",
                  msg.from === "user"
                    ? "bg-primary text-white rounded-br-sm"
                    : "bg-muted/60 border border-border/40 rounded-bl-sm"
                )}>
                  {msg.from === 'ai' && msg.messageType && msg.messageType !== 'greeting' && (
                    <div className="mb-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-1.5 py-0",
                          msg.messageType === 'legal' && "text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950/30",
                          msg.messageType === 'conversational' && "text-purple-600 border-purple-200 bg-purple-50 dark:bg-purple-950/30",
                          msg.messageType === 'clarification' && "text-orange-600 border-orange-200 bg-orange-50 dark:bg-orange-950/30",
                        )}
                      >
                        {msg.messageType === 'legal' && localeUi.legalBadge}
                        {msg.messageType === 'conversational' && localeUi.generalBadge}
                        {msg.messageType === 'clarification' && localeUi.clarificationBadge}
                      </Badge>
                    </div>
                  )}

                  {msg.from === 'ai' ? (
                    <RenderAnswer text={msg.text} />
                  ) : (
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                  )}

                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/30">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                        {t('sources')}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.sources.map((source, idx) => (
                          <span
                            key={source.documentId}
                            className="inline-flex items-center text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-md font-medium"
                          >
                            [{idx + 1}] {source.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {msg.from === 'ai' && (
                    <div className="flex items-center gap-0.5 mt-2 -mx-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => handleCopyToClipboard(msg.text)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn("h-7 w-7", feedback[index] === 'up' ? "text-green-500" : "text-muted-foreground hover:text-green-500")}
                        onClick={() => handleFeedback(index, 'up')}
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn("h-7 w-7", feedback[index] === 'down' ? "text-red-500" : "text-muted-foreground hover:text-red-500")}
                        onClick={() => handleFeedback(index, 'down')}
                      >
                        <ThumbsDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                {msg.from === "user" && (
                  <Avatar className="h-8 w-8 flex-shrink-0 mb-1">
                    {userAvatar && <AvatarImage src={userAvatar.imageUrl} alt="User" data-ai-hint={userAvatar.imageHint} />}
                    <AvatarFallback className="text-xs bg-secondary">{userProfile?.firstName?.[0] || <User className="h-4 w-4" />}</AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-end gap-3 animate-in fade-in duration-200">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-muted/60 border border-border/40 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 bg-primary/50 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="h-2 w-2 bg-primary/50 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="h-2 w-2 bg-primary/50 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <CardFooter className="p-4 border-t border-border/40 bg-background shrink-0">
          <div className="max-w-3xl mx-auto w-full">
            <div className="relative flex items-center gap-2 bg-muted/40 border border-border/60 rounded-xl px-3 py-1.5 focus-within:border-primary/50 focus-within:bg-background transition-all">
              <Input
                placeholder={t('inputPlaceholder')}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                className="border-0 bg-transparent shadow-none focus-visible:ring-0 px-1 py-1 text-sm placeholder:text-muted-foreground/60"
                disabled={isLoading}
              />
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" disabled={isLoading}>
                  <Mic className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSend()}
                  disabled={isLoading || !input.trim() || (!selectedClientId && !manualIndustry.trim())}
                  className="h-8 px-3 gap-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg"
                >
                  <Send className="h-3.5 w-3.5" />
                  {t('send')}
                </Button>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              {localeUi.disclaimer}
            </p>
          </div>
        </CardFooter>
      </Card>

      {/* Action Detection Dialog (Document Filing / Task Creation) */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {detectedAction.type === 'task_creation' ? (
                <><ClipboardList className="h-5 w-5 text-primary" /> {locale === 'fr' ? 'Créer une tâche' : 'Create Task'}</>
              ) : (
                <><FileText className="h-5 w-5 text-primary" /> {locale === 'fr' ? 'Envoyer un document' : 'Send Document'}</>
              )}
            </DialogTitle>
            <DialogDescription>
              {detectedAction.type === 'task_creation'
                ? (locale === 'fr' ? 'Il semble que vous souhaitez créer une tâche.' : 'It looks like you want to create a task.')
                : (locale === 'fr' ? 'Il semble que vous souhaitez envoyer un document.' : 'It looks like you want to send a document.')
              }
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Client Info */}
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {selectedClientId
                  ? clientCompanies.find(c => c.id === selectedClientId)?.name
                  : (locale === 'fr' ? 'Aucun client sélectionné' : 'No client selected')
                }
              </span>
              {!selectedClientId && (
                <Badge variant="destructive" className="ml-auto text-xs">
                  {locale === 'fr' ? 'Requis' : 'Required'}
                </Badge>
              )}
            </div>

            {/* Subject */}
            <div className="grid gap-2">
              <Label htmlFor="action-subject">{locale === 'fr' ? 'Sujet' : 'Subject'}</Label>
              <Input
                id="action-subject"
                value={actionForm.subject}
                onChange={(e) => setActionForm(prev => ({ ...prev, subject: e.target.value }))}
                placeholder={locale === 'fr' ? 'Titre ou sujet' : 'Title or subject'}
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="action-description">{locale === 'fr' ? 'Description' : 'Description'}</Label>
              <Textarea
                id="action-description"
                value={actionForm.description}
                onChange={(e) => setActionForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder={locale === 'fr' ? 'Détails supplémentaires...' : 'Additional details...'}
                rows={3}
              />
            </div>

            {/* Task-specific fields */}
            {detectedAction.type === 'task_creation' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="action-priority">{locale === 'fr' ? 'Priorité' : 'Priority'}</Label>
                  <Select
                    value={actionForm.priority}
                    onValueChange={(val) => setActionForm(prev => ({ ...prev, priority: val as typeof actionForm.priority }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{locale === 'fr' ? 'Basse' : 'Low'}</SelectItem>
                      <SelectItem value="medium">{locale === 'fr' ? 'Moyenne' : 'Medium'}</SelectItem>
                      <SelectItem value="high">{locale === 'fr' ? 'Haute' : 'High'}</SelectItem>
                      <SelectItem value="urgent">{locale === 'fr' ? 'Urgente' : 'Urgent'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="action-due">{locale === 'fr' ? 'Date limite' : 'Due Date'}</Label>
                  <Input
                    id="action-due"
                    type="date"
                    value={actionForm.dueDate}
                    onChange={(e) => setActionForm(prev => ({ ...prev, dueDate: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              {locale === 'fr' ? 'Annuler' : 'Cancel'}
            </Button>
            <Button onClick={handleSubmitAction} disabled={isSubmittingAction || !selectedClientId}>
              {isSubmittingAction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {detectedAction.type === 'task_creation'
                ? (locale === 'fr' ? 'Créer tâche' : 'Create Task')
                : (locale === 'fr' ? 'Envoyer' : 'Send')
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}