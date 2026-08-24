-- CreateEnum
CREATE TYPE "LedgerAccountKind" AS ENUM ('user_wallet', 'user_escrow', 'platform_revenue', 'institution_funds', 'external_payments', 'external_payouts', 'opening_balance');

-- CreateEnum
CREATE TYPE "LedgerDirection" AS ENUM ('debit', 'credit');

-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('wallet_topup', 'institution_topup');

-- CreateEnum
CREATE TYPE "PaymentOrderStatus" AS ENUM ('created', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('pending', 'processing', 'delivered', 'failed');

-- AlterTable
ALTER TABLE "ExchangeRate" ALTER COLUMN "rate" SET DATA TYPE DECIMAL(18,8);

-- AlterTable
ALTER TABLE "Institution" ALTER COLUMN "commissionRate" SET DATA TYPE DECIMAL(5,4),
ALTER COLUMN "balance" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "Plan" ALTER COLUMN "priceMonthly" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "commissionRate" DECIMAL(5,4) NOT NULL DEFAULT 0.10,
ADD COLUMN     "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
ALTER COLUMN "price" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "Subsidy" ADD COLUMN     "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
ADD COLUMN     "ledgerTransactionId" TEXT,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "TutorProfile" ALTER COLUMN "hourlyRate" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "academicScore" SET DATA TYPE DECIMAL(5,2);

-- AlterTable
ALTER TABLE "Wallet" ADD COLUMN     "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
ALTER COLUMN "balance" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "frozen" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "lifetimeEarned" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "WithdrawalRequest" ADD COLUMN     "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(14,2);

-- CreateTable
CREATE TABLE "LedgerAccount" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "kind" "LedgerAccountKind" NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "userId" TEXT,
    "institutionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerTransaction" (
    "id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "sessionId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "ledgerTransactionId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "direction" "LedgerDirection" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentOrder" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'paypal',
    "providerOrderId" TEXT NOT NULL,
    "purpose" "PaymentPurpose" NOT NULL,
    "userId" TEXT,
    "institutionId" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "status" "PaymentOrderStatus" NOT NULL DEFAULT 'created',
    "capturedAmount" DECIMAL(14,2),
    "capturedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "providerPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LedgerAccount_key_key" ON "LedgerAccount"("key");

-- CreateIndex
CREATE INDEX "LedgerAccount_kind_currency_idx" ON "LedgerAccount"("kind", "currency");

-- CreateIndex
CREATE INDEX "LedgerAccount_userId_idx" ON "LedgerAccount"("userId");

-- CreateIndex
CREATE INDEX "LedgerAccount_institutionId_idx" ON "LedgerAccount"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerTransaction_idempotencyKey_key" ON "LedgerTransaction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "LedgerTransaction_sessionId_idx" ON "LedgerTransaction"("sessionId");

-- CreateIndex
CREATE INDEX "LedgerTransaction_createdAt_idx" ON "LedgerTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "LedgerEntry_ledgerTransactionId_idx" ON "LedgerEntry"("ledgerTransactionId");

-- CreateIndex
CREATE INDEX "LedgerEntry_accountId_createdAt_idx" ON "LedgerEntry"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "LedgerEntry_sessionId_idx" ON "LedgerEntry"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOrder_providerOrderId_key" ON "PaymentOrder"("providerOrderId");

-- CreateIndex
CREATE INDEX "PaymentOrder_userId_status_idx" ON "PaymentOrder"("userId", "status");

-- CreateIndex
CREATE INDEX "PaymentOrder_institutionId_status_idx" ON "PaymentOrder"("institutionId", "status");

-- CreateIndex
CREATE INDEX "PaymentOrder_status_createdAt_idx" ON "PaymentOrder"("status", "createdAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_status_availableAt_idx" ON "OutboxEvent"("status", "availableAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_type_createdAt_idx" ON "OutboxEvent"("type", "createdAt");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_ledgerTransactionId_fkey" FOREIGN KEY ("ledgerTransactionId") REFERENCES "LedgerTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerAccount" ADD CONSTRAINT "LedgerAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerAccount" ADD CONSTRAINT "LedgerAccount_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_ledgerTransactionId_fkey" FOREIGN KEY ("ledgerTransactionId") REFERENCES "LedgerTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "LedgerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Backfill de moneda: cada monto hereda la moneda de la institucion a la que pertenece.
-- Los usuarios sin institucion (plataforma, admin) se quedan en la moneda base.

UPDATE "Wallet" w SET "currency" = i."currencyCode"
FROM "User" u JOIN "Institution" i ON i."id" = u."institutionId"
WHERE u."id" = w."userId";

UPDATE "Session" s SET "currency" = i."currencyCode",
                       "commissionRate" = COALESCE(i."commissionRate", 0.10)
FROM "Institution" i WHERE i."id" = s."institutionId";

UPDATE "Subsidy" sub SET "currency" = i."currencyCode"
FROM "Institution" i WHERE i."id" = sub."institutionId";

UPDATE "Transaction" t SET "currency" = w."currency"
FROM "Wallet" w WHERE w."id" = t."walletId";

UPDATE "WithdrawalRequest" wr SET "currency" = w."currency"
FROM "Wallet" w WHERE w."userId" = wr."userId";

-- Apertura del ledger. Los movimientos historicos nacieron descuadrados (ese es el bug
-- B-32): convertirlos en asientos de partida doble inventaria contrapartidas que nunca
-- existieron. En su lugar se abre la contabilidad como cualquier otra: un asiento de
-- apertura por cuenta contra "opening_balance", con el saldo vigente.

INSERT INTO "LedgerAccount" ("id", "key", "kind", "currency", "userId", "createdAt")
SELECT 'lacc_w_' || w."id", 'user_wallet:' || w."currency" || ':' || w."userId",
       'user_wallet', w."currency", w."userId", CURRENT_TIMESTAMP
FROM "Wallet" w;

INSERT INTO "LedgerAccount" ("id", "key", "kind", "currency", "userId", "createdAt")
SELECT 'lacc_e_' || w."id", 'user_escrow:' || w."currency" || ':' || w."userId",
       'user_escrow', w."currency", w."userId", CURRENT_TIMESTAMP
FROM "Wallet" w;

INSERT INTO "LedgerAccount" ("id", "key", "kind", "currency", "institutionId", "createdAt")
SELECT 'lacc_i_' || i."id", 'institution_funds:' || i."currencyCode" || ':' || i."id",
       'institution_funds', i."currencyCode", i."id", CURRENT_TIMESTAMP
FROM "Institution" i;

INSERT INTO "LedgerAccount" ("id", "key", "kind", "currency", "createdAt")
SELECT 'lacc_open_' || c."code", 'opening_balance:' || c."code" || ':system',
       'opening_balance', c."code", CURRENT_TIMESTAMP
FROM "Currency" c;

INSERT INTO "LedgerTransaction" ("id", "reason", "idempotencyKey", "createdAt")
VALUES ('ltx_opening', 'ledger.opening_balance', 'ledger:opening', CURRENT_TIMESTAMP);

INSERT INTO "LedgerEntry" ("id", "ledgerTransactionId", "accountId", "direction", "amount", "currency", "createdAt")
SELECT 'lent_wc_' || w."id", 'ltx_opening', 'lacc_w_' || w."id", 'credit',
       w."balance", w."currency", CURRENT_TIMESTAMP
FROM "Wallet" w WHERE w."balance" <> 0;

INSERT INTO "LedgerEntry" ("id", "ledgerTransactionId", "accountId", "direction", "amount", "currency", "createdAt")
SELECT 'lent_ec_' || w."id", 'ltx_opening', 'lacc_e_' || w."id", 'credit',
       w."frozen", w."currency", CURRENT_TIMESTAMP
FROM "Wallet" w WHERE w."frozen" <> 0;

INSERT INTO "LedgerEntry" ("id", "ledgerTransactionId", "accountId", "direction", "amount", "currency", "createdAt")
SELECT 'lent_ic_' || i."id", 'ltx_opening', 'lacc_i_' || i."id", 'credit',
       i."balance", i."currencyCode", CURRENT_TIMESTAMP
FROM "Institution" i WHERE i."balance" <> 0;

INSERT INTO "LedgerEntry" ("id", "ledgerTransactionId", "accountId", "direction", "amount", "currency", "createdAt")
SELECT 'lent_open_' || e."currency", 'ltx_opening', 'lacc_open_' || e."currency", 'debit',
       sum(e."amount"), e."currency", CURRENT_TIMESTAMP
FROM "LedgerEntry" e WHERE e."ledgerTransactionId" = 'ltx_opening' AND e."direction" = 'credit'
GROUP BY e."currency";

DO $$
DECLARE
  descuadre NUMERIC;
BEGIN
  SELECT COALESCE(sum(CASE WHEN "direction" = 'debit' THEN "amount" ELSE -"amount" END), 0)
  INTO descuadre FROM "LedgerEntry" WHERE "ledgerTransactionId" = 'ltx_opening';

  IF descuadre <> 0 THEN
    RAISE EXCEPTION 'El asiento de apertura no cuadra: descuadre de %', descuadre;
  END IF;
END $$;

-- No negatividad a nivel de base (B-31). Se anaden despues de migrar los datos.

ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_balance_non_negative" CHECK ("balance" >= 0);
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_frozen_non_negative" CHECK ("frozen" >= 0);
ALTER TABLE "Institution" ADD CONSTRAINT "Institution_balance_non_negative" CHECK ("balance" >= 0);
ALTER TABLE "Session" ADD CONSTRAINT "Session_price_non_negative" CHECK ("price" >= 0);
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_amount_positive" CHECK ("amount" > 0);
