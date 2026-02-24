<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import Chart from 'chart.js/auto'
import type { RepoActivity } from '../../types/bitbucket'

interface Props {
  topRepos: RepoActivity[]
}

const props = defineProps<Props>()

const chartRef = ref<HTMLCanvasElement>()
let chartInstance: Chart | null = null

function initChart() {
  if (!chartRef.value) return
  
  const ctx = chartRef.value.getContext('2d')
  if (!ctx) return
  
  if (chartInstance) {
    chartInstance.destroy()
  }
  
  chartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: props.topRepos.slice(0, 5).map(r => r.name),
      datasets: [{
        data: props.topRepos.slice(0, 5).map(r => r.commits),
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

function updateChart() {
  if (chartInstance) {
    chartInstance.data.labels = props.topRepos.slice(0, 5).map(r => r.name)
    chartInstance.data.datasets[0].data = props.topRepos.slice(0, 5).map(r => r.commits)
    chartInstance.update()
  }
}

watch(() => props.topRepos, async () => {
  await nextTick()
  if (props.topRepos && props.topRepos.length > 0) {
    if (!chartInstance) {
      initChart()
    } else {
      updateChart()
    }
  }
}, { deep: true })

onMounted(() => {
  if (props.topRepos && props.topRepos.length > 0) {
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
      <h3>Repository Activity</h3>
      <div class="chart-period">Commits by repo</div>
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
