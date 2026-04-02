const prisma = require("../../config/prisma");

const getAll = async ({
  search,
  role,
  universityId,
  page = 1,
  limit = 10,
} = {}) => {
  const where = {};

  if (role) where.role = role;
  if (universityId) where.universityId = universityId;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { career: { contains: search, mode: "insensitive" } },
    ];
  }

  where.NOT = { email: "platform@macaw.app" };

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: parseInt(limit),
      skip: offset,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        career: true,
        quarter: true,
        isActive: true,
        createdAt: true,
        universityId: true,
        facultyId: true,
        university: { select: { id: true, name: true } },
        faculty: { select: { id: true, name: true, code: true } },
        wallet: { select: { balance: true, frozen: true } },
        tutorProfile: {
          select: {
            averageRating: true,
            totalSessions: true,
            isVerified: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / parseInt(limit)),
  };
};

const toggleActive = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Usuario no encontrado");
  if (user.email === "admin@macaw.app")
    throw new Error("No puedes desactivar al admin");

  return await prisma.user.update({
    where: { id: userId },
    data: { isActive: !user.isActive },
    select: { id: true, name: true, email: true, isActive: true },
  });
};

module.exports = { getAll, toggleActive };
