# EventSpin

Plataforma de tragamonedas promocional para eventos. Los jugadores giran la palanca para ganar premios; los administradores configuran el evento, los premios y monitorean canjes en tiempo real.

## Stack

- **Framework:** Next.js 16 (App Router)
- **Base de datos:** MongoDB + Mongoose
- **Auth:** JWT (access token 8h) + refresh token httpOnly (7d) con rotación automática
- **Animaciones:** Framer Motion
- **Imágenes:** Cloudinary
- **UI:** Tailwind CSS v4
- **Estado cliente:** Zustand con persistencia en localStorage
- **Fetching:** TanStack React Query + Axios con interceptor de refresh automático

## Funcionalidades

### Panel Admin (`/admin`)
- Login con JWT y refresh automático sin interrupciones
- Crear y configurar eventos (nombre, slug, fechas, tema visual, mecánica de juego)
- **Categorías de premios** — agrupan premios con campos de datos adicionales configurables (talle, valor, modelo, etc.)
- **Premios** — carga individual o bulk por CSV con imagen subida a Cloudinary
- **Códigos de canje** — buscar, validar y canjear códigos; exportar CSV con tildes/ñ correctos en Excel
- **Estadísticas en tiempo real** — KPIs, gráficos de distribución y últimos canjes vía Server-Sent Events

### Juego (`/events/[slug]`)
- Tragamonedas con palanca animada (efecto spring realista con Framer Motion)
- Celdas con scroll vertical de imágenes durante el giro
- Pantalla de ganador con código QR, confetti y vibración en mobile
- Página de premios disponibles agrupados por categoría

## Estructura del proyecto

```
src/
├── app/
│   ├── (admin)/admin/          # Panel de administración
│   ├── (game)/events/[slug]/   # Juego público
│   └── api/v1/                 # API REST
│       ├── auth/               # Login, logout, refresh, verify
│       ├── events/             # CRUD eventos
│       │   └── [eventId]/
│       │       ├── collections/  # Categorías de premios
│       │       ├── items/        # Premios (+ bulk upload CSV)
│       │       ├── spins/        # Registro de giros
│       │       ├── redemptions/  # Códigos de canje + exportar CSV
│       │       └── stats/        # Estadísticas en tiempo real (SSE)
│       ├── org/                # Organización
│       └── uploads/image/      # Upload a Cloudinary
├── components/
│   └── game/PlayerForm.tsx     # Formulario de datos del jugador
├── lib/
│   ├── auth/jwt.ts             # Firma y verificación JWT (jose)
│   ├── db/                     # Conexión MongoDB + modelos Mongoose
│   ├── apiClient.ts            # Axios con interceptor de refresh automático
│   ├── cloudinary.ts           # Upload de imágenes
│   └── email.ts                # Emails transaccionales (Nodemailer)
├── stores/
│   ├── authStore.ts            # Auth persistida (Zustand)
│   └── gameStore.ts            # Estado del juego persistido (Zustand)
├── types/models.ts             # Tipos TypeScript compartidos
└── middleware.ts               # Verificación JWT en todas las rutas /api/v1
```

## Variables de entorno

Crear `.env.local` en la raíz del proyecto:

```env
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# MongoDB Atlas
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/eventspin

# JWT — generá secrets largos y aleatorios
JWT_ACCESS_SECRET=cambia-esto-por-un-string-largo-y-aleatorio
JWT_REFRESH_SECRET=otro-string-largo-y-aleatorio-diferente
ACCESS_TOKEN_EXPIRY=8h
REFRESH_TOKEN_EXPIRY=7d

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=tu-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=tu-api-secret

# Email (Nodemailer — Gmail con App Password)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu@gmail.com
EMAIL_PASS=xxxx-xxxx-xxxx-xxxx
```

## Instalación y desarrollo

```bash
# 1. Instalar dependencias
npm install

# 2. Crear superadmin inicial (requiere MONGODB_URI en .env.local)
npm run setup:admin

# 3. Iniciar servidor de desarrollo
npm run dev
```

La app queda disponible en `http://localhost:3000`.

| URL | Descripción |
|-----|-------------|
| `/admin` | Panel de administración |
| `/events/[slug]` | Juego público del evento |
| `/events/[slug]/prizes` | Premios disponibles |

## Deploy en Vercel

### 1. Preparar el repositorio

```bash
git add -A
git commit -m "ready for production"
git push
```

### 2. Importar en Vercel

Ir a [vercel.com/new](https://vercel.com/new), seleccionar el repositorio. Framework preset: **Next.js** (se detecta automáticamente).

### 3. Variables de entorno

En **Settings → Environment Variables** cargar todas las variables del `.env.local`. Para `NEXT_PUBLIC_APP_URL` usar la URL final de Vercel (`https://tu-proyecto.vercel.app`).

### 4. MongoDB Atlas — Network Access

En el panel de Atlas ir a **Network Access → Add IP Address** y agregar `0.0.0.0/0` para permitir las IPs dinámicas de Vercel.

### 5. Deploy

Vercel hace deploy automático en cada push a `main`.

> **Nota SSE:** El endpoint de estadísticas en tiempo real usa Server-Sent Events con `maxDuration = 300`. Requiere **plan Pro de Vercel**. En plan Hobby las conexiones se cortan a los 10 segundos; la página de estadísticas seguirá funcionando pero solo mostrará el snapshot inicial sin actualizaciones automáticas.

## API — referencia rápida

| Método | Ruta | Auth requerida | Descripción |
|--------|------|:--------------:|-------------|
| `POST` | `/api/v1/auth/login` | — | Login, devuelve access token + refresh cookie |
| `POST` | `/api/v1/auth/refresh` | cookie | Rota el refresh token y devuelve nuevo access token |
| `POST` | `/api/v1/auth/logout` | — | Invalida el refresh token en base de datos |
| `GET` | `/api/v1/events/[slug]` | — | Configuración pública del evento |
| `POST` | `/api/v1/events` | admin | Crear evento |
| `PATCH` | `/api/v1/events/[eventId]` | admin | Actualizar configuración del evento |
| `GET` | `/api/v1/events/[eventId]/collections` | — (GET) | Categorías de premios |
| `POST` | `/api/v1/events/[eventId]/collections` | admin | Crear categoría |
| `GET` | `/api/v1/events/[eventId]/items` | — (GET) | Lista de premios |
| `POST` | `/api/v1/events/[eventId]/items/bulk` | admin | Carga masiva de premios por CSV |
| `POST` | `/api/v1/events/[eventId]/spins` | — | Registrar un giro (público) |
| `GET` | `/api/v1/events/[eventId]/redemptions` | admin | Listar códigos de canje |
| `PATCH` | `/api/v1/events/[eventId]/redemptions/[code]/redeem` | admin | Canjear código |
| `GET` | `/api/v1/events/[eventId]/redemptions/export` | admin | Exportar canjes en CSV |
| `GET` | `/api/v1/events/[eventId]/stats` | admin | Estadísticas en tiempo real (SSE) |
| `POST` | `/api/v1/uploads/image` | admin | Subir imagen a Cloudinary (máx. 4 MB) |

## Scripts

```bash
npm run dev          # Servidor de desarrollo con Turbopack
npm run build        # Build de producción
npm run start        # Servidor de producción local
npm run setup:admin  # Crear superadmin en la base de datos
```

## Licencia

Privado — uso interno.
