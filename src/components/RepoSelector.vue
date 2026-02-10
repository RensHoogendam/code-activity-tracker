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

<script>
import { bitbucketService } from '../services/bitbucketService'

export default {
  name: 'RepoSelector',
  props: {
    compact: {
      type: Boolean,
      default: false
    },
    // If true, load user repositories with enable/disable status
    showStatus: {
      type: Boolean,
      default: true
    }
  },
  emits: ['repos-changed', 'repository-status-changed'],
  data() {
    return {
      showSelector: false,
      loading: false,
      error: null,
      availableRepos: [],
      selectedRepos: [],
      togglingRepos: new Set() // Track which repos are being toggled
    }
  },
  async mounted() {
    console.log('RepoSelector mounted, loading repositories...')
    await this.loadRepositories()
  },
  methods: {
    async loadRepositories() {
      this.loading = true
      this.error = null
      
      try {
        // Load user repositories with enable/disable status if showStatus is true
        if (this.showStatus) {
          this.availableRepos = await bitbucketService.getUserRepositories()
        } else {
          this.availableRepos = await bitbucketService.getAvailableRepositories()
        }
        
        // Select only enabled repos by default, or all repos if no status info
        if (this.showStatus) {
          this.selectedRepos = this.availableRepos
            .filter(repo => repo.is_enabled !== false)
            .map(repo => repo.name)
        } else {
          this.selectedRepos = this.availableRepos.map(repo => repo.name)
        }
        
        this.$emit('repos-changed', this.selectedRepos)
        
      } catch (err) {
        this.error = err.message
        console.error('Failed to load repositories:', err)
      } finally {
        this.loading = false
      }
    },
    
    async toggleRepositoryStatus(repo) {
      if (!repo.id || this.togglingRepos.has(repo.id)) {
        return
      }
      
      this.togglingRepos.add(repo.id)
      
      try {
        const response = await bitbucketService.toggleRepositoryStatus(repo.id)
        
        if (response.success) {
          // Update the repo in our local data
          const repoIndex = this.availableRepos.findIndex(r => r.id === repo.id)
          if (repoIndex !== -1) {
            this.availableRepos[repoIndex].is_enabled = response.is_enabled
            
            // Update selected repos based on new status
            const repoName = repo.name
            const isSelected = this.selectedRepos.includes(repoName)
            
            if (response.is_enabled && !isSelected) {
              // Enable and select the repo
              this.selectedRepos.push(repoName)
              this.$emit('repos-changed', this.selectedRepos)
            } else if (!response.is_enabled && isSelected) {
              // Disable and deselect the repo
              this.selectedRepos = this.selectedRepos.filter(name => name !== repoName)
              this.$emit('repos-changed', this.selectedRepos)
            }
            
            // Emit status change event
            this.$emit('repository-status-changed', {
              repository: this.availableRepos[repoIndex],
              enabled: response.is_enabled
            })
            
            // Show success feedback (you could add a toast notification here)
            console.log(`Repository ${repo.name} ${response.is_enabled ? 'enabled' : 'disabled'}`)
          }
        } else {
          console.error('Failed to toggle repository status:', response.message)
          // You could show an error toast here
        }
      } catch (err) {
        console.error('Error toggling repository status:', err)
        // You could show an error toast here
      } finally {
        this.togglingRepos.delete(repo.id)
      }
    },
    
    toggleRepo(repoName) {
      // Check if repo is disabled
      const repo = this.availableRepos.find(r => r.name === repoName)
      if (repo && repo.is_enabled === false) {
        return // Don't allow toggling disabled repositories
      }
      
      const index = this.selectedRepos.indexOf(repoName)
      if (index > -1) {
        this.selectedRepos.splice(index, 1)
      } else {
        this.selectedRepos.push(repoName)
      }
      this.$emit('repos-changed', this.selectedRepos)
    },
    
    selectAll() {
      // Only select enabled repositories
      this.selectedRepos = this.availableRepos
        .filter(repo => repo.is_enabled !== false)
        .map(repo => repo.name)
      this.$emit('repos-changed', this.selectedRepos)
    },
    
    selectNone() {
      this.selectedRepos = []
      this.$emit('repos-changed', this.selectedRepos)
    },
    
    toggleSelector() {
      this.showSelector = !this.showSelector
    },
    
    formatDate(dateString) {
      if (!dateString) return ''
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
      })
    }
  }
}
</script>

<style scoped>
.repo-selector {
  background: white;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  margin-bottom: 20px;
}

.repo-selector.compact {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 6px;
  margin-bottom: 0;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e1e5e9;
  background: #f8f9fa;
  border-radius: 8px 8px 0 0;
}

.compact .header {
  padding: 10px 15px;
  border-bottom: 1px solid rgba(255,255,255,0.2);
  background: transparent;
  border-radius: 6px 6px 0 0;
}

.header h3 {
  margin: 0;
  font-size: 16px;
  color: #2c3e50;
}

.compact-title {
  margin: 0;
  font-size: 14px;
  color: white;
  opacity: 0.9;
  font-weight: 500;
}

.controls {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  color: #555;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.compact .btn {
  padding: 5px 10px;
  border: 1px solid rgba(255,255,255,0.3);
  background: rgba(255,255,255,0.2);
  color: white;
  font-size: 11px;
  border-radius: 4px;
}

.btn:hover {
  background: #f5f5f5;
  border-color: #bbb;
}

.compact .btn:hover {
  background: rgba(255,255,255,0.3);
  border-color: rgba(255,255,255,0.4);
}

.btn-primary {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.compact .btn-primary {
  background: #F97316;
  border-color: #F97316;
}

.btn-primary:hover {
  background: #0056b3;
  border-color: #0056b3;
}

.compact .btn-primary:hover {
  background: #ea580c;
  border-color: #ea580c;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 11px;
}

.repo-grid {
  max-height: 400px;
  overflow-y: auto;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #666;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error {
  padding: 20px;
  text-align: center;
  color: #dc3545;
}

.repo-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1px;
  background: #e1e5e9;
}

.repo-item {
  background: white;
  transition: all 0.2s;
  position: relative;
}

.repo-item:hover {
  background: #f8f9fa;
}

.repo-item.selected {
  background: #e7f3ff;
  border-left: 3px solid #007bff;
}

.repo-item.disabled {
  background: #f8f9fa;
  opacity: 0.7;
}

.repo-item.disabled.selected {
  background: #fff3cd;
  border-left: 3px solid #ffc107;
}

.repo-item.has-toggle .repo-label {
  padding-right: 50px;
}

.repo-label {
  display: flex;
  align-items: flex-start;
  padding: 12px 16px;
  cursor: pointer;
  width: 100%;
  position: relative;
}

.repo-label input[type="checkbox"] {
  margin-right: 12px;
  margin-top: 2px;
  transform: scale(1.1);
  flex-shrink: 0;
}

.repo-label input[type="checkbox"]:disabled {
  opacity: 0.5;
}

.repo-info {
  flex: 1;
  min-width: 0;
}

.repo-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
  gap: 8px;
}

.repo-name {
  font-weight: 500;
  color: #2c3e50;
  flex: 1;
  min-width: 0;
  word-break: break-word;
}

.repo-badges {
  display: flex;
  gap: 4px;
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

.repo-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #6c757d;
  align-items: center;
}

.language {
  background: #e9ecef;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 500;
}

.updated {
  color: #28a745;
}

.repo-actions {
  position: absolute;
  right: 12px;
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
</style>