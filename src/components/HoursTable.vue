<script setup lang="ts">
import { ref, computed, type Ref } from 'vue'
import { Copy, ExternalLink } from 'lucide-vue-next'
import { useToast } from '../stores/toastStore'
import { 
  extractIssueId, 
  getDisplayTitle, 
  getCopyableText, 
  copyToClipboard 
} from '../services/activityUtils'

import type { ProcessedCommit } from '../types/bitbucket'

// Props with proper typing
interface Props {
  data: ProcessedCommit[]
  isLoading: boolean
}

const props = withDefaults(defineProps<Props>(), {
  data: () => [],
  isLoading: false
})

const toast = useToast()

// Reactive state with proper typing
const sortField: Ref<string> = ref('date')
const sortDirection: Ref<'asc' | 'desc'> = ref('desc')
const searchQuery: Ref<string> = ref('')

// Computed properties with explicit return types
const filteredAndSortedData = computed((): ProcessedCommit[] => {
  if (!props.data) return []
  
  let filtered = props.data
  
  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter((item: ProcessedCommit) => 
      item.repo?.toLowerCase().includes(query) ||
      item.commit_message?.toLowerCase().includes(query) ||
      item.pr?.toLowerCase().includes(query)
    )
  }
  
  // Sort
  filtered.sort((a: ProcessedCommit, b: ProcessedCommit) => {
    let aValue: any, bValue: any
    
    switch (sortField.value) {
      case 'date':
        aValue = new Date(a.commit_date || a.pr_updated_on || '1970-01-01')
        bValue = new Date(b.commit_date || b.pr_updated_on || '1970-01-01')
        break
      case 'repo':
        aValue = a.repo || ''
        bValue = b.repo || ''
        break
      case 'type':
        aValue = a.commit_hash ? 'commit' : 'pullrequest'
        bValue = b.commit_hash ? 'commit' : 'pullrequest'
        break
      default:
        return 0
    }
    
    if (aValue < bValue) return sortDirection.value === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection.value === 'asc' ? 1 : -1
    return 0
  })
  
  return filtered
})

// Functions with proper typing
function sort(field: string): void {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDirection.value = 'desc'
  }
}

function formatDate(dateString: string | undefined): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

function getItemType(item: ProcessedCommit): 'commit' | 'pr' {
  return item.commit_hash ? 'commit' : 'pr'
}

function handleCopyToClipboard(text: string, label: string): void {
  copyToClipboard(text).then(success => {
    if (success) {
      toast.success(`Copied ${label} to clipboard`)
    } else {
      toast.error('Failed to copy to clipboard')
    }
  })
}

function copyForTimeWriting(item: ProcessedCommit): void {
  const text = getCopyableText(item)
  handleCopyToClipboard(text, 'time writing text')
}

function getIssueUrl(issueId: string): string {
  return `https://atabix.atlassian.net/browse/${issueId}`
}

function getRepoDisplayName(repo: string | undefined): string {
  return repo?.replace('atabix/', '').replace('atabase-', '') || ''
}
</script>

<template>
  <div class="hours-table-container">
    <!-- Search Bar -->
    <div class="search-bar">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search repositories, pull requests, or commits..."
        class="search-input"
      >
      <div class="results-count">
        {{ filteredAndSortedData.length }} {{ filteredAndSortedData.length === 1 ? 'item' : 'items' }}
      </div>
    </div>
    
    <!-- Table -->
    <div class="table-wrapper">
      <table class="hours-table">
        <thead>
          <tr>
            <th @click="sort('type')" class="sortable">
              Type
              <span class="sort-indicator" :class="{
                active: sortField === 'type',
                desc: sortDirection === 'desc'
              }">↓</span>
            </th>
            <th @click="sort('repo')" class="sortable">
              Repository
              <span class="sort-indicator" :class="{
                active: sortField === 'repo',
                desc: sortDirection === 'desc'
              }">↓</span>
            </th>
            <th @click="sort('date')" class="sortable">
              Date
              <span class="sort-indicator" :class="{
                active: sortField === 'date',
                desc: sortDirection === 'desc'
              }">↓</span>
            </th>
            <th>Title/Message</th>
            <th>Branch</th>
            <th>Issue</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="(item, index) in filteredAndSortedData" 
            :key="index"
            :class="{
              'commit-row': getItemType(item) === 'commit',
              'pr-row': getItemType(item) === 'pr'
            }"
          >
            <td class="type-cell">
              <span :class="`type-badge type-${getItemType(item)}`">
                {{ getItemType(item) === 'commit' ? 'Commit' : 'PR' }}
              </span>
            </td>
            
            <td class="repo-cell">
              {{ getRepoDisplayName(item.repo) }}
            </td>
            
            <td class="date-cell">
              {{ formatDate(item.commit_date || item.pr_updated_on || '') }}
            </td>
            
            <td class="title-cell">
              <div class="title-content">
                {{ getDisplayTitle(item) }}
              </div>
            </td>
            
            <td class="branch-cell">
              <span v-if="item.branch" class="branch-badge">
                {{ item.branch }}
              </span>
              <span v-else class="no-branch">—</span>
            </td>
            
            <td class="issue-cell">
              <div v-if="extractIssueId(item)" class="issue-actions">
                <button 
                  class="copy-btn ticket-id"
                  @click="handleCopyToClipboard(extractIssueId(item)!, extractIssueId(item)!)"
                  :title="`Copy ${extractIssueId(item)}`"
                >
                  {{ extractIssueId(item) }}
                </button>
                
                <button 
                  class="copy-full-btn"
                  @click="copyForTimeWriting(item)"
                  title="Copy for time writing (ID + Description)"
                >
                  <Copy :size="14" />
                </button>

                <a 
                  :href="getIssueUrl(extractIssueId(item)!)"
                  target="_blank"
                  class="issue-link"
                  :title="`Open ${extractIssueId(item)} in Jira`"
                >
                  <ExternalLink :size="14" />
                </a>
              </div>
              <div v-if="item.ticket_source" class="ticket-source" :title="`Ticket found in ${item.ticket_source}`">
                via {{ item.ticket_source }}
              </div>
            </td>
          </tr>
          
          <tr v-if="filteredAndSortedData.length === 0 && !isLoading">
            <td colspan="6" class="no-data">
              No data found{{ searchQuery ? ' matching your search' : '' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped lang="scss">
.hours-table-container {
  @apply bg-surface rounded-app-card shadow-sm overflow-hidden;

  .search-bar {
    @apply p-6 border-b border-gray-100 flex justify-between items-center gap-5;

    .search-input {
      @apply flex-1 px-4 py-3 border-2 border-gray-100 rounded-lg text-base transition-colors duration-300;

      &:focus {
        @apply outline-none border-brand-primary;
      }
    }

    .results-count {
      @apply text-text-muted text-sm whitespace-nowrap;
    }
  }

  .table-wrapper {
    @apply overflow-x-auto;

    .hours-table {
      @apply w-full border-collapse;

      th {
        @apply bg-gray-50 px-5 py-4 text-left font-semibold text-text-muted border-b-2 border-gray-100 whitespace-nowrap;

        &.sortable {
          @apply cursor-pointer select-none relative hover:bg-gray-100;
        }

        .sort-indicator {
          @apply ml-2 opacity-30 transition-all duration-300;

          &.active {
            @apply opacity-100 text-brand-primary;
          }

          &:not(.desc) {
            @apply rotate-180 inline-block;
          }
        }
      }

      td {
        @apply px-5 py-4 border-b border-gray-50;
      }

      tr {
        &:hover {
          @apply bg-gray-50/50;
        }

        &.commit-row {
          @apply border-l-4 border-brand-secondary;
        }

        &.pr-row {
          @apply border-l-4 border-brand-purple;
        }
      }

      .type-badge {
        @apply inline-block px-2 py-1 rounded text-[0.75rem] font-bold uppercase;

        &.type-commit {
          @apply bg-orange-50 text-brand-secondary;
        }

        &.type-pr {
          @apply bg-purple-50 text-brand-purple;
        }
      }

      .repo-cell {
        @apply font-medium text-text-main;
      }

      .date-cell {
        @apply text-text-muted text-sm;
      }

      .title-cell {
        @apply max-w-100;

        .title-content {
          @apply leading-relaxed wrap-break-word text-sm;
        }
      }

      .branch-badge {
        @apply bg-orange-50 text-brand-secondary px-2 py-1 rounded text-[0.7rem] font-medium border border-orange-100;
      }

      .no-branch {
        @apply text-gray-400 italic text-xs;
      }

      .issue-actions {
        @apply flex gap-1.5 items-center;

        .copy-btn {
          @apply bg-brand-primary text-white border-none px-2 py-1 rounded text-[0.75rem] font-semibold cursor-pointer transition-all duration-200 active:scale-95;
          
          &.ticket-id {
            @apply min-w-[85px];
          }
        }

        .copy-full-btn {
          @apply flex items-center justify-center w-7 h-7 bg-brand-secondary text-white border-none rounded cursor-pointer transition-all duration-200 active:scale-95;
        }

        .issue-link {
          @apply inline-flex items-center justify-center w-7 h-7 bg-gray-100 text-text-muted no-underline rounded transition-colors duration-200 hover:bg-gray-200 hover:text-text-main;
        }
      }
      
      .ticket-source {
        @apply text-[0.65rem] text-text-muted italic mt-1 ml-0.5;
      }

      .no-data {
        @apply text-center text-gray-400 italic py-10 px-5;
      }
    }
  }
}

@media (max-width: 768px) {
  .hours-table-container {
    .search-bar {
      @apply flex-col items-stretch gap-4;
    }
    
    .hours-table {
      th, td {
        @apply px-4 py-3;
      }
      
      .title-cell {
        @apply max-w-62.5;
      }
    }
  }
}
</style>