<script setup lang="ts">
import { ref, type Ref } from 'vue'
import RepoSelector from './RepoSelector.vue'

// Props with proper typing
interface Props {
  lastUpdated: Date | null
  isLoading: boolean
}

const props = withDefaults(defineProps<Props>(), {
  lastUpdated: null,
  isLoading: false
})

// Emits with proper typing
const emit = defineEmits<{
  'refresh': []
  'force-refresh': []
  'clear-cache': []
  'repos-changed': [repos: string[]]
}>()

const showCacheMenu: Ref<boolean> = ref(false)

function formatLastUpdated(date: Date | null): string {
  if (!date) return 'Never'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

function handleRefresh(): void {
  emit('refresh')
  showCacheMenu.value = false
}

function handleForceRefresh(): void {
  emit('force-refresh')
  showCacheMenu.value = false
}

function handleClearCache(): void {
  emit('clear-cache')
  showCacheMenu.value = false
}

function handleReposChanged(repos: string[]): void {
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
          :showStatus="false"
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
  padding: 0;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  min-height: 80px;
}

.title-section {
  flex: 1;
}

.title-section h1 {
  margin: 0 0 4px 0;
  font-size: 2rem;
  font-weight: 700;
  color: white;
}

.subtitle {
  margin: 0;
  font-size: 1rem;
  opacity: 0.9;
  color: white;
}

.actions-section {
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

.refresh-controls {
  display: flex;
  gap: 8px;
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

.refresh-btn:hover, .cache-btn:hover {
  background: rgba(255,255,255,0.3);
  border-color: rgba(255,255,255,0.4);
}

.refresh-btn:disabled, .cache-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.icon.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.cache-menu {
  position: relative;
}

.cache-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  overflow: hidden;
  z-index: 1000;
  min-width: 160px;
}

.cache-dropdown button {
  display: block;
  width: 100%;
  padding: 12px 16px;
  background: none;
  border: none;
  color: #374151;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s;
}

.cache-dropdown button:hover {
  background: #f9fafb;
}

.repo-section {
  border-top: 1px solid rgba(255,255,255,0.2);
  padding: 16px 24px;
}

.repo-section .repo-selector {
  margin-bottom: 0;
}

/* Responsive design */
@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 16px 20px;
  }
  
  .actions-section {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    width: 100%;
    gap: 12px;
  }
  
  .refresh-controls {
    justify-content: flex-end;
  }
  
  .last-updated {
    align-items: flex-start;
    font-size: 0.8rem;
  }
  
  .title-section h1 {
    font-size: 1.5rem;
  }
  
  .subtitle {
    font-size: 0.9rem;
  }
}

@media (max-width: 480px) {
  .container {
    padding: 0;
  }
  
  .header-content {
    padding: 12px 16px;
  }
  
  .repo-section {
    padding: 12px 16px;
  }
  
  .refresh-btn, .cache-btn {
    padding: 10px 16px;
    font-size: 0.9rem;
  }
  
  .cache-btn {
    padding: 10px;
  }
}
</style>