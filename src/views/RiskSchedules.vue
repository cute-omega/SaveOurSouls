<script setup>
import { ref, computed, onMounted } from 'vue'
import { getDataAsync, upsertSchedule, deleteSchedule, setSettings, addContact, removeContact as removeContactPersist } from '../utils/storage'
import { currentCode, generateSecret } from '../utils/totp'

const data = ref({ schedules: [], contacts: [], settings: {} })

onMounted(() => {
    load()
})

async function load() {
    data.value = await getDataAsync()
}

const draft = ref({
    id: '',
    title: '',
    date: '',
    time: '',
    location: '',
    people: '',
    lastSafeDeadline: '', // ISO datetime-local string
    notes: '',
})

function resetDraft() {
    draft.value = { id: '', title: '', date: '', time: '', location: '', people: '', lastSafeDeadline: '', notes: '' }
}

function editSchedule(s) {
    draft.value = { ...s }
}

async function saveSchedule() {
    if (!draft.value.title || !draft.value.lastSafeDeadline) {
        alert('请填写标题与最后安全期限')
        return
    }
    const s = {
        id: draft.value.id || crypto.randomUUID(),
        ...draft.value,
        createdAt: draft.value.createdAt || Date.now(),
    }
    data.value = await upsertSchedule(s)
    resetDraft()
}

async function removeSchedule(id) {
    if (!confirm('确定删除该日程吗？')) return
    data.value = await deleteSchedule(id)
}

// Settings
const settings = computed(() => data.value.settings || {})
async function updateSetting(key, value) {
    data.value = await setSettings({ [key]: value })
}

// Contacts (simple Email list)
const contactEmail = ref('')
async function addEmailContact() {
    const email = contactEmail.value.trim()
    if (!email) return
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { alert('Email 格式不正确'); return }
    data.value = await addContact({ type: 'email', value: email })
    contactEmail.value = ''
}

async function removeContact(id) {
    data.value = await removeContactPersist(id)
}

// Derived helpers
const upcoming = computed(() =>
    [...(data.value.schedules || [])].sort((a, b) => (a.lastSafeDeadline || '').localeCompare(b.lastSafeDeadline || ''))
)

</script>

<template>
    <section class="panel">
        <h2>风险日程</h2>
        <div class="grid">
            <div class="col">
                <h3>{{ draft.id ? '编辑日程' : '新增日程' }}</h3>
                <div class="form">
                    <label>
                        标题
                        <input v-model="draft.title" placeholder="如 登山/会见陌生人" />
                    </label>
                    <label>
                        日期
                        <input type="date" v-model="draft.date" />
                    </label>
                    <label>
                        时间
                        <input type="time" v-model="draft.time" />
                    </label>
                    <label>
                        地点
                        <input v-model="draft.location" />
                    </label>
                    <label>
                        可能会见的人物
                        <input v-model="draft.people" placeholder="例如 张三(电话)、陌生人(昵称)" />
                    </label>
                    <label>
                        最后安全期限
                        <input type="datetime-local" v-model="draft.lastSafeDeadline" />
                    </label>
                    <label>
                        备注
                        <textarea v-model="draft.notes" rows="3" />
                    </label>
                    <div class="row">
                        <button class="primary" @click="saveSchedule">保存</button>
                        <button v-if="draft.id" @click="resetDraft">取消编辑</button>
                    </div>
                </div>
            </div>
            <div class="col">
                <h3>已计划的日程</h3>
                <div v-if="!upcoming.length" class="muted">暂无日程</div>
                <ul class="list">
                    <li v-for="s in upcoming" :key="s.id" class="item">
                        <div class="item-main">
                            <div class="item-title">{{ s.title }}</div>
                            <div class="item-sub">
                                截止：{{ new Date(s.lastSafeDeadline).toLocaleString() }}
                                <span v-if="s.location"> · 地点：{{ s.location }}</span>
                            </div>
                        </div>
                        <div class="item-actions">
                            <button @click="editSchedule(s)">编辑</button>
                            <button class="danger" @click="removeSchedule(s.id)">删除</button>
                        </div>
                    </li>
                </ul>
            </div>
        </div>
    </section>

    <section class="panel">
        <h2>紧急联系人（Email）</h2>
        <div class="row">
            <input v-model="contactEmail" placeholder="输入 Email 并添加" @keyup.enter="addEmailContact" />
            <button @click="addEmailContact">添加</button>
        </div>
        <ul class="list compact">
            <li v-for="c in data.contacts" :key="c.id" class="item">
                <div class="item-main">{{ c.type }} · {{ c.value }}</div>
                <div class="item-actions"><button class="danger" @click="removeContact(c.id)">移除</button></div>
            </li>
        </ul>
    </section>

    <section class="panel">
        <h2>警报信息与设置</h2>
        <div class="form">
            <label class="row">
                <input type="checkbox" v-model="settings.includeScheduleInAlert"
                    @change="updateSetting('includeScheduleInAlert', settings.includeScheduleInAlert)" />
                <span>在危险状态时随警报发送风险日程信息</span>
            </label>
            <label>
                预设警报信息内容（可选）
                <textarea v-model="settings.alertMessage" rows="4"
                    @change="updateSetting('alertMessage', settings.alertMessage)"
                    placeholder="包含身份证明、已知危险线索、法律授权、希望/不希望的行动方案等" />
            </label>
            <div class="grid small">
                <label>
                    安全代码
                    <input v-model="settings.safeCode" @change="updateSetting('safeCode', settings.safeCode)"
                        placeholder="用于确认安全" />
                </label>
                <label>
                    危险代码
                    <input v-model="settings.dangerCode" @change="updateSetting('dangerCode', settings.dangerCode)"
                        placeholder="用于声明不安全（立即触发警报）" />
                </label>
            </div>
            <label class="row">
                <input type="checkbox" v-model="settings.trustNoMistype"
                    @change="updateSetting('trustNoMistype', settings.trustNoMistype)" />
                <span>我相信我安全时不会输入错误代码（输入任意非安全代码将视为危险）</span>
            </label>
            <div class="divider" />
            <h3>动态密码（TOTP）</h3>
            <div class="row">
                <button @click="updateSetting('totpSecret', settings.totpSecret || generateSecret())">{{
                    settings.totpSecret ? '已设置密钥' : '生成密钥' }}</button>
                <button v-if="settings.totpSecret" class="danger" @click="updateSetting('totpSecret', '')">清除密钥</button>
            </div>
            <div v-if="settings.totpSecret" class="muted">当前动态码（每30秒变化，仅演示）：<strong>{{ currentCode(settings.totpSecret)
            }}</strong></div>
        </div>
    </section>
</template>

<style scoped>
.panel {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
}

.grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
}

@media (min-width: 900px) {
    .grid {
        grid-template-columns: 1fr 1fr;
    }
}

.grid.small {
    grid-template-columns: 1fr;
}

@media (min-width: 600px) {
    .grid.small {
        grid-template-columns: 1fr 1fr;
    }
}

.form {
    display: grid;
    gap: 12px;
}

label {
    display: grid;
    gap: 6px;
    font-size: 14px;
}

input,
textarea {
    padding: 8px 10px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
}

.row {
    display: flex;
    gap: 8px;
    align-items: center;
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

button.danger {
    background: #e11d48;
    color: #fff;
    border-color: #e11d48;
}

.list {
    list-style: none;
    padding: 0;
    margin: 8px 0 0;
    display: grid;
    gap: 8px;
}

.list.compact .item {
    padding: 8px 10px;
}

.item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
}

.item-title {
    font-weight: 600;
}

.item-sub {
    color: #6b7280;
    font-size: 12px;
    margin-top: 4px;
}

.muted {
    color: #9ca3af;
}

.divider {
    height: 1px;
    background: #e5e7eb;
    margin: 8px 0;
}
</style>