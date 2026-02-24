<script setup lang="ts">
import { Save, GitPullRequest } from 'lucide-vue-next'
import type { ProcessedCommit } from '../../types/bitbucket'

interface Props {
  recentActivity: ProcessedCommit[]
}

defineProps<Props>()

function getDisplayTitle(item: ProcessedCommit): string {
  if (item.commit_hash) {
    return item.commit_message?.split('')[0]?.slice(0, 60) + '...' || 'Commit'
  }
  return item.pr?.slice(0, 60) + '...' || 'Pull Request'
}

function formatRelativeTime(dateString: string | undefined): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'Just now'
}
</script>

<template>
  <div class="activity-feed">
    <div class="chart-header">
      <h3>Recent Activity</h3>
      <router-link to="/details" class="view-all-link">View All →</router-link>
    </div>
    <div class="activity-list">
      <div 
        v-for="item in recentActivity.slice(0, 6)" 
        :key="String(item.commit_hash || item.pr_id || Math.random())" 
        class="activity-item"
      >
        <div class="activity-icon">
          <Save v-if="item.commit_hash" :size="16" />
          <GitPullRequest v-else :size="16" />
        </div>
        <div class="activity-content">
          <div class="activity-title">
            {{ getDisplayTitle(item) }}
          </div>
          <div class="activity-meta">
            <span class="repo">{{ item.repo }}</span>
            <span class="date">{{ formatRelativeTime(item.commit_date || item.pr_updated_on || '') }}</span>
            <span v-if="item.ticket" class="ticket">{{ item.ticket }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.activity-feed {
  @apply bg-surface rounded-app-card p-6 shadow-sm;

  .chart-header {
    @apply flex justify-between items-center mb-5;

    h3 {
      @apply text-lg font-semibold text-text-main m-0;
    }

    .view-all-link {
      @apply text-brand-secondary no-underline text-sm font-medium hover:underline;
    }
  }

  .activity-list {
    @apply flex flex-col gap-4;

    .activity-item {
      @apply flex items-start gap-3 p-3 rounded-lg bg-gray-50;

      .activity-icon {
        @apply w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0 text-text-muted;
      }

      .activity-content {
        @apply flex-1 min-w-0;

        .activity-title {
          @apply text-sm font-medium text-text-main mb-1 truncate;
        }

        .activity-meta {
          @apply flex gap-3 text-xs text-text-muted;

          .repo {
            @apply bg-gray-200 px-1.5 py-0.5 rounded;
          }

          .ticket {
            @apply bg-orange-50 text-brand-secondary px-1.5 py-0.5 rounded font-medium;
          }
        }
      }
    }
  }
}
</style>
