<script setup lang="ts">
import { useRoute } from 'vue-router'
import { BarChart3, ClipboardList, Settings, Calendar } from 'lucide-vue-next'

import type { AppFilters } from '../types/bitbucket'

// Props with proper typing
interface Props {
  lastUpdated: Date | null
  isLoading: boolean
  filters: AppFilters
}

const props = withDefaults(defineProps<Props>(), {
  lastUpdated: null,
  isLoading: false,
  filters: () => ({
    repo: '',
    dateRange: 12,
    author: 'Rens Hoogendam',
    type: 'all'
  })
})

// Emits with proper typing
const emit = defineEmits<{
  'refresh': []
  'force-refresh': []
  'clear-cache': []
  'filter-change': [filters: Partial<AppFilters>]
}>()

// Reactive state
const route = useRoute()
</script>

<template>
  <nav class="app-navigation">
    <div class="nav-container">
      <!-- Left: Brand -->
      <div class="nav-left">
        <div class="brand">
          <h1>Hours Tracker</h1>
          <span class="subtitle">Bitbucket Activity Dashboard</span>
        </div>
      </div>

      <!-- Right: Navigation Links -->
      <div class="nav-right">
        <div class="nav-links">
          <router-link to="/" class="nav-link" :class="{ active: route.path === '/' }">
            <BarChart3 class="nav-icon" :size="16" />
            Dashboard
          </router-link>
          <router-link to="/details" class="nav-link" :class="{ active: route.path === '/details' }">
            <ClipboardList class="nav-icon" :size="16" />
            Details
          </router-link>
          <router-link to="/calendar" class="nav-link" :class="{ active: route.path === '/calendar' }">
            <Calendar class="nav-icon" :size="16" />
            Calendar
          </router-link>
          <router-link to="/settings" class="nav-link" :class="{ active: route.path === '/settings' }">
            <Settings class="nav-icon" :size="16" />
            Settings
          </router-link>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped lang="scss">
.app-navigation {
  @apply bg-brand-primary text-white shadow-md sticky top-0 z-[100];

  .nav-container {
    @apply max-w-content-width mx-auto px-6 h-[var(--spacing-header-height)] flex items-center justify-between;
  }

  .nav-left {
    @apply flex items-center;

    .brand {
      @apply flex flex-col;

      h1 {
        @apply text-xl font-semibold m-0 leading-[1.2];
      }

      .subtitle {
        @apply text-xs opacity-80 font-normal leading-none mt-0.5;
      }
    }
  }

  .nav-right {
    @apply flex items-center;

    .nav-links {
      @apply flex items-center gap-0;

      .nav-link {
        @apply flex items-center gap-2 text-white/80 no-underline px-4 py-3 text-sm font-medium transition-all duration-200 relative;

        &:hover {
          @apply text-white bg-white/10;
        }

        &.active {
          @apply text-white bg-white/15;

          &::after {
            content: '';
            @apply absolute bottom-0 left-0 right-0 h-[3px] bg-[#36B37E];
          }
        }

        .nav-icon {
          @apply shrink-0 text-inherit;
        }
      }
    }
  }
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .app-navigation {
    .nav-container {
      @apply px-4;
    }
    
    .nav-right .nav-links .nav-link {
      @apply px-3 text-[0.8rem];

      .nav-icon {
        @apply text-[0.9rem];
      }
    }
    
    .nav-left .brand {
      h1 {
        @apply text-[1.1rem];
      }

      .subtitle {
        @apply hidden;
      }
    }
  }
}

@media (max-width: 480px) {
  .app-navigation .nav-right .nav-links .nav-link {
    @apply px-2.5;

    span {
      @apply hidden;
    }
  }

  .app-navigation .nav-left .brand h1 {
    @apply text-base;
  }
}
</style>