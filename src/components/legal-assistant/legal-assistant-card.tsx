'use client';

import { Fragment, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Bot, Loader2, Send, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase/firebase-provider';
import {
  legalQAAIAssistant,
  type LegalQAOutput,
} from '@/ai/flows/legal-qa-assistant';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { firestore } from '@/firebase/config';
import { collection, getDocs, query as firestoreQuery, where } from 'firebase/firestore';
import {
  buildLegalAssistantContext,
  resolveKnowledgeBaseStatus,
} from '@/lib/legal-assistant-knowledge-base';

const languageOptions = [
  { value: 'English', labelKey: 'langEnglish' },
  { value: 'German', labelKey: 'langGerman' },
  { value: 'French', labelKey: 'langFrench' },
  { value: 'Italian', labelKey: 'langItalian' },
];

// Helper function to normalize text for better matching (handles accents, case)
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .trim();
};

const firestoreTextSearch = async (
  searchText: string,
  options: { limit?: number; }
): Promise<Array<{ documentId: string; title: string; chunkId: string; text: string; score: number }>> => {
  console.log(`Performing Firestore text search for: "${searchText}"`);

  const normalizedQuery = normalizeText(searchText);
  // Split into keywords but keep words >= 2 chars (more lenient)
  const keywords = normalizedQuery.split(/\s+/).filter(k => k.length >= 2);

  if (keywords.length === 0) {
    return [];
  }

  const allChunks: Array<{ documentId: string; title: string; chunkId: string; text: string; docCanton: string; }> = [];

  let docsQuery = firestoreQuery(
    collection(firestore, 'legal_documents'),
    where('status', '==', 'Indexed')
  );

  const docSnapshots = await getDocs(docsQuery);

  for (const docSnap of docSnapshots.docs) {
    const docData = docSnap.data();
    const chunksSnapshot = await getDocs(collection(docSnap.ref, 'chunks'));
    chunksSnapshot.forEach(chunkSnap => {
      allChunks.push({
        documentId: docSnap.id,
        title: docData.title,
        chunkId: chunkSnap.id,
        text: chunkSnap.data().text,
        docCanton: docData.canton,
      });
    });
  }

  const scoredChunks = allChunks.map(chunk => {
    let score = 0;
    const normalizedChunkText = normalizeText(chunk.text);
    const normalizedChunkTitle = normalizeText(chunk.title);

    // Score based on multiple factors:
    for (const keyword of keywords) {
      // Exact keyword matches in text
      if (normalizedChunkText.includes(keyword)) {
        score += 1;
      }
      // Keyword matches in title (higher weight)
      if (normalizedChunkTitle.includes(keyword)) {
        score += 3;
      }
    }

    // Bonus for chunks that contain multiple keywords close together
    const phraseLower = normalizedQuery;
    if (normalizedChunkText.includes(phraseLower)) {
      score += 5; // Significant boost for phrase match
    }

    return { ...chunk, score };
  })
  .filter(chunk => chunk.score > 0)
  .sort((a, b) => b.score - a.score);

  return scoredChunks.slice(0, options.limit || 5);
};

interface LegalAssistantCardProps {
  title?: string;
  description?: string;
  placeholder?: string;
  compact?: boolean;
  /** Pre-built CLA context string to inject before document chunks */
  claContext?: string;
}

const normalizeAnswerMarkup = (answer: string): string => {
  return answer
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

const renderInlineMarkdown = (line: string) => {
  const segments = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);

  return segments.map((segment, index) => {
    const isBold = segment.startsWith('**') && segment.endsWith('**') && segment.length > 4;
    if (isBold) {
      return <strong key={`seg-${index}`}>{segment.slice(2, -2)}</strong>;
    }
    return <Fragment key={`seg-${index}`}>{segment}</Fragment>;
  });
};

const renderAnswer = (answer: string) => {
  const normalized = normalizeAnswerMarkup(answer);
  const lines = normalized.split('\n');

  return (
    <div className="space-y-1">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={`line-${index}`} className="h-2" aria-hidden="true" />;
        }

        return <p key={`line-${index}`}>{renderInlineMarkdown(trimmed)}</p>;
      })}
    </div>
  );
};

export function LegalAssistantCard({
  title: _title,
  description: _description,
  placeholder: _placeholder,
  compact = false,
  claContext,
}: LegalAssistantCardProps) {
  const t = useTranslations('LegalAssistantCard');
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState('English');
  const [result, setResult] = useState<LegalQAOutput | null>(null);

  const title = _title ?? t('title');
  const description = _description ?? t('description');
  const placeholder = _placeholder ?? t('placeholder');

  const { user } = useFirebase();
  const { toast } = useToast();

  const handleAsk = async () => {
    if (!query.trim()) {
      toast({
        title: t('toastQuestionEmpty'),
        description: t('toastQuestionEmptyDesc'),
        variant: 'destructive',
      });
      return;
    }
    if (!user) {
      toast({
        title: t('toastNotAuthenticated'),
        description: t('toastNotAuthenticatedDesc'),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      let relevantChunks: Awaited<ReturnType<typeof firestoreTextSearch>> = [];
      let retrievalFailed = false;
      try {
        relevantChunks = await firestoreTextSearch(query, { limit: 5 });
      } catch (e) {
        retrievalFailed = true;
        console.error('Legal document retrieval failed (card):', e);
      }

      const kbStatus = resolveKnowledgeBaseStatus(retrievalFailed, relevantChunks.length);
      const context = buildLegalAssistantContext({
        claContext: claContext || undefined,
        documentChunks: relevantChunks.map((c) => ({ title: c.title, text: c.text })),
        kbStatus,
      });

      // Extract unique sources for proper citation
      const uniqueSources = relevantChunks.reduce((acc: Array<{title: string; documentId: string}>, chunk) => {
        if (!acc.find(s => s.documentId === chunk.documentId)) {
          acc.push({
            title: chunk.title,
            documentId: chunk.documentId,
          });
        }
        return acc;
      }, []);

      const response = await legalQAAIAssistant({
        query,
        context,
        outputLanguage: language,
      });

      if (kbStatus !== 'ok') {
        toast({
          title: t('toastGeneralGuidanceMode'),
          description: retrievalFailed
            ? t('toastGeneralGuidanceDescRetrievalFailed')
            : t('toastGeneralGuidanceDescNoPassages'),
        });
      }

      // Enhance the result with proper source mapping
      const enhancedResult: LegalQAOutput = {
        ...response,
        sources: uniqueSources.length > 0 ? uniqueSources : response.sources,
      };

      setResult(enhancedResult);
    } catch (error) {
      console.error('Error in Legal Assistant:', error);
      toast({
        title: t('toastAnError'),
        description: t('toastAnErrorDesc'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder={placeholder}
            className="min-h-[100px] resize-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading}
          />
          <div className="flex gap-2">
            <Select
              value={language}
              onValueChange={setLanguage}
              disabled={isLoading}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder={t('language')} />
              </SelectTrigger>
              <SelectContent>
                {languageOptions.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {t(lang.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAsk}
              disabled={isLoading || !query.trim()}
              className="flex-1"
              size="sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('thinking')}
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {t('ask')}
                </>
              )}
            </Button>
          </div>

          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
            </div>
          )}

          {result && (
            <div className="space-y-3 pt-2 border-t">
              <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950">
                <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertTitle className="text-blue-900 dark:text-blue-200">{t('answer')}</AlertTitle>
                <AlertDescription className="mt-2 text-sm text-blue-800 dark:text-blue-300">
                  {renderAnswer(result.answer)}
                </AlertDescription>
              </Alert>
              {result.sources && result.sources.length > 0 && (
                <div className="text-xs">
                  <p className="font-semibold mb-1 text-muted-foreground">
                    {t('sources', { count: result.sources.length })}
                  </p>
                  <div className="space-y-1">
                    {result.sources.map((source, idx) => (
                      <div key={`${source.documentId}-${idx}`} className="text-muted-foreground">
                        • {source.title}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Full-width layout
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('askQuestion')}</CardTitle>
            <CardDescription>
              {t('enterQuestion')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder={placeholder}
              className="min-h-[150px]"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isLoading}
            />
            <Select
              value={language}
              onValueChange={setLanguage}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectResponseLanguage')} />
              </SelectTrigger>
              <SelectContent>
                {languageOptions.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {t(lang.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleAsk}
              disabled={isLoading || !query.trim()}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('thinking')}
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {t('askAiAssistant')}
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('response')}</CardTitle>
            <CardDescription>
              {t('responseDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            )}
            {!isLoading && !result && (
              <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
                <div className="text-center text-muted-foreground p-4">
                  <Bot className="mx-auto h-12 w-12 mb-4" />
                  <h3 className="text-lg font-semibold">{t('noQuestionYet')}</h3>
                  <p>{t('askToGetStarted')}</p>
                </div>
              </div>
            )}
            {result && (
              <div className="space-y-6">
                <Alert>
                  <Sparkles className="h-4 w-4" />
                  <AlertTitle>{t('answer')}</AlertTitle>
                  <AlertDescription className="mt-3 text-sm leading-relaxed">
                    {renderAnswer(result.answer)}
                  </AlertDescription>
                </Alert>
                {result.sources && result.sources.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                        {result.sources.length}
                      </span>
                      {t('citedSources')}
                    </h4>
                    <div className="space-y-2">
                      {result.sources.map((source, index) => (
                        <div
                          key={`${source.documentId}-${index}`}
                          className="text-sm p-3 border rounded-md bg-muted/40 hover:bg-muted/60 transition-colors"
                        >
                          <p className="font-medium text-foreground">{source.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {t('id', { documentId: source.documentId })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
