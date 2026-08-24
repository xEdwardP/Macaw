const { z } = require("zod");

const resolveSchema = {
  query: z
    .object({
      email: z.string().trim().toLowerCase().max(200).optional(),
      domain: z.string().trim().toLowerCase().max(200).optional(),
    })
    .refine((value) => value.email || value.domain, {
      message: "Indica un correo o un dominio",
      path: ["email"],
    }),
};

module.exports = { resolveSchema };
