<script setup lang="ts">
import { computed, ref } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import PageToolbar from './PageToolbar.vue'
import HoursFilters from './HoursFilters.vue'

import type { CalendarOptions } from '@fullcalendar/core'
import type { ProcessedCommit, AppFilters, RefreshJobStatus } from '../types/bitbucket'

interface Props {
  data: ProcessedCommit[]
  filteredData: ProcessedCommit[]
  filters: AppFilters
  isLoading: boolean
  lastUpdated: Date | null
  error: string | null
  refreshJob?: RefreshJobStatus | null
  showRefreshStatus?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  data: () => [],
  filteredData: () => [],
  filters: () => ({
    repo: '',
    dateRange: 12,
    author: 'Rens Hoogendam',
    type: 'all'
  }),
  isLoading: false,
  lastUpdated: null,
  error: null,
  refreshJob: null,
  showRefreshStatus: false
})

const emit = defineEmits<{
  'filter-change': [filters: Partial<AppFilters>]
  'refresh': []
  'force-refresh': []
  'clear-cache': []
  'hide-refresh-status': []
  'retry-refresh': []
  'cancel-refresh': [jobId: string]
  'check-refresh-status': [jobId: string]
}>()

const calendarOptions = computed((): CalendarOptions => ({
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin],
  initialView: 'dayGridMonth',
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth'
  },
  events: calendarEvents.value,
  eventClick: handleEventClick,
  height: 'auto',
  firstDay: 1, // Start week on Monday
  eventTimeFormat: {
    hour: '2-digit',
    minute: '2-digit',
    meridiem: false,
    hour12: false
  }
}))

const calendarEvents = computed(() => {
  return props.filteredData.map(item => {
    const isPR = !item.commit_hash
    const title = isPR ? `PR: ${item.pr}` : `C: ${item.commit_message.split('\n')[0]}`
    
    return {
      id: item.commit_hash || `pr-${item.pr_id}`,
      title: title,
      start: item.commit_date,
      backgroundColor: isPR ? '#8b5cf6' : '#f97316',
      borderColor: isPR ? '#7c3aed' : '#ea580c',
      extendedProps: {
        repo: item.repo,
        message: item.commit_message,
        author: item.commit_author_raw || item.pr_author_display_name,
        type: isPR ? 'Pull Request' : 'Commit',
        ticket: item.ticket
      }
    }
  })
})

const selectedEvent = ref<any>(null)

function handleEventClick(info: any) {
  selectedEvent.value = info.event
}

function closeEventDetails() {
  selectedEvent.value = null
}

const availableRepos = computed((): string[] => {
  return [...new Set(props.data.map((item: ProcessedCommit) => item.repo))].sort()
})

function onFiltersChange(newFilters: Partial<AppFilters>): void {
  emit('filter-change', newFilters)
}
</script>

<template>
  <div class="calendar-page">
    <PageToolbar 
      title="Calendar"
      subtitle="Visual overview of your activity"
      :last-updated="lastUpdated"
      :filters="filters"
      :is-loading="isLoading"
      @refresh="$emit('refresh')"
      @force-refresh="$emit('force-refresh')"
      @clear-cache="$emit('clear-cache')"
      @filter-change="onFiltersChange"
      :refresh-job="refreshJob"
      :show-refresh-status="showRefreshStatus"
      @hide-refresh-status="$emit('hide-refresh-status')"
      @retry-refresh="$emit('retry-refresh')"
      @cancel-refresh="$emit('cancel-refresh', $event)"
      @check-refresh-status="$emit('check-refresh-status', $event)"
    />

    <div class="calendar-content">
      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <div v-else-if="!isLoading && data.length === 0" class="empty-state">
        <div class="empty-content">
          <h3>No activity data available</h3>
          <p>Load some data using the refresh button above to see your activity calendar.</p>
        </div>
      </div>

      <div v-else-if="isLoading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading calendar...</p>
      </div>

      <div v-else class="calendar-container">
        <HoursFilters 
          :filters="filters"
          :repos="availableRepos"
          @filter-change="onFiltersChange"
        />

        <div class="calendar-wrapper card">
          <FullCalendar :options="calendarOptions" />
        </div>
      </div>
    </div>

    <!-- Event Detail Modal -->
    <div v-if="selectedEvent" class="modal-overlay" @click="closeEventDetails">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ selectedEvent.extendedProps.type }} Details</h3>
          <button class="close-btn" @click="closeEventDetails">&times;</button>
        </div>
        <div class="modal-body">
          <div class="detail-row">
            <span class="detail-label">Repo:</span>
            <span class="detail-value">{{ selectedEvent.extendedProps.repo }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Date:</span>
            <span class="detail-value">{{ new Date(selectedEvent.start).toLocaleString() }}</span>
          </div>
          <div v-if="selectedEvent.extendedProps.ticket" class="detail-row">
            <span class="detail-label">Ticket:</span>
            <span class="detail-value ticket-badge">{{ selectedEvent.extendedProps.ticket }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Message:</span>
            <div class="detail-value message-text">{{ selectedEvent.extendedProps.message || selectedEvent.title }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.calendar-page {
  @apply bg-app-bg min-h-[calc(100vh-var(--spacing-header-height))];

  .calendar-content {
    @apply p-5 max-w-content-width mx-auto;

    .calendar-container {
      @apply flex flex-col gap-5;

      .calendar-wrapper {
        @apply bg-surface p-5 rounded-app-card shadow-sm;
      }
    }
  }
}

/* FullCalendar Customization */
:deep(.fc) {
  --fc-button-bg-color: #F97316;
  --fc-button-border-color: #F97316;
  --fc-button-hover-bg-color: #ea580c;
  --fc-button-hover-border-color: #ea580c;
  --fc-button-active-bg-color: #ea580c;
  --fc-button-active-border-color: #ea580c;
  --fc-event-border-color: transparent;
  --fc-today-bg-color: rgba(249, 115, 22, 0.05);
  font-family: inherit;

  .fc-event {
    @apply cursor-pointer px-1 py-0.5 text-[0.85em];
  }

  .fc-toolbar-title {
    @apply text-xl font-semibold text-text-main;
  }
}

/* Modal Styles */
.modal-overlay {
  @apply fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-5;

  .modal-content {
    @apply bg-surface rounded-app-card w-full max-w-[500px] shadow-2xl overflow-hidden;

    .modal-header {
      @apply px-5 py-4 border-b border-border-light flex justify-between items-center;

      h3 {
        @apply m-0 text-lg font-semibold text-text-main;
      }

      .close-btn {
        @apply bg-transparent border-none text-2xl text-text-muted cursor-pointer p-0 leading-none;
      }
    }

    .modal-body {
      @apply p-5;

      .detail-row {
        @apply mb-4 last:mb-0;

        .detail-label {
          @apply block text-[12px] uppercase tracking-wider text-text-muted mb-1;
        }

        .detail-value {
          @apply text-sm text-text-main font-medium;

          &.ticket-badge {
            @apply inline-block bg-blue-50 text-brand-primary px-2 py-0.5 rounded font-semibold;
          }

          &.message-text {
            @apply whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border border-border-light max-h-[200px] overflow-y-auto;
          }
        }
      }
    }
  }
}

/* State Components */
.loading-state {
  @apply flex flex-col items-center justify-center min-h-[60vh] gap-4;

  .loading-spinner {
    @apply w-8 h-8 border-[3px] border-gray-100 border-t-brand-secondary rounded-full animate-spin;
  }

  p {
    @apply text-text-muted;
  }
}

.empty-state {
  @apply flex items-center justify-center min-h-[60vh] p-6;

  .empty-content {
    @apply text-center max-w-[400px];

    h3 {
      @apply text-text-main mb-4 text-xl;
    }

    p {
      @apply text-text-muted leading-relaxed;
    }
  }
}

.error-message {
  @apply bg-red-50 text-error p-4 rounded-lg m-6 text-center;
}
</style>