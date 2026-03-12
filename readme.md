# Macaw — Plataforma de Tutorias Universitarias

Marketplace de tutorias peer-to-peer para universidades. Conecta estudiantes con tutores de su misma institución, con sistema de pagos interno, videollamadas y recomendaciones con IA.

---

## Requisitos

- Node.js v18+
- Docker Desktop
- Git

---

## Instalacion

### 1. Clonar el repositorio
```bash
git clone https://github.com/xEdwardP/Macaw.git
cd macaw
```

### 2. Configurar variables de entorno
```bash
cp backend/.env.example backend/.env
```

Edita `backend/.env` con tus propias credenciales. Consulta la seccion **Variables de entorno** mas abajo para saber que valor va en cada campo.

### 3. Levantar la base de datos
```bash
docker-compose up -d
```

### 4. Instalar dependencias y migrar la base de datos
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
node prisma/seed.js
```

### 5. Instalar dependencias del frontend
```bash
cd ../frontend
npm install
```

---

## Correr el proyecto

Necesitas dos terminales abiertas simultaneamente.

**Terminal 1 — Backend**
```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend**
```bash
cd frontend
npm run dev
```

---

## URLs

| Servicio | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:3000 |
| Prisma Studio | http://localhost:5555 |

Para abrir Prisma Studio ejecuta desde la carpeta `backend/`:
```bash
npx prisma studio
```

---

## Variables de entorno

| Variable | Descripcion |
|---|---|
| `DATABASE_URL` | URL de conexion a PostgreSQL |
| `JWT_SECRET` | Clave secreta para firmar tokens. Genera una con `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_EXPIRES_IN` | Tiempo de expiracion del token. Ejemplo: `7d` |
| `PORT` | Puerto del servidor backend. Ejemplo: `3000` |
| `CLIENT_URL` | URL del frontend. Ejemplo: `http://localhost:5173` |
| `OPENAI_API_KEY` | API key de OpenAI. Obtenla en platform.openai.com |
| `MAIL_HOST` | Host SMTP. Para Mailtrap: `sandbox.smtp.mailtrap.io` |
| `MAIL_PORT` | Puerto SMTP. Para Mailtrap: `2525` |
| `MAIL_USER` | Usuario SMTP de tu proveedor de email |
| `MAIL_PASS` | Contrasena SMTP de tu proveedor de email |

---

## Credenciales demo

Estas credenciales se crean automaticamente al correr el seed.

| Rol | Email | Contrasena |
|---|---|---|
| Admin | admin@macaw.app | password123 |
| Estudiante | maria@unicah.edu | password123 |
| Tutor | luis@unicah.edu | password123 |

---

## Stack tecnico

| Capa | Tecnologia |
|---|---|
| Frontend | React 18 + Vite + Tailwind v4 |
| Backend | Node.js + Express |
| Base de datos | PostgreSQL + Prisma 6 |
| IA | OpenAI gpt-4o-mini |
| Videollamadas | Jitsi Meet |
| Emails | Nodemailer + Mailtrap |
| Contenedor | Docker |

---

## Estructura del proyecto
```
macaw/
├── frontend/          # React + Vite
├── backend/           # Node.js + Express
│   ├── prisma/        # Schema y seed
│   └── src/
│       ├── modules/   # Auth, tutores, sesiones, wallet, etc.
│       ├── middlewares/
│       ├── utils/
│       ├── config/
│       └── jobs/
└── docker-compose.yml
```