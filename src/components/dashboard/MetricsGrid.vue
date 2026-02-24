<script setup lang="ts">
import { TrendingUp, GitMerge, Ticket, Folder, ArrowUpRight, ArrowDownRight } from 'lucide-vue-next'
import SparklineChart from './SparklineChart.vue'
import type { DashboardMetrics } from '../../types/bitbucket'

interface Props {
  metrics: DashboardMetrics
}

defineProps<Props>()
</script>

<template>
  <div class="metrics-grid">
    <!-- Commits Card -->
    <div class="metric-card">
      <SparklineChart :data="metrics.commitsHistory" color="#F97316" />
      <div class="metric-icon">
        <TrendingUp :size="24" />
      </div>
      <div class="metric-content">
        <div class="metric-header">
          <div class="metric-label">Commits</div>
          <div class="metric-change" :class="metrics.commitsTrend >= 0 ? 'positive' : 'negative'">
            <component :is="metrics.commitsTrend >= 0 ? ArrowUpRight : ArrowDownRight" :size="14" />
            {{ Math.abs(metrics.commitsTrend) }}%
          </div>
        </div>
        <div class="metric-value">{{ metrics.totalCommits }}</div>
      </div>
    </div>

    <!-- PRs Card -->
    <div class="metric-card">
      <SparklineChart :data="metrics.prsHistory" color="#8b5cf6" />
      <div class="metric-icon pr-icon">
        <GitMerge :size="24" />
      </div>
      <div class="metric-content">
        <div class="metric-header">
          <div class="metric-label">Pull Requests</div>
          <div class="metric-change" :class="metrics.prsTrend >= 0 ? 'positive' : 'negative'">
            <component :is="metrics.prsTrend >= 0 ? ArrowUpRight : ArrowDownRight" :size="14" />
            {{ Math.abs(metrics.prsTrend) }}%
          </div>
        </div>
        <div class="metric-value">{{ metrics.totalPRs }}</div>
      </div>
    </div>

    <!-- Tickets Card -->
    <div class="metric-card">
      <SparklineChart :data="metrics.ticketsHistory" color="#10b981" />
      <div class="metric-icon ticket-icon">
        <Ticket :size="24" />
      </div>
      <div class="metric-content">
        <div class="metric-header">
          <div class="metric-label">Unique Tickets</div>
          <div class="metric-change" :class="metrics.ticketsTrend >= 0 ? 'positive' : 'negative'">
            <component :is="metrics.ticketsTrend >= 0 ? ArrowUpRight : ArrowDownRight" :size="14" />
            {{ Math.abs(metrics.ticketsTrend) }}%
          </div>
        </div>
        <div class="metric-value">{{ metrics.uniqueTickets }}</div>
      </div>
    </div>

    <!-- Repos Card -->
    <div class="metric-card">
      <SparklineChart :data="metrics.reposHistory" color="#3b82f6" />
      <div class="metric-icon repo-icon">
        <Folder :size="24" />
      </div>
      <div class="metric-content">
        <div class="metric-header">
          <div class="metric-label">Active Repos</div>
          <div class="metric-change" :class="metrics.reposTrend >= 0 ? 'positive' : 'negative'">
            <component :is="metrics.reposTrend >= 0 ? ArrowUpRight : ArrowDownRight" :size="14" />
            {{ Math.abs(metrics.reposTrend) }}%
          </div>
        </div>
        <div class="metric-value">{{ metrics.activeRepos }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.metrics-grid {
  @apply grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-5 mb-6;

  .metric-card {
    @apply bg-surface rounded-app-card p-6 shadow-sm flex items-center gap-4 relative overflow-hidden;

    .metric-icon {
      @apply w-12 h-12 bg-orange-50 rounded-app-card flex items-center justify-center text-brand-secondary shrink-0 z-10 relative;
      
      &.pr-icon { @apply bg-purple-50 text-brand-purple; }
      &.ticket-icon { @apply bg-green-50 text-success; }
      &.repo-icon { @apply bg-blue-50 text-brand-blue; }
    }

    .metric-content {
      @apply flex-1 z-10 relative;

      .metric-header {
        @apply flex justify-between items-start mb-1;

        .metric-label {
          @apply text-sm text-text-muted font-medium;
        }

        .metric-change {
          @apply flex items-center gap-0.5 text-xs font-bold py-0.5 px-1.5 rounded-full;

          &.positive { @apply bg-green-50 text-success; }
          &.negative { @apply bg-red-50 text-error; }
        }
      }

      .metric-value {
        @apply text-3xl font-bold text-text-main leading-none;
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
