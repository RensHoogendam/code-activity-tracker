<script setup lang="ts">
import { useRoute } from 'vue-router'
import { BarChart3, ClipboardList, Settings } from 'lucide-vue-next'

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
          <router-link to="/settings" class="nav-link" :class="{ active: route.path === '/settings' }">
            <Settings class="nav-icon" :size="16" />
            Settings
          </router-link>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.app-navigation {
  background: #0052CC;
  color: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav-left {
  display: flex;
  align-items: center;
}

.brand {
  display: flex;
  flex-direction: column;
}

.brand h1 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  line-height: 1.2;
}

.subtitle {
  font-size: 0.75rem;
  opacity: 0.8;
  font-weight: 400;
  line-height: 1;
  margin-top: 2px;
}

.nav-right {
  display: flex;
  align-items: center;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 0;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255,255,255,0.8);
  text-decoration: none;
  padding: 12px 16px;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
  border-radius: 0;
  position: relative;
}

.nav-link:hover {
  color: white;
  background: rgba(255,255,255,0.1);
}

.nav-link.active {
  color: white;
  background: rgba(255,255,255,0.15);
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: #36B37E;
}

.nav-icon {
  flex-shrink: 0;
  color: inherit;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .nav-container {
    padding: 0 16px;
  }
  
  .nav-links {
    gap: 0;
  }
  
  .nav-link {
    padding: 12px 12px;
    font-size: 0.8rem;
  }
  
  .nav-icon {
    font-size: 0.9rem;
  }
  
  .brand h1 {
    font-size: 1.1rem;
  }
  
  .subtitle {
    display: none;
  }
}

@media (max-width: 480px) {
  .nav-link span {
    display: none;
  }
  
  .nav-link {
    padding: 12px 10px;
  }
  
  .brand h1 {
    font-size: 1rem;
  }
}
</style>