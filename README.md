# Futbol y Porro

App web mobile-first para gestionar un grupo de fútbol amateur de domingo.

## Stack

- React + Vite + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase Auth + Postgres + Storage
- Deploy listo para Vercel

## Setup local

1. Instalá dependencias:

```bash
npm install
```

2. Creá `.env.local` usando `.env.example`:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

3. Aplicá la migración SQL en Supabase:

```bash
supabase/migrations/20260420160000_initial_schema.sql
```

Podés pegarla en el SQL Editor de Supabase o correrla con Supabase CLI.

4. Levantá la app:

```bash
npm run dev
```

## Funcionalidades

- Dashboard con último partido, próximo partido, MVP reciente, ranking top 10 y fondo común.
- Gestión de jugadores con alta, edición, perfil individual y subida de foto a Supabase Storage.
- Historial tipo timeline con resultado, MVP, gol de la fecha y jugadores.
- Panel admin para crear y editar partidos, armar equipos y cargar estadísticas.
- Votación MVP / Gol de la fecha con validaciones en PostgreSQL.
- Ranking calculado por vista `rankings`.
- Fondo acumulado por vista `fund_summary`, ledger de movimientos y multas.
- Estadísticas avanzadas: goleador, mejor promedio, racha, ELO, química y logros.
- Modo público con ranking compartible.
- Export compatible con Excel vía CSV.
- Notificaciones rápidas por WhatsApp/email usando enlaces prearmados.
- Configuración de ventana de votación, aportes y premios desde UI.

## Reglas implementadas en backend

- Asistencia +1, gol +2, asistencia +1, MVP +5, gol de la fecha +3.
- Aporte automático por jugador presente, configurable por `app_settings`.
- Un voto MVP y un voto Gol de la fecha por jugador y partido.
- Bloqueo de self-vote.
- Solo pueden votar jugadores presentes.
- Ventana de votación desde lunes 00:00 por 48h configurable.
- Cierre de votación con desempate por goles, asistencias y calificación.

## Admin inicial

Las políticas de escritura usan `app_admins`. Después de iniciar sesión por magic link, copiá tu `auth.users.id` desde Supabase y ejecutá:

```sql
insert into public.app_admins (user_id)
values ('TU_AUTH_USER_ID');
```

Sin ese paso, el modo público y las lecturas funcionan, pero las escrituras admin quedan bloqueadas por RLS.

## Deploy en Vercel

Configurá estas variables en Vercel:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

El archivo `vercel.json` ya incluye rewrite a `index.html` para que React Router funcione al refrescar rutas internas.
