<template>
  <div v-if="shouldShowBanner" class="sbc-ios-banner">
    <div style="display: flex; align-items: center; gap: 10px; min-width: 0">
      <div
        style="
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: var(--sbc-accent-soft);
          color: var(--sbc-accent-text);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        "
      >
        <SvgIcon name="device_mobile" :size="17" />
      </div>
      <div style="font-size: 12px; color: var(--sbc-text-secondary)">
        <strong style="color: var(--sbc-text-primary)">iOS 全屏防断连建议：</strong>
        点击浏览器底部「分享」→「添加到主屏幕」，可获得更大可视区域并降低云酒馆后台断连概率。
      </div>
    </div>

    <button
      type="button"
      class="sbc-btn sbc-btn-secondary"
      style="padding: 4px 10px; font-size: 11.5px"
      @click="settingsStore.settings.iosInstallDismissed = true"
    >
      不再提示
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { detectPlatform } from '../../core/platform';
import { useSettingsStore } from '../../stores/settings.store';
import SvgIcon from '../icons/SvgIcon.vue';

const settingsStore = useSettingsStore();
const platform = detectPlatform();

const shouldShowBanner = computed(
  () =>
    platform.shouldShowIosAddToHomeTip &&
    !settingsStore.settings.iosInstallDismissed,
);
</script>
