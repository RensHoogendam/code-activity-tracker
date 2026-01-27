<script setup>
import { ref, onMounted, computed } from 'vue'
import { bitbucketService } from '../services/bitbucketService'

const emit = defineEmits(['repos-changed'])

const loading = ref(false)
const error = ref(null)
const availableRepos = ref([])
const selectedRepos = ref([])
const searchQuery = ref('')

// Computed filtered repositories based on search
const filteredRepos = computed(() => {
  if (!searchQuery.value) return availableRepos.value
  
  const query = searchQuery.value.toLowerCase()
  return availableRepos.value.filter(repo => 
    repo.name.toLowerCase().includes(query) ||
    (repo.language && repo.language.toLowerCase().includes(query))
  )
})

// Load repositories on mount
onMounted(async () => {
  await loadRepositories()
})

async function loadRepositories() {
  loading.value = true
  error.value = null
  
  try {
    availableRepos.value = await bitbucketService.getAvailableRepositories()
    
    // Get currently selected repos from the service
    const currentRepos = bitbucketService.config.repos || []
    selectedRepos.value = currentRepos.length > 0 ? currentRepos : availableRepos.value.map(repo => repo.name)
    
  } catch (err) {
    error.value = err.message
    console.error('Failed to load repositories:', err)
  } finally {
    loading.value = false
  }
}

function toggleRepo(repoName) {
  const index = selectedRepos.value.indexOf(repoName)
  if (index > -1) {
    selectedRepos.value.splice(index, 1)
  } else {
    selectedRepos.value.push(repoName)
  }
}

function selectAll() {
  selectedRepos.value = filteredRepos.value.map(repo => repo.name)
}

function selectNone() {
  selectedRepos.value = []
}

function selectByLanguage(language) {
  const reposWithLanguage = filteredRepos.value
    .filter(repo => repo.language === language)
    .map(repo => repo.name)
  
  // Add to selected if not already selected
  reposWithLanguage.forEach(repoName => {
    if (!selectedRepos.value.includes(repoName)) {
      selectedRepos.value.push(repoName)
    }
  })
}

function saveSettings() {
  emit('repos-changed', selectedRepos.value)
  // Show success message briefly
  const successMessage = document.querySelector('.success-message')
  if (successMessage) {
    successMessage.style.display = 'block'
    setTimeout(() => {
      successMessage.style.display = 'none'
    }, 3000)
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

function formatDate(dateString) {
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
                  :key="lang"
                  @click="selectByLanguage(lang)"
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
              <Save :size="16" /> Save Settings
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
              :class="{ selected: selectedRepos.includes(repo.name) }"
            >
              <label class="repo-label">
                <input 
                  type="checkbox" 
                  :value="repo.name"
                  :checked="selectedRepos.includes(repo.name)"
                  @change="toggleRepo(repo.name)"
                  class="repo-checkbox"
                />
                <div class="repo-info">
                  <div class="repo-header">
                    <span class="repo-name">{{ repo.name }}</span>
                    <span v-if="repo.language" class="repo-language">{{ repo.language }}</span>
                  </div>
                  <div class="repo-meta">
                    <span v-if="repo.updated_on" class="updated-date">
                      Updated {{ formatDate(repo.updated_on) }}
                    </span>
                  </div>
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
}

.save-btn:hover:not(:disabled) {
  background: #ea580c;
  transform: translateY(-1px);
}

.save-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
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

.repo-label {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  cursor: pointer;
  width: 100%;
}

.repo-checkbox {
  margin-top: 2px;
  transform: scale(1.2);
}

.repo-info {
  flex: 1;
}

.repo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.repo-name {
  font-weight: 600;
  color: #2c3e50;
  font-size: 15px;
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