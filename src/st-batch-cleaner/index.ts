import { createScriptIdIframe, teleportStyle } from '../../util/script';
import { ShortcutManager } from './core/shortcuts';
import { useCleanerStore } from './stores/cleaner.store';
import { useSettingsStore } from './stores/settings.store';
import App from './ui/App.vue';
import themeCss from './ui/theme.css?raw';

const SCRIPT_BUTTON_NAME = '🧹 打开批量清理中心';

function init() {
  console.info('[st-batch-cleaner] 正在初始化酒馆资产批量清理中心 (Phase 2 全平台与防崩增强版)...');

  const pinia = createPinia();
  const app = createApp(App).use(pinia);
  const cleanerStore = useCleanerStore(pinia);
  const settingsStore = useSettingsStore(pinia);

  const parentDoc = window.parent.document;
  const $iframe = createScriptIdIframe();

  const syncIframeVisibility = (visible: boolean) => {
    $iframe.css({
      position: 'fixed',
      inset: '0',
      width: '100vw',
      height: '100dvh',
      border: 'none',
      zIndex: visible ? '9999' : '-1',
      pointerEvents: visible ? 'auto' : 'none',
      display: visible ? 'block' : 'none',
      background: 'transparent',
    });
  };
  syncIframeVisibility(false);

  let styleTeleport: { destroy: () => void } | null = null;

  $iframe
    .appendTo(parentDoc.body)
    .on('load', () => {
      const iframeDoc = $iframe[0].contentDocument;
      if (!iframeDoc) return;
      iframeDoc.body.style.margin = '0';
      iframeDoc.body.style.background = 'transparent';
      styleTeleport = teleportStyle(iframeDoc.head);

      // 注入高对比度日/夜主题与 iOS 安全距离样式
      const customStyleEl = iframeDoc.createElement('style');
      customStyleEl.id = 'st-batch-cleaner-theme-vars';
      customStyleEl.textContent = themeCss;
      iframeDoc.head.appendChild(customStyleEl);

      const mountRoot = iframeDoc.createElement('div');
      mountRoot.id = 'st-batch-cleaner-app';
      iframeDoc.body.appendChild(mountRoot);
      app.mount(mountRoot);
    });

  watch(
    () => cleanerStore.isModalOpen,
    open => {
      syncIframeVisibility(open);
    },
    { immediate: true },
  );

  // 注册酒馆助手脚本面板按钮
  appendInexistentScriptButtons([
    {
      name: SCRIPT_BUTTON_NAME,
      visible: true,
    },
  ]);

  eventOn(getButtonEvent(SCRIPT_BUTTON_NAME), () => {
    cleanerStore.openModal();
  });

  // 挂载三合一快捷入口管理器（已移除旧版顶部栏入口，改为贴边磁吸悬浮球 + 魔棒扩展菜单 + 汉堡主菜单）
  const shortcutManager = new ShortcutManager({
    onOpenModal: () => cleanerStore.openModal(),
    getSettings: () => settingsStore.settings,
    getResolvedTheme: () => settingsStore.resolvedTheme,
    onUpdateBallPosition: (side, topPercent) => {
      settingsStore.updateFloatingBallPosition(side, topPercent);
    },
  });
  shortcutManager.init();

  watch(
    () => [settingsStore.settings.shortcuts, settingsStore.resolvedTheme] as const,
    () => {
      shortcutManager.syncAll();
    },
    { deep: true },
  );

  // 卸载清理逻辑
  $(window).on('pagehide', () => {
    try {
      shortcutManager.destroy();
      app.unmount();
      styleTeleport?.destroy();
      $iframe.remove();
      console.info('[st-batch-cleaner] 已卸载批量清理中心');
    } catch (err) {
      console.warn('[st-batch-cleaner] 卸载清理警告:', err);
    }
  });

  console.info('[st-batch-cleaner] 批量清理中心加载完成');
}

$(() => {
  errorCatched(init)();
});

