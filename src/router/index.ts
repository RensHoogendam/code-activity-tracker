import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import Dashboard from '../components/Dashboard.vue'
import DetailsPage from '../components/DetailsPage.vue'
import SettingsPage from '../components/SettingsPage.vue'
import CalendarPage from '../components/CalendarPage.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Dashboard',
    component: Dashboard
  },
  {
    path: '/details',
    name: 'Details',
    component: DetailsPage
  },
  {
    path: '/calendar',
    name: 'Calendar',
    component: CalendarPage
  },
  {
    path: '/settings',
    name: 'Settings',
    component: SettingsPage
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router