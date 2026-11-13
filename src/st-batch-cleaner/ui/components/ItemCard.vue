<template>
  <div
    role="button"
    tabindex="0"
    :class="[
      'sbc-card group relative flex rounded-xl transition-all duration-150 select-none',
      viewMode === 'grid' ? 'flex-col p-3' : 'items-center justify-between gap-3 px-3.5 py-2.5',
      selected
        ? 'sbc-card-selected cursor-pointer'
        : selectable
          ? 'cursor-pointer'
          : 'sbc-card-disabled',
    ]"
    @click="emit('toggle', item)"
    @keydown.enter.prevent="emit('toggle', item)"
    @keydown.space.prevent="emit('toggle', item)"
  >
    <!-- 顶部/左侧主体信息 -->
    <div class="flex min-w-0 items-center gap-3">
      <!-- 复选框指示器 -->
      <div
        :class="[
          'flex size-5 shrink-0 items-center justify-center rounded-md border transition',
          selected
            ? 'border-indigo-500 bg-indigo-600 text-white'
            : selectable
              ? 'sbc-surface-muted'
              : 'sbc-badge-amber',
        ]"
      >
        <SvgIcon v-if="selected" name="check" :size="13" :stroke-width="2.5" />
        <SvgIcon v-else-if="!selectable" name="shield" :size="12" />
      </div>

      <!-- 缩略图或模块图标 -->
      <div
        v-if="showAvatar"
        class="sbc-surface-muted relative size-11 shrink-0 overflow-hidden rounded-lg border"
      >
        <img
          v-if="item.avatarUrl && !imgFailed"
          :src="item.avatarUrl"
          :alt="item.name"
          loading="lazy"
          decoding="async"
          class="size-full object-cover"
          @error="imgFailed = true"
        />
        <div
          v-else
          class="flex size-full items-center justify-center"
          style="color: var(--sbc-text-muted)"
        >
          <SvgIcon :name="fallbackIcon" :size="20" />
        </div>
      </div>

      <!-- 标题与副标题 -->
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-1.5">
          <span
            class="truncate text-sm font-bold"
            style="color: var(--sbc-text-primary)"
            :title="item.name"
          >
            {{ item.name }}
          </span>
          <SvgIcon
            v-if="item.isFavorite"
            name="star"
            :size="13"
            filled
            class="shrink-0 text-amber-500"
            title="已收藏"
          />
        </div>
        <div
          v-if="item.subtitle"
          class="mt-0.5 truncate text-xs"
          style="color: var(--sbc-text-secondary)"
          :title="item.subtitle"
        >
          {{ item.subtitle }}
        </div>
      </div>
    </div>

    <!-- 关系徽章列表 -->
    <div
      v-if="item.badges.length > 0"
      :class="[
        'flex flex-wrap items-center gap-1.5',
        viewMode === 'grid' ? 'mt-2.5 border-t pt-2' : 'shrink-0',
      ]"
      :style="viewMode === 'grid' ? 'border-color: var(--sbc-border)' : undefined"
    >
      <span
        v-for="(badge, idx) in item.badges"
        :key="idx"
        :title="badge.tooltip || badge.label"
        :class="[
          'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold',
          badgeClass(badge.tone),
        ]"
      >
        <SvgIcon v-if="badge.icon" :name="badge.icon" :size="11" />
        <span>{{ badge.label }}</span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CleanableItem, IconName, ItemBadge } from '../../types/cleaner';
import SvgIcon from '../icons/SvgIcon.vue';

defineProps<{
  item: CleanableItem;
  selected: boolean;
  selectable: boolean;
  viewMode: 'grid' | 'list';
  showAvatar: boolean;
  fallbackIcon: IconName;
}>();

const emit = defineEmits<{
  toggle: [item: CleanableItem];
}>();

const imgFailed = ref(false);

function badgeClass(tone: ItemBadge['tone']): string {
  switch (tone) {
    case 'primary':
      return 'sbc-badge-primary';
    case 'emerald':
      return 'sbc-badge-emerald';
    case 'amber':
      return 'sbc-badge-amber';
    case 'rose':
      return 'sbc-badge-rose';
    default:
      return 'sbc-badge-neutral';
  }
}
</script>

