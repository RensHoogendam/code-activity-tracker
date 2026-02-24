<script setup lang="ts">
import { TrendingUp, GitMerge, Ticket, Folder } from 'lucide-vue-next'
import type { DashboardMetrics } from '../../types/bitbucket'

interface Props {
  metrics: DashboardMetrics
}

defineProps<Props>()
</script>

<template>
  <div class="metrics-grid">
    <div class="metric-card">
      <div class="metric-icon">
        <TrendingUp :size="24" />
      </div>
      <div class="metric-content">
        <div class="metric-value">{{ metrics.totalCommits }}</div>
        <div class="metric-label">Commits</div>
        <div class="metric-change" :class="{ positive: metrics.commitsTrend > 0 }">
          {{ metrics.commitsTrend > 0 ? '+' : '' }}{{ metrics.commitsTrend }}%
        </div>
      </div>
    </div>

    <div class="metric-card">
      <div class="metric-icon">
        <GitMerge :size="24" />
      </div>
      <div class="metric-content">
        <div class="metric-value">{{ metrics.totalPRs }}</div>
        <div class="metric-label">Pull Requests</div>
        <div class="metric-change" :class="{ positive: metrics.prsTrend > 0 }">
          {{ metrics.prsTrend > 0 ? '+' : '' }}{{ metrics.prsTrend }}%
        </div>
      </div>
    </div>

    <div class="metric-card">
      <div class="metric-icon">
        <Ticket :size="24" />
      </div>
      <div class="metric-content">
        <div class="metric-value">{{ metrics.uniqueTickets }}</div>
        <div class="metric-label">Tickets</div>
        <div class="metric-change" :class="{ positive: metrics.ticketsTrend > 0 }">
          {{ metrics.ticketsTrend > 0 ? '+' : '' }}{{ metrics.ticketsTrend }}%
        </div>
      </div>
    </div>

    <div class="metric-card">
      <div class="metric-icon">
        <Folder :size="24" />
      </div>
      <div class="metric-content">
        <div class="metric-value">{{ metrics.activeRepos }}</div>
        <div class="metric-label">Active Repos</div>
        <div class="metric-change" :class="{ positive: metrics.reposTrend > 0 }">
          {{ metrics.reposTrend > 0 ? '+' : '' }}{{ metrics.reposTrend }}%
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.metrics-grid {
  @apply grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-5 mb-6;

  .metric-card {
    @apply bg-surface rounded-app-card p-6 shadow-sm flex items-center gap-4;

    .metric-icon {
      @apply w-12 h-12 bg-orange-50 rounded-app-card flex items-center justify-center text-brand-secondary;
    }

    .metric-value {
      @apply text-[28px] font-bold text-text-main leading-none;
    }

    .metric-label {
      @apply text-sm text-text-muted my-1;
    }

    .metric-change {
      @apply text-xs text-error font-medium;

      &.positive {
        @apply text-success;
      }
    }
  }
}

@media (max-width: 1024px) {
  .metrics-grid {
    @apply grid-cols-2;
  }
}

@media (max-width: 640px) {
  .metrics-grid {
    @apply grid-cols-1;
  }
}
</style>
