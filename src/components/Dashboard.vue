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

<style scoped>
.dashboard {
  background: #f4f5f7;
  min-height: calc(100vh - 56px);
}

.dashboard-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px 24px 24px; /* Only left, right, bottom padding */
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.metric-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  gap: 16px;
}

.metric-icon {
  width: 48px;
  height: 48px;
  background: #FEF3E2;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #F97316;
}

.metric-value {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1;
}

.metric-label {
  font-size: 14px;
  color: #6b7280;
  margin: 4px 0;
}

.metric-change {
  font-size: 12px;
  color: #dc2626;
  font-weight: 500;
}

.metric-change.positive {
  color: #16a34a;
}

.charts-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.chart-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.chart-container, .activity-feed, .top-repos {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.chart-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.chart-period {
  font-size: 14px;
  color: #6b7280;
}

.view-all-link {
  color: #F97316;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
}

.view-all-link:hover {
  text-decoration: underline;
}

.chart-content {
  height: 200px;
  position: relative;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  background: #fafbfc;
}

.activity-icon {
  width: 32px;
  height: 32px;
  background: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #6b7280;
}

.activity-content {
  flex: 1;
  min-width: 0;
}

.activity-title {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.activity-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #6b7280;
}

.repo {
  background: #e5e7eb;
  padding: 2px 6px;
  border-radius: 4px;
}

.ticket {
  background: #FEF3E2;
  color: #F97316;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.repo-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.repo-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.repo-info {
  flex: 1;
}

.repo-name {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
}

.repo-count {
  font-size: 12px;
  color: #6b7280;
}

.repo-bar {
  flex: 2;
  height: 6px;
  background: #f1f5f9;
  border-radius: 3px;
  overflow: hidden;
}

.repo-bar-fill {
  height: 100%;
  background: #F97316;
  border-radius: 3px;
  transition: width 0.3s ease;
}

@media (max-width: 1024px) {
  .chart-row {
    grid-template-columns: 1fr;
  }
  
  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .metrics-grid {
    grid-template-columns: 1fr;
  }
  
  .header-content {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
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
  margin-bottom: 24px;
  line-height: 1.6;
}

.settings-link {
  display: inline-flex;
  align-items: center;
  padding: 12px 24px;
  background: #0052CC;
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.settings-link:hover {
  background: #003A8C;
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
</style>