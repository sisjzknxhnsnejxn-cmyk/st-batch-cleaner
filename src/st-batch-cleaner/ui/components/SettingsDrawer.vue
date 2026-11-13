<template>
  <div
    v-if="cleanerStore.isSettingsDrawerOpen"
    class="sbc-backdrop fixed inset-0 z-[10002] flex items-center justify-end"
    @click.self="cleanerStore.isSettingsDrawerOpen = false"
  >
    <div
      class="sbc-panel flex h-full w-full max-w-md flex-col border-l"
      style="padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px)"
    >
      <!-- 顶部标题栏 -->
      <div class="sbc-surface-elevated flex items-center justify-between border-b px-5 py-4">
        <div class="flex items-center gap-2.5">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <SvgIcon name="settings" :size="17" />
          </div>
          <div>
            <h3 class="text-sm font-bold">偏好设置与防崩护航</h3>
            <p class="text-[11px]" style="color: var(--sbc-text-muted)">
              当前环境：{{ platform.deviceLabel }}
            </p>
          </div>
        </div>
        <button
          type="button"
          class="sbc-btn-secondary sbc-touch-target flex h-9 w-9 items-center justify-center rounded-lg"
          title="关闭设置面板"
          @click="cleanerStore.isSettingsDrawerOpen = false"
        >
          <SvgIcon name="close" :size="18" />
        </button>
      </div>

      <!-- 主体滚动区 -->
      <div class="sbc-scroll-area flex-1 space-y-5 p-5 text-xs">
        <!-- 1. 日间 / 夜间高对比度主题 -->
        <section class="sbc-surface-elevated space-y-3 rounded-xl border p-4">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold">外观主题（高对比度护眼适配）</span>
            <span class="sbc-badge-primary rounded-md px-2 py-0.5 text-[11px] font-semibold">
              当前生效：{{ settingsStore.resolvedTheme === 'dark' ? '夜间深色' : '日间浅色' }}
            </span>
          </div>

          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="opt in themeOptions"
              :key="opt.id"
              type="button"
              class="sbc-touch-target flex flex-col items-center justify-center gap-1.5 rounded-xl border p-2.5 font-semibold transition"
              :class="
                settingsStore.settings.themeMode === opt.id
                  ? 'sbc-card-selected'
                  : 'sbc-btn-secondary'
              "
              @click="settingsStore.setThemeMode(opt.id)"
            >
              <SvgIcon :name="opt.icon" :size="18" />
              <span>{{ opt.label }}</span>
            </button>
          </div>
        </section>

        <!-- 2. 三合一快捷入口管理（已移除旧版顶部栏） -->
        <section class="sbc-surface-elevated space-y-3 rounded-xl border p-4">
          <div>
            <div class="text-xs font-bold">酒馆快捷入口方式（可多选组合）</div>
            <p class="mt-0.5 text-[11px]" style="color: var(--sbc-text-muted)">
              已彻底移除原顶部栏入口，避免拥挤遮挡；开关实时生效。
            </p>
          </div>

          <label class="sbc-surface-muted flex cursor-pointer items-start gap-3 rounded-xl border p-3">
            <input
              v-model="settingsStore.settings.shortcuts.enableFloatingBall"
              type="checkbox"
              class="mt-0.5 h-4 w-4 rounded accent-indigo-600"
            />
            <div class="flex-1">
              <div class="flex items-center gap-1.5 font-bold">
                <SvgIcon name="float_ball" :size="15" />
                <span>启用贴边磁吸悬浮球（推荐手机/平板）</span>
              </div>
              <p class="mt-0.5 text-[11px]" style="color: var(--sbc-text-secondary)">
                平时半隐藏贴在屏幕边缘不挡聊天，支持手指或鼠标按住任意上下左右拖动并记忆位置。
              </p>
            </div>
          </label>

          <label class="sbc-surface-muted flex cursor-pointer items-start gap-3 rounded-xl border p-3">
            <input
              v-model="settingsStore.settings.shortcuts.enableMagicWandMenu"
              type="checkbox"
              class="mt-0.5 h-4 w-4 rounded accent-indigo-600"
            />
            <div class="flex-1">
              <div class="flex items-center gap-1.5 font-bold">
                <SvgIcon name="wand" :size="15" />
                <span>挂载到聊天框旁「魔棒扩展菜单」</span>
              </div>
              <p class="mt-0.5 text-[11px]" style="color: var(--sbc-text-secondary)">
                在酒馆底部输入框左侧的魔棒图标菜单中显示「资产批量清理中心」。
              </p>
            </div>
          </label>

          <label class="sbc-surface-muted flex cursor-pointer items-start gap-3 rounded-xl border p-3">
            <input
              v-model="settingsStore.settings.shortcuts.enableOptionsMenu"
              type="checkbox"
              class="mt-0.5 h-4 w-4 rounded accent-indigo-600"
            />
            <div class="flex-1">
              <div class="flex items-center gap-1.5 font-bold">
                <SvgIcon name="menu" :size="15" />
                <span>挂载到左下角「汉堡主菜单」</span>
              </div>
              <p class="mt-0.5 text-[11px]" style="color: var(--sbc-text-secondary)">
                在酒馆左下角三横线主菜单内添加「批量清理中心」快捷项。
              </p>
            </div>
          </label>

          <div class="flex items-center justify-between pt-1">
            <span class="text-[11px]" style="color: var(--sbc-text-muted)">
              PC 快捷键：<kbd class="sbc-badge-neutral rounded px-1.5 py-0.5 font-mono">Alt + Shift + C</kbd>
            </span>
            <button
              type="button"
              class="sbc-btn-secondary rounded-lg px-2.5 py-1.5 text-[11px] font-semibold"
              @click="handleResetBall"
            >
              重置悬浮球位置
            </button>
          </div>
        </section>
        <!-- 3. 云酒馆防抖与节流防崩档位 -->
        <section class="sbc-surface-elevated space-y-3 rounded-xl border p-4">
          <div class="flex items-center gap-1.5">
            <SvgIcon name="cloud" :size="16" class="text-indigo-500" />
            <span class="text-xs font-bold">云酒馆 / 移动端防崩节流档位</span>
          </div>
          <p class="text-[11px] leading-relaxed" style="color: var(--sbc-text-secondary)">
            云酒馆容器通常具有严格的磁盘 I/O 与网关并发限制。开启稳妥节流可自动分批冷却喘息，防止高频删除引发 502 崩溃或卡死。
          </p>

          <div class="space-y-2">
            <button
              v-for="profile in throttleList"
              :key="profile.id"
              type="button"
              class="w-full rounded-xl border p-3 text-left transition"
              :class="
                settingsStore.settings.cloudThrottlePreset === profile.id
                  ? 'sbc-card-selected'
                  : 'sbc-btn-secondary'
              "
              @click="settingsStore.setThrottlePreset(profile.id)"
            >
              <div class="flex items-center justify-between">
                <span class="font-bold">{{ profile.name }}</span>
                <span class="sbc-badge-primary rounded px-2 py-0.5 text-[10px] font-semibold">
                  {{ profile.badge }}
                </span>
              </div>
              <p class="mt-1 text-[11px] leading-relaxed" style="color: var(--sbc-text-secondary)">
                {{ profile.description }}
              </p>
            </button>
          </div>
        </section>

        <!-- 4. 安全备份与 iOS 引导设置 -->
        <section class="sbc-surface-elevated space-y-3 rounded-xl border p-4">
          <div class="text-xs font-bold">数据备份与系统适配</div>

          <label class="sbc-surface-muted flex cursor-pointer items-start gap-3 rounded-xl border p-3">
            <input
              v-model="settingsStore.settings.backupBeforeDelete"
              type="checkbox"
              class="mt-0.5 h-4 w-4 rounded accent-indigo-600"
            />
            <div>
              <div class="font-bold">执行物理删除前自动下载 JSON 备份包</div>
              <p class="mt-0.5 text-[11px]" style="color: var(--sbc-text-secondary)">
                强烈建议保持开启，误删后可随时通过备份找回角色设定与世界书条目。
              </p>
            </div>
          </label>

          <label class="sbc-surface-muted flex cursor-pointer items-start gap-3 rounded-xl border p-3">
            <input
              v-model="settingsStore.settings.compactBackupJson"
              type="checkbox"
              class="mt-0.5 h-4 w-4 rounded accent-indigo-600"
            />
            <div>
              <div class="font-bold">使用紧凑型 JSON 序列化（防 iOS/手机内存溢出）</div>
              <p class="mt-0.5 text-[11px]" style="color: var(--sbc-text-secondary)">
                去除多余缩进空格，大幅降低大批量备份时的浏览器内存峰值。
              </p>
            </div>
          </label>

          <div
            v-if="platform.isIOS"
            class="sbc-badge-primary flex items-center justify-between rounded-xl p-3"
          >
            <div>
              <div class="font-bold">iOS 添加到主屏幕全屏指南</div>
              <div class="text-[11px] opacity-90">
                状态：{{ platform.isStandalone ? '已处于独立全屏模式' : '当前为浏览器标签页模式' }}
              </div>
            </div>
            <button
              v-if="!platform.isStandalone && settingsStore.settings.iosInstallDismissed"
              type="button"
              class="sbc-btn-secondary rounded-lg px-2.5 py-1 text-[11px] font-semibold"
              @click="settingsStore.settings.iosInstallDismissed = false"
            >
              重新显示指引
            </button>
          </div>
        </section>
      </div>

      <!-- 底部确认 -->
      <div class="sbc-surface-elevated flex justify-end border-t px-5 py-3">
        <button
          type="button"
          class="sbc-btn-primary sbc-touch-target rounded-xl px-5 py-2 text-xs font-bold"
          @click="cleanerStore.isSettingsDrawerOpen = false"
        >
          完成设置
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { detectPlatform } from '../../core/platform';
import { CLOUD_THROTTLE_PROFILES } from '../../core/throttle';
import { useCleanerStore } from '../../stores/cleaner.store';
import { useSettingsStore } from '../../stores/settings.store';
import type { IconName, ThemeMode } from '../../types/cleaner';
import SvgIcon from '../icons/SvgIcon.vue';

const cleanerStore = useCleanerStore();
const settingsStore = useSettingsStore();
const platform = detectPlatform();

const themeOptions: Array<{ id: ThemeMode; label: string; icon: IconName }> = [
  { id: 'light', label: '日间高对比', icon: 'sun' },
  { id: 'dark', label: '夜间护眼', icon: 'moon' },
  { id: 'auto', label: '跟随系统', icon: 'auto_theme' },
];

const throttleList = Object.values(CLOUD_THROTTLE_PROFILES);

function handleResetBall(): void {
  settingsStore.resetFloatingBallPosition();
  toastr.success('已将悬浮球重置到右侧默认高度');
}
</script>
