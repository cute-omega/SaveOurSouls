const KEY = 'sos_data_v1'

const defaultSettings = {
    includeScheduleInAlert: true,
    safeCode: '',
    dangerCode: '',
    trustNoMistype: false,
    alertMessage: '',
    totpSecret: '',
    lastSafeAt: 0,
}

function isRemoteEnabled() {
    return typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_REMOTE_STORAGE === '1'
}

function authHeaders() {
    const h = { 'content-type': 'application/json' }
    const token = import.meta.env?.VITE_RELAY_TOKEN
    if (token) h['Authorization'] = `Bearer ${token}`
    return h
}

async function loadRemote() {
    const resp = await fetch('/api/data', { headers: authHeaders() })
    if (!resp.ok) throw new Error(`Remote load failed: ${resp.status}`)
    return await resp.json()
}

async function saveRemote(data) {
    const resp = await fetch('/api/data', { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) })
    if (!resp.ok) throw new Error(`Remote save failed: ${resp.status}`)
}

function loadLocal() {
    try {
        const raw = localStorage.getItem(KEY)
        if (!raw) return { schedules: [], contacts: [], settings: { ...defaultSettings } }
        const data = JSON.parse(raw)
        if (!data.schedules) data.schedules = []
        if (!data.contacts) data.contacts = []
        if (!data.settings) data.settings = { ...defaultSettings }
        else data.settings = { ...defaultSettings, ...data.settings }
        return data
    } catch (e) {
        console.error('Failed to load SOS data', e)
        return { schedules: [], contacts: [], settings: { ...defaultSettings } }
    }
}

function saveLocal(data) {
    localStorage.setItem(KEY, JSON.stringify(data))
}

export async function getDataAsync() {
    if (isRemoteEnabled()) {
        try {
            return await loadRemote()
        } catch (e) {
            console.warn('Remote load failed, fallback to local', e)
            return loadLocal()
        }
    }
    return loadLocal()
}

export function getData() {
    // Keep sync version for legacy callers; may be stale when remote is enabled
    return loadLocal()
}

export async function setDataAsync(updater) {
    const current = isRemoteEnabled() ? await getDataAsync() : loadLocal()
    const next = typeof updater === 'function' ? updater(current) : updater
    if (isRemoteEnabled()) {
        try { await saveRemote(next) } catch (e) { console.error('Remote save failed', e) }
    }
    saveLocal(next)
    return next
}

export function upsertSchedule(schedule) {
    return setDataAsync(d => {
        const idx = d.schedules.findIndex(s => s.id === schedule.id)
        if (idx >= 0) d.schedules[idx] = schedule
        else d.schedules.push(schedule)
        return d
    })
}

export function deleteSchedule(id) {
    return setDataAsync(d => {
        d.schedules = d.schedules.filter(s => s.id !== id)
        return d
    })
}

export function setSettings(patch) {
    return setDataAsync(d => {
        d.settings = { ...d.settings, ...patch }
        return d
    })
}

export function addContact(contact) {
    return setDataAsync(d => {
        d.contacts.push({ id: crypto.randomUUID(), ...contact })
        return d
    })
}

export function removeContact(id) {
    return setDataAsync(d => {
        d.contacts = d.contacts.filter(c => c.id !== id)
        return d
    })
}
