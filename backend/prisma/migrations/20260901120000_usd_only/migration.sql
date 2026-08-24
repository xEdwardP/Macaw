-- La plataforma opera en una sola moneda: USD.
-- Las demás filas del catálogo se conservan, desactivadas, para no romper
-- ninguna referencia y para poder revertir la decisión con un UPDATE.

UPDATE "Currency" SET "isActive" = false WHERE "code" <> 'USD';

UPDATE "Currency" SET "isActive" = true WHERE "code" = 'USD';

INSERT INTO "Currency" ("code", "name", "symbol", "decimals", "isActive", "displayOrder")
VALUES ('USD', 'Dólar estadounidense', '$', 2, true, 1)
ON CONFLICT ("code") DO NOTHING;
