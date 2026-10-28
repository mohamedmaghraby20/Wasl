import { z } from 'zod';

const optionalText = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().min(1).optional(),
);

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
    DATABASE_URL: z.preprocess(
      (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
      z.string().url().optional(),
    ),
    SUPABASE_URL: z.preprocess(
      (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
      z.string().url().optional(),
    ),
    SUPABASE_PUBLISHABLE_KEY: optionalText,
    SUPABASE_SECRET_KEY: optionalText,
    SUPABASE_SERVICE_ROLE_KEY: optionalText,
    PLATFORM_ADMIN_USER_IDS: optionalText,
    AGE_VERIFICATION_METHOD: optionalText,
    RESEND_API_KEY: optionalText,
    RESEND_FROM_EMAIL: optionalText,
    STREAM_API_KEY: optionalText,
    STREAM_API_SECRET: optionalText,
    STREAM_PERMISSIONS_VERIFIED: z.enum(['true', 'false']).default('false'),
  })
  .superRefine((environment, context) => {
    if (environment.STREAM_PERMISSIONS_VERIFIED === 'true') {
      if (!environment.STREAM_API_KEY) {
        context.addIssue({
          code: 'custom',
          path: ['STREAM_API_KEY'],
          message: 'Required when Stream messaging permissions are verified.',
        });
      }
      if (!environment.STREAM_API_SECRET) {
        context.addIssue({
          code: 'custom',
          path: ['STREAM_API_SECRET'],
          message: 'Required when Stream messaging permissions are verified.',
        });
      }
    }
    if (environment.NODE_ENV === 'production') {
      if (!environment.RESEND_API_KEY || !environment.RESEND_FROM_EMAIL) {
        context.addIssue({
          code: 'custom',
          path: ['RESEND_API_KEY'],
          message: 'Transactional email credentials are required in production.',
        });
      }
      if (!environment.DATABASE_URL) {
        context.addIssue({
          code: 'custom',
          path: ['DATABASE_URL'],
          message: 'Required in production.',
        });
      }
      if (environment.CLIENT_ORIGIN === 'http://localhost:5173') {
        context.addIssue({
          code: 'custom',
          path: ['CLIENT_ORIGIN'],
          message: 'Set the production client origin.',
        });
      }
    }
  });

export type Environment = z.infer<typeof environmentSchema>;

export function validateEnvironment(config: Record<string, unknown>): Environment {
  return environmentSchema.parse(config);
}
