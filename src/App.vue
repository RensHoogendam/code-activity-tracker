<script setup lang="ts">
import { ref, onMounted, provide, onBeforeUnmount, type Ref } from 'vue'
import AppNavigation from './components/AppNavigation.vue'
import bitbucketService from './services/bitbucketService'
import { useRefreshStatus } from './stores/refreshStore'

import type { 
  AppFilters, 
  ProcessedCommit, 
  UserRepository,
  TestResult
} from './types/bitbucket'

import {
  HOURS_DATA_KEY,
  FILTERED_DATA_KEY,
  FILTERS_KEY,
  IS_LOADING_KEY,
  IS_AUTHENTICATED_KEY
} from './types/vue'

// Initialize refresh status store
const {
  refreshJob,
  isVisible: showRefreshStatus,
  setRefreshJob,
  clearRefreshJob,
  hideStatus,
  shouldPoll,
  cancelJob
} = useRefreshStatus()

// Reactive state with proper typing
const isAuthenticated: Ref<boolean> = ref(false)
const isLoading: Ref<boolean> = ref(false)
const hoursData: Ref<ProcessedCommit[]> = ref([])
const filteredData: Ref<ProcessedCommit[]> = ref([])
const error: Ref<string | null> = ref(null)
const lastUpdated: Ref<Date | null> = ref(null)
const selectedRepos: Ref<string[]> = ref([])

// Polling management
let pollInterval: NodeJS.Timeout | null = null

const filters: Ref<AppFilters> = ref({
  repo: '',
  dateRange: 12,
  author: 'Rens Hoogendam',
  type: 'all' // all, commits, pullrequests
})

// Provide data to child components with typed keys
provide(HOURS_DATA_KEY, hoursData)
provide(FILTERED_DATA_KEY, filteredData)
provide(FILTERS_KEY, filters)
provide(IS_LOADING_KEY, isLoading)
provide(IS_AUTHENTICATED_KEY, isAuthenticated)

onMounted(async (): Promise<void> => {
  // Check if credentials are available
  isAuthenticated.value = bitbucketService.hasCredentials()
  
  // Check if there's a persisted refresh job that needs polling
  if (refreshJob.value && shouldPoll()) {
    console.log('🔄 Resuming polling for persisted job:', refreshJob.value.job_id)
    pollRefreshJob(refreshJob.value.job_id)
  }
  
  // If we have credentials, test them and fetch initial data
  if (isAuthenticated.value) {
    const testResult: TestResult = await bitbucketService.testAuthentication()
    console.log("🚀 ~ testResult:", testResult.success)
    if (testResult.success) {
      console.log('✅ Authentication successful')
      // Load user's saved repository selections first
      await loadUserRepositories()
      // Then fetch hours data with those repositories
      await fetchHoursData()
    } else {
      console.error('❌ Authentication failed:', testResult.message)
      isAuthenticated.value = false
    }
  }
})

// Cleanup polling on unmount
onBeforeUnmount(() => {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
})

async function loadUserRepositories(): Promise<void> {
  try {
    const userRepos: UserRepository[] = await bitbucketService.fetchUserRepositories()
    // Get enabled repositories in workspace/repo format
    selectedRepos.value = userRepos
      .filter((repo: UserRepository) => repo.is_enabled !== false)  
      .map((repo: UserRepository) => `${repo.workspace}/${repo.name}`)
    
    console.log(`✅ Loaded ${selectedRepos.value.length} enabled repositories:`, selectedRepos.value)
  } catch (err) {
    console.error('Failed to load user repositories:', err)
    selectedRepos.value = [] // Fallback to empty array
  }
}

async function fetchHoursData(forceRefresh: boolean = false): Promise<void> {
  if (!isAuthenticated.value) {
    console.warn('Not authenticated - cannot fetch data')
    return
  }
  
  isLoading.value = true
  error.value = null
  
  try {
    if (forceRefresh) {
      // Use new background refresh system for force refresh
      const result = await bitbucketService.startBackgroundRefresh(
        filters.value.dateRange, 
        selectedRepos.value, 
        false // Don't wait for completion - return immediately
      )
      
      hoursData.value = result.data
      
      // Update refresh status store
      if (result.refreshJob) {
        setRefreshJob(result.refreshJob)
        console.log('🚀 Background refresh started:', result.refreshJob.job_id)
        
        // Start polling for job completion
        pollRefreshJob(result.refreshJob.job_id)
      }
    } else {
      // Regular fetch (uses cache if available)
      const data: ProcessedCommit[] = await bitbucketService.fetchAllData(
        filters.value.dateRange, 
        selectedRepos.value, 
        forceRefresh
      )
      hoursData.value = data
    }
    
    applyFilters()
    lastUpdated.value = new Date()
  } catch (err: unknown) {
    error.value = 'Failed to fetch data from Bitbucket API'
    console.error('Fetch error:', err)
    
    // If it's an auth error, clear authentication
    if (err instanceof Error && err.message && (
      err.message.includes('credentials') || 
      err.message.includes('401')
    )) {
      isAuthenticated.value = false
    }
  } finally {
    isLoading.value = false
  }
}

function handleForceRefresh(): void {
  console.log('Force refreshing data (bypassing cache)...')
  fetchHoursData(true)
}

// Background Job Management Functions
async function pollRefreshJob(jobId: string): Promise<void> {
  // Clear any existing polling
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }

  console.log('⏱️ Starting refresh job polling:', jobId)
  
  const poll = async () => {
    try {
      const status = await bitbucketService.checkRefreshJobStatus(jobId)
      
      if (status) {
        setRefreshJob(status)
        
        // If job is complete, failed, or cancelled, stop polling
        if (status.is_completed || status.is_failed || status.is_cancelled) {
          if (pollInterval) {
            clearInterval(pollInterval)
            pollInterval = null
          }
          
          if (status.is_completed) {
            console.log('✅ Background refresh completed!')
            // Fetch the fresh data
            await fetchHoursData(false)
            
            // Auto-hide status after a delay
            setTimeout(() => {
              hideStatus()
            }, 5000)
            
          } else if (status.is_failed) {
            console.error('❌ Background refresh failed:', status.error)
          } else if (status.is_cancelled) {
            console.log('✋ Background refresh cancelled')
          }
        }
      } else {
        // Lost track of job, stop polling
        if (pollInterval) {
          clearInterval(pollInterval)
          pollInterval = null
        }
        console.warn('⚠️ Lost track of refresh job')
      }
    } catch (error) {
      console.error('Error polling refresh job:', error)
      // Continue polling despite error, but limit retries
    }
  }
  
  // Poll immediately, then every 3 seconds
  await poll()
  pollInterval = setInterval(poll, 3000)
  
  // Safety timeout - stop polling after 15 minutes
  setTimeout(() => {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
      console.warn('⏰ Refresh job polling timeout')
    }
  }, 15 * 60 * 1000)
}

async function handleCheckRefreshStatus(jobId: string): Promise<void> {
  try {
    const status = await bitbucketService.checkRefreshJobStatus(jobId)
    if (status) {
      setRefreshJob(status)
      console.log('📊 Job status updated:', status.status)
    }
  } catch (error) {
    console.error('Error checking refresh status:', error)
  }
}

function handleRetryRefresh(): void {
  console.log('🔄 Retrying background refresh...')
  clearRefreshJob()
  fetchHoursData(true)
}

function handleHideRefreshStatus(): void {
  hideStatus()
}

async function handleCancelRefresh(jobId: string): Promise<void> {
  console.log('🛑 Cancelling background refresh...', jobId)
  
  // Mark as cancelled in local store immediately for UI feedback
  cancelJob()
  
  try {
    const success = await bitbucketService.cancelRefreshJob(jobId)
    
    if (success) {
      // Stop polling
      if (pollInterval) {
        clearInterval(pollInterval)
        pollInterval = null
      }
      
      console.log('✅ Job cancelled successfully')
      
      // Auto-hide after a short delay
      setTimeout(() => {
        hideStatus()
      }, 3000)
      
    } else {
      console.error('❌ Failed to cancel job')
      // Refresh status to get accurate state from server
      await handleCheckRefreshStatus(jobId)
    }
  } catch (error) {
    console.error('Error cancelling refresh job:', error)
  }
}

function handleClearCache(): void {
  bitbucketService.clearCache()
  console.log('Cache cleared')
}

function handleReposChanged(repos: string[]): void {
  selectedRepos.value = repos
  // Reset the bitbucket service repos to force re-initialization
  bitbucketService.clearCache()
  
  // Don't auto-fetch - let user click refresh when ready
  console.log(`Selected ${repos.length} repositories`)
}

function applyFilters(newFilters: Partial<AppFilters> = {}): void {
  const oldDateRange = filters.value.dateRange
  filters.value = { ...filters.value, ...newFilters }
  
  // If date range changed, we need to fetch new data
  if (newFilters.dateRange && newFilters.dateRange !== oldDateRange) {
    console.log('Date range changed from', oldDateRange, 'to', newFilters.dateRange)
    fetchHoursData() // Fetch new data for the new date range
    return // fetchHoursData will call applyFilters again after fetching
  }
  
  let filtered: ProcessedCommit[] = hoursData.value
  
  if (filters.value.repo) {
    filtered = filtered.filter((item: ProcessedCommit) => item.repo === filters.value.repo)
  }
  
  if (filters.value.type !== 'all') {
    if (filters.value.type === 'commits') {
      filtered = filtered.filter((item: ProcessedCommit) => item.commit_hash)
    } else if (filters.value.type === 'pullrequests') {
      filtered = filtered.filter((item: ProcessedCommit) => !item.commit_hash)
    }
  }
  
  filteredData.value = filtered
}

function handleExport(): void {
  // TODO: Implement data export functionality
  console.log('Export functionality to be implemented')
}
</script>

<template>
  <div class="app">
    <AppNavigation 
      :last-updated="lastUpdated"
      :filters="filters"
      @refresh="fetchHoursData"
      @force-refresh="handleForceRefresh"
      @clear-cache="handleClearCache"
      @filter-change="applyFilters"
      :is-loading="isLoading"
      :refresh-job="refreshJob"
      :show-refresh-status="showRefreshStatus"
      @hide-refresh-status="handleHideRefreshStatus"
      @retry-refresh="handleRetryRefresh"
      @cancel-refresh="handleCancelRefresh"
      @check-refresh-status="handleCheckRefreshStatus"
    />
    
    <main class="main-content">
      <router-view 
        :data="hoursData"
        :filtered-data="filteredData"
        :filters="filters"
        :is-loading="isLoading"
        :last-updated="lastUpdated"
        :error="error"
        @filter-change="applyFilters"
        @export="handleExport"
        @repos-changed="handleReposChanged"
        @refresh="fetchHoursData"
        @force-refresh="handleForceRefresh"
        @clear-cache="handleClearCache"
        :refresh-job="refreshJob"
        :show-refresh-status="showRefreshStatus"
        @hide-refresh-status="handleHideRefreshStatus"
        @retry-refresh="handleRetryRefresh"
        @cancel-refresh="handleCancelRefresh"
        @check-refresh-status="handleCheckRefreshStatus"
      />
    </main>
  </div>
</template>

<style>
@reference "./style.css";

.main-content {
  @apply flex-1 w-full mx-auto px-0;
  max-width: var(--max-content-width);
}

/* Global utility classes that aren't pure Tailwind */
.btn {
  @apply px-4 py-2 bg-white border border-gray-300 rounded-app-btn text-gray-700 text-sm 
         cursor-pointer transition-all hover:bg-gray-100 hover:border-gray-400;
  font-family: inherit;
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  @apply bg-gray-100 rounded;
}

::-webkit-scrollbar-thumb {
  @apply bg-gray-300 rounded hover:bg-gray-400;
}
</style>
