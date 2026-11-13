<template>
  <div
    class="sbc-card"
    :class="[
      selected ? 'sbc-card-selected' : '',
      disabled ? 'sbc-card-disabled' : '',
    ]"
    @click="handleClick"
  >
    <!-- 网格卡片模式（带精致立绘/图标缩略框） -->
    <div v-if="viewMode === 'grid'" class="sbc-card-grid-body">
      <div
        class="sbc-avatar-box"
        :class="{ 'is-compact': !item.avatarUrl || imgError }"
      >
        <img
          v-if="item.avatarUrl && !imgError"
          :src="item.avatarUrl"
          :alt="item.name"
          loading="lazy"
          decoding="async"
          class="sbc-avatar-img"
          @error="imgError = true"
        />
        <SvgIcon v-else :name="fallbackIcon" :size="20" />

        <span
          v-if="item.isFavorite"
          class="sbc-fav-corner"
          title="已收藏项目"
        >
          <SvgIcon name="star" :size="10" :filled="true" />
        </span>
      </div>

      <div class="sbc-card-main">
        <div class="sbc-card-top">
          <div style="min-width: 0; flex: 1">
            <div class="sbc-card-title" :title="item.name">
              {{ item.name }}
            </div>
            <div v-if="item.subtitle" class="sbc-card-sub" :title="item.subtitle">
              {{ item.subtitle }}
            </div>
          </div>

          <div
            v-if="disabled"
            class="sbc-lock-indicator"
            :title="item.protectedReason || '受保护不可勾选'"
          >
            <SvgIcon name="shield" :size="13" />
          </div>
          <div v-else class="sbc-check-indicator">
            <SvgIcon v-if="selected" name="check" :size="13" :stroke-width="2.6" />
          </div>
        </div>

        <div class="sbc-card-badges">
          <span
            v-for="(badge, idx) in item.badges"
            :key="idx"
            class="sbc-badge"
            :class="badgeToneClass(badge.tone)"
            :title="badge.tooltip || badge.label"
          >
            <SvgIcon v-if="badge.icon" :name="badge.icon" :size="10.5" />
            <span>{{ badge.label }}</span>
          </span>
        </div>
      </div>
    </div>

    <!-- 紧凑单行列表模式 -->
    <div v-else class="sbc-card-list-body">
      <div
        v-if="disabled"
        class="sbc-lock-indicator"
        :title="item.protectedReason || '受保护不可勾选'"
      >
        <SvgIcon name="shield" :size="13" />
      </div>
      <div v-else class="sbc-check-indicator">
        <SvgIcon v-if="selected" name="check" :size="13" :stroke-width="2.6" />
      </div>

      <div class="sbc-avatar-box is-compact" style="width: 32px; height: 32px">
        <img
          v-if="item.avatarUrl && !imgError"
          :src="item.avatarUrl"
          :alt="item.name"
          loading="lazy"
          decoding="async"
          class="sbc-avatar-img"
          @error="imgError = true"
        />
        <SvgIcon v-else :name="fallbackIcon" :size="16" />
      </div>

      <div style="min-width: 0; flex: 1">
        <div style="display: flex; align-items: center; gap: 6px">
          <span class="sbc-card-title" :title="item.name">{{ item.name }}</span>
          <span
            v-if="item.isFavorite"
            style="color: #f59e0b; display: inline-flex"
            title="已收藏"
          >
            <SvgIcon name="star" :size="12" :filled="true" />
          </span>
        </div>
        <div v-if="item.subtitle" class="sbc-card-sub">
          {{ item.subtitle }}
        </div>
      </div>

      <div class="sbc-card-badges" style="justify-content: flex-end; max-width: 50%">
        <span
          v-for="(badge, idx) in item.badges"
          :key="idx"
          class="sbc-badge"
          :class="badgeToneClass(badge.tone)"
          :title="badge.tooltip || badge.label"
        >
          <SvgIcon v-if="badge.icon" :name="badge.icon" :size="10.5" />
          <span>{{ badge.label }}</span>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CleanableItem, IconName, ItemBadge } from '../../types/cleaner';
import SvgIcon from '../icons/SvgIcon.vue';

const props = defineProps<{
  item: CleanableItem;
  selected: boolean;
  disabled: boolean;
  viewMode: 'grid' | 'list';
  fallbackIcon: IconName;
}>();

const emit = defineEmits<{
  toggle: [];
}>();

const imgError = ref(false);

function handleClick() {
  emit('toggle');
}

function badgeToneClass(tone: ItemBadge['tone']): string {
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
