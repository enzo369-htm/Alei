import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { splitSqlStatements } from './sql-statements.mjs'

test('001_engine.sql no pierde CREATE TABLE media por los comentarios de encabezado', () => {
  const sql = readFileSync(new URL('../db/001_engine.sql', import.meta.url), 'utf8')
  const statements = splitSqlStatements(sql)
  const joined = statements.join('\n').toLowerCase()

  assert.equal(statements.length, 3, statements)
  assert.match(joined, /create extension if not exists pgcrypto/)
  assert.match(joined, /create table if not exists media/)
  assert.match(joined, /create index if not exists media_created_at_idx/)
  assert.ok(
    statements.every((s) => !s.trim().startsWith('--')),
    'no debe quedar un chunk que sea solo comentario',
  )
})

test('002_editorial.sql crea editorial_items', () => {
  const sql = readFileSync(new URL('../db/002_editorial.sql', import.meta.url), 'utf8')
  const statements = splitSqlStatements(sql)
  const joined = statements.join('\n').toLowerCase()
  assert.match(joined, /create table if not exists editorial_items/)
  assert.match(joined, /cover_media_id/)
  assert.equal(statements.length, 2, statements)
})

test('003_pages.sql crea pages', () => {
  const sql = readFileSync(new URL('../db/003_pages.sql', import.meta.url), 'utf8')
  const statements = splitSqlStatements(sql)
  const joined = statements.join('\n').toLowerCase()
  assert.match(joined, /create table if not exists pages/)
  assert.match(joined, /slug text primary key/)
  assert.equal(statements.length, 1, statements)
})

test('004_canvas.sql y el molde del módulo son el mismo SQL', () => {
  const applied = readFileSync(new URL('../db/004_canvas.sql', import.meta.url), 'utf8')
  const mold = readFileSync(new URL('../modules/free-canvas/sql/001_canvas.sql', import.meta.url), 'utf8')
  assert.equal(applied, mold)
})

test('004_canvas.sql crea canvases y placements', () => {
  const sql = readFileSync(new URL('../db/004_canvas.sql', import.meta.url), 'utf8')
  const statements = splitSqlStatements(sql)
  const joined = statements.join('\n').toLowerCase()
  assert.match(joined, /create table if not exists canvases/)
  assert.match(joined, /create table if not exists canvas_placements/)
  assert.match(joined, /height_ratio/)
  assert.equal(statements.length, 3, statements)
})
