import { execSync } from "node:child_process";
import { config } from "dotenv";

config({ quiet: true });

const TEST_DB_NAME = "macaw_test";

const buildTestUrl = () => {
  const base = process.env.DATABASE_URL;
  if (!base) throw new Error("DATABASE_URL no está definida");

  const url = new URL(base);
  url.pathname = `/${TEST_DB_NAME}`;
  return url.toString();
};

export async function setup() {
  const adminUrl = new URL(process.env.DATABASE_URL);
  adminUrl.pathname = "/postgres";

  const psql = (sql) =>
    execSync(
      `docker exec macaw_postgres psql -U ${adminUrl.username} -d postgres -c "${sql}"`,
      { stdio: "pipe" },
    );

  try {
    psql(`DROP DATABASE IF EXISTS ${TEST_DB_NAME} WITH (FORCE)`);
    psql(`CREATE DATABASE ${TEST_DB_NAME}`);
  } catch (err) {
    throw new Error(
      `No se pudo preparar la base de datos de test. ¿Está corriendo el contenedor macaw_postgres?\n${err.message}`,
    );
  }

  const testUrl = buildTestUrl();

  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: "pipe",
  });

  process.env.DATABASE_URL = testUrl;

  return () => {};
}

export { buildTestUrl, TEST_DB_NAME };
