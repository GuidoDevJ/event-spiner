# EventSpin — Especificación del Sistema
> Plataforma dinámica de tragamonedas para eventos. v1.0 — Junio 2026

---

## 1. Visión General

EventSpin es una plataforma SaaS multi-tenant que permite a cualquier organización crear y operar una máquina tragamonedas digital temática para sus eventos presenciales o virtuales. El contenido (imágenes, nombres, metadata) es 100% dinámico y configurable por evento.

**Casos de uso:**
- Evento deportivo → jugadores del Mundial 2026
- Festival de música → artistas de Lollapalooza
- Evento corporativo → productos de la empresa
- Turismo → monumentos del mundo
- Marketing → cualquier catálogo de premios

**Actores del sistema:**
| Actor | Descripción |
|---|---|
| Super Admin | Administra organizaciones, planes y configuración global |
| Org Admin | Crea y configura eventos dentro de su organización |
| Operator | Staff del evento: valida y canjea códigos en tiempo real |
| Player | Jugador final: accede sin registro, solo juega |

---

## 2. Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript) |
| Styling | Tailwind CSS 4 |
| Estado cliente | Zustand 5 + TanStack Query v5 |
| Base de datos | MongoDB 7 + Mongoose 8 |
| Autenticación | JWT via `jose` (access 15min + refresh 7d HttpOnly cookie) |
| Validación | Zod |
| Formularios | React Hook Form + Zod resolver |
| Imágenes | Cloudinary (upload + CDN + transformaciones) |
| Códigos QR | `qrcode` (server) + `react-qr-code` (client) |
| Email | Nodemailer (Gmail SMTP o SendGrid) |
| Rate Limiting | `@upstash/ratelimit` + `@upstash/redis` (o in-memory para dev) |
| Animaciones | Framer Motion 12 |
| Gráficos | Recharts |
| Notificaciones | React Hot Toast |
| Encriptación | Bcrypt (12 rounds en prod, 10 en dev) |
| CSV | `papaparse` (parse) + `json2csv` (export) |
| Real-time | Server-Sent Events (SSE) vía Response stream |

---

## 3. Arquitectura de Datos

### 3.1 Organization
```typescript
{
  _id: ObjectId,
  name: string,                // "Casino Mocana SA"
  slug: string,                // "casino-mocana" (único)
  logoURL?: string,
  plan: 'free' | 'pro' | 'enterprise',
  maxEvents: number,           // 1 | 10 | unlimited
  maxItemsPerEvent: number,    // 50 | 500 | unlimited
  features: string[],          // feature flags
  createdAt: Date,
  updatedAt: Date
}
```

### 3.2 User
```typescript
{
  _id: ObjectId,
  organizationId: ObjectId → Organization,
  email: string,               // único global
  passwordHash: string,        // bcrypt
  role: 'super_admin' | 'org_admin' | 'operator',
  status: 'active' | 'inactive' | 'invited',
  lastLoginAt?: Date,
  createdAt: Date
}
```

### 3.3 Event
```typescript
{
  _id: ObjectId,
  organizationId: ObjectId → Organization,
  slug: string,                // "mundial-2026" (único por org)
  name: string,                // "Mundial 2026"
  description?: string,
  status: 'draft' | 'active' | 'paused' | 'ended',

  theme: {
    primaryColor: string,      // "#C0392B"
    secondaryColor: string,    // "#D4AC0D"
    backgroundColor: string,   // "#1a1a2e"
    logoURL?: string,
    backgroundURL?: string,    // imagen o video de fondo
    winAnimation: 'confetti' | 'fireworks' | 'stars',
  },

  gameConfig: {
    winnerInterval: number,    // cada N giros hay un ganador (por sesión)
    spinDurationMs: number,    // duración de animación (default 2000)
    codePrefix: string,        // "WIN" → "WIN-A3B5C7D9"
    codeExpiryMinutes: number, // default 30
    requirePlayerData: boolean,
    playerDataFields: [        // si requirePlayerData=true
      { key: string, label: string, type: 'text'|'email'|'number', required: boolean }
    ],
    maxSpinsPerSession: number // 0 = ilimitado
  },

  copy: {
    language: 'es' | 'en' | 'pt',
    winMessage: string,        // "¡Te ganaste a [ITEM]!"
    loseMessage: string,       // "¡Seguí intentando!"
    ctaPlay: string,           // "GIRAR"
    ctaPlayAgain: string       // "JUGAR DE NUEVO"
  },

  startsAt: Date,
  endsAt: Date,
  timezone: string,            // "America/Argentina/Buenos_Aires"

  stats: {                     // denormalizados para performance
    totalSpins: number,
    totalWinners: number,
    totalRedemptions: number
  },

  createdAt: Date,
  updatedAt: Date
}
```

### 3.4 Collection
```typescript
{
  _id: ObjectId,
  eventId: ObjectId → Event,
  organizationId: ObjectId → Organization,
  name: string,                // "Delanteros", "Guitarristas"
  description?: string,
  imageURL?: string,           // ícono de la colección
  order: number,               // orden de aparición en juego
  isActive: boolean,

  itemSchema: {                // schema flexible de metadata
    fields: [{
      key: string,             // "team", "country", "genre"
      label: string,           // "Equipo", "País", "Género"
      type: 'text' | 'number' | 'url',
      showInCard: boolean,     // mostrar en tarjeta de juego
      showInWin: boolean       // mostrar en pantalla de victoria
    }]
  },

  createdAt: Date,
  updatedAt: Date
}
```

### 3.5 Item
```typescript
{
  _id: ObjectId,
  collectionId: ObjectId → Collection,
  eventId: ObjectId → Event,
  organizationId: ObjectId → Organization,
  name: string,                // "Lionel Messi", "Freddie Mercury"
  imageURL: string,            // Cloudinary URL
  weight: number,              // 1-100, probabilidad relativa real
  isActive: boolean,
  metadata: Map<string, any>,  // { team: "Inter Miami", dorsal: 10 }
  createdAt: Date,
  updatedAt: Date
}
```

### 3.6 Spin (contador server-side)
```typescript
{
  _id: ObjectId,
  eventId: ObjectId → Event,
  sessionId: string,           // UUID generado al entrar al juego
  spinNumber: number,          // contador por sesión
  isWinner: boolean,
  itemWon?: ObjectId → Item,
  redemptionId?: ObjectId → Redemption,
  playerData?: Map<string, any>, // si requirePlayerData=true
  ipAddress: string,
  userAgent: string,
  createdAt: Date
}
```

### 3.7 Redemption
```typescript
{
  _id: ObjectId,
  eventId: ObjectId → Event,
  organizationId: ObjectId → Organization,
  spinId: ObjectId → Spin,
  code: string,                // "MUNDIAL-A3B5C7D9" (único global)
  qrDataURL: string,           // base64 del QR
  itemId: ObjectId → Item,
  itemSnapshot: {              // snapshot en el momento de ganar
    name: string,
    imageURL: string,
    metadata: Map<string, any>
  },
  status: 'pending' | 'redeemed' | 'expired',
  redeemedAt?: Date,
  redeemedBy?: ObjectId → User, // qué operador lo canjeó
  expiresAt: Date,
  createdAt: Date
}
```

### 3.8 RefreshToken
```typescript
{
  _id: ObjectId,
  userId: ObjectId → User,
  tokenHash: string,           // hash del refresh token
  expiresAt: Date,             // 7 días
  createdAt: Date
}
```

---

## 4. API Routes

### Base: `/api/v1`

#### Auth
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/auth/login` | No | Login → access token + refresh cookie |
| POST | `/auth/register` | No | Registro → envía email de verificación |
| GET | `/auth/verify` | No | Verifica email con token |
| POST | `/auth/refresh` | Cookie | Renueva access token |
| POST | `/auth/logout` | Bearer | Revoca refresh token |

#### Events
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/events` | Bearer | Lista eventos de la org |
| POST | `/events` | Bearer (admin) | Crea evento |
| GET | `/events/:slug` | No | Config pública del evento |
| PATCH | `/events/:id` | Bearer (admin) | Actualiza evento |
| DELETE | `/events/:id` | Bearer (admin) | Elimina evento (si draft) |

#### Collections
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/events/:eventId/collections` | No | Lista colecciones activas |
| POST | `/events/:eventId/collections` | Bearer | Crea colección |
| PATCH | `/events/:eventId/collections/:id` | Bearer | Actualiza |
| DELETE | `/events/:eventId/collections/:id` | Bearer | Elimina |

#### Items
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/events/:eventId/items` | No | Lista items activos |
| POST | `/events/:eventId/items` | Bearer | Crea item |
| POST | `/events/:eventId/items/bulk` | Bearer | Importa CSV |
| PATCH | `/events/:eventId/items/:id` | Bearer | Actualiza |
| DELETE | `/events/:eventId/items/:id` | Bearer | Elimina |

#### Spins (Motor de juego — server-side)
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/events/:eventId/spins` | No | Registra giro, retorna resultado |
| GET | `/events/:eventId/spins/stats` | Bearer | Stats de giros |

#### Redemptions
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/events/:eventId/redemptions` | Bearer | Lista paginada |
| GET | `/events/:eventId/redemptions/:code` | No | Valida código |
| PATCH | `/events/:eventId/redemptions/:code/redeem` | Bearer | Canjea código |
| GET | `/events/:eventId/redemptions/export` | Bearer | Exporta CSV |

#### Stats
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/events/:eventId/stats` | Bearer | Dashboard de métricas |
| GET | `/events/:eventId/stats/stream` | Bearer | SSE real-time |

#### Uploads
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/uploads/image` | Bearer | Sube imagen a Cloudinary |
| POST | `/uploads/csv-preview` | Bearer | Preview de CSV antes de importar |

#### Organizations / Users
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/org/users` | Bearer (admin) | Lista usuarios de la org |
| POST | `/org/users` | Bearer (admin) | Invita nuevo usuario |
| PATCH | `/org/users/:id/role` | Bearer (admin) | Cambia rol |
| DELETE | `/org/users/:id` | Bearer (admin) | Elimina usuario |

---

## 5. Rutas del Frontend

### Juego (público)
```
/                              → Redirect a /events o landing
/events/:slug                  → Máquina tragamonedas
/events/:slug/prizes           → Catálogo de premios
/events/:slug/win              → Pantalla de victoria + QR
/events/:slug/display          → Modo pantalla TV (últimos ganadores)
```

### Admin (protegido)
```
/admin/login                   → Login
/admin                         → Dashboard: lista de eventos
/admin/events/new              → Crear evento
/admin/events/:id              → Config del evento (branding, mecánica)
/admin/events/:id/collections  → Gestión de colecciones
/admin/events/:id/items        → Gestión de items + bulk import
/admin/events/:id/redemptions  → Códigos de canje
/admin/events/:id/stats        → Dashboard de estadísticas
/admin/users                   → Gestión de usuarios
```

---

## 6. Motor de Juego — Lógica de Spins

### Flujo completo (server-side)

```
1. Cliente genera sessionId (UUID, almacenado en localStorage)
2. POST /api/v1/events/:eventId/spins { sessionId, playerData? }
3. Server:
   a. Busca la sesión activa o crea una nueva
   b. Incrementa spinNumber atómicamente (findOneAndUpdate)
   c. Determina si es ganador: spinNumber % winnerInterval === 0
   d. Si es ganador:
      - Selecciona item por peso (weighted random)
      - Crea Redemption con código único y QR
      - Actualiza stats del evento (+1 winner)
   e. Retorna resultado
4. Cliente anima los reels
5. Si isWinner → navega a /win con código y QR
```

### Algoritmo de selección por peso
```typescript
// Weighted random selection — O(n)
function selectItem(items: Item[]): Item {
  const total = items.reduce((sum, i) => sum + i.weight, 0)
  let r = Math.random() * total
  for (const item of items) {
    r -= item.weight
    if (r <= 0) return item
  }
  return items[items.length - 1]
}
```

### Generación de código único
```typescript
// Formato: {PREFIX}-{8 chars alfanumérico uppercase}
// Ej: MUNDIAL-A3B5C7D9
const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sin caracteres ambiguos (0,O,I,1)
const code = Array.from(crypto.getRandomValues(new Uint8Array(8)))
  .map(b => chars[b % chars.length])
  .join('')
```

---

## 7. Estructura de Archivos

```
eventspin/
├── spec.md
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── src/
│   ├── app/
│   │   ├── (game)/
│   │   │   ├── events/
│   │   │   │   └── [slug]/
│   │   │   │       ├── page.tsx           # Slot machine
│   │   │   │       ├── prizes/page.tsx    # Catálogo
│   │   │   │       ├── win/page.tsx       # Victoria + QR
│   │   │   │       └── display/page.tsx   # Modo TV
│   │   │   └── layout.tsx
│   │   ├── (admin)/
│   │   │   ├── admin/
│   │   │   │   ├── login/page.tsx
│   │   │   │   ├── page.tsx               # Dashboard
│   │   │   │   ├── events/
│   │   │   │   │   ├── new/page.tsx
│   │   │   │   │   └── [eventId]/
│   │   │   │   │       ├── page.tsx       # Config evento
│   │   │   │   │       ├── collections/page.tsx
│   │   │   │   │       ├── items/page.tsx
│   │   │   │   │       ├── redemptions/page.tsx
│   │   │   │   │       └── stats/page.tsx
│   │   │   │   └── users/page.tsx
│   │   │   └── layout.tsx
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── auth/
│   │   │       │   ├── login/route.ts
│   │   │       │   ├── register/route.ts
│   │   │       │   ├── verify/route.ts
│   │   │       │   ├── refresh/route.ts
│   │   │       │   └── logout/route.ts
│   │   │       ├── events/
│   │   │       │   ├── route.ts
│   │   │       │   └── [eventId]/
│   │   │       │       ├── route.ts
│   │   │       │       ├── collections/route.ts
│   │   │       │       ├── collections/[collectionId]/route.ts
│   │   │       │       ├── items/route.ts
│   │   │       │       ├── items/bulk/route.ts
│   │   │       │       ├── items/[itemId]/route.ts
│   │   │       │       ├── spins/route.ts
│   │   │       │       ├── redemptions/route.ts
│   │   │       │       ├── redemptions/export/route.ts
│   │   │       │       ├── redemptions/[code]/route.ts
│   │   │       │       ├── redemptions/[code]/redeem/route.ts
│   │   │       │       └── stats/route.ts
│   │   │       ├── org/
│   │   │       │   └── users/route.ts
│   │   │       └── uploads/
│   │   │           ├── image/route.ts
│   │   │           └── csv-preview/route.ts
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── lib/
│   │   ├── db/
│   │   │   ├── connect.ts             # Mongoose connection singleton
│   │   │   └── models/
│   │   │       ├── Organization.ts
│   │   │       ├── User.ts
│   │   │       ├── Event.ts
│   │   │       ├── Collection.ts
│   │   │       ├── Item.ts
│   │   │       ├── Spin.ts
│   │   │       ├── Redemption.ts
│   │   │       └── RefreshToken.ts
│   │   ├── auth/
│   │   │   ├── jwt.ts                 # Access + refresh token utils
│   │   │   └── password.ts            # Bcrypt utils
│   │   ├── cloudinary.ts
│   │   ├── email.ts
│   │   ├── qrcode.ts
│   │   ├── ratelimit.ts
│   │   ├── spin-engine.ts             # Weighted random + spin logic
│   │   └── api-response.ts            # Response helpers
│   ├── middleware.ts                  # JWT auth + rate limit
│   ├── components/
│   │   ├── game/
│   │   │   ├── SlotMachine.tsx
│   │   │   ├── Reel.tsx
│   │   │   ├── PlayerForm.tsx
│   │   │   └── WinScreen.tsx
│   │   ├── admin/
│   │   │   ├── EventCard.tsx
│   │   │   ├── CollectionEditor.tsx
│   │   │   ├── ItemsGrid.tsx
│   │   │   ├── BulkImport.tsx
│   │   │   ├── RedemptionTable.tsx
│   │   │   ├── StatsChart.tsx
│   │   │   └── ThemeEditor.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Modal.tsx
│   │       ├── Badge.tsx
│   │       ├── Spinner.tsx
│   │       ├── Toast.tsx
│   │       └── QRDisplay.tsx
│   ├── stores/
│   │   ├── authStore.ts
│   │   ├── gameStore.ts
│   │   └── eventStore.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useGame.ts
│   │   ├── useRedemptions.ts
│   │   └── useStats.ts
│   └── types/
│       ├── models.ts
│       ├── api.ts
│       └── game.ts
└── public/
    └── sounds/                        # sfx opcionales
```

---

## 8. Variables de Entorno

```env
# Base
NEXT_PUBLIC_APP_URL=http://localhost:3000

# MongoDB
MONGODB_URI=mongodb+srv://...

# JWT
JWT_ACCESS_SECRET=<random-32-bytes-hex>
JWT_REFRESH_SECRET=<random-32-bytes-hex>
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Email (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_USER=
EMAIL_PASS=

# Rate Limiting (Upstash Redis o "memory" para dev)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
RATE_LIMIT_DRIVER=memory

# Config
DEFAULT_CODE_EXPIRY_MINUTES=30
DEFAULT_WINNER_INTERVAL=5
```

---

## 9. Seguridad

| Medida | Implementación |
|---|---|
| Auth | JWT access (15min) + refresh (7d, HttpOnly cookie) |
| Contraseñas | Bcrypt 12 rounds |
| CORS | Origin whitelist desde `NEXT_PUBLIC_APP_URL` |
| Rate Limiting | 10 req/min en auth, 60 req/min en spins |
| Contador de giros | 100% server-side con operación atómica |
| Códigos QR | URL firmada con eventId para prevenir enumeración |
| Sanitización | Zod valida y transforma todos los inputs |
| Headers | X-Content-Type-Options, X-Frame-Options via next.config |
| Auditoría | `redeemedBy` registra qué operador canjeó cada código |

---

## 10. Fases de Desarrollo

### FASE 1 — Fundamentos (Semana 1-2)
- Setup del proyecto, variables de entorno, estructura de carpetas
- Modelos Mongoose (Organization, User, Event, Collection, Item, Spin, Redemption, RefreshToken)
- Sistema de autenticación completo (register, login, verify, refresh, logout)
- Middleware de autenticación + rate limiting

### FASE 2 — APIs de Contenido (Semana 2-3)
- CRUD de Events con branding y gameConfig
- CRUD de Collections con schema flexible
- CRUD de Items con metadata dinámica
- Importación bulk por CSV
- Upload de imágenes a Cloudinary

### FASE 3 — Motor de Juego (Semana 3-4)
- API de Spins (server-side counter + weighted random selection)
- API de Redemptions (crear, validar, canjear, exportar)
- Generación de QR codes
- UI del juego (slot machine con reels dinámicos)
- UI de victoria (QR + metadata del item)
- Catálogo de premios

### FASE 4 — Panel Admin (Semana 4-5)
- Dashboard de eventos
- Editor de evento (branding, mecánica, copy)
- Gestor de colecciones con schema editor
- Gestor de items con bulk import
- Panel de redemptions con validación QR
- Dashboard de estadísticas con SSE
- Modo display (pantalla TV)
- Gestión de usuarios y roles

---

## 11. CSV Template por Tipo de Evento

```csv
# Template: Jugadores de fútbol
nombre,imageURL,equipo,pais,posicion,dorsal,peso
Lionel Messi,https://cdn.example.com/messi.jpg,Inter Miami,Argentina,Delantero,10,95
Kylian Mbappé,https://cdn.example.com/mbappe.jpg,Real Madrid,Francia,Delantero,9,90

# Template: Músicos de rock
nombre,imageURL,banda,genero,debut,peso
Freddie Mercury,https://cdn.example.com/freddie.jpg,Queen,Rock Clásico,1970,95
Mick Jagger,https://cdn.example.com/mick.jpg,Rolling Stones,Rock & Roll,1962,90

# Template: Monumentos
nombre,imageURL,ciudad,pais,anio_construccion,peso
Torre Eiffel,https://cdn.example.com/eiffel.jpg,París,Francia,1889,80
Coliseo Romano,https://cdn.example.com/coliseum.jpg,Roma,Italia,70,85
```

---

*Documento generado: Junio 2026. Versión: 1.0*
