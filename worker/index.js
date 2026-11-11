const COOKIE = 'crm_s'
const SESSION_MS = 30 * 24 * 3600 * 1000
const MAX_WORKSPACE_BYTES = 10 * 1024 * 1024
const MAX_ATTACHMENT_BYTES = 24 * 1024 * 1024
const WORKSPACE_KEY = 'workspace'
const ATTACHMENT_PREFIX = 'att:'
const ATTACHMENT_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type': 'application/json;charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

async function sha256(text) {
  const buffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text),
  )
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function base64Url(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function sign(secret, data) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(data),
  )
  return base64Url(new Uint8Array(signature))
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index)
  }
  return diff === 0
}

async function sameSecret(a, b) {
  const [left, right] = await Promise.all([sha256(String(a)), sha256(String(b))])
  return safeEqual(left, right)
}

const FAILS = new Map()
const MAX_FAILS = 10
const LOCK_MS = 10 * 60 * 1000

function clientIp(request) {
  return request.headers.get('CF-Connecting-IP') || 'unknown'
}

function getCookie(request, name) {
  const raw = request.headers.get('Cookie') || ''
  for (const part of raw.split(';')) {
    const separator = part.indexOf('=')
    if (separator < 0) continue
    if (part.slice(0, separator).trim() === name) {
      return decodeURIComponent(part.slice(separator + 1).trim())
    }
  }
  return ''
}

async function isAuthorized(request, env) {
  const cookie = getCookie(request, COOKIE)
  const dot = cookie.indexOf('.')
  if (dot <= 0 || !env.AUTH_SECRET) return false
  const payload = cookie.slice(0, dot)
  const signature = cookie.slice(dot + 1)
  const expected = await sign(env.AUTH_SECRET, payload)
  return safeEqual(signature, expected) && Number(payload) > Date.now()
}

function safeNext(next) {
  return typeof next === 'string' &&
    next.startsWith('/') &&
    !next.startsWith('//')
    ? next
    : '/'
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return map[character]
  })
}

function loginPage(error, next) {
  const html = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>见微 · 登录</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
       background:#f3f1ea;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:#1f2d29}
  .box{width:min(92vw,380px);background:#fffdf8;border-radius:16px;padding:30px 26px 24px;
       box-shadow:0 12px 34px rgba(31,45,41,.12)}
  .brand{font-size:12px;letter-spacing:.18em;color:#b0783f;text-transform:uppercase;margin:0 0 6px}
  h1{margin:0 0 6px;font-size:22px;color:#2f6a58}
  p.sub{margin:0 0 20px;font-size:13.5px;color:#6b7c76}
  label{display:block;font-size:13.5px;color:#5b6b66;margin-bottom:6px}
  input{width:100%;padding:11px 13px;font-size:16px;border:1px solid #d8d2c4;border-radius:9px;outline:none;background:#fff}
  input:focus{border-color:#2f6a58;box-shadow:0 0 0 3px rgba(47,106,88,.13)}
  button{width:100%;margin-top:18px;padding:12px;font-size:15px;border:0;border-radius:9px;
         background:#2f6a58;color:#fff;cursor:pointer}
  button:hover{background:#275a4b}
  .err{margin:0 0 14px;padding:9px 11px;border-radius:9px;background:#fdf1ef;color:#b4432a;font-size:13.5px}
</style></head>
<body><form class="box" method="POST" action="/login">
  <p class="brand">Private Archive</p>
  <h1>见微 · 人脉档案</h1>
  <p class="sub">这是私人档案，需要密码才能进入。</p>
  ${error ? `<p class="err">${escapeHtml(error)}</p>` : ''}
  <label for="password">密码</label>
  <input id="password" name="password" type="password" autocomplete="current-password" autofocus required>
  <input type="hidden" name="next" value="${escapeHtml(next)}">
  <button type="submit">进入</button>
</form></body></html>`
  return new Response(html, {
    status: error ? 401 : 200,
    headers: {
      'content-type': 'text/html;charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

function sessionCookie(url, value, maxAgeSeconds) {
  const secure = url.protocol === 'https:' ? '; Secure' : ''
  return `${COOKIE}=${value}; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=${maxAgeSeconds}`
}

function withSecurityHeaders(response) {
  const headers = new Headers(response.headers)
  headers.set('X-Robots-Tag', 'noindex, nofollow')
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('Referrer-Policy', 'no-referrer')
  headers.set('X-Frame-Options', 'DENY')
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

async function readWorkspace(env) {
  const stored = await env.WORKSPACE.getWithMetadata(WORKSPACE_KEY, 'text')
  if (stored.value === null) return null
  return { text: stored.value, meta: stored.metadata || {} }
}

async function writeWorkspace(env, request) {
  const contentLength = Number(request.headers.get('Content-Length') || '0')
  if (contentLength > MAX_WORKSPACE_BYTES) return json({ error: '档案过大' }, 413)
  const body = await request.text()
  if (body.length > MAX_WORKSPACE_BYTES) return json({ error: '档案过大' }, 413)
  try {
    JSON.parse(body)
  } catch {
    return json({ error: '档案格式无效' }, 400)
  }
  const updatedAt = Date.now()
  const hash = await sha256(body)
  await env.WORKSPACE.put(WORKSPACE_KEY, body, {
    metadata: { updatedAt, hash },
  })
  return json({ ok: true, updatedAt, hash })
}

async function readAttachment(env, name) {
  if (!ATTACHMENT_RE.test(name)) return json({ error: '文件名无效' }, 400)
  const stored = await env.WORKSPACE.getWithMetadata(
    ATTACHMENT_PREFIX + name,
    'arrayBuffer',
  )
  if (stored.value === null) return json({ error: '附件不存在' }, 404)
  const meta = stored.metadata || {}
  return new Response(stored.value, {
    headers: {
      'content-type': meta.type || 'application/octet-stream',
      'content-disposition': `inline; filename*=UTF-8''${encodeURIComponent(
        meta.name || name,
      )}`,
      'cache-control': 'private, max-age=3600',
    },
  })
}

async function writeAttachment(env, request, name) {
  if (!ATTACHMENT_RE.test(name)) return json({ error: '文件名无效' }, 400)
  const contentLength = Number(request.headers.get('Content-Length') || '0')
  if (contentLength > MAX_ATTACHMENT_BYTES) {
    return json({ error: '附件超过 24MB' }, 413)
  }
  const body = await request.arrayBuffer()
  if (body.byteLength > MAX_ATTACHMENT_BYTES) {
    return json({ error: '附件超过 24MB' }, 413)
  }
  await env.WORKSPACE.put(ATTACHMENT_PREFIX + name, body, {
    metadata: {
      type: request.headers.get('Content-Type') || 'application/octet-stream',
      name,
    },
  })
  return json({ ok: true, path: `attachments/${name}` })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname === '/login') {
      if (request.method === 'POST') {
        let form
        try {
          form = await request.formData()
        } catch {
          return loginPage('提交失败，请重试', '/')
        }
        const password = String(form.get('password') || '')
        const next = safeNext(String(form.get('next') || '/'))
        if (!env.SITE_PASSWORD) return loginPage('站点还没有设置密码', next)

        const ip = clientIp(request)
        const now = Date.now()
        const record = FAILS.get(ip)
        if (record && record.until > now) {
          return loginPage('尝试次数过多，请 10 分钟后再试', next)
        }
        if (!(await sameSecret(password, env.SITE_PASSWORD))) {
          const count = (record && record.n ? record.n : 0) + 1
          if (FAILS.size > 5000) FAILS.clear()
          FAILS.set(ip, {
            n: count,
            until: count >= MAX_FAILS ? now + LOCK_MS : 0,
          })
          await new Promise((resolve) => setTimeout(resolve, 600))
          return loginPage('密码不对', next)
        }
        FAILS.delete(ip)
        const payload = String(Date.now() + SESSION_MS)
        const signature = await sign(env.AUTH_SECRET || '', payload)
        return new Response(null, {
          status: 303,
          headers: {
            location: next,
            'set-cookie': sessionCookie(
              url,
              `${payload}.${signature}`,
              SESSION_MS / 1000,
            ),
            'cache-control': 'no-store',
          },
        })
      }
      if (await isAuthorized(request, env)) {
        return Response.redirect(
          url.origin + safeNext(url.searchParams.get('next')),
          302,
        )
      }
      return loginPage('', safeNext(url.searchParams.get('next')))
    }

    if (url.pathname === '/logout') {
      return new Response(null, {
        status: 303,
        headers: {
          location: '/login',
          'set-cookie': sessionCookie(url, '', 0),
          'cache-control': 'no-store',
        },
      })
    }

    if (!(await isAuthorized(request, env))) {
      if (url.pathname.startsWith('/api/')) {
        return withSecurityHeaders(json({ error: 'unauthorized' }, 401))
      }
      const next = encodeURIComponent(url.pathname + url.search)
      return Response.redirect(`${url.origin}/login?next=${next}`, 302)
    }

    if (!url.pathname.startsWith('/api/')) {
      const response = await env.ASSETS.fetch(request)
      if (url.pathname === '/' || url.pathname.endsWith('.html')) {
        const headers = new Headers(response.headers)
        headers.set('cache-control', 'no-cache')
        return withSecurityHeaders(
          new Response(response.body, {
            status: response.status,
            headers,
          }),
        )
      }
      return withSecurityHeaders(response)
    }

    try {
      if (url.pathname === '/api/health') {
        if (request.method !== 'GET') return json({ error: 'method' }, 405)
        return withSecurityHeaders(json({ ok: true }))
      }

      if (url.pathname === '/api/workspace') {
        if (request.method === 'GET') {
          const stored = await readWorkspace(env)
          if (!stored) return json({ error: 'not found' }, 404)
          return withSecurityHeaders(
            new Response(stored.text, {
              headers: {
                'content-type': 'application/json;charset=utf-8',
                'cache-control': 'no-store',
                'x-updated-at': String(stored.meta.updatedAt || ''),
              },
            }),
          )
        }
        if (request.method === 'PUT') {
          return withSecurityHeaders(await writeWorkspace(env, request))
        }
        return json({ error: 'method' }, 405)
      }

      const attachmentMatch = url.pathname.match(
        /^\/api\/attachments\/([^/]+)$/,
      )
      if (attachmentMatch) {
        const name = decodeURIComponent(attachmentMatch[1])
        if (request.method === 'GET') {
          return withSecurityHeaders(await readAttachment(env, name))
        }
        if (request.method === 'POST' || request.method === 'PUT') {
          return withSecurityHeaders(
            await writeAttachment(env, request, name),
          )
        }
        return json({ error: 'method' }, 405)
      }

      return json({ error: 'not found' }, 404)
    } catch (cause) {
      return json(
        {
          error: 'server error',
          detail: String((cause && cause.message) || cause),
        },
        500,
      )
    }
  },
}
