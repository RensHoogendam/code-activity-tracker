import { ref, watch, computed, type Ref } from 'vue'
import type { RefreshJobStatus } from '../types/bitbucket'

// Storage key for persisting refresh status
const REFRESH_STATUS_KEY = 'bitbucket_refresh_status'
const REFRESH_STATUS_TIMESTAMP_KEY = 'bitbucket_refresh_status_timestamp'

// Maximum age for persisted refresh status (30 minutes)
const MAX_REFRESH_STATUS_AGE = 30 * 60 * 1000

class RefreshStatusStore {
  private refreshJob: Ref<RefreshJobStatus | null> = ref(null)
  private showRefreshStatus: Ref<boolean> = ref(false)
  private lastPollTime: Ref<Date | null> = ref(null)

  constructor() {
    // Load persisted state on initialization
    this.loadPersistedState()
    
    // Watch for changes and persist them
    watch(
      () => this.refreshJob.value,
      (newStatus) => {
        if (newStatus) {
          this.persistState()
        } else {
          this.clearPersistedState()
        }
      },
      { deep: true }
    )

    watch(
      () => this.showRefreshStatus.value,
      (showStatus) => {
        if (!showStatus) {
          // When hiding status, also clear the job if it's completed or failed
          if (this.refreshJob.value && 
              (this.refreshJob.value.is_completed || this.refreshJob.value.is_failed)) {
            this.refreshJob.value = null
          }
        }
      }
    )
  }

  // Getters
  get currentJob(): RefreshJobStatus | null {
    return this.refreshJob.value
  }

  get isVisible(): boolean {
    return this.showRefreshStatus.value
  }

  get isJobActive(): boolean {
    return this.refreshJob.value?.is_running || false
  }

  get isJobCancellable(): boolean {
    const job = this.refreshJob.value
    if (!job) return false
    return job.is_running && !job.is_completed && !job.is_failed && !(job.is_cancelled || false)
  }

  get lastPolled(): Date | null {
    return this.lastPollTime.value
  }

  // Actions
  setRefreshJob(job: RefreshJobStatus | null): void {
    this.refreshJob.value = job
    if (job) {
      this.showRefreshStatus.value = true
      this.lastPollTime.value = new Date()
    }
  }

  updateRefreshJob(updates: Partial<RefreshJobStatus>): void {
    if (this.refreshJob.value) {
      this.refreshJob.value = { ...this.refreshJob.value, ...updates }
      this.lastPollTime.value = new Date()
    }
  }

  clearRefreshJob(): void {
    this.refreshJob.value = null
    this.showRefreshStatus.value = false
    this.lastPollTime.value = null
  }

  hideStatus(): void {
    this.showRefreshStatus.value = false
  }

  showStatus(): void {
    if (this.refreshJob.value) {
      this.showRefreshStatus.value = true
    }
  }

  cancelJob(): void {
    if (this.refreshJob.value) {
      // Mark as cancelled locally (will be confirmed by backend)
      this.refreshJob.value = {
        ...this.refreshJob.value,
        status: 'cancelled',
        is_running: false,
        is_cancelled: true,
        message: 'Cancelling job...',
        cancelled_at: new Date().toISOString()
      }
    }
  }

  // Check if we should still be polling this job
  shouldPoll(): boolean {
    if (!this.refreshJob.value) return false
    
    // Don't poll if job is completed, failed, or cancelled
    if (this.refreshJob.value.is_completed || this.refreshJob.value.is_failed || (this.refreshJob.value.is_cancelled || false)) {
      return false
    }

    // Don't poll if it's been too long since we started
    const now = new Date()
    const maxElapsed = 15 * 60 * 1000 // 15 minutes
    
    if (this.refreshJob.value.updated_at) {
      const lastUpdate = new Date(this.refreshJob.value.updated_at)
      const elapsed = now.getTime() - lastUpdate.getTime()
      if (elapsed > maxElapsed) {
        console.warn('Refresh job polling timeout - job may have stalled')
        return false
      }
    }

    return this.refreshJob.value.is_running
  }

  // Persistence methods
  private persistState(): void {
    if (this.refreshJob.value) {
      try {
        const state = {
          job: this.refreshJob.value,
          showStatus: this.showRefreshStatus.value,
          timestamp: Date.now(),
          lastPoll: this.lastPollTime.value?.getTime() || null
        }
        
        localStorage.setItem(REFRESH_STATUS_KEY, JSON.stringify(state))
        localStorage.setItem(REFRESH_STATUS_TIMESTAMP_KEY, Date.now().toString())
        
        console.log('📦 Persisted refresh status:', this.refreshJob.value.job_id)
      } catch (error) {
        console.warn('Failed to persist refresh status:', error)
      }
    }
  }

  private loadPersistedState(): void {
    try {
      const persistedData = localStorage.getItem(REFRESH_STATUS_KEY)
      const timestamp = localStorage.getItem(REFRESH_STATUS_TIMESTAMP_KEY)
      
      if (persistedData && timestamp) {
        const age = Date.now() - parseInt(timestamp)
        
        // Only load if not too old
        if (age < MAX_REFRESH_STATUS_AGE) {
          const state = JSON.parse(persistedData)
          
          this.refreshJob.value = state.job
          this.showRefreshStatus.value = state.showStatus
          
          if (state.lastPoll) {
            this.lastPollTime.value = new Date(state.lastPoll)
          }
          
          console.log('📂 Restored refresh status from storage:', state.job.job_id)
          
          // If job is still running, we might want to resume polling
          if (state.job.is_running && !state.job.is_completed && !state.job.is_failed) {
            console.log('🔄 Job still running, will resume polling')
          }
        } else {
          console.log('🕐 Persisted refresh status too old, clearing')
          this.clearPersistedState()
        }
      }
    } catch (error) {
      console.warn('Failed to load persisted refresh status:', error)
      this.clearPersistedState()
    }
  }

  private clearPersistedState(): void {
    try {
      localStorage.removeItem(REFRESH_STATUS_KEY)
      localStorage.removeItem(REFRESH_STATUS_TIMESTAMP_KEY)
    } catch (error) {
      console.warn('Failed to clear persisted state:', error)
    }
  }

  // Format helpers for display
  formatElapsedTime(): string {
    if (!this.refreshJob.value) return ''
    return this.refreshJob.value.elapsed_time_human || `${this.refreshJob.value.elapsed_time}s`
  }

  formatTimeSinceUpdate(): string {
    if (!this.refreshJob.value) return ''
    return this.refreshJob.value.time_since_update.human_readable || 'Just now'
  }

  formatJobParameters(): string {
    if (!this.refreshJob.value?.parameters) return ''
    
    const params = this.refreshJob.value.parameters
    return `${params.max_days}d • ${params.selected_repos_count} repos • ${params.author_filter}`
  }
}

// Create singleton instance
export const refreshStatusStore = new RefreshStatusStore()

// Composable for components to use
export function useRefreshStatus() {
  return {
    // State (computed to get current values)
    refreshJob: computed(() => refreshStatusStore.currentJob),
    isVisible: computed(() => refreshStatusStore.isVisible),
    isJobActive: computed(() => refreshStatusStore.isJobActive),
    isJobCancellable: computed(() => refreshStatusStore.isJobCancellable),
    lastPolled: computed(() => refreshStatusStore.lastPolled),
    
    // Actions
    setRefreshJob: (job: RefreshJobStatus | null) => refreshStatusStore.setRefreshJob(job),
    updateRefreshJob: (updates: Partial<RefreshJobStatus>) => refreshStatusStore.updateRefreshJob(updates),
    clearRefreshJob: () => refreshStatusStore.clearRefreshJob(),
    hideStatus: () => refreshStatusStore.hideStatus(),
    showStatus: () => refreshStatusStore.showStatus(),
    cancelJob: () => refreshStatusStore.cancelJob(),
    shouldPoll: () => refreshStatusStore.shouldPoll(),
    
    // Getters
    formatElapsedTime: () => refreshStatusStore.formatElapsedTime(),
    formatTimeSinceUpdate: () => refreshStatusStore.formatTimeSinceUpdate(),
    formatJobParameters: () => refreshStatusStore.formatJobParameters(),
    
    // Direct access to store
    store: refreshStatusStore
  }
}

export default refreshStatusStore