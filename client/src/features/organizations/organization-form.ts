import { z } from 'zod';

const optionalUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => !value || /^https?:\/\//i.test(value), 'url');

export const organizationFormSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(5000),
  type: z.string().trim().min(1).max(80),
  cityId: z.string(),
  locationName: z.string().trim().max(160),
  websiteUrl: optionalUrl,
  socialUrl: optionalUrl,
});

export type OrganizationFormValues = z.infer<typeof organizationFormSchema>;
