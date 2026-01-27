<script setup>
import { ref } from 'vue'
import RepoSelector from './RepoSelector.vue'

const props = defineProps({
  lastUpdated: Date,
  isLoading: Boolean
})

const emit = defineEmits(['refresh', 'force-refresh', 'clear-cache', 'repos-changed'])

const showCacheMenu = ref(false)

function formatLastUpdated(date) {
  if (!date) return 'Never'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

function handleRefresh() {
  emit('refresh')
  showCacheMenu.value = false
}

function handleForceRefresh() {
  emit('force-refresh')
  showCacheMenu.value = false
}

function handleClearCache() {
  emit('clear-cache')
  showCacheMenu.value = false
}

function handleReposChanged(repos) {
  emit('repos-changed', repos)
}
</script>

<template>
  <header class="hours-header">
    <div class="container">
      <div class="header-content">
        <div class="title-section">
          <h1>Hours Tracker</h1>
          <p class="subtitle">Bitbucket Activity Dashboard for Rens Hoogendam</p>
        </div>
        
        <div class="actions-section">
          <div class="last-updated">
            <span class="label">Last updated:</span>
            <span class="time">{{ formatLastUpdated(lastUpdated) }}</span>
          </div>
          
          <div class="refresh-controls">
            <button 
              @click="handleRefresh"
              class="refresh-btn"
              :disabled="isLoading"
            >
              <span class="icon" :class="{ spinning: isLoading }">🔄</span>
              {{ isLoading ? 'Refreshing...' : 'Refresh' }}
            </button>
            
            <div class="cache-menu">
              <button 
                @click="showCacheMenu = !showCacheMenu"
                class="cache-btn"
                :disabled="isLoading"
              >
                ⚙️
              </button>
              
              <div v-if="showCacheMenu" class="cache-dropdown">
                <button @click="handleForceRefresh">
                  Force Refresh
                </button>
                <button @click="handleClearCache">
                  Clear Cache
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Repository selector integrated into header -->
      <div class="repo-section">
        <RepoSelector 
          @repos-changed="handleReposChanged"
          :compact="true"
        />
      </div>
    </div>
  </header>
</template>

<style scoped>
.hours-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px 20px 0 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 20px;
}

.repo-section {
  border-top: 1px solid rgba(255,255,255,0.2);
  padding-top: 15px;
  padding-bottom: 15px;
}

.title-section h1 {
  font-size: 2.2rem;
  font-weight: 700;
  margin-bottom: 4px;
}

.subtitle {
  opacity: 0.9;
  font-size: 1rem;
}

.actions-section {
  display: flex;
  align-items: center;
  gap: 20px;
}

.refresh-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
}

.last-updated {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-size: 0.9rem;
}

.label {
  opacity: 0.8;
  margin-bottom: 2px;
  font-size: 0.8rem;
}

.time {
  font-weight: 600;
}

.refresh-btn, .cache-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255,255,255,0.2);
  border: 1px solid rgba(255,255,255,0.3);
  color: white;
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.cache-btn {
  padding: 10px 12px;
  min-width: auto;
}

.refresh-btn:hover:not(:disabled), .cache-btn:hover:not(:disabled) {
  background: rgba(255,255,255,0.3);
  transform: translateY(-1px);
}

.refresh-btn:disabled, .cache-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.cache-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #e1e5e9;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 1000;
  margin-top: 4px;
  min-width: 140px;
}

.cache-dropdown button {
  display: block;
  width: 100%;
  padding: 8px 12px;
  background: none;
  border: none;
  color: #2c3e50;
  text-align: left;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.2s;
}

.cache-dropdown button:hover {
  background: #f8f9fa;
}

.cache-dropdown button:first-child {
  border-radius: 6px 6px 0 0;
}

.cache-dropdown button:last-child {
  border-radius: 0 0 6px 6px;
  border-top: 1px solid #e1e5e9;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    text-align: center;
    gap: 15px;
  }
  
  .title-section h1 {
    font-size: 1.8rem;
  }
  
  .actions-section {
    flex-direction: row;
    width: 100%;
    justify-content: center;
    gap: 15px;
  }
  
  .refresh-controls {
    flex-direction: row;
  }
}
</style>