<template>
  <div
    v-if="cleanerStore.isConfirmModalOpen"
    class="sbc-submodal-backdrop"
    @click.self="handleClose"
  >
    <div class="sbc-submodal-card">
      <!-- 顶部标题 -->
      <header class="sbc-header">
        <div class="sbc-header-brand">
          <div
            class="sbc-brand-logo"
            style="background: linear-gradient(135deg, var(--sbc-danger) 0%, #be123c 100%)"
          >
            <SvgIcon name="shield" :size="18" />
          </div>
          <div class="sbc-brand-text">
            <h3 class="sbc-brand-title">安全删除预演 (Dry-Run) 与执行进度</h3>
            <p class="sbc-brand-sub">
              执行前请核对删除清单；支持一键删前 JSON 备份、云酒馆分批节流与中途随时停止
            </p>
          </div>
        </div>

        <button
          v-if="!progress.running"
          type="button"
          class="sbc-btn-icon sbc-btn-secondary"
          title="关闭预演窗口"
          @click="handleClose"
        >
          <SvgIcon name="close" :size="16" />
        </button>
      </header>

      <!-- 主体区域 -->
      <div class="sbc-list-viewport" style="display: flex; flex-direction: column; gap: 12px">
        <!-- 统计卡片 -->
        <div class="sbc-stat-grid">
          <div class="sbc-stat-box">
            <div style="font-size: 11px; color: var(--sbc-text-muted); font-weight: 600">
              主清理项目 ({{ cleanerStore.activeModule.title }})
            </div>
            <div class="sbc-stat-num" style="color: var(--sbc-danger-text)">
              {{ plan.primaryDeletes.length }}
            </div>
          </div>

          <div class="sbc-stat-box">
            <div style="font-size: 11px; color: var(--sbc-text-muted); font-weight: 600">
              连带删除附属资源
            </div>
            <div class="sbc-stat-num" style="color: var(--sbc-amber-text)">
              {{ cascadeDeleteItems.length }}
            </div>
          </div>

          <div class="sbc-stat-box">
            <div style="font-size: 11px; color: var(--sbc-text-muted); font-weight: 600">
              受保护/仅解绑跳过
            </div>
            <div class="sbc-stat-num" style="color: var(--sbc-emerald-text)">
              {{ cascadeProtectedItems.length + plan.skippedPrimary.length }}
            </div>
          </div>
        </div>

        <!-- 警告提示 -->
        <div
          v-if="plan.warnings.length > 0"
          class="sbc-section-box"
          style="background: var(--sbc-warning-soft); border-color: var(--sbc-warning-border)"
        >
          <div
            v-for="(w, i) in plan.warnings"
            :key="i"
            style="display: flex; align-items: flex-start; gap: 8px; color: var(--sbc-warning-text); font-size: 12px"
          >
            <SvgIcon name="warning" :size="15" style="margin-top: 2px" />
            <span>{{ w }}</span>
          </div>
        </div>

        <!-- 执行前配置摘要 + 清单明细 -->
        <template v-if="!progress.running && progress.phase === 'idle'">
          <div class="sbc-section-box" style="flex-direction: row; align-items: center; justify-content: space-between; flex-wrap: wrap">
            <label class="sbc-check-label" style="align-items: center">
              <input v-model="settingsStore.settings.backupBeforeDelete" type="checkbox" />
              <span style="font-weight: 700">
                删除前自动打包并下载 JSON 备份文件（强烈推荐开启）
              </span>
            </label>
            <span class="sbc-badge sbc-badge-primary">
              <SvgIcon name="cloud" :size="11" />
              <span>{{ settingsStore.activeThrottleProfile.name }}</span>
            </span>
          </div>

          <!-- 待删除主项目列表 -->
          <div class="sbc-section-box">
            <div style="font-weight: 700; font-size: 12.5px">
              即将物理删除的主项目 ({{ plan.primaryDeletes.length }})
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px; max-height: 130px; overflow-y: auto">
              <span
                v-for="item in plan.primaryDeletes"
                :key="item.id"
                class="sbc-badge sbc-badge-rose"
              >
                {{ item.name }}
              </span>
            </div>
          </div>

          <!-- 级联附属明细 -->
          <div v-if="plan.cascadeItems.length > 0" class="sbc-section-box">
            <div style="font-weight: 700; font-size: 12.5px">
              关联世界书 / 面具 / 聊天记录处理明细 ({{ plan.cascadeItems.length }})
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px; max-height: 160px; overflow-y: auto">
              <div
                v-for="(c, idx) in plan.cascadeItems"
                :key="idx"
                style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 8px; border-radius: 8px; background: var(--sbc-bg-subtle)"
              >
                <div style="display: flex; align-items: center; gap: 6px; min-width: 0">
                  <span
                    class="sbc-badge"
                    :class="c.action === 'delete' ? 'sbc-badge-rose' : 'sbc-badge-emerald'"
                  >
                    {{
                      c.action === 'delete'
                        ? '连带删除'
                        : c.action === 'unbind_only'
                          ? '安全解绑'
                          : '智能保护跳过'
                    }}
                  </span>
                  <strong style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis">
                    {{ c.name }}
                  </strong>
                </div>
                <span style="font-size: 11px; color: var(--sbc-text-muted); flex-shrink: 0">
                  {{ c.reason }}
                </span>
              </div>
            </div>
          </div>
        </template>

        <!-- 执行中实时进度与日志控制台 -->
        <template v-else>
          <div class="sbc-section-box">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px">
              <div style="font-weight: 700; color: var(--sbc-text-primary)">
                {{ progress.currentLabel || '正在执行清理...' }}
              </div>
              <span class="sbc-badge sbc-badge-primary">
                {{ progress.currentStep }} / {{ progress.totalSteps }} ({{ progressPercent }}%)
              </span>
            </div>

            <div class="sbc-progress-track">
              <div class="sbc-progress-fill" :style="{ width: `${progressPercent}%` }" />
            </div>

            <div v-if="progress.running" style="display: flex; align-items: center; justify-content: flex-end; gap: 8px">
              <button
                type="button"
                class="sbc-btn sbc-btn-secondary"
                @click="cleanerStore.togglePauseExecution()"
              >
                <SvgIcon :name="progress.paused ? 'play' : 'pause'" :size="14" />
                <span>{{ progress.paused ? '继续执行' : '暂停任务' }}</span>
              </button>

              <button
                type="button"
                class="sbc-btn sbc-btn-danger"
                :disabled="progress.abortRequested"
                @click="cleanerStore.requestAbortExecution()"
              >
                <SvgIcon name="stop" :size="14" />
                <span>{{ progress.abortRequested ? '正在安全停止...' : '安全停止' }}</span>
              </button>
            </div>
          </div>

          <!-- 实时执行日志 -->
          <div class="sbc-log-console">
            <div
              v-for="(log, idx) in progress.logs"
              :key="idx"
              :style="{ color: logLevelColor(log.level) }"
            >
              [{{ log.time }}] {{ log.message }}
            </div>
          </div>
        </template>
      </div>

      <!-- 底部操作栏 -->
      <footer class="sbc-footer">
        <button
          type="button"
          class="sbc-btn sbc-btn-secondary"
          :disabled="progress.running"
          @click="cleanerStore.downloadBackupOnly()"
        >
          <SvgIcon name="download" :size="15" />
          <span>单独下载 JSON 备份</span>
        </button>

        <div class="sbc-footer-actions">
          <button
            type="button"
            class="sbc-btn sbc-btn-secondary"
            :disabled="progress.running"
            @click="handleClose"
          >
            {{ progress.phase === 'idle' ? '取消返回' : '关闭窗口' }}
          </button>

          <button
            v-if="progress.phase === 'idle'"
            type="button"
            class="sbc-btn sbc-btn-danger"
            :disabled="plan.primaryDeletes.length === 0"
            @click="cleanerStore.executeCurrentPlan()"
          >
            <SvgIcon name="trash" :size="15" />
            <span>
              确认清理 ({{ plan.primaryDeletes.length + cascadeDeleteItems.length }} 项)
            </span>
          </button>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useCleanerStore } from '../../stores/cleaner.store';
import { useSettingsStore } from '../../stores/settings.store';
import SvgIcon from '../icons/SvgIcon.vue';

const cleanerStore = useCleanerStore();
const settingsStore = useSettingsStore();

const plan = computed(() => cleanerStore.dryRunPlan);
const progress = computed(() => cleanerStore.progress);

const cascadeDeleteItems = computed(() =>
  plan.value.cascadeItems.filter(c => c.action === 'delete' && c.moduleId !== 'chat'),
);

const cascadeProtectedItems = computed(() =>
  plan.value.cascadeItems.filter(c => c.action !== 'delete'),
);

const progressPercent = computed(() => {
  if (!progress.value.totalSteps) return 0;
  return Math.min(100, Math.round((progress.value.currentStep / progress.value.totalSteps) * 100));
});

function handleClose() {
  if (progress.value.running) return;
  cleanerStore.isConfirmModalOpen = false;
}

function logLevelColor(level: 'info' | 'success' | 'warn' | 'error'): string {
  switch (level) {
    case 'success':
      return 'var(--sbc-emerald-text)';
    case 'warn':
      return 'var(--sbc-amber-text)';
    case 'error':
      return 'var(--sbc-danger-text)';
    default:
      return 'var(--sbc-text-secondary)';
  }
}
</script>

