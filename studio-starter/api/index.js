// server/core/http.ts
function json(body, init) {
  return Response.json(body, init);
}
function fail(status, error) {
  return Response.json({ error }, { status });
}
var unauthorized = () => fail(401, "No autorizado");
var notFound = () => fail(404, "No encontrado");
var methodNotAllowed = () => fail(405, "M\xE9todo no permitido");
async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
function asText(value) {
  return typeof value === "string" ? value.trim() : "";
}
function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

// server/core/router.ts
function route(method, pattern, handler) {
  return { method: method.toUpperCase(), pattern, handler };
}
function apiPath(url) {
  const fromQuery = url.searchParams.get("__path");
  if (fromQuery === null) return url.pathname;
  const clean = fromQuery.split("?")[0]?.replace(/^\/+/, "") ?? "";
  return `/api/${clean}`;
}
function matchPattern(pattern, path) {
  const expected = pattern.split("/").filter(Boolean);
  const actual = path.split("/").filter(Boolean);
  if (expected.length !== actual.length) return null;
  const params = {};
  for (let i = 0; i < expected.length; i += 1) {
    const segment = expected[i];
    const value = actual[i];
    if (segment.startsWith(":")) {
      params[segment.slice(1)] = decodeURIComponent(value);
      continue;
    }
    if (segment !== value) return null;
  }
  return params;
}
function createRouter(routes2) {
  return async function handle2(request) {
    const url = new URL(request.url);
    const path = apiPath(url);
    const method = request.method.toUpperCase();
    let pathMatched = false;
    for (const candidate of routes2) {
      const params = matchPattern(candidate.pattern, path);
      if (!params) continue;
      pathMatched = true;
      if (candidate.method !== method) continue;
      return candidate.handler({ request, url, params });
    }
    return pathMatched ? methodNotAllowed() : notFound();
  };
}

// server/core/env.ts
function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable ${name}`);
  return value;
}
function optionalEnv(name) {
  return process.env[name] || "";
}
function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}
function hasR2() {
  return Boolean(
    process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET && process.env.R2_PUBLIC_BASE_URL
  );
}

// server/core/auth.ts
var SESSION_DAYS = 7;
var MAX_AGE_SECONDS = 60 * 60 * 24 * SESSION_DAYS;
function cookieName() {
  return optionalEnv("ADMIN_COOKIE_NAME") || "studio_admin";
}
function secret() {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value) throw new Error("Falta ADMIN_SESSION_SECRET");
  return value;
}
async function hmacHex(value) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function parseCookies(header) {
  const out = {};
  for (const part of (header ?? "").split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (!name) continue;
    try {
      out[name] = decodeURIComponent(rest.join("="));
    } catch {
      out[name] = rest.join("=");
    }
  }
  return out;
}
async function passwordsMatch(given, expected) {
  const a = await hmacHex(`pw:${given}`);
  const b = await hmacHex(`pw:${expected}`);
  return safeEqual(a, b);
}
async function signSession() {
  const payload = String(Date.now() + MAX_AGE_SECONDS * 1e3);
  return `${payload}.${await hmacHex(payload)}`;
}
async function sessionValid(token) {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  if (!safeEqual(signature, await hmacHex(payload))) return false;
  return Number(payload) > Date.now();
}
async function isAuthed(request) {
  try {
    const token = parseCookies(request.headers.get("cookie"))[cookieName()];
    return sessionValid(token);
  } catch {
    return false;
  }
}
function secureFlag() {
  const vercel = process.env.VERCEL_ENV;
  if (vercel === "production" || vercel === "preview") return "; Secure";
  return process.env.NODE_ENV === "production" ? "; Secure" : "";
}
function sessionCookie(token) {
  return `${cookieName()}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${MAX_AGE_SECONDS}${secureFlag()}`;
}
function clearedCookie() {
  return `${cookieName()}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secureFlag()}`;
}

// server/core/routes/auth.ts
var attempts = /* @__PURE__ */ new Map();
var WINDOW_MS = 15 * 60 * 1e3;
var MAX_ATTEMPTS = 12;
function clientIp(request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
function tooManyAttempts(ip) {
  const now = Date.now();
  const row = attempts.get(ip);
  if (!row || now - row.startedAt > WINDOW_MS) {
    attempts.set(ip, { count: 1, startedAt: now });
    return false;
  }
  row.count += 1;
  return row.count > MAX_ATTEMPTS;
}
function clearAttempts(ip) {
  attempts.delete(ip);
}
function expectedPassword() {
  return process.env.ADMIN_PASSWORD || "";
}
var authRoutes = [
  route("POST", "/api/auth/login", async ({ request }) => {
    if (tooManyAttempts(clientIp(request))) {
      return fail(429, "Demasiados intentos. Esper\xE1 unos minutos.");
    }
    const expected = expectedPassword();
    const sessionSecret = process.env.ADMIN_SESSION_SECRET || "";
    if (!expected) return fail(503, "Falta configurar ADMIN_PASSWORD");
    if (!sessionSecret) return fail(503, "Falta configurar ADMIN_SESSION_SECRET");
    if (expected === sessionSecret) {
      return fail(503, "ADMIN_SESSION_SECRET no puede ser igual a ADMIN_PASSWORD");
    }
    const body = await readJson(request);
    if (!await passwordsMatch(typeof body.password === "string" ? body.password : "", expected)) {
      return fail(401, "Contrase\xF1a incorrecta");
    }
    clearAttempts(clientIp(request));
    return json({ ok: true }, { headers: { "Set-Cookie": sessionCookie(await signSession()) } });
  }),
  route(
    "POST",
    "/api/auth/logout",
    () => json({ ok: true }, { headers: { "Set-Cookie": clearedCookie() } })
  ),
  route("GET", "/api/auth/me", async ({ request }) => json({ ok: await isAuthed(request) }))
];

// server/core/canvas-scope.ts
function isCanvasScope(value) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 80;
}

// server/core/canvas-put.ts
var TITLE_MAX = 200;
var BODY_MAX = 6e3;
function clampNum(value, min, max, fallback) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
function clip(value, max) {
  return value.length <= max ? value : value.slice(0, max);
}
function parseCanvasPut(blocks, knownIds) {
  if (!Array.isArray(blocks)) return { ok: false, error: "blocks es obligatorio" };
  const parsed = [];
  for (const raw of blocks) {
    if (!raw || typeof raw !== "object") return { ok: false, error: "bloque inv\xE1lido" };
    const block = raw;
    const id = asText(block.id);
    if (!isUuid(id) || !knownIds.has(id)) return { ok: false, error: "Id de bloque inv\xE1lido" };
    const kind = asText(block.kind);
    if (kind && kind !== "canvas" && kind !== "text") return { ok: false, error: "kind inv\xE1lido" };
    const piecesRaw = block.pieces;
    if (piecesRaw !== void 0 && !Array.isArray(piecesRaw)) {
      return { ok: false, error: "pieces inv\xE1lido" };
    }
    const pieces = [];
    for (const pieceRaw of piecesRaw ?? []) {
      if (!pieceRaw || typeof pieceRaw !== "object") return { ok: false, error: "pieza inv\xE1lida" };
      const piece = pieceRaw;
      const mediaId = asText(piece.mediaId);
      if (!isUuid(mediaId)) return { ok: false, error: "mediaId inv\xE1lido" };
      pieces.push({
        mediaId,
        x: clampNum(piece.x, 0, 95, 8),
        y: clampNum(piece.y, 0, 98, 8),
        width: clampNum(piece.width, 5, 90, 24)
      });
    }
    parsed.push({
      id,
      title: clip(asText(block.title), TITLE_MAX),
      body: clip(asText(block.body), BODY_MAX),
      heightRatio: clampNum(block.heightRatio, 0.6, 2.5, 1.2),
      pieces
    });
  }
  return { ok: true, blocks: parsed };
}
function mediaIdsOf(blocks) {
  return [...new Set(blocks.flatMap((block) => block.pieces.map((piece) => piece.mediaId)))];
}

// server/core/db.ts
import { neon } from "@neondatabase/serverless";
function sql() {
  if (!hasDatabase()) throw new Error("DATABASE_URL no est\xE1 configurada");
  return neon(requireEnv("DATABASE_URL"));
}

// server/core/routes/canvas.ts
var MAX_PER_KIND = 4;
var KINDS = /* @__PURE__ */ new Set(["canvas", "text"]);
function mediaOf(row) {
  if (!row.media_id || !row.url) return null;
  return {
    id: row.media_id,
    url: row.url,
    width: row.media_width,
    height: row.media_height,
    mime: row.mime,
    variants: row.variants ?? {}
  };
}
function pieceOf(row) {
  const media = mediaOf(row);
  return {
    id: row.id,
    mediaId: row.media_id,
    src: media?.url ?? "",
    x: row.x,
    y: row.y,
    width: row.width,
    z: row.z_index,
    media
  };
}
function blockOf(row, pieces) {
  return {
    id: row.id,
    kind: row.kind === "text" ? "text" : "canvas",
    title: row.title,
    body: row.body,
    sortOrder: row.sort_order,
    heightRatio: row.height_ratio,
    pieces
  };
}
function scopeOr400(raw) {
  const scope = asText(raw);
  if (!isCanvasScope(scope)) return null;
  return scope;
}
async function loadScope(scope) {
  const db = sql();
  const canvases = await db`
    select id, scope, kind, title, body, sort_order, height_ratio
    from canvases
    where scope = ${scope}
    order by sort_order, created_at
  `;
  const placements = await db`
    select
      p.id, p.canvas_id, p.media_id, p.x, p.y, p.width, p.z_index,
      m.url, m.width as media_width, m.height as media_height,
      m.mime, m.variants
    from canvas_placements p
    join media m on m.id = p.media_id
    join canvases c on c.id = p.canvas_id
    where c.scope = ${scope}
    order by p.z_index, p.created_at
  `;
  const byCanvas = /* @__PURE__ */ new Map();
  for (const row of placements) {
    const list = byCanvas.get(row.canvas_id) ?? [];
    list.push(pieceOf(row));
    byCanvas.set(row.canvas_id, list);
  }
  return {
    scope,
    blocks: canvases.map((row) => blockOf(row, byCanvas.get(row.id) ?? []))
  };
}
async function replacePlacements(db, block) {
  const previous = await db`
    select id from canvas_placements where canvas_id = ${block.id}
  `;
  let z = 0;
  for (const piece of block.pieces) {
    await db`
      insert into canvas_placements (canvas_id, media_id, x, y, width, z_index)
      values (${block.id}, ${piece.mediaId}, ${piece.x}, ${piece.y}, ${piece.width}, ${z})
    `;
    z += 1;
  }
  for (const row of previous) {
    await db`delete from canvas_placements where id = ${row.id}`;
  }
}
var canvasRoutes = [
  route("GET", "/api/canvas/:scope", async ({ params }) => {
    const scope = scopeOr400(params.scope);
    if (!scope) return fail(400, "Scope inv\xE1lido");
    if (!hasDatabase()) return fail(503, "Falta DATABASE_URL");
    return json(await loadScope(scope));
  }),
  route("POST", "/api/canvas/:scope", async ({ request, params }) => {
    if (!await isAuthed(request)) return unauthorized();
    const scope = scopeOr400(params.scope);
    if (!scope) return fail(400, "Scope inv\xE1lido");
    if (!hasDatabase()) return fail(503, "Falta DATABASE_URL");
    const body = await readJson(request);
    const kind = asText(body.kind) || "canvas";
    if (!KINDS.has(kind)) return fail(400, "kind tiene que ser canvas o text");
    const db = sql();
    const counted = await db`
      select count(*)::int as n from canvases
      where scope = ${scope} and kind = ${kind}
    `;
    if ((counted[0]?.n ?? 0) >= MAX_PER_KIND) {
      return fail(400, `M\xE1ximo ${MAX_PER_KIND} bloques de este tipo`);
    }
    const inserted = await db`
      insert into canvases (scope, kind, sort_order)
      values (
        ${scope},
        ${kind},
        (select coalesce(max(sort_order), -1) + 1 from canvases where scope = ${scope})
      )
      returning id, scope, kind, title, body, sort_order, height_ratio
    `;
    if (!inserted[0]) return fail(500, "No se pudo crear el bloque");
    return json({ block: blockOf(inserted[0], []) });
  }),
  route("PUT", "/api/canvas/:scope", async ({ request, params }) => {
    if (!await isAuthed(request)) return unauthorized();
    const scope = scopeOr400(params.scope);
    if (!scope) return fail(400, "Scope inv\xE1lido");
    if (!hasDatabase()) return fail(503, "Falta DATABASE_URL");
    const payload = await readJson(request);
    const db = sql();
    const existing = await db`
      select id from canvases where scope = ${scope}
    `;
    const known = new Set(existing.map((row) => row.id));
    const parsed = parseCanvasPut(payload.blocks, known);
    if (!parsed.ok) return fail(400, parsed.error);
    for (const mediaId of mediaIdsOf(parsed.blocks)) {
      const found = await db`select id from media where id = ${mediaId}`;
      if (!found[0]) return fail(400, "mediaId inv\xE1lido");
    }
    let sortOrder = 0;
    for (const block of parsed.blocks) {
      await db`
        update canvases
        set
          title = ${block.title},
          body = ${block.body},
          height_ratio = ${block.heightRatio},
          sort_order = ${sortOrder}
        where id = ${block.id} and scope = ${scope}
      `;
      sortOrder += 1;
    }
    for (const block of parsed.blocks) {
      await replacePlacements(db, block);
    }
    return json(await loadScope(scope));
  }),
  route("DELETE", "/api/canvas/:scope/:id", async ({ request, params }) => {
    if (!await isAuthed(request)) return unauthorized();
    const scope = scopeOr400(params.scope);
    if (!scope) return fail(400, "Scope inv\xE1lido");
    if (!isUuid(params.id ?? "")) return fail(400, "Id inv\xE1lido");
    if (!hasDatabase()) return fail(503, "Falta DATABASE_URL");
    const db = sql();
    const rows = await db`
      delete from canvases
      where id = ${params.id} and scope = ${scope}
      returning id
    `;
    if (!rows[0]) return notFound();
    return json({ ok: true });
  })
];

// server/core/routes/editorial.ts
function coverOf(row) {
  if (!row.cover_media_id || !row.cover_url) return null;
  return {
    id: row.cover_media_id,
    url: row.cover_url,
    width: row.cover_width,
    height: row.cover_height,
    mime: row.cover_mime,
    variants: row.cover_variants ?? {}
  };
}
function toRecord(row, withBody) {
  return {
    id: row.id,
    title: row.title,
    excerpt: row.excerpt,
    ...withBody ? { body: row.body } : {},
    cover: coverOf(row),
    sortOrder: row.sort_order,
    createdAt: row.created_at
  };
}
function selectSql(db, whereId) {
  if (whereId) {
    return db`
      select
        i.id, i.title, i.excerpt, i.body, i.cover_media_id, i.sort_order, i.created_at,
        m.url as cover_url, m.width as cover_width, m.height as cover_height,
        m.mime as cover_mime, m.variants as cover_variants
      from editorial_items i
      left join media m on m.id = i.cover_media_id
      where i.id = ${whereId}
    `;
  }
  return db`
    select
      i.id, i.title, i.excerpt, i.body, i.cover_media_id, i.sort_order, i.created_at,
      m.url as cover_url, m.width as cover_width, m.height as cover_height,
      m.mime as cover_mime, m.variants as cover_variants
    from editorial_items i
    left join media m on m.id = i.cover_media_id
    order by i.sort_order, i.created_at desc
  `;
}
function coverIdFrom(raw) {
  const value = asText(raw);
  if (!value) return null;
  if (!isUuid(value)) return void 0;
  return value;
}
var editorialRoutes = [
  route("GET", "/api/editorial", async () => {
    if (!hasDatabase()) return fail(503, "Falta DATABASE_URL");
    const rows = await selectSql(sql());
    return json({ items: rows.map((row) => toRecord(row, false)) });
  }),
  route("GET", "/api/editorial/:id", async ({ params }) => {
    if (!isUuid(params.id ?? "")) return fail(400, "Id inv\xE1lido");
    if (!hasDatabase()) return fail(503, "Falta DATABASE_URL");
    const rows = await selectSql(sql(), params.id);
    if (!rows[0]) return notFound();
    return json(toRecord(rows[0], true));
  }),
  route("POST", "/api/editorial", async ({ request }) => {
    if (!await isAuthed(request)) return unauthorized();
    if (!hasDatabase()) return fail(503, "Falta DATABASE_URL");
    const body = await readJson(request);
    const title = asText(body.title);
    if (!title) return fail(400, "El t\xEDtulo es obligatorio");
    const coverMediaId = coverIdFrom(body.coverMediaId);
    if (coverMediaId === void 0) return fail(400, "coverMediaId inv\xE1lido");
    const db = sql();
    const inserted = await db`
      insert into editorial_items (title, excerpt, body, cover_media_id, sort_order)
      values (
        ${title},
        ${asText(body.excerpt)},
        ${asText(body.body)},
        ${coverMediaId},
        (select coalesce(max(sort_order), -1) + 1 from editorial_items)
      )
      returning id
    `;
    if (!inserted[0]) return fail(500, "No se pudo crear el \xEDtem");
    const rows = await selectSql(db, inserted[0].id);
    return json(toRecord(rows[0], true));
  }),
  route("PUT", "/api/editorial/:id", async ({ request, params }) => {
    if (!await isAuthed(request)) return unauthorized();
    if (!isUuid(params.id ?? "")) return fail(400, "Id inv\xE1lido");
    if (!hasDatabase()) return fail(503, "Falta DATABASE_URL");
    const body = await readJson(request);
    const title = asText(body.title);
    if (!title) return fail(400, "El t\xEDtulo es obligatorio");
    const coverMediaId = coverIdFrom(body.coverMediaId);
    if (coverMediaId === void 0) return fail(400, "coverMediaId inv\xE1lido");
    const db = sql();
    const updated = await db`
      update editorial_items
      set
        title = ${title},
        excerpt = ${asText(body.excerpt)},
        body = ${asText(body.body)},
        cover_media_id = ${coverMediaId}
      where id = ${params.id}
      returning id
    `;
    if (!updated[0]) return notFound();
    const rows = await selectSql(db, params.id);
    return json(toRecord(rows[0], true));
  }),
  route("POST", "/api/editorial/:id/move", async ({ request, params }) => {
    if (!await isAuthed(request)) return unauthorized();
    if (!isUuid(params.id ?? "")) return fail(400, "Id inv\xE1lido");
    if (!hasDatabase()) return fail(503, "Falta DATABASE_URL");
    const payload = await readJson(request);
    const dir = asText(payload.dir);
    if (dir !== "up" && dir !== "down") return fail(400, "dir tiene que ser up o down");
    const db = sql();
    const list = await db`
      select id, sort_order from editorial_items
      order by sort_order, created_at desc
    `;
    const index = list.findIndex((row) => row.id === params.id);
    if (index < 0) return notFound();
    const swapWith = dir === "up" ? index - 1 : index + 1;
    const a = list[index];
    const b = list[swapWith];
    if (!b) return json({ ok: true });
    await db`
      update editorial_items
      set sort_order = case
        when id = ${a.id} then ${b.sort_order}
        when id = ${b.id} then ${a.sort_order}
      end
      where id = ${a.id} or id = ${b.id}
    `;
    return json({ ok: true });
  }),
  route("DELETE", "/api/editorial/:id", async ({ request, params }) => {
    if (!await isAuthed(request)) return unauthorized();
    if (!isUuid(params.id ?? "")) return fail(400, "Id inv\xE1lido");
    if (!hasDatabase()) return fail(503, "Falta DATABASE_URL");
    const db = sql();
    const rows = await db`
      delete from editorial_items where id = ${params.id} returning id
    `;
    if (!rows[0]) return notFound();
    return json({ ok: true });
  })
];

// src/core/images/readImageSize.ts
function u16be(body, i) {
  return body[i] << 8 | body[i + 1];
}
function u32be(body, i) {
  return (body[i] << 24 | body[i + 1] << 16 | body[i + 2] << 8 | body[i + 3]) >>> 0;
}
function u16le(body, i) {
  return body[i] | body[i + 1] << 8;
}
function u32le(body, i) {
  return (body[i] | body[i + 1] << 8 | body[i + 2] << 16 | body[i + 3] << 24) >>> 0;
}
function u24le(body, i) {
  return body[i] | body[i + 1] << 8 | body[i + 2] << 16;
}
function fourcc(body, i) {
  return String.fromCharCode(body[i], body[i + 1], body[i + 2], body[i + 3]);
}
function jpegOrientation(body) {
  let i = 2;
  while (i + 4 < body.length) {
    if (body[i] !== 255) break;
    while (i < body.length && body[i] === 255) i += 1;
    const marker = body[i++];
    if (marker === void 0 || marker === 218 || marker === 217) break;
    if (marker >= 208 && marker <= 215) continue;
    if (i + 2 > body.length) break;
    const len = u16be(body, i);
    if (len < 2) break;
    if (marker === 225 && i + len <= body.length) {
      const start = i + 2;
      if (body[start] === 69 && body[start + 1] === 120 && body[start + 2] === 105 && body[start + 3] === 102 && body[start + 4] === 0 && body[start + 5] === 0) {
        const value = tiffOrientation(body, start + 6, i + len);
        if (value) return value;
      }
    }
    i += len;
  }
  return 1;
}
function tiffOrientation(body, offset, end) {
  if (offset + 8 > end) return 0;
  const le = body[offset] === 73 && body[offset + 1] === 73;
  const be = body[offset] === 77 && body[offset + 1] === 77;
  if (!le && !be) return 0;
  const read16 = (i) => le ? u16le(body, i) : u16be(body, i);
  const read32 = (i) => le ? u32le(body, i) : u32be(body, i);
  const ifd = offset + read32(offset + 4);
  if (ifd + 2 > end) return 0;
  const count = read16(ifd);
  for (let n = 0; n < count; n += 1) {
    const entry = ifd + 2 + n * 12;
    if (entry + 12 > end) break;
    if (read16(entry) === 274) {
      const value = read16(entry + 8);
      if (value >= 1 && value <= 8) return value;
    }
  }
  return 0;
}
function jpegSize(body) {
  let i = 2;
  while (i + 8 < body.length) {
    if (body[i] !== 255) {
      i += 1;
      continue;
    }
    while (i < body.length && body[i] === 255) i += 1;
    const marker = body[i++];
    if (marker === void 0 || marker === 218 || marker === 217) break;
    if (marker >= 208 && marker <= 215) continue;
    if (i + 2 > body.length) break;
    const len = u16be(body, i);
    if (len < 2) return null;
    const sof = marker >= 192 && marker <= 207 && marker !== 196 && marker !== 200 && marker !== 204;
    if (sof && i + 7 < body.length) {
      const h = u16be(body, i + 3);
      const w = u16be(body, i + 5);
      if (w < 1 || h < 1) return null;
      return { w, h, orientation: jpegOrientation(body) };
    }
    i += len;
  }
  return null;
}
function pngSize(body) {
  if (body.length < 24) return null;
  if (fourcc(body, 12) !== "IHDR") return null;
  const w = u32be(body, 16);
  const h = u32be(body, 20);
  if (w < 1 || h < 1) return null;
  return { w, h, orientation: 1 };
}
function webpSize(body) {
  let offset = 12;
  while (offset + 8 <= body.length) {
    const kind = fourcc(body, offset);
    const size = u32le(body, offset + 4);
    const data = offset + 8;
    if (kind === "VP8X" && data + 10 <= body.length) {
      const w = u24le(body, data + 4) + 1;
      const h = u24le(body, data + 7) + 1;
      if (w < 1 || h < 1) return null;
      return { w, h, orientation: 1 };
    }
    if (kind === "VP8 " && data + 10 <= body.length) {
      if (body[data + 3] === 157 && body[data + 4] === 1 && body[data + 5] === 42) {
        const w = u16le(body, data + 6) & 16383;
        const h = u16le(body, data + 8) & 16383;
        if (w < 1 || h < 1) return null;
        return { w, h, orientation: 1 };
      }
    }
    if (kind === "VP8L" && data + 5 <= body.length && body[data] === 47) {
      const bits = u32le(body, data + 1);
      const w = (bits & 16383) + 1;
      const h = (bits >> 14 & 16383) + 1;
      if (w < 1 || h < 1) return null;
      return { w, h, orientation: 1 };
    }
    offset += 8 + size + (size & 1);
  }
  return null;
}
function readImageSize(body) {
  if (body.length < 12) return null;
  if (body[0] === 255 && body[1] === 216) return jpegSize(body);
  if (body[0] === 137 && body[1] === 80 && body[2] === 78 && body[3] === 71) {
    return pngSize(body);
  }
  if (body[0] === 82 && body[1] === 73 && body[2] === 70 && body[3] === 70 && body[8] === 87 && body[9] === 69 && body[10] === 66 && body[11] === 80) {
    return webpSize(body);
  }
  return null;
}

// server/core/media-keys.ts
function r2KeysOf(r2Key, variants) {
  const keys = /* @__PURE__ */ new Set();
  if (r2Key) keys.add(r2Key);
  if (variants && typeof variants === "object" && variants !== null && "widths" in variants) {
    const widths = variants.widths;
    if (Array.isArray(widths)) {
      for (const item of widths) {
        if (item && typeof item === "object" && "key" in item && typeof item.key === "string" && item.key) {
          keys.add(item.key);
        }
      }
    }
  }
  return [...keys];
}

// server/core/r2.ts
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
function r2Client() {
  if (!hasR2()) throw new Error("Faltan variables de R2");
  const accountId = requireEnv("R2_ACCOUNT_ID");
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY")
    }
  });
}
function publicUrlFor(key) {
  const base = requireEnv("R2_PUBLIC_BASE_URL").replace(/\/$/, "");
  return `${base}/${key}`;
}
async function uploadToR2(key, body, contentType) {
  const client = r2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: requireEnv("R2_BUCKET"),
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable"
    })
  );
  return publicUrlFor(key);
}
async function deleteFromR2(key) {
  const client = r2Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: requireEnv("R2_BUCKET"),
      Key: key
    })
  );
}

// server/core/sniff-image.ts
function sniffImage(body) {
  if (body.length < 12) return null;
  if (body[0] === 255 && body[1] === 216) return { mime: "image/jpeg", format: "jpeg" };
  if (body[0] === 82 && body[1] === 73 && body[2] === 70 && body[3] === 70 && body[8] === 87 && body[9] === 69 && body[10] === 66 && body[11] === 80) {
    return { mime: "image/webp", format: "webp" };
  }
  return null;
}

// server/core/routes/media.ts
var MAX_VARIANTS = 4;
var MAX_LONG_SIDE = 3e3;
var MAX_FILE_BYTES = 25e5;
var MAX_TOTAL_BYTES = 4e6;
var DIM_SLACK = 2;
function toRecord2(row) {
  return {
    id: row.id,
    url: row.url,
    width: row.width,
    height: row.height,
    mime: row.mime,
    variants: row.variants ?? {},
    createdAt: row.created_at
  };
}
var mediaRoutes = [
  route("GET", "/api/media", async ({ request }) => {
    if (!await isAuthed(request)) return unauthorized();
    if (!hasDatabase()) return fail(503, "Falta DATABASE_URL");
    const db = sql();
    const rows = await db`
      select id, url, width, height, mime, variants, created_at
      from media
      order by created_at desc
      limit 60
    `;
    return json({ items: rows.map(toRecord2) });
  }),
  route("GET", "/api/media/:id", async ({ params }) => {
    if (!isUuid(params.id ?? "")) return fail(400, "Id inv\xE1lido");
    if (!hasDatabase()) return fail(503, "Falta DATABASE_URL");
    const db = sql();
    const rows = await db`
      select id, url, width, height, mime, variants, created_at
      from media
      where id = ${params.id}
    `;
    if (!rows[0]) return notFound();
    return json(toRecord2(rows[0]));
  }),
  route("POST", "/api/media", async ({ request }) => {
    if (!await isAuthed(request)) return unauthorized();
    if (!hasDatabase()) return fail(503, "Falta DATABASE_URL");
    if (!hasR2()) {
      return fail(503, "Faltan variables de R2 (incluye R2_PUBLIC_BASE_URL)");
    }
    const form = await request.formData().catch(() => null);
    if (!form) return fail(400, "Se espera multipart/form-data");
    const files = form.getAll("variant").filter((item) => item instanceof File);
    const metaRaw = form.get("meta");
    let meta = {};
    if (typeof metaRaw === "string") {
      try {
        meta = JSON.parse(metaRaw);
      } catch {
        return fail(400, "meta no es JSON");
      }
    }
    if (files.length < 1 || files.length > MAX_VARIANTS) {
      return fail(400, `Mand\xE1 entre 1 y ${MAX_VARIANTS} variantes`);
    }
    if (!meta.widths || meta.widths.length !== files.length) {
      return fail(400, "meta.widths tiene que coincidir con las variantes");
    }
    const declared = meta.format === "jpeg" ? "jpeg" : meta.format === "webp" ? "webp" : null;
    if (!declared) return fail(400, "meta.format tiene que ser webp o jpeg");
    let total = 0;
    const decoded = [];
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const w = Number(meta.widths[i]?.w);
      const h = Number(meta.widths[i]?.h);
      if (!Number.isFinite(w) || !Number.isFinite(h) || w < 1 || h < 1) {
        return fail(400, "Dimensiones inv\xE1lidas");
      }
      if (Math.max(w, h) > MAX_LONG_SIDE) return fail(400, "Variante demasiado grande");
      const body = Buffer.from(await file.arrayBuffer());
      total += body.length;
      if (body.length > MAX_FILE_BYTES) return fail(413, "Una variante pesa demasiado");
      const sniff = sniffImage(body);
      if (!sniff) return fail(400, "Solo se aceptan JPEG o WebP");
      if (sniff.format !== declared) {
        return fail(400, `La variante no es ${declared}`);
      }
      const pixels = readImageSize(body);
      if (!pixels) return fail(400, "No se pudieron leer las dimensiones del archivo");
      if (Math.max(pixels.w, pixels.h) > MAX_LONG_SIDE) {
        return fail(400, "Variante demasiado grande");
      }
      if (Math.abs(pixels.w - w) > DIM_SLACK || Math.abs(pixels.h - h) > DIM_SLACK) {
        return fail(400, "Las dimensiones no coinciden con el archivo");
      }
      decoded.push({
        body,
        w: pixels.w,
        h: pixels.h,
        mime: sniff.mime,
        ext: sniff.format === "webp" ? "webp" : "jpg"
      });
    }
    if (total > MAX_TOTAL_BYTES) return fail(413, "El lote de variantes pesa demasiado");
    decoded.sort((a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h));
    const id = crypto.randomUUID();
    const widths = [];
    const uploaded = [];
    try {
      for (const item of decoded) {
        const key = `media/${id}/${Math.max(item.w, item.h)}.${item.ext}`;
        const url = await uploadToR2(key, item.body, item.mime);
        uploaded.push(key);
        widths.push({ w: item.w, h: item.h, key, url });
      }
      const largest = widths[0];
      const variants = { format: declared, widths };
      const db = sql();
      const rows = await db`
        insert into media (id, r2_key, url, width, height, mime, variants)
        values (
          ${id},
          ${largest.key},
          ${largest.url},
          ${largest.w},
          ${largest.h},
          ${decoded[0].mime},
          ${JSON.stringify(variants)}::jsonb
        )
        returning id, url, width, height, mime, variants, created_at
      `;
      return json(toRecord2(rows[0]));
    } catch {
      await Promise.allSettled(uploaded.map((key) => deleteFromR2(key)));
      return fail(500, "No se pudo guardar la imagen");
    }
  }),
  route("DELETE", "/api/media/:id", async ({ request, params }) => {
    if (!await isAuthed(request)) return unauthorized();
    if (!isUuid(params.id ?? "")) return fail(400, "Id inv\xE1lido");
    if (!hasDatabase()) return fail(503, "Falta DATABASE_URL");
    const db = sql();
    const rows = await db`
      delete from media
      where id = ${params.id}
      returning r2_key, variants
    `;
    if (!rows[0]) return notFound();
    if (hasR2()) {
      const keys = r2KeysOf(rows[0].r2_key, rows[0].variants);
      const deleted = await Promise.allSettled(keys.map((key) => deleteFromR2(key)));
      if (deleted.some((item) => item.status === "rejected")) {
        return fail(500, "Se borr\xF3 el registro pero fall\xF3 borrar un archivo en R2");
      }
    }
    return json({ ok: true });
  })
];

// server/core/page-slug.ts
function isPageSlug(value) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 64;
}

// server/core/routes/pages.ts
function imageOf(row) {
  if (!row.image_media_id || !row.image_url) return null;
  return {
    id: row.image_media_id,
    url: row.image_url,
    width: row.image_width,
    height: row.image_height,
    mime: row.image_mime,
    variants: row.image_variants ?? {}
  };
}
function toRecord3(row) {
  return {
    slug: row.slug,
    title: row.title,
    body: row.body,
    image: imageOf(row),
    updatedAt: row.updated_at
  };
}
function imageIdFrom(raw) {
  const value = asText(raw);
  if (!value) return null;
  if (!isUuid(value)) return void 0;
  return value;
}
async function loadPage(slug) {
  const db = sql();
  return await db`
    select
      p.slug, p.title, p.body, p.image_media_id, p.updated_at,
      m.url as image_url, m.width as image_width, m.height as image_height,
      m.mime as image_mime, m.variants as image_variants
    from pages p
    left join media m on m.id = p.image_media_id
    where p.slug = ${slug}
  `;
}
var pageRoutes = [
  route("GET", "/api/pages/:slug", async ({ params }) => {
    const slug = params.slug ?? "";
    if (!isPageSlug(slug)) return fail(400, "Slug inv\xE1lido");
    if (!hasDatabase()) return fail(503, "Falta DATABASE_URL");
    const rows = await loadPage(slug);
    if (!rows[0]) return notFound();
    return json(toRecord3(rows[0]));
  }),
  route("PUT", "/api/pages/:slug", async ({ request, params }) => {
    if (!await isAuthed(request)) return unauthorized();
    const slug = params.slug ?? "";
    if (!isPageSlug(slug)) return fail(400, "Slug inv\xE1lido");
    if (!hasDatabase()) return fail(503, "Falta DATABASE_URL");
    const body = await readJson(
      request
    );
    const imageMediaId = imageIdFrom(body.imageMediaId);
    if (imageMediaId === void 0) return fail(400, "imageMediaId inv\xE1lido");
    const db = sql();
    await db`
      insert into pages (slug, title, body, image_media_id, updated_at)
      values (${slug}, ${asText(body.title)}, ${asText(body.body)}, ${imageMediaId}, now())
      on conflict (slug) do update set
        title = excluded.title,
        body = excluded.body,
        image_media_id = excluded.image_media_id,
        updated_at = now()
    `;
    const rows = await loadPage(slug);
    if (!rows[0]) return fail(500, "No se pudo guardar la p\xE1gina");
    return json(toRecord3(rows[0]));
  })
];

// server/core/index.ts
var routes = [
  ...authRoutes,
  ...mediaRoutes,
  ...editorialRoutes,
  ...pageRoutes,
  ...canvasRoutes
];
var handle = createRouter(routes);
async function core(request) {
  try {
    return await handle(request);
  } catch (error) {
    console.error("[api]", error);
    return Response.json({ error: "Error de servidor" }, { status: 500 });
  }
}

// server/vercel-entry.ts
var vercel_entry_default = {
  fetch: async (request) => {
    try {
      const response = await core(request);
      const out = new Response(response.body, response);
      out.headers.set("x-studio-adapter", "vercel");
      return out;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error de servidor";
      return Response.json({ error: message }, { status: 500 });
    }
  }
};
export {
  vercel_entry_default as default
};
