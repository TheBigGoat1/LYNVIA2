"use client"

import { useState, useEffect, useRef, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Copy, Mic, Plus, Send, ThumbsDown, ThumbsUp, Trash2, User, MessageSquare, Scale, Sparkles, FileText, CheckCircle2, Loader2, Eye, SendHorizonal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFirebase } from "@/firebase/firebase-provider";
import { useToast } from "@/hooks/use-toast";
import { doc, getDoc, addDoc, collection, serverTimestamp, query, orderBy, onSnapshot, updateDoc, arrayUnion, where, getDocs, Query } from "firebase/firestore";
import { firestore } from "@/firebase/config";
import { legalQAAIAssistant } from "@/ai/flows/legal-qa-assistant";
import { aiDocumentGenerator } from "@/ai/flows/ai-document-generator-flow";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { type ClaRule, buildClaContextForAI } from "@/lib/cla-rules";
import {
  detectDocumentIntent,
  buildFieldCollectionPrompt,
  buildTemplateListForAI,
  getTemplateFields,
  extractFieldsFromMessage,
  autoFillCompanyFields,
  type FieldInfo,
} from "@/lib/document-chat-helpers";
import { type Template } from "@/data/company-document-templates";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { notifyAdmin } from '@/lib/admin-notifications';
import {
  buildLegalAssistantContext,
  resolveKnowledgeBaseStatus,
} from '@/lib/legal-assistant-knowledge-base';
import {
  buildSearchIndex,
  fastSearch,
  updateSearchIndex,
  getMissingKeywords,
  type SearchIndex,
  type IndexedChunk,
} from '@/lib/legal-assistant-search-index';

// ─── Document generation session state (persisted in component, not Firestore) ──
type DocGenSession = {
  active: boolean;
  template: Template | null;
  collectedFields: Record<string, string>;
  lastAskedField?: string;
  generatedContent?: string;
  submittedForReview?: boolean;
};

const INITIAL_DOC_SESSION: DocGenSession = {
  active: false,
  template: null,
  collectedFields: {},
};

type Message = {
  from: 'user' | 'ai';
  text: string;
  sources?: { title: string; documentId: string }[];
  messageType?: 'greeting' | 'legal' | 'conversational' | 'clarification' | 'document';
  timestamp?: Date;
  // Document-specific fields (only when messageType === 'document')
  documentContent?: string;
  documentTitle?: string;
  templateId?: string;
  reviewStatus?: 'draft' | 'submitted' | 'approved' | 'rejected';
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
  companyId?: string;
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
          // Handle italic: *text* (but not **)
          const italicRegex = /(?<!\*)\*(?!\*)(.+?)\*(?!\*)/g;

          let result: React.ReactNode[] = [str];
          // Process bold
          const boldParts: React.ReactNode[] = [];
          let lastIndex = 0;
          let match;
          while ((match = boldRegex.exec(str)) !== null) {
            if (match.index > lastIndex) {
              boldParts.push(str.slice(lastIndex, match.index));
            }
            boldParts.push(<strong key={`b-${match.index}`} className="font-semibold text-foreground">{match[1]}</strong>);
            lastIndex = match.index + match[0].length;
          }
          if (lastIndex < str.length) {
            boldParts.push(str.slice(lastIndex));
          }
          return <>{boldParts.map((part, j) => <span key={j}>{part}</span>)}</>;
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

const OUTPUT_LANGUAGE_BY_LOCALE: Record<SupportedLocale, string> = {
  en: 'English',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  es: 'Spanish',
};

const UI_BY_LOCALE: Record<SupportedLocale, {
  businessAssistantTitle: string;
  assistantSubtitle: string;
  assistantSubtitleBusiness: string;
  placeholderTitleBusiness: string;
  placeholderSubtitleBusiness: string;
  inputPlaceholderBusiness: string;
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
    businessAssistantTitle: 'Business Legal AI Assistant',
    assistantSubtitle: 'Swiss Legal & Financial Assistant',
    assistantSubtitleBusiness: 'Swiss Business Legal & CLA Assistant',
    placeholderTitleBusiness: 'Business Legal Assistant',
    placeholderSubtitleBusiness: 'Ask about CLA minimum wages, notice periods, contracts, and Swiss employment compliance.',
    inputPlaceholderBusiness: 'Ask about salary minima, notice periods, or CLA rules...',
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
    businessAssistantTitle: 'Assistant IA juridique entreprise',
    assistantSubtitle: 'Assistant juridique et financier suisse',
    assistantSubtitleBusiness: 'Assistant juridique suisse pour entreprises & CCT',
    placeholderTitleBusiness: 'Assistant juridique pour entreprises',
    placeholderSubtitleBusiness: 'Posez des questions sur les salaires minimaux CCT, les delais de conge, les contrats et la conformite en Suisse.',
    inputPlaceholderBusiness: 'Posez une question sur les salaires, delais de conge ou regles CCT...',
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
    businessAssistantTitle: 'KI-Rechtsassistent fur Unternehmen',
    assistantSubtitle: 'Schweizer Rechts- und Finanzassistent',
    assistantSubtitleBusiness: 'Schweizer Rechtsassistent fur Unternehmen & GAV',
    placeholderTitleBusiness: 'Rechtsassistent fur Unternehmen',
    placeholderSubtitleBusiness: 'Fragen Sie zu GAV-Mindestlohnen, Kundigungsfristen, Vertragen und Schweizer Compliance.',
    inputPlaceholderBusiness: 'Fragen Sie nach Mindestlohn, Kundigungsfrist oder GAV-Regeln...',
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
    businessAssistantTitle: 'Assistente IA legale aziendale',
    assistantSubtitle: 'Assistente legale e finanziario svizzero',
    assistantSubtitleBusiness: 'Assistente legale svizzero per aziende e CCL',
    placeholderTitleBusiness: 'Assistente legale per aziende',
    placeholderSubtitleBusiness: 'Chiedi di salari minimi CCL, periodi di preavviso, contratti e conformita svizzera.',
    inputPlaceholderBusiness: 'Fai una domanda su salari minimi, preavviso o regole CCL...',
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
    businessAssistantTitle: 'Asistente legal IA para empresas',
    assistantSubtitle: 'Asistente legal y financiero suizo',
    assistantSubtitleBusiness: 'Asistente legal suizo para empresas y CCT',
    placeholderTitleBusiness: 'Asistente legal para empresas',
    placeholderSubtitleBusiness: 'Pregunta sobre salarios minimos CCT, periodos de preaviso, contratos y cumplimiento suizo.',
    inputPlaceholderBusiness: 'Pregunta sobre salarios minimos, preaviso o reglas CCT...',
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
  const [claContext, setClaContext] = useState<string>("");
  // Document-in-chat state
  const [docSession, setDocSession] = useState<DocGenSession>(INITIAL_DOC_SESSION);
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewDocIndex, setReviewDocIndex] = useState<number | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [companyProfile, setCompanyProfile] = useState<Record<string, string> | null>(null);
  const [searchIndex, setSearchIndex] = useState<SearchIndex | null>(null);
  const [isIndexingDocuments, setIsIndexingDocuments] = useState(false);

  const locale = resolveLocale(useLocale());
  const pathname = usePathname();
  const router = useRouter();
  const isBusinessAssistant = pathname?.includes('/business/legal-assistant');
  const localeUi = UI_BY_LOCALE[locale];
  const outputLanguage = OUTPUT_LANGUAGE_BY_LOCALE[locale];
  const t = useTranslations('LegalAssistant');
  const assistantTitle = isBusinessAssistant ? localeUi.businessAssistantTitle : t('title');
  const assistantSubtitle = isBusinessAssistant
    ? localeUi.assistantSubtitleBusiness
    : localeUi.assistantSubtitle;
  const placeholderTitle = isBusinessAssistant
    ? localeUi.placeholderTitleBusiness
    : t('placeholder.title');
  const placeholderSubtitle = isBusinessAssistant
    ? localeUi.placeholderSubtitleBusiness
    : t('placeholder.subtitle');
  const inputPlaceholder = isBusinessAssistant
    ? localeUi.inputPlaceholderBusiness
    : t('inputPlaceholder');
  const quickSuggestions = isBusinessAssistant
    ? {
        en: [
          'What is the CLA minimum wage for a qualified construction worker?',
          'Is 1 month notice valid after 5 years of service?',
          'What CLA applies to a hospitality business in Geneva?',
          'Draft a compliant termination checklist for my company.',
        ],
        fr: [
          'Quel est le salaire minimum CCT pour un ouvrier qualifie en construction ?',
          'Un delai de conge de 1 mois est-il valide apres 5 ans de service ?',
          'Quelle CCT s\'applique a une entreprise hoteliere a Geneve ?',
          'Genere une checklist de licenciement conforme pour mon entreprise.',
        ],
        de: [
          'Wie hoch ist der GAV-Mindestlohn fur einen qualifizierten Bauarbeiter?',
          'Ist eine Kundigungsfrist von 1 Monat nach 5 Dienstjahren zulassig?',
          'Welcher GAV gilt fur ein Gastgewerbe in Genf?',
          'Erstelle eine konforme Checkliste fur Kundigungen in meinem Unternehmen.',
        ],
        it: [
          'Qual e il salario minimo CCL per un operaio qualificato in edilizia?',
          'Un preavviso di 1 mese e valido dopo 5 anni di servizio?',
          'Quale CCL si applica a un\'azienda alberghiera a Ginevra?',
          'Genera una checklist di licenziamento conforme per la mia azienda.',
        ],
        es: [
          'Cual es el salario minimo CCT para un obrero calificado de construccion?',
          'Es valido 1 mes de preaviso tras 5 anos de servicio?',
          'Que CCT aplica a un negocio de hosteleria en Ginebra?',
          'Genera una lista de verificacion de despido conforme para mi empresa.',
        ],
      }[locale]
    : localeUi.quickSuggestions;

  const { user } = useFirebase();
  const { toast } = useToast();
  const userAvatar = PlaceHolderImages.find(p => p.id === 'user-avatar');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

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
    const fetchCla = async () => {
      try {
        const userDocSnap = await getDoc(doc(firestore, "users", user.uid));
        const companyId = userDocSnap.data()?.companyId;
        if (!companyId) {
          setClaContext("");
          return;
        }

        const companyDocSnap = await getDoc(doc(firestore, "companies", companyId));
        const cla = companyDocSnap.data()?.cla as ClaRule | undefined;
        setClaContext(cla ? buildClaContextForAI(cla) : "");
      } catch (error) {
        console.error("Failed to load CLA context:", error);
        setClaContext("");
      }
    };

    fetchCla();
  }, [user]);

  // Fetch company profile for auto-filling document fields (business users)
  useEffect(() => {
    if (!user || !isBusinessAssistant) return;
    const fetchCompany = async () => {
      try {
        const userDocSnap = await getDoc(doc(firestore, "users", user.uid));
        const companyId = userDocSnap.data()?.companyId;
        if (!companyId) return;
        const companyDocSnap = await getDoc(doc(firestore, "companies", companyId));
        if (companyDocSnap.exists()) {
          const data = companyDocSnap.data();
          setCompanyProfile(autoFillCompanyFields({
            companyName: data.companyName || data.name,
            companyAddress: data.address,
            companyPostalCode: data.postalCode,
            companyCity: data.city,
            companyIDE: data.ide,
            canton: data.canton,
          }));
        }
      } catch { /* ignore */ }
    };
    fetchCompany();
  }, [user, isBusinessAssistant]);

  // Build search index on mount - only rebuild if not already built
  useEffect(() => {
    const buildIndex = async () => {
      if (!user || searchIndex !== null) return; // Skip if already built
      setIsIndexingDocuments(true);
      try {
        // Fetch ALL legal documents (case-insensitive status check)
        const docSnapshots = await getDocs(collection(firestore, 'legal_documents'));
        const documents = await Promise.all(
          docSnapshots.docs
            .filter(docSnap => {
              const status = docSnap.data().status;
              return status && status.toLowerCase() === 'indexed';
            })
            .map(async (docSnap) => {
              const docData = docSnap.data();
              const chunksSnapshot = await getDocs(collection(docSnap.ref, 'chunks'));
              const chunks = chunksSnapshot.docs.map(chunkSnap => ({
                chunkId: chunkSnap.id,
                text: chunkSnap.data().text,
                docCanton: docData.canton,
              }));
              return { documentId: docSnap.id, title: docData.title, chunks };
            })
        );
        console.log(`Search index built: ${documents.length} documents, ${documents.reduce((sum, d) => sum + d.chunks.length, 0)} chunks`);
        if (documents.length === 0) {
          console.warn('No indexed documents found! Check Firestore status field.');
        }
        const index = await buildSearchIndex(() => Promise.resolve(documents));
        setSearchIndex(index);
      } catch (error) {
        console.error('Failed to build search index:', error);
      } finally {
        setIsIndexingDocuments(false);
      }
    };
    buildIndex();
  }, [user, searchIndex]);

  // ─── Document generation handlers ──────────────────────────────────────────

  const startDocSession = useCallback((template: Template) => {
    const autoFields = companyProfile ? { ...companyProfile } : {};
    setDocSession({
      active: true,
      template,
      collectedFields: autoFields,
    });
  }, [companyProfile]);

  const resetDocSession = useCallback(() => {
    setDocSession(INITIAL_DOC_SESSION);
  }, []);

  const generateDocumentFromChat = useCallback(async (
    template: Template,
    fields: Record<string, string>,
    conversationId: string | null,
  ) => {
    setIsGeneratingDoc(true);
    try {
      const result = await aiDocumentGenerator({
        templateType: template.title,
        templateText: template.templateText,
        formData: fields,
        canton: fields.canton,
        legalContext: claContext || undefined,
        outputLanguage: outputLanguage,
      });

      const docMessage: Message = {
        from: 'ai',
        text: `**${template.title}** has been generated. You can preview it below and submit it for admin review.`,
        messageType: 'document',
        documentContent: result.documentContent,
        documentTitle: template.title,
        templateId: template.id,
        reviewStatus: 'draft',
        timestamp: new Date(),
      };

      if (conversationId && user) {
        await updateDoc(doc(firestore, 'users', user.uid, 'legalConversations', conversationId), {
          messages: arrayUnion(docMessage),
        });
      }

      // Warnings from the AI
      if (result.warnings && result.warnings.length > 0) {
        toast({
          title: 'Document warnings',
          description: result.warnings.join('; '),
        });
      }

      setDocSession(prev => ({
        ...prev,
        generatedContent: result.documentContent,
        active: false,
      }));
    } catch (error) {
      console.error('Document generation failed:', error);
      toast({ variant: 'destructive', title: t('toast.generationFailed.title'), description: t('toast.generationFailed.description') });
    } finally {
      setIsGeneratingDoc(false);
    }
  }, [user, claContext, toast]);

  const handleSubmitForReview = useCallback(async (messageIndex: number) => {
    const msg = messages[messageIndex];
    if (!msg?.documentContent || !user) return;

    setIsSubmittingReview(true);
    try {
      // Write to document_exchanges for admin review
      const exchangeData = {
        senderId: user.uid,
        senderName: userProfile?.firstName
          ? `${userProfile.firstName} ${userProfile.lastName || ''}`
          : user.email || 'Client',
        recipientId: 'admin',
        recipientName: 'Lynvia Admin',
        recipientEmail: '',
        recipientRole: isBusinessAssistant ? 'business' : 'individual',
        subject: `Document Review: ${msg.documentTitle || 'Generated Document'}`,
        message: `Generated via AI Chat — ${msg.templateId || 'custom'}`,
        type: 'document_review',
        status: 'pending_review',
        documentContent: msg.documentContent,
        documentTitle: msg.documentTitle,
        templateId: msg.templateId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(firestore, 'document_exchanges'), exchangeData);

      // Notify all admins
      notifyAdmin({
        title: 'Document submitted for review',
        description: `${exchangeData.senderName} submitted "${msg.documentTitle}" for review`,
        type: 'document_review',
        link: '/admin/document-exchange',
        clientId: user.uid,
        clientName: user.displayName || user.email || 'Unknown',
      });

      // Update the message in the conversation to mark as submitted
      if (activeConversationId) {
        const updatedMessages = [...messages];
        updatedMessages[messageIndex] = { ...msg, reviewStatus: 'submitted' };
        await updateDoc(doc(firestore, 'users', user.uid, 'legalConversations', activeConversationId), {
          messages: updatedMessages,
        });
      }

      toast({ title: t('toast.submittedForReview.title'), description: t('toast.submittedForReview.description') });
      setReviewDialogOpen(false);
    } catch (error) {
      console.error('Submit for review failed:', error);
      toast({ variant: 'destructive', title: t('toast.submitFailed.title'), description: t('toast.submitFailed.description') });
    } finally {
      setIsSubmittingReview(false);
    }
  }, [messages, user, userProfile, isBusinessAssistant, activeConversationId, toast]);

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
    resetDocSession();
  };

    const firestoreTextSearch = async (
    searchText: string,
    options: { limit?: number }
  ): Promise<Array<{ documentId: string; title: string; chunkId: string; text: string; score: number }>> => {
    if (!searchIndex) {
      return [];
    }

    const results = fastSearch(searchIndex, searchText, options);
    
    if (results.length > 0) {
      return results;
    }

    const missingKeywords = getMissingKeywords(searchIndex, searchText);
    if (missingKeywords.length === 0) {
      return [];
    }

    return [];
  };

  const handleSend = async (overrideInput?: string) => {
    const trimmedInput = (overrideInput ?? input).trim();
    if (!trimmedInput || !user || isLoading) return;

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

      // ─── DOCUMENT GENERATION FLOW ─────────────────────────────────────
      // Case 1: Active document session — collecting fields
      if (docSession.active && docSession.template) {
        const extracted = extractFieldsFromMessage(
          currentInput,
          docSession.template,
          docSession.collectedFields,
          docSession.lastAskedField,
        );
        const updatedFields = { ...docSession.collectedFields, ...extracted };
        const fields = getTemplateFields(docSession.template);
        const missing = fields.filter(f => f.required && !updatedFields[f.name]);

        if (missing.length === 0) {
          // All fields collected — generate the document
          const aiMessage: Message = {
            from: 'ai',
            text: 'All information collected. Generating your document now...',
            messageType: 'conversational',
            timestamp: new Date(),
          };
          await updateDoc(doc(firestore, 'users', user.uid, 'legalConversations', conversationId!), {
            messages: arrayUnion(aiMessage),
          });
          setDocSession(prev => ({ ...prev, collectedFields: updatedFields }));
          setIsLoading(false);
          await generateDocumentFromChat(docSession.template, updatedFields, conversationId);
          return;
        }

        // Still need more fields — ask for the next one
        const nextField = missing[0];
        setDocSession(prev => ({
          ...prev,
          collectedFields: updatedFields,
          lastAskedField: nextField.name,
        }));

        const prompt = buildFieldCollectionPrompt(docSession.template, updatedFields);
        const response = await legalQAAIAssistant({ query: prompt, context: claContext, outputLanguage });
        const aiMessage: Message = {
          from: 'ai',
          text: response.answer,
          messageType: 'conversational',
          timestamp: new Date(),
        };
        await updateDoc(doc(firestore, 'users', user.uid, 'legalConversations', conversationId!), {
          messages: arrayUnion(aiMessage),
        });
        setIsLoading(false);
        return;
      }

      // Case 2: Check if this is a new document generation request
      // For individuals: redirect to Document Generator
      if (!isBusinessAssistant) {
        const documentKeywords = [
          'generate', 'create', 'draft', 'write', 'make', 'prepare',
          'letter', 'document', 'template', 'résiliation', 'resiliation',
          'affiliation', 'termination', 'cancellation', 'insurance', 'assurance',
          'contrat', 'contract', 'bail', 'lease', 'demande', 'request',
          'i need', 'need a', 'need an', 'besoin', 'besoin d', 'cherche', 'suche', 'necesito',
          'kündigung', 'kuendigung', 'kindigung', 'annulation',
        ];
        const inputLower = currentInput.toLowerCase();
        const docWordBoundaryIntent =
          /\b(letters?|documents?|pdf|templates?|résiliation|resiliation|kuendigung|kündigung|kindigung|kündigen|rescind)\b/i.test(
            currentInput,
          );
        const wantsDocument =
          documentKeywords.some((kw) => inputLower.includes(kw)) || docWordBoundaryIntent;
        
        if (wantsDocument) {
          const docGenPath = `/${locale}/individual/document-generator`;
          await updateDoc(doc(firestore, 'users', user.uid, 'legalConversations', conversationId), {
            updatedAt: serverTimestamp(),
          });

          toast({
            title: 'Opening Document Generator',
            description: 'We moved you directly to the document generator to create your document faster.',
          });

          setIsLoading(false);
          router.push(docGenPath);
          return;
        }
      }

      if (isBusinessAssistant) {
        const intent = detectDocumentIntent(currentInput);
        if (intent.detected) {
          if (intent.matchedTemplate) {
            // Start field collection for matched template
            startDocSession(intent.matchedTemplate);
            const autoFields = companyProfile ? { ...companyProfile } : {};
            const fields = getTemplateFields(intent.matchedTemplate);
            const missing = fields.filter(f => f.required && !autoFields[f.name]);

            if (missing.length === 0) {
              // All auto-filled — generate immediately
              const aiMessage: Message = {
                from: 'ai',
                text: `Generating **${intent.matchedTemplate.title}** with your company details...`,
                messageType: 'conversational',
                timestamp: new Date(),
              };
              await updateDoc(doc(firestore, 'users', user.uid, 'legalConversations', conversationId!), {
                messages: arrayUnion(aiMessage),
              });
              setIsLoading(false);
              await generateDocumentFromChat(intent.matchedTemplate, autoFields, conversationId);
              return;
            }

            // Need fields — start conversational collection
            const nextField = missing[0];
            setDocSession(prev => ({ ...prev, lastAskedField: nextField.name }));
            const prompt = buildFieldCollectionPrompt(intent.matchedTemplate, autoFields);
            const response = await legalQAAIAssistant({ query: prompt, context: claContext, outputLanguage });
            const aiMessage: Message = {
              from: 'ai',
              text: `I'll help you generate a **${intent.matchedTemplate.title}**.\n\n${response.answer}`,
              messageType: 'conversational',
              timestamp: new Date(),
            };
            await updateDoc(doc(firestore, 'users', user.uid, 'legalConversations', conversationId!), {
              messages: arrayUnion(aiMessage),
            });
            setIsLoading(false);
            return;
          } else {
            // Intent detected but no specific template matched — show template list
            const templateList = buildTemplateListForAI();
            const response = await legalQAAIAssistant({
              query: `The user wants to generate a document. Here are the available templates:\n\n${templateList}\n\nBased on their request: "${currentInput}", suggest the most relevant template(s) and ask them to confirm which one they want.`,
              context: claContext,
              outputLanguage,
            });
            const aiMessage: Message = {
              from: 'ai',
              text: response.answer,
              messageType: 'conversational',
              timestamp: new Date(),
            };
            await updateDoc(doc(firestore, 'users', user.uid, 'legalConversations', conversationId!), {
              messages: arrayUnion(aiMessage),
            });
            setIsLoading(false);
            return;
          }
        }
      }

      // ─── NORMAL LEGAL Q&A FLOW ────────────────────────────────────────
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
      const context = buildLegalAssistantContext({
        claContext: claContext || undefined,
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
        <CardHeader className="flex flex-row items-center justify-between py-3 px-5 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
              <Scale className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold leading-none">{assistantTitle}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{assistantSubtitle}</p>
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
        </CardHeader>

        <div ref={scrollAreaRef} className="flex-1 overflow-y-auto px-5 py-4">
          <div className="max-w-3xl mx-auto space-y-5">
            {isEmpty && (
              <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Scale className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-1">{placeholderTitle}</h3>
                <p className="text-muted-foreground text-sm mb-8 max-w-xs">{placeholderSubtitle}</p>

                <div className="w-full max-w-lg">
                  <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">{localeUi.tryAsking}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {quickSuggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => { setInput(s); handleSend(s); }}
                        className="text-left text-sm px-4 py-3 rounded-xl border border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-all text-muted-foreground hover:text-foreground"
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
                  {msg.from === 'ai' && msg.messageType && msg.messageType !== 'greeting' && msg.messageType !== 'document' && (
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

                  {/* ─── Document Bubble ──────────────────────────────────── */}
                  {msg.messageType === 'document' && msg.documentContent && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30">
                          <FileText className="h-3 w-3 mr-1" />
                          Generated Document
                        </Badge>
                        {msg.reviewStatus === 'submitted' && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-blue-600 border-blue-200 bg-blue-50">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Submitted for Review
                          </Badge>
                        )}
                      </div>

                      <div className="bg-white dark:bg-zinc-900 border border-border rounded-lg p-4 max-h-64 overflow-y-auto text-xs leading-relaxed whitespace-pre-wrap font-mono">
                        {msg.documentContent.substring(0, 2000)}
                        {msg.documentContent.length > 2000 && '\n\n... (truncated preview)'}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1.5"
                          onClick={() => handleCopyToClipboard(msg.documentContent!)}
                        >
                          <Copy className="h-3 w-3" />
                          Copy Full Document
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1.5"
                          onClick={() => {
                            setReviewDocIndex(index);
                            setReviewDialogOpen(true);
                          }}
                        >
                          <Eye className="h-3 w-3" />
                          Preview
                        </Button>
                        {msg.reviewStatus !== 'submitted' && (
                          <Button
                            size="sm"
                            className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => {
                              setReviewDocIndex(index);
                              setReviewDialogOpen(true);
                            }}
                          >
                            <Send className="h-3 w-3" />
                            Submit for Admin Review
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {msg.from === 'ai' && msg.messageType !== 'document' ? (
                    <RenderAnswer text={msg.text} />
                  ) : msg.from === 'user' ? (
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                  ) : msg.messageType !== 'document' ? (
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                  ) : null}

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
            <div className="relative flex items-end gap-2 bg-muted/40 border border-border/60 rounded-xl px-3 py-1.5 focus-within:border-primary/50 focus-within:bg-background transition-all">
              <Textarea
                ref={composerRef}
                placeholder={inputPlaceholder}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={1}
                className="min-h-0 h-9 max-h-40 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 px-1 py-1 text-sm leading-5 placeholder:text-muted-foreground/60"
                disabled={isLoading}
              />
              <div className="flex items-center gap-1 flex-shrink-0 pb-0.5">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" disabled={isLoading}>
                  <Mic className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSend()}
                  disabled={isLoading || !input.trim()}
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

      {/* ─── Document Review Dialog ────────────────────────────────────── */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {reviewDocIndex !== null && messages[reviewDocIndex]?.documentTitle
                ? messages[reviewDocIndex].documentTitle
                : 'Document Preview'}
            </DialogTitle>
            <DialogDescription>
              Review the generated document below. Submit it for admin review when ready.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto bg-white dark:bg-zinc-900 border rounded-lg p-6 text-sm leading-relaxed whitespace-pre-wrap">
            {reviewDocIndex !== null && messages[reviewDocIndex]?.documentContent
              ? messages[reviewDocIndex].documentContent
              : 'No document content.'}
          </div>
          <DialogFooter className="flex-shrink-0 gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (reviewDocIndex !== null && messages[reviewDocIndex]?.documentContent) {
                  handleCopyToClipboard(messages[reviewDocIndex].documentContent!);
                }
              }}
              className="gap-1.5"
            >
              <Copy className="h-4 w-4" />
              Copy
            </Button>
            {reviewDocIndex !== null && messages[reviewDocIndex]?.reviewStatus !== 'submitted' && (
              <Button
                onClick={() => reviewDocIndex !== null && handleSubmitForReview(reviewDocIndex)}
                disabled={isSubmittingReview}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isSubmittingReview ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Submitting...</>
                ) : (
                  <><Send className="h-4 w-4" />Submit for Admin Review</>
                )}
              </Button>
            )}
            {reviewDocIndex !== null && messages[reviewDocIndex]?.reviewStatus === 'submitted' && (
              <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-3 py-1.5">
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Submitted for Review
              </Badge>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}