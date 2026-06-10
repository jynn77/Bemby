import { createRouter, createWebHistory } from 'vue-router';
import LoginView from '../views/LoginView.vue';
import AccountsView from '../views/AccountsView.vue';
import JobsView from '../views/JobsView.vue';
import LogsView from '../views/LogsView.vue';
import SettingsView from '../views/SettingsView.vue';
import HelpView from '../views/HelpView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: LoginView, meta: { public: true } },
    { path: '/', redirect: '/accounts' },
    { path: '/accounts', component: AccountsView },
    { path: '/jobs', component: JobsView },
    { path: '/logs', component: LogsView },
    { path: '/settings', component: SettingsView },
    { path: '/help', component: HelpView },
  ],
});

router.beforeEach((to, _from, next) => {
  const isPublic = to.meta.public === true;
  const hasToken = Boolean(localStorage.getItem('token'));

  if (!isPublic && !hasToken) {
    next('/login');
  } else if (to.path === '/login' && hasToken) {
    next('/accounts');
  } else {
    next();
  }
});

export default router;
