# Receta `base-page`

Forma: **una sola pantalla**. En Juan eso es Bio: un texto largo y una imagen opcional. No hay lista, no se “entra” a un ítem.

Sirve para bio, statement, acerca de, contacto. El identificador es el **slug** (`bio`, `contacto`…). Varias páginas pueden vivir en la misma tabla `pages`.

## Qué no es

- No es Textos (eso es `base-editorial`).
- No es el retrato con escala de Juan (`portrait_scale`). Si un artista lo necesita, se suma en **esa** copia.
- Sin inglés en el molde. Bilingüe = migración extra en esa web.

## Archivos (ejemplo `bio` en el motor)

| Pieza | Dónde |
|---|---|
| SQL | `db/003_pages.sql` |
| API | `server/core/routes/pages.ts` → `GET/PUT /api/pages/:slug` |
| Cliente | `src/core/api/pages.ts` |
| Admin | `AdminPageEditor` + ruta `/admin/bio` |
| Público | `PageView` + ruta `/bio` |
| Menú | `site.config.ts` → `{ to: '/admin/bio', label: 'Bio' }` |

## Cómo copiarla (ej. Contacto)

1. La tabla `pages` ya existe si corriste `003`. No copies otra tabla: **insertá otro slug**.
2. Admin: `<Route path="contacto" element={<AdminPageEditor slug="contacto" heading="Contacto" />} />`
3. Público: `<Route path="/contacto" element={<PageView slug="contacto" />} />`
4. Link en `site.config.ts`.

Si el sitio no quiere Bio, no registres el slug. La tabla puede quedar vacía.
