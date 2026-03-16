const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const { sign } = require("../../utils/jwt");
const prisma = new PrismaClient();

const register = async ({
  name,
  email,
  password,
  role,
  facultyId,
  universityId,
}) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("Este correo ya está registrado");

  if (!["student", "tutor"].includes(role)) throw new Error("Rol inválido");

  if (facultyId && universityId) {
    const faculty = await prisma.faculty.findFirst({
      where: { id: facultyId, universityId },
    });
    if (!faculty) throw new Error("Facultad no válida para esta universidad");
  }

  let resolvedUniversityId = universityId;
  if (!resolvedUniversityId) {
    const domain = email.split("@")[1];
    const university = await prisma.university.findUnique({
      where: { domain },
    });
    resolvedUniversityId = university?.id || null;
  }

  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      role,
      facultyId: facultyId || null,
      universityId: resolvedUniversityId || null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      career: true,
      facultyId: true,
      universityId: true,
      faculty: {
        select: { id: true, name: true, code: true },
      },
    },
  });

  await prisma.wallet.create({ data: { userId: user.id } });

  if (role === "tutor")
    await prisma.tutorProfile.create({ data: { userId: user.id } });

  const token = sign({ id: user.id, role: user.role });
  return { user, token };
};

const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      faculty: { select: { id: true, name: true, code: true } },
    },
  });
  if (!user || !user.isActive) throw new Error("Credenciales incorrectas");

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new Error("Credenciales incorrectas");

  const { password: _, ...safeUser } = user;
  const token = sign({ id: user.id, role: user.role });
  return { user: safeUser, token };
};

module.exports = { register, login };
