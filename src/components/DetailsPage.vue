<script setup lang="ts">
import { computed } from 'vue'
import HoursTable from './HoursTable.vue'
import HoursFilters from './HoursFilters.vue'
import PageToolbar from './PageToolbar.vue'

import type { ProcessedCommit, AppFilters, RefreshJobStatus } from '../types/bitbucket'

// Props with proper typing
interface Props {
  data: ProcessedCommit[]
  filters: AppFilters
  isLoading: boolean
  lastUpdated: Date | null
  error: string | null
  refreshJob?: RefreshJobStatus | null
  showRefreshStatus?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  data: () => [],
  filters: () => ({
    repo: '',
    dateRange: 12,
    author: 'Rens Hoogendam',
    type: 'all'
  }),
  isLoading: false,
  lastUpdated: null,
  error: null,
  refreshJob: null,
  showRefreshStatus: false
})

// Emits with proper typing
const emit = defineEmits<{
  'filter-change': [filters: Partial<AppFilters>]
  'export': []
  'refresh': []
  'force-refresh': []
  'clear-cache': []
  'hide-refresh-status': []
  'retry-refresh': []
  'cancel-refresh': [jobId: string]
  'check-refresh-status': [jobId: string]
}>()

// Computed properties with proper typing
const availableRepos = computed((): string[] => {
  return [...new Set(props.data.map((item: ProcessedCommit) => item.repo))].sort()
})

const filteredData = computed((): ProcessedCommit[] => {
  let filtered: ProcessedCommit[] = [...props.data]
  
  if (props.filters.repo) {
    filtered = filtered.filter((item: ProcessedCommit) => item.repo === props.filters.repo)
  }
  
  if (props.filters.type && props.filters.type !== 'all') {
    if (props.filters.type === 'commits') {
      filtered = filtered.filter((item: ProcessedCommit) => item.commit_hash)
    } else if (props.filters.type === 'pullrequests') {
      filtered = filtered.filter((item: ProcessedCommit) => !item.commit_hash)
    }
  }
  
  return filtered
})

const commitCount = computed((): number => {
  return filteredData.value.filter((item: ProcessedCommit) => item.commit_hash).length
})

const prCount = computed((): number => {
  return filteredData.value.filter((item: ProcessedCommit) => !item.commit_hash).length
})

const uniqueTickets = computed((): number => {
  const tickets = new Set(
    filteredData.value
      .filter((item: ProcessedCommit) => item.ticket)
      .map((item: ProcessedCommit) => item.ticket)
  )
  return tickets.size
})

// Methods with proper typing
function onFiltersChange(newFilters: Partial<AppFilters>): void {
  emit('filter-change', newFilters)
}
</script>

<template>
  <div class="details-page">
    <PageToolbar 
      title="Details"
      subtitle="Detailed activity table and logs"
      :last-updated="lastUpdated"
      :filters="filters"
      :is-loading="isLoading"
      @refresh="$emit('refresh')"
      @force-refresh="$emit('force-refresh')"
      @clear-cache="$emit('clear-cache')"
      @filter-change="onFiltersChange"
      :refresh-job="refreshJob"
      :show-refresh-status="showRefreshStatus"
      @hide-refresh-status="$emit('hide-refresh-status')"
      @retry-refresh="$emit('retry-refresh')"
      @cancel-refresh="$emit('cancel-refresh', $event)"
      @check-refresh-status="$emit('check-refresh-status', $event)"
    />

    <!-- Main Content -->
    <div class="details-content">
      <!-- Error State -->
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
      
      <!-- Empty State -->
      <div v-else-if="!isLoading && data.length === 0" class="empty-state">
        <div class="empty-content">
          <h3>No activity data available</h3>
          <p>Load some data using the refresh button above to see detailed activity logs.</p>
        </div>
      </div>
      
      <!-- Loading State -->
      <div v-else-if="isLoading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading activity details...</p>
      </div>
      
      <!-- Content when data exists -->
      <div v-else>
        <!-- Filters -->
      <HoursFilters 
        :filters="filters"
        :repos="availableRepos"
        @filter-change="onFiltersChange"
      />

      <!-- Summary Stats -->
      <div class="summary-stats">
        <div class="stat-item">
          <span class="stat-label">Total Items:</span>
          <span class="stat-value">{{ filteredData.length }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Commits:</span>
          <span class="stat-value">{{ commitCount }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Pull Requests:</span>
          <span class="stat-value">{{ prCount }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Unique Tickets:</span>
          <span class="stat-value">{{ uniqueTickets }}</span>
        </div>
      </div>

      <!-- Table -->
      <div class="table-container">
        <HoursTable 
          :data="filteredData"
          :is-loading="isLoading"
        />
      </div>
      </div> <!-- Close content when data exists -->
    </div>
  </div>
</template>

<style scoped lang="scss">
.details-page {
  @apply bg-app-bg min-h-[calc(100vh-var(--spacing-header-height))];

  .details-content {
    @apply p-6 max-w-content-width mx-auto;

    .summary-stats {
      @apply grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-5;

      .stat-item {
        @apply bg-surface rounded-lg p-4 shadow-sm flex justify-between items-center;

        .stat-label {
          @apply text-sm text-text-muted;
        }

        .stat-value {
          @apply text-lg font-semibold text-brand-secondary;
        }
      }
    }

    .table-container {
      @apply bg-surface rounded-app-card overflow-hidden shadow-sm;
    }
  }

  /* State Components */
  .error-message {
    @apply bg-red-50 text-error p-4 rounded-lg m-6 text-center;
  }

  .empty-state {
    @apply flex items-center justify-center min-h-[60vh] p-6;

    .empty-content {
      @apply text-center max-w-[400px];

      h3 {
        @apply text-text-main mb-4 text-xl;
      }

      p {
        @apply text-text-muted leading-relaxed;
      }
    }
  }

  .loading-state {
    @apply flex flex-col items-center justify-center min-h-[60vh] gap-4;

    .loading-spinner {
      @apply w-8 h-8 border-[3px] border-gray-100 border-t-brand-primary rounded-full animate-spin;
    }

    p {
      @apply text-text-muted;
    }
  }
}

@media (max-width: 640px) {
  .details-page .details-content .summary-stats {
    @apply grid-cols-1;
  }
}
</style>