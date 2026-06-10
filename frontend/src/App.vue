<template>
  <div v-if="isPublicRoute" class="full-page">
    <router-view />
  </div>
  <div v-else class="layout">
    <nav class="sidebar">
      <div class="sidebar-title">
        Bemby
        <span class="sidebar-version">v{{ APP_VERSION }}</span>
      </div>
      <router-link class="nav-link" to="/accounts">{{ t('nav.accounts') }}</router-link>
      <router-link class="nav-link" to="/jobs">{{ t('nav.jobs') }}</router-link>
      <router-link class="nav-link" to="/settings">{{ t('nav.settings') }}</router-link>
      <router-link class="nav-link" to="/logs">{{ t('nav.logs') }}</router-link>
      <router-link class="nav-link" to="/help">{{ t('nav.help') }}</router-link>
      <div class="lang-switcher">
        <button class="lang-btn" @click="setLocale(locale === 'zh' ? 'en' : 'zh')">
          {{ locale === 'zh' ? 'EN' : '中文' }}
        </button>
      </div>
      <div class="sidebar-footer">
        <button class="logout-btn" @click="logout">{{ t('nav.logout') }}</button>
      </div>
    </nav>
    <main class="main">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { version as APP_VERSION } from '../package.json';
import { t, locale, setLocale } from './i18n';

const route = useRoute();
const router = useRouter();

const isPublicRoute = computed(() => route.meta.public === true);

function logout() {
  localStorage.removeItem('token');
  router.push('/login');
}
</script>
