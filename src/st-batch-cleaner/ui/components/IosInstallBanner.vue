<template>
  <div
    v-if="shouldShow"
    class="sbc-badge-primary mx-3 mt-2.5 flex flex-wrap items-center justify-between gap-2.5 rounded-xl px-3.5 py-2.5 text-xs sm:mx-5"
  >
    <div class="flex items-start gap-2.5">
      <div
        class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm"
      >
        <SvgIcon name="device_mobile" :size="16" />
      </div>
      <div class="leading-relaxed">
        <div class="font-bold">
          iOS 主动全屏安装建议（防 Safari 内存回收闪退）
        </div>
        <div class="mt-0.5 flex flex-wrap items-center gap-1 opacity-90">
          <span>轻点浏览器底部</span>
          <span class="inline-flex items-center gap-0.5 rounded bg-indigo-500/20 px-1.5 py-0.5 font-semibold">
            <SvgIcon name="ios_share" :size="13" />
            分享
          </span>
          <span>按钮，选择</span>
          <span class="inline-flex items-center gap-0.5 rounded bg-indigo-500/20 px-1.5 py-0.5 font-semibold">
            <SvgIcon name="plus_square" :size="13" />
            添加到主屏幕
          </span>
          <span>，即可获得独立全屏安全区与更高内存配额。</span>
        </div>
      </div>
    </div>

    <button
      type="button"
      class="sbc-btn-secondary shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold"
      @click="dismiss"
    >
      我知道了
    </button>
  </div>
</template>

<script setup lang="ts">
import { detectPlatform } from '../../core/platform';
import { useSettingsStore } from '../../stores/settings.store';
import SvgIcon from '../icons/SvgIcon.vue';

const settingsStore = useSettingsStore();
const platform = detectPlatform();

/**
 * 在 iOS 非独立全屏模式下主动展示添加到主屏幕引导；
 * 同时可在设置抽屉内随时重新查看
 */
const shouldShow = computed(() => {
  return platform.isIOS && !platform.isStandalone && !settingsStore.settings.iosInstallDismissed;
});

function dismiss(): void {
  settingsStore.settings.iosInstallDismissed = true;
}
</script>
