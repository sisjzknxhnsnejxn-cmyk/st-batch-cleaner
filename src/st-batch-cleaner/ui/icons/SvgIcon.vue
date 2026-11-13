<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    :width="size"
    :height="size"
    :fill="filled ? 'currentColor' : 'none'"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="sbc-svg-icon"
    aria-hidden="true"
  >
    <path v-for="(d, idx) in paths" :key="idx" :d="d" />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { IconName } from '../../types/cleaner';
import { SVG_ICONS } from './icons';

const props = withDefaults(
  defineProps<{
    name: IconName;
    size?: number | string;
    strokeWidth?: number | string;
    filled?: boolean;
  }>(),
  {
    size: 18,
    strokeWidth: 2,
    filled: false,
  },
);

const paths = computed(() => SVG_ICONS[props.name] ?? []);
</script>

