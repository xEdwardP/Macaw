const bcrypt           = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')
const { sign }         = require('../../utils/jwt')
const prisma           = new PrismaClient()

const register = async ({ name, email, password, role, career }) => {
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) throw new Error('Este correo ya está registrado')

  if (!['student', 'tutor'].includes(role))
    throw new Error('Rol inválido')

  const hashed = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: { name, email, password: hashed, role, career },
    select: {
      id:     true,
      name:   true,
      email:  true,
      role:   true,
      career: true,
    }
  })

  await prisma.wallet.create({ data: { userId: user.id } })

  if (role === 'tutor')
    await prisma.tutorProfile.create({ data: { userId: user.id } })

  const token = sign({ id: user.id, role: user.role })
  return { user, token }
}

const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.isActive)
    throw new Error('Credenciales incorrectas')

  const valid = await bcrypt.compare(password, user.password)
  if (!valid)
    throw new Error('Credenciales incorrectas')

  const { password: _, ...safeUser } = user
  const token = sign({ id: user.id, role: user.role })
  return { user: safeUser, token }
}

module.exports = { register, login }