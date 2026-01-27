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
          :key="repo.name"
          class="repo-item"
          :class="{ selected: selectedRepos.includes(repo.name) }"
        >
          <label class="repo-label">
            <input 
              type="checkbox" 
              :value="repo.name"
              :checked="selectedRepos.includes(repo.name)"
              @change="toggleRepo(repo.name)"
            />
            <div class="repo-info">
              <span class="repo-name">{{ repo.name }}</span>
              <div class="repo-meta">
                <span v-if="repo.language" class="language">{{ repo.language }}</span>
                <span v-if="repo.updated_on" class="updated">
                  {{ formatDate(repo.updated_on) }}
                </span>
              </div>
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
    }
  },
  emits: ['repos-changed'],
  data() {
    return {
      showSelector: false,
      loading: false,
      error: null,
      availableRepos: [],
      selectedRepos: []
    }
  },
  async mounted() {
    await this.loadRepositories()
  },
  methods: {
    async loadRepositories() {
      this.loading = true
      this.error = null
      
      try {
        this.availableRepos = await bitbucketService.getAvailableRepositories()
        
        // Select all repos by default
        this.selectedRepos = this.availableRepos.map(repo => repo.name)
        this.$emit('repos-changed', this.selectedRepos)
        
      } catch (err) {
        this.error = err.message
        console.error('Failed to load repositories:', err)
      } finally {
        this.loading = false
      }
    },
    
    toggleRepo(repoName) {
      const index = this.selectedRepos.indexOf(repoName)
      if (index > -1) {
        this.selectedRepos.splice(index, 1)
      } else {
        this.selectedRepos.push(repoName)
      }
      this.$emit('repos-changed', this.selectedRepos)
    },
    
    selectAll() {
      this.selectedRepos = this.availableRepos.map(repo => repo.name)
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
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1px;
  background: #e1e5e9;
}

.repo-item {
  background: white;
  transition: all 0.2s;
}

.repo-item:hover {
  background: #f8f9fa;
}

.repo-item.selected {
  background: #e7f3ff;
  border-left: 3px solid #007bff;
}

.repo-label {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  width: 100%;
}

.repo-label input[type="checkbox"] {
  margin-right: 12px;
  transform: scale(1.1);
}

.repo-info {
  flex: 1;
}

.repo-name {
  font-weight: 500;
  color: #2c3e50;
  display: block;
  margin-bottom: 4px;
}

.repo-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #6c757d;
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
</style>