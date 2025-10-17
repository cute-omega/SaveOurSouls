/**
 * Cloudflare Pages Function: /api/data
 * Methods:
 *  - GET:    返回完整数据 JSON
 *  - PUT:    写入完整数据 JSON（覆盖）
 * 存储：优先使用 KV (binding: SOS_KV, key: sos_data_v1)，若无绑定则使用进程内存 Map 兜底（仅本地调试用）
 * 鉴权：同 /api/alert，可选 Bearer token（RELAY_TOKEN）
 */

const KEY = 'sos_data_v1'
const memory = new Map()

function corsHeaders(origin) {
    return {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
}

function jsonResponse(status, data, origin) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'content-type': 'application/json;charset=UTF-8', ...corsHeaders(origin) },
    })
}

function defaultData() {
    return {
        schedules: [],
        contacts: [],
        settings: {
            includeScheduleInAlert: true,
            safeCode: '',
            dangerCode: '',
            trustNoMistype: false,
            alertMessage: '',
            totpSecret: '',
            lastSafeAt: 0,
        },
    }
}

async function readKV(env) {
    if (env.SOS_KV && env.SOS_KV.get) {
        const raw = await env.SOS_KV.get(KEY)
        return raw ? JSON.parse(raw) : defaultData()
    } else {
        const raw = memory.get(KEY)
        return raw ? JSON.parse(raw) : defaultData()
    }
}

async function writeKV(env, data) {
    const value = JSON.stringify(data)
    if (env.SOS_KV && env.SOS_KV.put) {
        await env.SOS_KV.put(KEY, value)
    } else {
        memory.set(KEY, value)
    }
}

export const onRequestOptions = async ({ request }) => {
    const origin = request.headers.get('Origin')
    return new Response(null, { status: 204, headers: corsHeaders(origin) })
}

export const onRequestGet = async ({ request, env }) => {
    const origin = request.headers.get('Origin')
    try {
        const requiredToken = env.RELAY_TOKEN || ''
        if (requiredToken) {
            const auth = request.headers.get('Authorization') || ''
            const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
            if (!token || token !== requiredToken) return jsonResponse(401, { error: 'Unauthorized' }, origin)
        }
        const data = await readKV(env)
        return jsonResponse(200, data, origin)
    } catch (e) {
        return jsonResponse(500, { error: 'Server error', detail: String(e) }, origin)
    }
}

export const onRequestPut = async ({ request, env }) => {
    const origin = request.headers.get('Origin')
    try {
        const requiredToken = env.RELAY_TOKEN || ''
        if (requiredToken) {
            const auth = request.headers.get('Authorization') || ''
            const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
            if (!token || token !== requiredToken) return jsonResponse(401, { error: 'Unauthorized' }, origin)
        }
        const body = await request.json()
        if (typeof body !== 'object' || body === null) return jsonResponse(400, { error: 'Invalid JSON' }, origin)
        await writeKV(env, body)
        return jsonResponse(200, { ok: true }, origin)
    } catch (e) {
        return jsonResponse(500, { error: 'Server error', detail: String(e) }, origin)
    }
}
