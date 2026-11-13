import { createScriptIdDiv, teleportStyle } from '@util/script';
import { createPinia } from 'pinia';
import { createApp, watch } from 'vue';
import { installIosWebAppEnhancements } from './core/platform';
import { ShortcutManager } from './core/shortcuts';
import { useCleanerStore } from './stores/cleaner.store';
import { useSettingsStore } from './stores/settings.store';
import App from './ui/App.vue';
import './ui/theme.css';
import themeCssText from './ui/theme.css?raw';

const SCRIPT_BUTTON_NAME = '🧹 打开批量清理中心';
const HOST_CONTAINER_ID = 'st-batch-cleaner-host-root';
const HOST_THEME_STYLE_ID = 'st-batch-cleaner-theme-style';

type CleanerGlobalWindow = Window & {
  __ST_BATCH_CLEANER_OPEN__?: () => void;
  __ST_BATCH_CLEANER_REGISTER_OPEN__?: (fn: () => void) => void;
};

function init() {
  console.info('[st-batch-cleaner] 正在初始化酒馆资产批量清理中心...');

  const parentWin = (window.parent ?? window) as CleanerGlobalWindow;
  const parentDoc = parentWin.document;

  // 1. 清理可能残留的旧版或热重载节点（含历史悬浮球节点），避免重复挂载冲突
  $(`[script_id="${getScriptId()}"]`, parentDoc).remove();
  $(`#${HOST_CONTAINER_ID}`, parentDoc).remove();
  $(`#${HOST_THEME_STYLE_ID}`, parentDoc).remove();
  $('#st-batch-cleaner-floating-ball', parentDoc).remove();
  $('#st-batch-cleaner-floating-ball-style', parentDoc).remove();

  // 2. 注入 iOS 全屏安全区与 WebApp 增强元信息
  installIosWebAppEnhancements(parentDoc);

  // 3. 将样式表直接注入到酒馆主窗口 <head> 并搭配 teleportStyle 双保险，确保云酒馆与本地 100% 同步生效
  const $directStyle = $('<style>')
    .attr('id', HOST_THEME_STYLE_ID)
    .text(themeCssText)
    .appendTo(parentDoc.head);
  const styleTeleport = teleportStyle($('head', parentDoc));

  // 4. 创建位于酒馆顶层但默认绝对不阻挡底层交互的挂载宿主容器
  const $container = createScriptIdDiv()
    .attr('id', HOST_CONTAINER_ID)
    .addClass('sbc-host-root')
    .css({
      position: 'fixed',
      top: '0',
      left: '0',
      width: '0',
      height: '0',
      overflow: 'visible',
      pointerEvents: 'none',
      zIndex: '2147483000',
    })
    .appendTo(parentDoc.body);

  const pinia = createPinia();
  const app = createApp(App).use(pinia);
  const cleanerStore = useCleanerStore(pinia);
  const settingsStore = useSettingsStore(pinia);

  const hostEl = $container.get(0);
  if (hostEl) {
    app.mount(hostEl);
  }

  const openOrToggleModal = () => {
    cleanerStore.toggleModal();
  };

  const forceOpenModal = () => {
    cleanerStore.openModal();
  };

  // 5. 注册全局打开钩子，兼容云端加载器在 CDN 下载期间排队的点击请求
  parentWin.__ST_BATCH_CLEANER_OPEN__ = forceOpenModal;
  (window as CleanerGlobalWindow).__ST_BATCH_CLEANER_OPEN__ = forceOpenModal;
  if (typeof parentWin.__ST_BATCH_CLEANER_REGISTER_OPEN__ === 'function') {
    parentWin.__ST_BATCH_CLEANER_REGISTER_OPEN__(forceOpenModal);
  }

  // 6. 注册酒馆助手脚本面板按钮（及底部 #qr--bar 按钮）
  try {
    appendInexistentScriptButtons([
      {
        name: SCRIPT_BUTTON_NAME,
        visible: true,
      },
    ]);
  } catch (err) {
    console.warn('[st-batch-cleaner] 注册脚本按钮警告:', err);
  }

  // 7. 挂载全平台快捷入口管理器（#qr--bar 触摸穿透 + 魔棒扩展菜单 + 汉堡主菜单 + 快捷键，彻底移除悬浮球）
  const shortcutManager = new ShortcutManager({
    onOpenModal: forceOpenModal,
    onToggleModal: openOrToggleModal,
    onEscapeKey: () => cleanerStore.handleEscapeKey(),
    getSettings: () => settingsStore.settings,
  });
  shortcutManager.init();

  // 酒馆原生按钮事件绑定（与 ShortcutManager 的 320ms 防重入保护协同工作，且统一调用 forceOpenModal 防止双击关窗）
  eventOn(getButtonEvent(SCRIPT_BUTTON_NAME), () => {
    shortcutManager.triggerOpenWithFeedback();
  });

  watch(
    () => settingsStore.settings.shortcuts,
    () => {
      shortcutManager.syncAll();
    },
    { deep: true },
  );

  // 8. 卸载清理逻辑
  $(window).on('pagehide', () => {
    try {
      delete parentWin.__ST_BATCH_CLEANER_OPEN__;
      delete (window as CleanerGlobalWindow).__ST_BATCH_CLEANER_OPEN__;
      shortcutManager.destroy();
      app.unmount();
      $container.remove();
      $directStyle.remove();
      styleTeleport.destroy();
      console.info('[st-batch-cleaner] 已卸载批量清理中心');
    } catch (err) {
      console.warn('[st-batch-cleaner] 卸载清理警告:', err);
    }
  });

  console.info('[st-batch-cleaner] 批量清理中心加载完成 (支持 PC / Android / iOS)');
}

$(() => {
  errorCatched(init)();
});




