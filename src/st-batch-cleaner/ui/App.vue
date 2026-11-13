<template>
  <div
    v-if="cleanerStore.isModalOpen"
    class="sbc-theme-root"
    :data-theme="settingsStore.resolvedTheme"
    :data-sbc-theme="settingsStore.resolvedTheme"
    style="position: fixed; inset: 0; z-index: 2147483000; display: flex; align-items: center; justify-content: center; pointer-events: auto; opacity: 1; visibility: visible;"
    role="dialog"
    aria-modal="true"
    aria-label="酒馆多合一批量清理大师"
    @click.self="cleanerStore.closeModal()"
  >
    <div class="sbc-modal-shell">

      <header class="sbc-header">
        <div class="sbc-header-brand">
          <div class="sbc-brand-logo">
            <SvgIcon name="broom" :size="19" />
          </div>
          <div class="sbc-brand-text">
            <div class="sbc-brand-title-row">
              <h1 class="sbc-brand-title">酒馆多合一批量清理大师</h1>
              <span class="sbc-badge sbc-badge-primary">
                <SvgIcon name="cloud" :size="11" />
                <span>{{ settingsStore.activeThrottleProfile.name }}</span>
              </span>
            </div>
            <p class="sbc-brand-sub">{{ cleanerStore.activeModule.description }}</p>
          </div>
        </div>

        <nav class="sbc-module-tabs" aria-label="资产模块切换">
          <button
            v-for="mod in modules"
            :key="mod.id"
            type="button"
            class="sbc-module-tab"
            :class="{ 'is-active': cleanerStore.activeModuleId === mod.id }"
            @click="cleanerStore.switchModule(mod.id)"
          >
            <SvgIcon :name="mod.icon" :size="15" class="sbc-tab-icon" />
            <span>{{ mod.title }}</span>
            <span class="sbc-tab-count">
              {{ cleanerStore.itemsByModule[mod.id]?.length ?? 0 }}
            </span>
            <span
              v-if="(cleanerStore.selectedMap[mod.id]?.length ?? 0) > 0"
              class="sbc-tab-sel-dot"
              title="已勾选待清理数量"
            >
              {{ cleanerStore.selectedMap[mod.id]?.length }}
            </span>
          </button>
        </nav>

        <div class="sbc-header-actions">
          <button
            type="button"
            class="sbc-btn sbc-btn-secondary"
            :title="`切换日/夜间主题 (当前: ${themeButtonLabel})`"
            @click="settingsStore.cycleThemeMode()"
          >
            <SvgIcon :name="themeIconName" :size="15" />
            <span>{{ themeButtonLabel }}</span>
          </button>

          <button
            type="button"
            class="sbc-btn sbc-btn-secondary"
            title="打开节流档位与快捷方式设置"
            @click="cleanerStore.isSettingsDrawerOpen = true"
          >
            <SvgIcon name="settings" :size="15" />
            <span>设置</span>
          </button>

          <button
            type="button"
            class="sbc-btn sbc-btn-secondary"
            :disabled="cleanerStore.isScanning || cleanerStore.progress.running"
            title="重新扫描酒馆资产关系图"
            @click="cleanerStore.refreshAll()"
          >
            <SvgIcon
              name="refresh"
              :size="15"
              :class="{ 'sbc-spin': cleanerStore.isScanning }"
            />
            <span>刷新</span>
          </button>

          <button
            type="button"
            class="sbc-btn-icon sbc-btn-secondary"
            title="关闭清理中心"
            @click="cleanerStore.closeModal()"
          >
            <SvgIcon name="close" :size="16" />
          </button>
        </div>
      </header>

      <IosInstallBanner />
      <CharacterCascadeBar v-if="cleanerStore.activeModuleId === 'character'" />
      <FilterToolbar />

      <main ref="scrollContainerRef" class="sbc-list-viewport" @scroll="handleScroll">
        <div
          v-if="cleanerStore.isScanning && cleanerStore.currentItems.length === 0"
          class="sbc-empty-state"
        >
          <div class="sbc-empty-icon">
            <SvgIcon name="refresh" :size="24" class="sbc-spin" />
          </div>
          <div style="font-weight: 700; color: var(--sbc-text-primary)">
            正在扫描酒馆三角引用图谱...
          </div>
          <div style="font-size: 12px">角色卡 · 世界书 · 用户面具依赖比对中</div>
        </div>

        <div
          v-else-if="cleanerStore.filteredItems.length === 0"
          class="sbc-empty-state"
        >
          <div class="sbc-empty-icon">
            <SvgIcon name="sparkles" :size="24" />
          </div>
          <div style="font-size: 14px; font-weight: 700; color: var(--sbc-text-primary)">
            {{ cleanerStore.currentItems.length === 0 ? '当前分类下暂无项目' : '没有匹配筛选条件的项目' }}
          </div>
          <div style="font-size: 12px">
            {{
              cleanerStore.filterMode === 'orphan'
                ? '太棒了！当前分类下没有检测到闲置孤儿资源'
                : '可以尝试清空搜索词或切换上方筛选标签'
            }}
          </div>
        </div>

        <template v-else>
          <div
            :class="
              settingsStore.settings.viewMode === 'grid' ? 'sbc-items-grid' : 'sbc-items-list'
            "
          >
            <ItemCard
              v-for="item in cleanerStore.visibleItems"
              :key="item.id"
              :item="item"
              :selected="cleanerStore.currentSelectedSet.has(item.id)"
              :disabled="!cleanerStore.isItemSelectable(item)"
              :view-mode="settingsStore.settings.viewMode"
              :fallback-icon="cleanerStore.activeModule.icon"
              @toggle="cleanerStore.toggleSelectItem(item)"
            />
          </div>

          <div v-if="cleanerStore.hasMoreItems" class="sbc-load-more-wrap">
            <button
              type="button"
              class="sbc-btn sbc-btn-secondary"
              @click="cleanerStore.loadMoreItems()"
            >
              <span>
                加载更多（已显示 {{ cleanerStore.visibleItems.length }} /
                {{ cleanerStore.filteredItems.length }} 项）
              </span>
            </button>
          </div>
        </template>
      </main>

      <footer class="sbc-footer">
        <div class="sbc-footer-stats">
          <span class="sbc-badge sbc-badge-neutral">
            共 <strong style="color: var(--sbc-text-primary)">{{ cleanerStore.currentItems.length }}</strong> 项
          </span>
          <span class="sbc-badge sbc-badge-amber">
            闲置孤儿 <strong style="color: var(--sbc-amber-text)">{{ orphanCount }}</strong> 项
          </span>
          <span class="sbc-badge sbc-badge-primary">
            已勾选 <strong style="color: var(--sbc-accent-text)">{{ selectedCount }}</strong> 项
          </span>
          <span v-if="cascadeDeleteCount > 0" class="sbc-badge sbc-badge-rose">
            联动清理 +{{ cascadeDeleteCount }} 项附属资源
          </span>
        </div>

        <div class="sbc-footer-actions">
          <button
            type="button"
            class="sbc-btn sbc-btn-secondary"
            :disabled="selectedCount === 0"
            title="仅导出当前选中项的 JSON 备份包，不执行删除"
            @click="cleanerStore.downloadBackupOnly()"
          >
            <SvgIcon name="download" :size="15" />
            <span>仅导出备份</span>
          </button>

          <button
            type="button"
            class="sbc-btn sbc-btn-danger"
            :disabled="selectedCount === 0"
            @click="cleanerStore.openDryRunConfirm()"
          >
            <SvgIcon name="trash" :size="15" />
            <span>安全预演并清理 ({{ selectedCount }})</span>
          </button>
        </div>
      </footer>
    </div>

      <DryRunModal />
      <SettingsDrawer />
  </div>
</template>


<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { CLEANER_MODULES } from '../core/registry';
import { useCleanerStore } from '../stores/cleaner.store';
import { useSettingsStore } from '../stores/settings.store';
import type { IconName } from '../types/cleaner';
import CharacterCascadeBar from './components/CharacterCascadeBar.vue';
import DryRunModal from './components/DryRunModal.vue';
import FilterToolbar from './components/FilterToolbar.vue';
import IosInstallBanner from './components/IosInstallBanner.vue';
import ItemCard from './components/ItemCard.vue';
import SettingsDrawer from './components/SettingsDrawer.vue';
import SvgIcon from './icons/SvgIcon.vue';

const cleanerStore = useCleanerStore();
const settingsStore = useSettingsStore();

const modules = CLEANER_MODULES;
const scrollContainerRef = ref<HTMLElement | null>(null);

const orphanCount = computed(() => cleanerStore.currentItems.filter(i => i.isOrphan).length);
const selectedCount = computed(() => cleanerStore.dryRunPlan.primaryDeletes.length);
const cascadeDeleteCount = computed(
  () =>
    cleanerStore.dryRunPlan.cascadeItems.filter(
      c => c.action === 'delete' && c.moduleId !== 'chat',
    ).length,
);

const themeIconName = computed<IconName>(() => {
  if (settingsStore.settings.themeMode === 'auto') return 'auto_theme';
  return settingsStore.resolvedTheme === 'dark' ? 'moon' : 'sun';
});

const themeButtonLabel = computed(() => {
  if (settingsStore.settings.themeMode === 'auto') return '自动';
  return settingsStore.resolvedTheme === 'dark' ? '夜间' : '日间';
});

function handleScroll(e: Event) {
  if (!cleanerStore.hasMoreItems) return;
  const el = e.target as HTMLElement | null;
  if (!el) return;
  if (el.scrollHeight - el.scrollTop - el.clientHeight < 180) {
    cleanerStore.loadMoreItems();
  }
}

watch(
  () => [cleanerStore.activeModuleId, cleanerStore.filterMode, cleanerStore.sortMode],
  () => {
    if (scrollContainerRef.value) {
      scrollContainerRef.value.scrollTop = 0;
    }
  },
);
</script>

