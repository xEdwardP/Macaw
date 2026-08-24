CREATE TYPE "ThemePreference" AS ENUM ('light', 'dark', 'system');

ALTER TABLE "User"
  ADD COLUMN "locale" VARCHAR(5),
  ADD COLUMN "themePreference" "ThemePreference" NOT NULL DEFAULT 'system';
