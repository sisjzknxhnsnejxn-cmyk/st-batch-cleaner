<template>
  <div class="sbc-toolbar">
    <!-- 第一行：搜索框 + 状态筛选胶囊 -->
    <div class="sbc-toolbar-row">
      <div class="sbc-search-box">
        <span class="sbc-search-icon">
          <SvgIcon name="search" :size="15" />
        </span>
        <input
          v-model="cleanerStore.searchQuery"
          type="text"
          placeholder="搜索名称、文件名、关联标签..."
          class="sbc-input"
        />
        <button
          v-if="cleanerStore.searchQuery"
          type="button"
          class="sbc-search-clear"
          title="清空搜索词"
          @click="cleanerStore.searchQuery = ''"
        >
          <SvgIcon name="close" :size="13" />
        </button>
      </div>

      <!-- 分类过滤胶囊组 -->
      <div class="sbc-filter-pills">
        <button
          v-for="tab in filterTabs"
          :key="tab.value"
          type="button"
          class="sbc-pill"
          :class="{ 'is-active': cleanerStore.filterMode === tab.value }"
          @click="cleanerStore.filterMode = tab.value"
        >
          <span>{{ tab.label }}</span>
          <span class="sbc-pill-count">{{ tab.count }}</span>
        </button>
      </div>
    </div>

    <!-- 第二行：排序、视图切换与一键批量操作 -->
    <div class="sbc-toolbar-row">
      <div class="sbc-toolbar-controls">
        <!-- 排序下拉框 -->
        <div class="sbc-select-wrap">
          <SvgIcon name="sort" :size="14" />
          <select v-model="cleanerStore.sortMode" class="sbc-select" title="列表排序方式">
            <option value="default">默认排序</option>
            <option value="orphan_first">闲置孤儿优先</option>
            <option value="linked_first">已绑定优先</option>
            <option value="name_asc">名称 A → Z</option>
            <option value="name_desc">名称 Z → A</option>
          </select>
        </div>

        <!-- 网格 / 列表视图切换 -->
        <div class="sbc-view-switch" title="切换卡片网格或紧凑列表视图">
          <button
            type="button"
            class="sbc-view-btn"
            :class="{ 'is-active': settingsStore.settings.viewMode === 'grid' }"
            title="立绘卡片网格视图"
            @click="settingsStore.settings.viewMode = 'grid'"
          >
            <SvgIcon name="grid" :size="14" />
          </button>
          <button
            type="button"
            class="sbc-view-btn"
            :class="{ 'is-active': settingsStore.settings.viewMode === 'list' }"
            title="紧凑单行列表视图"
            @click="settingsStore.settings.viewMode = 'list'"
          >
            <SvgIcon name="list" :size="14" />
          </button>
        </div>

        <span style="font-size: 11.5px; color: var(--sbc-text-muted)">
          当前显示 <strong style="color: var(--sbc-text-primary)">{{ cleanerStore.filteredItems.length }}</strong> 项
        </span>
      </div>

      <!-- 右侧批量选择动作组 -->
      <div class="sbc-toolbar-controls">
        <button
          type="button"
          class="sbc-btn sbc-btn-accent-soft"
          title="自动勾选当前模块下所有未被任何地方引用的孤儿/闲置项"
          @click="cleanerStore.selectOnlyOrphans()"
        >
          <SvgIcon name="sparkles" :size="14" />
          <span>智能全选闲置孤儿 ({{ orphanCount }})</span>
        </button>

        <button
          type="button"
          class="sbc-btn sbc-btn-secondary"
          @click="cleanerStore.selectAllFiltered()"
        >
          全选当前结果
        </button>

        <button
          type="button"
          class="sbc-btn sbc-btn-secondary"
          @click="cleanerStore.invertFilteredSelection()"
        >
          反选
        </button>

        <button
          v-if="selectedCount > 0"
          type="button"
          class="sbc-btn sbc-btn-secondary"
          style="color: var(--sbc-danger-text); border-color: var(--sbc-danger-border)"
          @click="cleanerStore.clearCurrentSelection()"
        >
          清空勾选 ({{ selectedCount }})
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useCleanerStore, type FilterPresetMode } from '../../stores/cleaner.store';
import { useSettingsStore } from '../../stores/settings.store';
import SvgIcon from '../icons/SvgIcon.vue';

const cleanerStore = useCleanerStore();
const settingsStore = useSettingsStore();

const totalCount = computed(() => cleanerStore.currentItems.length);
const orphanCount = computed(() => cleanerStore.currentItems.filter(i => i.isOrphan).length);
const linkedCount = computed(() => cleanerStore.currentItems.filter(i => !i.isOrphan).length);
const favCount = computed(() => cleanerStore.currentItems.filter(i => i.isFavorite).length);
const selectedCount = computed(() => cleanerStore.currentSelectedSet.size);

const filterTabs = computed(() => {
  const tabs: Array<{ value: FilterPresetMode; label: string; count: number }> = [
    { value: 'all', label: '全部', count: totalCount.value },
    { value: 'orphan', label: '闲置/孤儿', count: orphanCount.value },
    { value: 'linked', label: '已绑定', count: linkedCount.value },
  ];
  if (cleanerStore.activeModuleId === 'character') {
    tabs.push({ value: 'favorite', label: '已收藏', count: favCount.value });
  }
  tabs.push({ value: 'selected', label: '已勾选', count: selectedCount.value });
  return tabs;
});
</script>
