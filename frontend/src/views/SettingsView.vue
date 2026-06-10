<template>
  <div>
    <div class="page-header">
      <h2 class="page-title">{{ t('settings.title') }}</h2>
    </div>

    <div style="display:flex;flex-direction:column;gap:20px;max-width:640px">

      <!-- System defaults -->
      <div class="card">
        <div class="card-body">
          <div class="card-section-title">{{ t('settings.sysDefaults') }}</div>

          <div v-if="saveMsg" class="success-msg">{{ saveMsg }}</div>
          <div v-if="saveError" class="error-msg">{{ saveError }}</div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">{{ t('settings.labelTimezone') }}</label>
              <select v-model="form.default_timezone" class="form-select">
                <option v-for="tz in timezones" :key="tz" :value="tz">{{ tz }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">{{ t('settings.labelMaxRetries') }}</label>
              <input v-model.number="form.default_max_retry" class="form-input" type="number" min="1" max="10" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-check">
              <input v-model="form.check_daily_run" type="checkbox" />
              <span>{{ t('settings.labelDailyRun') }}</span>
            </label>
            <p style="font-size:12px;color:#888;margin:4px 0 0 24px">{{ t('settings.dailyRunHint') }}</p>
          </div>

          <div class="card-section-title" style="margin-top:20px">{{ t('settings.embyDefaults') }}</div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">{{ t('settings.labelPlayDuration') }}</label>
              <input v-model.number="form.default_play_duration" class="form-input" type="number" min="30" />
            </div>
            <div class="form-group">
              <label class="form-label">{{ t('settings.labelDeviceName') }}</label>
              <input v-model.trim="form.default_device_name" class="form-input" placeholder="Mac" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">{{ t('settings.labelUserAgent') }}</label>
            <textarea v-model.trim="form.default_ua" class="form-input" rows="3" placeholder="Mozilla/5.0 ..." style="resize:vertical" />
          </div>

          <button class="btn btn-primary" :disabled="saving" @click="saveSettings">
            {{ saving ? t('common.saving') : t('settings.saveBtn') }}
          </button>
        </div>
      </div>

      <!-- Admin credentials -->
      <div class="card">
        <div class="card-body">
          <div class="card-section-title">{{ t('settings.adminCreds') }}</div>

          <div v-if="credMsg" class="success-msg">{{ credMsg }}</div>
          <div v-if="credError" class="error-msg">{{ credError }}</div>

          <div class="form-group">
            <label class="form-label">
              {{ t('settings.labelNewUsername') }}
              <span style="font-weight:400;color:#aaa"> {{ t('settings.hintKeepBlank') }}</span>
            </label>
            <input v-model.trim="cred.username" class="form-input" autocomplete="username" />
          </div>
          <div class="form-group">
            <label class="form-label">
              {{ t('settings.labelNewPassword') }}
              <span style="font-weight:400;color:#aaa"> {{ t('settings.hintKeepBlank') }}</span>
            </label>
            <input v-model="cred.newPassword" class="form-input" type="password" autocomplete="new-password" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ t('settings.labelCurrentPass') }} <span style="color:#e63946">*</span></label>
            <input v-model="cred.currentPassword" class="form-input" type="password" autocomplete="current-password" />
          </div>

          <button class="btn btn-primary" :disabled="credSaving" @click="saveCredentials">
            {{ credSaving ? t('common.saving') : t('settings.updateBtn') }}
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { settingsApi, authApi } from '../api/client';
import { t } from '../i18n';

const timezones = [
  'Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane',
  'Australia/Perth', 'Australia/Adelaide', 'Australia/Darwin',
  'Asia/Shanghai', 'Asia/Tokyo', 'Asia/Singapore', 'Asia/Hong_Kong',
  'America/New_York', 'America/Los_Angeles', 'America/Chicago',
  'Europe/London', 'Europe/Paris', 'UTC',
];

const form = reactive({
  default_timezone: 'Australia/Sydney',
  default_max_retry: 5,
  check_daily_run: true,
  default_ua: '',
  default_play_duration: 300,
  default_device_name: 'Mac',
});
const saving = ref(false);
const saveMsg = ref('');
const saveError = ref('');

const cred = reactive({ username: '', newPassword: '', currentPassword: '' });
const credSaving = ref(false);
const credMsg = ref('');
const credError = ref('');

onMounted(async () => {
  try {
    const s = await settingsApi.get();
    form.default_timezone = s.default_timezone;
    form.default_max_retry = Number(s.default_max_retry);
    form.check_daily_run = s.check_daily_run !== 'false';
    form.default_ua = s.default_ua ?? '';
    form.default_play_duration = Number(s.default_play_duration ?? 300);
    form.default_device_name = s.default_device_name ?? 'Mac';
  } catch { /* ignore */ }
});

async function saveSettings() {
  saveMsg.value = '';
  saveError.value = '';
  saving.value = true;
  try {
    await settingsApi.update({
      default_timezone: form.default_timezone,
      default_max_retry: String(form.default_max_retry),
      check_daily_run: String(form.check_daily_run),
      default_ua: form.default_ua,
      default_play_duration: String(form.default_play_duration),
      default_device_name: form.default_device_name,
    });
    saveMsg.value = t('settings.saved');
  } catch (err: any) {
    saveError.value = err.response?.data?.error ?? t('settings.saveFailed');
  } finally {
    saving.value = false;
  }
}

async function saveCredentials() {
  credMsg.value = '';
  credError.value = '';
  if (!cred.currentPassword) { credError.value = t('settings.currentPassRequired'); return; }
  credSaving.value = true;
  try {
    await authApi.changeCredentials(
      cred.currentPassword,
      cred.username || undefined,
      cred.newPassword || undefined,
    );
    credMsg.value = t('settings.credSaved');
    Object.assign(cred, { username: '', newPassword: '', currentPassword: '' });
  } catch (err: any) {
    credError.value = err.response?.data?.error ?? t('settings.credFailed');
  } finally {
    credSaving.value = false;
  }
}
</script>
