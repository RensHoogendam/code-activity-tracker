<script setup lang="ts">
import { ref, onMounted, type Ref } from 'vue'
import { bitbucketService } from '../services/bitbucketService'

import type { UserRepository, RepositoryToggleResponse } from '../types/bitbucket'

// Props with proper typing
interface Props {
  compact: boolean
  showStatus: boolean
}

const props = withDefaults(defineProps<Props>(), {
  compact: false,
  showStatus: true
})

// Emits with proper typing
const emit = defineEmits<{
  'repos-changed': [repos: string[]]
  'repository-status-changed': [data: { repository: UserRepository; enabled: boolean }]
}>()

// Reactive state with proper typing
const showSelector: Ref<boolean> = ref(false)
const loading: Ref<boolean> = ref(false)
const error: Ref<string | null> = ref(null)
const availableRepos: Ref<UserRepository[]> = ref([])
const selectedRepos: Ref<string[]> = ref([])
const togglingRepos: Ref<Set<number>> = ref(new Set())

// Lifecycle hook
onMounted(async (): Promise<void> => {
  console.log('RepoSelector mounted, loading repositories...')
  await loadRepositories()
})

// Methods with proper typing
async function loadRepositories(): Promise<void> {
  loading.value = true
  error.value = null
  
  try {
    // Load user repositories with enable/disable status if showStatus is true
    if (props.showStatus) {
      availableRepos.value = await bitbucketService.fetchUserRepositories()
    } else {
      // For fallback, you might need to implement this method
      availableRepos.value = await bitbucketService.fetchUserRepositories()
    }
    
    // Select only enabled repos by default, or all repos if no status info
    if (props.showStatus) {
      selectedRepos.value = availableRepos.value
        .filter((repo: UserRepository) => repo.is_enabled !== false)
        .map((repo: UserRepository) => repo.name)
    } else {
      selectedRepos.value = availableRepos.value.map((repo: UserRepository) => repo.name)
    }
    
    emit('repos-changed', selectedRepos.value)
    
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
    error.value = errorMessage
    console.error('Failed to load repositories:', err)
  } finally {
    loading.value = false
  }
}

async function toggleRepositoryStatus(repo: UserRepository): Promise<void> {
  if (!repo.id || togglingRepos.value.has(repo.id)) {
    return
  }
  
  togglingRepos.value.add(repo.id)
  
  try {
    const response: RepositoryToggleResponse = await bitbucketService.toggleRepositoryStatus(repo.id.toString())
    
    if (response.success) {
      // Update the repo in our local data
      const repoIndex = availableRepos.value.findIndex((r: UserRepository) => r.id === repo.id)
      if (repoIndex !== -1) {
        availableRepos.value[repoIndex].is_enabled = response.is_enabled
        
        // Update selected repos based on new status
        const repoName = repo.name
        const isSelected = selectedRepos.value.includes(repoName)
        
        if (response.is_enabled && !isSelected) {
          // Enable and select the repo
          selectedRepos.value.push(repoName)
          emit('repos-changed', selectedRepos.value)
        } else if (!response.is_enabled && isSelected) {
          // Disable and deselect the repo
          selectedRepos.value = selectedRepos.value.filter((name: string) => name !== repoName)
          emit('repos-changed', selectedRepos.value)
        }
        
        // Emit status change event
        emit('repository-status-changed', {
          repository: availableRepos.value[repoIndex],
          enabled: response.is_enabled
        })
        
        // Show success feedback (you could add a toast notification here)
        console.log(`Repository ${repo.name} ${response.is_enabled ? 'enabled' : 'disabled'}`)
      }
    } else {
      console.error('Failed to toggle repository status:', response.message)
      // You could show an error toast here
    }
  } catch (err: unknown) {
    console.error('Error toggling repository status:', err)
    // You could show an error toast here
  } finally {
    togglingRepos.value.delete(repo.id)
  }
}

function toggleRepo(repoName: string): void {
  // Check if repo is disabled
  const repo = availableRepos.value.find((r: UserRepository) => r.name === repoName)
  if (repo && repo.is_enabled === false) {
    return // Don't allow toggling disabled repositories
  }
  
  const index = selectedRepos.value.indexOf(repoName)
  if (index > -1) {
    selectedRepos.value.splice(index, 1)
  } else {
    selectedRepos.value.push(repoName)
  }
  emit('repos-changed', selectedRepos.value)
}

function selectAll(): void {
  // Only select enabled repositories
  selectedRepos.value = availableRepos.value
    .filter((repo: UserRepository) => repo.is_enabled !== false)
    .map((repo: UserRepository) => repo.name)
  emit('repos-changed', selectedRepos.value)
}

function selectNone(): void {
  selectedRepos.value = []
  emit('repos-changed', selectedRepos.value)
}

function toggleSelector(): void {
  showSelector.value = !showSelector.value
}

function formatDate(dateString: string | null): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  const currentYear = new Date().getFullYear()
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== currentYear ? 'numeric' : undefined
  })
}
</script>

<template>
  <div class="repo-selector" :class="{ compact }">
    <div class="header">
      <h3 v-if="!compact">Select Repositories</h3>
      <span v-else class="compact-title">Repositories</span>
      <div class="controls">
        <button @click="selectAll" class="btn btn-sm">{{ compact ? 'All' : 'Select All' }}</button>
        <button @click="selectNone" class="btn btn-sm">{{ compact ? 'None' : 'Select None' }}</button>
        <button @click="toggleSelector" class="btn btn-primary">
          {{ showSelector ? 'Hide' : 'Show' }} {{ compact ? '' : 'Repos' }} ({{ selectedRepos.length }})
        </button>
      </div>
    </div>
    
    <div v-if="showSelector" class="repo-grid">
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <span>Loading repositories...</span>
      </div>
      
      <div v-else-if="error" class="error">
        <p>Failed to load repositories: {{ error }}</p>
        <button @click="loadRepositories" class="btn btn-sm">Retry</button>
      </div>
      
      <div v-else class="repo-list">
        <div 
          v-for="repo in availableRepos" 
          :key="repo.id || repo.name"
          class="repo-item"
          :class="{ 
            selected: selectedRepos.includes(repo.name), 
            disabled: repo.is_enabled === false,
            'has-toggle': repo.id
          }"
        >
          <label class="repo-label">
            <input 
              type="checkbox" 
              :value="repo.name"
              :checked="selectedRepos.includes(repo.name)"
              :disabled="repo.is_enabled === false"
              @change="toggleRepo(repo.name)"
            />
            <div class="repo-info">
              <div class="repo-header">
                <span class="repo-name">{{ repo.name }}</span>
                <div class="repo-badges">
                  <span v-if="repo.is_primary" class="badge primary">Primary</span>
                  <span v-if="repo.is_enabled === false" class="badge disabled">Disabled</span>
                  <span v-else-if="repo.is_enabled === true" class="badge enabled">Enabled</span>
                </div>
              </div>
              <div class="repo-meta">
                <span v-if="repo.language" class="language">{{ repo.language }}</span>
                <span v-if="repo.updated_on" class="updated">
                  {{ formatDate(repo.updated_on) }}
                </span>
              </div>
            </div>
            <div v-if="repo.id" class="repo-actions">
              <button 
                @click.prevent="toggleRepositoryStatus(repo)"
                :class="['toggle-btn', repo.is_enabled ? 'enabled' : 'disabled']"
                :disabled="togglingRepos.has(repo.id)"
                :title="repo.is_enabled ? 'Disable repository' : 'Enable repository'"
              >
                <span v-if="togglingRepos.has(repo.id)" class="toggle-spinner"></span>
                <span v-else class="toggle-icon">{{ repo.is_enabled ? '●' : '○' }}</span>
              </button>
            </div>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.repo-selector {
  @apply bg-surface border border-border-light rounded-lg mb-5;

  &.compact {
    @apply bg-transparent border-white/30 rounded-md mb-0;
  }

  .header {
    @apply flex justify-between items-center px-5 py-4 border-b border-border-light bg-gray-50 rounded-t-lg;

    h3 {
      @apply m-0 text-base text-text-main;
    }

    .compact-title {
      @apply m-0 text-sm text-white opacity-90 font-medium;
    }

    .controls {
      @apply flex gap-2;

      .btn {
        @apply px-3 py-1.5 border border-gray-300 rounded bg-white text-text-muted text-[12px] cursor-pointer transition-all duration-200 hover:bg-gray-50 hover:border-gray-400;

        &.btn-primary {
          @apply bg-brand-primary text-white border-brand-primary hover:bg-brand-primary-hover;
        }

        &.btn-sm {
          @apply px-2 py-1 text-[11px];
        }
      }
    }
  }

  &.compact .header {
    @apply px-4 py-2.5 border-b border-white/20 bg-transparent rounded-t-md;

    .btn {
      @apply border-white/30 bg-white/20 text-white hover:bg-white/30 hover:border-white/40;

      &.btn-primary {
        @apply bg-brand-secondary border-brand-secondary hover:bg-brand-secondary-hover;
      }
    }
  }

  .repo-grid {
    @apply max-h-[400px] overflow-y-auto;

    .loading {
      @apply flex items-center justify-center p-10 text-text-muted;

      .spinner {
        @apply w-5 h-5 border-2 border-gray-100 border-t-brand-primary rounded-full animate-spin mr-2.5;
      }
    }

    .error {
      @apply p-5 text-center text-error;
    }

    .repo-list {
      @apply grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-[1px] bg-border-light;

      .repo-item {
        @apply bg-white transition-all duration-200 relative hover:bg-gray-50;

        &.selected {
          @apply bg-blue-50 border-l-[3px] border-brand-primary;
        }

        &.disabled {
          @apply bg-gray-50 opacity-70;

          &.selected {
            @apply bg-orange-50 border-l-[3px] border-warning;
          }
        }

        &.has-toggle .repo-label {
          @apply pr-[50px];
        }

        .repo-label {
          @apply flex items-start p-3 px-4 cursor-pointer w-full relative;

          input[type="checkbox"] {
            @apply mr-3 mt-0.5 scale-110 shrink-0 disabled:opacity-50;
          }

          .repo-info {
            @apply flex-1 min-w-0;

            .repo-header {
              @apply flex items-center justify-between mb-1 gap-2;

              .repo-name {
                @apply font-medium text-text-main flex-1 min-w-0 break-words;
              }

              .repo-badges {
                @apply flex gap-1 shrink-0;

                .badge {
                  @apply text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wider;

                  &.primary { @apply bg-brand-primary text-white; }
                  &.enabled { @apply bg-success text-white; }
                  &.disabled { @apply bg-text-muted text-white; }
                }
              }
            }

            .repo-meta {
              @apply flex gap-3 text-[12px] text-text-muted items-center;

              .language {
                @apply bg-gray-100 px-1.5 py-0.5 rounded font-medium;
              }

              .updated {
                @apply text-success;
              }
            }
          }
        }

        .repo-actions {
          @apply absolute right-3 top-1/2 -translate-y-1/2 flex items-center;

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

            .toggle-icon {
              @apply leading-none;
            }
          }
        }
      }
    }
  }
}
</style>