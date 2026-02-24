<script setup lang="ts">
import type { RepoActivity } from '../../types/bitbucket'

interface Props {
  topRepos: RepoActivity[]
}

defineProps<Props>()
</script>

<template>
  <div class="top-repos">
    <div class="chart-header">
      <h3>Most Active Repos</h3>
      <div class="chart-period">This period</div>
    </div>
    <div class="repo-list">
      <div 
        v-for="repo in topRepos" 
        :key="repo.name" 
        class="repo-item"
      >
        <div class="repo-info">
          <div class="repo-name">{{ repo.name }}</div>
          <div class="repo-count">{{ repo.commits }} commits</div>
        </div>
        <div class="repo-bar">
          <div 
            class="repo-bar-fill" 
            :style="{ width: `${(repo.commits / topRepos[0].commits) * 100}%` }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.top-repos {
  @apply bg-surface rounded-app-card p-6 shadow-sm;

  .chart-header {
    @apply flex justify-between items-center mb-5;

    h3 {
      @apply text-lg font-semibold text-text-main m-0;
    }

    .chart-period {
      @apply text-sm text-text-muted;
    }
  }

  .repo-list {
    @apply flex flex-col gap-4;

    .repo-item {
      @apply flex items-center gap-3;

      .repo-info {
        @apply flex-1;

        .repo-name {
          @apply text-sm font-medium text-text-main;
        }

        .repo-count {
          @apply text-xs text-text-muted;
        }
      }

      .repo-bar {
        @apply flex-[2] h-1.5 bg-gray-100 rounded-[3px] overflow-hidden;

        &-fill {
          @apply h-full bg-brand-secondary rounded-[3px] transition-[width] duration-300 ease-in-out;
        }
      }
    }
  }
}
</style>
