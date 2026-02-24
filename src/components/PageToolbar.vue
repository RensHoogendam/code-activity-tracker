<script setup lang="ts">
import { RotateCw, Settings, Trash2 } from 'lucide-vue-next'
import RefreshStatus from './RefreshStatus.vue'

import type { AppFilters, RefreshJobStatus } from '../types/bitbucket'

function handleSelectChange(event: Event): void {
  const target = event.target as HTMLSelectElement
  emit('filter-change', { dateRange: parseInt(target.value) })
}

// Props with proper typing
interface Props {
  title?: string
  subtitle?: string
  lastUpdated: Date | null
  isLoading: boolean
  filters: AppFilters
  refreshJob?: RefreshJobStatus | null
  showRefreshStatus?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Dashboard',
  subtitle: 'Activity overview and analytics',
  lastUpdated: null,
  isLoading: false,
  filters: () => ({
    repo: '',
    dateRange: 12,
    author: 'Rens Hoogendam',
    type: 'all'
  }),
  refreshJob: null,
  showRefreshStatus: false
})

// Emits with proper typing
const emit = defineEmits<{
  'refresh': []
  'force-refresh': []
  'clear-cache': []
  'filter-change': [filters: Partial<AppFilters>]
  'hide-refresh-status': []
  'retry-refresh': []
  'cancel-refresh': [jobId: string]
  'check-refresh-status': [jobId: string]
}>()

// Methods with proper typing
function formatLastUpdated(date: Date | null): string {
  if (!date) return 'Never'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}
</script>

<template>
  <div class="page-toolbar">
    <div class="toolbar-container">
      <!-- Left: Page title and description -->
      <div class="toolbar-left">
        <h1 class="page-title">{{ props.title }}</h1>
        <p class="page-description">{{ props.subtitle }}</p>
      </div>

      <!-- Center: Controls -->
      <div class="toolbar-center">
        <!-- Time Period Selector -->
        <div class="control-group">
          <label class="control-label">Time period:</label>
          <select 
            :value="filters.dateRange" 
             @change="handleSelectChange($event)"
            class="period-select"
          >
            <option value="1">Today</option>
            <option value="7">This Week</option>
            <option value="12">Last 12 days</option>
            <option value="30">This Month</option>
          </select>
        </div>
      </div>

      <!-- Right: Actions and status -->
      <div class="toolbar-right">
        <!-- Last Updated -->
        <div class="last-updated">
          <span class="update-label">Last updated:</span>
          <span class="update-time">{{ formatLastUpdated(lastUpdated) }}</span>
        </div>

        <!-- Refresh Controls -->
        <div class="refresh-controls">
          <button 
            @click="$emit('refresh')"
            class="refresh-btn"
            :disabled="isLoading"
          >
            <RotateCw class="icon" :class="{ spinning: isLoading }" :size="16" />
            {{ isLoading ? 'Refreshing...' : 'Refresh' }}
          </button>
          
          <div class="dropdown">
            <button class="dropdown-btn" title="More refresh options">
              <Settings :size="16" />
            </button>
            <div class="dropdown-menu">
              <button @click="$emit('force-refresh')" class="dropdown-item">
                <RotateCw :size="14" /> Force Refresh
              </button>
              <button @click="$emit('clear-cache')" class="dropdown-item">
                <Trash2 :size="14" /> Clear Cache
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Refresh Status Display -->
    <div v-if="showRefreshStatus" class="refresh-status-container">
      <RefreshStatus
        :refresh-job="refreshJob"
        :is-visible="showRefreshStatus"
        @hide="$emit('hide-refresh-status')"
        @retry="$emit('retry-refresh')"
        @cancel="$emit('cancel-refresh', $event)"
        @check-status="$emit('check-refresh-status', $event)"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.page-toolbar {
  @apply bg-surface border-b border-gray-200 py-4;

  .toolbar-container {
    @apply max-w-content-width mx-auto px-6 flex items-center justify-between gap-6;

    .toolbar-left {
      @apply shrink-0;

      .page-title {
        @apply text-2xl font-semibold text-text-main m-0 leading-[1.2] mb-1;
      }

      .page-description {
        @apply text-sm text-text-muted m-0 leading-none;
      }
    }

    .toolbar-center {
      @apply flex items-center gap-6 flex-1 justify-center;

      .control-group {
        @apply flex items-center gap-2;

        .control-label {
          @apply text-sm text-text-main font-medium whitespace-nowrap;
        }

        .period-select {
          @apply bg-white border-2 border-gray-200 text-text-main px-3 py-1.5 rounded text-sm min-w-[140px] transition-colors duration-200;

          &:focus {
            @apply outline-none border-brand-primary;
          }
        }
      }
    }

    .toolbar-right {
      @apply flex items-center gap-4 shrink-0;

      .last-updated {
        @apply flex flex-col items-end text-[0.75rem] text-text-muted;

        .update-label {
          @apply mb-0.5;
        }

        .update-time {
          @apply font-semibold text-text-main;
        }
      }

      .refresh-controls {
        @apply flex items-center gap-1;

        .refresh-btn {
          @apply bg-brand-primary border-none text-white px-4 py-2 rounded font-medium text-sm cursor-pointer transition-all duration-200 flex items-center gap-1.5;

          &:hover:not(:disabled) {
            @apply bg-brand-primary-hover -translate-y-[1px];
          }

          &:disabled {
            @apply bg-gray-300 cursor-not-allowed;
          }

          .icon.spinning {
            @apply animate-spin;
          }
        }

        .dropdown {
          @apply relative;

          &-btn {
            @apply bg-gray-50 border-2 border-gray-200 text-text-main p-1.5 rounded text-sm cursor-pointer transition-all duration-200;

            &:hover {
              @apply bg-gray-100 border-gray-300;
            }
          }

          &-menu {
            @apply absolute top-full right-0 bg-white border border-gray-200 rounded shadow-lg mt-1 min-w-[160px] z-[1000] hidden;

            .dropdown-item {
              @apply flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none text-text-main text-left text-sm cursor-pointer transition-colors duration-200;

              &:hover {
                @apply bg-gray-50;
              }
            }
          }

          &:hover &-menu {
            @apply block;
          }
        }
      }
    }
  }

  .refresh-status-container {
    @apply bg-gray-50 border-t border-gray-200 py-2;

    :deep(.refresh-status) {
      @apply max-w-content-width mx-auto px-6;
    }
  }
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .page-toolbar .toolbar-container {
    @apply flex-col items-start gap-4 px-4;

    .toolbar-center {
      @apply justify-start w-full;
    }

    .toolbar-right {
      @apply justify-between w-full;

      .last-updated {
        @apply items-start;
      }
    }
  }
}

@media (max-width: 480px) {
  .page-toolbar .toolbar-container {
    .toolbar-left .page-title {
      @apply text-xl;
    }

    .toolbar-center {
      @apply flex-col items-start gap-3;
    }

    .toolbar-right {
      .refresh-controls {
        @apply flex-col gap-2 w-full;

        .refresh-btn, .dropdown .dropdown-btn {
          @apply w-full justify-center;
        }
      }
    }
  }
}
</style>