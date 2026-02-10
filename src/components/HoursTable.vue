<script setup lang="ts">
import { ref, computed, type Ref } from 'vue'

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

function getDisplayTitle(item: ProcessedCommit): string {
  console.log('Getting display title for item:', item)
  
  if (item.commit_hash) {
    return item.commit_message?.split('\n')[0] || 'Commit'
  } else {
    return item.pr || 'Pull Request'
  }
}

function extractIssueId(item: ProcessedCommit): string | null {
  // Use the ticket field from backend if available
  if (item.ticket) {
    return item.ticket
  }
  
  // Extract from message or title
  const text = getDisplayTitle(item)
  const match = text?.match(/(ASUITE-\d+|ASM-\d+)/)
  return match ? match[1] : null
}

function getIssueUrl(issueId: string): string {
  return `https://atabix.atlassian.net/browse/${issueId}`
}

async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    // Could add a toast notification here
  } catch (err) {
    console.error('Failed to copy to clipboard:', err)
  }
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
                  v-if="extractIssueId(item)"
                  class="copy-btn"
                  @click="copyToClipboard(extractIssueId(item)!)"
                  :title="`Copy ${extractIssueId(item)} to clipboard`"
                >
                  {{ extractIssueId(item) }}
                </button>
                <a 
                  v-if="extractIssueId(item)"
                  :href="getIssueUrl(extractIssueId(item)!)"
                  target="_blank"
                  class="issue-link"
                  :title="`Open ${extractIssueId(item)} in Jira`"
                >
                  ↗
                </a>
                <span v-if="item.ticket_source" class="ticket-source" :title="`Ticket found in ${item.ticket_source}`">
                  ({{ item.ticket_source }})
                </span>
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

<style scoped>
.hours-table-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.08);
  overflow: hidden;
}

.search-bar {
  padding: 20px 25px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.search-input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
}

.results-count {
  color: #64748b;
  font-size: 0.9rem;
  white-space: nowrap;
}

.table-wrapper {
  overflow-x: auto;
}

.hours-table {
  width: 100%;
  border-collapse: collapse;
}

.hours-table th {
  background: #f8fafc;
  padding: 15px 20px;
  text-align: left;
  font-weight: 600;
  color: #475569;
  border-bottom: 2px solid #e2e8f0;
  white-space: nowrap;
}

.sortable {
  cursor: pointer;
  user-select: none;
  position: relative;
}

.sortable:hover {
  background: #f1f5f9;
}

.sort-indicator {
  margin-left: 8px;
  opacity: 0.3;
  transition: all 0.3s ease;
}

.sort-indicator.active {
  opacity: 1;
  color: #667eea;
}

.sort-indicator.desc {
  transform: rotate(0deg);
}

.sort-indicator:not(.desc) {
  transform: rotate(180deg);
}

.hours-table td {
  padding: 15px 20px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: top;
}

.commit-row {
  border-left: 4px solid #16a34a;
}

.pr-row {
  border-left: 4px solid #8b5cf6;
}

.commit-row:hover,
.pr-row:hover {
  background: #fafbfc;
}

.type-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.type-commit {
  background: #dcfce7;
  color: #166534;
}

.type-pr {
  background: #ede9fe;
  color: #7c3aed;
}

.repo-cell {
  font-weight: 500;
  color: #475569;
}

.date-cell {
  color: #64748b;
  font-size: 0.9rem;
}

.title-cell {
  max-width: 400px;
}

.title-content {
  line-height: 1.4;
  word-break: break-word;
}

.issue-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.copy-btn {
  background: #667eea;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.copy-btn:hover {
  background: #5a67d8;
  transform: translateY(-1px);
}

.copy-btn:active {
  transform: translateY(0);
}

.issue-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: #f1f5f9;
  color: #64748b;
  text-decoration: none;
  border-radius: 4px;
  font-size: 0.8rem;
  transition: all 0.3s ease;
}

.issue-link:hover {
  background: #e2e8f0;
  color: #475569;
}

.ticket-source {
  font-size: 0.7rem;
  color: #6b7280;
  font-style: italic;
  margin-left: 4px;
}

/* Branch Column Styling */
.branch-cell {
  text-align: center;
  width: 100px;
}

.branch-badge {
  background: #fef3e2;
  color: #f97316;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  border: 1px solid #fed7aa;
}

.no-branch {
  color: #9ca3af;
  font-style: italic;
}

.no-data {
  text-align: center;
  color: #94a3b8;
  font-style: italic;
  padding: 40px 20px;
}

@media (max-width: 768px) {
  .search-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 15px;
  }
  
  .hours-table th,
  .hours-table td {
    padding: 10px 15px;
  }
  
  .title-cell {
    max-width: 250px;
  }
}
</style>