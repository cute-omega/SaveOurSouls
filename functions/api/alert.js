/**
 * Cloudflare Pages Function: POST /api/alert
 * - Auth: optional Bearer token via env.RELAY_TOKEN
 * - Sends email through MailChannels (Workers native partner)
 * - CORS enabled
 */

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

function jsonResponse(status, data, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json;charset=UTF-8', ...corsHeaders(origin) },
  })
}

export const onRequestOptions = async ({ request, env }) => {
  const origin = request.headers.get('Origin')
  return new Response(null, { status: 204, headers: corsHeaders(origin) })
}

export const onRequestPost = async ({ request, env }) => {
  const origin = request.headers.get('Origin')
  try {
    // Auth (optional but recommended)
    const requiredToken = env.RELAY_TOKEN || ''
    if (requiredToken) {
      const auth = request.headers.get('Authorization') || ''
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
      if (!token || token !== requiredToken) {
        return jsonResponse(401, { error: 'Unauthorized' }, origin)
      }
    }

    const body = await request.json()
    const { reason, when, contacts, message = '', includeScheduleInAlert = true, schedules = [] } = body || {}

    const emails = (contacts || [])
      .filter(c => c && c.type === 'email' && typeof c.value === 'string')
      .map(c => c.value.trim())
      .filter(Boolean)

    if (!emails.length) {
      return jsonResponse(400, { error: 'No email recipients' }, origin)
    }

    const fromEmail = env.MAIL_FROM || `noreply@${(env.SENDER_DOMAIN || 'example.com')}`
    const fromName = env.MAIL_FROM_NAME || 'Save Our Souls'
    const subject = env.MAIL_SUBJECT || 'SOS 警报：需要紧急关注'

    const contentText = buildText(reason, when, message, includeScheduleInAlert, schedules)
    const contentHtml = buildHtml(reason, when, message, includeScheduleInAlert, schedules)

    const mailPayload = {
      personalizations: [
        {
          to: emails.map(e => ({ email: e })),
          ...(env.DKIM_DOMAIN && env.DKIM_SELECTOR && env.DKIM_PRIVATE_KEY
            ? {
              dkim_domain: env.DKIM_DOMAIN,
              dkim_selector: env.DKIM_SELECTOR,
              dkim_private_key: env.DKIM_PRIVATE_KEY,
            }
            : {}),
        },
      ],
      from: { email: fromEmail, name: fromName },
      subject,
      content: [
        { type: 'text/plain', value: contentText },
        { type: 'text/html', value: contentHtml },
      ],
    }

    const resp = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(mailPayload),
    })

    if (!resp.ok) {
      const t = await resp.text()
      return jsonResponse(resp.status, { error: 'Mail send failed', detail: t }, origin)
    }

    return jsonResponse(200, { ok: true }, origin)
  } catch (e) {
    return jsonResponse(500, { error: 'Server error', detail: String(e) }, origin)
  }
}

function escHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function buildText(reason, when, message, include, schedules) {
  let lines = []
  lines.push(`触发原因: ${reason || '未知'}`)
  lines.push(`触发时间: ${when || new Date().toISOString()}`)
  if (message) {
    lines.push('—— 预设信息 ——')
    lines.push(message)
  }
  if (include && Array.isArray(schedules)) {
    lines.push('—— 风险日程 ——')
    schedules.forEach((s, i) => {
      lines.push(`${i + 1}. ${s.title || '未命名'} / 截止: ${s.lastSafeDeadline || ''}`)
      if (s.location) lines.push(`   地点: ${s.location}`)
      if (s.people) lines.push(`   人物: ${s.people}`)
      if (s.notes) lines.push(`   备注: ${s.notes}`)
    })
  }
  return lines.join('\n')
}

function buildHtml(reason, when, message, include, schedules) {
  const rows = []
  rows.push(`<p><strong>触发原因:</strong> ${escHtml(reason || '未知')}</p>`)
  rows.push(`<p><strong>触发时间:</strong> ${escHtml(when || new Date().toISOString())}</p>`)
  if (message) {
    rows.push('<hr /><p><strong>预设信息</strong></p>')
    rows.push(`<pre style="white-space: pre-wrap;">${escHtml(message)}</pre>`)
  }
  if (include && Array.isArray(schedules) && schedules.length) {
    rows.push('<hr /><p><strong>风险日程</strong></p>')
    rows.push('<ol>')
    for (const s of schedules) {
      rows.push('<li>')
      rows.push(`<div><strong>${escHtml(s.title || '未命名')}</strong> / 截止: ${escHtml(s.lastSafeDeadline || '')}</div>`)
      if (s.location) rows.push(`<div>地点: ${escHtml(s.location)}</div>`)
      if (s.people) rows.push(`<div>人物: ${escHtml(s.people)}</div>`)
      if (s.notes) rows.push(`<div>备注: ${escHtml(s.notes)}</div>`)
      rows.push('</li>')
    }
    rows.push('</ol>')
  }
  return `<!doctype html><html><body>${rows.join('')}<hr /><p style="color:#888">由灯塔（Save Our Souls）系统自动发送</p></body></html>`
}
