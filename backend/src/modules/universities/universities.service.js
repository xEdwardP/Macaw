const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getSubjects = async ({ search }) => {
  const where = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
    ];
  }
  return await prisma.subject.findMany({
    where,
    orderBy: { name: "asc" },
  });
};

const createSubject = async ({ name, code, area, universityId }) => {
  return await prisma.subject.create({
    data: { name, code, area, universityId },
  });
};

module.exports = { getSubjects, createSubject };
