require("dotenv").config({ quiet: true });

const { z } = require("zod");

const csv = z
  .string()
  .transform((value) =>
    value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  );

const flag = z
  .enum(["true", "false"])
  .optional()
  .transform((value) => value === "true");

const schema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().positive().default(3000),

    DATABASE_URL: z.string().min(1, "DATABASE_URL es obligatoria"),

    JWT_SECRET: z
      .string()
      .min(32, "JWT_SECRET debe tener al menos 32 caracteres"),
    JWT_EXPIRES_IN: z.string().default("7d"),

    CORS_ORIGINS: csv.optional(),
    CLIENT_URL: z.string().url().optional(),

    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),

    PLATFORM_COMMISSION_RATE: z.coerce.number().min(0).max(1).default(0.1),
    PLATFORM_BASE_CURRENCY: z.literal("USD").default("USD"),

    OPENAI_API_KEY: z.string().optional(),
    MAKE_WEBHOOK_URL: z.string().url().optional(),

    EMAIL_VERIFICATION_ENABLED: flag,

    MAIL_HOST: z.string().default("smtp.gmail.com"),
    MAIL_PORT: z.coerce.number().int().positive().default(465),
    MAIL_USER: z.string().optional(),
    MAIL_PASS: z.string().optional(),

    PAYPAL_MODE: z.enum(["sandbox", "live"]).default("sandbox"),
    PAYPAL_CLIENT_ID: z.string().optional(),
    PAYPAL_CLIENT_SECRET: z.string().optional(),

    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),
    CLOUDINARY_FOLDER: z.string().default("macaw"),
    UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(2 * 1024 * 1024),
  })
  .transform((env) => ({
    ...env,
    uploadsEnabled: Boolean(
      env.CLOUDINARY_CLOUD_NAME &&
        env.CLOUDINARY_API_KEY &&
        env.CLOUDINARY_API_SECRET,
    ),
    corsOrigins:
      env.CORS_ORIGINS?.length > 0
        ? env.CORS_ORIGINS
        : env.CLIENT_URL
          ? [env.CLIENT_URL]
          : [],
    isProduction: env.NODE_ENV === "production",
    isTest: env.NODE_ENV === "test",
  }))
  .superRefine((env, ctx) => {
    if (env.corsOrigins.length === 0 && !env.isTest) {
      ctx.addIssue({
        code: "custom",
        path: ["CORS_ORIGINS"],
        message: "Define CORS_ORIGINS (o CLIENT_URL) con al menos un origen",
      });
    }

    if (env.isProduction && !env.PAYPAL_CLIENT_ID) {
      ctx.addIssue({
        code: "custom",
        path: ["PAYPAL_CLIENT_ID"],
        message: "PAYPAL_CLIENT_ID es obligatoria en producción",
      });
    }
  });

const result = schema.safeParse(process.env);

if (!result.success) {
  const detail = result.error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(raíz)"}: ${issue.message}`)
    .join("\n");

  console.error(`Configuración inválida:\n${detail}`);
  throw new Error("Configuración de entorno inválida");
}

module.exports = result.data;
