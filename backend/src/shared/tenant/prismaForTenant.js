const prisma = require("../../config/prisma");

const TENANT_FIELD_BY_MODEL = {
  Institution: "id",
  InstitutionDomain: "institutionId",
  AcademicUnit: "institutionId",
  Subject: "institutionId",
  User: "institutionId",
  Subsidy: "institutionId",
  Session: "institutionId",
  Subscription: "institutionId",
  Invitation: "institutionId",
};

const FILTERED_OPERATIONS = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
]);

const CREATE_OPERATIONS = new Set(["create", "createMany"]);

const withTenantWhere = (where, field, institutionId) => {
  const base = where || {};

  if (base[field] === undefined) return { ...base, [field]: institutionId };
  if (base[field] === institutionId) return base;

  return {
    ...base,
    AND: [...[].concat(base.AND || []), { [field]: institutionId }],
  };
};

const scopeToTenant = (institutionId) => ({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const field = TENANT_FIELD_BY_MODEL[model];
        if (!field) return query(args);

        if (FILTERED_OPERATIONS.has(operation))
          return query({
            ...args,
            where: withTenantWhere(args.where, field, institutionId),
          });

        if (operation === "upsert")
          return query({
            ...args,
            where: withTenantWhere(args.where, field, institutionId),
            create: { [field]: institutionId, ...args.create },
          });

        if (CREATE_OPERATIONS.has(operation)) {
          const data = Array.isArray(args.data)
            ? args.data.map((item) => ({ [field]: institutionId, ...item }))
            : { [field]: institutionId, ...args.data };
          return query({ ...args, data });
        }

        return query(args);
      },
    },
  },
});

const prismaForTenant = (institutionId) =>
  institutionId ? prisma.$extends(scopeToTenant(institutionId)) : prisma;

module.exports = { prismaForTenant, TENANT_FIELD_BY_MODEL };
