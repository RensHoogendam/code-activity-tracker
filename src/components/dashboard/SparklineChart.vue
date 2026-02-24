<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Filler, Title, Tooltip, Legend, ChartOptions } from 'chart.js'

// Register Chart.js components needed for a Line Chart
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler // Needed for area fill
)

interface Props {
  data: number[]
  color?: string
}

const props = withDefaults(defineProps<Props>(), {
  color: '#F97316'
})

// Helper to convert hex color to rgba for chart fill
const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const chartData = computed(() => ({
  // Dummy labels are fine for sparklines without axes
  labels: props.data.map((_, i) => i.toString()), 
  datasets: [
    {
      data: props.data,
      borderColor: props.color,
      tension: 0.4, // Smooth line
      fill: true, // Enable area fill
      backgroundColor: hexToRgba(props.color, 0.15), // Fill color with opacity
      pointRadius: 0, // Hide points on the line
      borderWidth: 2,
    }
  ]
}))

const chartOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false }, // Hide legend
    tooltip: { enabled: false } // Hide tooltips
  },
  scales: {
    x: { display: false }, // Hide x-axis
    y: { display: false } // Hide y-axis
  },
  // animation: { 
  //   duration: 2000, // Make animation longer for visibility
  //   easing: 'easeInOutQuad', // Clearer easing function
  //   delay: 5000, // Start animation after a short delay
  //   loop: true
  //   // Chart.js default line animation should provide a "draw itself" effect
  //   // Removed explicit x and y animation objects here to avoid the TypeError
  // }
}
</script>

<template>
  <div class="sparkline">
    <Line :data="chartData" :options="chartOptions" />
  </div>
</template>

<style scoped lang="scss">
.sparkline {
  @apply absolute inset-0 overflow-hidden pointer-events-none;
  
  // Ensure the canvas takes up the full space
  canvas {
    width: 100% !important;
    height: 100% !important;
  }
}
</style>