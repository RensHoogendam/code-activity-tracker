<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import Chart from 'chart.js/auto'
import type { ProcessedCommit, AppFilters } from '../../types/bitbucket'

interface Props {
  data: ProcessedCommit[]
  filters: AppFilters
  dateRangeText: string
}

const props = defineProps<Props>()

const chartRef = ref<HTMLCanvasElement>()
let chartInstance: Chart | null = null

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

function initChart() {
  if (!chartRef.value) return
  
  const ctx = chartRef.value.getContext('2d')
  if (!ctx) return
  
  const dailyData = getDailyActivityData()
  
  if (chartInstance) {
    chartInstance.destroy()
  }
  
  chartInstance = new Chart(ctx, {
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

function updateChart() {
  if (chartInstance) {
    const dailyData = getDailyActivityData()
    chartInstance.data.labels = dailyData.labels
    chartInstance.data.datasets[0].data = dailyData.commits
    chartInstance.update()
  }
}

watch(() => props.data, async () => {
  await nextTick()
  if (props.data && props.data.length > 0) {
    if (!chartInstance) {
      initChart()
    } else {
      updateChart()
    }
  }
}, { deep: true })

onMounted(() => {
  if (props.data && props.data.length > 0) {
    initChart()
  }
})

onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.destroy()
  }
})
</script>

<template>
  <div class="chart-container">
    <div class="chart-header">
      <h3>Daily Activity</h3>
      <div class="chart-period">{{ dateRangeText }}</div>
    </div>
    <div class="chart-content">
      <canvas ref="chartRef"></canvas>
    </div>
  </div>
</template>

<style scoped lang="scss">
.chart-container {
  @apply bg-surface rounded-app-card p-6 shadow-sm;

  .chart-header {
    @apply flex justify-between items-center mb-5;

    h3 {
      @apply text-lg font-semibold text-text-main m-0;
    }

    .chart-period {
      @apply text-sm text-text-muted;
    }
  }

  .chart-content {
    @apply h-[200px] relative;
  }
}
</style>
