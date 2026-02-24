<script setup lang="ts">
import { computed } from 'vue'
import PageToolbar from './PageToolbar.vue'
import MetricsGrid from './dashboard/MetricsGrid.vue'
import ActivityChart from './dashboard/ActivityChart.vue'
import RepoDistributionChart from './dashboard/RepoDistributionChart.vue'
import ActivityFeed from './dashboard/ActivityFeed.vue'
import TopReposList from './dashboard/TopReposList.vue'

import type {
  ProcessedCommit,
  AppFilters,
  RepoActivity,
  DashboardMetrics
} from '../types/bitbucket'

// Props with proper typing
interface Props {
  data: ProcessedCommit[]
  filters: AppFilters
  isLoading: boolean
  lastUpdated: Date | null
  error: string | null
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
  error: null
})

// Emits with proper typing
const emit = defineEmits<{
  'filter-change': [filters: Partial<AppFilters>]
  'refresh': []
  'force-refresh': []
  'clear-cache': []
}>()

// Computed properties
const metrics = computed((): DashboardMetrics => {
  const commits = props.data.filter((item: ProcessedCommit) => item.commit_hash)
  const prs = props.data.filter((item: ProcessedCommit) => !item.commit_hash)
  const tickets = [...new Set(props.data.filter((item: ProcessedCommit) => item.ticket).map((item: ProcessedCommit) => item.ticket))]
  const repos = [...new Set(props.data.map((item: ProcessedCommit) => item.repo))]
  
  return {
    totalCommits: commits.length,
    totalPRs: prs.length,
    uniqueTickets: tickets.length,
    activeRepos: repos.length,
    commitsTrend: Math.floor(Math.random() * 30) - 10, // Mock trends
    prsTrend: Math.floor(Math.random() * 20) - 5,
    ticketsTrend: Math.floor(Math.random() * 15) - 5,
    reposTrend: Math.floor(Math.random() * 10) - 2
  }
})

const recentActivity = computed((): ProcessedCommit[] => {
  return [...props.data]
    .sort((a: ProcessedCommit, b: ProcessedCommit) => {
      const aDate = new Date(a.commit_date || a.pr_updated_on || '1970-01-01')
      const bDate = new Date(b.commit_date || b.pr_updated_on || '1970-01-01')
      return bDate.getTime() - aDate.getTime()
    })
    .slice(0, 10)
})

const topRepos = computed((): RepoActivity[] => {
  const repoCounts: Record<string, number> = {}
  
  props.data.forEach((item: ProcessedCommit) => {
    if (item.commit_hash) { // Only count commits
      repoCounts[item.repo] = (repoCounts[item.repo] || 0) + 1
    }
  })
  
  return Object.entries(repoCounts)
    .map(([name, count]) => ({ 
      name, 
      commits: count,
      count: count,
      pullRequests: 0,
      lastActivity: ''
    }))
    .sort((a, b) => b.commits - a.commits)
    .slice(0, 5)
})

function onFiltersChange(newFilters: Partial<AppFilters>): void {
  const updatedFilters: AppFilters = { ...props.filters, ...newFilters }
  emit('filter-change', updatedFilters)
}

function getDateRangeText(): string {
  const days = props.filters.dateRange
  if (days === 1) return 'Today'
  if (days === 7) return 'Last 7 days'
  if (days === 12) return 'Last 12 days'
  if (days === 30) return 'Last 30 days'
  return `Last ${days} days`
}
</script>

<template>
  <div class="dashboard">
    <PageToolbar 
      :last-updated="lastUpdated"
      :filters="filters"
      :is-loading="isLoading"
      @refresh="$emit('refresh')"
      @force-refresh="$emit('force-refresh')"
      @clear-cache="$emit('clear-cache')"
      @filter-change="onFiltersChange"
    />
    
    <!-- Error State -->
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
    
    <!-- Empty State -->
    <div v-else-if="!isLoading && data.length === 0" class="empty-state">
      <div class="empty-content">
        <h3>Ready to fetch your hours data!</h3>
        <p>Select the repositories you want to include in Settings, then click the refresh button to load your data.</p>
        <router-link to="/settings" class="settings-link">Go to Settings →</router-link>
      </div>
    </div>
    
    <!-- Loading State -->
    <div v-else-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading your activity data...</p>
    </div>
    
    <!-- Dashboard Content -->
    <div v-else class="dashboard-content">
      <MetricsGrid :metrics="metrics" />

      <div class="charts-section">
        <div class="chart-row">
          <ActivityChart 
            :data="data" 
            :filters="filters" 
            :date-range-text="getDateRangeText()" 
          />
          <RepoDistributionChart :top-repos="topRepos" />
        </div>

        <div class="chart-row">
          <ActivityFeed :recent-activity="recentActivity" />
          <TopReposList :top-repos="topRepos" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.dashboard {
  @apply bg-app-bg min-h-[calc(100vh-var(--spacing-header-height))];

  &-content {
    @apply max-w-content-width mx-auto px-6 pb-6 pt-4;

    .charts-section {
      @apply flex flex-col gap-5;

      .chart-row {
        @apply grid grid-cols-2 gap-5;

        @media (max-width: 1024px) {
          @apply grid-cols-1;
        }
      }
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
        @apply text-text-muted mb-6 leading-relaxed;
      }

      .settings-link {
        @apply inline-flex items-center px-6 py-3 bg-brand-primary text-white no-underline rounded-lg font-medium transition-colors hover:bg-brand-primary-hover;
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
</style>
