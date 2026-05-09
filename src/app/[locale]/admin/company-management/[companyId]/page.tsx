'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Users, FileText, Send, Inbox, ClipboardList, History,
  Plus, Search, Trash2, Edit, Eye, CheckCircle, Clock, AlertCircle,
  Building2, MoreHorizontal, Download, Loader2, User, Upload, XCircle, RefreshCw,
  Settings, Percent
} from "lucide-react";
import { firestore, storage } from '@/firebase/config';
import {
  collection, addDoc, serverTimestamp, onSnapshot,
  query, orderBy, getDocs, where, doc, updateDoc, getDoc, deleteDoc,
  Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useFirebase } from '@/firebase/firebase-provider';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { useLocale } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { notifyAdmin } from '@/lib/admin-notifications';
import { checkLppEnrollment, calculateLppContribution, LPP_DEFAULT_AGE_BRACKETS, type LppAgeBracket } from '@/lib/lpp-rules';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// ─── Types ───────────────────────────────────────────────────────────────────

type Company = {
  id: string;
  companyName: string;
  type: 'Business' | 'Accounting Firm';
  adminUserId: string;
  adminName: string;
  adminEmail: string;
  status: 'active' | 'pending_approval' | 'suspended';
  accountingFirmId?: string;
  assignedFirmName?: string;
  industry?: string;
  claId?: string;
  canton?: string;
};

type Employee = {
  id: string;
  companyId: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  telephone: string;
  position: string;
  dateOfBirth: string;
  startDate: string;
  typeRemu: 'mensuel' | 'horaire';
  salaireMensuel: number;
  salaireHoraire: number;
  tauxActivite: number;
  semainesVacances: number;
  numeroAVS: string;
  iban: string;
  rue: string;
  ville: string;
  codePostal: string;
  avsStatus: 'valide' | 'a_verifier' | 'invalide';
  registrationStatus: 'pending' | 'registered';
  registrationDate: string;
  payslipStatus: 'none' | 'processed';
  lastPayslipMonth: string;
};

type DocumentExchange = {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  recipientRole: 'individual' | 'business' | 'accounting_firm';
  subject: string;
  message: string;
  type: 'document_sent' | 'document_request' | 'document_review';
  status: 'pending' | 'fulfilled' | 'acknowledged' | 'pending_review' | 'approved' | 'rejected';
  fileUrl?: string;
  fileName?: string;
  userFileUrl?: string;
  userFileName?: string;
  documentContent?: string;
  documentTitle?: string;
  createdAt: { seconds: number; nanoseconds: number };
};

type Task = {
  id: string;
  companyId: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  dueDate?: string;
  createdAt: { seconds: number; nanoseconds: number };
  completedAt?: { seconds: number; nanoseconds: number };
  assignedTo?: string;
};

// ─── Locale ──────────────────────────────────────────────────────────────────

type SupportedLocale = 'en' | 'fr' | 'de' | 'it' | 'es';

const resolveLocale = (locale: string): SupportedLocale => {
  const n = locale.toLowerCase().split('-')[0];
  if (n === 'fr' || n === 'de' || n === 'it' || n === 'es') return n;
  return 'en';
};

const UI_BY_LOCALE: Record<SupportedLocale, {
  backToCompanies: string;
  companyDashboard: string;
  loading: string;
  companyNotFound: string;
  // Tabs
  tabEmployees: string;
  tabDocsSent: string;
  tabDocsReceived: string;
  tabClientRequests: string;
  tabTasks: string;
  tabHistory: string;
  tabSettings: string;
  // Employees
  employees: string;
  employeesDesc: string;
  addEmployee: string;
  editEmployee: string;
  noEmployees: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  dateOfBirth: string;
  startDate: string;
  salary: string;
  hourlyRate: string;
  monthlySalary: string;
  activityRate: string;
  vacationWeeks: string;
  avsNumber: string;
  iban: string;
  address: string;
  street: string;
  city: string;
  postalCode: string;
  remuType: string;
  hourly: string;
  monthly: string;
  save: string;
  cancel: string;
  deleteEmployee: string;
  deleteConfirm: string;
  // Documents
  docsSent: string;
  docsSentDesc: string;
  docsReceived: string;
  docsReceivedDesc: string;
  clientRequests: string;
  clientRequestsDesc: string;
  noDocs: string;
  noRequests: string;
  subject: string;
  message: string;
  date: string;
  status: string;
  actions: string;
  viewDocument: string;
  download: string;
  fulfill: string;
  // Tasks
  tasks: string;
  tasksDesc: string;
  addTask: string;
  noTasks: string;
  taskTitle: string;
  taskDescription: string;
  priority: string;
  dueDate: string;
  markComplete: string;
  // History
  history: string;
  historyDesc: string;
  noHistory: string;
  // Status badges
  statusPending: string;
  statusFulfilled: string;
  statusCompleted: string;
  statusInProgress: string;
  statusApproved: string;
  statusRejected: string;
  // Common
  search: string;
  // Settings / LPP
  settings: string;
  settingsDesc: string;
  lppSettings: string;
  lppSettingsDesc: string;
  lppDefaultRates: string;
  lppCustomRates: string;
  lppUseCustom: string;
  lppAgeBracket: string;
  lppRate: string;
  lppSaveRates: string;
  lppResetRates: string;
  lppSaved: string;
  lppReset: string;
}> = {
  en: {
    backToCompanies: 'Back to Companies',
    companyDashboard: 'Company Dashboard',
    loading: 'Loading...',
    companyNotFound: 'Company not found',
    tabEmployees: 'Employees',
    tabDocsSent: 'Docs Sent',
    tabDocsReceived: 'Docs Received',
    tabClientRequests: 'Client Requests',
    tabTasks: 'Tasks',
    tabHistory: 'History',
    tabSettings: 'Settings',
    employees: 'Employees',
    employeesDesc: 'Manage employees registered under this company.',
    addEmployee: 'Add Employee',
    editEmployee: 'Edit Employee',
    noEmployees: 'No employees found. Add your first employee.',
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email',
    phone: 'Phone',
    position: 'Position',
    dateOfBirth: 'Date of Birth',
    startDate: 'Start Date',
    salary: 'Salary',
    hourlyRate: 'Hourly Rate',
    monthlySalary: 'Monthly Salary',
    activityRate: 'Activity Rate (%)',
    vacationWeeks: 'Vacation Weeks',
    avsNumber: 'AVS Number',
    iban: 'IBAN',
    address: 'Address',
    street: 'Street',
    city: 'City',
    postalCode: 'Postal Code',
    remuType: 'Remuneration Type',
    hourly: 'Hourly',
    monthly: 'Monthly',
    save: 'Save',
    cancel: 'Cancel',
    deleteEmployee: 'Delete Employee',
    deleteConfirm: 'Are you sure you want to delete this employee?',
    docsSent: 'Documents Sent',
    docsSentDesc: 'Documents sent to this client.',
    docsReceived: 'Documents Received',
    docsReceivedDesc: 'Documents received from this client.',
    clientRequests: 'Client Requests',
    clientRequestsDesc: 'Document requests made by this client.',
    noDocs: 'No documents found.',
    noRequests: 'No requests found.',
    subject: 'Subject',
    message: 'Message',
    date: 'Date',
    status: 'Status',
    actions: 'Actions',
    viewDocument: 'View Document',
    download: 'Download',
    fulfill: 'Fulfill',
    tasks: 'Tasks',
    tasksDesc: 'Pending and completed tasks for this company.',
    addTask: 'Add Task',
    noTasks: 'No tasks found.',
    taskTitle: 'Title',
    taskDescription: 'Description',
    priority: 'Priority',
    dueDate: 'Due Date',
    markComplete: 'Mark Complete',
    history: 'Document History',
    historyDesc: 'All document exchanges with this company.',
    noHistory: 'No history found.',
    statusPending: 'Pending',
    statusFulfilled: 'Fulfilled',
    statusCompleted: 'Completed',
    statusInProgress: 'In Progress',
    statusApproved: 'Approved',
    statusRejected: 'Rejected',
    search: 'Search...',
    settings: 'Settings',
    settingsDesc: 'Configure company-specific settings.',
    lppSettings: 'LPP / 2nd Pillar Rates',
    lppSettingsDesc: 'Configure custom LPP contribution rates for this company based on their insurer\'s rate table.',
    lppDefaultRates: 'Using default Swiss LPP rates',
    lppCustomRates: 'Using custom insurer rates',
    lppUseCustom: 'Enable custom rates',
    lppAgeBracket: 'Age Bracket',
    lppRate: 'Rate (%)',
    lppSaveRates: 'Save LPP Rates',
    lppResetRates: 'Reset to Default',
    lppSaved: 'LPP rates saved successfully.',
    lppReset: 'LPP rates reset to default.',
  },
  fr: {
    backToCompanies: 'Retour aux entreprises',
    companyDashboard: 'Tableau de bord entreprise',
    loading: 'Chargement...',
    companyNotFound: 'Entreprise non trouvée',
    tabEmployees: 'Employés',
    tabDocsSent: 'Docs envoyés',
    tabDocsReceived: 'Docs reçus',
    tabClientRequests: 'Demandes client',
    tabTasks: 'Tâches',
    tabHistory: 'Historique',
    tabSettings: 'Paramètres',
    employees: 'Employés',
    employeesDesc: 'Gérer les employés enregistrés dans cette entreprise.',
    addEmployee: 'Ajouter employé',
    editEmployee: 'Modifier employé',
    noEmployees: 'Aucun employé trouvé. Ajoutez votre premier employé.',
    firstName: 'Prénom',
    lastName: 'Nom',
    email: 'Email',
    phone: 'Téléphone',
    position: 'Poste',
    dateOfBirth: 'Date de naissance',
    startDate: 'Date de début',
    salary: 'Salaire',
    hourlyRate: 'Taux horaire',
    monthlySalary: 'Salaire mensuel',
    activityRate: 'Taux d\'activité (%)',
    vacationWeeks: 'Semaines de vacances',
    avsNumber: 'Numéro AVS',
    iban: 'IBAN',
    address: 'Adresse',
    street: 'Rue',
    city: 'Ville',
    postalCode: 'Code postal',
    remuType: 'Type de rémunération',
    hourly: 'Horaire',
    monthly: 'Mensuel',
    save: 'Enregistrer',
    cancel: 'Annuler',
    deleteEmployee: 'Supprimer employé',
    deleteConfirm: 'Êtes-vous sûr de vouloir supprimer cet employé ?',
    docsSent: 'Documents envoyés',
    docsSentDesc: 'Documents envoyés à ce client.',
    docsReceived: 'Documents reçus',
    docsReceivedDesc: 'Documents reçus de ce client.',
    clientRequests: 'Demandes client',
    clientRequestsDesc: 'Demandes de documents faites par ce client.',
    noDocs: 'Aucun document trouvé.',
    noRequests: 'Aucune demande trouvée.',
    subject: 'Sujet',
    message: 'Message',
    date: 'Date',
    status: 'Statut',
    actions: 'Actions',
    viewDocument: 'Voir document',
    download: 'Télécharger',
    fulfill: 'Traiter',
    tasks: 'Tâches',
    tasksDesc: 'Tâches en attente et terminées pour cette entreprise.',
    addTask: 'Ajouter tâche',
    noTasks: 'Aucune tâche trouvée.',
    taskTitle: 'Titre',
    taskDescription: 'Description',
    priority: 'Priorité',
    dueDate: 'Date limite',
    markComplete: 'Marquer terminé',
    history: 'Historique documents',
    historyDesc: 'Tous les échanges de documents avec cette entreprise.',
    noHistory: 'Aucun historique trouvé.',
    statusPending: 'En attente',
    statusFulfilled: 'Traité',
    statusCompleted: 'Terminé',
    statusInProgress: 'En cours',
    statusApproved: 'Approuvé',
    statusRejected: 'Rejeté',
    search: 'Rechercher...',
    settings: 'Paramètres',
    settingsDesc: 'Configurer les paramètres spécifiques à l\'entreprise.',
    lppSettings: 'Taux LPP / 2ème pilier',
    lppSettingsDesc: 'Configurez les taux de cotisation LPP personnalisés pour cette entreprise selon le barème de leur assureur.',
    lppDefaultRates: 'Utilisation des taux LPP suisses par défaut',
    lppCustomRates: 'Utilisation des taux personnalisés de l\'assureur',
    lppUseCustom: 'Activer les taux personnalisés',
    lppAgeBracket: 'Tranche d\'âge',
    lppRate: 'Taux (%)',
    lppSaveRates: 'Enregistrer les taux LPP',
    lppResetRates: 'Réinitialiser par défaut',
    lppSaved: 'Taux LPP enregistrés avec succès.',
    lppReset: 'Taux LPP réinitialisés.',
  },
  de: {
    backToCompanies: 'Zurück zu Unternehmen',
    companyDashboard: 'Unternehmens-Dashboard',
    loading: 'Laden...',
    companyNotFound: 'Unternehmen nicht gefunden',
    tabEmployees: 'Mitarbeiter',
    tabDocsSent: 'Gesendete Dok.',
    tabDocsReceived: 'Empfangene Dok.',
    tabClientRequests: 'Kundenanfragen',
    tabTasks: 'Aufgaben',
    tabHistory: 'Verlauf',
    tabSettings: 'Einstellungen',
    employees: 'Mitarbeiter',
    employeesDesc: 'Verwalten Sie die Mitarbeiter dieses Unternehmens.',
    addEmployee: 'Mitarbeiter hinzufügen',
    editEmployee: 'Mitarbeiter bearbeiten',
    noEmployees: 'Keine Mitarbeiter gefunden. Fügen Sie Ihren ersten Mitarbeiter hinzu.',
    firstName: 'Vorname',
    lastName: 'Nachname',
    email: 'E-Mail',
    phone: 'Telefon',
    position: 'Position',
    dateOfBirth: 'Geburtsdatum',
    startDate: 'Startdatum',
    salary: 'Gehalt',
    hourlyRate: 'Stundensatz',
    monthlySalary: 'Monatsgehalt',
    activityRate: 'Beschäftigungsgrad (%)',
    vacationWeeks: 'Ferienwochen',
    avsNumber: 'AHV-Nummer',
    iban: 'IBAN',
    address: 'Adresse',
    street: 'Straße',
    city: 'Stadt',
    postalCode: 'Postleitzahl',
    remuType: 'Vergütungsart',
    hourly: 'Stündlich',
    monthly: 'Monatlich',
    save: 'Speichern',
    cancel: 'Abbrechen',
    deleteEmployee: 'Mitarbeiter löschen',
    deleteConfirm: 'Sind Sie sicher, dass Sie diesen Mitarbeiter löschen möchten?',
    docsSent: 'Gesendete Dokumente',
    docsSentDesc: 'An diesen Kunden gesendete Dokumente.',
    docsReceived: 'Empfangene Dokumente',
    docsReceivedDesc: 'Von diesem Kunden empfangene Dokumente.',
    clientRequests: 'Kundenanfragen',
    clientRequestsDesc: 'Dokumentanfragen dieses Kunden.',
    noDocs: 'Keine Dokumente gefunden.',
    noRequests: 'Keine Anfragen gefunden.',
    subject: 'Betreff',
    message: 'Nachricht',
    date: 'Datum',
    status: 'Status',
    actions: 'Aktionen',
    viewDocument: 'Dokument anzeigen',
    download: 'Herunterladen',
    fulfill: 'Erfüllen',
    tasks: 'Aufgaben',
    tasksDesc: 'Ausstehende und erledigte Aufgaben für dieses Unternehmen.',
    addTask: 'Aufgabe hinzufügen',
    noTasks: 'Keine Aufgaben gefunden.',
    taskTitle: 'Titel',
    taskDescription: 'Beschreibung',
    priority: 'Priorität',
    dueDate: 'Fälligkeitsdatum',
    markComplete: 'Als erledigt markieren',
    history: 'Dokumentenverlauf',
    historyDesc: 'Alle Dokumentenaustausche mit diesem Unternehmen.',
    noHistory: 'Kein Verlauf gefunden.',
    statusPending: 'Ausstehend',
    statusFulfilled: 'Erfüllt',
    statusCompleted: 'Abgeschlossen',
    statusInProgress: 'In Bearbeitung',
    statusApproved: 'Genehmigt',
    statusRejected: 'Abgelehnt',
    search: 'Suchen...',
    settings: 'Einstellungen',
    settingsDesc: 'Unternehmensspezifische Einstellungen konfigurieren.',
    lppSettings: 'BVG / 2. Säule Beiträge',
    lppSettingsDesc: 'Konfigurieren Sie benutzerdefinierte BVG-Beitragssätze für dieses Unternehmen basierend auf dem Tarif des Versicherers.',
    lppDefaultRates: 'Verwendung der Standard-BVG-Sätze',
    lppCustomRates: 'Verwendung benutzerdefinierter Versicherersätze',
    lppUseCustom: 'Benutzerdefinierte Sätze aktivieren',
    lppAgeBracket: 'Altersgruppe',
    lppRate: 'Satz (%)',
    lppSaveRates: 'BVG-Sätze speichern',
    lppResetRates: 'Auf Standard zurücksetzen',
    lppSaved: 'BVG-Sätze erfolgreich gespeichert.',
    lppReset: 'BVG-Sätze zurückgesetzt.',
  },
  it: {
    backToCompanies: 'Torna alle aziende',
    companyDashboard: 'Dashboard aziendale',
    loading: 'Caricamento...',
    companyNotFound: 'Azienda non trovata',
    tabEmployees: 'Dipendenti',
    tabDocsSent: 'Doc. inviati',
    tabDocsReceived: 'Doc. ricevuti',
    tabClientRequests: 'Richieste cliente',
    tabTasks: 'Attività',
    tabHistory: 'Cronologia',
    tabSettings: 'Impostazioni',
    employees: 'Dipendenti',
    employeesDesc: 'Gestisci i dipendenti di questa azienda.',
    addEmployee: 'Aggiungi dipendente',
    editEmployee: 'Modifica dipendente',
    noEmployees: 'Nessun dipendente trovato. Aggiungi il tuo primo dipendente.',
    firstName: 'Nome',
    lastName: 'Cognome',
    email: 'Email',
    phone: 'Telefono',
    position: 'Posizione',
    dateOfBirth: 'Data di nascita',
    startDate: 'Data inizio',
    salary: 'Stipendio',
    hourlyRate: 'Tariffa oraria',
    monthlySalary: 'Stipendio mensile',
    activityRate: 'Tasso attività (%)',
    vacationWeeks: 'Settimane ferie',
    avsNumber: 'Numero AVS',
    iban: 'IBAN',
    address: 'Indirizzo',
    street: 'Via',
    city: 'Città',
    postalCode: 'CAP',
    remuType: 'Tipo retribuzione',
    hourly: 'Oraria',
    monthly: 'Mensile',
    save: 'Salva',
    cancel: 'Annulla',
    deleteEmployee: 'Elimina dipendente',
    deleteConfirm: 'Sei sicuro di voler eliminare questo dipendente?',
    docsSent: 'Documenti inviati',
    docsSentDesc: 'Documenti inviati a questo cliente.',
    docsReceived: 'Documenti ricevuti',
    docsReceivedDesc: 'Documenti ricevuti da questo cliente.',
    clientRequests: 'Richieste cliente',
    clientRequestsDesc: 'Richieste di documenti fatte da questo cliente.',
    noDocs: 'Nessun documento trovato.',
    noRequests: 'Nessuna richiesta trovata.',
    subject: 'Oggetto',
    message: 'Messaggio',
    date: 'Data',
    status: 'Stato',
    actions: 'Azioni',
    viewDocument: 'Visualizza documento',
    download: 'Scarica',
    fulfill: 'Esegui',
    tasks: 'Attività',
    tasksDesc: 'Attività in sospeso e completate per questa azienda.',
    addTask: 'Aggiungi attività',
    noTasks: 'Nessuna attività trovata.',
    taskTitle: 'Titolo',
    taskDescription: 'Descrizione',
    priority: 'Priorità',
    dueDate: 'Scadenza',
    markComplete: 'Segna completato',
    history: 'Cronologia documenti',
    historyDesc: 'Tutti gli scambi di documenti con questa azienda.',
    noHistory: 'Nessuna cronologia trovata.',
    statusPending: 'In attesa',
    statusFulfilled: 'Completato',
    statusCompleted: 'Terminato',
    statusInProgress: 'In corso',
    statusApproved: 'Approvato',
    statusRejected: 'Rifiutato',
    search: 'Cerca...',
    settings: 'Impostazioni',
    settingsDesc: 'Configura le impostazioni specifiche dell\'azienda.',
    lppSettings: 'Tassi LPP / 2° pilastro',
    lppSettingsDesc: 'Configura tassi di contribuzione LPP personalizzati per questa azienda in base al tariffario dell\'assicuratore.',
    lppDefaultRates: 'Utilizzo dei tassi LPP svizzeri predefiniti',
    lppCustomRates: 'Utilizzo dei tassi personalizzati dell\'assicuratore',
    lppUseCustom: 'Abilita tassi personalizzati',
    lppAgeBracket: 'Fascia d\'età',
    lppRate: 'Tasso (%)',
    lppSaveRates: 'Salva tassi LPP',
    lppResetRates: 'Ripristina predefiniti',
    lppSaved: 'Tassi LPP salvati con successo.',
    lppReset: 'Tassi LPP ripristinati.',
  },
  es: {
    backToCompanies: 'Volver a empresas',
    companyDashboard: 'Panel de empresa',
    loading: 'Cargando...',
    companyNotFound: 'Empresa no encontrada',
    tabEmployees: 'Empleados',
    tabDocsSent: 'Docs enviados',
    tabDocsReceived: 'Docs recibidos',
    tabClientRequests: 'Solicitudes cliente',
    tabTasks: 'Tareas',
    tabHistory: 'Historial',
    tabSettings: 'Configuración',
    employees: 'Empleados',
    employeesDesc: 'Gestiona los empleados de esta empresa.',
    addEmployee: 'Agregar empleado',
    editEmployee: 'Editar empleado',
    noEmployees: 'No se encontraron empleados. Añade tu primer empleado.',
    firstName: 'Nombre',
    lastName: 'Apellido',
    email: 'Correo',
    phone: 'Teléfono',
    position: 'Puesto',
    dateOfBirth: 'Fecha de nacimiento',
    startDate: 'Fecha de inicio',
    salary: 'Salario',
    hourlyRate: 'Tarifa por hora',
    monthlySalary: 'Salario mensual',
    activityRate: 'Tasa de actividad (%)',
    vacationWeeks: 'Semanas de vacaciones',
    avsNumber: 'Número AVS',
    iban: 'IBAN',
    address: 'Dirección',
    street: 'Calle',
    city: 'Ciudad',
    postalCode: 'Código postal',
    remuType: 'Tipo de remuneración',
    hourly: 'Por hora',
    monthly: 'Mensual',
    save: 'Guardar',
    cancel: 'Cancelar',
    deleteEmployee: 'Eliminar empleado',
    deleteConfirm: '¿Estás seguro de que deseas eliminar a este empleado?',
    docsSent: 'Documentos enviados',
    docsSentDesc: 'Documentos enviados a este cliente.',
    docsReceived: 'Documentos recibidos',
    docsReceivedDesc: 'Documentos recibidos de este cliente.',
    clientRequests: 'Solicitudes del cliente',
    clientRequestsDesc: 'Solicitudes de documentos hechas por este cliente.',
    noDocs: 'No se encontraron documentos.',
    noRequests: 'No se encontraron solicitudes.',
    subject: 'Asunto',
    message: 'Mensaje',
    date: 'Fecha',
    status: 'Estado',
    actions: 'Acciones',
    viewDocument: 'Ver documento',
    download: 'Descargar',
    fulfill: 'Cumplir',
    tasks: 'Tareas',
    tasksDesc: 'Tareas pendientes y completadas para esta empresa.',
    addTask: 'Agregar tarea',
    noTasks: 'No se encontraron tareas.',
    taskTitle: 'Título',
    taskDescription: 'Descripción',
    priority: 'Prioridad',
    dueDate: 'Fecha límite',
    markComplete: 'Marcar completado',
    history: 'Historial de documentos',
    historyDesc: 'Todos los intercambios de documentos con esta empresa.',
    noHistory: 'No se encontró historial.',
    statusPending: 'Pendiente',
    statusFulfilled: 'Completado',
    statusCompleted: 'Terminado',
    statusInProgress: 'En progreso',
    statusApproved: 'Aprobado',
    statusRejected: 'Rechazado',
    search: 'Buscar...',
    settings: 'Configuración',
    settingsDesc: 'Configurar ajustes específicos de la empresa.',
    lppSettings: 'Tasas LPP / 2º pilar',
    lppSettingsDesc: 'Configure tasas de contribución LPP personalizadas para esta empresa según la tabla de tarifas de su aseguradora.',
    lppDefaultRates: 'Usando tasas LPP suizas predeterminadas',
    lppCustomRates: 'Usando tasas personalizadas de la aseguradora',
    lppUseCustom: 'Habilitar tasas personalizadas',
    lppAgeBracket: 'Grupo de edad',
    lppRate: 'Tasa (%)',
    lppSaveRates: 'Guardar tasas LPP',
    lppResetRates: 'Restablecer predeterminados',
    lppSaved: 'Tasas LPP guardadas exitosamente.',
    lppReset: 'Tasas LPP restablecidas.',
  },
};

// ─── Employee Schema ─────────────────────────────────────────────────────────

const employeeSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email().optional().or(z.literal('')),
  telephone: z.string().optional().default(''),
  position: z.string().optional().default(''),
  dateOfBirth: z.string().optional().default(''),
  startDate: z.string().optional().default(''),
  typeRemu: z.enum(['mensuel', 'horaire']).default('mensuel'),
  salaireHoraire: z.coerce.number().min(0).default(25),
  salaireMensuel: z.coerce.number().min(0).default(5000),
  tauxActivite: z.coerce.number().min(0).max(100).default(100),
  semainesVacances: z.coerce.number().min(4).max(6).default(5),
  numeroAVS: z.string().optional().default(''),
  iban: z.string().optional().default(''),
  rue: z.string().optional().default(''),
  ville: z.string().optional().default(''),
  codePostal: z.string().optional().default(''),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

// ─── Task Schema ─────────────────────────────────────────────────────────────

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().default(''),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dueDate: z.string().optional().default(''),
});

type TaskFormValues = z.infer<typeof taskSchema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const initials = (name: string) =>
  (name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('') || 'NA';

const formatTimestamp = (ts: { seconds: number; nanoseconds: number } | undefined) => {
  if (!ts) return '-';
  return format(new Date(ts.seconds * 1000), 'dd MMM yyyy HH:mm');
};

const getStatusBadge = (status: string, ui: typeof UI_BY_LOCALE['en']) => {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    pending: 'secondary',
    pending_review: 'secondary',
    in_progress: 'secondary',
    fulfilled: 'default',
    completed: 'default',
    approved: 'default',
    acknowledged: 'outline',
    rejected: 'destructive',
  };
  const labels: Record<string, string> = {
    pending: ui.statusPending,
    pending_review: ui.statusPending,
    in_progress: ui.statusInProgress,
    fulfilled: ui.statusFulfilled,
    completed: ui.statusCompleted,
    approved: ui.statusApproved,
    acknowledged: ui.statusFulfilled,
    rejected: ui.statusRejected,
  };
  return (
    <Badge variant={variants[status] || 'secondary'}>
      {labels[status] || status}
    </Badge>
  );
};

const getPriorityBadge = (priority: string) => {
  const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
    low: 'outline' as 'default',
    medium: 'secondary',
    high: 'destructive',
  };
  return <Badge variant={variants[priority] || 'secondary'}>{priority}</Badge>;
};

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function CompanyDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const currentLocale = useLocale();
  const locale = resolveLocale(currentLocale);
  const ui = UI_BY_LOCALE[locale];
  const { user, userData } = useFirebase();
  
  const companyId = params.companyId as string;
  
  // State
  const [company, setCompany] = useState<Company | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [docsSent, setDocsSent] = useState<DocumentExchange[]>([]);
  const [docsReceived, setDocsReceived] = useState<DocumentExchange[]>([]);
  const [clientRequests, setClientRequests] = useState<DocumentExchange[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('employees');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialogs
  const [showEmployeeDialog, setShowEmployeeDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Employee | null>(null);
  
  // Forms
  const employeeForm = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      firstName: '', lastName: '', email: '', telephone: '', position: '',
      dateOfBirth: '', startDate: '', typeRemu: 'mensuel',
      salaireHoraire: 25, salaireMensuel: 5000,
      tauxActivite: 100, semainesVacances: 5,
      numeroAVS: '', iban: '', rue: '', ville: '', codePostal: '',
    }
  });
  
  const taskForm = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: '', description: '', priority: 'medium', dueDate: '' }
  });

  // LPP Settings State
  const [useCustomLppRates, setUseCustomLppRates] = useState(false);
  const [customLppBrackets, setCustomLppBrackets] = useState<LppAgeBracket[]>([...LPP_DEFAULT_AGE_BRACKETS]);
  const [isSavingLpp, setIsSavingLpp] = useState(false);
  
  // Fetch company data
  useEffect(() => {
    if (!companyId) return;
    
    const fetchCompany = async () => {
      try {
        const companyDoc = await getDoc(doc(firestore, 'companies', companyId));
        if (companyDoc.exists()) {
          const companyData = companyDoc.data();
          setCompany({ id: companyDoc.id, ...companyData } as Company);
          // Load custom LPP brackets if they exist
          if (companyData.lppBrackets && Array.isArray(companyData.lppBrackets)) {
            setCustomLppBrackets(companyData.lppBrackets);
            setUseCustomLppRates(true);
          }
        }
      } catch (error) {
        console.error('Error fetching company:', error);
      }
    };
    
    fetchCompany();
  }, [companyId]);

  // Fetch employees
  useEffect(() => {
    if (!companyId) return;
    
    const q = query(
      collection(firestore, `companies/${companyId}/employees`),
      orderBy('firstName')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const emps: Employee[] = snapshot.docs.map(doc => ({
        id: doc.id,
        companyId,
        ...doc.data(),
        name: `${doc.data().firstName || ''} ${doc.data().lastName || ''}`.trim(),
      } as Employee));
      setEmployees(emps);
      setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, [companyId]);

  // Fetch documents (sent by admin to this company's admin user)
  useEffect(() => {
    if (!company?.adminUserId) return;
    
    // Documents sent TO this company
    const qSent = query(
      collection(firestore, 'document_exchanges'),
      where('recipientId', '==', company.adminUserId),
      where('type', '==', 'document_sent'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubSent = onSnapshot(qSent, (snapshot) => {
      const docs: DocumentExchange[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DocumentExchange));
      setDocsSent(docs);
    });
    
    // Documents received FROM this company
    const qReceived = query(
      collection(firestore, 'document_exchanges'),
      where('senderId', '==', company.adminUserId),
      orderBy('createdAt', 'desc')
    );
    
    const unsubReceived = onSnapshot(qReceived, (snapshot) => {
      const docs: DocumentExchange[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DocumentExchange));
      setDocsReceived(docs);
    });
    
    // Document requests BY this company
    const qRequests = query(
      collection(firestore, 'document_exchanges'),
      where('senderId', '==', company.adminUserId),
      where('type', '==', 'document_request'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubRequests = onSnapshot(qRequests, (snapshot) => {
      const docs: DocumentExchange[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DocumentExchange));
      setClientRequests(docs);
    });
    
    return () => {
      unsubSent();
      unsubReceived();
      unsubRequests();
    };
  }, [company?.adminUserId]);

  // Fetch tasks
  useEffect(() => {
    if (!companyId) return;
    
    const q = query(
      collection(firestore, 'company_tasks'),
      where('companyId', '==', companyId),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const t: Task[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Task));
      setTasks(t);
    });
    
    return () => unsubscribe();
  }, [companyId]);

  // Employee CRUD
  const handleSaveEmployee = async (values: EmployeeFormValues) => {
    if (!companyId || !user) return;
    
    try {
      if (editingEmployee) {
        await updateDoc(doc(firestore, `companies/${companyId}/employees`, editingEmployee.id), values);
        toast({ title: 'Employee updated' });
      } else {
        const docRef = await addDoc(collection(firestore, `companies/${companyId}/employees`), {
          ...values,
          companyId,
          avsStatus: 'a_verifier',
          registrationStatus: 'pending',
          registrationDate: new Date().toISOString().split('T')[0],
          payslipStatus: 'none',
          lastPayslipMonth: '',
          createdAt: serverTimestamp(),
        });
        
        // Check LPP enrollment
        const annualSalary = values.typeRemu === 'mensuel' 
          ? values.salaireMensuel * 12 
          : values.salaireHoraire * 42 * 50;
        const lppCheck = checkLppEnrollment(annualSalary, values.tauxActivite);
        
        if (lppCheck.mustEnroll) {
          await notifyAdmin({
            type: 'employee_created',
            title: 'New employee + LPP enrollment required',
            body: `${values.firstName} ${values.lastName} at ${company?.companyName || 'Company'} — Enroll in LPP immediately.`,
            priority: 'high',
            relatedUserId: user.uid,
            relatedDocumentId: docRef.id,
            metadata: { companyId, annualSalary, contribution: lppCheck.contribution }
          });
        }
        
        toast({ title: 'Employee added' });
      }
      setShowEmployeeDialog(false);
      setEditingEmployee(null);
      employeeForm.reset();
    } catch (error) {
      console.error('Error saving employee:', error);
      toast({ title: 'Error', description: 'Failed to save employee', variant: 'destructive' });
    }
  };

  const handleDeleteEmployee = async () => {
    if (!showDeleteConfirm || !companyId) return;
    
    try {
      await deleteDoc(doc(firestore, `companies/${companyId}/employees`, showDeleteConfirm.id));
      toast({ title: 'Employee deleted' });
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast({ title: 'Error', description: 'Failed to delete employee', variant: 'destructive' });
    }
  };

  const openEditEmployee = (emp: Employee) => {
    setEditingEmployee(emp);
    employeeForm.reset({
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      telephone: emp.telephone,
      position: emp.position,
      dateOfBirth: emp.dateOfBirth,
      startDate: emp.startDate,
      typeRemu: emp.typeRemu,
      salaireHoraire: emp.salaireHoraire,
      salaireMensuel: emp.salaireMensuel,
      tauxActivite: emp.tauxActivite,
      semainesVacances: emp.semainesVacances,
      numeroAVS: emp.numeroAVS,
      iban: emp.iban,
      rue: emp.rue,
      ville: emp.ville,
      codePostal: emp.codePostal,
    });
    setShowEmployeeDialog(true);
  };

  // Task CRUD
  const handleSaveTask = async (values: TaskFormValues) => {
    if (!companyId) return;
    
    try {
      await addDoc(collection(firestore, 'company_tasks'), {
        ...values,
        companyId,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Task added' });
      setShowTaskDialog(false);
      taskForm.reset();
    } catch (error) {
      console.error('Error adding task:', error);
      toast({ title: 'Error', description: 'Failed to add task', variant: 'destructive' });
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await updateDoc(doc(firestore, 'company_tasks', taskId), {
        status: 'completed',
        completedAt: serverTimestamp(),
      });
      toast({ title: 'Task completed' });
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  // LPP Settings Handlers
  const handleSaveLppRates = async () => {
    if (!companyId) return;
    setIsSavingLpp(true);
    try {
      await updateDoc(doc(firestore, 'companies', companyId), {
        lppBrackets: useCustomLppRates ? customLppBrackets : null,
        updatedAt: serverTimestamp(),
      });
      toast({ title: ui.lppSaved });
    } catch (error) {
      console.error('Error saving LPP rates:', error);
      toast({ title: 'Error', description: 'Failed to save LPP rates', variant: 'destructive' });
    } finally {
      setIsSavingLpp(false);
    }
  };

  const handleResetLppRates = () => {
    setCustomLppBrackets([...LPP_DEFAULT_AGE_BRACKETS]);
    setUseCustomLppRates(false);
    toast({ title: ui.lppReset });
  };

  const handleLppRateChange = (index: number, newRate: number) => {
    setCustomLppBrackets(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], defaultRate: newRate / 100 };
      return updated;
    });
  };

  // Filter data based on search
  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.position?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDocsSent = docsSent.filter(d =>
    d.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDocsReceived = docsReceived.filter(d =>
    d.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredClientRequests = clientRequests.filter(d =>
    d.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTasks = tasks.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // History = all document exchanges combined
  const allHistory = [...docsSent, ...docsReceived].sort((a, b) => 
    (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
  );

  if (!company && !isLoading) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {ui.backToCompanies}
        </Button>
        <Card className="mt-6">
          <CardContent className="p-6 text-center text-muted-foreground">
            {ui.companyNotFound}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/${locale}/admin/company-management`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{company?.companyName || ui.loading}</h1>
          <p className="text-muted-foreground">{ui.companyDashboard}</p>
        </div>
        <Badge variant={company?.status === 'active' ? 'default' : company?.status === 'pending_approval' ? 'secondary' : 'destructive'}>
          {company?.status || ''}
        </Badge>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={ui.search}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-7 w-full max-w-4xl">
          <TabsTrigger value="employees" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">{ui.tabEmployees}</span>
          </TabsTrigger>
          <TabsTrigger value="docs-sent" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">{ui.tabDocsSent}</span>
          </TabsTrigger>
          <TabsTrigger value="docs-received" className="flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            <span className="hidden sm:inline">{ui.tabDocsReceived}</span>
          </TabsTrigger>
          <TabsTrigger value="client-requests" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">{ui.tabClientRequests}</span>
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">{ui.tabTasks}</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">{ui.tabHistory}</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">{ui.tabSettings}</span>
          </TabsTrigger>
        </TabsList>

        {/* ─── Employees Tab ─── */}
        <TabsContent value="employees">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{ui.employees}</CardTitle>
                <CardDescription>{ui.employeesDesc}</CardDescription>
              </div>
              <Button onClick={() => { setEditingEmployee(null); employeeForm.reset(); setShowEmployeeDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                {ui.addEmployee}
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1,2,3].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {ui.noEmployees}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{ui.firstName}</TableHead>
                      <TableHead>{ui.lastName}</TableHead>
                      <TableHead className="hidden md:table-cell">{ui.position}</TableHead>
                      <TableHead className="hidden lg:table-cell">{ui.email}</TableHead>
                      <TableHead className="hidden lg:table-cell">{ui.salary}</TableHead>
                      <TableHead className="text-right">{ui.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map(emp => (
                      <TableRow key={emp.id}>
                        <TableCell className="font-medium">{emp.firstName}</TableCell>
                        <TableCell>{emp.lastName}</TableCell>
                        <TableCell className="hidden md:table-cell">{emp.position || '-'}</TableCell>
                        <TableCell className="hidden lg:table-cell">{emp.email || '-'}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {emp.typeRemu === 'mensuel' 
                            ? `CHF ${emp.salaireMensuel?.toLocaleString()}/mo`
                            : `CHF ${emp.salaireHoraire}/hr`}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditEmployee(emp)}>
                                <Edit className="h-4 w-4 mr-2" />
                                {ui.editEmployee}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => setShowDeleteConfirm(emp)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {ui.deleteEmployee}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Documents Sent Tab ─── */}
        <TabsContent value="docs-sent">
          <Card>
            <CardHeader>
              <CardTitle>{ui.docsSent}</CardTitle>
              <CardDescription>{ui.docsSentDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredDocsSent.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">{ui.noDocs}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{ui.subject}</TableHead>
                      <TableHead className="hidden md:table-cell">{ui.date}</TableHead>
                      <TableHead>{ui.status}</TableHead>
                      <TableHead className="text-right">{ui.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocsSent.map(doc => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.subject}</TableCell>
                        <TableCell className="hidden md:table-cell">{formatTimestamp(doc.createdAt)}</TableCell>
                        <TableCell>{getStatusBadge(doc.status, ui)}</TableCell>
                        <TableCell className="text-right">
                          {doc.fileUrl && (
                            <Button variant="ghost" size="icon" asChild>
                              <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Documents Received Tab ─── */}
        <TabsContent value="docs-received">
          <Card>
            <CardHeader>
              <CardTitle>{ui.docsReceived}</CardTitle>
              <CardDescription>{ui.docsReceivedDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredDocsReceived.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">{ui.noDocs}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{ui.subject}</TableHead>
                      <TableHead className="hidden md:table-cell">{ui.date}</TableHead>
                      <TableHead>{ui.status}</TableHead>
                      <TableHead className="text-right">{ui.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocsReceived.map(doc => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.subject}</TableCell>
                        <TableCell className="hidden md:table-cell">{formatTimestamp(doc.createdAt)}</TableCell>
                        <TableCell>{getStatusBadge(doc.status, ui)}</TableCell>
                        <TableCell className="text-right">
                          {(doc.fileUrl || doc.userFileUrl) && (
                            <Button variant="ghost" size="icon" asChild>
                              <a href={doc.userFileUrl || doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Client Requests Tab ─── */}
        <TabsContent value="client-requests">
          <Card>
            <CardHeader>
              <CardTitle>{ui.clientRequests}</CardTitle>
              <CardDescription>{ui.clientRequestsDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredClientRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">{ui.noRequests}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{ui.subject}</TableHead>
                      <TableHead className="hidden md:table-cell">{ui.message}</TableHead>
                      <TableHead className="hidden md:table-cell">{ui.date}</TableHead>
                      <TableHead>{ui.status}</TableHead>
                      <TableHead className="text-right">{ui.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClientRequests.map(doc => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.subject}</TableCell>
                        <TableCell className="hidden md:table-cell max-w-[200px] truncate">{doc.message}</TableCell>
                        <TableCell className="hidden md:table-cell">{formatTimestamp(doc.createdAt)}</TableCell>
                        <TableCell>{getStatusBadge(doc.status, ui)}</TableCell>
                        <TableCell className="text-right">
                          {doc.status === 'pending' && (
                            <Button variant="outline" size="sm">
                              {ui.fulfill}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tasks Tab ─── */}
        <TabsContent value="tasks">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{ui.tasks}</CardTitle>
                <CardDescription>{ui.tasksDesc}</CardDescription>
              </div>
              <Button onClick={() => { taskForm.reset(); setShowTaskDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                {ui.addTask}
              </Button>
            </CardHeader>
            <CardContent>
              {filteredTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">{ui.noTasks}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{ui.taskTitle}</TableHead>
                      <TableHead className="hidden md:table-cell">{ui.priority}</TableHead>
                      <TableHead className="hidden md:table-cell">{ui.dueDate}</TableHead>
                      <TableHead>{ui.status}</TableHead>
                      <TableHead className="text-right">{ui.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.map(task => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">{task.title}</TableCell>
                        <TableCell className="hidden md:table-cell">{getPriorityBadge(task.priority)}</TableCell>
                        <TableCell className="hidden md:table-cell">{task.dueDate || '-'}</TableCell>
                        <TableCell>{getStatusBadge(task.status, ui)}</TableCell>
                        <TableCell className="text-right">
                          {task.status !== 'completed' && (
                            <Button variant="outline" size="sm" onClick={() => handleCompleteTask(task.id)}>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              {ui.markComplete}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── History Tab ─── */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>{ui.history}</CardTitle>
              <CardDescription>{ui.historyDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              {allHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">{ui.noHistory}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>{ui.subject}</TableHead>
                      <TableHead className="hidden md:table-cell">{ui.date}</TableHead>
                      <TableHead>{ui.status}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allHistory.map(doc => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <Badge variant="outline">
                            {doc.senderId === company?.adminUserId ? 'Received' : 'Sent'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{doc.subject}</TableCell>
                        <TableCell className="hidden md:table-cell">{formatTimestamp(doc.createdAt)}</TableCell>
                        <TableCell>{getStatusBadge(doc.status, ui)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Settings Tab ─── */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>{ui.settings}</CardTitle>
              <CardDescription>{ui.settingsDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* LPP / 2nd Pillar Settings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Percent className="h-5 w-5" />
                      {ui.lppSettings}
                    </h3>
                    <p className="text-sm text-muted-foreground">{ui.lppSettingsDesc}</p>
                  </div>
                  <Badge variant={useCustomLppRates ? 'default' : 'secondary'}>
                    {useCustomLppRates ? ui.lppCustomRates : ui.lppDefaultRates}
                  </Badge>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="useCustomLpp"
                    checked={useCustomLppRates}
                    onChange={(e) => setUseCustomLppRates(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="useCustomLpp">{ui.lppUseCustom}</Label>
                </div>

                {useCustomLppRates && (
                  <div className="border rounded-lg p-4 space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{ui.lppAgeBracket}</TableHead>
                          <TableHead className="w-[150px]">{ui.lppRate}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customLppBrackets.map((bracket, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {bracket.minAge}–{bracket.maxAge} ({bracket.label.split('(')[1]?.replace(')', '') || ''})
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  max="100"
                                  value={(bracket.defaultRate * 100).toFixed(1)}
                                  onChange={(e) => handleLppRateChange(index, parseFloat(e.target.value) || 0)}
                                  className="w-24"
                                />
                                <span className="text-muted-foreground">%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button onClick={handleSaveLppRates} disabled={isSavingLpp}>
                    {isSavingLpp && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {ui.lppSaveRates}
                  </Button>
                  <Button variant="outline" onClick={handleResetLppRates}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {ui.lppResetRates}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Employee Dialog ─── */}
      <Dialog open={showEmployeeDialog} onOpenChange={setShowEmployeeDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEmployee ? ui.editEmployee : ui.addEmployee}</DialogTitle>
          </DialogHeader>
          <Form {...employeeForm}>
            <form onSubmit={employeeForm.handleSubmit(handleSaveEmployee)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={employeeForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{ui.firstName}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={employeeForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{ui.lastName}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={employeeForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{ui.email}</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={employeeForm.control}
                  name="telephone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{ui.phone}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={employeeForm.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{ui.position}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={employeeForm.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{ui.dateOfBirth}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={employeeForm.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{ui.startDate}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={employeeForm.control}
                name="typeRemu"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{ui.remuType}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="mensuel">{ui.monthly}</SelectItem>
                        <SelectItem value="horaire">{ui.hourly}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {employeeForm.watch('typeRemu') === 'mensuel' ? (
                <FormField
                  control={employeeForm.control}
                  name="salaireMensuel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{ui.monthlySalary}</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={employeeForm.control}
                  name="salaireHoraire"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{ui.hourlyRate}</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.05" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={employeeForm.control}
                  name="tauxActivite"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{ui.activityRate}</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={employeeForm.control}
                  name="semainesVacances"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{ui.vacationWeeks}</FormLabel>
                      <Select onValueChange={(v) => field.onChange(parseInt(v))} value={String(field.value)}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="4">4</SelectItem>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="6">6</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={employeeForm.control}
                name="numeroAVS"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{ui.avsNumber}</FormLabel>
                    <FormControl>
                      <Input placeholder="756.1234.5678.90" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={employeeForm.control}
                name="iban"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{ui.iban}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-2">
                <Label>{ui.address}</Label>
                <div className="grid grid-cols-1 gap-2">
                  <FormField
                    control={employeeForm.control}
                    name="rue"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder={ui.street} {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      control={employeeForm.control}
                      name="codePostal"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder={ui.postalCode} {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={employeeForm.control}
                      name="ville"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder={ui.city} {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowEmployeeDialog(false)}>
                  {ui.cancel}
                </Button>
                <Button type="submit">{ui.save}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ─── Task Dialog ─── */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{ui.addTask}</DialogTitle>
          </DialogHeader>
          <Form {...taskForm}>
            <form onSubmit={taskForm.handleSubmit(handleSaveTask)} className="space-y-4">
              <FormField
                control={taskForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{ui.taskTitle}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={taskForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{ui.taskDescription}</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={taskForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{ui.priority}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={taskForm.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{ui.dueDate}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowTaskDialog(false)}>
                  {ui.cancel}
                </Button>
                <Button type="submit">{ui.save}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Dialog ─── */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{ui.deleteEmployee}</DialogTitle>
            <DialogDescription>
              {ui.deleteConfirm}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
              {ui.cancel}
            </Button>
            <Button variant="destructive" onClick={handleDeleteEmployee}>
              {ui.deleteEmployee}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
