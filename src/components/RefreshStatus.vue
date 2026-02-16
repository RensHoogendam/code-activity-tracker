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

<style scoped>
.refresh-status {
  position: relative;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  padding: 16px 20px;
  margin: 8px 0;
  border-left: 4px solid #6b7280;
  overflow: hidden;
  transition: all 0.3s ease;
}

/* Status Color Variants */
.status-started,
.status-processing {
  border-left-color: #3b82f6;
  background: linear-gradient(90deg, rgba(59, 130, 246, 0.05) 0%, transparent 100%);
}

.status-completed {
  border-left-color: #10b981;
  background: linear-gradient(90deg, rgba(16, 185, 129, 0.05) 0%, transparent 100%);
}

.status-failed {
  border-left-color: #ef4444;
  background: linear-gradient(90deg, rgba(239, 68, 68, 0.05) 0%, transparent 100%);
}

.status-cancelled {
  border-left-color: #f59e0b;
  background: linear-gradient(90deg, rgba(245, 158, 11, 0.05) 0%, transparent 100%);
}

.status-idle {
  border-left-color: #6b7280;
  background: linear-gradient(90deg, rgba(107, 114, 128, 0.05) 0%, transparent 100%);
}

/* Content Layout */
.status-content {
  display: flex;
  align-items: center;
  gap: 14px;
  position: relative;
  z-index: 2;
}

.status-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.status-started .status-icon,
.status-processing .status-icon {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #3b82f6;
}

.status-completed .status-icon {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  color: #10b981;
}

.status-failed .status-icon {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  color: #ef4444;
}

.status-cancelled .status-icon {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #f59e0b;
}

.animate-spin {
  animation: spin 1.5s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Text Content */
.status-text {
  flex: 1;
  min-width: 0;
}

.status-message {
  font-size: 0.95rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
  line-height: 1.3;
}

.status-details {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 0.8rem;
  color: #6b7280;
}

.job-id {
  font-family: 'Monaco', 'Menlo', monospace;
  padding: 2px 6px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

.time-elapsed {
  display: flex;
  align-items: center;
  font-weight: 500;
}

.progress-text {
  font-weight: 600;
  color: #3b82f6;
}

/* Job Parameters */
.job-parameters {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 0.75rem;
}

.param-item {
  display: flex;
  gap: 4px;
  align-items: center;
  background: rgba(0, 0, 0, 0.03);
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.param-label {
  color: #6b7280;
  font-weight: 500;
}

.param-value {
  color: #374151;
  font-weight: 600;
  font-family: 'Monaco', 'Menlo', monospace;
}

/* Repository Progress */
.repo-progress {
  margin-top: 8px;
  padding: 8px 0;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  font-size: 0.8rem;
}

.current-repo {
  color: #374151;
  font-weight: 600;
  font-family: 'Monaco', 'Menlo', monospace;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.progress-fraction {
  color: #6b7280;
  font-weight: 600;
  margin-left: 8px;
}

.mini-progress-bar {
  height: 3px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.mini-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981 0%, #059669 100%);
  border-radius: 2px;
  transition: width 0.5s ease;
}

.time-since-update {
  color: #f59e0b;
  font-weight: 500;
}

.cancelled-status {
  color: #f59e0b;
  font-weight: 600;
}

/* Enhanced Status Details */
.status-details {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 0.8rem;
  color: #6b7280;
  margin-top: 6px;
}

/* Progress Bar */
.progress-container {
  width: 100%;
  margin-top: 8px;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%);
  border-radius: 2px;
  transition: width 0.3s ease;
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); opacity: 0.6; }
  50% { transform: translateX(0%); opacity: 1; }
  100% { transform: translateX(100%); opacity: 0.6; }
}

/* Action Buttons */
.status-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 10px;
  border: 1px solid #e5e7eb;
  background: white;
  color: #6b7280;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 32px;
  height: 32px;
}

.action-btn:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.retry-btn {
  color: #3b82f6;
  border-color: #3b82f6;
}

.retry-btn:hover {
  background: #eff6ff;
}

.cancel-btn {
  color: #f59e0b;
  border-color: #f59e0b;
}

.cancel-btn:hover {
  background: #fefbf3;
}

.close-btn {
  font-size: 1.2rem;
  font-weight: bold;
  color: #9ca3af;
}

.close-btn:hover {
  color: #6b7280;
  background: #f3f4f6;
}

/* Pulse Animation */
.pulse-ring {
  position: absolute;
  top: 50%;
  left: 32px;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 40px;
  border: 2px solid rgba(59, 130, 246, 0.3);
  border-radius: 50%;
  animation: pulse-ring 2s infinite;
  z-index: 1;
}

@keyframes pulse-ring {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(2);
    opacity: 0;
  }
}

/* Transitions */
.refresh-status-enter-active,
.refresh-status-leave-active {
  transition: all 0.4s ease;
}

.refresh-status-enter-from {
  transform: translateY(-20px);
  opacity: 0;
}

.refresh-status-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}

/* Responsive Design */
@media (max-width: 768px) {
  .refresh-status {
    padding: 12px 16px;
    margin: 6px 0;
  }
  
  .status-content {
    gap: 10px;
  }
  
  .status-icon {
    width: 36px;
    height: 36px;
  }
  
  .status-message {
    font-size: 0.9rem;
  }
  
  .status-details {
    gap: 8px;
    font-size: 0.75rem;
  }
  
  .job-parameters {
    flex-direction: column;
    gap: 6px;
    font-size: 0.7rem;
  }
  
  .param-item {
    padding: 2px 6px;
  }
  
  .repo-progress {
    margin-top: 6px;
    padding: 6px 0;
  }
  
  .progress-info {
    font-size: 0.75rem;
  }
  
  .current-repo {
    max-width: 150px;
  }
  
  .action-btn {
    padding: 4px 8px;
    min-width: 28px;
    height: 28px;
    font-size: 0.75rem;
  }
  
  .pulse-ring {
    left: 28px;
    width: 36px;
    height: 36px;
  }
}
</style>