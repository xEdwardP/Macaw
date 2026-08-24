const { z } = require("zod");
const { id, idParam, optionalId, pagination } = require("../../shared/validation/common");
const { SUPPORTED_LOCALES } = require("../../shared/i18n/locales");

const listSchema = {
  query: pagination.extend({
    search: z.string().trim().max(100).optional(),
    role: z
      .enum([
        "student",
        "tutor",
        "institution_admin",
        "institution_staff",
        "guardian",
        "platform_admin",
      ])
      .optional(),
    institutionId: optionalId,
  }),
};

const toggleSchema = { params: idParam };

const createCoordinatorSchema = {
  body: z.object({
    name: z.string().trim().min(2, "Nombre muy corto").max(120),
    email: z.string().email("Correo no válido").toLowerCase().trim(),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
    institutionId: id,
  }),
};

const preferencesSchema = {
  body: z
    .object({
      locale: z.enum(SUPPORTED_LOCALES).nullable().optional(),
      themePreference: z.enum(["light", "dark", "system"]).optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: "Envía al menos una preferencia",
    }),
};

const profileSchema = {
  body: z
    .object({
      name: z.string().trim().min(2, "Nombre muy corto").max(120).optional(),
      program: z.string().trim().max(120).nullable().optional(),
      termNumber: z.coerce.number().int().min(1).max(20).nullable().optional(),
      academicUnitId: id.nullable().optional(),
      paypalEmail: z
        .string()
        .email("El correo de PayPal no es válido")
        .toLowerCase()
        .trim()
        .nullable()
        .optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: "Envía al menos un campo",
    }),
};

module.exports = {
  listSchema,
  toggleSchema,
  createCoordinatorSchema,
  preferencesSchema,
  profileSchema,
};
