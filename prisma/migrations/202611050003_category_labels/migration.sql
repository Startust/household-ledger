CREATE TABLE "TransactionCategory" (
  "transaction_id" UUID NOT NULL,
  "category_id" INTEGER NOT NULL,
  CONSTRAINT "TransactionCategory_pkey" PRIMARY KEY ("transaction_id", "category_id"),
  CONSTRAINT "TransactionCategory_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "LedgerTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TransactionCategory_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "TransactionCategory_category_id_idx" ON "TransactionCategory"("category_id");

-- Keep the original column for older installed PWA clients during rollout.
INSERT INTO "TransactionCategory" ("transaction_id", "category_id")
SELECT "id", "category_id" FROM "LedgerTransaction" WHERE "category_id" IS NOT NULL;

UPDATE "LedgerTransaction"
SET "reviewed" = true, "reviewed_by_id" = NULL, "reviewed_at" = CURRENT_TIMESTAMP,
    "updated_at" = CURRENT_TIMESTAMP, "version" = "version" + 1
WHERE "flow" = 'income' AND "reviewed" = false;
