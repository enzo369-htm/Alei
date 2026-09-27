/**
 * Gate de deploy: el rewrite de Vercel tiene que entregar JSON del core, no el SPA.
 *
 *   ORIGIN=https://el-dominio.vercel.app npm run smoke:api
 *
 * Sin ORIGIN sale 2 (mal uso). Si /api no es JSON, sale 1.
 */

export async function runSmoke(origin) {
  const base = origin.replace(/\/$/, '')
  const logs = []
  let passed = true

  async function check(name, path, assertFn) {
    const url = `${base}${path}`
    const res = await fetch(url, { redirect: 'manual' })
    const type = res.headers.get('content-type') || ''
    const text = await res.text()
    let json = null
    try {
      json = JSON.parse(text)
    } catch {
      json = null
    }
    const err = assertFn({ res, type, text, json })
    if (err) {
      logs.push(`FAIL ${name}: ${err}`)
      logs.push(`  ${res.status} ${type}`)
      logs.push(`  ${text.slice(0, 200)}`)
      passed = false
      return
    }
    logs.push(`ok  ${name}`)
  }

  await check('GET /api/auth/me', '/api/auth/me', ({ res, type, json }) => {
    if (!type.includes('json')) return 'no es JSON: el SPA se comió /api o la función no existe'
    if (res.status !== 200) return `status ${res.status}`
    if (typeof json?.ok !== 'boolean') return 'falta { ok: boolean }'
    return null
  })

  await check('GET /api/no-existe', '/api/no-existe', ({ res, type, json }) => {
    if (!type.includes('json')) return 'no es JSON'
    if (res.status !== 404) return `status ${res.status}`
    if (json?.error !== 'No encontrado') return 'no es el 404 del core'
    return null
  })

  return { ok: passed, logs }
}

const invoked = process.argv[1] && process.argv[1].endsWith('smoke-api.mjs')
if (invoked && !process.env.STUDIO_SMOKE_AS_LIB) {
  const origin = (process.env.ORIGIN || process.argv[2] || '').replace(/\/$/, '')
  if (!origin) {
    console.error('Usá: ORIGIN=https://EL-DOMINIO npm run smoke:api')
    process.exit(2)
  }
  const result = await runSmoke(origin)
  for (const line of result.logs) {
    if (line.startsWith('FAIL') || line.startsWith('  ')) console.error(line)
    else console.log(line)
  }
  if (!result.ok) {
    console.error('smoke:api falló. No agregues secciones. Ver docs/first-deploy-rewrite.md')
    process.exit(1)
  }
  console.log('smoke:api ok')
}
