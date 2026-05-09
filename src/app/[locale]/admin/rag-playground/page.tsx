'use client';

import { LegalAssistantCard } from '@/components/legal-assistant/legal-assistant-card';
import { useLocale } from 'next-intl';

type SupportedLocale = 'en' | 'fr' | 'de' | 'it' | 'es';

const resolveLocale = (locale: string): SupportedLocale => {
  const normalized = locale.toLowerCase().split('-')[0];
  if (normalized === 'fr' || normalized === 'de' || normalized === 'it' || normalized === 'es') {
    return normalized;
  }
  return 'en';
};

const UI_BY_LOCALE: Record<SupportedLocale, { pageTitle: string; pageSubtitle: string; cardTitle: string; cardDescription: string; placeholder: string; }> = {
  en: {
    pageTitle: 'Legal Document Assistant',
    pageSubtitle: 'Test the legal AI assistant with your indexed documents. Ask questions in any language and get answers with proper citations.',
    cardTitle: 'Ask a Legal Question',
    cardDescription: 'The AI will search your indexed legal documents and provide accurate answers with citations.',
    placeholder: "e.g., 'What are the transitional provisions for the 2024 amendment?' or 'Quelles sont les regles concernant la TVA?'",
  },
  fr: {
    pageTitle: 'Assistant de documents juridiques',
    pageSubtitle: 'Testez l assistant IA juridique avec vos documents indexes. Posez des questions dans n importe quelle langue avec des citations.',
    cardTitle: 'Poser une question juridique',
    cardDescription: 'L IA recherche dans vos documents juridiques indexes et fournit des reponses precises avec citations.',
    placeholder: "ex: 'Quelles sont les dispositions transitoires de l amendement 2024 ?'",
  },
  de: {
    pageTitle: 'Assistent fuer Rechtsdokumente',
    pageSubtitle: 'Testen Sie den juristischen KI Assistenten mit Ihren indexierten Dokumenten. Stellen Sie Fragen in jeder Sprache mit Zitaten.',
    cardTitle: 'Eine Rechtsfrage stellen',
    cardDescription: 'Die KI durchsucht Ihre indexierten Rechtsdokumente und liefert praezise Antworten mit Zitaten.',
    placeholder: "z.B. 'Welche Uebergangsbestimmungen gelten fuer die Aenderung 2024?'",
  },
  it: {
    pageTitle: 'Assistente documenti legali',
    pageSubtitle: 'Testa l assistente IA legale con i documenti indicizzati. Fai domande in qualsiasi lingua con citazioni corrette.',
    cardTitle: 'Fai una domanda legale',
    cardDescription: 'L IA cerchera nei documenti legali indicizzati e fornira risposte accurate con citazioni.',
    placeholder: "es.: 'Quali sono le disposizioni transitorie dell emendamento 2024?'",
  },
  es: {
    pageTitle: 'Asistente de documentos legales',
    pageSubtitle: 'Prueba el asistente legal de IA con tus documentos indexados. Haz preguntas en cualquier idioma y recibe respuestas con citas.',
    cardTitle: 'Hacer una pregunta legal',
    cardDescription: 'La IA buscara en tus documentos legales indexados y dara respuestas precisas con citas.',
    placeholder: "ej.: 'Cuales son las disposiciones transitorias de la enmienda 2024?'",
  },
};

export default function RAGPlaygroundPage() {
  const locale = resolveLocale(useLocale());
  const ui = UI_BY_LOCALE[locale];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">{ui.pageTitle}</h1>
        <p className="text-muted-foreground mt-2">
          {ui.pageSubtitle}
        </p>
      </div>

      <LegalAssistantCard
        title={ui.cardTitle}
        description={ui.cardDescription}
        placeholder={ui.placeholder}
      />
    </div>
  );
}

