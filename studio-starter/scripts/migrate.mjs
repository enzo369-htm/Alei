import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'
import { splitSqlStatements } from './sql-statements.mjs'

/**
 * Corre las migraciones de `db/` en orden alfabético y anota lo aplicado en
 * `_migrations`, así correrlo dos veces no hace nada la segunda.
 *
 * Para agregar una tabla, agregá un archivo `db/0NN_lo_que_sea.sql`. No hay lista
 * de archivos que mantener acá.
 */

function loadDotEnv() {
  const path = new URL('../.env', import.meta.url)
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

loadDotEnv()

if (!process.env.DATABASE_URL) {
  console.error('Falta DATABASE_URL. Copiá .env.example a .env y completalo.')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)

await sql`
  create table if not exists _migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )
`

const applied = new Set(
  (await sql`select name from _migrations`).map((row) => row.name),
)

const dir = new URL('../db/', import.meta.url)
const files = readdirSync(dir)
  .filter((name) => name.endsWith('.sql'))
  .sort()

let ran = 0

for (const file of files) {
  if (applied.has(file)) {
    console.log('ya aplicada:', file)
    continue
  }

  const contents = readFileSync(new URL(file, dir), 'utf8')

  const statements = splitSqlStatements(contents)

  for (const statement of statements) {
    await sql.query(statement)
  }

  await sql`insert into _migrations (name) values (${file})`
  console.log('aplicada:', file, `(${statements.length} sentencias)`)
  ran += 1
}

console.log(ran === 0 ? 'Nada nuevo por aplicar.' : `Listo: ${ran} migración(es).`)
