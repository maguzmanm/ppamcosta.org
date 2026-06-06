## Plan: Sistema web de administración PPAM + despliegue en la nube

**TL;DR** — Migrar el código existente de `ppamcosta3.org` a `ppamcosta.org`, crear un panel web React (Vite+TypeScript+Shadcn/ui) para los roles administrativos, desplegar el backend en la nube (Render+Turso, ~$0/mes), simplificar la app móvil a solo rol Publicador, y unificar todo con acceso desde cualquier lugar. Incluye paleta corporativa profesional, modo oscuro/claro en web y móvil, y diseño 100% responsive.

---

### Fase 0: Migración a `ppamcosta.org`

**0.1** Copiar `backend/` desde `e:\proyectos\ppamcosta3.org\backend` a `e:\proyectos\ppamcosta.org\backend`.

**0.2** Copiar `mobile/` desde `e:\proyectos\ppamcosta3.org\mobile` a `e:\proyectos\ppamcosta.org\mobile`.

**0.3** Verificar que `pautas/` ya está en `e:\proyectos\ppamcosta.org\pautas`. ✅

**0.4** Verificar que ambos proyectos (backend y mobile) arrancan correctamente desde las nuevas rutas (`npm install` si es necesario, actualizar rutas en scripts de inicio).

*Resultado:* Estructura final del monorepo:
```
e:\proyectos\ppamcosta.org\
├── backend/
├── mobile/
├── web/          <-- NUEVO (fase 2)
└── pautas/
```

---

## 🎨 Sistema de diseño: Paleta corporativa + Modo oscuro/claro + Responsive

### Paleta de colores corporativa PPAM

Inspirada en el ecosistema visual del proyecto, con variantes para modo claro y oscuro:

| Token | Modo claro | Modo oscuro | Uso |
|-------|-----------|-------------|-----|
| `--primary` | `#1E3A5F` | `#4A90D9` | Botones principales, cabeceras, acentos |
| `--primary-light` | `#2D5F8A` | `#6BA8E0` | Hover de primary |
| `--primary-dark` | `#0F2440` | `#2C5A8A` | Active de primary |
| `--secondary` | `#00796B` | `#4DB6AC` | Acentos secundarios, éxito |
| `--background` | `#FAFBFC` | `#121820` | Fondo de página |
| `--surface` | `#FFFFFF` | `#1E2933` | Tarjetas, modales, superficies |
| `--surface-hover` | `#F0F2F5` | `#263238` | Hover en filas/elementos |
| `--text-primary` | `#1A1D23` | `#E8ECF1` | Texto principal |
| `--text-secondary` | `#5A6070` | `#9EA7B3` | Texto secundario, labels |
| `--text-muted` | `#8B95A1` | `#6B7680` | Placeholders, texto deshabilitado |
| `--border` | `#DDE1E6` | `#2E3A45` | Bordes, separadores |
| `--danger` | `#D32F2F` | `#EF5350` | Eliminar, rechazar, errores |
| `--warning` | `#ED6C02` | `#FFA726` | Advertencias, pendiente |
| `--success` | `#2E7D32` | `#66BB6A` | Aprobado, éxito |
| `--info` | `#0288D1` | `#29B6F6` | Informativo |

### Estrategia de tema oscuro/claro

**Web (Tailwind CSS + Shadcn/ui):**
- Shadcn/ui soporta tema oscuro nativamente vía clase `dark` en `<html>`.
- Se almacena preferencia en `localStorage` (`theme: "light" | "dark" | "system"`).
- Toggle en sidebar/header con icono ☀️/🌙.
- Al detectar `prefers-color-scheme: dark` del SO, se aplica automáticamente si está en modo `system`.
- Variables CSS definidas en `:root` (claro) y `.dark` (oscuro) en `globals.css`.

**Móvil (React Native):**
- `useColorScheme()` de React Native para detectar tema del dispositivo.
- Contexto `ThemeContext` con proveedor global (similar a `AuthContext`).
- Paleta exportada como objeto JS con tokens iguales a los de web.
- `AsyncStorage` para guardar preferencia manual del usuario.
- Toggle en pantalla de Perfil.

### Diseño responsive

**Web:**
- **Mobile-first** con breakpoints Tailwind: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px).
- Sidebar colapsa a drawer/hamburguesa en pantallas < `md`.
- Tablas con scroll horizontal en móviles, columnas se ocultan progresivamente en pantallas pequeñas.
- Formularios: stack vertical en móvil, 2 columnas en tablet+, fieldsets en desktop.
- Dashboard: tarjetas en grid de 1 col (móvil) → 2 cols (tablet) → 4 cols (desktop).
- Gráficos responsive con `ResponsiveContainer` de Recharts.
- Mapa full-width con altura adaptable (`h-[300px] md:h-[400px] lg:h-[500px]`).

**Móvil (React Native):**
- `useWindowDimensions()` para adaptar layouts a ancho/alto.
- `Platform.OS` para ajustes específicos iOS/Android.
- Orientación: layouts que se reorganizan con `Dimensions.addEventListener('change')`.
- SafeAreaView para notches y barras de sistema.
- Fuentes escalables con `PixelRatio`.

---

### Fase 1: Infraestructura cloud y despliegue del backend

**1.1** Migrar base de datos de SQLite local a **Turso** (SQLite en la nube, plan gratuito: 500 DBs, 9GB). Solo requiere cambiar el driver de Prisma (`@prisma/adapter-libsql`) y la URL de conexión. La migración es mínima — Turso es compatible con SQLite.

**1.2** Configurar variables de entorno para producción (`.env.production`): `DATABASE_URL` de Turso, `JWT_SECRET` seguro, SMTP para emails reales, etc.

**1.3** Desplegar el backend Express en **Render** (plan gratuito, cold starts ~30s en inactividad). Alternativa: **Railway** (~$5/mes, sin cold starts) si se necesita respuesta inmediata.

**1.4** Actualizar la URL de la API en la app móvil (`mobile/src/services/api.ts`) para que apunte al backend en la nube en lugar de `192.168.1.150`.

*Resultado verificable:* Backend accesible desde internet, app móvil funcionando contra API cloud.

---

### Fase 2: Scaffolding del frontend web

**2.1** Crear proyecto React con Vite + TypeScript en `e:\proyectos\ppamcosta.org\web\`.

**2.2** Instalar y configurar dependencias clave:
- **UI:** Shadcn/ui + Tailwind CSS + Lucide Icons
- **Tema:** `next-themes` para gestión de dark/light mode
- **Ruteo:** React Router v6
- **Datos:** TanStack Query (React Query) para fetching/caché
- **HTTP:** Axios (mismo patrón que la app móvil)
- **Formularios:** React Hook Form + Zod (validación)
- **Gráficas:** Recharts (dashboard)
- **Fechas:** date-fns
- **Exportación:** jsPDF + xlsx (reportes)

**2.2b** Configurar el sistema de temas en Tailwind y Shadcn/ui:
- Definir tokens CSS de la paleta corporativa en `globals.css` (variables en `:root` para claro, `.dark` para oscuro).
- Extender `tailwind.config.ts` con los tokens de la paleta.
- Envolver la app con `ThemeProvider` de `next-themes` para detección automática + persistencia en `localStorage`.
- Implementar toggle ☀️/🌙 en el header/sidebar.

**2.3** Replicar la capa de tipos TypeScript (`types/index.ts`) desde la app móvil, asegurando coherencia con los modelos de Prisma.

*Parallel with step 1.3 y 1.4*

---

### Fase 3: Autenticación y navegación web

**3.1** Implementar `AuthContext` (mismo patrón que `mobile/src/context/AuthContext.tsx`): login, logout, almacenamiento de token en `localStorage`, helpers de permisos por rol (`isCoordinator`, `canCreateShifts`, etc.).

**3.2** Configurar React Router con rutas protegidas por rol:
- `/login` → pública
- `/dashboard` → todos los roles autenticados
- `/circuitos`, `/congregaciones` → Coordinador, Auxiliar
- `/publicadores` → Coordinador, Auxiliar, Enc. Punto, Aux. Punto
- `/puntos` → Coordinador, Auxiliar, Enc. Punto, Aux. Punto
- `/turnos` → Coordinador, Auxiliar, Enc. Punto, Aux. Punto
- `/experiencias` → todos (vista según rol)
- `/anuncios`, `/noticias` → todos
- `/reportes` → Coordinador
- `/perfil` → todos

**3.3** Implementar sidebar/layout con navegación que oculte secciones según rol (misma lógica que `DECISIONES.md` §3.7). La sidebar debe ser responsive:
- **Desktop (≥md):** sidebar fija a la izquierda, ancho ~240px, contenido principal con margen.
- **Tablet/móvil (<md):** sidebar se convierte en drawer con botón hamburguesa + overlay. El contenido ocupa el 100%.
- Las tablas y formularios se adaptan al ancho disponible en cada breakpoint.

*Depende de 2.1, 2.2*

---

### Fase 4: Pantallas del panel web

**4.1 Dashboard con estadísticas** — Tarjetas de resumen (total publicadores, turnos activos, experiencias pendientes) + gráficos (turnos por mes, experiencias por estado). Endpoints a crear o extender en el backend si no existen.

**4.2 CRUD Circuitos y Congregaciones** — Tablas con crear/editar/eliminar. Reutilizar patrones de `backend/src/controllers/circuits.ts` y `congregations.ts`.

**4.3 CRUD Publicadores + gestión de roles** — Tabla con búsqueda, filtros, formulario de creación/edición (incluye asignación de rol y creación automática de usuario — misma lógica de `backend/src/controllers/publishers.ts`). Vista detalle con disponibilidades y turnos.

**4.4 CRUD Puntos (Locations)** — Tabla + mapa interactivo (Leaflet o Google Maps), asignación de encargados de punto. Reutilizar `backend/src/controllers/locations.ts`.

**4.5 Gestión de Turnos** — Calendario/lista de turnos, creación con selección de punto + franja horaria + filtro de publicadores disponibles (misma lógica de `backend/src/controllers/shifts.ts`). Vista de asignaciones y respuestas.

**4.6 Gestión de Experiencias** — Bandeja de pendientes para aprobar/rechazar (Coordinador, Enc. Exp.), lista de todas/aprobadas según rol. Reutilizar `backend/src/controllers/experiences.ts`.

**4.7 Anuncios y Noticias** — CRUD para Coordinador, vista para todos.

**4.8 Reportes y exportación** — Turnos por período, publicadores activos, experiencias aprobadas. Exportar a PDF y Excel.

*Los pasos 4.1–4.8 pueden ejecutarse en paralelo tras completar fase 3.*

---

### Fase 5: Simplificación de la app móvil + Tema oscuro/claro

**5.1** Modificar `mobile/src/navigation/AppNavigator.tsx` para eliminar las pestañas que no corresponden al rol Publicador. Dejar solo: Inicio, Turnos (mis turnos), Experiencias, Anuncios, Noticias, Perfil.

**5.2** Implementar `ThemeContext` en la app móvil:
- Crear `mobile/src/context/ThemeContext.tsx` con el mismo patrón que `AuthContext`.
- Definir paleta de colores clara/oscura como objeto JS (mismos tokens que web, adaptados a React Native).
- Detectar tema del sistema con `useColorScheme()`.
- Persistir preferencia manual en `AsyncStorage`.
- Aplicar colores a todos los componentes (StatusBar, fondos, textos, botones, tabs).
- Toggle ☀️/🌙 en `ProfileScreen`.

**5.3** Verificar que las pantallas restantes funcionen correctamente con el backend cloud y el tema.

*Parallel with fase 4*

---

### Fase 6: Despliegue final y verificación

**6.1** Desplegar frontend web en **Vercel** (plan gratuito, SSL automático, CI/CD con GitHub).

**6.2** Probar flujo completo: login web como Coordinador → crear publicador → asignar turno → login móvil como Publicador → ver y aceptar turno.

**6.3** Probar matriz de permisos completa (roles, 403, tabs ocultos).

**6.4** Actualizar `pautas/DECISIONES.md` con la nueva arquitectura cloud + web.

---

### Archivos relevantes

| Archivo | Acción |
|---------|--------|
| `backend/prisma/schema.prisma` | Modificar provider a `libsql` para Turso |
| `backend/.env` | Nueva URL de BD, secrets de producción |
| `backend/src/index.ts` | Posible ajuste de CORS para el dominio web |
| `mobile/src/services/api.ts` | Cambiar `BASE_URL` a URL cloud |
| `mobile/src/navigation/AppNavigator.tsx` | Eliminar tabs de admin |
| `mobile/src/context/ThemeContext.tsx` | Tema oscuro/claro en móvil (NUEVO) |
| `web/` (nuevo) | Todo el frontend web |
| `web/src/styles/globals.css` | Variables CSS de tema claro/oscuro (NUEVO) |
| `web/tailwind.config.ts` | Tokens de paleta corporativa (NUEVO) |
| `pautas/DECISIONES.md` | Actualizar arquitectura |

---

### Decisiones

- **Turso** sobre PostgreSQL: mínimo cambio en código (solo driver Prisma), plan gratuito generoso, compatible con SQLite.
- **Render** sobre Railway: $0/mes para empezar. Si los cold starts resultan molestos, migrar a Railway ($5/mes) es trivial.
- **Shadcn/ui** sobre MUI/AntDesign: más ligero, basado en Tailwind, personalizable, buena DX con TypeScript.
- **No se modifica la lógica del backend**: todas las APIs existentes ya cubren los roles administrativos.
- **Carpeta raíz `ppamcosta.org`**: se migra el código de `ppamcosta3.org` a esta carpeta y todo el desarrollo nuevo se hace aquí.
- **Paleta corporativa**: `#1E3A5F` (primario azul marino) y `#00796B` (secundario verde azulado) con sus variantes claro/oscuro.
- **next-themes** para web, **ThemeContext + useColorScheme** para móvil.

---

### Verificación

1. `curl https://ppam-api.onrender.com/api/health` → 200 OK
2. Login web como `juan@ppam.org` → ver Dashboard con stats
3. Crear publicador desde web → aparece en móvil
4. Asignar turno desde web → Publicador recibe push y lo acepta en móvil
5. Aprobar experiencia desde web → visible en móvil del Publicador
6. Probar cada rol: tabs correctos, 403 donde corresponde
7. **Tema:** Cambiar a modo oscuro en web → todos los componentes reflejan la paleta oscura. Cambiar en móvil → mismo comportamiento.
8. **Tema:** Seleccionar "Sistema" → el tema sigue la preferencia del SO.
9. **Responsive:** Redimensionar navegador a 375px (móvil) → sidebar se vuelve drawer, tablas con scroll, formularios en columna.
10. **Responsive:** Girar dispositivo móvil → layout se reorganiza sin pérdida de contenido.
11. **Cross-device:** Probar en Chrome, Firefox, Safari, Android Chrome, iOS Safari.
