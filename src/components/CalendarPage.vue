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

<style scoped>
.calendar-page {
  background: #f4f5f7;
  min-height: calc(100vh - 56px);
}

.calendar-content {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.calendar-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.calendar-wrapper {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
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
}

:deep(.fc-event) {
  cursor: pointer;
  padding: 2px 4px;
  font-size: 0.85em;
}

:deep(.fc-toolbar-title) {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #6b7280;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.modal-body {
  padding: 20px;
}

.detail-row {
  margin-bottom: 16px;
}

.detail-row:last-child {
  margin-bottom: 0;
}

.detail-label {
  display: block;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6b7280;
  margin-bottom: 4px;
}

.detail-value {
  font-size: 14px;
  color: #1f2937;
  font-weight: 500;
}

.ticket-badge {
  display: inline-block;
  background: #eff6ff;
  color: #2563eb;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
}

.message-text {
  white-space: pre-wrap;
  background: #f9fafb;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  max-height: 200px;
  overflow-y: auto;
}

/* State Components */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 16px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f3f4f6;
  border-top: 3px solid #F97316;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 24px;
}

.empty-content {
  text-align: center;
  max-width: 400px;
}

.empty-content h3 {
  color: #1f2937;
  margin-bottom: 16px;
  font-size: 20px;
}

.empty-content p {
  color: #6b7280;
  line-height: 1.6;
}

.error-message {
  background: #fee;
  color: #dc2626;
  padding: 16px;
  border-radius: 8px;
  margin: 24px;
  text-align: center;
}
</style>