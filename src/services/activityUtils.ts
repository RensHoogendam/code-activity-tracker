import type { ProcessedCommit } from '../types/bitbucket'

/**
 * Extracts the issue ID (e.g., ASUITE-1234) from an activity item.
 * Prioritizes the backend-provided ticket field, then branch name, then message/title.
 */
export function extractIssueId(item: ProcessedCommit): string | null {
  // Use the ticket field from backend if available
  if (item.ticket) {
    return item.ticket
  }
  
  // Try to extract from branch if available (newly added by backend)
  if (item.branch) {
    const match = item.branch.match(/([A-Z]{2,10}-\d+)/)
    if (match) return match[1]
  }
  
  // Extract from message or title
  const title = item.commit_message || item.pr || ''
  const match = title.match(/([A-Z]{2,10}-\d+|ASM-\d+)/)
  return match ? match[1] : null
}

/**
 * Gets a clean display title for the activity item.
 */
export function getDisplayTitle(item: ProcessedCommit): string {
  if (item.commit_hash) {
    // For commits, take the first line of the message
    return item.commit_message?.split('\n')[0] || 'Commit'
  } else {
    // For PRs, take the PR title
    return item.pr || 'Pull Request'
  }
}

/**
 * Generates the text to be copied for time writing (Ticket + Description).
 */
export function getCopyableText(item: ProcessedCommit): string {
  const ticket = extractIssueId(item)
  const description = getDisplayTitle(item)
  
  if (!ticket) return description || ''
  if (!description) return ticket
  
  // If description already starts with the ticket (case insensitive), just return description
  if (description.toLowerCase().includes(ticket.toLowerCase())) {
    return description
  }
  
  return `${ticket} ${description}`
}

/**
 * Formats a relative time string (e.g., "2h ago").
 */
export function formatRelativeTime(dateString: string | undefined): string {
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

/**
 * Helper to copy text to clipboard and handle errors.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false
  
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    console.error('Failed to copy to clipboard:', err)
    return false
  }
}
