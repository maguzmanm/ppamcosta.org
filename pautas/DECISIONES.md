# PPAM — Predicación Pública Áreas Metropolitanas

## Documento de decisiones y arquitectura

**Versión:** 2.0  
**Fecha:** 5 de junio de 2026  
**Stack:** React (Vite) + React Native (Expo SDK 54) + Node.js/Express/TypeScript + Prisma + SQLite/Turso

---

## 1. Arquitectura general

```
[Panel Web React] ─┐
                    ├──> [Node.js/Express API] <--> [SQLite / Turso]
[App Móvil RN]    ─┘        (REST/JSON)              (datos)
```

- **Backend:** `http://localhost:3000` (desarrollo local) o cloud (Render + Turso en producción)
- **Web:** `http://localhost:5173` (Vite dev server, React + TypeScript + Shadcn/ui + Tailwind)
- **Móvil:** React Native (Expo SDK 54), solo rol Publicador
- **Base de datos:** SQLite (`backend/prisma/dev.db`) en local, Turso (SQLite cloud) en producción
- **Repositorio:** `e:\proyectos\ppamcosta.org\` (monorepo: `backend/`, `mobile/`, `web/`, `pautas/`)

---

## 2. Roles y permisos

| Rol | Usuario seed | Descripción |
|---|---|---|
| **COORDINADOR** | juan@ppam.org | Control total del sistema |
| **AUXILIAR** | maria@ppam.org | Solo lectura de circuitos, congregaciones, publicadores, puntos y turnos |
| **ENCARGADO_EXPERIENCIAS** | pedro@ppam.org | Aprueba/rechaza experiencias |
| **ENCARGADO_PUNTO** | carlos@ppam.org | Gestiona turnos en sus puntos asignados |
| **AUXILIAR_PUNTO** | elena@ppam.org | Gestiona turnos en sus puntos asignados |
| **PUBLICADOR** | ana@ppam.org | Ve y acepta/rechaza sus turnos; envía experiencias; ve experiencias aprobadas |

**Contraseña de todos:** `123456`

### Matriz de permisos

| Acción | Coordinador | Auxiliar | Enc. Punto | Aux. Punto | Enc. Exp. | Publicador |
|---|---|---|---|---|---|---|
| Ver circuitos/congregaciones | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Editar circuitos/congregaciones | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Ver publicadores | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Crear/editar publicadores | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Ver puntos | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Crear/editar puntos | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Ver todos los turnos | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Crear turnos | ✅ | ❌ | ✅ (sus puntos) | ✅ (sus puntos) | ❌ | ❌ |
| Aceptar/rechazar turnos | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Gestionar encargados de punto | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Ver todas las experiencias | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Ver experiencias aprobadas | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Aprobar/rechazar experiencias | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Enviar experiencias | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 3. Decisiones clave

### 3.1 Publicador = Usuario
- **Decisión:** Los publicadores y usuarios son la misma entidad. Todo usuario está vinculado a un publicador y viceversa.
- **Implementación:** Al crear un publicador con email + contraseña, se crea automáticamente su cuenta de usuario. El rol se gestiona desde la ficha del publicador.
- **Eliminado:** Pestaña "Usuarios" independiente. Todo se hace desde "Publicadores".

### 3.2 Base de datos
- **Decisión:** SQLite para desarrollo. Prisma como ORM.
- **16 modelos:** Circuit, Congregation, TimeSlot, Publisher, User, Location, LocationAssignment, Shift, ShiftAssignment, Availability, News, Experience, Announcement, Notification, DeviceToken, NotificationPreference, Incident.
- **Campos clave:** `marriedLastName` en Publisher (para formato "María de González"), `designations` como JSON string, `gender` ("M"/"F").

### 3.3 Formato de nombres
- **Decisión:** Si existe `marriedLastName`, mostrar "Nombre de ApellidoCasada". Si no, "Nombre Apellido".
- Se aplica en: Dashboard, Publicadores, Puntos, Turnos, Experiencias.

### 3.4 Formato de teléfono
- **Decisión:** Formato chileno `+56 9 XXXX XXXX`.
- Se limpian los dígitos al guardar, se formatea al mostrar.
- Aplica en: Publicadores, Dashboard.

### 3.5 Mapa en Puntos
- **Decisión:** `react-native-maps` con modal al tocar "🗺 Ver mapa".
- Muestra marcador en coordenadas del punto con nombre y dirección.

### 3.6 Experiencias — visibilidad
- **Decisión:** Coordinador, Auxiliar y Enc. Experiencias ven TODAS (aprobadas, rechazadas, pendientes). El resto solo ve APROBADAS.
- Solo Coordinador y Enc. Experiencias pueden aprobar/rechazar.

### 3.7 Tabs visibles según rol
- **Decisión:** Las pestañas se ocultan si el rol no tiene acceso, en vez de mostrar error 403.
- Errores 403 se manejan con mensaje amigable "No tienes permisos para ver esta sección".

### 3.8 Autenticación
- **Decisión:** JWT con bcrypt. Token almacenado en `expo-secure-store`.
- Recuperación de contraseña: código de 6 dígitos (15 min de expiración).
- Endpoints: `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/me`.

### 3.9 Notificaciones
- **Push:** Expo Push API (`expo-server-sdk`). Token registrado al iniciar sesión. Se elimina si es inválido.
- **Email:** Nodemailer + Ethereal (auto-config si no hay SMTP). Con credenciales SMTP, envía emails reales.
- **Eventos:** Turno asignado, turno aceptado/rechazado, turno cancelado, experiencia pendiente.
- **Preferencias:** Cada usuario activa/desactiva push y email por separado.

### 3.10 Seed de datos
- 6 publicadores con emails y roles variados.
- 3 congregaciones, 1 circuito, 6 franjas horarias (bloques de 2h).
- 3 puntos con coordenadas reales de Santiago.
- 3 experiencias de ejemplo (aprobada, rechazada, pendiente).
- 1 noticia de bienvenida.

---

## 4. Seguridad

| Prueba | Resultado |
|---|---|
| Sin token → endpoints | 401 ✅ |
| Escalación de privilegios | 403 ✅ |
| Token manipulado | 401 ✅ |
| SQL injection | Bloqueado por Prisma ✅ |
| XSS básico | Sin efecto ✅ |
| Path traversal | 404 ✅ |

- **Middleware:** `authenticate` (JWT), `authorize(roles)` (por rol), `authorizeSelfOrRole` (propio o rol superior).

---

## 5. Rutas API principales

| Método | Ruta | Roles |
|---|---|---|
| POST | `/auth/login` | Público |
| POST | `/auth/forgot-password` | Público |
| POST | `/auth/reset-password` | Público |
| GET | `/auth/me` | Autenticado |
| GET | `/auth/users` | Coordinador |
| GET | `/circuits` | Coordinador, Auxiliar |
| GET | `/congregations` | Coordinador, Auxiliar |
| GET | `/publishers` | Coordinador, Auxiliar, Enc. Punto, Aux. Punto |
| POST/PUT/DELETE | `/publishers` | Coordinador |
| GET | `/locations` | Coordinador, Auxiliar, Enc. Punto, Aux. Punto |
| GET | `/locations/my` | Coordinador, Enc. Punto, Aux. Punto |
| GET | `/shifts` | Coordinador, Auxiliar, Enc. Punto, Aux. Punto |
| POST | `/shifts` | Coordinador, Enc. Punto, Aux. Punto |
| GET | `/shifts/my` | Todos |
| POST | `/shifts/:id/respond` | Todos |
| GET | `/experiences` | Todos |
| PUT | `/experiences/:id/review` | Coordinador, Enc. Experiencias |
| GET/PUT | `/notifications/preferences` | Autenticado |
| POST | `/notifications/device` | Autenticado |

---

## 6. Configuración del entorno

### Backend (.env)
```
DATABASE_URL="file:./dev.db"
JWT_SECRET="cambia-este-secreto-en-produccion"
JWT_EXPIRES_IN="7d"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="no-reply@ppam.org"
```

### Mobile
- **Expo SDK:** 54.0.35
- **Dependencias clave:** `react-native-maps`, `expo-notifications`, `expo-secure-store`, `axios`
- **Navegación:** React Navigation 6 (bottom tabs + native stack)
- **Variables de entorno:** `REACT_NATIVE_PACKAGER_HOSTNAME=192.168.1.150`

---

## 7. Comandos de inicio

```powershell
# Backend
npm --prefix e:\proyectos\ppamcosta3.org\backend run dev

# Mobile (Expo)
Push-Location e:\proyectos\ppamcosta3.org\mobile
$env:REACT_NATIVE_PACKAGER_HOSTNAME="192.168.1.150"
npx expo start --clear
Pop-Location
```

---

## 8. Alcance v1 — Completado ✅

- ✅ CRUD Circuitos, Congregaciones, Publicadores, Puntos, Turnos
- ✅ 6 roles con permisos granulares
- ✅ Publicador = Usuario unificados
- ✅ Filtro de disponibilidad al crear turnos
- ✅ Flujo aceptación/rechazo de turnos
- ✅ Experiencias con flujo de aprobación
- ✅ Mapa en puntos
- ✅ Notificaciones push (Expo) + email (Ethereal)
- ✅ Recuperación de contraseña
- ✅ Formato nombres (apellido de casada) y teléfonos (+56 9)
- ✅ Seguridad: JWT, roles, sanitización

### Fuera del alcance v1
- ❌ Carga masiva/importación de PDFs S-73
- ❌ Reportes y estadísticas
- ❌ Firebase Cloud Messaging (se usa Expo Push API)
