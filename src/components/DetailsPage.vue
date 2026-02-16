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

<style scoped>
.details-page {
  background: #f4f5f7;
  min-height: calc(100vh - 56px);
}

.details-header {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.breadcrumb-link {
  color: #F97316;
  text-decoration: none;
  font-weight: 500;
}

.breadcrumb-link:hover {
  text-decoration: underline;
}

.breadcrumb-separator {
  color: #6b7280;
}

.breadcrumb-current {
  color: #1f2937;
  font-weight: 600;
}

.export-btn {
  background: #F97316;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.export-btn:hover {
  background: #ea580c;
}

.filters-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.summary-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.stat-item {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #F97316;
}

.table-container {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

/* State Components */
.error-message {
  background: #fee;
  color: #dc2626;
  padding: 16px;
  border-radius: 8px;
  margin: 24px;
  text-align: center;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 24px;
}

.empty-content {
  text-align: center;
  max-width: 400px;
}

.empty-content h3 {
  color: #1f2937;
  margin-bottom: 16px;
  font-size: 20px;
}

.empty-content p {
  color: #6b7280;
  line-height: 1.6;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 16px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f3f4f6;
  border-top: 3px solid #0052CC;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-state p {
  color: #6b7280;
}

@media (max-width: 640px) {
  .header-content {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
  
  .summary-stats {
    grid-template-columns: 1fr;
  }
}
</style>

<style scoped>
.details-page {
  background: #f4f5f7;
  min-height: calc(100vh - 56px);
}

.details-header {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.breadcrumb-link {
  color: #F97316;
  text-decoration: none;
  font-weight: 500;
}

.breadcrumb-link:hover {
  text-decoration: underline;
}

.breadcrumb-separator {
  color: #6b7280;
}

.breadcrumb-current {
  color: #1f2937;
  font-weight: 600;
}

.export-btn {
  background: #F97316;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.export-btn:hover {
  background: #ea580c;
}

.filters-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.summary-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.stat-item {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #F97316;
}

.table-container {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

/* State Components */
.error-message {
  background: #fee;
  color: #dc2626;
  padding: 16px;
  border-radius: 8px;
  margin: 24px;
  text-align: center;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 24px;
}

.empty-content {
  text-align: center;
  max-width: 400px;
}

.empty-content h3 {
  color: #1f2937;
  margin-bottom: 16px;
  font-size: 20px;
}

.empty-content p {
  color: #6b7280;
  line-height: 1.6;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 16px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f3f4f6;
  border-top: 3px solid #0052CC;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-state p {
  color: #6b7280;
}

@media (max-width: 640px) {
  .header-content {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
  
  .summary-stats {
    grid-template-columns: 1fr;
  }
}
</style>