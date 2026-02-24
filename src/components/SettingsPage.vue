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

<style scoped lang="scss">
.settings-page {
  @apply bg-app-bg min-h-[calc(100vh-var(--spacing-header-height))];

  .settings-header {
    @apply bg-surface border-b border-gray-200 py-5;

    .header-content {
      @apply max-w-content-width mx-auto px-6;

      .breadcrumb {
        @apply text-sm text-text-muted;

        &-link {
          @apply text-brand-secondary no-underline transition-colors duration-200 hover:text-brand-secondary-hover;
        }

        &-separator {
          @apply mx-2;
        }

        &-current {
          @apply text-text-main font-semibold;
        }
      }
    }
  }

  .settings-content {
    @apply max-w-content-width mx-auto p-8 px-6;

    .settings-section {
      @apply bg-surface border border-gray-200 rounded-app-card overflow-hidden;

      .section-header {
        @apply p-6 border-b border-gray-200 bg-gray-50;

        h2 {
          @apply text-2xl text-text-main mb-2;
        }

        .section-description {
          @apply text-text-muted text-base m-0;
        }
      }
    }

    .success-message {
      @apply bg-green-50 text-success px-6 py-3 border-b border-green-100 font-medium;
    }

    .error-message {
      @apply bg-red-50 text-error px-6 py-3 border-b border-red-100 font-medium;
    }

    .repo-controls {
      @apply p-6 border-b border-gray-200;

      .control-row {
        @apply flex gap-6 items-start mb-5;

        .search-control {
          @apply flex-1 max-w-[300px];

          .search-input {
            @apply w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm transition-colors duration-200 focus:outline-none focus:border-brand-secondary;
          }
        }

        .quick-actions {
          @apply flex items-center gap-3 flex-wrap;

          .action-btn {
            @apply bg-gray-50 border border-gray-300 text-text-main px-4 py-2 rounded-md text-sm cursor-pointer transition-all duration-200 hover:bg-brand-secondary hover:border-brand-secondary hover:text-white;
          }

          .language-filters {
            @apply flex items-center gap-2;

            .filter-label {
              @apply text-[13px] text-text-muted whitespace-nowrap;
            }

            .lang-btn {
              @apply bg-gray-100 border border-gray-300 text-text-main px-2 py-1 rounded text-[12px] cursor-pointer transition-all duration-200 hover:bg-brand-secondary hover:border-brand-secondary hover:text-white;
            }
          }
        }
      }

      .selection-summary {
        @apply flex justify-between items-center p-4 bg-gray-50 rounded-lg;

        .summary-text {
          @apply text-sm text-text-main font-medium;
        }

        .save-btn {
          @apply bg-brand-secondary border-none text-white px-5 py-2.5 rounded font-semibold text-sm cursor-pointer transition-all duration-200 min-w-[140px] hover:bg-brand-secondary-hover hover:-translate-y-[1px] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none;

          &-content {
            @apply flex items-center justify-center gap-2;

            .spinner.small {
              @apply w-4 h-4 border-2 border-transparent border-t-white rounded-full animate-spin;
            }
          }
        }
      }
    }

    .repo-grid {
      @apply p-6;

      .loading-state, .error-state {
        @apply flex items-center justify-center p-[60px] text-center text-text-muted;

        .spinner {
          @apply w-6 h-6 border-[3px] border-gray-100 border-t-brand-secondary rounded-full animate-spin mr-3;
        }
      }

      .repo-list {
        @apply grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-4;

        .repo-card {
          @apply border border-gray-200 rounded-lg transition-all duration-200 bg-surface relative hover:border-brand-secondary hover:shadow-md;

          &.selected {
            @apply border-brand-secondary bg-orange-50/50 shadow-sm;

            .repo-language {
              @apply bg-brand-secondary text-white;
            }
          }

          &.disabled {
            @apply opacity-70 bg-gray-50;

            &.selected {
              @apply bg-orange-50 border-warning;
            }
          }

          .repo-label {
            @apply flex items-start gap-3 p-4 pr-[60px] cursor-pointer w-full;

            .repo-checkbox {
              @apply mt-0.5 scale-110 disabled:opacity-50;
            }

            .repo-info {
              @apply flex-1;

              .repo-header {
                @apply flex justify-between items-center mb-1.5 gap-2;

                .repo-name {
                  @apply font-semibold text-text-main text-[15px] flex-1 min-w-0;
                }

                .repo-badges {
                  @apply flex gap-1 items-center shrink-0;

                  .badge {
                    @apply text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wider;

                    &.primary { @apply bg-brand-primary text-white; }
                    &.enabled { @apply bg-success text-white; }
                    &.disabled { @apply bg-text-muted text-white; }
                  }

                  .repo-language {
                    @apply bg-gray-200 text-text-main px-2 py-0.5 rounded font-medium text-[11px] uppercase;
                  }
                }
              }

              .repo-meta {
                @apply text-[12px] text-text-muted;
              }
            }
          }

          .repo-actions {
            @apply absolute right-4 top-1/2 -translate-y-1/2 flex items-center;

            .toggle-btn {
              @apply w-8 h-8 border-2 border-gray-200 bg-gray-50 rounded-full cursor-pointer flex items-center justify-center text-sm transition-all duration-200 hover:border-gray-400;

              &.enabled {
                @apply bg-success border-success text-white hover:bg-green-700 hover:border-green-700;
              }

              &.disabled {
                @apply bg-text-muted border-text-muted text-white hover:bg-gray-700 hover:border-gray-700;
              }

              &:disabled {
                @apply opacity-60 cursor-not-allowed;
              }

              .toggle-spinner {
                @apply w-3.5 h-3.5 border-2 border-transparent border-t-white rounded-full animate-spin;
              }
            }
          }
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .settings-page .settings-content {
    @apply p-5 px-4;

    .control-row {
      @apply flex-col gap-4;

      .search-control {
        @apply max-w-none;
      }
    }

    .selection-summary {
      @apply flex-col gap-3 text-center;
    }

    .repo-list {
      @apply grid-cols-1;
    }
  }
}
</style>