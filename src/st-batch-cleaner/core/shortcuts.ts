import type { CleanerSettings } from '../stores/settings.store';
import { renderInlineSvgHtml } from '../ui/icons/icons';

/**
 * 快捷方式管理器（已彻底废弃原来的顶部栏 #top-settings-holder 注入）
 *
 * 支持三种可实时开关的快捷入口：
 * 1. 可拖拽贴边磁吸悬浮球（支持 iOS/Android 触摸拖拽与 PC 鼠标拖拽，自动记忆百分比高度，贴边半隐藏不挡聊天）
 * 2. 酒馆输入框旁「魔棒扩展菜单 (#extensionsMenu)」入口
 * 3. 酒馆左下角「汉堡主菜单 (#options .options-content)」入口
 */

const FLOATING_BALL_ID = 'st-batch-cleaner-floating-ball';
const FLOATING_BALL_STYLE_ID = 'st-batch-cleaner-floating-ball-style';
const WAND_MENU_ITEM_ID = 'st-batch-cleaner-wand-menu-item';
const OPTIONS_MENU_ITEM_ID = 'st-batch-cleaner-options-menu-item';

export interface ShortcutManagerOptions {
  onOpenModal: () => void;
  getSettings: () => CleanerSettings;
  getResolvedTheme: () => 'light' | 'dark';
  onUpdateBallPosition: (side: 'left' | 'right', topPercent: number) => void;
}

export class ShortcutManager {
  private parentDoc: Document;
  private parentWin: Window;
  private options: ShortcutManagerOptions;
  private domObserver: MutationObserver | null = null;
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(options: ShortcutManagerOptions) {
    this.parentWin = window.parent ?? window;
    this.parentDoc = this.parentWin.document;
    this.options = options;
  }

  /**
   * 初始化快捷入口与全局键盘快捷键 (Alt + Shift + C)
   */
  public init(): void {
    // 清理可能残留的旧版顶部栏按钮
    $('#st-batch-cleaner-topbar-trigger', this.parentDoc).remove();

    this.injectFloatingBallStyles();
    this.syncAll();

    // 监听酒馆 DOM 延迟渲染（例如扩展菜单在首次打开或延迟加载时才出现）
    this.domObserver = new MutationObserver(
      _.throttle(() => {
        this.syncMenusOnly();
      }, 1200),
    );

    if (this.parentDoc.body) {
      this.domObserver.observe(this.parentDoc.body, {
        childList: true,
        subtree: false,
      });
    }

    // 注册 PC 全局快捷键 Alt + Shift + C
    this.keydownHandler = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && e.code === 'KeyC') {
        e.preventDefault();
        this.options.onOpenModal();
      }
    };
    this.parentWin.addEventListener('keydown', this.keydownHandler);
  }

  /**
   * 根据最新设置同步所有快捷入口的挂载/卸载与主题外观
   */
  public syncAll(): void {
    const settings = this.options.getSettings();
    const theme = this.options.getResolvedTheme();

    if (settings.shortcuts.enableFloatingBall) {
      this.mountOrUpdateFloatingBall(
        settings.shortcuts.floatingBallSide,
        settings.shortcuts.floatingBallTopPercent,
        theme,
      );
    } else {
      this.removeFloatingBall();
    }

    this.syncMenusOnly();
  }

  private syncMenusOnly(): void {
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

  /**
   * 卸载并清理所有注入到酒馆父页面的 DOM 节点与事件监听
   */
  public destroy(): void {
    this.domObserver?.disconnect();
    this.domObserver = null;

    if (this.keydownHandler) {
      this.parentWin.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }

    this.removeFloatingBall();
    $(`#${FLOATING_BALL_STYLE_ID}`, this.parentDoc).remove();
    $(`#${WAND_MENU_ITEM_ID}`, this.parentDoc).remove();
    $(`#${OPTIONS_MENU_ITEM_ID}`, this.parentDoc).remove();
    $('#st-batch-cleaner-topbar-trigger', this.parentDoc).remove();
  }

  /**
   * 注入悬浮球专属的高可读性、磁吸半隐藏与安全区适配样式
   */
  private injectFloatingBallStyles(): void {
    if ($(`#${FLOATING_BALL_STYLE_ID}`, this.parentDoc).length > 0) return;

    const css = `
      #${FLOATING_BALL_ID} {
        position: fixed;
        z-index: 9990;
        display: flex;
        align-items: center;
        gap: 6px;
        height: 44px;
        padding: 0 12px;
        border-radius: 9999px;
        cursor: grab;
        user-select: none;
        -webkit-user-select: none;
        touch-action: none;
        font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
        font-size: 12px;
        font-weight: 600;
        transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.25s ease, box-shadow 0.2s ease, background-color 0.2s ease;
      }
      #${FLOATING_BALL_ID}[data-theme="dark"] {
        background: rgba(17, 24, 39, 0.94);
        color: #f8fafc;
        border: 1.5px solid rgba(99, 102, 241, 0.65);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.06) inset;
      }
      #${FLOATING_BALL_ID}[data-theme="light"] {
        background: rgba(255, 255, 255, 0.96);
        color: #0f172a;
        border: 1.5px solid #4f46e5;
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18);
      }
      #${FLOATING_BALL_ID}.is-dragging {
        cursor: grabbing;
        transition: none !important;
        transform: scale(1.06) !important;
        opacity: 1 !important;
      }
      #${FLOATING_BALL_ID}[data-side="right"] {
        right: max(6px, env(safe-area-inset-right, 6px));
        transform: translateX(46%);
        opacity: 0.88;
      }
      #${FLOATING_BALL_ID}[data-side="left"] {
        left: max(6px, env(safe-area-inset-left, 6px));
        transform: translateX(-46%);
        opacity: 0.88;
      }
      #${FLOATING_BALL_ID}:hover,
      #${FLOATING_BALL_ID}:focus-visible {
        transform: translateX(0) !important;
        opacity: 1 !important;
      }
      #${FLOATING_BALL_ID} .sbc-ball-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 26px;
        border-radius: 9999px;
        background: linear-gradient(135deg, #4f46e5, #6366f1);
        color: #ffffff;
        flex-shrink: 0;
      }
      #${FLOATING_BALL_ID} .sbc-ball-label {
        white-space: nowrap;
        letter-spacing: 0.02em;
      }
    `;

    $('<style>')
      .attr('id', FLOATING_BALL_STYLE_ID)
      .text(css)
      .appendTo(this.parentDoc.head);
  }

  private mountOrUpdateFloatingBall(
    side: 'left' | 'right',
    topPercent: number,
    theme: 'light' | 'dark',
  ): void {
    let $ball = $(`#${FLOATING_BALL_ID}`, this.parentDoc);
    const clampedTop = Math.min(90, Math.max(8, topPercent));

    if ($ball.length === 0) {
      const html = `
        <div id="${FLOATING_BALL_ID}" role="button" tabindex="0" title="打开酒馆资产批量清理中心 (可按住自由拖动位置)">
          <span class="sbc-ball-icon">${renderInlineSvgHtml('broom', 16, 2.2)}</span>
          <span class="sbc-ball-label">批量清理</span>
        </div>
      `;
      $ball = $(html).appendTo(this.parentDoc.body);
      this.bindFloatingBallDragAndClick($ball[0]);
    }

    $ball
      .attr('data-side', side)
      .attr('data-theme', theme)
      .css({
        top: `${clampedTop}vh`,
        left: side === 'left' ? 'max(6px, env(safe-area-inset-left, 6px))' : 'auto',
        right: side === 'right' ? 'max(6px, env(safe-area-inset-right, 6px))' : 'auto',
      });
  }

  private bindFloatingBallDragAndClick(el: HTMLElement): void {
    let isDragging = false;
    let hasMoved = false;
    let startX = 0;
    let startY = 0;
    let initialRectTop = 0;
    let initialRectLeft = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      isDragging = true;
      hasMoved = false;
      startX = e.clientX;
      startY = e.clientY;
      const rect = el.getBoundingClientRect();
      initialRectTop = rect.top;
      initialRectLeft = rect.left;
      el.setPointerCapture?.(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (!hasMoved && Math.hypot(dx, dy) > 6) {
        hasMoved = true;
        el.classList.add('is-dragging');
      }
      if (!hasMoved) return;

      const winW = this.parentWin.innerWidth || 1024;
      const winH = this.parentWin.innerHeight || 768;
      const nextLeft = Math.min(winW - el.offsetWidth - 4, Math.max(4, initialRectLeft + dx));
      const nextTop = Math.min(winH - el.offsetHeight - 12, Math.max(12, initialRectTop + dy));

      el.style.left = `${nextLeft}px`;
      el.style.right = 'auto';
      el.style.top = `${nextTop}px`;
    };

    const finishPointer = (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;
      el.releasePointerCapture?.(e.pointerId);

      if (hasMoved) {
        el.classList.remove('is-dragging');
        const rect = el.getBoundingClientRect();
        const winW = this.parentWin.innerWidth || 1024;
        const winH = this.parentWin.innerHeight || 768;

        const centerX = rect.left + rect.width / 2;
        const nextSide: 'left' | 'right' = centerX < winW / 2 ? 'left' : 'right';
        const nextTopPercent = Math.round(
          Math.min(90, Math.max(8, (rect.top / Math.max(1, winH)) * 100)),
        );

        el.setAttribute('data-side', nextSide);
        el.style.top = `${nextTopPercent}vh`;
        el.style.left = nextSide === 'left' ? 'max(6px, env(safe-area-inset-left, 6px))' : 'auto';
        el.style.right = nextSide === 'right' ? 'max(6px, env(safe-area-inset-right, 6px))' : 'auto';

        this.options.onUpdateBallPosition(nextSide, nextTopPercent);
      } else {
        this.options.onOpenModal();
      }
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', finishPointer);
    el.addEventListener('pointercancel', finishPointer);
    el.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.options.onOpenModal();
      }
    });
  }

  private removeFloatingBall(): void {
    $(`#${FLOATING_BALL_ID}`, this.parentDoc).remove();
  }

  /**
   * 在酒馆输入框左侧的「魔棒扩展菜单 (#extensionsMenu)」注入入口
   */
  private mountMagicWandMenuItem(): void {
    const $menu = $('#extensionsMenu', this.parentDoc);
    if ($menu.length === 0) return;
    if ($(`#${WAND_MENU_ITEM_ID}`, this.parentDoc).length > 0) return;

    const itemHtml = `
      <div id="${WAND_MENU_ITEM_ID}" class="list-group-item flex-container flexGap5 interactable" tabindex="0" title="打开酒馆资产批量清理中心">
        <div class="extensionsMenuExtensionButton" style="display:inline-flex;align-items:center;justify-content:center;">
          ${renderInlineSvgHtml('broom', 16, 2)}
        </div>
        <span>资产批量清理中心</span>
      </div>
    `;

    const $item = $(itemHtml);
    $item.on('click', e => {
      e.preventDefault();
      e.stopPropagation();
      $menu.hide();
      this.options.onOpenModal();
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
      <a id="${OPTIONS_MENU_ITEM_ID}" class="interactable" tabindex="0" style="display:flex;align-items:center;gap:8px;">
        ${renderInlineSvgHtml('broom', 17, 2)}
        <span>批量清理中心</span>
      </a>
    `;

    const $item = $(itemHtml);
    $item.on('click', e => {
      e.preventDefault();
      e.stopPropagation();
      $('#options', this.parentDoc).hide();
      this.options.onOpenModal();
    });

    $options.append($item);
  }
}
