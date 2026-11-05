-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Flow" AS ENUM ('expense', 'income', 'transfer', 'refund');

-- CreateTable
CREATE TABLE "Household" (
    "id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL DEFAULT '家庭账本',
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'America/New_York',
    "digest_hour" INTEGER NOT NULL DEFAULT 21,
    "digest_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "username" VARCHAR(64) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "household_id" UUID NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "household_id" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankConnection" (
    "id" UUID NOT NULL,
    "household_id" UUID NOT NULL,
    "provider" VARCHAR(10) NOT NULL DEFAULT 'plaid',
    "item_id" VARCHAR(150) NOT NULL,
    "encrypted_access_token" TEXT NOT NULL DEFAULT '',
    "account_id" VARCHAR(150) NOT NULL DEFAULT '',
    "account_name" VARCHAR(150) NOT NULL,
    "mask" VARCHAR(8) NOT NULL DEFAULT '',
    "institution_id" VARCHAR(100) NOT NULL DEFAULT '',
    "cursor" TEXT NOT NULL DEFAULT '',
    "initial_sync_complete" BOOLEAN NOT NULL DEFAULT false,
    "state" VARCHAR(30) NOT NULL DEFAULT 'connected',
    "error_code" VARCHAR(100) NOT NULL DEFAULT '',
    "sync_requested" INTEGER NOT NULL DEFAULT 1,
    "sync_completed" INTEGER NOT NULL DEFAULT 0,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_synced_at" TIMESTAMP(3),
    "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerTransaction" (
    "id" UUID NOT NULL,
    "bank_id" UUID NOT NULL,
    "provider_id" VARCHAR(150) NOT NULL,
    "amount_cents" BIGINT NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "date" DATE NOT NULL,
    "authorized_date" DATE,
    "name" VARCHAR(500) NOT NULL,
    "merchant" VARCHAR(250) NOT NULL DEFAULT '',
    "pending" BOOLEAN NOT NULL DEFAULT false,
    "removed" BOOLEAN NOT NULL DEFAULT false,
    "suggested_category" VARCHAR(150) NOT NULL DEFAULT '',
    "category_id" INTEGER,
    "flow" "Flow" NOT NULL,
    "flow_manual" BOOLEAN NOT NULL DEFAULT false,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "note" VARCHAR(1000) NOT NULL DEFAULT '',
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notify_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionEdit" (
    "id" SERIAL NOT NULL,
    "transaction_id" UUID NOT NULL,
    "actor_id" UUID,
    "changes" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionEdit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyDigest" (
    "id" SERIAL NOT NULL,
    "household_id" UUID NOT NULL,
    "local_date" DATE NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "window_end" TIMESTAMP(3) NOT NULL,
    "new_count" INTEGER NOT NULL,
    "expense_cents" BIGINT NOT NULL,
    "unreviewed_count" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyDigest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigestRead" (
    "id" SERIAL NOT NULL,
    "digest_id" INTEGER NOT NULL,
    "user_id" UUID NOT NULL,
    "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DigestRead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "key" VARCHAR(64) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "window_start" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "session" (
    "sid" VARCHAR NOT NULL,
    "sess" JSON NOT NULL,
    "expire" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Category_household_id_name_key" ON "Category"("household_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "BankConnection_household_id_key" ON "BankConnection"("household_id");

-- CreateIndex
CREATE UNIQUE INDEX "BankConnection_item_id_key" ON "BankConnection"("item_id");

-- CreateIndex
CREATE INDEX "LedgerTransaction_bank_id_date_idx" ON "LedgerTransaction"("bank_id", "date");

-- CreateIndex
CREATE INDEX "LedgerTransaction_notify_at_idx" ON "LedgerTransaction"("notify_at");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerTransaction_bank_id_provider_id_key" ON "LedgerTransaction"("bank_id", "provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "DailyDigest_household_id_local_date_key" ON "DailyDigest"("household_id", "local_date");

-- CreateIndex
CREATE UNIQUE INDEX "DigestRead_digest_id_user_id_key" ON "DigestRead"("digest_id", "user_id");

-- CreateIndex
CREATE INDEX "session_expire_idx" ON "session"("expire");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankConnection" ADD CONSTRAINT "BankConnection_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerTransaction" ADD CONSTRAINT "LedgerTransaction_bank_id_fkey" FOREIGN KEY ("bank_id") REFERENCES "BankConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerTransaction" ADD CONSTRAINT "LedgerTransaction_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerTransaction" ADD CONSTRAINT "LedgerTransaction_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionEdit" ADD CONSTRAINT "TransactionEdit_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "LedgerTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionEdit" ADD CONSTRAINT "TransactionEdit_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyDigest" ADD CONSTRAINT "DailyDigest_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigestRead" ADD CONSTRAINT "DigestRead_digest_id_fkey" FOREIGN KEY ("digest_id") REFERENCES "DailyDigest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigestRead" ADD CONSTRAINT "DigestRead_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
