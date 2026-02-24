<script setup lang="ts">
// Loading spinner component - no props or logic needed
</script>

<template>
  <div class="loading-spinner">
    <div class="spinner"></div>
    <p class="loading-text">Fetching data from Bitbucket...</p>
  </div>
</template>

<style scoped lang="scss">
.loading-spinner {
  @apply flex flex-col items-center justify-center p-[60px_20px] bg-surface rounded-app-card shadow-sm;

  .spinner {
    @apply w-10 h-10 border-[3px] border-gray-100 border-t-brand-primary rounded-full animate-spin mb-5;
  }

  .loading-text {
    @apply text-text-muted text-base m-0;
  }
}
</style>