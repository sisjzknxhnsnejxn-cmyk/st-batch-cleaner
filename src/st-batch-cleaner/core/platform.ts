/**
 * 平台环境探测与 iOS 系统主动安装/安全区注入模块
 * 负责识别 iOS (iPhone/iPad)、Android、PC 环境，并主动为 iOS 注入 WebApp 全屏能力与安全区适配
 */

export interface PlatformInfo {
  /** 是否为 iOS / iPadOS 设备 */
  isIOS: boolean;
  /** 是否为 Android 设备 */
  isAndroid: boolean;
  /** 是否为移动端或触屏小尺寸视口 */
  isMobile: boolean;
  /** 是否已通过「添加到主屏幕」以独立全屏 App (Standalone PWA) 模式运行 */
  isStandalone: boolean;
  /** 是否为 Safari 浏览器内核 */
  isSafari: boolean;
  /** 设备可读名称（用于在界面上展示当前适配状态） */
  deviceLabel: string;
}

/**
 * 探测当前运行平台信息（优先基于酒馆外层 parent 窗口）
 */
export function detectPlatform(): PlatformInfo {
  const win = (window.parent ?? window) as Window & { navigator: Navigator & { standalone?: boolean } };
  const nav = win.navigator;
  const ua = nav.userAgent || '';

  // iPhone / iPod / iPad 或 iPadOS 13+ 桌面模式伪装 (MacIntel + 多点触控)
  const isIOS =
    /iPad|iPhone|iPod/i.test(ua) ||
    (nav.platform === 'MacIntel' && typeof nav.maxTouchPoints === 'number' && nav.maxTouchPoints > 1);

  const isAndroid = /Android/i.test(ua);

  const isStandalone = Boolean(
    nav.standalone === true ||
      win.matchMedia?.('(display-mode: standalone)').matches ||
      win.matchMedia?.('(display-mode: fullscreen)').matches,
  );

  const isSafari = /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);

  const isSmallScreen = (win.innerWidth || 1024) < 768;
  const isMobile = isIOS || isAndroid || isSmallScreen;

  let deviceLabel = 'PC 桌面端';
  if (isIOS) {
    deviceLabel = isStandalone ? 'iOS 全屏应用模式' : 'iOS 移动端';
  } else if (isAndroid) {
    deviceLabel = isStandalone ? 'Android 全屏模式' : 'Android 移动端';
  } else if (isSmallScreen) {
    deviceLabel = '移动触屏视图';
  }

  return {
    isIOS,
    isAndroid,
    isMobile,
    isStandalone,
    isSafari,
    deviceLabel,
  };
}

/**
 * 在酒馆主窗口 <head> 主动注入 iOS WebApp 全屏安装元标签与 viewport-fit=cover 安全区支持
 * 确保用户在 iOS 上添加到主屏幕时可获得无地址栏的沉浸式体验，且不会因刘海屏/灵动岛遮挡按钮
 */
export function installIosWebAppEnhancements(parentDoc: Document = window.parent.document): void {
  try {
    const head = parentDoc.head;
    if (!head) return;

    const ensureMeta = (name: string, content: string) => {
      let meta = head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!meta) {
        meta = parentDoc.createElement('meta');
        meta.name = name;
        meta.content = content;
        meta.setAttribute('data-st-batch-cleaner-ios', 'true');
        head.appendChild(meta);
      }
    };

    // 启用 iOS 添加到主屏幕后的全屏独立运行模式
    ensureMeta('apple-mobile-web-app-capable', 'yes');
    ensureMeta('mobile-web-app-capable', 'yes');
    ensureMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');
    ensureMeta('apple-mobile-web-app-title', 'SillyTavern');

    // 确保 viewport 包含 viewport-fit=cover 以激活 iOS env(safe-area-inset-*)
    const viewportMeta = head.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
    if (viewportMeta && !viewportMeta.content.includes('viewport-fit')) {
      viewportMeta.content = `${viewportMeta.content}, viewport-fit=cover`;
    }
  } catch (err) {
    console.warn('[st-batch-cleaner] 注入 iOS 主动安装元标签警告:', err);
  }
}
