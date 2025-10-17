<script setup>
import { ref, computed } from 'vue'
import { getData, getDataAsync, setSettings } from '../utils/storage'
import { verifyCode } from '../utils/totp'

const data = ref(getData())
const inputCode = ref('')
const feedback = ref('')

const settings = computed(() => data.value.settings || {})

async function refresh() { data.value = await getDataAsync() }

async function markSafe() {
    const now = Date.now()
    data.value = await setSettings({ lastSafeAt: now })
    feedback.value = '已记录安全确认。祝你平安。'
}

async function triggerAlert(reason) {
    const payload = buildAlertPayload(reason)
    try {
        const headers = { 'content-type': 'application/json' }
        const token = import.meta.env.VITE_RELAY_TOKEN
        if (token) headers['Authorization'] = `Bearer ${token}`
        const resp = await fetch('/api/alert', {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        })
        if (!resp.ok) {
            const text = await resp.text()
            console.error('Alert failed', resp.status, text)
        }
    } catch (e) {
        console.error('Alert error', e)
    } finally {
        feedback.value = '已发送警报信息给紧急联系人。'
    }
}

function buildAlertPayload(reason) {
    const d = getData()
    const message = settings.value.alertMessage || ''
    const scheduleInfo = settings.value.includeScheduleInAlert ? d.schedules : []
    const contacts = d.contacts
    return {
        reason,
        when: new Date().toISOString(),
        contacts,
        message,
        includeScheduleInAlert: settings.value.includeScheduleInAlert,
        schedules: scheduleInfo,
    }
}

function submit() {
    const code = (inputCode.value || '').trim()
    const { safeCode = '', dangerCode = '', trustNoMistype = false } = settings.value
    if (!code) return

    if (dangerCode && code === dangerCode) {
        triggerAlert('输入危险代码')
        inputCode.value = ''
        return
    }

    if (safeCode && code === safeCode) {
        markSafe()
        inputCode.value = ''
        return
    }

    // Dynamic TOTP as safe signal
    if (settings.value.totpSecret && verifyCode(code, settings.value.totpSecret)) {
        markSafe()
        inputCode.value = ''
        return
    }

    if (trustNoMistype) {
        triggerAlert('输入非安全代码（信任不误输）')
        inputCode.value = ''
        return
    }

    // Neither safe nor danger; give neutral feedback only
    feedback.value = '已记录。'
    inputCode.value = ''
}

</script>

<template>
    <section class="panel">
        <h2>确认安全</h2>
        <p class="muted">在这里输入你的代码以确认安全或声明不安全。页面对不同结果不显示差异化提示。</p>
        <div class="form row">
            <input v-model="inputCode" type="password" placeholder="输入你的代码" @keyup.enter="submit" />
            <button class="primary" @click="submit">提交</button>
        </div>
        <p v-if="feedback" class="feedback">{{ feedback }}</p>
    </section>

    <section class="panel secondary">
        <h3>提示</h3>
        <ul>
            <li>输入【危险代码】将立即向紧急联系人发送警报。</li>
            <li>若勾选“我相信我安全时不会输入错误代码”，输入任何非安全代码也将触发警报。</li>
            <li>输入【安全代码】仅记录一次安全确认时间。</li>
        </ul>
        <button @click="refresh">刷新设置</button>
    </section>
</template>

<style scoped>
.panel {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
}

.secondary {
    background: #fafafa;
}

.row {
    display: flex;
    gap: 8px;
    align-items: center;
}

.form input {
    flex: 1;
}

.muted {
    color: #6b7280;
}

.feedback {
    color: #111827;
}

button {
    padding: 6px 12px;
    border: 1px solid #d1d5db;
    background: #fff;
    border-radius: 6px;
    cursor: pointer;
}

button.primary {
    background: #2f74c0;
    color: #fff;
    border-color: #2f74c0;
}
</style>