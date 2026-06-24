<template>
  <div>
    <div class="page-header">
      <h2 class="page-title">{{ t('accounts.title') }}</h2>
      <button class="btn btn-primary" @click="openAdd"><i class="fa-solid fa-plus"></i> {{ t('accounts.addBtn') }}</button>
    </div>

    <div class="card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{{ t('common.name') }}</th>
              <th>{{ t('accounts.colPhone') }}</th>
              <th>{{ t('accounts.colStatus') }}</th>
              <th class="col-hide-mobile">{{ t('accounts.colAdded') }}</th>
              <th>{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!accounts.length">
              <td colspan="5" class="empty">{{ t('accounts.noAccounts') }}</td>
            </tr>
            <tr v-for="a in accounts" :key="a.id" :class="a.disabled ? 'row-disabled' : ''">
              <td>
                {{ a.name }}
                <span v-if="a.disabled" class="badge badge-grey" style="margin-left:6px;font-size:10px">{{ t('accounts.disabled') }}</span>
                <span v-if="a.appClientId" class="badge badge-blue" style="margin-left:4px;font-size:10px">{{ appClientsList.find(c => c.id === a.appClientId)?.name ?? a.appClientId }}</span>
              </td>
              <td>{{ a.phoneNumber }}</td>
              <td><span :class="statusBadge(a.authStatus)">{{ t(`accounts.status.${a.authStatus}`) }}</span></td>
              <td class="col-hide-mobile">{{ fmtDate(a.createdAt) }}</td>
              <td>
                <div class="actions">
                  <button
                    v-if="a.authStatus !== 'authenticated'"
                    class="btn btn-sm btn-primary btn-icon"
                    :title="t('accounts.authenticate')"
                    @click="openAuth(a)"
                  ><i class="fa-solid fa-key"></i></button>
                  <button
                    v-if="a.authStatus === 'authenticated'"
                    class="btn btn-sm btn-ghost btn-icon"
                    :title="t('accounts.checkStatus')"
                    @click="openCheckStatus(a)"
                  ><i class="fa-solid fa-circle-info"></i></button>
                  <button
                    class="btn btn-sm btn-ghost btn-icon"
                    :title="a.disabled ? t('accounts.enableAccount') : t('accounts.disableAccount')"
                    @click="toggleDisabled(a)"
                  ><i :class="a.disabled ? 'fa-solid fa-circle-play' : 'fa-solid fa-ban'"></i></button>
                  <button class="btn btn-sm btn-ghost btn-icon" :title="t('common.edit')" @click="openEdit(a)"><i class="fa-solid fa-pen"></i></button>
                  <button class="btn btn-sm btn-danger btn-icon" :title="t('common.delete')" @click="remove(a.id)"><i class="fa-solid fa-trash"></i></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add / Edit modal -->
    <div v-if="showForm" class="modal-backdrop">
      <div class="modal">
        <h3 class="modal-title">{{ t(editTarget ? 'accounts.editTitle' : 'accounts.addTitle') }}</h3>
        <div v-if="formError" class="error-msg">{{ formError }}</div>
        <div class="form-group">
          <label class="form-label">{{ t('accounts.labelName') }}</label>
          <input v-model.trim="form.name" class="form-input" placeholder="e.g. My Account" />
        </div>
        <div class="form-group">
          <label class="form-label">{{ t('accounts.labelPhone') }}</label>
          <input v-model.trim="form.phoneNumber" class="form-input" placeholder="+61412345678" />
        </div>
        <div class="form-group" style="max-width:140px">
          <label class="form-label">{{ t('accounts.labelApiId') }}</label>
          <input v-model.trim="form.apiId" class="form-input" type="number" />
        </div>
        <div class="form-group">
          <label class="form-label">{{ t('accounts.labelApiHash') }}</label>
          <input v-model.trim="form.apiHash" class="form-input" placeholder="32-char hex" style="font-family:monospace" />
        </div>
        <p style="font-size:12px;color:#888;margin-top:-8px;margin-bottom:14px">
          {{ t('accounts.apiHint') }} <a href="https://my.telegram.org/apps" target="_blank">my.telegram.org/apps</a>
        </p>
        <div v-if="proxiesList.length" class="form-group">
          <label class="form-label">{{ t('accounts.labelProxy') }}</label>
          <select v-model="form.proxyId" class="form-select">
            <option value="">{{ t('accounts.proxyNone') }}</option>
            <option v-for="p in proxiesList" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">{{ t('accounts.labelAppClient') }}</label>
          <select v-model="form.appClientId" class="form-select">
            <option value="">{{ t('accounts.appClientDefault') }}{{ defaultClientName ? ` (${defaultClientName})` : '' }}</option>
            <option v-for="c in appClientsList" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="showForm = false"><i class="fa-solid fa-xmark"></i> {{ t('common.cancel') }}</button>
          <button class="btn btn-primary" :disabled="saving" @click="saveAccount">
            <i class="fa-solid fa-floppy-disk"></i> {{ saving ? t('common.saving') : t('common.save') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Account status modal -->
    <div v-if="showStatus" class="modal-backdrop">
      <div class="modal" style="width:420px">
        <h3 class="modal-title">{{ t('accounts.checkStatusTitle') }} — {{ statusTarget?.name }}</h3>
        <div class="modal-body">
          <div v-if="statusChecking" style="text-align:center;padding:24px 0;color:#888">
            <i class="fa-solid fa-spinner fa-spin"></i> {{ t('accounts.checking') }}
          </div>
          <div v-else-if="statusError" class="error-msg">{{ statusError }}</div>
          <template v-else-if="statusResult">
            <div class="status-row">
              <span class="status-label">{{ t('accounts.colStatus') }}</span>
              <span v-if="statusResult.isDeleted" class="badge badge-red">{{ t('accounts.statusDeleted') }}</span>
              <span v-else-if="statusResult.isRestricted" class="badge badge-orange">{{ t('accounts.statusRestricted') }}</span>
              <span v-else class="badge badge-green">{{ t('accounts.statusActive') }}</span>
            </div>
            <div v-if="statusResult.firstName || statusResult.lastName" class="status-row">
              <span class="status-label">{{ t('accounts.statusDisplayName') }}</span>
              <span>{{ [statusResult.firstName, statusResult.lastName].filter(Boolean).join(' ') }}</span>
            </div>
            <div v-if="statusResult.username" class="status-row">
              <span class="status-label">{{ t('accounts.statusUsername') }}</span>
              <span>@{{ statusResult.username }}</span>
            </div>
            <div v-if="statusResult.phone" class="status-row">
              <span class="status-label">{{ t('accounts.statusPhone') }}</span>
              <span>+{{ statusResult.phone }}</span>
            </div>
            <div v-if="statusResult.restrictions.length" style="margin-top:12px">
              <div class="status-label" style="margin-bottom:6px">{{ t('accounts.statusRestrictions') }}</div>
              <div v-for="r in statusResult.restrictions" :key="r.platform + r.reason" class="restriction-item">
                <span class="badge badge-orange" style="margin-right:6px">{{ r.platform }}</span>
                <span style="font-size:12px;color:#555">{{ r.text || r.reason }}</span>
              </div>
            </div>
          </template>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="showStatus = false"><i class="fa-solid fa-xmark"></i> {{ t('common.cancel') }}</button>
        </div>
      </div>
    </div>

    <!-- Auth modal -->
    <div v-if="showAuth" class="modal-backdrop">
      <div class="modal">
        <h3 class="modal-title">{{ t('accounts.authTitle') }} — {{ authTarget?.name }}</h3>
        <div v-if="authError" class="error-msg">{{ authError }}</div>

        <!-- Step: request code -->
        <div v-if="authStep === 'idle'">
          <p style="color:#666;margin-bottom:16px;font-size:13px">
            {{ t('accounts.authHint') }} <strong>{{ authTarget?.phoneNumber }}</strong>.
          </p>
          <button class="btn btn-primary" :disabled="authBusy" @click="sendCode">
            <i class="fa-solid fa-paper-plane"></i> {{ authBusy ? t('accounts.sending') : t('accounts.sendCode') }}
          </button>
        </div>

        <!-- Step: enter OTP -->
        <div v-else-if="authStep === 'code'">
          <div class="form-group">
            <label class="form-label">{{ t('accounts.labelCode') }}</label>
            <input v-model.trim="authCode" class="form-input" placeholder="12345" autofocus />
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="closeAuth"><i class="fa-solid fa-xmark"></i> {{ t('common.cancel') }}</button>
            <button class="btn btn-primary" :disabled="authBusy" @click="verifyCode">
              <i class="fa-solid fa-check"></i> {{ authBusy ? t('accounts.verifying') : t('accounts.verify') }}
            </button>
          </div>
        </div>

        <!-- Step: 2FA password -->
        <div v-else-if="authStep === '2fa'">
          <div class="form-group">
            <label class="form-label">{{ t('accounts.labelTwoFa') }}</label>
            <input v-model="authPassword" class="form-input" type="password" autofocus />
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="closeAuth"><i class="fa-solid fa-xmark"></i> {{ t('common.cancel') }}</button>
            <button class="btn btn-primary" :disabled="authBusy" @click="verify2fa">
              <i class="fa-solid fa-check"></i> {{ authBusy ? t('accounts.verifying') : t('accounts.submit') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { accountsApi, settingsApi, type Account, type Proxy, type TgAppClient, type TgAccountStatus } from '../api/client';
import { t, locale } from '../i18n';

const accounts = ref<Account[]>([]);
const settings = ref<{ proxies?: string; tg_app_clients?: string } | null>(null);

const proxiesList = computed<Proxy[]>(() => {
  try { return JSON.parse(settings.value?.proxies ?? '[]'); } catch { return []; }
});

const appClientsList = computed<TgAppClient[]>(() => {
  try { return JSON.parse(settings.value?.tg_app_clients ?? '[]'); } catch { return []; }
});

const defaultClientName = computed(() => appClientsList.value.find(c => c.isDefault)?.name ?? '');

// ── Form state ────────────────────────────────────────────────────────────────
const showForm = ref(false);
const editTarget = ref<Account | null>(null);
const form = reactive({ name: '', phoneNumber: '', apiId: '', apiHash: '', proxyId: '', appClientId: '' });
const formError = ref('');
const saving = ref(false);

// ── Status check state ────────────────────────────────────────────────────────
const showStatus = ref(false);
const statusTarget = ref<Account | null>(null);
const statusResult = ref<TgAccountStatus | null>(null);
const statusError = ref('');
const statusChecking = ref(false);

// ── Auth state ────────────────────────────────────────────────────────────────
const showAuth = ref(false);
const authTarget = ref<Account | null>(null);
const authStep = ref<'idle' | 'code' | '2fa'>('idle');
const authCode = ref('');
const authPassword = ref('');
const authError = ref('');
const authBusy = ref(false);

// ── Lifecycle ──────────────────────────────────────────────────────────────────
onMounted(load);

async function load() {
  [accounts.value, settings.value] = await Promise.all([
    accountsApi.list(),
    settingsApi.get(),
  ]);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function statusBadge(s: Account['authStatus']) {
  const map: Record<string, string> = {
    authenticated: 'badge badge-green',
    pending_code: 'badge badge-orange',
    pending_2fa: 'badge badge-orange',
    unauthenticated: 'badge badge-grey',
  };
  return map[s] ?? 'badge badge-grey';
}

function fmtDate(iso: string) {
  const localeMap: Record<string, string> = { en: 'en-AU', zh: 'zh-CN' };
  return new Date(iso).toLocaleDateString(localeMap[locale.value] ?? 'en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Add / Edit ─────────────────────────────────────────────────────────────────
function openAdd() {
  editTarget.value = null;
  Object.assign(form, { name: '', phoneNumber: '', apiId: '', apiHash: '', proxyId: '', appClientId: '' });
  formError.value = '';
  showForm.value = true;
}

function openEdit(a: Account) {
  editTarget.value = a;
  Object.assign(form, { name: a.name, phoneNumber: a.phoneNumber, apiId: String(a.apiId), apiHash: '', proxyId: a.proxyId ?? '', appClientId: a.appClientId ?? '' });
  formError.value = '';
  showForm.value = true;
}

async function saveAccount() {
  formError.value = '';
  saving.value = true;
  try {
    if (editTarget.value) {
      await accountsApi.update(editTarget.value.id, {
        name: form.name,
        phoneNumber: form.phoneNumber,
        apiId: Number(form.apiId),
        ...(form.apiHash ? { apiHash: form.apiHash } : {}),
        proxyId: form.proxyId || null,
        appClientId: form.appClientId || null,
      });
    } else {
      await accountsApi.create({
        name: form.name,
        phoneNumber: form.phoneNumber,
        apiId: Number(form.apiId),
        apiHash: form.apiHash,
        proxyId: form.proxyId || null,
        appClientId: form.appClientId || null,
      });
    }
    showForm.value = false;
    await load();
  } catch (err: any) {
    formError.value = err.response?.data?.error ?? t('common.saveFailed');
  } finally {
    saving.value = false;
  }
}

async function remove(id: number) {
  if (!confirm(t('accounts.confirmDelete'))) return;
  await accountsApi.delete(id);
  await load();
}

async function toggleDisabled(a: Account) {
  await accountsApi.update(a.id, { disabled: !a.disabled });
  await load();
}

async function openCheckStatus(a: Account) {
  statusTarget.value = a;
  statusResult.value = null;
  statusError.value = '';
  statusChecking.value = true;
  showStatus.value = true;
  try {
    statusResult.value = await accountsApi.checkStatus(a.id);
  } catch (err: any) {
    statusError.value = err.response?.data?.error ?? 'Failed to check status';
  } finally {
    statusChecking.value = false;
  }
}

// ── Auth flow ─────────────────────────────────────────────────────────────────
function openAuth(a: Account) {
  authTarget.value = a;
  authStep.value = 'idle';
  authCode.value = '';
  authPassword.value = '';
  authError.value = '';
  showAuth.value = true;
}

function closeAuth() {
  showAuth.value = false;
}

async function sendCode() {
  if (!authTarget.value) return;
  authError.value = '';
  authBusy.value = true;
  try {
    await accountsApi.requestCode(authTarget.value.id);
    authStep.value = 'code';
  } catch (err: any) {
    authError.value = err.response?.data?.error ?? t('accounts.errors.sendFailed');
  } finally {
    authBusy.value = false;
  }
}

async function verifyCode() {
  if (!authTarget.value) return;
  authError.value = '';
  authBusy.value = true;
  try {
    const res = await accountsApi.verify(authTarget.value.id, { code: authCode.value });
    if (res.step === '2fa') {
      authStep.value = '2fa';
    } else {
      showAuth.value = false;
      await load();
    }
  } catch (err: any) {
    authError.value = err.response?.data?.error ?? t('accounts.errors.verifyFailed');
  } finally {
    authBusy.value = false;
  }
}

async function verify2fa() {
  if (!authTarget.value) return;
  authError.value = '';
  authBusy.value = true;
  try {
    await accountsApi.verify(authTarget.value.id, { password: authPassword.value });
    showAuth.value = false;
    await load();
  } catch (err: any) {
    authError.value = err.response?.data?.error ?? t('accounts.errors.twoFaFailed');
  } finally {
    authBusy.value = false;
  }
}
</script>

<style scoped>
.row-disabled td {
  opacity: 0.5;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 0;
  border-bottom: 1px solid #f0f0f0;
  font-size: 13px;
}

.status-label {
  min-width: 110px;
  font-weight: 500;
  color: #666;
  flex-shrink: 0;
}

.restriction-item {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 6px 0;
  border-bottom: 1px solid #f5f5f5;
}
</style>
