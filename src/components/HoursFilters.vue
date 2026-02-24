<script setup lang="ts">
import type { AppFilters } from '../types/bitbucket'

// Props with proper typing
interface Props {
  filters: AppFilters
  repos: string[]
}

const props = withDefaults(defineProps<Props>(), {
  filters: () => ({
    repo: '',
    dateRange: 12,
    author: 'Rens Hoogendam',
    type: 'all'
  }),
  repos: () => []
})

// Emits with proper typing
const emit = defineEmits<{
  'filter-change': [filters: Partial<AppFilters>]
}>()

function updateFilter<K extends keyof AppFilters>(key: K, value: AppFilters[K]): void {
  emit('filter-change', { [key]: value })
}

function handleSelectChange(event: Event, key: keyof AppFilters): void {
  const target = event.target as HTMLSelectElement
  if (key === 'dateRange') {
    updateFilter(key, parseInt(target.value))
  } else {
    updateFilter(key as any, target.value as any)
  }
}
</script>

<template>
  <div class="hours-filters">
    <div class="filter-group">
      <label>Repository:</label>
      <select 
        :value="filters.repo" 
        @change="handleSelectChange($event, 'repo')"
      >
        <option value="">All Repositories</option>
        <option v-for="repo in repos" :key="repo" :value="repo">
          {{ repo }}
        </option>
      </select>
    </div>
    
    <div class="filter-group">
      <label>Date Range:</label>
      <select 
        :value="filters.dateRange" 
        @change="handleSelectChange($event, 'dateRange')"
      >
        <option :value="3">Last 3 days</option>
        <option :value="7">Last week</option>
        <option :value="12">Last 12 days</option>
        <option :value="30">Last month</option>
      </select>
    </div>
    
    <div class="filter-group">
      <label>Type:</label>
      <select 
        :value="filters.type" 
        @change="handleSelectChange($event, 'type')"
      >
        <option value="all">All</option>
        <option value="commits">Commits Only</option>
        <option value="pullrequests">Pull Requests Only</option>
      </select>
    </div>
    
    <div class="filter-info">
      <span class="author-info">
        Showing activity for: <strong>{{ filters.author }}</strong>
      </span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.hours-filters {
  @apply bg-surface rounded-app-card p-6 mb-6 shadow-sm flex flex-wrap gap-6 items-center;

  .filter-group {
    @apply flex flex-col gap-2 min-w-[160px];

    label {
      @apply font-semibold text-text-muted text-sm;
    }

    select {
      @apply px-3 py-2 border-2 border-gray-100 rounded-lg bg-white text-base cursor-pointer transition-colors duration-300;

      &:focus {
        @apply outline-none border-brand-primary;
      }

      &:hover {
        @apply border-gray-200;
      }
    }
  }

  .filter-info {
    @apply ml-auto px-5 py-3 bg-gray-50 rounded-lg border-l-4 border-brand-primary;

    .author-info {
      @apply text-text-muted text-[0.95rem];

      strong {
        @apply text-text-main;
      }
    }
  }
}

@media (max-width: 768px) {
  .hours-filters {
    @apply flex-col items-stretch gap-4;
    
    .filter-group {
      @apply min-w-full;
    }
    
    .filter-info {
      @apply ml-0 text-center;
    }
  }
}
</style>