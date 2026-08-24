import { config } from "dotenv";

config({ quiet: true });

const url = new URL(process.env.DATABASE_URL);
url.pathname = "/macaw_test";

process.env.DATABASE_URL = url.toString();
process.env.NODE_ENV = "test";
process.env.JWT_SECRET =
  process.env.JWT_SECRET || "test-secret-de-al-menos-32-caracteres-para-jwt";
process.env.CORS_ORIGINS = "http://localhost:5173";
process.env.LOG_LEVEL = "silent";
process.env.PLATFORM_COMMISSION_RATE =
  process.env.PLATFORM_COMMISSION_RATE || "0.10";
delete process.env.MAKE_WEBHOOK_URL;
delete process.env.OPENAI_API_KEY;
