const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

const CAREER_FACULTY_MAP = {
  "Ingeniería en Ciencias de la Computación": "ICC",
  "Medicina y Cirugía": "MED",
  Derecho: "DER",
  "Gestión Estratégica de Empresas": "GEE",
  "Ingeniería Civil": "ICIV",
  Psicología: "PSI",
  Mercadotecnia: "MKT",
  Arquitectura: "ARQ",
  "Ciencias de la Comunicación": "COM",
  Enfermería: "ENF",
  "Cirugía Dental": "DEN",
  "Ingeniería Industrial": "IIND",
};

const STUDENTS_DATA = [
  {
    name: "Hector de Jesus Villeda Lopez",
    email: "hvilleda@unicah.edu",
    career: "Ingeniería en Ciencias de la Computación",
    quarter: 11,
  },
  {
    name: "Stefano Abener Ponce Menjivar",
    email: "sponce@unicah.edu",
    career: "Ingeniería en Ciencias de la Computación",
    quarter: 11,
  },
  {
    name: "Jorge Manuel Dubón Fuentes",
    email: "jdubon@unicah.edu",
    career: "Ingeniería en Ciencias de la Computación",
    quarter: 7,
  },
  {
    name: "Pedro Antonio Sánchez Flores",
    email: "pedro.sanchez@unicah.edu",
    career: "Ingeniería en Ciencias de la Computación",
    quarter: 2,
  },
  {
    name: "Laura Isabel Reyes Mendoza",
    email: "laura.reyes@unicah.edu",
    career: "Ingeniería en Ciencias de la Computación",
    quarter: 4,
  },
  {
    name: "Diego Alejandro Torres Vargas",
    email: "diego.torres@unicah.edu",
    career: "Ingeniería en Ciencias de la Computación",
    quarter: 6,
  },
  {
    name: "Valeria Andrea Cruz Pineda",
    email: "valeria.cruz@unicah.edu",
    career: "Ingeniería en Ciencias de la Computación",
    quarter: 1,
  },
  {
    name: "Roberto José Paz Aguilar",
    email: "roberto.paz@unicah.edu",
    career: "Ingeniería en Ciencias de la Computación",
    quarter: 8,
  },
  {
    name: "Andrea Michelle López Soto",
    email: "andrea.lopez@unicah.edu",
    career: "Ingeniería en Ciencias de la Computación",
    quarter: 3,
  },
  {
    name: "Marco Antonio Flores Herrera",
    email: "marco.flores@unicah.edu",
    career: "Ingeniería en Ciencias de la Computación",
    quarter: 5,
  },

  {
    name: "Gabriela Paola Hernández Ríos",
    email: "gabriela.hernandez@unicah.edu",
    career: "Medicina y Cirugía",
    quarter: 2,
  },
  {
    name: "Fernando Daniel Morales Castro",
    email: "fernando.morales@unicah.edu",
    career: "Medicina y Cirugía",
    quarter: 4,
  },
  {
    name: "Daniela Cristina Pérez Ruiz",
    email: "daniela.perez@unicah.edu",
    career: "Medicina y Cirugía",
    quarter: 6,
  },
  {
    name: "José Manuel Rodríguez Luna",
    email: "jose.rodriguez@unicah.edu",
    career: "Medicina y Cirugía",
    quarter: 1,
  },
  {
    name: "Paola Fernanda Castillo Vega",
    email: "paola.castillo@unicah.edu",
    career: "Medicina y Cirugía",
    quarter: 3,
  },
  {
    name: "Andrés Felipe Guzmán Torres",
    email: "andres.guzman@unicah.edu",
    career: "Medicina y Cirugía",
    quarter: 5,
  },
  {
    name: "Melissa Carolina Díaz Ramos",
    email: "melissa.diaz@unicah.edu",
    career: "Medicina y Cirugía",
    quarter: 7,
  },
  {
    name: "Juan Pablo Vargas Mendez",
    email: "juan.vargas@unicah.edu",
    career: "Medicina y Cirugía",
    quarter: 2,
  },
  {
    name: "Claudia Beatriz Fuentes Mora",
    email: "claudia.fuentes@unicah.edu",
    career: "Medicina y Cirugía",
    quarter: 4,
  },
  {
    name: "Ricardo Enrique Salinas Peña",
    email: "ricardo.salinas@unicah.edu",
    career: "Medicina y Cirugía",
    quarter: 8,
  },

  {
    name: "Stephanie Nicole Acosta Mejía",
    email: "stephanie.acosta@unicah.edu",
    career: "Derecho",
    quarter: 3,
  },
  {
    name: "Alejandro Josué Portillo Ávila",
    email: "alejandro.portillo@unicah.edu",
    career: "Derecho",
    quarter: 5,
  },
  {
    name: "Cindy Paola Zelaya Romero",
    email: "cindy.zelaya@unicah.edu",
    career: "Derecho",
    quarter: 2,
  },
  {
    name: "Bryan Eduardo Amador Salgado",
    email: "bryan.amador@unicah.edu",
    career: "Derecho",
    quarter: 7,
  },
  {
    name: "Karen Sofía Banegas Orellana",
    email: "karen.banegas@unicah.edu",
    career: "Derecho",
    quarter: 1,
  },
  {
    name: "Luis Ángel Membreño Turcios",
    email: "luis.membreno@unicah.edu",
    career: "Derecho",
    quarter: 4,
  },
  {
    name: "Diana Marcela Molina Suazo",
    email: "diana.molina@unicah.edu",
    career: "Derecho",
    quarter: 6,
  },
  {
    name: "Oscar Iván Chinchilla Padilla",
    email: "oscar.chinchilla@unicah.edu",
    career: "Derecho",
    quarter: 3,
  },
  {
    name: "Wendy Alejandra Espinal Matute",
    email: "wendy.espinal@unicah.edu",
    career: "Derecho",
    quarter: 8,
  },
  {
    name: "Josué David Reconco Elvir",
    email: "josue.reconco@unicah.edu",
    career: "Derecho",
    quarter: 2,
  },

  {
    name: "Fátima Isabel Núñez Aguilera",
    email: "fatima.nunez@unicah.edu",
    career: "Gestión Estratégica de Empresas",
    quarter: 4,
  },
  {
    name: "Edwin Alexander Pineda Bonilla",
    email: "edwin.pineda@unicah.edu",
    career: "Gestión Estratégica de Empresas",
    quarter: 2,
  },
  {
    name: "Yessenia Marisol Lagos Meza",
    email: "yessenia.lagos@unicah.edu",
    career: "Gestión Estratégica de Empresas",
    quarter: 6,
  },
  {
    name: "Christian David Meza Andrade",
    email: "christian.meza@unicah.edu",
    career: "Gestión Estratégica de Empresas",
    quarter: 1,
  },
  {
    name: "Ingrid Yamileth Ordóñez Paz",
    email: "ingrid.ordonez@unicah.edu",
    career: "Gestión Estratégica de Empresas",
    quarter: 3,
  },
  {
    name: "Ronald Josué Flores Chirinos",
    email: "ronald.flores@unicah.edu",
    career: "Gestión Estratégica de Empresas",
    quarter: 5,
  },
  {
    name: "Evelyn Lissette Matute Cruz",
    email: "evelyn.matute@unicah.edu",
    career: "Gestión Estratégica de Empresas",
    quarter: 7,
  },
  {
    name: "Javier Enrique Salgado Romero",
    email: "javier.salgado@unicah.edu",
    career: "Gestión Estratégica de Empresas",
    quarter: 2,
  },
  {
    name: "Karla Beatriz Turcios Elvir",
    email: "karla.turcios@unicah.edu",
    career: "Gestión Estratégica de Empresas",
    quarter: 4,
  },
  {
    name: "Nelson Ernesto Suazo Portillo",
    email: "nelson.suazo@unicah.edu",
    career: "Gestión Estratégica de Empresas",
    quarter: 8,
  },

  {
    name: "Brenda Lourdes Mejía Reconco",
    email: "brenda.mejia@unicah.edu",
    career: "Ingeniería Civil",
    quarter: 3,
  },
  {
    name: "Héctor Manuel Elvir Banegas",
    email: "hector.elvir@unicah.edu",
    career: "Ingeniería Civil",
    quarter: 5,
  },
  {
    name: "Mariela Concepción Turcios Paz",
    email: "mariela.turcios@unicah.edu",
    career: "Ingeniería Civil",
    quarter: 2,
  },
  {
    name: "Kevin Josué Andrade Membreño",
    email: "kevin.andrade@unicah.edu",
    career: "Ingeniería Civil",
    quarter: 7,
  },
  {
    name: "Sonia Patricia Chirinos Meza",
    email: "sonia.chirinos@unicah.edu",
    career: "Ingeniería Civil",
    quarter: 1,
  },
  {
    name: "Jonathan Alexis Bonilla Lagos",
    email: "jonathan.bonilla@unicah.edu",
    career: "Ingeniería Civil",
    quarter: 4,
  },
  {
    name: "Roxana Yamileth Padilla Ordóñez",
    email: "roxana.padilla@unicah.edu",
    career: "Ingeniería Civil",
    quarter: 6,
  },
  {
    name: "Marvin Eduardo Matute Pineda",
    email: "marvin.matute@unicah.edu",
    career: "Ingeniería Civil",
    quarter: 3,
  },
  {
    name: "Lesly Marisol Romero Núñez",
    email: "lesly.romero@unicah.edu",
    career: "Ingeniería Civil",
    quarter: 8,
  },
  {
    name: "Erick Daniel Aguilera Salgado",
    email: "erick.aguilera@unicah.edu",
    career: "Ingeniería Civil",
    quarter: 2,
  },

  {
    name: "Nadia Lissette Orellana Flores",
    email: "nadia.orellana@unicah.edu",
    career: "Psicología",
    quarter: 4,
  },
  {
    name: "Wilmer Josué Cruz Zelaya",
    email: "wilmer.cruz@unicah.edu",
    career: "Psicología",
    quarter: 2,
  },
  {
    name: "Mayra Alejandra Amador Espinal",
    email: "mayra.amador@unicah.edu",
    career: "Psicología",
    quarter: 6,
  },
  {
    name: "Elvin Antonio Molina Acosta",
    email: "elvin.molina@unicah.edu",
    career: "Psicología",
    quarter: 1,
  },
  {
    name: "Glenda Patricia Suazo Chinchilla",
    email: "glenda.suazo@unicah.edu",
    career: "Psicología",
    quarter: 3,
  },
  {
    name: "Saúl Enrique Portillo Vargas",
    email: "saul.portillo@unicah.edu",
    career: "Psicología",
    quarter: 5,
  },
  {
    name: "Mirna Yessenia Reconco Díaz",
    email: "mirna.reconco@unicah.edu",
    career: "Psicología",
    quarter: 7,
  },
  {
    name: "Joel David Banegas Castillo",
    email: "joel.banegas@unicah.edu",
    career: "Psicología",
    quarter: 2,
  },
  {
    name: "Xiomara Beatriz Elvir Guzmán",
    email: "xiomara.elvir@unicah.edu",
    career: "Psicología",
    quarter: 4,
  },
  {
    name: "Ángel Mauricio Pineda Morales",
    email: "angel.pineda@unicah.edu",
    career: "Psicología",
    quarter: 8,
  },

  {
    name: "Heydi Marisol Membreño Rodríguez",
    email: "heydi.membreno@unicah.edu",
    career: "Mercadotecnia",
    quarter: 3,
  },
  {
    name: "Joel Alejandro Turcios Hernández",
    email: "joel.turcios@unicah.edu",
    career: "Mercadotecnia",
    quarter: 5,
  },
  {
    name: "Blanca Nieves Lagos Pérez",
    email: "blanca.lagos@unicah.edu",
    career: "Mercadotecnia",
    quarter: 2,
  },
  {
    name: "Abner Josué Chirinos Fuentes",
    email: "abner.chirinos@unicah.edu",
    career: "Mercadotecnia",
    quarter: 7,
  },
  {
    name: "Wendy Carolina Meza Salinas",
    email: "wendy.meza@unicah.edu",
    career: "Mercadotecnia",
    quarter: 1,
  },
  {
    name: "Denis Enrique Andrade López",
    email: "denis.andrade@unicah.edu",
    career: "Mercadotecnia",
    quarter: 4,
  },
  {
    name: "Yolanda Lissette Paz Acosta",
    email: "yolanda.paz@unicah.edu",
    career: "Mercadotecnia",
    quarter: 6,
  },
  {
    name: "Omar Antonio Bonilla Zelaya",
    email: "omar.bonilla@unicah.edu",
    career: "Mercadotecnia",
    quarter: 3,
  },
  {
    name: "Iris Maribel Ordóñez Matute",
    email: "iris.ordonez@unicah.edu",
    career: "Mercadotecnia",
    quarter: 8,
  },
  {
    name: "David Ernesto Reconco Padilla",
    email: "david.reconco@unicah.edu",
    career: "Mercadotecnia",
    quarter: 2,
  },

  {
    name: "Lilian Sofía Espinal Aguilera",
    email: "lilian.espinal@unicah.edu",
    career: "Arquitectura",
    quarter: 4,
  },
  {
    name: "Gerardo Josué Vargas Mejía",
    email: "gerardo.vargas@unicah.edu",
    career: "Arquitectura",
    quarter: 2,
  },
  {
    name: "Kenia Alejandra Núñez Elvir",
    email: "kenia.nunez@unicah.edu",
    career: "Arquitectura",
    quarter: 6,
  },
  {
    name: "Emilio Daniel Castillo Banegas",
    email: "emilio.castillo@unicah.edu",
    career: "Arquitectura",
    quarter: 1,
  },
  {
    name: "Yuri Patricia Salgado Turcios",
    email: "yuri.salgado@unicah.edu",
    career: "Arquitectura",
    quarter: 3,
  },
  {
    name: "Isaías Enrique Morales Chirinos",
    email: "isaias.morales@unicah.edu",
    career: "Arquitectura",
    quarter: 5,
  },
  {
    name: "Fanny Yamileth Flores Membreño",
    email: "fanny.flores@unicah.edu",
    career: "Arquitectura",
    quarter: 7,
  },
  {
    name: "Elvis Antonio Díaz Lagos",
    email: "elvis.diaz@unicah.edu",
    career: "Arquitectura",
    quarter: 2,
  },
  {
    name: "Norma Beatriz Ruiz Andrade",
    email: "norma.ruiz@unicah.edu",
    career: "Arquitectura",
    quarter: 4,
  },
  {
    name: "Alexis Mauricio Acosta Meza",
    email: "alexis.acosta@unicah.edu",
    career: "Arquitectura",
    quarter: 8,
  },

  {
    name: "Rebeca Lourdes Pineda Ordóñez",
    email: "rebeca.pineda@unicah.edu",
    career: "Ciencias de la Comunicación",
    quarter: 3,
  },
  {
    name: "Josías David Zelaya Reconco",
    email: "josias.zelaya@unicah.edu",
    career: "Ciencias de la Comunicación",
    quarter: 5,
  },
  {
    name: "Tatiana Marisol Cruz Portillo",
    email: "tatiana.cruz@unicah.edu",
    career: "Ciencias de la Comunicación",
    quarter: 2,
  },
  {
    name: "Edwin Josué Amador Paz",
    email: "edwin.amador@unicah.edu",
    career: "Ciencias de la Comunicación",
    quarter: 7,
  },
  {
    name: "Nidia Alejandra Matute Bonilla",
    email: "nidia.matute@unicah.edu",
    career: "Ciencias de la Comunicación",
    quarter: 1,
  },
  {
    name: "Rony Enrique Espinal Vargas",
    email: "rony.espinal@unicah.edu",
    career: "Ciencias de la Comunicación",
    quarter: 4,
  },
  {
    name: "Celeste Patricia Molina Salinas",
    email: "celeste.molina@unicah.edu",
    career: "Ciencias de la Comunicación",
    quarter: 6,
  },
  {
    name: "Giancarlo Antonio Padilla Elvir",
    email: "giancarlo.padilla@unicah.edu",
    career: "Ciencias de la Comunicación",
    quarter: 3,
  },
  {
    name: "Dulce María Turcios Núñez",
    email: "dulce.turcios@unicah.edu",
    career: "Ciencias de la Comunicación",
    quarter: 8,
  },
  {
    name: "Fredy Mauricio Lagos Mejía",
    email: "fredy.lagos@unicah.edu",
    career: "Ciencias de la Comunicación",
    quarter: 2,
  },

  {
    name: "Bessy Lissette Hernández Chirinos",
    email: "bessy.hernandez@unicah.edu",
    career: "Enfermería",
    quarter: 4,
  },
  {
    name: "Marlon Josué Fuentes Reconco",
    email: "marlon.fuentes@unicah.edu",
    career: "Enfermería",
    quarter: 2,
  },
  {
    name: "Tania Yessenia Rodríguez Andrade",
    email: "tania.rodriguez@unicah.edu",
    career: "Enfermería",
    quarter: 6,
  },
  {
    name: "Selvin Antonio Guzmán Membreño",
    email: "selvin.guzman@unicah.edu",
    career: "Enfermería",
    quarter: 1,
  },
  {
    name: "Maura Concepción Díaz Ordóñez",
    email: "maura.diaz@unicah.edu",
    career: "Enfermería",
    quarter: 3,
  },
  {
    name: "Geovanny Enrique Castillo Zelaya",
    email: "geovanny.castillo@unicah.edu",
    career: "Enfermería",
    quarter: 5,
  },
  {
    name: "Nelly Maribel Vargas Lagos",
    email: "nelly.vargas@unicah.edu",
    career: "Enfermería",
    quarter: 7,
  },
  {
    name: "Byron David Aguilera Turcios",
    email: "byron.aguilera@unicah.edu",
    career: "Enfermería",
    quarter: 2,
  },
  {
    name: "Sandra Beatriz Meza Espinal",
    email: "sandra.meza@unicah.edu",
    career: "Enfermería",
    quarter: 4,
  },
  {
    name: "Cesar Mauricio Bonilla Pineda",
    email: "cesar.bonilla@unicah.edu",
    career: "Enfermería",
    quarter: 8,
  },
];

async function seedUsers(universityId, faculties) {
  console.log("Seeding users...");

  const password = await bcrypt.hash("password123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin.macaw@yopmail.com" },
    update: {},
    create: {
      name: "Admin Macaw",
      email: "admin.macaw@yopmail.com",
      password,
      role: "admin",
    },
  });
  await prisma.wallet.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id },
  });

  const platform = await prisma.user.upsert({
    where: { email: "platform@macaw.app" },
    update: {},
    create: {
      name: "Macaw Platform",
      email: "platform@macaw.app",
      password: await bcrypt.hash("platform_secret_123", 12),
      role: "admin",
    },
  });
  await prisma.wallet.upsert({
    where: { userId: platform.id },
    update: {},
    create: { userId: platform.id, balance: 0 },
  });
  console.log("Platform wallet created");

  const coordinator = await prisma.user.upsert({
    where: { email: "coordinador.macaw@yopmail.com" },
    update: {},
    create: {
      name: "Coordinador Académico UNICAH",
      email: "coordinador.macaw@yopmail.com",
      password,
      role: "university",
      universityId,
    },
  });
  await prisma.wallet.upsert({
    where: { userId: coordinator.id },
    update: {},
    create: { userId: coordinator.id },
  });
  console.log("Coordinator created");

  for (const s of STUDENTS_DATA) {
    const facultyCode = CAREER_FACULTY_MAP[s.career];
    const facultyId = faculties[facultyCode]?.id || null;

    if (!facultyId) console.warn(`Faculty not found for career: ${s.career}`);

    const student = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        name: s.name,
        email: s.email,
        password,
        role: "student",
        career: s.career,
        quarter: s.quarter,
        universityId,
        facultyId,
      },
    });
    await prisma.wallet.upsert({
      where: { userId: student.id },
      update: {},
      create: { userId: student.id, balance: 50 },
    });
  }

  console.log(`${STUDENTS_DATA.length} students seeded`);
  return password;
}

module.exports = { seedUsers, CAREER_FACULTY_MAP };
