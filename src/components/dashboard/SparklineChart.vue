<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  data: number[]
  color?: string
}

const props = withDefaults(defineProps<Props>(), {
  color: '#F97316'
})

const pathData = computed(() => {
  if (!props.data || props.data.length < 2) return ''
  
  const width = 100
  const height = 40
  const max = Math.max(...props.data, 1)
  const min = 0 // Always baseline at 0 for clear trends
  
  const step = width / (props.data.length - 1)
  const range = max - min
  
  return props.data.map((val, i) => {
    const x = i * step
    const y = height - ((val - min) / range) * height
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
  }).join(' ')
})

const areaData = computed(() => {
  if (!pathData.value) return ''
  return `${pathData.value} L 100 40 L 0 40 Z`
})
</script>

<template>
  <div class="sparkline">
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" class="sparkline-svg">
      <defs>
        <linearGradient :id="`grad-${color.replace('#', '')}`" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" :style="{ stopColor: color, stopOpacity: 0.2 }" />
          <stop offset="100%" :style="{ stopColor: color, stopOpacity: 0 }" />
        </linearGradient>
      </defs>
      <path 
        :d="areaData" 
        :fill="`url(#grad-${color.replace('#', '')})`" 
      />
      <path 
        :d="pathData" 
        fill="none" 
        :stroke="color" 
        stroke-width="2" 
        stroke-linecap="round" 
        stroke-linejoin="round"
      />
    </svg>
  </div>
</template>

<style scoped lang="scss">
.sparkline {
  @apply absolute inset-0 overflow-hidden pointer-events-none;
  
  &-svg {
    @apply w-full h-full;
  }
}
</style>
