const { z } = require("zod");
const { dateString, id, idParam, optionalId, time } = require("../../shared/validation/common");

const listSchema = {
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(9),
    search: z.string().trim().max(100).optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
    maxRate: z.coerce.number().positive().optional(),
    unitId: optionalId,
    subjectId: optionalId,
  }),
};

const verificationListSchema = {
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(10),
    search: z.string().trim().max(100).optional(),
    status: z.enum(["pending", "verified", "rejected"]).optional(),
  }),
};

const reviewMembershipSchema = {
  params: idParam,
  body: z.object({
    status: z.enum(["verified", "rejected"]),
    note: z.string().trim().max(500).optional(),
  }),
};

const inviteTutorSchema = {
  body: z.object({
    email: z.string().email("Correo no válido").toLowerCase().trim(),
    note: z.string().trim().max(500).optional(),
  }),
};

const requestMembershipSchema = {
  body: z.object({ institutionId: id }),
};

const respondMembershipSchema = {
  params: idParam,
  body: z.object({ accept: z.boolean() }),
};

const byIdSchema = { params: idParam };

const bookedSlotsSchema = {
  params: idParam,
  query: z.object({ date: dateString }),
};

const updateProfileSchema = {
  body: z.object({
    bio: z.string().trim().max(1000).optional(),
    hourlyRate: z.coerce.number().positive().max(1000),
  }),
};

const addSubjectSchema = {
  body: z.object({
    subjectId: id,
    level: z.enum(["basic", "intermediate", "advanced"]).optional(),
  }),
};

const removeSubjectSchema = {
  params: z.object({ subjectId: id }),
};

const availabilitySchema = {
  body: z.object({
    slots: z
      .array(
        z
          .object({
            dayOfWeek: z.coerce.number().int().min(1).max(7),
            startTime: time,
            endTime: time,
          })
          .refine((slot) => slot.startTime < slot.endTime, {
            message: "La hora de fin debe ser posterior a la de inicio",
            path: ["endTime"],
          }),
      )
      .max(50)
      .default([]),
  }),
};

module.exports = {
  listSchema,
  byIdSchema,
  bookedSlotsSchema,
  updateProfileSchema,
  addSubjectSchema,
  removeSubjectSchema,
  availabilitySchema,
  verificationListSchema,
  reviewMembershipSchema,
  inviteTutorSchema,
  requestMembershipSchema,
  respondMembershipSchema,
};
