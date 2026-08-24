const { z } = require("zod");

const id = z.string().min(1);

const optionalId = z.preprocess(
  (value) => (value === "" ? undefined : value),
  id.optional(),
);

const idParam = z.object({ id });

const pagination = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato de hora inválido (HH:MM)");

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)");

const money = z.coerce
  .number()
  .positive("El monto debe ser mayor que cero")
  .max(1000000);

const password = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(128);

const email = z.string().email("Email inválido").toLowerCase().trim();

const optionalText = (max) => z.string().trim().max(max).optional();

module.exports = {
  id,
  optionalId,
  idParam,
  pagination,
  time,
  dateString,
  money,
  password,
  email,
  optionalText,
};
