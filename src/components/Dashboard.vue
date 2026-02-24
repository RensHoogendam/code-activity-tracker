<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount, type Ref } from 'vue'
import Chart from 'chart.js/auto'
import PageToolbar from './PageToolbar.vue'
import { TrendingUp, GitMerge, Ticket, Folder, Save, GitPullRequest } from 'lucide-vue-next'

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

// Chart instances with proper typing
const activityChartInstance: Ref<Chart | null> = ref(null)
const repoChartInstance: Ref<Chart | null> = ref(null)

// Template refs
const activityChart = ref<HTMLCanvasElement>()
const repoChart = ref<HTMLCanvasElement>()

// Computed properties with explicit return types
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
      count: count, // Alias for backward compatibility
      pullRequests: 0, // Could be calculated if needed
      lastActivity: '' // Could be calculated if needed
    }))
    .sort((a, b) => b.commits - a.commits)
    .slice(0, 5)
})
// Watchers
watch(() => props.data, async () => {
  await nextTick()
  if (props.data && props.data.length > 0) {
    // If charts aren't initialized yet, initialize them
    if (!activityChartInstance.value || !repoChartInstance.value) {
      initCharts()
    } else {
      // Otherwise just update them
      updateCharts()
    }
  }
}, { deep: true })

// Lifecycle hooks  
onMounted(() => {
  // Don't initialize charts immediately - wait for data to arrive
  // Charts will be initialized when data watcher triggers
})

onBeforeUnmount(() => {
  if (activityChartInstance.value) {
    activityChartInstance.value.destroy()
  }
  if (repoChartInstance.value) {
    repoChartInstance.value.destroy()
  }
})

// Methods with proper typing
function onFiltersChange(newFilters: Partial<AppFilters>): void {
  // Update local filters and emit the change
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

function getDisplayTitle(item: ProcessedCommit): string {
  if (item.commit_hash) {
    return item.commit_message?.split('\n')[0]?.slice(0, 60) + '...' || 'Commit'
  }
  return item.pr?.slice(0, 60) + '...' || 'Pull Request'
}

function formatRelativeTime(dateString: string | undefined): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'Just now'
}

function initCharts(): void {
  console.log('Initializing charts with data:', props.data?.length || 0, 'items')
  initActivityChart()
  initRepoChart()
}

function initActivityChart(): void {
  if (!activityChart.value) {
    console.warn('Activity chart ref not found')
    return
  }
  
  const ctx = activityChart.value.getContext('2d')
  if (!ctx) {
    console.warn('Could not get 2D context for activity chart')
    return
  }
  
  // Prepare daily activity data
  const dailyData = getDailyActivityData()
  console.log('Daily activity data:', dailyData)
  
  // Destroy existing chart if it exists
  if (activityChartInstance.value) {
    activityChartInstance.value.destroy()
  }
  
  activityChartInstance.value = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: dailyData.labels,
      datasets: [{
        label: 'Commits',
        data: dailyData.commits,
        backgroundColor: '#F97316',
        borderRadius: 4,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: '#f1f5f9' },
          ticks: { color: '#64748b' }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#64748b' }
        }
      }
    }
  })
}

function initRepoChart(): void {
  if (!repoChart.value) {
    console.warn('Repo chart ref not found')
    return
  }
  
  const ctx = repoChart.value.getContext('2d')
  if (!ctx) {
    console.warn('Could not get 2D context for repo chart')
    return
  }
  console.log('Top repos data:', topRepos.value)
  
  // Destroy existing chart if it exists
  if (repoChartInstance.value) {
    repoChartInstance.value.destroy()
  }
  
  repoChartInstance.value = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: topRepos.value.slice(0, 5).map(r => r.name),
      datasets: [{
        data: topRepos.value.slice(0, 5).map(r => r.commits),
        backgroundColor: [
          '#F97316',
          '#FB923C', 
          '#FDBA74',
          '#FED7AA',
          '#FFEDD5'
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#64748b', usePointStyle: true }
        }
      }
    }
  })
}

interface DailyActivityData {
  labels: string[];
  commits: number[];
}

function getDailyActivityData(): DailyActivityData {
  const days = props.filters.dateRange || 12
  const labels: string[] = []
  const commits: number[] = []
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    
    labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
    
    const dayCommits = props.data.filter((item: ProcessedCommit) => {
      if (!item.commit_date) return false
      const itemDate = new Date(item.commit_date).toISOString().split('T')[0]
      return itemDate === dateStr
    }).length
    
    commits.push(dayCommits)
  }
  
  return { labels, commits }
}

function updateCharts(): void {
  if (activityChartInstance.value) {
    const dailyData = getDailyActivityData()
    activityChartInstance.value.data.labels = dailyData.labels
    activityChartInstance.value.data.datasets[0].data = dailyData.commits
    activityChartInstance.value.update()
  }
  
  if (repoChartInstance.value) {
    repoChartInstance.value.data.labels = topRepos.value.slice(0, 5).map(r => r.name)
    repoChartInstance.value.data.datasets[0].data = topRepos.value.slice(0, 5).map(r => r.commits)
    repoChartInstance.value.update()
  }
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
      <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-icon">
          <TrendingUp :size="24" />
        </div>
        <div class="metric-content">
          <div class="metric-value">{{ metrics.totalCommits }}</div>
          <div class="metric-label">Commits</div>
          <div class="metric-change" :class="{ positive: metrics.commitsTrend > 0 }">
            {{ metrics.commitsTrend > 0 ? '+' : '' }}{{ metrics.commitsTrend }}%
          </div>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-icon">
          <GitMerge :size="24" />
        </div>
        <div class="metric-content">
          <div class="metric-value">{{ metrics.totalPRs }}</div>
          <div class="metric-label">Pull Requests</div>
          <div class="metric-change" :class="{ positive: metrics.prsTrend > 0 }">
            {{ metrics.prsTrend > 0 ? '+' : '' }}{{ metrics.prsTrend }}%
          </div>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-icon">
          <Ticket :size="24" />
        </div>
        <div class="metric-content">
          <div class="metric-value">{{ metrics.uniqueTickets }}</div>
          <div class="metric-label">Tickets</div>
          <div class="metric-change" :class="{ positive: metrics.ticketsTrend > 0 }">
            {{ metrics.ticketsTrend > 0 ? '+' : '' }}{{ metrics.ticketsTrend }}%
          </div>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-icon">
          <Folder :size="24" />
        </div>
        <div class="metric-content">
          <div class="metric-value">{{ metrics.activeRepos }}</div>
          <div class="metric-label">Active Repos</div>
          <div class="metric-change" :class="{ positive: metrics.reposTrend > 0 }">
            {{ metrics.reposTrend > 0 ? '+' : '' }}{{ metrics.reposTrend }}%
          </div>
        </div>
      </div>
    </div>

    <!-- Charts Section -->
    <div class="charts-section">
      <div class="chart-row">
        <!-- Activity Chart -->
        <div class="chart-container">
          <div class="chart-header">
            <h3>Daily Activity</h3>
            <div class="chart-period">{{ getDateRangeText() }}</div>
          </div>
          <div class="chart-content">
            <canvas ref="activityChart" width="400" height="200"></canvas>
          </div>
        </div>

        <!-- Repository Distribution -->
        <div class="chart-container">
          <div class="chart-header">
            <h3>Repository Activity</h3>
            <div class="chart-period">Commits by repo</div>
          </div>
          <div class="chart-content">
            <canvas ref="repoChart" width="400" height="200"></canvas>
          </div>
        </div>
      </div>

      <div class="chart-row">
        <!-- Recent Activity -->
        <div class="activity-feed">
          <div class="chart-header">
            <h3>Recent Activity</h3>
            <router-link to="/details" class="view-all-link">View All →</router-link>
          </div>
          <div class="activity-list">
            <div 
              v-for="item in recentActivity.slice(0, 6)" 
              :key="String(item.commit_hash || item.pr_id || Math.random())" 
              class="activity-item"
            >
              <div class="activity-icon">
                <Save v-if="item.commit_hash" :size="16" />
                <GitPullRequest v-else :size="16" />
              </div>
              <div class="activity-content">
                <div class="activity-title">
                  {{ getDisplayTitle(item) }}
                </div>
                <div class="activity-meta">
                  <span class="repo">{{ item.repo }}</span>
                  <span class="date">{{ formatRelativeTime(item.commit_date || item.pr_updated_on || '') }}</span>
                  <span v-if="item.ticket" class="ticket">{{ item.ticket }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Top Repositories -->
        <div class="top-repos">
          <div class="chart-header">
            <h3>Most Active Repos</h3>
            <div class="chart-period">This period</div>
          </div>
          <div class="repo-list">
            <div 
              v-for="repo in topRepos" 
              :key="repo.name" 
              class="repo-item"
            >
              <div class="repo-info">
                <div class="repo-name">{{ repo.name }}</div>
                <div class="repo-count">{{ repo.commits }} commits</div>
              </div>
              <div class="repo-bar">
                <div 
                  class="repo-bar-fill" 
                  :style="{ width: `${(repo.commits / topRepos[0].commits) * 100}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div> <!-- Close dashboard-content -->
  </div>
</template>



<style scoped lang="scss">
.dashboard {
  @apply bg-app-bg min-h-[calc(100vh-var(--spacing-header-height))];

  &-content {
    @apply max-w-content-width mx-auto px-6 pb-6 pt-0;

    .metrics-grid {
      @apply grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-5 mb-6;

      .metric-card {
        @apply bg-surface rounded-app-card p-6 shadow-sm flex items-center gap-4;

        .metric-icon {
          @apply w-12 h-12 bg-orange-50 rounded-app-card flex items-center justify-center text-brand-secondary;
        }

        .metric-value {
          @apply text-[28px] font-bold text-text-main leading-none;
        }

        .metric-label {
          @apply text-sm text-text-muted my-1;
        }

        .metric-change {
          @apply text-xs text-error font-medium;

          &.positive {
            @apply text-success;
          }
        }
      }
    }

    .charts-section {
      @apply flex flex-col gap-5;

      .chart-row {
        @apply grid grid-cols-2 gap-5;

        @media (max-width: 1024px) {
          @apply grid-cols-1;
        }
      }

      .chart-container, .activity-feed, .top-repos {
        @apply bg-surface rounded-app-card p-6 shadow-sm;

        .chart-header {
          @apply flex justify-between items-center mb-5;

          h3 {
            @apply text-lg font-semibold text-text-main m-0;
          }

          .chart-period {
            @apply text-sm text-text-muted;
          }

          .view-all-link {
            @apply text-brand-secondary no-underline text-sm font-medium hover:underline;
          }
        }

        .chart-content {
          @apply h-[200px] relative;
        }
      }

      .activity-list {
        @apply flex flex-col gap-4;

        .activity-item {
          @apply flex items-start gap-3 p-3 rounded-lg bg-gray-50;

          .activity-icon {
            @apply w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0 text-text-muted;
          }

          .activity-content {
            @apply flex-1 min-w-0;

            .activity-title {
              @apply text-sm font-medium text-text-main mb-1 truncate;
            }

            .activity-meta {
              @apply flex gap-3 text-xs text-text-muted;

              .repo {
                @apply bg-gray-200 px-1.5 py-0.5 rounded;
              }

              .ticket {
                @apply bg-orange-50 text-brand-secondary px-1.5 py-0.5 rounded font-medium;
              }
            }
          }
        }
      }

      .repo-list {
        @apply flex flex-col gap-4;

        .repo-item {
          @apply flex items-center gap-3;

          .repo-info {
            @apply flex-1;

            .repo-name {
              @apply text-sm font-medium text-text-main;
            }

            .repo-count {
              @apply text-xs text-text-muted;
            }
          }

          .repo-bar {
            @apply flex-[2] h-1.5 bg-gray-100 rounded-[3px] overflow-hidden;

            &-fill {
              @apply h-full bg-brand-secondary rounded-[3px] transition-[width] duration-300 ease-in-out;
            }
          }
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

@media (max-width: 1024px) {
  .dashboard-content .metrics-grid {
    @apply grid-cols-2;
  }
}

@media (max-width: 640px) {
  .dashboard-content .metrics-grid {
    @apply grid-cols-1;
  }
}
</style>