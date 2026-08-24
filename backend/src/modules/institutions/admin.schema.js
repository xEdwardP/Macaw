const { z } = require("zod");
const { email, id, idParam, optionalId, pagination, password } = require("../../shared/validation/common");
const { REPORTS } = require("./reports.service");

const INSTITUTION_TYPES = [
  "university",
  "college",
  "school",
  "technical",
  "academy",
  "bootcamp",
  "organization",
];

const INSTITUTION_STATUSES = ["pending", "active", "suspended", "rejected"];

const INVITABLE_ROLES = [
  "institution_admin",
  "institution_staff",
  "tutor",
  "student",
  "guardian",
];

const domainName = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/,
    "Dominio inválido",
  );

const currencyCode = z.string().trim().toUpperCase().length(3);

const settingsBody = z
  .object({
    allowCrossInstitutionTutoring: z.boolean(),
    crossInstitutionAllowList: z.array(id),
    allowCrossCurrencySessions: z.boolean(),
    studentSelfTopUp: z.boolean(),
    tutorWithdrawals: z.boolean(),
  })
  .partial();

const profileBody = z.object({
  name: z.string().trim().min(2).max(150),
  type: z.enum(INSTITUTION_TYPES).optional(),
  timezone: z.string().trim().max(60).optional(),
  locale: z.string().trim().max(10).optional(),
  logo: z.string().trim().url().max(500).nullish(),
  primaryColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color inválido")
    .nullish(),
  contactName: z.string().trim().max(150).nullish(),
  contactEmail: email.nullish(),
  settings: settingsBody.optional(),
});

const listInstitutionsSchema = {
  query: pagination.extend({
    search: z.string().trim().max(100).optional(),
    status: z.enum(INSTITUTION_STATUSES).optional(),
    type: z.enum(INSTITUTION_TYPES).optional(),
  }),
};

const createInstitutionSchema = {
  body: profileBody.extend({
    domain: domainName,
    currencyCode: currencyCode.optional(),
    commissionRate: z.coerce.number().min(0).max(1).nullish(),
    planCode: z.string().trim().max(40).optional(),
  }),
};

const updateInstitutionSchema = {
  params: idParam,
  body: profileBody.partial().extend({
    currencyCode: currencyCode.optional(),
    commissionRate: z.coerce.number().min(0).max(1).nullish(),
  }),
};

const updateMineSchema = { body: profileBody.partial() };

const changeStatusSchema = {
  params: idParam,
  body: z.object({
    status: z.enum(["active", "suspended"]),
    reason: z.string().trim().max(500).optional(),
  }),
};

const institutionQuerySchema = {
  query: z.object({ institutionId: optionalId }),
};

const templatesQuerySchema = {
  query: z.object({
    institutionId: optionalId,
    type: z.enum(INSTITUTION_TYPES).optional(),
  }),
};

const addDomainSchema = {
  body: z.object({ domain: domainName, institutionId: optionalId }),
};

const startVerificationSchema = {
  params: idParam,
  body: z.object({ method: z.enum(["dns", "email"]).default("dns") }),
};

const verifyDomainSchema = {
  params: idParam,
  body: z.object({
    method: z.enum(["dns", "email"]).default("dns"),
    token: z.string().trim().max(200).optional(),
  }),
};

const createInvitationSchema = {
  body: z.object({
    email,
    role: z.enum(INVITABLE_ROLES).default("institution_admin"),
    name: z.string().trim().max(150).optional(),
    institutionId: optionalId,
  }),
};

const createMemberSchema = {
  body: z.object({
    name: z.string().trim().min(2, "Nombre muy corto").max(120),
    email,
    password,
    role: z.enum(["tutor", "student"]),
    institutionId: optionalId,
  }),
};

const listInvitationsSchema = {
  query: pagination.extend({
    status: z.enum(["pending", "accepted", "revoked", "expired"]).optional(),
  }),
};

const invitationTokenSchema = {
  params: z.object({ token: z.string().trim().min(10).max(200) }),
};

const acceptInvitationSchema = {
  body: z.object({
    token: z.string().trim().min(10).max(200),
    name: z.string().trim().min(2).max(150),
    password,
  }),
};

const applyTemplateSchema = {
  params: z.object({ code: z.string().trim().min(2).max(40) }),
  body: z.object({ institutionId: optionalId }),
};

const importSchema = {
  query: z.object({
    dryRun: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    institutionId: optionalId,
  }),
};

const planBody = z.object({
  code: z.string().trim().min(2).max(40),
  name: z.string().trim().min(2).max(100),
  maxStudents: z.coerce.number().int().positive().nullish(),
  priceMonthly: z.coerce.number().min(0).max(1000000).default(0),
  currencyCode: currencyCode.default("USD"),
  features: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.coerce.number().int().min(0).optional(),
});

const createPlanSchema = { body: planBody };
const updatePlanSchema = { params: idParam, body: planBody.partial() };

const assignPlanSchema = {
  body: z.object({
    institutionId: optionalId,
    planCode: z.string().trim().min(2).max(40),
    status: z
      .enum(["trialing", "active", "past_due", "suspended", "cancelled"])
      .optional(),
    renewsAt: z.coerce.date().optional(),
  }),
};

const exchangeRateSchema = {
  body: z.object({
    fromCurrency: currencyCode,
    toCurrency: currencyCode,
    rate: z.coerce.number().positive().max(1000000),
    source: z.string().trim().max(60).optional(),
    validFrom: z.coerce.date().optional(),
  }),
};

const listExchangeRatesSchema = {
  query: z.object({
    fromCurrency: currencyCode.optional(),
    toCurrency: currencyCode.optional(),
    limit: z.coerce.number().int().positive().max(200).default(50),
  }),
};

const auditQuerySchema = {
  query: pagination.extend({
    entity: z.string().trim().max(60).optional(),
    institutionId: optionalId,
  }),
};

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Usa el formato AAAA-MM-DD");

const reportSchema = {
  params: z.object({ report: z.enum(REPORTS) }),
  query: z.object({
    institutionId: optionalId,
    academicUnitId: optionalId,
    search: z.string().trim().max(100).optional(),
    status: z.string().trim().max(40).optional(),
    from: isoDate.optional(),
    to: isoDate.optional(),
  }),
};

const gradeLevelBody = z.object({
  name: z.string().trim().min(1).max(100),
  code: z.string().trim().min(1).max(30),
  orderIndex: z.coerce.number().int().min(0).max(100).optional(),
});

const createGradeLevelSchema = { params: idParam, body: gradeLevelBody };
const updateGradeLevelSchema = {
  params: idParam,
  body: gradeLevelBody.partial(),
};

module.exports = {
  INSTITUTION_TYPES,
  INSTITUTION_STATUSES,
  INVITABLE_ROLES,
  listInstitutionsSchema,
  createInstitutionSchema,
  updateInstitutionSchema,
  updateMineSchema,
  changeStatusSchema,
  institutionQuerySchema,
  templatesQuerySchema,
  addDomainSchema,
  startVerificationSchema,
  verifyDomainSchema,
  createInvitationSchema,
  createMemberSchema,
  listInvitationsSchema,
  invitationTokenSchema,
  acceptInvitationSchema,
  applyTemplateSchema,
  importSchema,
  createPlanSchema,
  updatePlanSchema,
  assignPlanSchema,
  exchangeRateSchema,
  listExchangeRatesSchema,
  auditQuerySchema,
  reportSchema,
  createGradeLevelSchema,
  updateGradeLevelSchema,
  idParam,
};
