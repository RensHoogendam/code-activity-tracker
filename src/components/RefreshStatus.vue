<script setup lang="ts">
import { computed, watch, onBeforeUnmount } from 'vue'
import { CheckCircle, AlertCircle, Clock, Loader2, StopCircle } from 'lucide-vue-next'
import type { RefreshJobStatus } from '../types/bitbucket'

// Props
interface Props {
  refreshJob: RefreshJobStatus | null
  isVisible?: boolean
  autoHide?: boolean
  autoHideDelay?: number
  allowCancel?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  refreshJob: null,
  isVisible: true,
  autoHide: true,
  autoHideDelay: 5000, // 5 seconds
  allowCancel: true
})

// Emits
const emit = defineEmits<{
  'hide': []
  'retry': []
  'cancel': [jobId: string]
  'check-status': [jobId: string]
}>()

// Computed properties
const statusIcon = computed(() => {
  if (!props.refreshJob) return Clock
  
  switch (props.refreshJob.status) {
    case 'started':
    case 'processing':
      return Loader2
    case 'completed':
      return CheckCircle
    case 'failed':
      return AlertCircle
    case 'cancelled':
      return StopCircle
    default:
      return Clock
  }
})

const statusClass = computed(() => {
  if (!props.refreshJob) return 'status-idle'
  
  switch (props.refreshJob.status) {
    case 'started':
      return 'status-started'
    case 'processing':
      return 'status-processing'
    case 'completed':
      return 'status-completed'
    case 'failed':
      return 'status-failed'
    case 'cancelled':
      return 'status-cancelled'
    default:
      return 'status-idle'
  }
})

const progressBarWidth = computed(() => {
  if (!props.refreshJob?.progress) return 0
  return Math.min(props.refreshJob.progress, 100)
})

const timeElapsed = computed(() => {
  if (!props.refreshJob) return null
  return props.refreshJob.elapsed_time_human || `${props.refreshJob.elapsed_time || 0}s`
})

const timeSinceUpdate = computed(() => {
  if (!props.refreshJob?.time_since_update) return null
  return props.refreshJob.time_since_update.human_readable
})

const jobParameters = computed(() => {
  if (!props.refreshJob?.parameters) return null
  
  const params = props.refreshJob.parameters
  return {
    days: params.max_days,
    repos: params.selected_repos_count,
    author: params.author_filter
  }
})

const currentRepository = computed(() => {
  if (!props.refreshJob?.message) return null
  return getRepositoryFromMessage(props.refreshJob.message)
})

const repositoryProgress = computed(() => {
  if (!props.refreshJob?.message) return null
  return getProgressFromMessage(props.refreshJob.message)
})

const repositoryProgressPercent = computed(() => {
  const progress = repositoryProgress.value
  if (!progress) return 0
  return (progress.current / progress.total) * 100
})

const isActive = computed(() => {
  return props.refreshJob?.is_running || false
})

const canCancel = computed(() => {
  return props.allowCancel && 
         props.refreshJob?.is_running && 
         !props.refreshJob?.is_completed && 
         !props.refreshJob?.is_failed && 
         !props.refreshJob?.is_cancelled
})

const shouldShow = computed(() => {
  return props.isVisible && props.refreshJob !== null
})

// Auto-hide functionality
let autoHideTimeout: NodeJS.Timeout | null = null

watch(() => props.refreshJob?.status, (newStatus) => {
  if (props.autoHide && (newStatus === 'completed' || newStatus === 'failed' || newStatus === 'cancelled')) {
    clearTimeout(autoHideTimeout as NodeJS.Timeout)
    autoHideTimeout = setTimeout(() => {
      emit('hide')
    }, props.autoHideDelay)
  }
}, { immediate: true })

onBeforeUnmount(() => {
  if (autoHideTimeout) {
    clearTimeout(autoHideTimeout)
  }
})

// Methods
function formatJobId(jobId: string): string {
  // Show last 12 characters for more context with detailed jobs
  return jobId.length > 12 ? `...${jobId.slice(-12)}` : jobId
}

function handleRetry(): void {
  emit('retry')
}

function handleCancel(): void {
  if (props.refreshJob?.job_id) {
    emit('cancel', props.refreshJob.job_id)
  }
}

function handleCheckStatus(): void {
  if (props.refreshJob?.job_id) {
    emit('check-status', props.refreshJob.job_id)
  }
}

function getRepositoryFromMessage(message: string): string | null {
  // Extract repository name from message like "Processing atabix\/database-accounts-api (1\/5)"
  const match = message.match(/Processing ([^\s]+(?:\/[^\s]+)?)/)
  return match ? match[1].replace(/\\/g, '/') : null
}

function getProgressFromMessage(message: string): { current: number; total: number } | null {
  // Extract progress like "(1/5)" from message
  const match = message.match(/\((\d+)\/(\d+)\)/)
  return match ? { current: parseInt(match[1]), total: parseInt(match[2]) } : null
}
</script>

<template>
  <Transition name="refresh-status" mode="out-in">
    <div v-if="shouldShow" :class="['refresh-status', statusClass]">
      <!-- Main Status Display -->
      <div class="status-content">
        <!-- Status Icon with Animation -->
        <div class="status-icon">
          <component 
            :is="statusIcon" 
            :class="{ 'animate-spin': isActive }"
            :size="20"
          />
        </div>
        
        <!-- Status Text -->
        <div class="status-text">
          <div class="status-message">{{ refreshJob?.message || 'Processing...' }}</div>
          
          <!-- Job Details -->
          <div class="status-details">
            <span v-if="refreshJob?.job_id" class="job-id">
              Job: {{ formatJobId(refreshJob.job_id) }}
            </span>
            
            <span v-if="timeElapsed" class="time-elapsed">
              ⏱️ {{ timeElapsed }}
            </span>
            
            <span v-if="timeSinceUpdate && refreshJob?.is_running" class="time-since-update">
              🔄 {{ timeSinceUpdate }}
            </span>
          </div>
          
          <!-- Job Parameters -->
          <div v-if="jobParameters" class="job-parameters">
            <div class="param-item">
              <span class="param-label">Timeframe:</span>
              <span class="param-value">{{ jobParameters.days }} days</span>
            </div>
            <div class="param-item">
              <span class="param-label">Repositories:</span>
              <span class="param-value">{{ jobParameters.repos }}</span>
            </div>
            <div class="param-item">
              <span class="param-label">Author:</span>
              <span class="param-value">{{ jobParameters.author }}</span>
            </div>
          </div>
          
          <!-- Repository Progress (if available in message) -->
          <div v-if="repositoryProgress" class="repo-progress">
            <div class="progress-info">
              <span class="current-repo">{{ currentRepository }}</span>
              <span class="progress-fraction">
                {{ repositoryProgress.current }} / {{ repositoryProgress.total }}
              </span>
            </div>
            <div class="mini-progress-bar">
              <div 
                class="mini-progress-fill"
                :style="{ width: `${repositoryProgressPercent}%` }"
              ></div>
            </div>
          </div>
        </div>
        
        <!-- Progress Bar -->
        <div v-if="refreshJob?.progress" class="progress-container">
          <div class="progress-bar">
            <div 
              class="progress-fill"
              :style="{ width: `${progressBarWidth}%` }"
            ></div>
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="status-actions">
          <button 
            v-if="refreshJob?.status === 'failed'" 
            @click="handleRetry"
            class="action-btn retry-btn"
            title="Retry refresh"
          >
            Retry
          </button>
          
          <button 
            v-if="canCancel"
            @click="handleCancel"
            class="action-btn cancel-btn"
            title="Stop refresh job"
          >
            <StopCircle :size="14" />
            Stop
          </button>
          
          <button 
            v-if="isActive"
            @click="handleCheckStatus"
            class="action-btn check-btn"
            title="Check status"
          >
            <Clock :size="14" />
          </button>
          
          <button 
            @click="$emit('hide')"
            class="action-btn close-btn"
            title="Hide"
          >
            ×
          </button>
        </div>
      </div>
      
      <!-- Pulse Animation for Active Status -->
      <div v-if="isActive" class="pulse-ring"></div>
    </div>
  </Transition>
</template>

<style scoped lang="scss">
.refresh-status {
  @apply relative bg-surface rounded-app-card shadow-xl p-4 my-2 border-l-4 border-text-muted overflow-hidden transition-all duration-300;

  /* Status Color Variants */
  &.status-started,
  &.status-processing {
    @apply border-l-brand-primary bg-gradient-to-r from-blue-50/50 to-transparent;
  }

  &.status-completed {
    @apply border-l-success bg-gradient-to-r from-green-50/50 to-transparent;
  }

  &.status-failed {
    @apply border-l-error bg-gradient-to-r from-red-50/50 to-transparent;
  }

  &.status-cancelled {
    @apply border-l-warning bg-gradient-to-r from-orange-50/50 to-transparent;
  }

  &.status-idle {
    @apply border-l-text-muted bg-gradient-to-r from-gray-50/50 to-transparent;
  }

  /* Content Layout */
  .status-content {
    @apply flex items-center gap-3.5 relative z-[2];

    .status-icon {
      @apply shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-white/80 shadow-sm;

      .animate-spin {
        @apply animate-[spin_1.5s_linear_infinite];
      }
    }
  }

  &.status-started,
  &.status-processing {
    .status-icon {
      @apply bg-gradient-to-br from-blue-50 to-blue-200 text-brand-primary;
    }
  }

  &.status-completed .status-icon {
    @apply bg-gradient-to-br from-green-50 to-green-200 text-success;
  }

  &.status-failed .status-icon {
    @apply bg-gradient-to-br from-red-50 to-red-200 text-error;
  }

  &.status-cancelled .status-icon {
    @apply bg-gradient-to-br from-orange-50 to-orange-200 text-warning;
  }

  /* Text Content */
  .status-text {
    @apply flex-1 min-w-0;

    .status-message {
      @apply text-[0.95rem] font-semibold text-text-main mb-1 leading-[1.3];
    }

    .status-details {
      @apply flex flex-wrap gap-3 text-[0.8rem] text-text-muted mt-1.5;

      .job-id {
        @apply font-mono px-1.5 py-0.5 bg-black/5 rounded;
      }

      .time-elapsed {
        @apply flex items-center font-medium;
      }

      .time-since-update {
        @apply text-warning font-medium;
      }
    }

    /* Job Parameters */
    .job-parameters {
      @apply mt-2 flex flex-wrap gap-3 text-[0.75rem];

      .param-item {
        @apply flex gap-1 items-center bg-black/5 px-2 py-0.5 rounded border border-black/10;

        .param-label {
          @apply text-text-muted font-medium;
        }

        .param-value {
          @apply text-text-main font-semibold font-mono;
        }
      }
    }

    /* Repository Progress */
    .repo-progress {
      @apply mt-2 py-2 border-t border-black/10;

      .progress-info {
        @apply flex justify-between items-center mb-1.5 text-[0.8rem];

        .current-repo {
          @apply text-text-main font-semibold font-mono flex-1 truncate;
        }

        .progress-fraction {
          @apply text-text-muted font-semibold ml-2;
        }
      }

      .mini-progress-bar {
        @apply h-[3px] bg-black/10 rounded-[2px] overflow-hidden;

        .mini-progress-fill {
          @apply h-full bg-gradient-to-r from-success to-green-600 rounded-[2px] transition-[width] duration-500 ease-in-out;
        }
      }
    }
  }

  /* Progress Bar */
  .progress-container {
    @apply w-full mt-2;

    .progress-bar {
      @apply w-full h-1 bg-black/10 rounded-[2px] overflow-hidden;

      .progress-fill {
        @apply h-full bg-gradient-to-r from-brand-primary to-blue-700 rounded-[2px] transition-[width] duration-300 ease-in-out animate-[shimmer_2s_infinite];
      }
    }
  }

  /* Action Buttons */
  .status-actions {
    @apply flex items-center gap-2 shrink-0;

    .action-btn {
      @apply flex items-center justify-center px-2.5 py-1.5 border border-gray-200 bg-white text-text-muted rounded-md text-[0.8rem] font-medium cursor-pointer transition-all duration-200 min-w-[32px] h-8 hover:bg-gray-50 hover:border-gray-300;

      &.retry-btn {
        @apply text-brand-primary border-brand-primary hover:bg-blue-50;
      }

      &.cancel-btn {
        @apply text-warning border-warning hover:bg-orange-50;
      }

      &.close-btn {
        @apply text-lg font-bold text-gray-400 hover:text-text-muted hover:bg-gray-100;
      }
    }
  }

  /* Pulse Animation */
  .pulse-ring {
    @apply absolute top-1/2 left-8 -translate-x-1/2 -translate-y-1/2 w-10 h-10 border-2 border-brand-primary/30 rounded-full animate-[pulse-ring_2s_infinite] z-[1];
  }
}

@keyframes shimmer {
  0% { transform: translateX(-100%); opacity: 0.6; }
  50% { transform: translateX(0%); opacity: 1; }
  100% { transform: translateX(100%); opacity: 0.6; }
}

@keyframes pulse-ring {
  0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
}

/* Transitions */
.refresh-status-enter-active,
.refresh-status-leave-active {
  @apply transition-all duration-400 ease-in-out;
}

.refresh-status-enter-from,
.refresh-status-leave-to {
  @apply -translate-y-5 opacity-0;
}

/* Responsive Design */
@media (max-width: 768px) {
  .refresh-status {
    @apply px-4 py-3 my-1.5;

    .status-content {
      @apply gap-2.5;

      .status-icon {
        @apply w-9 h-9;
      }
    }

    .status-text {
      .status-message {
        @apply text-[0.9rem];
      }

      .status-details {
        @apply gap-2 text-[0.75rem];
      }

      .job-parameters {
        @apply flex-col gap-1.5 text-[0.7rem];

        .param-item {
          @apply px-1.5 py-0.5;
        }
      }

      .repo-progress {
        @apply mt-1.5 py-1.5;

        .progress-info {
          @apply text-[0.75rem];

          .current-repo {
            @apply max-w-[150px];
          }
        }
      }
    }

    .status-actions .action-btn {
      @apply px-2 py-1 min-w-[28px] h-7 text-[0.75rem];
    }

    .pulse-ring {
      @apply left-7 w-9 h-9;
    }
  }
}
</style>