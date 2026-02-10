<script setup lang="ts">
import { ref, onMounted, computed, type Ref } from 'vue'
import { Save } from 'lucide-vue-next'
import { bitbucketService } from '../services/bitbucketService'

import type { 
  BitbucketRepository, 
  UserRepository,
  RepositoryToggleResponse
} from '../types/bitbucket'

// Emits with proper typing
const emit = defineEmits<{
  'repos-changed': [repos: string[]]
  'repository-status-changed': [data: { repository: UserRepository; enabled: boolean }]
}>()

// Reactive state with proper typing
const loading: Ref<boolean> = ref(false)
const error: Ref<string | null> = ref(null)
const availableRepos: Ref<BitbucketRepository[]> = ref([])
const selectedRepos: Ref<string[]> = ref([])
const searchQuery: Ref<string> = ref('')
const togglingRepos: Ref<Set<string>> = ref(new Set())

// Computed filtered repositories based on search
const filteredRepos = computed((): BitbucketRepository[] => {
  if (!searchQuery.value) return availableRepos.value
  
  const query = searchQuery.value.toLowerCase()
  return availableRepos.value.filter((repo: BitbucketRepository) => 
    repo.name.toLowerCase().includes(query) ||
    (repo.language && repo.language.toLowerCase().includes(query))
  )
})

// Load repositories on mount
onMounted(async (): Promise<void> => {
  await loadRepositories()
})

async function loadRepositories(): Promise<void> {
  loading.value = true
  error.value = null
  
  try {
    // Load user repositories with enable/disable status
    const [allRepos, userRepos] = await Promise.all([
      bitbucketService.fetchAllRepositories(),
      bitbucketService.fetchUserRepositories()
    ])
    
    availableRepos.value = allRepos
    
    // Select only enabled repositories by default (store in workspace/repo format)
    selectedRepos.value = userRepos
      .filter((repo: UserRepository) => repo.is_enabled !== false)
      .map((repo: UserRepository) => `${repo.workspace}/${repo.name}`)
    
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
    error.value = errorMessage
    console.error('Failed to load repositories:', err)
  } finally {
    loading.value = false
  }
}

async function toggleRepositoryStatus(repo: BitbucketRepository): Promise<void> {
  if (!repo.name || togglingRepos.value.has(repo.name)) {
    return
  }
  
  togglingRepos.value.add(repo.name)
  
  try {
    const response: RepositoryToggleResponse = await bitbucketService.toggleRepositoryStatus(repo.name)
    
    if (response.success) {
      // Update the repo in our local data
      const repoIndex = availableRepos.value.findIndex((r: BitbucketRepository) => r.name === repo.name)
      if (repoIndex !== -1) {
        availableRepos.value[repoIndex].is_enabled = response.is_enabled
        
        // Update selected repos based on new status
        const repoName = repo.name
        const workspace = repo.workspace || availableRepos.value.find((r: BitbucketRepository) => r.name === repoName)?.workspace || 'unknown'
        const fullRepoName = `${workspace}/${repoName}`
        const isSelected = selectedRepos.value.includes(fullRepoName)
        
        if (response.is_enabled && !isSelected) {
          // Enable and select the repo
          selectedRepos.value.push(fullRepoName)
          emit('repos-changed', selectedRepos.value)
        } else if (!response.is_enabled && isSelected) {
          // Disable and deselect the repo
          selectedRepos.value = selectedRepos.value.filter((name: string) => name !== fullRepoName)
          emit('repos-changed', selectedRepos.value)
        }
        
        // Emit status change event (casting for the event)
        if (response.repository) {
          emit('repository-status-changed', {
            repository: response.repository,
            enabled: response.is_enabled
          })
        }
        
        console.log(`Repository ${repo.name} ${response.is_enabled ? 'enabled' : 'disabled'}`)
      }
    } else {
      console.error('Failed to toggle repository status:', response.message)
    }
  } catch (err: unknown) {
    console.error('Error toggling repository status:', err)
  } finally {
    togglingRepos.value.delete(repo.name)
  }
}

function toggleRepo(repoName: string): void {
  // Check if repo is disabled
  const repo = availableRepos.value.find((r: BitbucketRepository) => r.name === repoName)
  if (repo && repo.is_enabled === false) {
    return // Don't allow toggling disabled repositories
  }
  
  // Find the workspace for this repo (fallback to availableRepos if needed)
  const workspace = repo?.workspace || 'unknown'
  const fullRepoName = `${workspace}/${repoName}`
  
  const index = selectedRepos.value.indexOf(fullRepoName)
  if (index > -1) {
    selectedRepos.value.splice(index, 1)
  } else {
    selectedRepos.value.push(fullRepoName)
  }
}

function selectAll() {
  // Only select enabled repositories (store in workspace/repo format)
  selectedRepos.value = filteredRepos.value
    .filter(repo => repo.is_enabled !== false)
    .map(repo => `${repo.workspace || 'unknown'}/${repo.name}`)
}

function selectNone() {
  selectedRepos.value = []
}

function selectByLanguage(language: string): void {
  const reposWithLanguage = filteredRepos.value
    .filter(repo => repo.language === language && repo.is_enabled !== false)
    .map(repo => `${repo.workspace || 'unknown'}/${repo.name}`)
  
  // Add to selected if not already selected
  reposWithLanguage.forEach(fullRepoName => {
    if (!selectedRepos.value.includes(fullRepoName)) {
      selectedRepos.value.push(fullRepoName)
    }
  })
}

async function saveSettings() {
  loading.value = true
  error.value = null
  
  try {
    // selectedRepos already contains workspace/repo format
    const response = await bitbucketService.saveUserRepositorySelections(selectedRepos.value)
    
    if (response.success) {
      // Emit the full workspace/repo format for API calls
      emit('repos-changed', selectedRepos.value)
      
      // Show success message briefly
      const successMessage = document.querySelector('.success-message') as HTMLElement
      if (successMessage) {
        successMessage.style.display = 'block'
        setTimeout(() => {
          successMessage.style.display = 'none'
        }, 3000)
      }
    } else {
      error.value = response.message || 'Failed to save repository selections'
      console.error('Failed to save repository selections:', response.message)
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An error occurred while saving settings'
    error.value = errorMessage
    console.error('Error saving repository selections:', err)
  } finally {
    loading.value = false
  }
}

// Get unique languages for quick selection
const availableLanguages = computed(() => {
  const languages = new Set()
  availableRepos.value.forEach(repo => {
    if (repo.language) languages.add(repo.language)
  })
  return Array.from(languages).sort()
})

function formatDate(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  })
}
</script>

<template>
  <div class="settings-page">
    <!-- Header -->
    <div class="settings-header">
      <div class="header-content">
        <div class="breadcrumb">
          <router-link to="/" class="breadcrumb-link">Dashboard</router-link>
          <span class="breadcrumb-separator">→</span>
          <span class="breadcrumb-current">Settings</span>
        </div>
      </div>
    </div>

    <div class="settings-content">
      <div class="settings-section">
        <div class="section-header">
          <h2>Repository Selection</h2>
          <p class="section-description">
            Choose which repositories to include in your hours tracking dashboard.
          </p>
        </div>

        <!-- Success Message -->
        <div class="success-message" style="display: none;">
          ✅ Settings saved successfully!
        </div>

        <!-- Error Message -->
        <div v-if="error" class="error-message">
          ❌ {{ error }}
        </div>

        <!-- Repository Controls -->
        <div class="repo-controls">
          <div class="control-row">
            <!-- Search -->
            <div class="search-control">
              <input 
                v-model="searchQuery" 
                type="text" 
                placeholder="Search repositories..."
                class="search-input"
              >
            </div>

            <!-- Quick Actions -->
            <div class="quick-actions">
              <button @click="selectAll" class="action-btn">Select All</button>
              <button @click="selectNone" class="action-btn">Select None</button>
              
              <!-- Language filters -->
              <div class="language-filters">
                <span class="filter-label">Quick select:</span>
                <button 
                  v-for="lang in availableLanguages" 
                  :key="lang as string"
                  @click="selectByLanguage(lang as string)"
                  class="lang-btn"
                  :title="`Select all ${lang} repositories`"
                >
                  {{ lang }}
                </button>
              </div>
            </div>
          </div>

          <!-- Selection Summary -->
          <div class="selection-summary">
            <span class="summary-text">
              {{ selectedRepos.length }} of {{ availableRepos.length }} repositories selected
            </span>
            
            <button @click="saveSettings" class="save-btn" :disabled="loading">
              <div v-if="loading" class="save-btn-content">
                <div class="spinner small"></div>
                <span>Saving...</span>
              </div>
              <div v-else class="save-btn-content">
                <Save :size="16" />
                <span>Save Settings</span>
              </div>
            </button>
          </div>
        </div>

        <!-- Repository List -->
        <div class="repo-grid">
          <div v-if="loading" class="loading-state">
            <div class="spinner"></div>
            <span>Loading repositories...</span>
          </div>
          
          <div v-else-if="error" class="error-state">
            <p>Failed to load repositories: {{ error }}</p>
            <button @click="loadRepositories" class="retry-btn">Retry</button>
          </div>
          
          <div v-else class="repo-list">
            <div 
              v-for="repo in filteredRepos" 
              :key="repo.name"
              class="repo-card"
              :class="{ 
                selected: selectedRepos.some(fullName => fullName.endsWith('/' + repo.name)),
                disabled: repo.is_enabled === false
              }"
            >
              <label class="repo-label">
                <input 
                  type="checkbox" 
                  :value="repo.name"
                  :checked="selectedRepos.some(fullName => fullName.endsWith('/' + repo.name))"
                  :disabled="repo.is_enabled === false"
                  @change="toggleRepo(repo.name)"
                  class="repo-checkbox"
                />
                <div class="repo-info">
                  <div class="repo-header">
                    <span class="repo-name">{{ repo.name }}</span>
                    <div class="repo-badges">
                      <span v-if="repo.is_primary" class="badge primary">Primary</span>
                      <span v-if="repo.language" class="repo-language">{{ repo.language }}</span>
                      <span v-if="repo.is_enabled === false" class="badge disabled">Disabled</span>
                      <span v-else-if="repo.is_enabled === true" class="badge enabled">Enabled</span>
                    </div>
                  </div>
                  <div class="repo-meta">
                    <span v-if="repo.updated_on" class="updated-date">
                      Updated {{ formatDate(repo.updated_on) }}
                    </span>
                  </div>
                </div>
                <div v-if="repo.name" class="repo-actions" @click.prevent>
                  <button 
                    @click="toggleRepositoryStatus(repo)"
                    :class="['toggle-btn', repo.is_enabled ? 'enabled' : 'disabled']"
                    :disabled="togglingRepos.has(repo.name)"
                    :title="repo.is_enabled ? 'Disable repository' : 'Enable repository'"
                  >
                    <span v-if="togglingRepos.has(repo.name)" class="toggle-spinner"></span>
                    <span v-else class="toggle-icon">{{ repo.is_enabled ? '●' : '○' }}</span>
                  </button>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-page {
  background: #fafbfc;
  min-height: calc(100vh - 80px);
}

.settings-header {
  background: white;
  border-bottom: 1px solid #e1e5e9;
  padding: 20px 0;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

.breadcrumb {
  font-size: 14px;
  color: #6c757d;
}

.breadcrumb-link {
  color: #F97316;
  text-decoration: none;
  transition: color 0.2s;
}

.breadcrumb-link:hover {
  color: #ea580c;
}

.breadcrumb-separator {
  margin: 0 8px;
}

.breadcrumb-current {
  color: #2c3e50;
  font-weight: 600;
}

.settings-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
}

.settings-section {
  background: white;
  border: 1px solid #e1e5e9;
  border-radius: 12px;
  overflow: hidden;
}

.section-header {
  padding: 24px;
  border-bottom: 1px solid #e1e5e9;
  background: #f8f9fa;
}

.section-header h2 {
  font-size: 24px;
  color: #2c3e50;
  margin-bottom: 8px;
}

.section-description {
  color: #6c757d;
  font-size: 16px;
  margin: 0;
}

.success-message {
  background: #d4edda;
  color: #155724;
  padding: 12px 24px;
  border-bottom: 1px solid #c3e6cb;
  font-weight: 500;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 12px 24px;
  border-bottom: 1px solid #f5c6cb;
  font-weight: 500;
}

.repo-controls {
  padding: 24px;
  border-bottom: 1px solid #e1e5e9;
}

.control-row {
  display: flex;
  gap: 24px;
  align-items: flex-start;
  margin-bottom: 20px;
}

.search-control {
  flex: 1;
  max-width: 300px;
}

.search-input {
  width: 100%;
  padding: 10px 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #F97316;
}

.quick-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.action-btn {
  background: #f8f9fa;
  border: 1px solid #ddd;
  color: #495057;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #F97316;
  border-color: #F97316;
  color: white;
}

.language-filters {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-label {
  font-size: 13px;
  color: #6c757d;
  white-space: nowrap;
}

.lang-btn {
  background: #e9ecef;
  border: 1px solid #ced4da;
  color: #495057;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.lang-btn:hover {
  background: #F97316;
  border-color: #F97316;
  color: white;
}

.selection-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.summary-text {
  font-size: 14px;
  color: #495057;
  font-weight: 500;
}

.save-btn {
  background: #F97316;
  border: none;
  color: white;
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 140px;
}

.save-btn:hover:not(:disabled) {
  background: #ea580c;
  transform: translateY(-1px);
}

.save-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.save-btn-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.spinner.small {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.repo-grid {
  padding: 24px;
}

.loading-state, .error-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
  text-align: center;
  color: #6c757d;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #F97316;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 12px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.retry-btn {
  background: #F97316;
  border: none;
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  margin-top: 12px;
}

.repo-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 16px;
}

.repo-card {
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  transition: all 0.2s;
  background: white;
  position: relative;
}

.repo-card:hover {
  border-color: #F97316;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.repo-card.selected {
  border-color: #F97316;
  background: #fef3e2;
  box-shadow: 0 2px 8px rgba(249, 115, 22, 0.15);
}

.repo-card.disabled {
  opacity: 0.7;
  background: #f8f9fa;
}

.repo-card.disabled.selected {
  background: #fff3cd;
  border-color: #ffc107;
}

.repo-label {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  padding-right: 60px;
  cursor: pointer;
  width: 100%;
}

.repo-checkbox {
  margin-top: 2px;
  transform: scale(1.2);
}

.repo-checkbox:disabled {
  opacity: 0.5;
}

.repo-info {
  flex: 1;
}

.repo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  gap: 8px;
}

.repo-name {
  font-weight: 600;
  color: #2c3e50;
  font-size: 15px;
  flex: 1;
  min-width: 0;
}

.repo-badges {
  display: flex;
  gap: 4px;
  align-items: center;
  flex-shrink: 0;
}

.badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.badge.primary {
  background: #007bff;
  color: white;
}

.badge.enabled {
  background: #28a745;
  color: white;
}

.badge.disabled {
  background: #6c757d;
  color: white;
}

.repo-language {
  background: #e9ecef;
  color: #495057;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
}

.repo-card.selected .repo-language {
  background: #F97316;
  color: white;
}

.repo-meta {
  font-size: 12px;
  color: #6c757d;
}

.updated-date {
  display: flex;
  align-items: center;
}

.repo-actions {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
}

.toggle-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: #f8f9fa;
  border: 2px solid #dee2e6;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.2s;
}

.toggle-btn:hover {
  border-color: #adb5bd;
}

.toggle-btn.enabled {
  background: #28a745;
  border-color: #28a745;
  color: white;
}

.toggle-btn.enabled:hover {
  background: #218838;
  border-color: #218838;
}

.toggle-btn.disabled {
  background: #6c757d;
  border-color: #6c757d;
  color: white;
}

.toggle-btn.disabled:hover {
  background: #5a6268;
  border-color: #5a6268;
}

.toggle-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.toggle-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.toggle-icon {
  line-height: 1;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .settings-content {
    padding: 20px 16px;
  }
  
  .control-row {
    flex-direction: column;
    gap: 16px;
  }
  
  .search-control {
    max-width: none;
  }
  
  .quick-actions {
    justify-content: flex-start;
  }
  
  .language-filters {
    flex-wrap: wrap;
  }
  
  .selection-summary {
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }
  
  .repo-list {
    grid-template-columns: 1fr;
  }
}
</style>