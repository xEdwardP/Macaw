const { z } = require("zod");
const { id, idParam } = require("../../shared/validation/common");

const listSchema = {
  params: z.object({ tutorId: id }),
  query: z.object({
    limit: z.coerce.number().int().positive().max(50).default(10),
    offset: z.coerce.number().int().min(0).default(0),
  }),
};

const createSchema = {
  body: z.object({
    sessionId: id,
    rating: z.coerce.number().int().min(1).max(5),
    comment: z.string().trim().max(500).optional(),
  }),
};

const removeSchema = { params: idParam };

module.exports = { listSchema, createSchema, removeSchema };
