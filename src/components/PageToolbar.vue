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

<style scoped>
.page-toolbar {
  background: white;
  border-bottom: 1px solid #e1e5e9;
  padding: 16px 0;
}

.toolbar-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.toolbar-left {
  flex-shrink: 0;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #172B4D;
  margin: 0 0 4px 0;
  line-height: 1.2;
}

.page-description {
  font-size: 0.875rem;
  color: #6B778C;
  margin: 0;
  line-height: 1;
}

.toolbar-center {
  display: flex;
  align-items: center;
  gap: 24px;
  flex: 1;
  justify-content: center;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-label {
  font-size: 0.875rem;
  color: #172B4D;
  font-weight: 500;
  white-space: nowrap;
}

.period-select {
  background: white;
  border: 2px solid #DFE1E6;
  color: #172B4D;
  padding: 6px 12px;
  border-radius: 3px;
  font-size: 0.875rem;
  min-width: 140px;
  transition: border-color 0.2s;
}

.period-select:focus {
  outline: none;
  border-color: #0052CC;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.last-updated {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-size: 0.75rem;
  color: #6B778C;
}

.update-label {
  margin-bottom: 2px;
}

.update-time {
  font-weight: 600;
  color: #172B4D;
}

.refresh-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.refresh-btn {
  background: #0052CC;
  border: none;
  color: white;
  padding: 8px 16px;
  border-radius: 3px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.refresh-btn:hover:not(:disabled) {
  background: #0747A6;
  transform: translateY(-1px);
}

.refresh-btn:disabled {
  background: #B3BAC5;
  cursor: not-allowed;
}

.dropdown {
  position: relative;
}

.dropdown-btn {
  background: #F4F5F7;
  border: 2px solid #DFE1E6;
  color: #172B4D;
  padding: 6px 8px;
  border-radius: 3px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.dropdown-btn:hover {
  background: #EBECF0;
  border-color: #C1C7D0;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #C1C7D0;
  border-radius: 3px;
  box-shadow: 0 4px 8px rgba(9, 30, 66, 0.25);
  margin-top: 4px;
  min-width: 160px;
  z-index: 1000;
  display: none;
}

.dropdown:hover .dropdown-menu {
  display: block;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  background: none;
  border: none;
  color: #172B4D;
  text-align: left;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.2s;
}

.dropdown-item:hover {
  background: #F4F5F7;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.refresh-status-container {
  background: #f8f9fa;
  border-top: 1px solid #e1e5e9;
  padding: 8px 0;
}

.refresh-status-container :deep(.refresh-status) {
  max-width: 1400px;
  margin: 0 auto;
  margin-left: 24px;
  margin-right: 24px;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .toolbar-container {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 0 16px;
  }
  
  .toolbar-center {
    justify-content: flex-start;
    width: 100%;
  }
  
  .toolbar-right {
    justify-content: space-between;
    width: 100%;
  }
  
  .last-updated {
    align-items: flex-start;
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 1.25rem;
  }
  
  .toolbar-center {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .refresh-controls {
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }
  
  .refresh-btn, .dropdown-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>