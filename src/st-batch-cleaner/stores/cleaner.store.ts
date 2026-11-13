import _ from 'lodash';
import { defineStore } from 'pinia';
import toastr from 'toastr';
import { computed, ref, shallowRef, watch } from 'vue';
import { createAndDownloadBackup } from '../core/backup';
import { buildDependencyGraph, type DependencyGraph } from '../core/dependency-graph';
import { executeDryRunPlan } from '../core/executor';
import { CLEANER_MODULES, getCleanerModule } from '../core/registry';
import { getCloudThrottleProfile } from '../core/throttle';
import type {
  CleanableItem,
  CleanerModuleId,
  DryRunPlan,
  ExecutionProgress,
  SortMode,
} from '../types/cleaner';
import { useSettingsStore } from './settings.store';

export type FilterPresetMode = 'all' | 'orphan' | 'linked' | 'favorite' | 'selected';

/** 增量分页步长：避免一次渲染几百张高清卡片引发移动端 WebView 内存卡顿 */
const RENDER_CHUNK_SIZE = 60;

export const useCleanerStore = defineStore('st-batch-cleaner-main', () => {
  const settingsStore = useSettingsStore();

  const isModalOpen = ref(false);
  const isConfirmModalOpen = ref(false);
  const isSettingsDrawerOpen = ref(false);
  const activeModuleId = ref<CleanerModuleId>('character');

  /** 输入框实时绑定文本 */
  const searchQuery = ref('');
  /** 250ms 防抖后的搜索词（防手机端输入卡顿） */
  const debouncedQuery = ref('');
  const filterMode = ref<FilterPresetMode>('all');
  const sortMode = ref<SortMode>('default');
  const renderLimit = ref(RENDER_CHUNK_SIZE);
  const isScanning = ref(false);
  const abortFlag = ref(false);
  const pauseFlag = ref(false);

  const graph = shallowRef<DependencyGraph | null>(null);
  const itemsByModule = shallowRef<Record<CleanerModuleId, CleanableItem[]>>({
    character: [],
    worldbook: [],
    persona: [],
  });

  const selectedMap = ref<Record<CleanerModuleId, string[]>>({
    character: [],
    worldbook: [],
    persona: [],
  });

  const progress = ref<ExecutionProgress>({
    running: false,
    paused: false,
    abortRequested: false,
    phase: 'idle',
    currentStep: 0,
    totalSteps: 0,
    currentLabel: '',
    logs: [],
  });

  const syncDebouncedSearch = _.debounce((val: string) => {
    debouncedQuery.value = val.trim().toLowerCase();
    renderLimit.value = RENDER_CHUNK_SIZE;
  }, 250);

  watch(searchQuery, val => {
    syncDebouncedSearch(val);
  });

  watch([filterMode, sortMode, activeModuleId], () => {
    renderLimit.value = RENDER_CHUNK_SIZE;
  });

  const activeModule = computed(() => getCleanerModule(activeModuleId.value));
  const currentItems = computed(() => itemsByModule.value[activeModuleId.value] ?? []);
  const currentSelectedSet = computed(() => new Set(selectedMap.value[activeModuleId.value] ?? []));

  const filteredItems = computed(() => {
    const q = debouncedQuery.value;
    const mode = filterMode.value;
    const selSet = currentSelectedSet.value;

    const matched = currentItems.value.filter(item => {
      if (mode === 'orphan' && !item.isOrphan) return false;
      if (mode === 'linked' && item.isOrphan) return false;
      if (mode === 'favorite' && !item.isFavorite) return false;
      if (mode === 'selected' && !selSet.has(item.id)) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        (item.subtitle ?? '').toLowerCase().includes(q) ||
        item.badges.some(
          b => b.label.toLowerCase().includes(q) || (b.tooltip ?? '').toLowerCase().includes(q),
        )
      );
    });

    if (sortMode.value === 'default') return matched;

    const sorted = [...matched];
    sorted.sort((a, b) => {
      if (sortMode.value === 'name_asc') return a.name.localeCompare(b.name, 'zh-CN');
      if (sortMode.value === 'name_desc') return b.name.localeCompare(a.name, 'zh-CN');
      if (sortMode.value === 'orphan_first') {
        if (Boolean(a.isOrphan) !== Boolean(b.isOrphan)) return a.isOrphan ? -1 : 1;
        return a.name.localeCompare(b.name, 'zh-CN');
      }
      if (sortMode.value === 'linked_first') {
        if (Boolean(a.isOrphan) !== Boolean(b.isOrphan)) return a.isOrphan ? 1 : -1;
        return a.name.localeCompare(b.name, 'zh-CN');
      }
      return 0;
    });
    return sorted;
  });

  /** 当前实际渲染到 DOM 的切片（增量渲染防 DOM 过载） */
  const visibleItems = computed(() => filteredItems.value.slice(0, renderLimit.value));
  const visibleFilteredItems = visibleItems;
  const hasMoreItems = computed(() => filteredItems.value.length > renderLimit.value);

  function loadMoreItems(): void {
    renderLimit.value += RENDER_CHUNK_SIZE;
  }

  const loadMoreVisibleItems = loadMoreItems;

  const dryRunPlan = computed<DryRunPlan>(() => {
    const g = graph.value;
    if (!g || currentSelectedSet.value.size === 0) {
      return {
        moduleId: activeModuleId.value,
        primaryDeletes: [],
        skippedPrimary: [],
        cascadeItems: [],
        warnings: [],
      };
    }

    const basePlan = activeModule.value.buildDryRun(
      currentItems.value,
      currentSelectedSet.value,
      settingsStore.settings.characterCascade,
      settingsStore.settings.protectFavoriteCharacters,
      g,
    );

    const profile = getCloudThrottleProfile(settingsStore.settings.cloudThrottlePreset);
    const warnings = [...basePlan.warnings];
    if (basePlan.primaryDeletes.length > profile.recommendedMaxItems) {
      warnings.push(
        `单次选中了 ${basePlan.primaryDeletes.length} 项（超过「${profile.name}」建议单批 ${profile.recommendedMaxItems} 项）。执行器将每 ${profile.batchSize} 项自动暂停 ${(profile.batchCooldownMs / 1000).toFixed(1)} 秒释放云端 I/O 与内存，请耐心等待或中途随时点击「安全停止」。`,
      );
    }

    return {
      ...basePlan,
      warnings,
    };
  });

  const yieldFrame = () => new Promise<void>(resolve => setTimeout(resolve, 0));

  async function refreshAll(): Promise<void> {
    if (isScanning.value || progress.value.running) return;
    isScanning.value = true;
    try {
      await yieldFrame();
      const nextGraph = buildDependencyGraph();
      graph.value = nextGraph;

      const nextItemsMap: Record<CleanerModuleId, CleanableItem[]> = {
        character: [],
        worldbook: [],
        persona: [],
      };

      for (const mod of CLEANER_MODULES) {
        await yieldFrame();
        const scanned = mod.scan(nextGraph);
        nextItemsMap[mod.id] = scanned;
        const validIdSet = new Set(scanned.map(i => i.id));
        selectedMap.value[mod.id] = (selectedMap.value[mod.id] ?? []).filter(id =>
          validIdSet.has(id),
        );
      }
      itemsByModule.value = nextItemsMap;
    } catch (err) {
      console.error('[st-batch-cleaner] 扫描资产图谱失败:', err);
      toastr.error(`扫描酒馆资产失败: ${String(err)}`, '批量清理中心');
    } finally {
      isScanning.value = false;
    }
  }

  function openModal(): void {
    isModalOpen.value = true;
    void refreshAll();
  }

  function closeModal(): void {
    if (progress.value.running) {
      toastr.warning('正在执行清理任务，请先点击「安全停止」或等待任务结束');
      return;
    }
    isModalOpen.value = false;
    isConfirmModalOpen.value = false;
    isSettingsDrawerOpen.value = false;
  }

  function toggleModal(): void {
    if (isModalOpen.value) {
      closeModal();
    } else {
      openModal();
    }
  }

  function handleEscapeKey(): void {
    if (!isModalOpen.value) return;
    if (isSettingsDrawerOpen.value) {
      isSettingsDrawerOpen.value = false;
      return;
    }
    if (isConfirmModalOpen.value) {
      if (!progress.value.running) {
        isConfirmModalOpen.value = false;
      }
      return;
    }
    closeModal();
  }

  function switchModule(moduleId: CleanerModuleId): void {
    activeModuleId.value = moduleId;
    searchQuery.value = '';
    debouncedQuery.value = '';
    filterMode.value = 'all';
    renderLimit.value = RENDER_CHUNK_SIZE;
  }

  function isItemSelectable(item: CleanableItem): boolean {
    if (item.isSystemProtected) return false;
    if (
      activeModuleId.value === 'character' &&
      settingsStore.settings.protectFavoriteCharacters &&
      item.isFavorite
    ) {
      return false;
    }
    return true;
  }

  function toggleSelectItem(item: CleanableItem): void {
    if (!isItemSelectable(item)) {
      if (item.isFavorite) {
        toastr.info('该角色已收藏，受「收藏保护锁」保护。如需选中请先关闭联动栏的收藏保护开关。');
      } else if (item.protectedReason) {
        toastr.info(item.protectedReason);
      }
      return;
    }
    const modId = activeModuleId.value;
    const list = selectedMap.value[modId] ?? [];
    const idx = list.indexOf(item.id);
    if (idx >= 0) {
      selectedMap.value = {
        ...selectedMap.value,
        [modId]: list.filter(id => id !== item.id),
      };
    } else {
      selectedMap.value = {
        ...selectedMap.value,
        [modId]: [...list, item.id],
      };
    }
  }

  function selectAllFiltered(): void {
    const modId = activeModuleId.value;
    const currentSet = new Set(selectedMap.value[modId] ?? []);
    for (const item of filteredItems.value) {
      if (isItemSelectable(item)) currentSet.add(item.id);
    }
    selectedMap.value = {
      ...selectedMap.value,
      [modId]: [...currentSet],
    };
  }

  function invertFilteredSelection(): void {
    const modId = activeModuleId.value;
    const currentSet = new Set(selectedMap.value[modId] ?? []);
    for (const item of filteredItems.value) {
      if (!isItemSelectable(item)) continue;
      if (currentSet.has(item.id)) currentSet.delete(item.id);
      else currentSet.add(item.id);
    }
    selectedMap.value = {
      ...selectedMap.value,
      [modId]: [...currentSet],
    };
  }

  function selectOnlyOrphans(): void {
    const modId = activeModuleId.value;
    const orphanIds = currentItems.value
      .filter(item => item.isOrphan && isItemSelectable(item))
      .map(item => item.id);
    selectedMap.value = {
      ...selectedMap.value,
      [modId]: orphanIds,
    };
    if (orphanIds.length === 0) {
      toastr.info('当前分类下没有检测到闲置/未绑定项');
    } else {
      toastr.success(`已智能选中 ${orphanIds.length} 个闲置未绑定项`);
    }
  }

  function clearCurrentSelection(): void {
    const modId = activeModuleId.value;
    selectedMap.value = {
      ...selectedMap.value,
      [modId]: [],
    };
  }


  function openDryRunConfirm(): void {
    if (dryRunPlan.value.primaryDeletes.length === 0) {
      toastr.warning('请先至少勾选 1 个可清理的项目');
      return;
    }
    abortFlag.value = false;
    pauseFlag.value = false;
    progress.value = {
      running: false,
      paused: false,
      abortRequested: false,
      phase: 'idle',
      currentStep: 0,
      totalSteps: 0,
      currentLabel: '',
      logs: [],
    };
    isConfirmModalOpen.value = true;
  }

  function togglePauseExecution(): void {
    if (!progress.value.running) return;
    pauseFlag.value = !pauseFlag.value;
    progress.value.paused = pauseFlag.value;
  }

  function requestAbortExecution(): void {
    if (!progress.value.running) return;
    abortFlag.value = true;
    pauseFlag.value = false;
    progress.value.paused = false;
    progress.value.abortRequested = true;
    progress.value.currentLabel = '已请求安全停止，正在等待当前单项完成...';
    toastr.info('已发送安全停止信号，当前单项完成后将立即停止并同步酒馆状态');
  }

  const abortCurrentExecution = requestAbortExecution;

  async function downloadBackupOnly(): Promise<void> {
    try {
      const res = await createAndDownloadBackup(
        dryRunPlan.value,
        undefined,
        settingsStore.settings.compactBackupJson,
      );
      toastr.success(`已导出备份包: ${res.filename}（共 ${res.recordCount} 条记录）`, '备份完成');
    } catch (err) {
      toastr.error(`导出备份失败: ${String(err)}`, '备份错误');
    }
  }

  async function executeCurrentPlan(): Promise<void> {
    if (progress.value.running) return;
    abortFlag.value = false;
    pauseFlag.value = false;
    try {
      const result = await executeDryRunPlan(
        dryRunPlan.value,
        {
          enableBackupBeforeDelete: settingsStore.settings.backupBeforeDelete,
          compactBackupJson: settingsStore.settings.compactBackupJson,
          throttlePreset: settingsStore.settings.cloudThrottlePreset,
          cascadeOptions: settingsStore.settings.characterCascade,
          shouldAbort: () => abortFlag.value,
          shouldPause: () => pauseFlag.value,
        },
        updater => updater(progress.value),
      );
      selectedMap.value[activeModuleId.value] = [];
      refreshAll();
      if (result.aborted) {
        toastr.warning(`已安全停止：本次完成 ${result.successCount} 项`, '批量清理中心');
      } else {
        toastr.success(`批量清理完成：成功清理 ${result.successCount} 项`, '批量清理中心');
      }
    } catch (err) {
      toastr.error(`清理执行中断: ${String(err)}`, '批量清理中心');
    }
  }

  return {
    isModalOpen,
    isConfirmModalOpen,
    isSettingsDrawerOpen,
    activeModuleId,
    searchQuery,
    filterMode,
    sortMode,
    isScanning,
    itemsByModule,
    selectedMap,
    progress,
    activeModule,
    currentItems,
    currentSelectedSet,
    filteredItems,
    visibleItems,
    visibleFilteredItems,
    hasMoreItems,
    loadMoreItems,
    loadMoreVisibleItems,
    dryRunPlan,
    refreshAll,
    openModal,
    closeModal,
    toggleModal,
    handleEscapeKey,
    switchModule,

    isItemSelectable,
    toggleSelectItem,
    selectAllFiltered,
    invertFilteredSelection,
    selectOnlyOrphans,
    clearCurrentSelection,
    openDryRunConfirm,
    togglePauseExecution,
    requestAbortExecution,
    abortCurrentExecution,
    downloadBackupOnly,
    executeCurrentPlan,
  };
});

