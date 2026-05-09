import { z } from 'zod';

/** Employer-side contribution rates as decimals (e.g. 0.053 for 5.3%). */
export const companyRatesSchema = z
  .object({
    avs: z.coerce.number().finite().min(0).max(0.5),
    ac: z.coerce.number().finite().min(0).max(0.5),
    laa: z.coerce.number().finite().min(0).max(0.5),
    ijm: z.coerce.number().finite().min(0).max(0.5),
    lpp: z.coerce.number().finite().min(0).max(0.5),
    caf: z.coerce.number().finite().min(0).max(0.5),
  })
  .strict();

export type CompanyRatesPayload = z.infer<typeof companyRatesSchema>;
