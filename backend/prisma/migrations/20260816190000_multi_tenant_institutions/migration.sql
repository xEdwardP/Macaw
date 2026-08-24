-- Renombrados fisicos. Escrito a mano: Prisma genera DROP TABLE + CREATE TABLE
-- para un renombrado de modelo, lo que destruiria los datos existentes.

ALTER TABLE "University" RENAME TO "Institution";
ALTER TABLE "Faculty" RENAME TO "AcademicUnit";
ALTER TABLE "FacultySubject" RENAME TO "UnitSubject";

ALTER TABLE "AcademicUnit" RENAME COLUMN "universityId" TO "institutionId";
ALTER TABLE "UnitSubject" RENAME COLUMN "facultyId" TO "academicUnitId";
ALTER TABLE "User" RENAME COLUMN "universityId" TO "institutionId";
ALTER TABLE "User" RENAME COLUMN "facultyId" TO "academicUnitId";
ALTER TABLE "User" RENAME COLUMN "career" TO "program";
ALTER TABLE "User" RENAME COLUMN "quarter" TO "termNumber";
ALTER TABLE "User" RENAME COLUMN "gpa" TO "academicScore";
ALTER TABLE "Subject" RENAME COLUMN "quarter" TO "termNumber";
ALTER TABLE "Subsidy" RENAME COLUMN "universityId" TO "institutionId";

ALTER TABLE "Institution" RENAME CONSTRAINT "University_pkey" TO "Institution_pkey";
ALTER INDEX "University_domain_key" RENAME TO "Institution_domain_key";

ALTER TABLE "AcademicUnit" RENAME CONSTRAINT "Faculty_pkey" TO "AcademicUnit_pkey";
ALTER TABLE "AcademicUnit" RENAME CONSTRAINT "Faculty_universityId_fkey" TO "AcademicUnit_institutionId_fkey";
ALTER INDEX "Faculty_universityId_code_key" RENAME TO "AcademicUnit_institutionId_code_key";
ALTER INDEX "Faculty_universityId_idx" RENAME TO "AcademicUnit_institutionId_idx";

ALTER TABLE "UnitSubject" RENAME CONSTRAINT "FacultySubject_pkey" TO "UnitSubject_pkey";
ALTER TABLE "UnitSubject" RENAME CONSTRAINT "FacultySubject_facultyId_fkey" TO "UnitSubject_academicUnitId_fkey";
ALTER TABLE "UnitSubject" RENAME CONSTRAINT "FacultySubject_subjectId_fkey" TO "UnitSubject_subjectId_fkey";
ALTER INDEX "FacultySubject_facultyId_subjectId_key" RENAME TO "UnitSubject_academicUnitId_subjectId_key";
ALTER INDEX "FacultySubject_subjectId_idx" RENAME TO "UnitSubject_subjectId_idx";

ALTER TABLE "User" RENAME CONSTRAINT "User_universityId_fkey" TO "User_institutionId_fkey";
ALTER TABLE "User" RENAME CONSTRAINT "User_facultyId_fkey" TO "User_academicUnitId_fkey";
ALTER INDEX "User_universityId_role_idx" RENAME TO "User_institutionId_role_idx";
ALTER INDEX "User_facultyId_idx" RENAME TO "User_academicUnitId_idx";

ALTER TABLE "Subsidy" RENAME CONSTRAINT "Subsidy_universityId_fkey" TO "Subsidy_institutionId_fkey";
ALTER INDEX "Subsidy_universityId_appliedAt_idx" RENAME TO "Subsidy_institutionId_appliedAt_idx";

DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT conrelid::regclass::text AS tbl, conname
    FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
      AND contype = 'n'
      AND (conname LIKE 'University\_%' OR conname LIKE 'Faculty\_%' OR conname LIKE 'FacultySubject\_%')
  LOOP
    EXECUTE format(
      'ALTER TABLE %s RENAME CONSTRAINT %I TO %I',
      c.tbl,
      c.conname,
      regexp_replace(
        regexp_replace(
          regexp_replace(c.conname, '^FacultySubject_', 'UnitSubject_'),
          '^Faculty_', 'AcademicUnit_'),
        '^University_', 'Institution_')
    );
  END LOOP;
END $$;

ALTER TABLE "AcademicUnit" RENAME CONSTRAINT "AcademicUnit_universityId_not_null" TO "AcademicUnit_institutionId_not_null";
ALTER TABLE "UnitSubject" RENAME CONSTRAINT "UnitSubject_facultyId_not_null" TO "UnitSubject_academicUnitId_not_null";
ALTER TABLE "Subsidy" RENAME CONSTRAINT "Subsidy_universityId_not_null" TO "Subsidy_institutionId_not_null";

-- Renombrado de valores del enum de roles. Instantaneo en PostgreSQL: no reescribe filas.
-- Los JWT ya emitidos siguen siendo validos porque el rol se relee de la base en cada peticion.

ALTER TYPE "Role" RENAME VALUE 'university' TO 'institution_admin';
ALTER TYPE "Role" RENAME VALUE 'admin' TO 'platform_admin';
ALTER TYPE "Role" ADD VALUE 'institution_staff';
ALTER TYPE "Role" ADD VALUE 'guardian';

CREATE TYPE "InstitutionType" AS ENUM ('university', 'college', 'school', 'technical', 'academy', 'bootcamp', 'organization');
CREATE TYPE "InstitutionStatus" AS ENUM ('pending', 'active', 'suspended');
CREATE TYPE "AcademicUnitKind" AS ENUM ('faculty', 'level', 'department', 'area', 'program');
CREATE TYPE "SubscriptionStatus" AS ENUM ('trialing', 'active', 'past_due', 'suspended', 'cancelled');
CREATE TYPE "InvitationStatus" AS ENUM ('pending', 'accepted', 'revoked', 'expired');

-- Catalogo de monedas. Se puebla dentro de la migracion porque
-- Institution.currencyCode lleva clave foranea y valor por defecto.

CREATE TABLE "Currency" (
    "code" VARCHAR(3) NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL DEFAULT 2,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("code")
);

CREATE INDEX "Currency_isActive_displayOrder_idx" ON "Currency"("isActive", "displayOrder");

INSERT INTO "Currency" ("code", "name", "symbol", "decimals", "displayOrder") VALUES
    ('USD', 'Dólar estadounidense', '$', 2, 1),
    ('HNL', 'Lempira hondureño', 'L', 2, 2),
    ('MXN', 'Peso mexicano', '$', 2, 3),
    ('EUR', 'Euro', '€', 2, 4),
    ('GTQ', 'Quetzal guatemalteco', 'Q', 2, 5),
    ('CRC', 'Colón costarricense', '₡', 2, 6),
    ('COP', 'Peso colombiano', '$', 2, 7);

CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "fromCurrency" VARCHAR(3) NOT NULL,
    "toCurrency" VARCHAR(3) NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "source" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExchangeRate_fromCurrency_toCurrency_validFrom_key" ON "ExchangeRate"("fromCurrency", "toCurrency", "validFrom");
CREATE INDEX "ExchangeRate_fromCurrency_toCurrency_validFrom_idx" ON "ExchangeRate"("fromCurrency", "toCurrency", "validFrom");

ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_fromCurrency_fkey" FOREIGN KEY ("fromCurrency") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_toCurrency_fkey" FOREIGN KEY ("toCurrency") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxStudents" INTEGER,
    "priceMonthly" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currencyCode" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "features" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Plan_code_key" ON "Plan"("code");
CREATE INDEX "Plan_isActive_displayOrder_idx" ON "Plan"("isActive", "displayOrder");
CREATE INDEX "Plan_currencyCode_idx" ON "Plan"("currencyCode");

ALTER TABLE "Plan" ADD CONSTRAINT "Plan_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "Plan" ("id", "code", "name", "maxStudents", "priceMonthly", "currencyCode", "features", "displayOrder") VALUES
    ('plan_starter', 'starter', 'Starter', 200, 49, 'USD', '{"analytics":false,"csvImport":false,"customBranding":false}', 1),
    ('plan_basic', 'basic', 'Básico', 1000, 149, 'USD', '{"analytics":true,"csvImport":true,"customBranding":false}', 2),
    ('plan_pro', 'pro', 'Pro', 5000, 399, 'USD', '{"analytics":true,"csvImport":true,"customBranding":true}', 3),
    ('plan_enterprise', 'enterprise', 'Enterprise', NULL, 0, 'USD', '{"analytics":true,"csvImport":true,"customBranding":true,"sso":true}', 4);

-- Institucion: columnas nuevas de configuracion por tenant.

ALTER TABLE "Institution"
    ADD COLUMN "type" "InstitutionType" NOT NULL DEFAULT 'university',
    ADD COLUMN "status" "InstitutionStatus" NOT NULL DEFAULT 'active',
    ADD COLUMN "currencyCode" VARCHAR(3) NOT NULL DEFAULT 'USD',
    ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'America/Tegucigalpa',
    ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'es',
    ADD COLUMN "primaryColor" TEXT,
    ADD COLUMN "settings" JSONB NOT NULL DEFAULT '{}',
    ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Institution" ALTER COLUMN "commissionRate" DROP NOT NULL;
ALTER TABLE "Institution" ALTER COLUMN "commissionRate" DROP DEFAULT;

UPDATE "Institution" SET "settings" = '{"allowCrossInstitutionTutoring":false,"crossInstitutionAllowList":[],"allowCrossCurrencySessions":false,"studentSelfTopUp":true,"tutorWithdrawals":true}';

ALTER TABLE "Institution" ADD CONSTRAINT "Institution_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Institution_type_status_idx" ON "Institution"("type", "status");
CREATE INDEX "Institution_currencyCode_idx" ON "Institution"("currencyCode");

CREATE TABLE "InstitutionDomain" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstitutionDomain_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InstitutionDomain_domain_key" ON "InstitutionDomain"("domain");
CREATE INDEX "InstitutionDomain_institutionId_idx" ON "InstitutionDomain"("institutionId");

ALTER TABLE "InstitutionDomain" ADD CONSTRAINT "InstitutionDomain_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "InstitutionDomain" ("id", "institutionId", "domain", "isPrimary", "verifiedAt")
SELECT 'dom_' || "id", "id", "domain", true, CURRENT_TIMESTAMP FROM "Institution";

-- Suscripciones: las instituciones que ya existian quedan en enterprise.
-- Imponerles retroactivamente un limite de estudiantes que nunca aceptaron
-- bloquearia registros que hoy funcionan.

CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'trialing',
    "currentStudents" INTEGER NOT NULL DEFAULT 0,
    "trialEndsAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "renewsAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Subscription_institutionId_key" ON "Subscription"("institutionId");
CREATE INDEX "Subscription_planId_idx" ON "Subscription"("planId");
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "Subscription" ("id", "institutionId", "planId", "status", "currentStudents")
SELECT 'sub_' || i."id", i."id", 'plan_enterprise', 'active',
       (SELECT count(*) FROM "User" u WHERE u."institutionId" = i."id" AND u."role" = 'student' AND u."isActive")
FROM "Institution" i;

ALTER TABLE "AcademicUnit" ADD COLUMN "kind" "AcademicUnitKind" NOT NULL DEFAULT 'faculty';

CREATE TABLE "GradeLevel" (
    "id" TEXT NOT NULL,
    "academicUnitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GradeLevel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GradeLevel_academicUnitId_code_key" ON "GradeLevel"("academicUnitId", "code");
CREATE INDEX "GradeLevel_academicUnitId_orderIndex_idx" ON "GradeLevel"("academicUnitId", "orderIndex");

ALTER TABLE "GradeLevel" ADD CONSTRAINT "GradeLevel_academicUnitId_fkey" FOREIGN KEY ("academicUnitId") REFERENCES "AcademicUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "User" ADD COLUMN "gradeLevelId" TEXT;
CREATE INDEX "User_gradeLevelId_idx" ON "User"("gradeLevelId");
ALTER TABLE "User" ADD CONSTRAINT "User_gradeLevelId_fkey" FOREIGN KEY ("gradeLevelId") REFERENCES "GradeLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Materias por institucion. El backfill es determinista: se comprobo antes de
-- escribir esta migracion que ninguna materia pertenece a dos instituciones.

ALTER TABLE "Subject" ADD COLUMN "institutionId" TEXT;

UPDATE "Subject" s SET "institutionId" = (
    SELECT au."institutionId"
    FROM "UnitSubject" us
    JOIN "AcademicUnit" au ON au."id" = us."academicUnitId"
    WHERE us."subjectId" = s."id"
    LIMIT 1
);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "Subject" WHERE "institutionId" IS NULL) THEN
        RAISE EXCEPTION 'Backfill incompleto: hay materias sin institucion asignada';
    END IF;
END $$;

ALTER TABLE "Subject" ALTER COLUMN "institutionId" SET NOT NULL;
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP INDEX "Subject_code_key";
DROP INDEX "Subject_isGeneral_idx";
CREATE UNIQUE INDEX "Subject_institutionId_code_key" ON "Subject"("institutionId", "code");
CREATE INDEX "Subject_institutionId_isGeneral_idx" ON "Subject"("institutionId", "isGeneral");

-- Sesion: institucion denormalizada desde el estudiante, que es quien paga.
-- Sin esta columna, acotar una sesion a un tenant exige un OR con dos joins a User.

ALTER TABLE "Session" ADD COLUMN "institutionId" TEXT;

UPDATE "Session" s SET "institutionId" = u."institutionId"
FROM "User" u WHERE u."id" = s."studentId";

CREATE INDEX "Session_institutionId_date_idx" ON "Session"("institutionId", "date");
ALTER TABLE "Session" ADD CONSTRAINT "Session_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Invitaciones y auditoria: tablas sin API hasta el Sprint 4. Se crean ahora
-- para no necesitar otra migracion sobre datos ya en produccion.

CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'institution_admin',
    "token" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'pending',
    "invitedById" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");
CREATE INDEX "Invitation_institutionId_status_idx" ON "Invitation"("institutionId", "status");
CREATE INDEX "Invitation_email_idx" ON "Invitation"("email");

ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_institutionId_createdAt_idx" ON "AuditLog"("institutionId", "createdAt");
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;
