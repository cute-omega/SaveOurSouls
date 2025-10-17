import { createRouter, createWebHistory } from 'vue-router'

const RiskSchedules = () => import('../views/RiskSchedules.vue')
const ConfirmSafety = () => import('../views/ConfirmSafety.vue')

const routes = [
    { path: '/', name: 'risk-schedules', component: RiskSchedules },
    { path: '/confirm', name: 'confirm', component: ConfirmSafety },
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

export default router
