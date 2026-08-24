const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

const PROGRAM_UNIT_MAP = {
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
    program: "Ingeniería en Ciencias de la Computación",
    termNumber: 11,
  },
  {
    name: "Stefano Abener Ponce Menjivar",
    email: "sponce@unicah.edu",
    program: "Ingeniería en Ciencias de la Computación",
    termNumber: 11,
  },
  {
    name: "Jorge Manuel Dubón Fuentes",
    email: "jdubon@unicah.edu",
    program: "Ingeniería en Ciencias de la Computación",
    termNumber: 7,
  },
  {
    name: "Pedro Antonio Sánchez Flores",
    email: "pedro.sanchez@unicah.edu",
    program: "Ingeniería en Ciencias de la Computación",
    termNumber: 2,
  },
  {
    name: "Laura Isabel Reyes Mendoza",
    email: "laura.reyes@unicah.edu",
    program: "Ingeniería en Ciencias de la Computación",
    termNumber: 4,
  },
  {
    name: "Diego Alejandro Torres Vargas",
    email: "diego.torres@unicah.edu",
    program: "Ingeniería en Ciencias de la Computación",
    termNumber: 6,
  },
  {
    name: "Valeria Andrea Cruz Pineda",
    email: "valeria.cruz@unicah.edu",
    program: "Ingeniería en Ciencias de la Computación",
    termNumber: 1,
  },
  {
    name: "Roberto José Paz Aguilar",
    email: "roberto.paz@unicah.edu",
    program: "Ingeniería en Ciencias de la Computación",
    termNumber: 8,
  },
  {
    name: "Andrea Michelle López Soto",
    email: "andrea.lopez@unicah.edu",
    program: "Ingeniería en Ciencias de la Computación",
    termNumber: 3,
  },
  {
    name: "Marco Antonio Flores Herrera",
    email: "marco.flores@unicah.edu",
    program: "Ingeniería en Ciencias de la Computación",
    termNumber: 5,
  },

  {
    name: "Gabriela Paola Hernández Ríos",
    email: "gabriela.hernandez@unicah.edu",
    program: "Medicina y Cirugía",
    termNumber: 2,
  },
  {
    name: "Fernando Daniel Morales Castro",
    email: "fernando.morales@unicah.edu",
    program: "Medicina y Cirugía",
    termNumber: 4,
  },
  {
    name: "Daniela Cristina Pérez Ruiz",
    email: "daniela.perez@unicah.edu",
    program: "Medicina y Cirugía",
    termNumber: 6,
  },
  {
    name: "José Manuel Rodríguez Luna",
    email: "jose.rodriguez@unicah.edu",
    program: "Medicina y Cirugía",
    termNumber: 1,
  },
  {
    name: "Paola Fernanda Castillo Vega",
    email: "paola.castillo@unicah.edu",
    program: "Medicina y Cirugía",
    termNumber: 3,
  },
  {
    name: "Andrés Felipe Guzmán Torres",
    email: "andres.guzman@unicah.edu",
    program: "Medicina y Cirugía",
    termNumber: 5,
  },
  {
    name: "Melissa Carolina Díaz Ramos",
    email: "melissa.diaz@unicah.edu",
    program: "Medicina y Cirugía",
    termNumber: 7,
  },
  {
    name: "Juan Pablo Vargas Mendez",
    email: "juan.vargas@unicah.edu",
    program: "Medicina y Cirugía",
    termNumber: 2,
  },
  {
    name: "Claudia Beatriz Fuentes Mora",
    email: "claudia.fuentes@unicah.edu",
    program: "Medicina y Cirugía",
    termNumber: 4,
  },
  {
    name: "Ricardo Enrique Salinas Peña",
    email: "ricardo.salinas@unicah.edu",
    program: "Medicina y Cirugía",
    termNumber: 8,
  },

  {
    name: "Stephanie Nicole Acosta Mejía",
    email: "stephanie.acosta@unicah.edu",
    program: "Derecho",
    termNumber: 3,
  },
  {
    name: "Alejandro Josué Portillo Ávila",
    email: "alejandro.portillo@unicah.edu",
    program: "Derecho",
    termNumber: 5,
  },
  {
    name: "Cindy Paola Zelaya Romero",
    email: "cindy.zelaya@unicah.edu",
    program: "Derecho",
    termNumber: 2,
  },
  {
    name: "Bryan Eduardo Amador Salgado",
    email: "bryan.amador@unicah.edu",
    program: "Derecho",
    termNumber: 7,
  },
  {
    name: "Karen Sofía Banegas Orellana",
    email: "karen.banegas@unicah.edu",
    program: "Derecho",
    termNumber: 1,
  },
  {
    name: "Luis Ángel Membreño Turcios",
    email: "luis.membreno@unicah.edu",
    program: "Derecho",
    termNumber: 4,
  },
  {
    name: "Diana Marcela Molina Suazo",
    email: "diana.molina@unicah.edu",
    program: "Derecho",
    termNumber: 6,
  },
  {
    name: "Oscar Iván Chinchilla Padilla",
    email: "oscar.chinchilla@unicah.edu",
    program: "Derecho",
    termNumber: 3,
  },
  {
    name: "Wendy Alejandra Espinal Matute",
    email: "wendy.espinal@unicah.edu",
    program: "Derecho",
    termNumber: 8,
  },
  {
    name: "Josué David Reconco Elvir",
    email: "josue.reconco@unicah.edu",
    program: "Derecho",
    termNumber: 2,
  },

  {
    name: "Fátima Isabel Núñez Aguilera",
    email: "fatima.nunez@unicah.edu",
    program: "Gestión Estratégica de Empresas",
    termNumber: 4,
  },
  {
    name: "Edwin Alexander Pineda Bonilla",
    email: "edwin.pineda@unicah.edu",
    program: "Gestión Estratégica de Empresas",
    termNumber: 2,
  },
  {
    name: "Yessenia Marisol Lagos Meza",
    email: "yessenia.lagos@unicah.edu",
    program: "Gestión Estratégica de Empresas",
    termNumber: 6,
  },
  {
    name: "Christian David Meza Andrade",
    email: "christian.meza@unicah.edu",
    program: "Gestión Estratégica de Empresas",
    termNumber: 1,
  },
  {
    name: "Ingrid Yamileth Ordóñez Paz",
    email: "ingrid.ordonez@unicah.edu",
    program: "Gestión Estratégica de Empresas",
    termNumber: 3,
  },
  {
    name: "Ronald Josué Flores Chirinos",
    email: "ronald.flores@unicah.edu",
    program: "Gestión Estratégica de Empresas",
    termNumber: 5,
  },
  {
    name: "Evelyn Lissette Matute Cruz",
    email: "evelyn.matute@unicah.edu",
    program: "Gestión Estratégica de Empresas",
    termNumber: 7,
  },
  {
    name: "Javier Enrique Salgado Romero",
    email: "javier.salgado@unicah.edu",
    program: "Gestión Estratégica de Empresas",
    termNumber: 2,
  },
  {
    name: "Karla Beatriz Turcios Elvir",
    email: "karla.turcios@unicah.edu",
    program: "Gestión Estratégica de Empresas",
    termNumber: 4,
  },
  {
    name: "Nelson Ernesto Suazo Portillo",
    email: "nelson.suazo@unicah.edu",
    program: "Gestión Estratégica de Empresas",
    termNumber: 8,
  },

  {
    name: "Brenda Lourdes Mejía Reconco",
    email: "brenda.mejia@unicah.edu",
    program: "Ingeniería Civil",
    termNumber: 3,
  },
  {
    name: "Héctor Manuel Elvir Banegas",
    email: "hector.elvir@unicah.edu",
    program: "Ingeniería Civil",
    termNumber: 5,
  },
  {
    name: "Mariela Concepción Turcios Paz",
    email: "mariela.turcios@unicah.edu",
    program: "Ingeniería Civil",
    termNumber: 2,
  },
  {
    name: "Kevin Josué Andrade Membreño",
    email: "kevin.andrade@unicah.edu",
    program: "Ingeniería Civil",
    termNumber: 7,
  },
  {
    name: "Sonia Patricia Chirinos Meza",
    email: "sonia.chirinos@unicah.edu",
    program: "Ingeniería Civil",
    termNumber: 1,
  },
  {
    name: "Jonathan Alexis Bonilla Lagos",
    email: "jonathan.bonilla@unicah.edu",
    program: "Ingeniería Civil",
    termNumber: 4,
  },
  {
    name: "Roxana Yamileth Padilla Ordóñez",
    email: "roxana.padilla@unicah.edu",
    program: "Ingeniería Civil",
    termNumber: 6,
  },
  {
    name: "Marvin Eduardo Matute Pineda",
    email: "marvin.matute@unicah.edu",
    program: "Ingeniería Civil",
    termNumber: 3,
  },
  {
    name: "Lesly Marisol Romero Núñez",
    email: "lesly.romero@unicah.edu",
    program: "Ingeniería Civil",
    termNumber: 8,
  },
  {
    name: "Erick Daniel Aguilera Salgado",
    email: "erick.aguilera@unicah.edu",
    program: "Ingeniería Civil",
    termNumber: 2,
  },

  {
    name: "Nadia Lissette Orellana Flores",
    email: "nadia.orellana@unicah.edu",
    program: "Psicología",
    termNumber: 4,
  },
  {
    name: "Wilmer Josué Cruz Zelaya",
    email: "wilmer.cruz@unicah.edu",
    program: "Psicología",
    termNumber: 2,
  },
  {
    name: "Mayra Alejandra Amador Espinal",
    email: "mayra.amador@unicah.edu",
    program: "Psicología",
    termNumber: 6,
  },
  {
    name: "Elvin Antonio Molina Acosta",
    email: "elvin.molina@unicah.edu",
    program: "Psicología",
    termNumber: 1,
  },
  {
    name: "Glenda Patricia Suazo Chinchilla",
    email: "glenda.suazo@unicah.edu",
    program: "Psicología",
    termNumber: 3,
  },
  {
    name: "Saúl Enrique Portillo Vargas",
    email: "saul.portillo@unicah.edu",
    program: "Psicología",
    termNumber: 5,
  },
  {
    name: "Mirna Yessenia Reconco Díaz",
    email: "mirna.reconco@unicah.edu",
    program: "Psicología",
    termNumber: 7,
  },
  {
    name: "Joel David Banegas Castillo",
    email: "joel.banegas@unicah.edu",
    program: "Psicología",
    termNumber: 2,
  },
  {
    name: "Xiomara Beatriz Elvir Guzmán",
    email: "xiomara.elvir@unicah.edu",
    program: "Psicología",
    termNumber: 4,
  },
  {
    name: "Ángel Mauricio Pineda Morales",
    email: "angel.pineda@unicah.edu",
    program: "Psicología",
    termNumber: 8,
  },

  {
    name: "Heydi Marisol Membreño Rodríguez",
    email: "heydi.membreno@unicah.edu",
    program: "Mercadotecnia",
    termNumber: 3,
  },
  {
    name: "Joel Alejandro Turcios Hernández",
    email: "joel.turcios@unicah.edu",
    program: "Mercadotecnia",
    termNumber: 5,
  },
  {
    name: "Blanca Nieves Lagos Pérez",
    email: "blanca.lagos@unicah.edu",
    program: "Mercadotecnia",
    termNumber: 2,
  },
  {
    name: "Abner Josué Chirinos Fuentes",
    email: "abner.chirinos@unicah.edu",
    program: "Mercadotecnia",
    termNumber: 7,
  },
  {
    name: "Wendy Carolina Meza Salinas",
    email: "wendy.meza@unicah.edu",
    program: "Mercadotecnia",
    termNumber: 1,
  },
  {
    name: "Denis Enrique Andrade López",
    email: "denis.andrade@unicah.edu",
    program: "Mercadotecnia",
    termNumber: 4,
  },
  {
    name: "Yolanda Lissette Paz Acosta",
    email: "yolanda.paz@unicah.edu",
    program: "Mercadotecnia",
    termNumber: 6,
  },
  {
    name: "Omar Antonio Bonilla Zelaya",
    email: "omar.bonilla@unicah.edu",
    program: "Mercadotecnia",
    termNumber: 3,
  },
  {
    name: "Iris Maribel Ordóñez Matute",
    email: "iris.ordonez@unicah.edu",
    program: "Mercadotecnia",
    termNumber: 8,
  },
  {
    name: "David Ernesto Reconco Padilla",
    email: "david.reconco@unicah.edu",
    program: "Mercadotecnia",
    termNumber: 2,
  },

  {
    name: "Lilian Sofía Espinal Aguilera",
    email: "lilian.espinal@unicah.edu",
    program: "Arquitectura",
    termNumber: 4,
  },
  {
    name: "Gerardo Josué Vargas Mejía",
    email: "gerardo.vargas@unicah.edu",
    program: "Arquitectura",
    termNumber: 2,
  },
  {
    name: "Kenia Alejandra Núñez Elvir",
    email: "kenia.nunez@unicah.edu",
    program: "Arquitectura",
    termNumber: 6,
  },
  {
    name: "Emilio Daniel Castillo Banegas",
    email: "emilio.castillo@unicah.edu",
    program: "Arquitectura",
    termNumber: 1,
  },
  {
    name: "Yuri Patricia Salgado Turcios",
    email: "yuri.salgado@unicah.edu",
    program: "Arquitectura",
    termNumber: 3,
  },
  {
    name: "Isaías Enrique Morales Chirinos",
    email: "isaias.morales@unicah.edu",
    program: "Arquitectura",
    termNumber: 5,
  },
  {
    name: "Fanny Yamileth Flores Membreño",
    email: "fanny.flores@unicah.edu",
    program: "Arquitectura",
    termNumber: 7,
  },
  {
    name: "Elvis Antonio Díaz Lagos",
    email: "elvis.diaz@unicah.edu",
    program: "Arquitectura",
    termNumber: 2,
  },
  {
    name: "Norma Beatriz Ruiz Andrade",
    email: "norma.ruiz@unicah.edu",
    program: "Arquitectura",
    termNumber: 4,
  },
  {
    name: "Alexis Mauricio Acosta Meza",
    email: "alexis.acosta@unicah.edu",
    program: "Arquitectura",
    termNumber: 8,
  },

  {
    name: "Rebeca Lourdes Pineda Ordóñez",
    email: "rebeca.pineda@unicah.edu",
    program: "Ciencias de la Comunicación",
    termNumber: 3,
  },
  {
    name: "Josías David Zelaya Reconco",
    email: "josias.zelaya@unicah.edu",
    program: "Ciencias de la Comunicación",
    termNumber: 5,
  },
  {
    name: "Tatiana Marisol Cruz Portillo",
    email: "tatiana.cruz@unicah.edu",
    program: "Ciencias de la Comunicación",
    termNumber: 2,
  },
  {
    name: "Edwin Josué Amador Paz",
    email: "edwin.amador@unicah.edu",
    program: "Ciencias de la Comunicación",
    termNumber: 7,
  },
  {
    name: "Nidia Alejandra Matute Bonilla",
    email: "nidia.matute@unicah.edu",
    program: "Ciencias de la Comunicación",
    termNumber: 1,
  },
  {
    name: "Rony Enrique Espinal Vargas",
    email: "rony.espinal@unicah.edu",
    program: "Ciencias de la Comunicación",
    termNumber: 4,
  },
  {
    name: "Celeste Patricia Molina Salinas",
    email: "celeste.molina@unicah.edu",
    program: "Ciencias de la Comunicación",
    termNumber: 6,
  },
  {
    name: "Giancarlo Antonio Padilla Elvir",
    email: "giancarlo.padilla@unicah.edu",
    program: "Ciencias de la Comunicación",
    termNumber: 3,
  },
  {
    name: "Dulce María Turcios Núñez",
    email: "dulce.turcios@unicah.edu",
    program: "Ciencias de la Comunicación",
    termNumber: 8,
  },
  {
    name: "Fredy Mauricio Lagos Mejía",
    email: "fredy.lagos@unicah.edu",
    program: "Ciencias de la Comunicación",
    termNumber: 2,
  },

  {
    name: "Bessy Lissette Hernández Chirinos",
    email: "bessy.hernandez@unicah.edu",
    program: "Enfermería",
    termNumber: 4,
  },
  {
    name: "Marlon Josué Fuentes Reconco",
    email: "marlon.fuentes@unicah.edu",
    program: "Enfermería",
    termNumber: 2,
  },
  {
    name: "Tania Yessenia Rodríguez Andrade",
    email: "tania.rodriguez@unicah.edu",
    program: "Enfermería",
    termNumber: 6,
  },
  {
    name: "Selvin Antonio Guzmán Membreño",
    email: "selvin.guzman@unicah.edu",
    program: "Enfermería",
    termNumber: 1,
  },
  {
    name: "Maura Concepción Díaz Ordóñez",
    email: "maura.diaz@unicah.edu",
    program: "Enfermería",
    termNumber: 3,
  },
  {
    name: "Geovanny Enrique Castillo Zelaya",
    email: "geovanny.castillo@unicah.edu",
    program: "Enfermería",
    termNumber: 5,
  },
  {
    name: "Nelly Maribel Vargas Lagos",
    email: "nelly.vargas@unicah.edu",
    program: "Enfermería",
    termNumber: 7,
  },
  {
    name: "Byron David Aguilera Turcios",
    email: "byron.aguilera@unicah.edu",
    program: "Enfermería",
    termNumber: 2,
  },
  {
    name: "Sandra Beatriz Meza Espinal",
    email: "sandra.meza@unicah.edu",
    program: "Enfermería",
    termNumber: 4,
  },
  {
    name: "Cesar Mauricio Bonilla Pineda",
    email: "cesar.bonilla@unicah.edu",
    program: "Enfermería",
    termNumber: 8,
  },
];

async function seedUsers(institutionId, units) {
  console.log("Seeding users...");

  const password = await bcrypt.hash("password123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin.macaw@yopmail.com" },
    update: {},
    create: {
      name: "Admin Macaw",
      email: "admin.macaw@yopmail.com",
      password,
      role: "platform_admin",
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
      role: "platform_admin",
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
      role: "institution_admin",
      institutionId,
    },
  });
  await prisma.wallet.upsert({
    where: { userId: coordinator.id },
    update: {},
    create: { userId: coordinator.id },
  });
  console.log("Coordinator created");

  for (const s of STUDENTS_DATA) {
    const unitCode = PROGRAM_UNIT_MAP[s.program];
    const academicUnitId = units[unitCode]?.id || null;

    if (!academicUnitId) console.warn(`Faculty not found for program: ${s.program}`);

    const student = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        name: s.name,
        email: s.email,
        password,
        role: "student",
        program: s.program,
        termNumber: s.termNumber,
        institutionId,
        academicUnitId,
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

module.exports = { seedUsers, PROGRAM_UNIT_MAP };
