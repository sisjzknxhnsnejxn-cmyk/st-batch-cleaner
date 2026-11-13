<template>
  <div
    v-if="cleanerStore.isModalOpen"
    :data-sbc-theme="settingsStore.resolvedTheme"
    class="sbc-backdrop fixed inset-0 z-40 flex items-center justify-center p-0 font-sans sm:p-3 md:p-5"
  >
    <div
      class="sbc-panel sbc-modal-shell flex h-[100dvh] w-full max-w-6xl flex-col overflow-hidden rounded-none border-0 sm:h-[92dvh] sm:rounded-2xl sm:border"
    >
      <!-- 顶部标题栏（适配 iOS 刘海/灵动岛安全距离） -->
      <header
        class="sbc-surface-elevated flex shrink-0 items-center justify-between border-b px-3.5 py-2.5 sm:px-5 sm:py-3"
      >
        <div class="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <div
            class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm sm:size-10"
          >
            <SvgIcon name="broom" :size="20" />
          </div>
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h1 class="truncate text-sm font-bold tracking-wide sm:text-base">
                酒馆资产批量清理中心
              </h1>
              <span
                class="sbc-badge-primary hidden rounded-md px-2 py-0.5 text-[11px] font-semibold sm:inline-flex"
              >
                {{ settingsStore.activeThrottleProfile.name }}
              </span>
            </div>
            <p class="truncate text-[11px] sm:text-xs" style="color: var(--sbc-text-secondary)">
              {{ cleanerStore.activeModule.description }}
            </p>
          </div>
        </div>

        <div class="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <!-- 日/夜主题一键切换按钮 -->
          <button
            type="button"
            class="sbc-btn-secondary sbc-touch-target inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold"
            :title="`切换主题（当前：${themeModeLabel}）`"
            @click="settingsStore.cycleThemeMode()"
          >
            <SvgIcon :name="themeModeIcon" :size="15" />
            <span class="hidden md:inline">{{ themeModeLabel }}</span>
          </button>

          <!-- 偏好与防崩设置按钮 -->
          <button
            type="button"
            class="sbc-btn-secondary sbc-touch-target inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold"
            title="偏好设置、快捷入口与云酒馆防崩档位"
            @click="cleanerStore.isSettingsDrawerOpen = true"
          >
            <SvgIcon name="settings" :size="15" />
            <span class="hidden md:inline">设置与防崩</span>
          </button>

          <!-- 重新扫描按钮 -->
          <button
            type="button"
            :disabled="cleanerStore.isScanning"
            class="sbc-btn-secondary sbc-touch-target inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50"
            title="重新扫描资产引用关系"
            @click="cleanerStore.refreshAll()"
          >
            <SvgIcon name="refresh" :size="14" :class="{ 'animate-spin': cleanerStore.isScanning }" />
            <span class="hidden sm:inline">刷新</span>
          </button>

          <!-- 关闭按钮 -->
          <button
            type="button"
            class="sbc-btn-secondary sbc-touch-target flex size-9 items-center justify-center rounded-xl"
            title="关闭清理中心"
            @click="cleanerStore.closeModal()"
          >
            <SvgIcon name="close" :size="18" />
          </button>
        </div>
      </header>

      <!-- iOS Safari 添加主屏幕全屏指引横幅 -->
      <IosInstallBanner />

      <!-- 主体双栏布局 -->
      <div class="flex min-h-0 flex-1 flex-col md:flex-row">
        <!-- 左侧/顶部模块导航（已预留未来扩展卡槽） -->
        <aside
          class="sbc-surface-muted flex shrink-0 gap-1.5 overflow-x-auto border-b p-2.5 md:w-56 md:flex-col md:border-r md:border-b-0 md:p-3"
        >
          <button
            v-for="mod in CLEANER_MODULES"
            :key="mod.id"
            type="button"
            :class="[
              'flex shrink-0 items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold transition md:w-full md:py-2.5',
              cleanerStore.activeModuleId === mod.id
                ? 'sbc-btn-primary shadow-sm'
                : 'sbc-btn-secondary',
            ]"
            @click="cleanerStore.switchModule(mod.id)"
          >
            <div class="flex items-center gap-2">
              <SvgIcon :name="mod.icon" :size="16" />
              <span>{{ mod.shortTitle }}</span>
            </div>
            <div class="flex items-center gap-1">
              <span
                v-if="(cleanerStore.selectedMap[mod.id]?.length ?? 0) > 0"
                class="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white"
              >
                {{ cleanerStore.selectedMap[mod.id].length }}
              </span>
              <span
                :class="[
                  'rounded-md px-1.5 py-0.5 text-[11px] font-semibold',
                  cleanerStore.activeModuleId === mod.id
                    ? 'bg-white/20 text-white'
                    : 'sbc-badge-neutral',
                ]"
              >
                {{ cleanerStore.itemsByModule[mod.id]?.length ?? 0 }}
              </span>
            </div>
          </button>


          <div
            class="sbc-surface-elevated mt-auto hidden rounded-xl border p-3 text-[11px] leading-relaxed md:block"
            style="color: var(--sbc-text-secondary)"
          >
            <div
              class="mb-1 flex items-center gap-1.5 font-bold"
              style="color: var(--sbc-emerald-text)"
            >
              <SvgIcon name="shield" :size="14" />
              <span>安全清理与云端护航</span>
            </div>
            <p>
              所有删除均经过引用图谱差集校验，支持删前导出备份、云酒馆防崩节流及随时暂停终止。
            </p>
          </div>
        </aside>


        <!-- 右侧内容工作区 -->
        <main class="flex min-h-0 flex-1 flex-col">
          <FilterToolbar />

          <!-- 滚动列表区（支持分批增量渲染防卡顿） -->
          <div
            class="sbc-scroll-area min-h-0 flex-1 p-3.5 sm:p-4"
            @scroll.passive="handleListScroll"
          >
            <div
              v-if="cleanerStore.filteredItems.length === 0"
              class="flex h-60 flex-col items-center justify-center gap-2"
              style="color: var(--sbc-text-muted)"
            >
              <SvgIcon :name="cleanerStore.activeModule.icon" :size="36" />
              <p class="text-sm font-medium">
                没有匹配当前筛选条件的{{ cleanerStore.activeModule.shortTitle }}
              </p>
            </div>

            <div
              v-else
              :class="[
                effectiveViewMode === 'grid'
                  ? 'grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3'
                  : 'flex flex-col gap-2',
              ]"
            >
              <ItemCard
                v-for="item in cleanerStore.visibleFilteredItems"
                :key="item.id"
                :item="item"
                :selected="cleanerStore.currentSelectedSet.has(item.id)"
                :selectable="cleanerStore.isItemSelectable(item)"
                :view-mode="effectiveViewMode"
                :show-avatar="cleanerStore.activeModule.supportsGridView"
                :fallback-icon="cleanerStore.activeModule.icon"
                @toggle="cleanerStore.toggleSelectItem"
              />
            </div>

            <!-- 增量加载提示 -->
            <div
              v-if="cleanerStore.hasMoreItems"
              class="mt-4 flex justify-center"
            >
              <button
                type="button"
                class="sbc-btn-secondary rounded-xl px-4 py-2 text-xs font-semibold"
                @click="cleanerStore.loadMoreVisibleItems()"
              >
                加载更多（已显示 {{ cleanerStore.visibleFilteredItems.length }} / {{ cleanerStore.filteredItems.length }} 项）
              </button>
            </div>
          </div>

          <!-- 底部操作汇总栏 -->
          <footer
            class="sbc-surface-elevated flex flex-wrap items-center justify-between gap-2.5 border-t px-3.5 py-2.5 sm:px-5 sm:py-3.5"
          >
            <div class="flex flex-wrap items-center gap-2 text-xs">
              <span class="font-medium" style="color: var(--sbc-text-secondary)">
                已勾选
                <strong class="text-sm font-bold" style="color: var(--sbc-accent)">
                  {{ cleanerStore.dryRunPlan.primaryDeletes.length }}
                </strong>
                个{{ cleanerStore.activeModule.shortTitle }}
              </span>
              <span
                v-if="cascadeDeleteCount > 0"
                class="sbc-badge-amber rounded-md px-2 py-0.5 font-semibold"
              >
                + 连带清理 {{ cascadeDeleteCount }} 个关联项
              </span>
              <span
                v-if="cascadeProtectedCount > 0"
                class="sbc-badge-emerald rounded-md px-2 py-0.5 font-semibold"
              >
                智能保护 {{ cascadeProtectedCount }} 个共用项
              </span>
            </div>

            <div class="flex w-full items-center justify-end gap-2 sm:w-auto">
              <button
                type="button"
                :disabled="cleanerStore.dryRunPlan.primaryDeletes.length === 0"
                class="sbc-btn-secondary sbc-touch-target inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold disabled:opacity-40"
                @click="cleanerStore.downloadBackupOnly()"
              >
                <SvgIcon name="download" :size="15" />
                <span>导出备份</span>
              </button>

              <button
                type="button"
                :disabled="cleanerStore.dryRunPlan.primaryDeletes.length === 0"
                class="sbc-btn-danger sbc-touch-target inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold sm:flex-initial"
                @click="cleanerStore.openDryRunConfirm()"
              >
                <SvgIcon name="trash" :size="15" />
                <span>预演并清理 ({{ cleanerStore.dryRunPlan.primaryDeletes.length }})</span>
              </button>
            </div>
          </footer>
        </main>
      </div>
    </div>

    <DryRunModal />
    <SettingsDrawer />
  </div>
</template>

<script setup lang="ts">
import { CLEANER_MODULES } from '../core/registry';
import { useCleanerStore } from '../stores/cleaner.store';
import { useSettingsStore } from '../stores/settings.store';
import type { IconName } from '../types/cleaner';
import DryRunModal from './components/DryRunModal.vue';
import FilterToolbar from './components/FilterToolbar.vue';
import IosInstallBanner from './components/IosInstallBanner.vue';
import ItemCard from './components/ItemCard.vue';
import SettingsDrawer from './components/SettingsDrawer.vue';
import SvgIcon from './icons/SvgIcon.vue';

const cleanerStore = useCleanerStore();
const settingsStore = useSettingsStore();

const effectiveViewMode = computed<'grid' | 'list'>(() => {
  if (!cleanerStore.activeModule.supportsGridView) return 'list';
  return settingsStore.settings.viewMode;
});

const themeModeIcon = computed<IconName>(() => {
  const mode = settingsStore.settings.themeMode;
  if (mode === 'light') return 'sun';
  if (mode === 'dark') return 'moon';
  return 'auto_theme';
});

const themeModeLabel = computed<string>(() => {
  const mode = settingsStore.settings.themeMode;
  if (mode === 'light') return '日间';
  if (mode === 'dark') return '夜间';
  return '自动';
});

const cascadeDeleteCount = computed(
  () => cleanerStore.dryRunPlan.cascadeItems.filter(c => c.action === 'delete').length,
);

const cascadeProtectedCount = computed(
  () =>
    cleanerStore.dryRunPlan.cascadeItems.filter(c => c.action !== 'delete').length +
    cleanerStore.dryRunPlan.skippedPrimary.length,
);

function handleListScroll(e: Event): void {
  if (!cleanerStore.hasMoreItems) return;
  const el = e.target as HTMLElement | null;
  if (!el) return;
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 240) {
    cleanerStore.loadMoreVisibleItems();
  }
}
</script>
