export type CleanerModuleId = 'character' | 'worldbook' | 'persona';

/** 外观主题模式：日间 / 夜间 / 跟随系统 */
export type ThemeMode = 'light' | 'dark' | 'auto';

/** 云酒馆防抖与节流执行档位 */
export type CloudThrottlePresetId = 'cloud_safe' | 'ultra_stable' | 'local_fast';

/** 列表排序方式 */
export type SortMode = 'default' | 'name_asc' | 'name_desc' | 'orphan_first' | 'linked_first';

/**
 * 纯内联 SVG 图标名称枚举
 * 所有图标统一维护在 `ui/icons/icons.ts`，无任何外部字体依赖
 */
export type IconName =
  | 'broom'
  | 'character'
  | 'worldbook'
  | 'persona'
  | 'chat'
  | 'trash'
  | 'shield'
  | 'download'
  | 'search'
  | 'refresh'
  | 'check'
  | 'close'
  | 'warning'
  | 'star'
  | 'link'
  | 'unlink'
  | 'grid'
  | 'list'
  | 'filter'
  | 'settings'
  | 'info'
  | 'folder'
  | 'sun'
  | 'moon'
  | 'auto_theme'
  | 'cloud'
  | 'stop'
  | 'ios_share'
  | 'plus_square'
  | 'sort'
  | 'sparkles'
  | 'wand'
  | 'menu'
  | 'float_ball'
  | 'device_mobile'
  | 'chevron_down'
  | 'chevron_up'
  | 'bolt';

export interface ItemBadge {
  label: string;
  tone: 'neutral' | 'primary' | 'amber' | 'emerald' | 'rose';
  icon?: IconName;
  tooltip?: string;
}

export interface CleanableItem<TMeta = Record<string, any>> {
  /** 唯一标识：角色卡使用 avatar (如 xxx.png)，世界书使用名称，面具使用 avatar_id */
  id: string;
  /** 显示名称 */
  name: string;
  /** 副标题（如文件名、创建者或简短描述） */
  subtitle?: string;
  /** 缩略图地址（可选） */
  avatarUrl?: string | null;
  /** 是否为收藏项 */
  isFavorite?: boolean;
  /** 是否正在使用中（如当前打开的角色卡、当前全局开启的世界书、当前佩戴的面具） */
  isActive?: boolean;
  /** 是否受系统保护不可直接删除（如默认面具） */
  isSystemProtected?: boolean;
  /** 系统保护原因提示 */
  protectedReason?: string;
  /** 是否为无任何引用的闲置/孤儿资源 */
  isOrphan?: boolean;
  /** 关联标签角标 */
  badges: ItemBadge[];
  /** 模块自定义元数据 */
  meta: TMeta;
}

export interface CharacterCascadeOptions {
  /** 是否同时删除角色卡绑定的世界书 */
  deleteLinkedWorldbooks: boolean;
  /** 智能保护：若世界书还被其他未删角色/全局/面具引用，则跳过不删 */
  protectSharedWorldbooks: boolean;
  /** 是否同时删除关联的对应面具 */
  deleteLinkedPersonas: boolean;
  /** 智能保护：若面具为默认面具或还绑定了其他存活角色/群聊，则仅解绑不删除 */
  protectSharedPersonas: boolean;
  /** 是否同时删除该角色卡的所有聊天记录文件 */
  deleteChats: boolean;
}

export interface CascadeActionItem {
  id: string;
  name: string;
  moduleId: CleanerModuleId | 'chat';
  action: 'delete' | 'unbind_only' | 'skip_protected';
  reason: string;
}

export interface DryRunPlan {
  moduleId: CleanerModuleId;
  /** 主删除列表 */
  primaryDeletes: CleanableItem[];
  /** 因收藏或系统保护被自动跳过的项目 */
  skippedPrimary: Array<{ item: CleanableItem; reason: string }>;
  /** 级联删除或解绑的附属项目（世界书、面具、聊天文件等） */
  cascadeItems: CascadeActionItem[];
  /** 高危警告提示信息 */
  warnings: string[];
}

export interface BackupRecord {
  moduleId: CleanerModuleId | 'chat_brief';
  id: string;
  name: string;
  exportedAt: string;
  data: any;
}

export interface BackupBundle {
  schemaVersion: '1.0.0';
  generator: 'st-batch-cleaner';
  createdAt: string;
  moduleId: CleanerModuleId;
  summary: {
    primaryCount: number;
    cascadeDeleteCount: number;
  };
  records: BackupRecord[];
}

export interface ExecutionProgress {
  running: boolean;
  /** 是否已收到用户的安全停止指令 */
  abortRequested?: boolean;
  phase:
    | 'idle'
    | 'backing_up'
    | 'unbinding'
    | 'deleting'
    | 'cooling_down'
    | 'refreshing'
    | 'completed'
    | 'aborted'
    | 'failed';
  currentStep: number;
  totalSteps: number;
  currentLabel: string;
  logs: Array<{
    time: string;
    level: 'info' | 'success' | 'warn' | 'error';
    message: string;
  }>;
}

