<template>
  <div
    v-if="cleanerStore.isConfirmModalOpen"
    class="sbc-backdrop fixed inset-0 z-[10001] flex items-center justify-center p-3 sm:p-4"
  >
    <div
      class="sbc-panel flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border"
    >
      <!-- 头部 -->
      <div class="sbc-surface-elevated flex items-center justify-between border-b px-4 py-3.5 sm:px-5 sm:py-4">
        <div class="flex items-center gap-2.5">
          <div class="sbc-badge-rose flex size-9 shrink-0 items-center justify-center rounded-xl">
            <SvgIcon name="warning" :size="20" />
          </div>
          <div>
            <h3 class="text-sm font-bold sm:text-base">清理前影响清单与安全确认 (Dry-Run)</h3>
            <p class="text-[11px] sm:text-xs" style="color: var(--sbc-text-secondary)">
              请核对即将删除的主项、连带清理项以及被智能保护自动保留的项目
            </p>
          </div>
        </div>
        <button
          type="button"
          :disabled="cleanerStore.progress.running"
          class="sbc-btn-secondary sbc-touch-target flex size-8 items-center justify-center rounded-lg disabled:opacity-40"
          @click="cleanerStore.isConfirmModalOpen = false"
        >
          <SvgIcon name="close" :size="18" />
        </button>
      </div>

      <!-- 主体内容 -->
      <div class="sbc-scroll-area flex-1 space-y-3.5 p-4 text-xs sm:p-5">
        <div
          v-for="(warn, wIdx) in plan.warnings"
          :key="wIdx"
          class="sbc-badge-amber flex items-start gap-2 rounded-xl p-3 font-medium"
        >
          <SvgIcon name="warning" :size="16" class="mt-0.5 shrink-0" />
          <span>{{ warn }}</span>
        </div>

        <div class="grid grid-cols-3 gap-2.5">
          <div class="sbc-badge-rose rounded-xl p-3">
            <div class="text-[11px] opacity-85">直接删除主项</div>
            <div class="mt-1 text-lg font-extrabold sm:text-xl">{{ plan.primaryDeletes.length }} 项</div>
          </div>
          <div class="sbc-badge-amber rounded-xl p-3">
            <div class="text-[11px] opacity-85">连带删除附属项</div>
            <div class="mt-1 text-lg font-extrabold sm:text-xl">{{ cascadeDeletes.length }} 项</div>
          </div>
          <div class="sbc-badge-emerald rounded-xl p-3">
            <div class="text-[11px] opacity-85">智能保护/仅解绑</div>
            <div class="mt-1 text-lg font-extrabold sm:text-xl">
              {{ cascadeProtectedOrUnbind.length + plan.skippedPrimary.length }} 项
            </div>
          </div>
        </div>

        <div class="sbc-surface-muted rounded-xl border p-3.5">
          <div
            class="mb-2 flex items-center gap-1.5 font-bold"
            style="color: var(--sbc-rose-text)"
          >
            <SvgIcon name="trash" :size="14" />
            <span>即将删除的{{ cleanerStore.activeModule.shortTitle }} ({{ plan.primaryDeletes.length }})</span>
          </div>
          <div class="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
            <span
              v-for="item in plan.primaryDeletes"
              :key="item.id"
              class="sbc-badge-rose inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium"
            >
              <span>{{ item.name }}</span>
              <span class="text-[10px] opacity-75">({{ item.id }})</span>
            </span>
          </div>
        </div>


        <div
          v-if="cascadeDeletes.length > 0"
          class="sbc-surface-muted rounded-xl border p-3.5"
        >
          <div
            class="mb-2 flex items-center gap-1.5 font-bold"
            style="color: var(--sbc-amber-text)"
          >
            <SvgIcon name="link" :size="14" />
            <span>即将连带删除的关联资产 ({{ cascadeDeletes.length }})</span>
          </div>
          <div class="max-h-32 space-y-1.5 overflow-y-auto">
            <div
              v-for="c in cascadeDeletes"
              :key="`${c.moduleId}:${c.id}`"
              class="sbc-badge-amber flex items-center justify-between rounded-lg px-2.5 py-1.5"
            >
              <span class="font-bold">[{{ moduleLabel(c.moduleId) }}] {{ c.name }}</span>
              <span class="text-[11px] opacity-85">{{ c.reason }}</span>
            </div>
          </div>
        </div>


        <div
          v-if="cascadeProtectedOrUnbind.length > 0 || plan.skippedPrimary.length > 0"
          class="sbc-surface-muted rounded-xl border p-3.5"
        >
          <div
            class="mb-2 flex items-center gap-1.5 font-bold"
            style="color: var(--sbc-emerald-text)"
          >
            <SvgIcon name="shield" :size="14" />
            <span>智能防误删保护清单（不会删除实体）</span>
          </div>
          <div class="max-h-32 space-y-1.5 overflow-y-auto">
            <div
              v-for="s in plan.skippedPrimary"
              :key="`skip:${s.item.id}`"
              class="sbc-badge-emerald flex items-center justify-between rounded-lg px-2.5 py-1.5"
            >
              <span class="font-bold">{{ s.item.name }}</span>
              <span class="text-[11px] opacity-90">{{ s.reason }}</span>
            </div>
            <div
              v-for="c in cascadeProtectedOrUnbind"
              :key="`prot:${c.moduleId}:${c.id}`"
              class="sbc-badge-emerald flex items-center justify-between rounded-lg px-2.5 py-1.5"
            >
              <span class="font-bold">[{{ moduleLabel(c.moduleId) }}] {{ c.name }}</span>
              <span class="text-[11px] opacity-90">{{ c.reason }}</span>
            </div>
          </div>
        </div>

        <!-- 备份与云酒馆防崩节流切换条 -->
        <div class="sbc-badge-primary space-y-2.5 rounded-xl p-3.5">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <label class="flex cursor-pointer items-center gap-2.5 font-bold">
              <input
                v-model="settingsStore.settings.backupBeforeDelete"
                type="checkbox"
                :disabled="cleanerStore.progress.running"
                class="size-4 accent-indigo-600"
              />
              <span>删除前自动打包下载 JSON 备份文件（强烈推荐）</span>
            </label>
            <button
              type="button"
              :disabled="cleanerStore.progress.running"
              class="sbc-btn-secondary inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold disabled:opacity-40"
              @click="cleanerStore.downloadBackupOnly()"
            >
              <SvgIcon name="download" :size="13" />
              <span>仅导出备份</span>
            </button>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-2 border-t pt-2" style="border-color: var(--sbc-border)">
            <div class="flex items-center gap-1.5 text-[11px] font-semibold">
              <SvgIcon name="cloud" :size="14" />
              <span>当前护航速度：{{ settingsStore.activeThrottleProfile.name }}</span>
            </div>
            <div class="flex items-center gap-1">
              <button
                v-for="p in throttleList"
                :key="p.id"
                type="button"
                :disabled="cleanerStore.progress.running"
                class="rounded-md px-2 py-0.5 text-[11px] font-bold transition disabled:opacity-40"
                :class="
                  settingsStore.settings.cloudThrottlePreset === p.id
                    ? 'sbc-btn-primary'
                    : 'sbc-btn-secondary'
                "
                @click="settingsStore.setThrottlePreset(p.id)"
              >
                {{ p.name.replace('模式', '') }}
              </button>
            </div>
          </div>
        </div>


        <!-- 实时执行进度条与暂停/终止控制台 -->
        <div
          v-if="cleanerStore.progress.phase !== 'idle'"
          class="sbc-surface-muted space-y-2.5 rounded-xl border p-3.5"
        >
          <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span class="font-bold" style="color: var(--sbc-accent)">
              {{ cleanerStore.progress.currentLabel }}
            </span>
            <div class="flex items-center gap-2">
              <span class="font-mono font-semibold" style="color: var(--sbc-text-secondary)">
                {{ cleanerStore.progress.currentStep }} / {{ cleanerStore.progress.totalSteps }} ({{ progressPercent }}%)
              </span>
              <template v-if="cleanerStore.progress.running">
                <button
                  type="button"
                  class="sbc-btn-secondary inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold"
                  @click="cleanerStore.togglePauseExecution()"
                >
                  <SvgIcon :name="cleanerStore.progress.paused ? 'play' : 'pause'" :size="12" />
                  <span>{{ cleanerStore.progress.paused ? '继续' : '暂停' }}</span>
                </button>
                <button
                  type="button"
                  class="sbc-badge-rose inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold"
                  @click="cleanerStore.abortCurrentExecution()"
                >
                  <SvgIcon name="stop" :size="12" />
                  <span>紧急停止</span>
                </button>
              </template>
            </div>
          </div>

          <div class="h-2.5 w-full overflow-hidden rounded-full" style="background: var(--sbc-border)">
            <div
              class="h-full transition-all duration-200"
              :style="{ width: `${progressPercent}%`, background: 'var(--sbc-accent)' }"
            />
          </div>

          <div class="max-h-32 space-y-1 overflow-y-auto pt-1 font-mono text-[11px]">
            <div
              v-for="(log, idx) in cleanerStore.progress.logs"
              :key="idx"
              :style="{
                color:
                  log.level === 'error'
                    ? 'var(--sbc-rose-text)'
                    : log.level === 'warn'
                      ? 'var(--sbc-amber-text)'
                      : log.level === 'success'
                        ? 'var(--sbc-emerald-text)'
                        : 'var(--sbc-text-secondary)',
              }"
            >
              [{{ log.time }}] {{ log.message }}
            </div>
          </div>
        </div>
      </div>

      <!-- 底部确认操作栏 -->
      <div class="sbc-surface-elevated flex items-center justify-end gap-2.5 border-t px-4 py-3 sm:px-5">
        <button
          type="button"
          :disabled="cleanerStore.progress.running"
          class="sbc-btn-secondary sbc-touch-target rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-40"
          @click="cleanerStore.isConfirmModalOpen = false"
        >
          {{
            cleanerStore.progress.phase === 'completed' || cleanerStore.progress.phase === 'aborted'
              ? '完成并关闭'
              : '取消返回'
          }}
        </button>
        <button
          v-if="cleanerStore.progress.phase !== 'completed'"
          type="button"
          :disabled="cleanerStore.progress.running || plan.primaryDeletes.length === 0"
          class="sbc-btn-danger sbc-touch-target inline-flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-bold"
          @click="cleanerStore.executeCurrentPlan()"
        >
          <SvgIcon name="trash" :size="15" />
          <span>
            {{
              cleanerStore.progress.running
                ? cleanerStore.progress.paused
                  ? '已暂停执行...'
                  : '正在安全节流清理...'
                : `确认永久清理 (${plan.primaryDeletes.length} 项)`
            }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CLOUD_THROTTLE_PROFILES } from '../../core/throttle';
import { useCleanerStore } from '../../stores/cleaner.store';
import { useSettingsStore } from '../../stores/settings.store';
import SvgIcon from '../icons/SvgIcon.vue';

const cleanerStore = useCleanerStore();
const settingsStore = useSettingsStore();
const throttleList = Object.values(CLOUD_THROTTLE_PROFILES);

const plan = computed(() => cleanerStore.dryRunPlan);
const cascadeDeletes = computed(() => plan.value.cascadeItems.filter(c => c.action === 'delete'));
const cascadeProtectedOrUnbind = computed(() =>
  plan.value.cascadeItems.filter(c => c.action !== 'delete'),
);

const progressPercent = computed(() => {
  const { currentStep, totalSteps } = cleanerStore.progress;
  if (!totalSteps) return 0;
  return Math.min(100, Math.round((currentStep / totalSteps) * 100));
});

function moduleLabel(id: string): string {
  switch (id) {
    case 'worldbook':
      return '世界书';
    case 'persona':
      return '面具';
    case 'chat':
      return '聊天记录';
    default:
      return id;
  }
}
</script>
