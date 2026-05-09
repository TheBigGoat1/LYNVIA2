import { z } from 'zod';

export const employeeChildFirestoreSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  dateOfBirth: z.string().optional().default(''),
  sharedCustody: z.boolean().default(false),
  otherParentFirstName: z.string().optional().default(''),
  otherParentLastName: z.string().optional().default(''),
  otherParentAddress: z.string().optional().default(''),
  otherParentAVS: z.string().optional().default(''),
});

export const employeeFirestoreSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.string().optional().default(''),
  telephone: z.string().optional().default(''),
  email: z.string().optional().default(''),
  position: z.string().min(1, 'Position is required'),
  startDate: z.string().optional().default(''),
  typeRemu: z.enum(['horaire', 'mensuel']).default('horaire'),
  salaireHoraire: z.coerce.number().min(0).default(25),
  salaireMensuel: z.coerce.number().min(0).default(5000),
  tauxActivite: z.coerce.number().min(0).max(100).default(100),
  semainesVacances: z.coerce.number().min(4).max(6).default(5),
  numeroAVS: z.string().optional().default(''),
  iban: z.string().optional().default(''),
  rue: z.string().optional().default(''),
  ville: z.string().optional().default(''),
  codePostal: z.string().optional().default(''),
  residencePermit: z.enum(['L', 'B', 'C', 'F', 'G', 'none']).default('none'),
  maritalStatus: z.enum(['single', 'married', 'divorced', 'separated']).default('single'),
  hasChildren: z.boolean().default(false),
  children: z.array(employeeChildFirestoreSchema).default([]),
  taxAtSource: z.boolean().default(false),
  documentUrl: z.string().optional().default(''),
  documentName: z.string().optional().default(''),
});

export type EmployeeFormValues = z.infer<typeof employeeFirestoreSchema>;

export function employeePayloadForFirestore(values: EmployeeFormValues): EmployeeFormValues & {
  prenom: string;
  nom: string;
  fonction: string;
} {
  return {
    ...values,
    prenom: values.firstName,
    nom: values.lastName,
    fonction: values.position,
  };
}
