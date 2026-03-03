<script setup lang="ts">
import { Save, GitPullRequest, Copy } from 'lucide-vue-next'
import { useToast } from '../../stores/toastStore'
import { 
  getDisplayTitle, 
  getCopyableText, 
  copyToClipboard,
  formatRelativeTime,
  extractIssueId
} from '../../services/activityUtils'
import type { ProcessedCommit } from '../../types/bitbucket'

interface Props {
  recentActivity: ProcessedCommit[]
}

defineProps<Props>()

const toast = useToast()

function copyForTimeWriting(item: ProcessedCommit): void {
  const text = getCopyableText(item)
  copyToClipboard(text).then(success => {
    if (success) {
      toast.success('Copied for time writing')
    } else {
      toast.error('Failed to copy')
    }
  })
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
        class="activity-item group"
      >
        <div class="activity-icon">
          <Save v-if="item.commit_hash" :size="16" />
          <GitPullRequest v-else :size="16" />
        </div>
        <div class="activity-content">
          <div class="activity-header">
            <div class="activity-title" :title="getDisplayTitle(item)">
              {{ getDisplayTitle(item) }}
            </div>
            <button 
              class="copy-action opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              @click="copyForTimeWriting(item)"
              title="Copy for time writing"
            >
              <Copy :size="14" />
            </button>
          </div>
          <div class="activity-meta">
            <span class="repo">{{ item.repo.split('/').pop() }}</span>
            <span class="date">{{ formatRelativeTime(item.commit_date || item.pr_updated_on || '') }}</span>
            <span v-if="extractIssueId(item)" class="ticket">{{ extractIssueId(item) }}</span>
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
      @apply flex items-start gap-3 p-3 rounded-lg bg-gray-50 transition-colors duration-200;

      &:hover {
        @apply bg-gray-100;
      }

      .activity-icon {
        @apply w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0 text-text-muted;
      }

      .activity-content {
        @apply flex-1 min-w-0;

        .activity-header {
          @apply flex justify-between items-center mb-1;

          .activity-title {
            @apply text-sm font-medium text-text-main truncate pr-2;
          }

          .copy-action {
            @apply p-1 text-text-muted hover:text-brand-secondary bg-transparent border-none cursor-pointer rounded flex items-center justify-center;
          }
        }

        .activity-meta {
          @apply flex gap-3 text-xs text-text-muted items-center;

          .repo {
            @apply bg-gray-200 px-1.5 py-0.5 rounded text-[10px] font-medium;
          }

          .ticket {
            @apply bg-orange-50 text-brand-secondary px-1.5 py-0.5 rounded font-bold;
          }
        }
      }
    }
  }
}
</style>
