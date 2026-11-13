import { klona } from 'klona';
import _ from 'lodash';
import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { z } from 'zod';
import { getCloudThrottleProfile } from '../core/throttle';
import type { CloudThrottlePresetId, ThemeMode } from '../types/cleaner';

export const CleanerSettingsSchema = z
  .object({
    /** 外观主题：light (高对比日间) / dark (护眼深邃夜间) / auto (跟随系统) */
    themeMode: z.enum(['light', 'dark', 'auto']).default('dark'),
    /** 删除前默认自动下载 JSON 备份 */
    backupBeforeDelete: z.boolean().default(true),
    /** 导出备份时启用紧凑 JSON 序列化以减小内存与文件体积（防 iOS/云端闪退） */
    compactBackupJson: z.boolean().default(true),
    /** 默认保护已收藏的角色卡，防止批量误删 */
    protectFavoriteCharacters: z.boolean().default(true),
    /** 视图模式：卡片网格或紧凑列表 */
    viewMode: z.enum(['grid', 'list']).default('grid'),
    /** 云酒馆防抖与节流档位（默认开启云酒馆稳妥模式） */
    cloudThrottlePreset: z.enum(['cloud_safe', 'ultra_stable', 'local_fast']).default('cloud_safe'),
    /** 快捷方式配置（彻底移除顶部栏与悬浮球，支持魔棒扩展菜单、左下角汉堡菜单与脚本按钮自由组合） */
    shortcuts: z
      .object({
        /** 酒馆输入框旁魔棒扩展菜单 (#extensionsMenu) */
        enableMagicWandMenu: z.boolean().default(true),
        /** 酒馆左下角汉堡主菜单 (#options) */
        enableOptionsMenu: z.boolean().default(false),
      })
      .prefault({}),
    /** 是否已关闭过 iOS 主动添加到主屏幕引导卡片 */
    iosInstallDismissed: z.boolean().default(false),
    /** 角色卡清理联动选项 */
    characterCascade: z
      .object({
        deleteLinkedWorldbooks: z.boolean().default(false),
        protectSharedWorldbooks: z.boolean().default(true),
        deleteLinkedPersonas: z.boolean().default(false),
        protectSharedPersonas: z.boolean().default(true),
        deleteChats: z.boolean().default(true),
      })
      .prefault({}),
  })
  .prefault({});

export type CleanerSettings = z.infer<typeof CleanerSettingsSchema>;

export const useSettingsStore = defineStore('st-batch-cleaner-settings', () => {
  const loadInitialSettings = (): CleanerSettings => {
    try {
      const raw = getVariables({ type: 'script', script_id: getScriptId() });
      return CleanerSettingsSchema.parse(raw ?? {});
    } catch (err) {
      console.warn('[st-batch-cleaner] 读取脚本设置失败，采用默认值:', err);
      return CleanerSettingsSchema.parse({});
    }
  };

  const settings = ref<CleanerSettings>(loadInitialSettings());

  // 监听系统暗色模式变化，用于 themeMode === 'auto'
  const systemPrefersDark = ref<boolean>(
    Boolean((window.parent ?? window).matchMedia?.('(prefers-color-scheme: dark)').matches),
  );

  try {
    const mql = (window.parent ?? window).matchMedia?.('(prefers-color-scheme: dark)');
    mql?.addEventListener?.('change', e => {
      systemPrefersDark.value = e.matches;
    });
  } catch {
    // 忽略低版本浏览器兼容异常
  }

  /** 当前实际生效的明暗主题 ('light' | 'dark') */
  const resolvedTheme = computed<'light' | 'dark'>(() => {
    if (settings.value.themeMode === 'auto') {
      return systemPrefersDark.value ? 'dark' : 'light';
    }
    return settings.value.themeMode;
  });

  /** 当前激活的节流档位配置 */
  const activeThrottleProfile = computed(() =>
    getCloudThrottleProfile(settings.value.cloudThrottlePreset),
  );

  /** 一键循环或切换日夜主题 */
  function cycleThemeMode(): void {
    const order: ThemeMode[] = ['light', 'dark', 'auto'];
    const nextIdx = (order.indexOf(settings.value.themeMode) + 1) % order.length;
    settings.value.themeMode = order[nextIdx];
  }

  function setThemeMode(mode: ThemeMode): void {
    settings.value.themeMode = mode;
  }

  function setThrottlePreset(preset: CloudThrottlePresetId): void {
    settings.value.cloudThrottlePreset = preset;
  }

  // 防抖写入酒馆脚本变量，避免频繁点击开关时高频读写
  const persistSettingsDebounced = _.debounce((snapshot: CleanerSettings) => {
    try {
      replaceVariables(snapshot, { type: 'script', script_id: getScriptId() });
    } catch (err) {
      console.warn('[st-batch-cleaner] 保存脚本设置警告:', err);
    }
  }, 220);

  watch(
    settings,
    val => {
      persistSettingsDebounced(klona(val));
    },
    { deep: true },
  );

  return {
    settings,
    resolvedTheme,
    activeThrottleProfile,
    cycleThemeMode,
    setThemeMode,
    setThrottlePreset,
  };
});

