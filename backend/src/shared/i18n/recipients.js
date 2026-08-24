const prisma = require("../../config/prisma");
const { DEFAULT_LOCALE, resolve } = require("./locales");

const localeForEmail = async (email) => {
  if (!email) return DEFAULT_LOCALE;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { locale: true, institution: { select: { locale: true } } },
  });

  return resolve(user?.locale, user?.institution?.locale);
};

const localeForUser = (user) => resolve(user?.locale, user?.institution?.locale);

module.exports = { localeForEmail, localeForUser };
