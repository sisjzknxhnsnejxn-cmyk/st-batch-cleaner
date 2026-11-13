<template>
  <div class="sbc-surface-elevated space-y-2.5 border-b px-3.5 py-3 sm:px-5">
    <!-- 第一行：搜索框 + 排序下拉 + 网格/列表切换 -->
    <div class="flex flex-wrap items-center justify-between gap-2.5">
      <!-- 250ms 防抖搜索框（移动端 16px 字号防 iOS 自动放大视口） -->
      <div class="relative min-w-[200px] flex-1">
        <SvgIcon
          name="search"
          :size="16"
          class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
          style="color: var(--sbc-text-muted)"
        />
        <input
          v-model="cleanerStore.searchQuery"
          type="text"
          placeholder="搜索名称、文件名、关联世界书或面具..."
          class="sbc-input w-full rounded-xl py-2 pr-8 pl-9 text-xs"
        />
        <button
          v-if="cleanerStore.searchQuery"
          type="button"
          class="sbc-touch-target absolute top-1/2 right-1.5 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg"
          style="color: var(--sbc-text-muted)"
          title="清空搜索词"
          @click="cleanerStore.searchQuery = ''"
        >
          <SvgIcon name="close" :size="14" />
        </button>
      </div>

      <!-- 排序与视图控制 -->
      <div class="flex items-center gap-2">
        <div class="relative flex items-center">
          <SvgIcon
            name="sort"
            :size="14"
            class="pointer-events-none absolute left-2.5"
            style="color: var(--sbc-text-muted)"
          />
          <select
            v-model="cleanerStore.sortMode"
            class="sbc-input rounded-xl py-1.5 pr-6 pl-7 text-xs font-medium"
            title="列表排序方式"
          >
            <option value="default">默认顺序</option>
            <option value="orphan_first">闲置无绑定优先</option>
            <option value="linked_first">有绑定引用优先</option>
            <option value="name_asc">名称 A → Z</option>
            <option value="name_desc">名称 Z → A</option>
          </select>
        </div>

        <!-- 网格 / 列表视图切换 -->
        <div
          v-if="cleanerStore.activeModule.supportsGridView"
          class="sbc-surface-muted flex items-center gap-0.5 rounded-xl border p-1"
        >
          <button
            type="button"
            class="rounded-lg p-1.5 transition"
            :class="
              settingsStore.settings.viewMode === 'grid'
                ? 'sbc-btn-primary'
                : 'opacity-75 hover:opacity-100'
            "
            title="网格卡片视图"
            @click="settingsStore.settings.viewMode = 'grid'"
          >
            <SvgIcon name="grid" :size="15" />
          </button>
          <button
            type="button"
            class="rounded-lg p-1.5 transition"
            :class="
              settingsStore.settings.viewMode === 'list'
                ? 'sbc-btn-primary'
                : 'opacity-75 hover:opacity-100'
            "
            title="紧凑列表视图"
            @click="settingsStore.settings.viewMode = 'list'"
          >
            <SvgIcon name="list" :size="15" />
          </button>
        </div>
      </div>
    </div>


    <!-- 第二行：状态筛选胶囊 + 批量选择动作 -->
    <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
      <div
        class="sbc-surface-muted flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border p-1"
      >
        <button
          v-for="tab in filterTabs"
          :key="tab.id"
          type="button"
          class="shrink-0 rounded-lg px-2.5 py-1 font-semibold transition"
          :class="
            cleanerStore.filterMode === tab.id
              ? 'sbc-btn-primary'
              : 'opacity-80 hover:opacity-100'
          "
          @click="cleanerStore.filterMode = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          class="sbc-btn-secondary inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold"
          @click="cleanerStore.selectAllFiltered()"
        >
          <SvgIcon name="check" :size="13" />
          <span>全选当前</span>
        </button>
        <button
          type="button"
          class="sbc-btn-secondary rounded-lg px-2.5 py-1 font-semibold"
          @click="cleanerStore.invertFilteredSelection()"
        >
          反选
        </button>
        <button
          type="button"
          class="sbc-badge-amber inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold transition hover:opacity-90"
          @click="cleanerStore.selectOnlyOrphans()"
        >
          <SvgIcon name="unlink" :size="13" />
          <span>选闲置项</span>
        </button>
        <button
          v-if="cleanerStore.currentSelectedSet.size > 0"
          type="button"
          class="sbc-btn-secondary rounded-lg px-2.5 py-1 font-medium"
          @click="cleanerStore.clearCurrentSelection()"
        >
          清空 ({{ cleanerStore.currentSelectedSet.size }})
        </button>

        <span class="ml-1 text-[11px]" style="color: var(--sbc-text-muted)">
          匹配 <strong style="color: var(--sbc-text-primary)">{{ cleanerStore.filteredItems.length }}</strong> / {{ cleanerStore.currentItems.length }}
        </span>
      </div>
    </div>

    <CharacterCascadeBar v-if="cleanerStore.activeModuleId === 'character'" />
  </div>
</template>

<script setup lang="ts">
import { useCleanerStore, type FilterPresetMode } from '../../stores/cleaner.store';
import { useSettingsStore } from '../../stores/settings.store';
import SvgIcon from '../icons/SvgIcon.vue';
import CharacterCascadeBar from './CharacterCascadeBar.vue';

const cleanerStore = useCleanerStore();
const settingsStore = useSettingsStore();

const filterTabs = computed<Array<{ id: FilterPresetMode; label: string }>>(() => {
  const base: Array<{ id: FilterPresetMode; label: string }> = [
    { id: 'all', label: '全部' },
    { id: 'orphan', label: '闲置无绑定' },
    { id: 'linked', label: '有绑定引用' },
  ];
  if (cleanerStore.activeModuleId === 'character') {
    base.push({ id: 'favorite', label: '已收藏' });
  }
  if (cleanerStore.currentSelectedSet.size > 0) {
    base.push({ id: 'selected', label: `已勾选 (${cleanerStore.currentSelectedSet.size})` });
  }
  return base;
});
</script>
