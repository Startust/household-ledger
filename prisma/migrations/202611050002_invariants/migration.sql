ALTER TABLE "Household" ADD CONSTRAINT "digest_hour_range" CHECK (digest_hour BETWEEN 0 AND 23);
ALTER TABLE "LedgerTransaction" ADD CONSTRAINT "usd_money" CHECK (currency = 'USD' AND amount_cents BETWEEN -100000000000000 AND 100000000000000);
ALTER TABLE "LedgerTransaction" ADD CONSTRAINT "positive_version" CHECK (version >= 1);
ALTER TABLE "BankConnection" ADD CONSTRAINT "request_counters_nonnegative" CHECK (sync_requested >= 0 AND sync_completed >= 0 AND failures >= 0);
CREATE UNIQUE INDEX "Category_household_name_casefold" ON "Category" (household_id, lower(name));
CREATE UNIQUE INDEX "User_username_casefold" ON "User" (lower(username));
