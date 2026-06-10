<template>
  <div>
    <div class="page-header">
      <h2 class="page-title">{{ t('logs.title') }}</h2>
      <div style="display:flex;gap:10px;align-items:center">
        <select v-model="filterJobId" class="form-select" style="width:200px" @change="load">
          <option value="">{{ t('logs.allJobs') }}</option>
          <option v-for="j in jobs" :key="j.id" :value="j.id">{{ j.name }}</option>
        </select>
        <button class="btn btn-ghost" @click="load">{{ t('common.refresh') }}</button>
      </div>
    </div>

    <div class="card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{{ t('logs.colTime') }}</th>
              <th>{{ t('logs.colJob') }}</th>
              <th>{{ t('logs.colAccount') }}</th>
              <th>{{ t('logs.colStatus') }}</th>
              <th>{{ t('logs.colMessage') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!logs.length">
              <td colspan="5" class="empty">{{ t('logs.noLogs') }}</td>
            </tr>
            <tr v-for="l in logs" :key="l.id">
              <td style="white-space:nowrap">{{ fmtDate(l.ranAt) }}</td>
              <td>{{ l.jobName ?? l.jobId }}</td>
              <td>{{ l.accountName ?? '—' }}</td>
              <td><span :class="statusBadge(l.status)">{{ t(`logs.status.${l.status}`) }}</span></td>
              <td style="max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                {{ l.message ?? '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="logs.length === 50" style="padding:12px 16px;text-align:center">
        <button class="btn btn-ghost btn-sm" @click="loadMore">{{ t('common.loadMore') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { logsApi, jobsApi, type Log, type Job } from '../api/client';
import { t } from '../i18n';

const logs = ref<Log[]>([]);
const jobs = ref<Job[]>([]);
const filterJobId = ref<number | ''>('');
const offset = ref(0);

onMounted(async () => {
  jobs.value = await jobsApi.list();
  await load();
});

async function load() {
  offset.value = 0;
  logs.value = await logsApi.list({
    jobId: filterJobId.value === '' ? undefined : Number(filterJobId.value),
    limit: 50,
    offset: 0,
  });
}

async function loadMore() {
  offset.value += 50;
  const more = await logsApi.list({
    jobId: filterJobId.value === '' ? undefined : Number(filterJobId.value),
    limit: 50,
    offset: offset.value,
  });
  logs.value.push(...more);
}

function statusBadge(s: Log['status']) {
  const map: Record<string, string> = {
    success: 'badge badge-green',
    failed:  'badge badge-red',
    running: 'badge badge-orange',
  };
  return map[s] ?? 'badge badge-grey';
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-AU', {
    month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}
</script>
