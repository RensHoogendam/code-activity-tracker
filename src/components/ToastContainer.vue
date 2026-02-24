<script setup lang="ts">
import { useToast } from '../stores/toastStore'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-vue-next'

const { toasts, removeToast } = useToast()

const getIcon = (type: string) => {
  switch (type) {
    case 'success': return CheckCircle
    case 'error': return AlertCircle
    case 'warning': return AlertTriangle
    default: return Info
  }
}
</script>

<template>
  <div class="toast-container">
    <TransitionGroup name="toast">
      <div 
        v-for="toast in toasts" 
        :key="toast.id" 
        :class="['toast-item', `type-${toast.type}`]"
      >
        <div class="toast-icon">
          <component :is="getIcon(toast.type)" :size="20" />
        </div>
        <div class="toast-content">
          {{ toast.message }}
        </div>
        <button class="toast-close" @click="removeToast(toast.id)">
          <X :size="16" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped lang="scss">
.toast-container {
  @apply fixed bottom-6 right-6 z-[2000] flex flex-col gap-3 pointer-events-none;
  max-width: calc(100vw - 48px);
}

.toast-item {
  @apply pointer-events-auto flex items-start gap-3 p-4 bg-surface rounded-app-card shadow-2xl border-l-4 min-w-[300px] max-w-[450px];

  &.type-success {
    @apply border-l-success;
    .toast-icon { @apply text-success; }
  }

  &.type-error {
    @apply border-l-error;
    .toast-icon { @apply text-error; }
  }

  &.type-warning {
    @apply border-l-warning;
    .toast-icon { @apply text-warning; }
  }

  &.type-info {
    @apply border-l-brand-primary;
    .toast-icon { @apply text-brand-primary; }
  }

  .toast-icon {
    @apply shrink-0 mt-0.5;
  }

  .toast-content {
    @apply flex-1 text-sm font-medium text-text-main leading-tight;
  }

  .toast-close {
    @apply shrink-0 text-text-muted hover:text-text-main transition-colors p-0.5 rounded hover:bg-gray-100;
  }
}

/* Transitions */
.toast-enter-active,
.toast-leave-active {
  @apply transition-all duration-300 ease-out;
}

.toast-enter-from {
  @apply opacity-0 translate-x-10 scale-95;
}

.toast-leave-to {
  @apply opacity-0 translate-y-2 scale-95;
}

@media (max-width: 640px) {
  .toast-container {
    @apply bottom-4 right-4 left-4;
  }
  
  .toast-item {
    @apply min-w-0 w-full;
  }
}
</style>
