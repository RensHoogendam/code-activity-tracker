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

<style scoped lang="scss">
.hours-header {
  @apply bg-brand-primary text-white shadow-md relative;

  .container {
    @apply max-w-content-width mx-auto;

    .header-content {
      @apply flex justify-between items-center px-6 py-5 min-h-[80px];

      .title-section {
        @apply flex-1;

        h1 {
          @apply m-0 mb-1 text-[2rem] font-bold text-white;
        }

        .subtitle {
          @apply m-0 text-base opacity-90 text-white;
        }
      }

      .actions-section {
        @apply flex items-center gap-2 relative;

        .last-updated {
          @apply flex flex-col items-end text-[0.9rem];

          .label {
            @apply opacity-80 mb-0.5;
          }

          .time {
            @apply font-semibold;
          }
        }

        .refresh-controls {
          @apply flex gap-2;

          .refresh-btn, .cache-btn {
            @apply flex items-center gap-2 bg-white/20 border border-white/30 text-white px-5 py-3 rounded-lg text-base font-medium cursor-pointer transition-all duration-300 backdrop-blur-md;

            &:hover {
              @apply bg-white/30 border-white/40;
            }

            &:disabled {
              @apply opacity-60 cursor-not-allowed;
            }

            .icon.spinning {
              @apply animate-spin;
            }
          }

          .cache-btn {
            @apply p-3 min-w-0;
          }
        }
      }
    }

    .repo-section {
      @apply border-t border-white/20 px-6 py-4;

      .repo-selector {
        @apply mb-0;
      }
    }
  }

  .cache-menu {
    @apply relative;

    .cache-dropdown {
      @apply absolute top-full right-0 mt-2 bg-white rounded-lg shadow-xl overflow-hidden z-[1000] min-w-[160px];

      button {
        @apply block w-full px-4 py-3 bg-transparent border-none text-text-main text-left cursor-pointer transition-colors duration-200;

        &:hover {
          @apply bg-gray-50;
        }
      }
    }
  }
}

/* Responsive design */
@media (max-width: 768px) {
  .hours-header .container {
    .header-content {
      @apply flex-col items-start gap-4 px-5 py-4;
    }
    
    .actions-section {
      @apply flex flex-col items-stretch w-full gap-3;

      .refresh-controls {
        @apply justify-end;
      }
      
      .last-updated {
        @apply items-start text-[0.8rem];
      }
    }
    
    .title-section h1 {
      @apply text-2xl;
    }
    
    .subtitle {
      @apply text-[0.9rem];
    }
  }
}

@media (max-width: 480px) {
  .hours-header .container {
    .header-content {
      @apply px-4 py-3;
    }
    
    .repo-section {
      @apply px-4 py-3;
    }
    
    .refresh-controls {
      .refresh-btn, .cache-btn {
        @apply px-4 py-2.5 text-[0.9rem];
      }
      
      .cache-btn {
        @apply p-2.5;
      }
    }
  }
}
</style>