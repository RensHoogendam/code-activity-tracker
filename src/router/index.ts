import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import Dashboard from '../components/Dashboard.vue'
import DetailsPage from '../components/DetailsPage.vue'
import SettingsPage from '../components/SettingsPage.vue'
import OAuthCallback from '../components/OAuthCallback.vue'

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
    path: '/settings',
    name: 'Settings',
    component: SettingsPage
  },
  {
    path: '/oauth/callback',
    name: 'OAuthCallback',
    component: OAuthCallback
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router