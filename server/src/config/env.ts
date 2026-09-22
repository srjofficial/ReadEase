import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';

// Load .env before validation, checking both server/ and workspace root
const candidateEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'server', '.env'),
  path.resolve(__dirname, '..', '..', '.env')
];

for (const envPath of candidateEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  API_PREFIX: z.string().default('/api/v1'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Database (MongoDB)
  MONGODB_URI: z
    .string({
      required_error: 'MONGODB_URI is required to connect to MongoDB Atlas database'
    })
    .min(1, 'MONGODB_URI cannot be empty')
    .default(process.env.NODE_ENV === 'production' ? '' : 'mongodb://localhost:27017/readease_dev'),
  MONGODB_DATABASE_NAME: z.string().default('readease'),
  MONGODB_VECTOR_INDEX_NAME: z.string().default('readease_vector_index'),
  MONGODB_MAX_POOL_SIZE: z.coerce.number().int().positive().default(20),
  MONGODB_MIN_POOL_SIZE: z.coerce.number().int().positive().default(5),
  MONGODB_CONNECT_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),

  // Authentication & Security
  JWT_SECRET: z
    .string({
      required_error: 'JWT_SECRET is required to sign authentication tokens'
    })
    .min(16, 'JWT_SECRET must be at least 16 characters (min 32 recommended in production)')
    .default(
      process.env.NODE_ENV === 'production'
        ? ''
        : 'dev_default_jwt_secret_min_32_characters_long_for_readease'
    ),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z
    .string({
      required_error: 'JWT_REFRESH_SECRET is required to sign refresh tokens'
    })
    .min(16, 'JWT_REFRESH_SECRET must be at least 16 characters')
    .default(
      process.env.NODE_ENV === 'production'
        ? ''
        : 'dev_default_jwt_refresh_secret_min_32_characters_long_readease'
    ),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // AI & LLM Service (Groq / OpenAI-compatible)
  LLM_PROVIDER: z.enum(['groq', 'openrouter', 'openai', 'custom']).default('groq'),
  LLM_API_KEY: z
    .string()
    .optional()
    .default(process.env.NODE_ENV === 'production' ? '' : 'dev_mock_llm_key'),
  LLM_MODEL: z.string().default('llama-3.3-70b-versatile'),
  LLM_BASE_URL: z.string().default('https://api.groq.com/openai/v1'),
  AI_SERVICE_URL: z.string().url().default('http://localhost:8000'),
  AI_SERVICE_SECRET: z.string().default('readease_internal_secret_key_change_in_production'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000), // 15 mins
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),

  // Frontend URL (used for verification email links)
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // 📧 Email Configuration (Resend API primary, SMTP optional fallback)
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().default('ReadEase <onboarding@resend.dev>'),

  // Optional SMTP fallback
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.preprocess((val) => val === 'true' || val === true, z.boolean().default(false)),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('"ReadEase Support" <noreply@readease.edu>')
});

export type EnvConfig = z.infer<typeof envSchema>;

const validateEnv = (): EnvConfig => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('\n' + '='.repeat(70));
    console.error('❌ [FATAL] Environment Variable Configuration Error');
    console.error('='.repeat(70));
    console.error('The following environment variables failed startup validation:\n');

    result.error.issues.forEach((issue) => {
      const field = issue.path.join('.');
      console.error(`  • [${field}]: ${issue.message}`);
    });

    console.error('\n👉 Please review server/.env or root .env.example for required settings.');
    console.error('='.repeat(70) + '\n');

    process.exit(1);
  }

  return result.data;
};

export const env = validateEnv();
