import { z } from 'zod';

const money = z.coerce.number().finite().min(-9_999_999).max(9_999_999);

export const monthlyPayrollSubmissionBodySchema = z
  .object({
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be YYYY-MM'),
    employeeId: z.string().min(1).max(256),
    hours: z.coerce.number().finite().min(0).max(400),
    feesToReimburse: money,
    feesToDeduct: money,
    privateVehicleKm: z.coerce.number().finite().min(0).max(50_000),
    mealsToReimburse: money,
    mealsToDeduct: money,
    bonus: money,
    prime: money,
  })
  .strict();

export type MonthlyPayrollSubmissionBody = z.infer<typeof monthlyPayrollSubmissionBodySchema>;
