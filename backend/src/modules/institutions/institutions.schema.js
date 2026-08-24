const { z } = require("zod");
const { id, idParam, money, optionalId, pagination } = require("../../shared/validation/common");

const UNIT_KINDS = ["faculty", "level", "department", "area", "program"];

const subjectsQuerySchema = {
  query: pagination.extend({
    search: z.string().trim().max(100).optional(),
    unitId: optionalId,
    termNumber: z.coerce.number().int().min(1).max(20).optional(),
    general: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
  }),
};

const unitsQuerySchema = {
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(8),
    institutionId: id,
  }),
};

const unitSubjectsSchema = {
  params: idParam,
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(8),
  }),
};

const studentsQuerySchema = {
  query: pagination.extend({
    search: z.string().trim().max(100).optional(),
  }),
};

const subjectBody = z.object({
  name: z.string().trim().min(2).max(150),
  code: z.string().trim().min(1).max(30),
  termNumber: z.coerce.number().int().min(1).max(20).nullish(),
  credits: z.coerce.number().int().min(0).max(20).nullish(),
  isGeneral: z.coerce.boolean().default(false),
  unitId: id.nullish(),
});

const createSubjectSchema = { body: subjectBody };
const updateSubjectSchema = { params: idParam, body: subjectBody.partial() };

const unitBody = z.object({
  name: z.string().trim().min(2).max(150),
  code: z.string().trim().min(1).max(30),
  kind: z.enum(UNIT_KINDS).optional(),
});

const createUnitSchema = { body: unitBody };
const updateUnitSchema = { params: idParam, body: unitBody.partial() };

const assignSubjectSchema = {
  params: idParam,
  body: z.object({ subjectId: id }),
};

const removeSubjectSchema = {
  params: z.object({ id, subjectId: id }),
};

const rechargeSchema = {
  body: z.object({ institutionId: id, amount: money }),
};

const createOrderSchema = { body: z.object({ amount: money }) };
const captureOrderSchema = {
  body: z.object({ orderId: z.string().trim().min(1) }),
};

module.exports = {
  UNIT_KINDS,
  subjectsQuerySchema,
  unitsQuerySchema,
  unitSubjectsSchema,
  studentsQuerySchema,
  createSubjectSchema,
  updateSubjectSchema,
  createUnitSchema,
  updateUnitSchema,
  assignSubjectSchema,
  removeSubjectSchema,
  rechargeSchema,
  createOrderSchema,
  captureOrderSchema,
  idParam,
};
