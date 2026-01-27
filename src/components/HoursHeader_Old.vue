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
              class="refresh-btn"
              @click="handleRefresh"
              :disabled="isLoading"
            >
              <svg v-if="!isLoading" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
              </svg>
              <svg v-else class="spinning" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,4a8,8,0,0,1,7.89,6.7A1.53,1.53,0,0,0,21.38,12h0a1.5,1.5,0,0,0,1.48-1.75,11,11,0,0,0-21.72,0A1.5,1.5,0,0,0,2.62,12h0a1.53,1.53,0,0,0,1.49-1.3A8,8,0,0,1,12,4Z"/>
              </svg>
              {{ isLoading ? 'Refreshing...' : 'Refresh' }}
            </button>
            
            <div class="cache-menu" :class="{ open: showCacheMenu }">
              <button 
                class="cache-btn"
                @click="showCacheMenu = !showCacheMenu"
                :disabled="isLoading"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
              </button>
              
              <div class="cache-dropdown" v-show="showCacheMenu">
                <button @click="handleForceRefresh">🔄 Force Refresh</button>
                <button @click="handleClearCache">🗑️ Clear Cache</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.hours-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 30px 0;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.title-section h1 {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 8px;
}

.subtitle {
  opacity: 0.9;
  font-size: 1.1rem;
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
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.cache-btn {
  padding: 12px;
  min-width: auto;
}

.refresh-btn:hover:not(:disabled), .cache-btn:hover:not(:disabled) {
  background: rgba(255,255,255,0.3);
  transform: translateY(-2px);
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
  min-width: 160px;
}

.cache-dropdown button {
  display: block;
  width: 100%;
  padding: 10px 16px;
  background: none;
  border: none;
  color: #2c3e50;
  text-align: left;
  font-size: 13px;
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
  }
  
  .title-section h1 {
    font-size: 2rem;
  }
  
  .actions-section {
    flex-direction: column;
    width: 100%;
  }
}
</style>