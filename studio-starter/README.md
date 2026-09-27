# studio-starter

Motor vacío para webs de artista: **Vite + React Router + Neon + R2**.

No es un sitio. Se **copia** esta carpeta por cada cliente. Juan Tarraf, Nathalia y el resto **no** se tocan al trabajar acá.

Hoy trae: login, API única, migraciones, `media`, receta **base-editorial** (`/editorial`), **base-page** (`/bio`) y el módulo **free-canvas** (`/canvas`).

## Docs (leé estos, no inventes el stack)

| Doc | Cuándo |
|---|---|
| [`AGENTS.md`](AGENTS.md) | Reglas duras. Cursor lo lee solo. |
| [`docs/README.md`](docs/README.md) | Índice de todas las guías |
| [`docs/day-1.md`](docs/day-1.md) | Clonar, Neon, env, migrar, correr, primer deploy |
| [`docs/architecture.md`](docs/architecture.md) | Dónde va cada cosa y cómo agregar una ruta |
| [`docs/first-deploy-rewrite.md`](docs/first-deploy-rewrite.md) | **Obligatorio** en el primer deploy de una web nueva |
| [`docs/images.md`](docs/images.md) | Variantes, R2, `<Picture>` |
| [`docs/troubleshooting.md`](docs/troubleshooting.md) | Síntomas → causa → qué hacer |
| [`docs/specs/2026-09-20-motor-cms-neon-r2-design.md`](docs/specs/2026-09-20-motor-cms-neon-r2-design.md) | Log de decisiones (histórico). No es la guía de implementación. |

## Arranque local de **esta** plantilla

```bash
cp .env.example .env
# Completá ADMIN_PASSWORD y ADMIN_SESSION_SECRET (los dos).
# DATABASE_URL y R2 hacen falta cuando uses migraciones o upload.
npm install
npm run dev
```

- Público: http://localhost:5173/
- Admin: http://localhost:5173/admin

No uses `vercel dev` para el día a día. Choca con el rewrite del SPA y Vite.

## Clonar para un cliente

Seguí [`docs/day-1.md`](docs/day-1.md). Resumen: `cp -R` **sin** `node_modules`, `.env` ni `.vercel`. Env nuevo, proyecto Neon nuevo, proyecto Vercel **nuevo** (link adentro de la copia). Después el checklist de rewrite en producción.

## Qué no es esto

- No es Next.js ni Supabase. Esa versión quedó en la rama `supabase-legacy`.
- No copies `studio-core` (sigue en Supabase).
- No “arregles” Juan Tarraf para que coincida con este motor.
