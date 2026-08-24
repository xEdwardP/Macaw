const { z } = require("zod");
const {
  id,
  idParam,
  pagination,
  time,
  dateString,
} = require("../../shared/validation/common");

const SESSION_STATUSES = [
  "pending",
  "confirmed",
  "pending_confirmation",
  "disputed",
  "completed",
  "cancelled",
];

const createSchema = {
  body: z
    .object({
      tutorId: id,
      subjectId: id,
      date: dateString,
      startTime: time,
      endTime: time,
      notes: z.string().trim().max(500).optional(),
    })
    .refine((data) => data.startTime < data.endTime, {
      message: "La hora de fin debe ser posterior a la de inicio",
      path: ["endTime"],
    }),
};

const listSchema = {
  query: pagination.extend({
    status: z.enum(SESSION_STATUSES).optional(),
  }),
};

const disputeSchema = {
  params: idParam,
  body: z.object({
    reason: z.string().trim().min(5).max(500).optional(),
  }),
};

const resolveSchema = {
  params: idParam,
  body: z.object({
    favorOf: z.enum(["student", "tutor"], {
      message: "favorOf debe ser student o tutor",
    }),
  }),
};

const byIdSchema = { params: idParam };

module.exports = {
  createSchema,
  listSchema,
  disputeSchema,
  resolveSchema,
  byIdSchema,
  SESSION_STATUSES,
};
