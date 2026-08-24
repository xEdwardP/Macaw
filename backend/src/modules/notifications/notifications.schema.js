const { z } = require("zod");
const { idParam, pagination } = require("../../shared/validation/common");

const listSchema = {
  query: pagination.extend({
    unreadOnly: z
      .union([z.boolean(), z.enum(["true", "false"])])
      .transform((value) => value === true || value === "true")
      .optional(),
  }),
};

const byIdSchema = { params: idParam };

module.exports = { listSchema, byIdSchema };
