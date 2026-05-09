'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { ArrowLeft } from 'lucide-react';
import { firestore } from '@/firebase/config';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type SupportedLocale = 'en' | 'fr' | 'de' | 'it' | 'es';

type RouteParams = {
  locale: string;
  userId: string;
};

type LabelSet = {
  title: string;
  subtitle: string;
  back: string;
  role: string;
  status: string;
  noData: string;
  notFound: string;
  profile: string;
  contact: string;
  employment: string;
  payroll: string;
  address: string;
  system: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  phone: string;
  email: string;
  companyId: string;
  jobTitle: string;
  startDate: string;
  remunerationType: string;
  hourlySalary: string;
  monthlySalary: string;
  annualSalary: string;
  vacationWeeks: string;
  activityRate: string;
  avsNumber: string;
  avsStatus: string;
  iban: string;
  street: string;
  city: string;
  postalCode: string;
  threeMonthsHistory: string;
  registered: string;
  na: string;
  yes: string;
  no: string;
};

const UI: Record<SupportedLocale, LabelSet> = {
  en: {
    title: 'User Details',
    subtitle: 'Complete profile and payroll information for this user.',
    back: 'Back to User Management',
    role: 'Role',
    status: 'Status',
    noData: 'No value',
    notFound: 'User not found',
    profile: 'Profile',
    contact: 'Contact',
    employment: 'Employment',
    payroll: 'Payroll',
    address: 'Address',
    system: 'System',
    firstName: 'First Name',
    lastName: 'Last Name',
    birthDate: 'Date of Birth',
    phone: 'Phone',
    email: 'Email',
    companyId: 'Company ID',
    jobTitle: 'Job Title',
    startDate: 'Start Date',
    remunerationType: 'Remuneration Type',
    hourlySalary: 'Hourly Salary',
    monthlySalary: 'Monthly Salary',
    annualSalary: 'Annual Salary',
    vacationWeeks: 'Vacation Weeks',
    activityRate: 'Activity Rate',
    avsNumber: 'AVS Number',
    avsStatus: 'AVS Status',
    iban: 'IBAN',
    street: 'Street',
    city: 'City',
    postalCode: 'Postal Code',
    threeMonthsHistory: '3 Months History',
    registered: 'Registered',
    na: 'N/A',
    yes: 'Yes',
    no: 'No',
  },
  fr: {
    title: 'Details utilisateur',
    subtitle: 'Profil complet et informations salariales de cet utilisateur.',
    back: 'Retour a la gestion des utilisateurs',
    role: 'Role',
    status: 'Statut',
    noData: 'Aucune valeur',
    notFound: 'Utilisateur introuvable',
    profile: 'Profil',
    contact: 'Contact',
    employment: 'Emploi',
    payroll: 'Paie',
    address: 'Adresse',
    system: 'Systeme',
    firstName: 'Prenom',
    lastName: 'Nom',
    birthDate: 'Date de naissance',
    phone: 'Telephone',
    email: 'Email',
    companyId: 'ID entreprise',
    jobTitle: 'Fonction',
    startDate: 'Date de debut',
    remunerationType: 'Type de remuneration',
    hourlySalary: 'Salaire horaire',
    monthlySalary: 'Salaire mensuel',
    annualSalary: 'Salaire annuel',
    vacationWeeks: 'Semaines vacances',
    activityRate: 'Taux activite',
    avsNumber: 'Numero AVS',
    avsStatus: 'Statut AVS',
    iban: 'IBAN',
    street: 'Rue',
    city: 'Ville',
    postalCode: 'Code postal',
    threeMonthsHistory: 'Historique 3 mois',
    registered: 'Enregistre',
    na: 'N/A',
    yes: 'Oui',
    no: 'Non',
  },
  de: {
    title: 'Benutzerdetails',
    subtitle: 'Vollstandiges Profil und Gehaltsinformationen fur diesen Benutzer.',
    back: 'Zuruck zur Benutzerverwaltung',
    role: 'Rolle',
    status: 'Status',
    noData: 'Kein Wert',
    notFound: 'Benutzer nicht gefunden',
    profile: 'Profil',
    contact: 'Kontakt',
    employment: 'Beschaftigung',
    payroll: 'Lohn',
    address: 'Adresse',
    system: 'System',
    firstName: 'Vorname',
    lastName: 'Nachname',
    birthDate: 'Geburtsdatum',
    phone: 'Telefon',
    email: 'E-Mail',
    companyId: 'Unternehmens-ID',
    jobTitle: 'Funktion',
    startDate: 'Startdatum',
    remunerationType: 'Vergutungsart',
    hourlySalary: 'Stundenlohn',
    monthlySalary: 'Monatslohn',
    annualSalary: 'Jahreslohn',
    vacationWeeks: 'Ferienwochen',
    activityRate: 'Beschaftigungsgrad',
    avsNumber: 'AVS-Nummer',
    avsStatus: 'AVS-Status',
    iban: 'IBAN',
    street: 'Strasse',
    city: 'Stadt',
    postalCode: 'PLZ',
    threeMonthsHistory: '3-Monats-Verlauf',
    registered: 'Registriert',
    na: 'N/A',
    yes: 'Ja',
    no: 'Nein',
  },
  it: {
    title: 'Dettagli utente',
    subtitle: 'Profilo completo e informazioni stipendiali di questo utente.',
    back: 'Torna alla gestione utenti',
    role: 'Ruolo',
    status: 'Stato',
    noData: 'Nessun valore',
    notFound: 'Utente non trovato',
    profile: 'Profilo',
    contact: 'Contatto',
    employment: 'Impiego',
    payroll: 'Stipendio',
    address: 'Indirizzo',
    system: 'Sistema',
    firstName: 'Nome',
    lastName: 'Cognome',
    birthDate: 'Data di nascita',
    phone: 'Telefono',
    email: 'Email',
    companyId: 'ID azienda',
    jobTitle: 'Funzione',
    startDate: 'Data di inizio',
    remunerationType: 'Tipo di remunerazione',
    hourlySalary: 'Salario orario',
    monthlySalary: 'Salario mensile',
    annualSalary: 'Salario annuale',
    vacationWeeks: 'Settimane ferie',
    activityRate: 'Tasso attivita',
    avsNumber: 'Numero AVS',
    avsStatus: 'Stato AVS',
    iban: 'IBAN',
    street: 'Via',
    city: 'Citta',
    postalCode: 'CAP',
    threeMonthsHistory: 'Storico 3 mesi',
    registered: 'Registrato',
    na: 'N/A',
    yes: 'Si',
    no: 'No',
  },
  es: {
    title: 'Detalles del usuario',
    subtitle: 'Perfil completo e informacion salarial de este usuario.',
    back: 'Volver a gestion de usuarios',
    role: 'Rol',
    status: 'Estado',
    noData: 'Sin valor',
    notFound: 'Usuario no encontrado',
    profile: 'Perfil',
    contact: 'Contacto',
    employment: 'Empleo',
    payroll: 'Nomina',
    address: 'Direccion',
    system: 'Sistema',
    firstName: 'Nombre',
    lastName: 'Apellido',
    birthDate: 'Fecha de nacimiento',
    phone: 'Telefono',
    email: 'Email',
    companyId: 'ID de empresa',
    jobTitle: 'Funcion',
    startDate: 'Fecha de inicio',
    remunerationType: 'Tipo de remuneracion',
    hourlySalary: 'Salario por hora',
    monthlySalary: 'Salario mensual',
    annualSalary: 'Salario anual',
    vacationWeeks: 'Semanas de vacaciones',
    activityRate: 'Tasa de actividad',
    avsNumber: 'Numero AVS',
    avsStatus: 'Estado AVS',
    iban: 'IBAN',
    street: 'Calle',
    city: 'Ciudad',
    postalCode: 'Codigo postal',
    threeMonthsHistory: 'Historico de 3 meses',
    registered: 'Registrado',
    na: 'N/A',
    yes: 'Si',
    no: 'No',
  },
};

const resolveLocale = (locale: string): SupportedLocale => {
  const normalized = locale.toLowerCase().split('-')[0];
  if (normalized === 'fr' || normalized === 'de' || normalized === 'it' || normalized === 'es') {
    return normalized;
  }
  return 'en';
};

const pick = (...values: Array<unknown>) => {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== '') return value;
  }
  return null;
};

const Field = ({ label, value }: { label: string; value: string | number | boolean | null }) => (
  <div className="rounded-lg border p-3">
    <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="mt-1 text-sm font-medium break-words">{value === null ? '-' : String(value)}</div>
  </div>
);

export default function UserDetailsPage({ params }: { params: RouteParams }) {
  const locale = resolveLocale(params.locale);
  const ui = UI[locale];
  const [isLoading, setIsLoading] = useState(true);
  const [userDoc, setUserDoc] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      setIsLoading(true);
      const snap = await getDoc(doc(firestore, 'users', params.userId));
      if (!snap.exists()) {
        setUserDoc(null);
        setIsLoading(false);
        return;
      }

      setUserDoc({ id: snap.id, ...snap.data() });
      setIsLoading(false);
    };

    loadUser();
  }, [params.userId]);

  const sections = useMemo(() => {
    if (!userDoc) return null;

    const profile = userDoc.profile ?? {};
    const address = userDoc.address ?? {};

    const fullName = pick(
      `${pick(profile.firstName, userDoc.prenom, '') ?? ''} ${pick(profile.lastName, userDoc.nom, '') ?? ''}`.trim(),
      userDoc.name,
      userDoc.email
    );

    const registered = userDoc.createdAt?.toDate ? userDoc.createdAt.toDate().toISOString().slice(0, 10) : pick(userDoc.registered, userDoc.createdAt);

    const fieldGroups = [
      {
        title: ui.profile,
        items: [
          [ui.firstName, pick(profile.firstName, userDoc.prenom)],
          [ui.lastName, pick(profile.lastName, userDoc.nom)],
          [ui.birthDate, pick(profile.birthDate, userDoc.dateNaissance)],
          [ui.role, pick(userDoc.role)],
          [ui.status, pick(userDoc.status)],
        ] as Array<[string, unknown]>,
      },
      {
        title: ui.contact,
        items: [
          [ui.email, pick(userDoc.email)],
          [ui.phone, pick(profile.phone, userDoc.telephone)],
          [ui.companyId, pick(userDoc.companyId)],
          [ui.registered, registered],
        ] as Array<[string, unknown]>,
      },
      {
        title: ui.employment,
        items: [
          [ui.jobTitle, pick(userDoc.fonction)],
          [ui.startDate, pick(userDoc.dateDebut)],
          [ui.remunerationType, pick(userDoc.typeRemu)],
          [ui.activityRate, pick(userDoc.tauxActivite)],
          [ui.vacationWeeks, pick(userDoc.semainesVacances)],
        ] as Array<[string, unknown]>,
      },
      {
        title: ui.payroll,
        items: [
          [ui.hourlySalary, pick(userDoc.salaireHoraire)],
          [ui.monthlySalary, pick(userDoc.salaireMensuel)],
          [ui.annualSalary, pick(userDoc.salaireAnnuel)],
          [ui.avsNumber, pick(userDoc.numeroAVS)],
          [ui.avsStatus, pick(userDoc.statutAVS)],
          [ui.iban, pick(userDoc.iban)],
          [ui.threeMonthsHistory, userDoc.has3MonthsHistory === undefined ? null : (userDoc.has3MonthsHistory ? ui.yes : ui.no)],
        ] as Array<[string, unknown]>,
      },
      {
        title: ui.address,
        items: [
          [ui.street, pick(address.street, userDoc.rue)],
          [ui.city, pick(address.city, userDoc.ville)],
          [ui.postalCode, pick(address.postalCode, userDoc.codePostal)],
        ] as Array<[string, unknown]>,
      },
    ];

    return {
      fullName: fullName ?? ui.na,
      role: pick(userDoc.role) ?? ui.na,
      status: pick(userDoc.status) ?? ui.na,
      groups: fieldGroups,
    };
  }, [ui, userDoc]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{ui.title}</h1>
          <p className="text-muted-foreground">{ui.subtitle}</p>
        </div>
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href={`/${locale}/admin/user-management`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {ui.back}
          </Link>
        </Button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Card key={idx}>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && !sections && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">{ui.notFound}</CardContent>
        </Card>
      )}

      {!isLoading && sections && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{sections.fullName}</CardTitle>
              <CardDescription className="flex gap-2 flex-wrap">
                <Badge variant="secondary">{ui.role}: {sections.role}</Badge>
                <Badge variant="outline">{ui.status}: {sections.status}</Badge>
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sections.groups.map((group) => (
              <Card key={group.title}>
                <CardHeader>
                  <CardTitle className="text-base">{group.title}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {group.items.map(([label, value]) => (
                    <Field key={`${group.title}-${label}`} label={label} value={(value as string | number | boolean | null) ?? ui.noData} />
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
