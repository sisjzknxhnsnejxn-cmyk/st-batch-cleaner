<template>
  <div
    v-if="cleanerStore.isSettingsDrawerOpen"
    class="sbc-drawer-backdrop"
    @click.self="cleanerStore.isSettingsDrawerOpen = false"
  >
    <aside class="sbc-drawer-panel">
      <!-- 抽屉顶栏 -->
      <header class="sbc-header">
        <div class="sbc-header-brand">
          <div class="sbc-brand-logo">
            <SvgIcon name="settings" :size="17" />
          </div>
          <div class="sbc-brand-text">
            <h3 class="sbc-brand-title">全局设置与防崩策略</h3>
            <p class="sbc-brand-sub">主题外观 · 云酒馆节流档位 · 快捷入口</p>
          </div>
        </div>
        <button
          type="button"
          class="sbc-btn-icon sbc-btn-secondary"
          @click="cleanerStore.isSettingsDrawerOpen = false"
        >
          <SvgIcon name="close" :size="16" />
        </button>
      </header>

      <!-- 抽屉内容 -->
      <div class="sbc-list-viewport" style="display: flex; flex-direction: column; gap: 14px">
        <!-- 1. 外观主题设置 -->
        <section class="sbc-section-box">
          <div style="display: flex; align-items: center; gap: 6px; font-weight: 700">
            <SvgIcon name="sun" :size="15" style="color: var(--sbc-accent)" />
            <span>外观主题配色</span>
          </div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px">
            <button
              v-for="opt in themeOptions"
              :key="opt.id"
              type="button"
              class="sbc-btn"
              :class="
                settingsStore.settings.themeMode === opt.id
                  ? 'sbc-btn-primary'
                  : 'sbc-btn-secondary'
              "
              @click="settingsStore.setThemeMode(opt.id)"
            >
              <SvgIcon :name="opt.icon" :size="14" />
              <span>{{ opt.label }}</span>
            </button>
          </div>
        </section>

        <!-- 2. 云酒馆防崩节流档位 -->
        <section class="sbc-section-box">
          <div style="display: flex; align-items: center; gap: 6px; font-weight: 700">
            <SvgIcon name="cloud" :size="15" style="color: var(--sbc-accent)" />
            <span>云酒馆防抖与节流档位</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 7px">
            <div
              v-for="preset in throttlePresets"
              :key="preset.id"
              class="sbc-card"
              :class="{
                'sbc-card-selected': settingsStore.settings.cloudThrottlePreset === preset.id,
              }"
              style="padding: 10px 12px"
              @click="settingsStore.setThrottlePreset(preset.id)"
            >
              <div style="display: flex; align-items: center; justify-content: space-between">
                <div style="display: flex; align-items: center; gap: 6px; font-weight: 700">
                  <span>{{ preset.name }}</span>
                  <span class="sbc-badge sbc-badge-primary">{{ preset.badge }}</span>
                </div>
                <span style="font-size: 11px; color: var(--sbc-text-muted)">
                  间隔 {{ preset.stepDelayMs }}ms / 每 {{ preset.batchSize }} 项冷却
                </span>
              </div>
              <div style="font-size: 11.5px; color: var(--sbc-text-secondary); margin-top: 4px">
                {{ preset.description }}
              </div>
            </div>
          </div>
        </section>

        <!-- 3. 快捷打开方式设置 -->
        <section class="sbc-section-box">
          <div style="display: flex; align-items: center; gap: 6px; font-weight: 700">
            <SvgIcon name="wand" :size="15" style="color: var(--sbc-accent)" />
            <span>快捷打开入口（无悬浮球零遮挡，支持多选组合）</span>
          </div>

          <label class="sbc-check-label">
            <input v-model="settingsStore.settings.shortcuts.enableMagicWandMenu" type="checkbox" />
            <div>
              <div style="font-weight: 700">聊天输入框旁「魔棒扩展菜单」入口（推荐）</div>
              <div style="font-size: 11px; color: var(--sbc-text-muted)">
                注入到酒馆 #extensionsMenu 列表中，不占用任何屏幕空间
              </div>
            </div>
          </label>

          <label class="sbc-check-label">
            <input v-model="settingsStore.settings.shortcuts.enableOptionsMenu" type="checkbox" />
            <div>
              <div style="font-weight: 700">左下角「汉堡主菜单 (#options)」入口</div>
              <div style="font-size: 11px; color: var(--sbc-text-muted)">
                注入到酒馆左下角齿轮/三条杠弹出的主菜单中
              </div>
            </div>
          </label>

          <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 4px">
            <span style="font-size: 11.5px; color: var(--sbc-text-muted)">
              PC 键盘快捷键：<strong style="color: var(--sbc-text-primary)">Alt + Shift + C</strong>
            </span>
          </div>
        </section>

        <!-- 4. 备份与数据安全选项 -->
        <section class="sbc-section-box">
          <div style="display: flex; align-items: center; gap: 6px; font-weight: 700">
            <SvgIcon name="shield" :size="15" style="color: var(--sbc-accent)" />
            <span>备份与安全防护选项</span>
          </div>

          <label class="sbc-check-label">
            <input v-model="settingsStore.settings.backupBeforeDelete" type="checkbox" />
            <div>
              <div style="font-weight: 700">删除前默认自动下载 JSON 备份包</div>
              <div style="font-size: 11px; color: var(--sbc-text-muted)">
                备份文件可直接用于还原误删的世界书、面具或角色卡元数据
              </div>
            </div>
          </label>

          <label class="sbc-check-label">
            <input v-model="settingsStore.settings.compactBackupJson" type="checkbox" />
            <div>
              <div style="font-weight: 700">紧凑化 JSON 备份体积（防 iOS/云端内存溢出）</div>
              <div style="font-size: 11px; color: var(--sbc-text-muted)">
                去除冗余空白缩进，降低大批量备份时的浏览器内存峰值
              </div>
            </div>
          </label>
        </section>
      </div>

      <!-- 抽屉底栏 -->
      <footer class="sbc-footer" style="justify-content: flex-end">
        <button
          type="button"
          class="sbc-btn sbc-btn-primary"
          @click="cleanerStore.isSettingsDrawerOpen = false"
        >
          <span>完成并保存</span>
        </button>
      </footer>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { CLOUD_THROTTLE_PROFILES } from '../../core/throttle';
import { useCleanerStore } from '../../stores/cleaner.store';
import { useSettingsStore } from '../../stores/settings.store';
import type { IconName, ThemeMode } from '../../types/cleaner';
import SvgIcon from '../icons/SvgIcon.vue';

const cleanerStore = useCleanerStore();
const settingsStore = useSettingsStore();

const throttlePresets = Object.values(CLOUD_THROTTLE_PROFILES);

const themeOptions: Array<{ id: ThemeMode; label: string; icon: IconName }> = [
  { id: 'dark', label: '深邃夜间', icon: 'moon' },
  { id: 'light', label: '温润日间', icon: 'sun' },
  { id: 'auto', label: '跟随系统', icon: 'auto_theme' },
];
</script>

