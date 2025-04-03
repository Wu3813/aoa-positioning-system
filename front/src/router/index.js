import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '@/views/LoginView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/login'
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },
    {
      path: '/home',
      component: () => import('@/views/Layout.vue'),
      children: [
        {
          path: '',
          name: 'monitor',
          component: () => import('@/views/MonitorView.vue')
        },
        {
          path: 'users',
          name: 'users',
          component: () => import('@/views/UserView.vue')
        },
        {
          path: 'maps',
          name: 'maps',
          component: () => import('@/views/MapView.vue')
        }
      ]
    }
  ]
})

export default router