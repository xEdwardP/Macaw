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
cp frontend/.env.example frontend/.env
```

Edita ambos archivos con tus propias credenciales. Consulta la seccion **Variables de entorno** mas abajo para saber que valor va en cada campo.

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

### Backend (`backend/.env`)

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
| `PAYPAL_CLIENT_ID` | Client ID de PayPal sandbox. Obtenlo en developer.paypal.com |
| `PAYPAL_CLIENT_SECRET` | Client Secret de PayPal sandbox |
| `PAYPAL_MODE` | Modo de PayPal. Usar `sandbox` para desarrollo |

### Frontend (`frontend/.env`)

| Variable | Descripcion |
|---|---|
| `VITE_API_URL` | URL del backend. Ejemplo: `http://localhost:3000/api` |
| `VITE_PAYPAL_CLIENT_ID` | Client ID de PayPal sandbox (el mismo del backend) |

---

## Credenciales demo

Estas credenciales se crean automaticamente al correr el seed.

| Rol | Email | Contrasena | Descripcion |
|---|---|---|---|
| Admin | admin@macaw.app | password123 | Administrador de la plataforma Macaw |
| Coordinador | coordinador@unicah.edu | password123 | Coordinador Academico de UNICAH |
| Estudiante | sponce@unicah.edu | password123 | Estudiante de prueba |
| Tutor | epineda@unicah.edu | password123 | Tutor de prueba |

> La cuenta `platform@macaw.app` es interna y acumula las comisiones de la plataforma. No se usa para login.

---

## Stack tecnico

| Capa | Tecnologia |
|---|---|
| Frontend | React 18 + Vite + Tailwind v4 + Framer Motion |
| Backend | Node.js + Express + Socket.io |
| Base de datos | PostgreSQL + Prisma 6 |
| Pagos | PayPal REST API (sandbox) |
| IA | OpenAI gpt-4o-mini |
| Videollamadas | Jitsi Meet |
| Emails | Nodemailer + Mailtrap |
| Contenedor | Docker |

---

## Funcionalidades principales

| Modulo | Descripcion |
|---|---|
| Autenticacion | Registro, login y JWT por rol |
| Tutores | Perfil, materias, disponibilidad y busqueda por facultad |
| Sesiones | Reserva, confirmacion, videollamada con Jitsi |
| Wallet | Creditos internos, escrow y comisiones |
| Pagos | Recarga con PayPal sandbox |
| Disputas | Reporte de problemas y resolucion por admin |
| Reseñas | Calificacion post-sesion con recalculo automatico |
| Emails | Notificaciones y recordatorios automaticos |
| IA | Recomendaciones de tutores y resumen de reseñas |
| Universidad | Analytics, subsidios y gestion de facultades |

---

## Estructura del proyecto
```
macaw/
├── frontend/                 # React + Vite
│   └── src/
│       ├── components/       # Componentes reutilizables
│       ├── pages/            # Paginas por rol (student, tutor, university, admin)
│       ├── services/         # Llamadas a la API
│       ├── store/            # Zustand (auth)
│       └── hooks/            # Custom hooks
├── backend/                  # Node.js + Express
│   ├── prisma/               # Schema, migraciones y seed
│   └── src/
│       ├── modules/          # Auth, tutores, sesiones, wallet, reseñas, IA, universidad
│       ├── middlewares/      # Auth y roles
│       ├── utils/            # JWT, apiResponse, emailTemplates
│       ├── config/           # PayPal, platform wallet, mailer
│       └── jobs/             # Recordatorios y auto-confirmacion
└── docker-compose.yml
```

---

## Flujo de pagos
```
1. Estudiante recarga wallet con PayPal
2. Reserva sesion → creditos se congelan
3. Tutor confirma y da la tutoria
4. Estudiante confirma sesion recibida
   → 90% va al tutor
   → 10% va a la wallet de la plataforma
5. Tutor solicita retiro → admin aprueba
```

---

## Politica de cancelacion
```
Cancelacion con mas de 24hrs → reembolso 100% al estudiante
Cancelacion con menos de 24hrs → reembolso 50% al estudiante
                               → 50% al tutor como compensacion
```