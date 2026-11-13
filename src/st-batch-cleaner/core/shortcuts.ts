import type { CleanerSettings } from '../stores/settings.store';
import { renderInlineSvgHtml } from '../ui/icons/icons';

/**
 * 全平台（iOS / Android / PC）无悬浮球快捷方式与按钮增强管理器
 *
 * 支持零侵入、零屏幕遮挡的启动方式：
 * 1. 酒馆助手脚本按钮 / 底部 #qr--bar 快捷按钮（含 iOS WebKit 非 <button> 轻触穿透兜底与按压动效）
 * 2. 酒馆输入框旁「魔棒扩展菜单 (#extensionsMenu)」入口（按需触发挂载，0 后台轮询开销）
 * 3. 酒馆左下角「汉堡主菜单 (#options .options-content)」入口（按需触发挂载，0 后台轮询开销）
 * 4. PC 键盘快捷键 Alt + Shift + C
 */

const LEGACY_FLOATING_BALL_ID = 'st-batch-cleaner-floating-ball';
const LEGACY_FLOATING_BALL_STYLE_ID = 'st-batch-cleaner-floating-ball-style';
const SHORTCUT_ENHANCE_STYLE_ID = 'st-batch-cleaner-shortcut-style';
const WAND_MENU_ITEM_ID = 'st-batch-cleaner-wand-menu-item';
const OPTIONS_MENU_ITEM_ID = 'st-batch-cleaner-options-menu-item';
const QR_BUTTON_SELECTOR =
  '#qr--bar .qr--button, #qr--bar button, #qr--bar .menu_button, .qr--buttons .qr--button, .qr--buttons button, #extensions_settings .menu_button, #extensions_settings2 .menu_button';

export interface ShortcutManagerOptions {
  /** 点击按钮/菜单时强制打开弹窗（防重复事件冲撞关窗） */
  onOpenModal: () => void;
  /** 键盘快捷键切换开关弹窗 */
  onToggleModal?: () => void;
  onEscapeKey?: () => void;
  getSettings: () => CleanerSettings;
}

function resolveElementTarget(raw: EventTarget | null): HTMLElement | null {
  if (!raw) return null;
  const node = raw as Node;
  if (node.nodeType === 3) {
    return node.parentElement;
  }
  return node.nodeType === 1 ? (node as HTMLElement) : null;
}

export class ShortcutManager {
  private parentDoc: Document;
  private parentWin: Window;
  private options: ShortcutManagerOptions;
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private parentClickHandler: ((e: MouseEvent) => void) | null = null;
  private parentTouchStartHandler: ((e: TouchEvent) => void) | null = null;
  private parentTouchEndHandler: ((e: TouchEvent) => void) | null = null;
  private initTimers: number[] = [];
  private lastTriggerAt = 0;

  constructor(options: ShortcutManagerOptions) {
    this.parentWin = window.parent ?? window;
    this.parentDoc = this.parentWin.document;
    this.options = options;
  }

  public triggerOpenWithFeedback(sourceEl?: HTMLElement | null): void {
    const now = Date.now();
    if (now - this.lastTriggerAt < 320) return;
    this.lastTriggerAt = now;

    if (sourceEl) {
      sourceEl.classList.remove('sbc-trigger-pulse');
      void sourceEl.offsetWidth;
      sourceEl.classList.add('sbc-trigger-pulse');
      setTimeout(() => {
        sourceEl.classList.remove('sbc-trigger-pulse');
      }, 360);
    }

    this.options.onOpenModal();
  }


  public init(): void {
    $('#st-batch-cleaner-topbar-trigger', this.parentDoc).remove();
    $(`#${LEGACY_FLOATING_BALL_ID}`, this.parentDoc).remove();
    $(`#${LEGACY_FLOATING_BALL_STYLE_ID}`, this.parentDoc).remove();

    this.injectShortcutStyles();
    this.syncAll();
    this.enhanceNativeQrButtons();

    const t1 = window.setTimeout(() => {
      this.syncAll();
      this.enhanceNativeQrButtons();
    }, 500);
    const t2 = window.setTimeout(() => {
      this.syncAll();
      this.enhanceNativeQrButtons();
    }, 2000);
    this.initTimers.push(t1, t2);

    this.keydownHandler = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && e.code === 'KeyC') {
        e.preventDefault();
        if (this.options.onToggleModal) {
          this.options.onToggleModal();
        } else {
          this.triggerOpenWithFeedback();
        }
      } else if (e.key === 'Escape') {
        this.options.onEscapeKey?.();
      }
    };
    this.parentWin.addEventListener('keydown', this.keydownHandler);

    let touchStartPos: { x: number; y: number; time: number; btn: HTMLElement } | null = null;

    this.parentTouchStartHandler = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        touchStartPos = null;
        return;
      }
      const target = resolveElementTarget(e.target);
      if (!target) return;

      if (target.closest?.('#extensionsMenuButton, #options_button')) {
        this.syncAll();
      }

      const qrBtn = this.findCleanerQrButton(target);
      if (!qrBtn) {
        touchStartPos = null;
        return;
      }
      qrBtn.classList.add('sbc-qr-pressing');
      const touch = e.touches[0];
      touchStartPos = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
        btn: qrBtn,
      };
    };

    this.parentTouchEndHandler = (e: TouchEvent) => {
      if (!touchStartPos) return;
      const record = touchStartPos;
      touchStartPos = null;
      record.btn.classList.remove('sbc-qr-pressing');

      if (e.changedTouches.length === 0) return;
      const touch = e.changedTouches[0];
      const dist = Math.hypot(touch.clientX - record.x, touch.clientY - record.y);
      const elapsed = Date.now() - record.time;
      if (dist > 18 || elapsed > 750) return;

      const endTarget = resolveElementTarget(e.target);
      const endBtn = this.findCleanerQrButton(endTarget);
      if (!endBtn) return;

      if (e.cancelable) {
        e.preventDefault();
      }
      this.triggerOpenWithFeedback(endBtn);
    };

    this.parentClickHandler = (e: MouseEvent) => {
      const target = resolveElementTarget(e.target);
      if (!target) return;

      if (target.closest?.('#extensionsMenuButton, #options_button')) {
        this.syncAll();
        return;
      }

      const qrBtn = this.findCleanerQrButton(target);
      if (qrBtn) {
        this.triggerOpenWithFeedback(qrBtn);
      }
    };

    this.parentDoc.addEventListener('touchstart', this.parentTouchStartHandler, {
      capture: true,
      passive: true,
    });
    this.parentDoc.addEventListener('touchend', this.parentTouchEndHandler, {
      capture: true,
      passive: false,
    });
    this.parentDoc.addEventListener('click', this.parentClickHandler, true);
  }


  private isCleanerButtonElement(el: HTMLElement): boolean {
    const label = (el.textContent || el.getAttribute('title') || '').trim();
    return label.length > 0 && label.length <= 36 && label.includes('批量清理中心');
  }

  private findCleanerQrButton(target: HTMLElement | null): HTMLElement | null {
    if (!target || typeof target.closest !== 'function') return null;
    if (target.closest('.sbc-host-root, .sbc-theme-root')) return null;
    if (target.closest(`#${WAND_MENU_ITEM_ID}, #${OPTIONS_MENU_ITEM_ID}`)) {
      return null;
    }
    const btn = target.closest(QR_BUTTON_SELECTOR) as HTMLElement | null;
    if (!btn) return null;
    return this.isCleanerButtonElement(btn) ? btn : null;
  }

  public enhanceNativeQrButtons(): void {
    try {
      const candidates = this.parentDoc.querySelectorAll(QR_BUTTON_SELECTOR);
      candidates.forEach(node => {
        const el = node as HTMLElement;
        if (el.closest('.sbc-host-root, .sbc-theme-root')) return;
        if (!this.isCleanerButtonElement(el)) return;
        el.classList.add('sbc-enhanced-qr-btn');
        if (!el.getAttribute('role') && el.tagName !== 'BUTTON') {
          el.setAttribute('role', 'button');
          el.setAttribute('tabindex', '0');
        }
      });
    } catch {
      // ignore
    }
  }

  public syncAll(): void {
    $(`#${LEGACY_FLOATING_BALL_ID}`, this.parentDoc).remove();
    $(`#${LEGACY_FLOATING_BALL_STYLE_ID}`, this.parentDoc).remove();

    const settings = this.options.getSettings();

    if (settings.shortcuts.enableMagicWandMenu) {
      this.mountMagicWandMenuItem();
    } else {
      $(`#${WAND_MENU_ITEM_ID}`, this.parentDoc).remove();
    }

    if (settings.shortcuts.enableOptionsMenu) {
      this.mountOptionsMenuItem();
    } else {
      $(`#${OPTIONS_MENU_ITEM_ID}`, this.parentDoc).remove();
    }
  }

  public destroy(): void {
    this.initTimers.forEach(t => window.clearTimeout(t));
    this.initTimers = [];

    if (this.keydownHandler) {
      this.parentWin.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }
    if (this.parentTouchStartHandler) {
      this.parentDoc.removeEventListener('touchstart', this.parentTouchStartHandler, true);
      this.parentTouchStartHandler = null;
    }
    if (this.parentTouchEndHandler) {
      this.parentDoc.removeEventListener('touchend', this.parentTouchEndHandler, true);
      this.parentTouchEndHandler = null;
    }
    if (this.parentClickHandler) {
      this.parentDoc.removeEventListener('click', this.parentClickHandler, true);
      this.parentClickHandler = null;
    }

    $(`#${LEGACY_FLOATING_BALL_ID}`, this.parentDoc).remove();
    $(`#${LEGACY_FLOATING_BALL_STYLE_ID}`, this.parentDoc).remove();
    $(`#${SHORTCUT_ENHANCE_STYLE_ID}`, this.parentDoc).remove();
    $(`#${WAND_MENU_ITEM_ID}`, this.parentDoc).remove();
    $(`#${OPTIONS_MENU_ITEM_ID}`, this.parentDoc).remove();
    $('#st-batch-cleaner-topbar-trigger', this.parentDoc).remove();
  }


  private injectShortcutStyles(): void {
    $(`#${SHORTCUT_ENHANCE_STYLE_ID}`, this.parentDoc).remove();

    const css = `
      .sbc-enhanced-qr-btn,
      #${WAND_MENU_ITEM_ID},
      #${OPTIONS_MENU_ITEM_ID} {
        cursor: pointer !important;
        touch-action: manipulation !important;
        -webkit-tap-highlight-color: transparent !important;
        user-select: none !important;
        -webkit-user-select: none !important;
        transition: transform 0.14s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.14s ease, background-color 0.14s ease !important;
      }
      .sbc-enhanced-qr-btn:active,
      .sbc-enhanced-qr-btn.sbc-qr-pressing,
      #${WAND_MENU_ITEM_ID}:active,
      #${OPTIONS_MENU_ITEM_ID}:active {
        transform: scale(0.94) !important;
        opacity: 0.86 !important;
      }
      @keyframes sbc-trigger-ripple {
        0% {
          box-shadow: 0 0 0 0 rgba(94, 129, 244, 0.65);
        }
        100% {
          box-shadow: 0 0 0 12px rgba(94, 129, 244, 0);
        }
      }
      .sbc-trigger-pulse {
        animation: sbc-trigger-ripple 0.36s ease-out !important;
      }
    `;

    $('<style>')
      .attr('id', SHORTCUT_ENHANCE_STYLE_ID)
      .text(css)
      .appendTo(this.parentDoc.head);
  }


  /**
   * 在酒馆输入框左侧的「魔棒扩展菜单 (#extensionsMenu)」注入入口
   */
  private mountMagicWandMenuItem(): void {
    const $menu = $('#extensionsMenu', this.parentDoc);
    if ($menu.length === 0) return;
    if ($(`#${WAND_MENU_ITEM_ID}`, this.parentDoc).length > 0) return;

    const itemHtml = `
      <div id="${WAND_MENU_ITEM_ID}" class="list-group-item flex-container flexGap5 interactable" role="button" tabindex="0" title="打开酒馆资产批量清理中心">
        <div class="extensionsMenuExtensionButton" style="display:inline-flex;align-items:center;justify-content:center;">
          ${renderInlineSvgHtml('broom', 16, 2)}
        </div>
        <span>资产批量清理中心</span>
      </div>
    `;

    const $item = $(itemHtml);
    $item.on('click touchend', e => {
      e.preventDefault();
      e.stopPropagation();
      $menu.hide();
      this.triggerOpenWithFeedback($item.get(0) ?? null);
    });

    $menu.append($item);
  }

  /**
   * 在酒馆左下角的「汉堡主菜单 (#options .options-content)」注入入口
   */
  private mountOptionsMenuItem(): void {
    const $options = $('#options .options-content', this.parentDoc);
    if ($options.length === 0) return;
    if ($(`#${OPTIONS_MENU_ITEM_ID}`, this.parentDoc).length > 0) return;

    const itemHtml = `
      <a id="${OPTIONS_MENU_ITEM_ID}" class="interactable" role="button" tabindex="0" style="display:flex;align-items:center;gap:8px;">
        ${renderInlineSvgHtml('broom', 17, 2)}
        <span>批量清理中心</span>
      </a>
    `;

    const $item = $(itemHtml);
    $item.on('click touchend', e => {
      e.preventDefault();
      e.stopPropagation();
      $('#options', this.parentDoc).hide();
      this.triggerOpenWithFeedback($item.get(0) ?? null);
    });

    $options.append($item);
  }
}

