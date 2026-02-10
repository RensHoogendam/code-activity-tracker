<script setup>
import { ref, onMounted, provide, computed } from 'vue'
import { useRoute } from 'vue-router'
import AppNavigation from './components/AppNavigation.vue'
import LoadingSpinner from './components/LoadingSpinner.vue'
import bitbucketService from './services/bitbucketService'

const route = useRoute()

const isAuthenticated = ref(false)
const isLoading = ref(false)
const hoursData = ref([])
const filteredData = ref([])
const error = ref(null)
const lastUpdated = ref(null)
const selectedRepos = ref([])

const filters = ref({
  repo: '',
  dateRange: 12,
  author: 'Rens Hoogendam',
  type: 'all' // all, commits, pullrequests
})

// Provide data to child components
provide('hoursData', hoursData)
provide('filteredData', filteredData)
provide('filters', filters)
provide('isLoading', isLoading)
provide('isAuthenticated', isAuthenticated)

onMounted(async () => {
  // Check if credentials are available
  isAuthenticated.value = bitbucketService.hasCredentials()
  
  // If we have credentials, test them and fetch initial data
  if (isAuthenticated.value) {
    const testResult = await bitbucketService.testAuthentication()
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

async function loadUserRepositories() {
  try {
    const userRepos = await bitbucketService.fetchUserRepositories()
    // Get enabled repositories in workspace/repo format
    selectedRepos.value = userRepos
      .filter(repo => repo.is_enabled !== false)  
      .map(repo => `${repo.workspace}/${repo.name}`)
    
    console.log(`✅ Loaded ${selectedRepos.value.length} enabled repositories:`, selectedRepos.value)
  } catch (err) {
    console.error('Failed to load user repositories:', err)
    selectedRepos.value = [] // Fallback to empty array
  }
}

async function fetchHoursData(forceRefresh = false) {
  if (!isAuthenticated.value) {
    console.warn('Not authenticated - cannot fetch data')
    return
  }
  
  isLoading.value = true
  error.value = null
  
  try {
    const data = await bitbucketService.fetchAllData(filters.value.dateRange, selectedRepos.value, forceRefresh)
    hoursData.value = data
    applyFilters()
    lastUpdated.value = new Date()
  } catch (err) {
    error.value = 'Failed to fetch data from Bitbucket API'
    console.error('Fetch error:', err)
    
    // If it's an auth error, clear authentication
    if (err.message && (err.message.includes('credentials') || err.message.includes('401'))) {
      isAuthenticated.value = false
    }
  } finally {
    isLoading.value = false
  }
}

function handleForceRefresh() {
  console.log('Force refreshing data (bypassing cache)...')
  fetchHoursData(true)
}

function handleClearCache() {
  bitbucketService.clearCache()
  console.log('Cache cleared')
}

function handleReposChanged(repos) {
  selectedRepos.value = repos
  // Reset the bitbucket service repos to force re-initialization
  bitbucketService.config.repos = []
  
  // Don't auto-fetch - let user click refresh when ready
  console.log(`Selected ${repos.length} repositories`)
}

function applyFilters(newFilters = {}) {
  const oldDateRange = filters.value.dateRange
  filters.value = { ...filters.value, ...newFilters }
  
  // If date range changed, we need to fetch new data
  if (newFilters.dateRange && newFilters.dateRange !== oldDateRange) {
    console.log('Date range changed from', oldDateRange, 'to', newFilters.dateRange)
    fetchHoursData() // Fetch new data for the new date range
    return // fetchHoursData will call applyFilters again after fetching
  }
  
  let filtered = hoursData.value
  
  if (filters.value.repo) {
    filtered = filtered.filter(item => item.repo === filters.value.repo)
  }
  
  if (filters.value.type !== 'all') {
    if (filters.value.type === 'commits') {
      filtered = filtered.filter(item => item.commit_hash)
    } else if (filters.value.type === 'pullrequests') {
      filtered = filtered.filter(item => !item.commit_hash)
    }
  }
  
  filteredData.value = filtered
}

function handleExport() {
  // TODO: Implement data export functionality
  console.log('Export functionality to be implemented')
}

onMounted(() => {
  // Don't auto-fetch - wait for user to select repos and click refresh
})
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
      />
    </main>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #fafbfc;
  color: #333;
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  padding: 0;
}

.error-message {
  background-color: #fee;
  border: 1px solid #fcc;
  color: #c66;
  padding: 12px;
  border-radius: 4px;
  margin: 20px;
}

.empty-state {
  background: #fafbfc;
  padding: 80px 40px;
  text-align: center;
  margin: 40px 20px;
}

.empty-content h3 {
  color: #2c3e50;
  margin-bottom: 12px;
  font-size: 20px;
}

.empty-content p {
  color: #6c757d;
  font-size: 14px;
  max-width: 500px;
  margin: 0 auto;
  line-height: 1.5;
}

/* Global utility classes */
.btn {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  color: #555;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.btn:hover {
  background: #f5f5f5;
  border-color: #bbb;
}

.btn-primary {
  background: #F97316;
  color: white;
  border-color: #F97316;
}

.btn-primary:hover {
  background: #ea580c;
  border-color: #ea580c;
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
