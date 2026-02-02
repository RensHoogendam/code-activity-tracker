// Bitbucket API Service with API Token Authentication
// Updated for Bitbucket's new API token system (replaced app passwords)

import type {
  BitbucketRepository,
  BitbucketApiResponse,
  BitbucketPullRequest,
  BitbucketCommit,
  CompactPullRequest,
  CompactCommit,
  ProcessedPullRequest,
  ProcessedCommit,
  BitbucketServiceConfig,
  ServiceCache,
  FetchPullRequestsParams,
  FetchCommitsParams
} from '../types/bitbucket'

class BitbucketService {
  private config: BitbucketServiceConfig
  private cache: ServiceCache

  constructor() {
    this.config = {
      apiToken: import.meta.env.VITE_BITBUCKET_API_TOKEN || '',
      apiUsername: import.meta.env.VITE_BITBUCKET_USERNAME || 'RensHoogendam',
      prAuthorDisplayName: import.meta.env.VITE_BITBUCKET_PR_AUTHOR_DISPLAY_NAME || 'Rens Hoogendam',
      commitAuthorRaw: import.meta.env.VITE_BITBUCKET_COMMIT_AUTHOR_RAW || 'RensHoogendam <r.hoogendam@atabix.nl>',
      repos: [], // Will be populated dynamically
      baseUrl: 'https://api.bitbucket.org/2.0/repositories' // Will be updated for multiple workspaces
    }
    
    // Get workspaces from env
    const workspaces = import.meta.env.VITE_BITBUCKET_WORKSPACES?.split(',') || ['atabix']
    this.config.workspaces = workspaces.map(ws => ws.trim())
    
    // Initialize cache
    this.cache = {
      data: new Map(),
      repositories: null,
      repositoriesTimestamp: null
    }
  }

  // Base64 encoding for Basic authentication fallback
  private getStringToBase64(text: string): string {
    const binString = Array.from(new TextEncoder().encode(text), (byte) => 
      String.fromCodePoint(byte)
    ).join('')
    return btoa(binString)
  }

  // Get fetch options with Basic Auth using App Password
  private getFetchOptions(): RequestInit {
    if (!this.config.apiToken || !this.config.apiUsername) {
      console.warn('⚠️ Missing credentials: Check VITE_BITBUCKET_USERNAME and VITE_BITBUCKET_APP_PASSWORD')
    }
    
    return {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${this.getStringToBase64(`${this.config.apiUsername}:${this.config.apiToken}`)}`,
        'Accept': 'application/json',
        'User-Agent': 'Hours-Vue-App/1.0'
      }
    }
  }

  // Get fetch options - Use Basic auth with email:token (as per Atlassian docs)
  private async getFetchOptions(): Promise<RequestInit> {
    if (!this.config.apiToken || !this.config.apiUsername) {
      throw new Error('Missing credentials: Please set VITE_BITBUCKET_USERNAME (email) and VITE_BITBUCKET_API_TOKEN')
    }
    
    return {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${this.getStringToBase64(`${this.config.apiUsername}:${this.config.apiToken}`)}`,
        'Accept': 'application/json',
        'User-Agent': 'Hours-Vue-App/1.0'
      }
    }
  }

  // Fallback to Bearer token if Basic auth fails (for testing)
  private async getFetchOptionsBasic(): Promise<RequestInit> {
    if (!this.config.apiToken) {
      throw new Error('Missing API token: Please set VITE_BITBUCKET_API_TOKEN')
    }
    
    return {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.config.apiToken}`,
        'Accept': 'application/json',
        'User-Agent': 'Hours-Vue-App/1.0'
      }
    }
  }

  // Generic fetch wrapper with comprehensive error handling
  private async getFetch<T = any>(url: string): Promise<T | undefined> {
    console.log('🌐 fetch():', url)
    
    try {
      // Use Basic auth with email:token (works with API tokens)
      const options = await this.getFetchOptions()
      const response = await fetch(url, options)
      
      if (response.ok) {
        try {
          return await response.json()
        } catch (error) {
          console.error('JSON parsing error:', { error, url, options })
          return undefined
        }
      }
      
      // Enhanced error handling with specific messages
      if (response.status === 401) {
        console.error('🔐 Authentication failed (401):', {
          message: 'Invalid or expired Bitbucket credentials',
          suggestion: 'Ensure you use your EMAIL address (not username) with API token. Create new token at https://bitbucket.org/account/settings/app-passwords/',
          url: url,
          usernameHint: 'Username should be your Atlassian email address',
          tokenPreview: this.config.apiToken ? `${this.config.apiToken.substring(0, 10)}...` : 'missing'
        })
      } else if (response.status === 403) {
        console.error('🚫 Access forbidden (403):', {
          message: 'Token lacks required permissions',
          suggestion: 'Ensure your token has "Repositories: Read" and "Pull requests: Read" permissions',
          url: url
        })
      } else if (response.status === 404) {
        console.error('❓ Resource not found (404):', {
          message: 'Repository or endpoint not found',
          url: url
        })
      } else {
        console.error('HTTP error:', {
          status: response.status,
          statusText: response.statusText,
          url: url
        })
      }
    } catch (error) {
      // Check if it's a credentials error
      if (error instanceof Error && error.message.includes('API token')) {
        console.error('🔐 Missing API token:', {
          message: error.message,
          suggestion: 'Please set VITE_BITBUCKET_API_TOKEN in your .env file'
        })
      } else {
        console.error('Fetch error:', { error, url })
      }
    }
    
    return undefined
  }

  // Date utilities
  private getDateNowMinusDays(days: number): number {
    return Date.now() - (days * 1_000 * 60 * 60 * 24)
  }

  private getUnixDateToFilter(unixDate: number): string {
    const date = new Date(unixDate)
    return `${date.getFullYear()}-${`${date.getUTCMonth() + 1}`.padStart(2, '0')}-${`${date.getUTCDate()}`.padStart(2, '0')}`
  }

  private getUpdateOnFilter(maxDays: number): string {
    return this.getUnixDateToFilter(this.getDateNowMinusDays(maxDays))
  }

  // Cache utility methods
  private getCacheKey(maxDays: number, selectedRepos: string[] | null): string {
    const repos = selectedRepos || this.config.repos
    return `${repos.sort().join(',')}:${maxDays}:${this.config.prAuthorDisplayName}`
  }

  private isCacheValid(timestamp: number, maxAgeMinutes: number = 60): boolean {
    const now = Date.now()
    const maxAge = maxAgeMinutes * 60 * 1000 // Convert to milliseconds
    return now - timestamp < maxAge
  }

  private getCachedData(maxDays: number, selectedRepos: string[] | null): ProcessedCommit[] | null {
    const key = this.getCacheKey(maxDays, selectedRepos)
    const cached = this.cache.data.get(key)
    
    if (!cached) return null
    
    // Different cache duration based on data recency
    const maxAgeMinutes = maxDays <= 1 ? 30 : maxDays <= 7 ? 120 : 360 // 30min, 2h, or 6h
    
    if (this.isCacheValid(cached.timestamp, maxAgeMinutes)) {
      console.log(`Cache hit for ${key} (${maxAgeMinutes}min TTL)`)
      return cached.data
    }
    
    // Cache expired, remove it
    this.cache.data.delete(key)
    return null
  }

  private setCachedData(maxDays: number, selectedRepos: string[] | null, data: ProcessedCommit[]): void {
    const key = this.getCacheKey(maxDays, selectedRepos)
    this.cache.data.set(key, {
      data,
      timestamp: Date.now()
    })
    console.log(`Cached data for ${key}`)
  }

  clearCache(pattern: string | null = null): void {
    if (pattern) {
      // Clear specific cache entries matching pattern
      for (const [key] of this.cache.data) {
        if (key.includes(pattern)) {
          this.cache.data.delete(key)
        }
      }
    } else {
      // Clear all cache
      this.cache.data.clear()
      this.cache.repositories = null
      this.cache.repositoriesTimestamp = null
    }
    console.log('Cache cleared' + (pattern ? ` (pattern: ${pattern})` : ''))
  }

  // Extract ticket/issue references from text
  private extractTicketReferences(text: string): string[] {
    if (!text) return []
    
    // Common patterns for tickets/issues
    const patterns = [
      /\b([A-Z]{2,10}-\d+)\b/g,           // JIRA style: ABC-123
      /\b(#\d+)\b/g,                     // GitHub/GitLab style: #123
      /\b([A-Z]+\d+)\b/g,                // Simple: ABC123
      /\bticket[\s#]*([A-Z0-9-]+)\b/gi,  // "ticket ABC-123"
      /\bissue[\s#]*([A-Z0-9-]+)\b/gi,   // "issue #123"
      /\btask[\s#]*([A-Z0-9-]+)\b/gi,    // "task ABC-123"
    ]
    
    const tickets: string[] = []
    patterns.forEach(pattern => {
      const matches = text.matchAll(pattern)
      for (const match of matches) {
        const ticket = match[1]
        if (ticket && !tickets.includes(ticket)) {
          tickets.push(ticket)
        }
      }
    })
    
    return tickets
  }

  // Get the primary ticket reference (first/most relevant one)
  private getPrimaryTicket(text: string): string | null {
    const tickets = this.extractTicketReferences(text)
    if (tickets.length === 0) return null
    
    // Prefer JIRA-style tickets (ABC-123) over others
    const jiraTicket = tickets.find(ticket => /^[A-Z]{2,10}-\d+$/.test(ticket))
    if (jiraTicket) return jiraTicket
    
    // Return first ticket found
    return tickets[0]
  }

  // Fetch all repositories from multiple workspaces
  async fetchAllRepositories(): Promise<BitbucketRepository[]> {
    // Check cache first (cache repos for 1 hour)
    if (this.cache.repositories && this.cache.repositoriesTimestamp && this.isCacheValid(this.cache.repositoriesTimestamp, 60)) {
      console.log('Using cached repositories')
      return this.cache.repositories
    }
    
    const allRepositories: BitbucketRepository[] = []
    
    // Fetch from all configured workspaces
    for (const workspace of this.config.workspaces || ['atabix']) {
      console.log(`🔍 Fetching repositories for workspace: ${workspace}`)
      
      const url = `https://api.bitbucket.org/2.0/repositories/${workspace}?fields=next,values.name,values.updated_on,values.language&sort=-updated_on`
      
      try {
        let response = await this.getFetch(url)
        
        if (!response) {
          console.warn(`Failed to fetch repositories for workspace: ${workspace}`)
          continue
        }
        
        const workspaceRepos = response.values || []
        
        // Add workspace info to each repo
        const reposWithWorkspace = workspaceRepos.map(repo => ({
          ...repo,
          workspace: workspace
        }))
        
        allRepositories.push(...reposWithWorkspace)
        
        // Get additional pages if needed (limit to 3 pages per workspace)
        let pageCount = 1
        while (response.next && pageCount < 3) {
          response = await this.getFetch(response.next)
          if (response?.values) {
            const moreRepos = response.values.map(repo => ({
              ...repo,
              workspace: workspace
            }))
            allRepositories.push(...moreRepos)
          }
          pageCount++
        }
        
      } catch (error) {
        console.error(`Error fetching repositories for workspace ${workspace}:`, error)
        // Continue with other workspaces
      }
    }
    
    // Sort all repositories by name
    const result = allRepositories.sort((a, b) => a.name.localeCompare(b.name))
    
    // Cache the results
    this.cache.repositories = result
    this.cache.repositoriesTimestamp = Date.now()
    console.log(`✅ Cached ${result.length} repositories from ${this.config.workspaces?.length || 1} workspace(s)`)
    
    return result
  }

  // Initialize repositories (call this before using other methods)
  async initializeRepositories(selectedRepos: string[] | null = null): Promise<BitbucketRepository[]> {
    const allRepos = await this.fetchAllRepositories()
    
    if (selectedRepos && selectedRepos.length > 0) {
      // Use only selected repositories - convert names to full paths
      this.config.repos = selectedRepos
        .filter(repo => allRepos.some(r => r.name === repo))
        .map(repoName => {
          const foundRepo = allRepos.find(r => r.name === repoName)
          return foundRepo ? `${foundRepo.workspace}/${foundRepo.name}` : repoName
        })
    } else {
      // Use all repositories by default, but filter out some common ones to exclude
      const excludePatterns: string[] = []
      this.config.repos = allRepos
        .filter(repo => !excludePatterns.some(pattern => repo.name.includes(pattern)))
        .map(repo => `${repo.workspace}/${repo.name}`)
    }
    
    console.log(`Initialized with ${this.config.repos.length} repositories:`, this.config.repos)
    return allRepos
  }

  // Fetch pull requests for a repository
  private async getFetchListPullRequests({ repo, states, sort, updatedOn }: FetchPullRequestsParams): Promise<BitbucketApiResponse<BitbucketPullRequest> | undefined> {
    const newStates = states?.length 
      ? `state IN (${states.map((state) => `"${state}"`).join(',')})`
      : ''

    const newUpdatedOn = updatedOn?.length 
      ? `updated_on${updatedOn}` 
      : ''

    const newQuery = [
      newStates,
      newUpdatedOn,
    ].filter(Boolean).join(' AND ')

    const newSort = sort?.length 
      ? `&sort=${sort}` 
      : ''

    const url = `${this.config.baseUrl}/${repo}/pullrequests?q=${newQuery}${newSort}&fields=next,values.id,values.title,values.created_on,values.updated_on,values.links.commits.href,values.author.display_name`

    return await this.getFetch<BitbucketApiResponse<BitbucketPullRequest>>(url)
  }

  // Fetch commits for a pull request
  private async getFetchListCommits({ pullRequest, sort, since }: FetchCommitsParams): Promise<BitbucketApiResponse<BitbucketCommit> | undefined> {
    const newSince = since?.length 
      ? `date>=${since}` 
      : ''

    const newQuery = [
      newSince,
    ].filter(Boolean).join(' AND ')

    const newSort = sort?.length 
      ? `&sort=${sort}` 
      : ''

    const url = `${pullRequest.pr_links_commits_href}?q=${newQuery}${newSort}&fields=next,values.hash,values.date,values.message,values.author.raw`

    return await this.getFetch(url)
  }

  // Get all pages of pull requests
  private async getAllFetchListPullRequests({ repo, states, sort, updatedOn }: FetchPullRequestsParams): Promise<({ next?: string; values: CompactPullRequest[] } | undefined)[]> {
    const maxPages = 3  // Reduced from 10 to limit API calls
    let pages = []
    let i = 0
    
    let pageRaw = await this.getFetchListPullRequests({
      repo,
      states,
      sort,
      updatedOn
    })

    if (!pageRaw) return []

    let page = this.getCompactListPullRequests(pageRaw)
    pages = [page]

    while (page?.next && i < maxPages) {
      pageRaw = await this.getFetch(page.next)
      page = this.getCompactListPullRequests(pageRaw)
      pages = [...pages, page]
      i += 1
    }

    return pages
  }

  // Get all pages of commits
  private async getAllFetchListCommits({ pullRequest, sort, since }: FetchCommitsParams): Promise<({ next?: string; values: CompactCommit[] } | undefined)[]> {
    const maxPages = 2  // Reduced from 10 to limit API calls
    let pages = []
    let i = 0
    
    let pageRaw = await this.getFetchListCommits({
      pullRequest,
      sort,
      since
    })

    if (!pageRaw) return []

    let page = this.getCompactListCommits(pageRaw)
    pages = [page]

    while (page?.next && i < maxPages) {
      pageRaw = await this.getFetch(page.next)
      page = this.getCompactListCommits(pageRaw)
      pages = [...pages, page]
      i += 1
    }

    return pages
  }

  // Compact pull request data
  private getCompactListPullRequests(data: BitbucketApiResponse<BitbucketPullRequest> | undefined): { next?: string; values: CompactPullRequest[] } | undefined {
    if (!data) return data

    return {
      next: data.next,
      values: data.values?.map((value) => ({
        id: value.id,
        title: value.title,
        author_display_name: value.author?.display_name,
        created_on: value.created_on,
        updated_on: value.updated_on,
        links_commits_href: value.links?.commits?.href,
      })) || []
    }
  }

  // Compact commit data
  private getCompactListCommits(data: BitbucketApiResponse<BitbucketCommit> | undefined): { next?: string; values: CompactCommit[] } | undefined {
    if (!data) return data

    return {
      next: data.next,
      values: data.values?.map((value) => ({
        hash: value.hash,
        date: value.date,
        author_raw: value.author?.raw,
        message: value.message,
      })) || []
    }
  }

  // Get all pull requests for all repositories
  private async getAllReposListPullRequests(maxDays: number): Promise<ProcessedPullRequest[]> {
    let allPullRequests: ProcessedPullRequest[] = []

    for (const repo of this.config.repos) {
      const pullRequests = await this.getAllFetchListPullRequests({
        repo,
        states: ['OPEN', 'MERGED', 'DECLINED', 'SUPERSEDED'],
        sort: '-updated_on',
        updatedOn: `>=${this.getUpdateOnFilter(maxDays)}`,
      })

      const pullRequestsCompact = this.getAllCompactListPullRequests(repo, pullRequests.filter(Boolean))
      allPullRequests = [...allPullRequests, ...pullRequestsCompact]
    }

    return allPullRequests
  }

  // Get all commits for all pull requests
  private async getAllReposListCommits(pullRequests: ProcessedPullRequest[], maxDays: number): Promise<(ProcessedCommit | ProcessedPullRequest)[]> {
    if (!pullRequests.length) return []

    let allCommits: (ProcessedCommit | ProcessedPullRequest)[] = []

    // Filter PRs to only those by our author or very recent ones to reduce API calls
    const relevantPRs = pullRequests.filter((pr: ProcessedPullRequest) => 
      pr.pr_author_display_name === this.config.prAuthorDisplayName ||
      (new Date(pr.pr_updated_on) > new Date(Date.now() - (3 * 24 * 60 * 60 * 1000))) // Last 3 days
    ).slice(0, 20) // Limit to max 20 PRs per batch to avoid excessive API calls

    for (const pullRequest of relevantPRs) {
      const commits = await this.getAllFetchListCommits({
        pullRequest,
        since: `${this.getUpdateOnFilter(maxDays)}`,
        sort: '-date',
      })

      const commitsCompact = this.getAllCompactListCommits(pullRequest, commits.filter(Boolean))
      allCommits = [...allCommits, ...commitsCompact]
    }

    // Add pull requests as items too
    allCommits = [...allCommits, ...pullRequests]

    return allCommits
  }

  // Transform pull request data
  private getAllCompactListPullRequests(repo: string, data: ({ next?: string; values: CompactPullRequest[] } | undefined)[]): ProcessedPullRequest[] {
    if (!data) return []

    return data
      .filter(Boolean)
      .reduce((accumulator: CompactPullRequest[], page) => {
        return [...accumulator, ...(page?.values || [])]
      }, [])
      .map((item): ProcessedPullRequest => {
        const prTitle = item.title || ''
        const ticketRef = this.getPrimaryTicket(prTitle)
        
        return {
          repo,
          pr: prTitle,
          pr_id: item.id,
          pr_author_display_name: item.author_display_name,
          pr_created_on: item.created_on,
          pr_updated_on: item.updated_on,
          pr_links_commits_href: item.links_commits_href,
          ticket: ticketRef,
          ticket_source: ticketRef ? 'PR title' : null
        }
      })
  }

  // Transform commit data
  private getAllCompactListCommits(pullRequest: ProcessedPullRequest, data: ({ next?: string; values: CompactCommit[] } | undefined)[]): ProcessedCommit[] {
    if (!data) return []

    return data
      .filter(Boolean)
      .reduce((accumulator: CompactCommit[], page) => {
        return [...accumulator, ...(page?.values || [])]
      }, [])
      .map((item): ProcessedCommit => {
        const commitMessage = item.message || ''
        const commitTicket = this.getPrimaryTicket(commitMessage)
        
        // Use ticket from commit message if found, otherwise inherit from PR
        const finalTicket = commitTicket || pullRequest.ticket
        const ticketSource = commitTicket ? 'commit message' : 
                           pullRequest.ticket ? pullRequest.ticket_source : null
        
        return {
          ...pullRequest,
          commit_hash: item.hash,
          commit_date: item.date,
          commit_author_raw: item.author_raw,
          commit_message: commitMessage,
          ticket: finalTicket,
          ticket_source: ticketSource
        }
      })
  }

  // Main method to fetch all data
  async fetchAllData(maxDays: number = 12, selectedRepos: string[] | null = null, forceRefresh: boolean = false): Promise<ProcessedCommit[]> {
    try {
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cachedData = this.getCachedData(maxDays, selectedRepos)
        if (cachedData) {
          return cachedData
        }
      }
      
      console.log('Fetching fresh data...')
      
      // Initialize repositories if not already done
      if (this.config.repos.length === 0) {
        console.log('Initializing repositories...')
        await this.initializeRepositories(selectedRepos)
      }
      
      console.log('Fetching pull requests...')
      const allPullRequests = await this.getAllReposListPullRequests(maxDays)
      console.log(`Found ${allPullRequests.length} total pull requests`)
      
      console.log('Fetching commits...')
      const allCommits = await this.getAllReposListCommits(allPullRequests, maxDays)
      console.log(`Found ${allCommits.length} total items (PRs + commits)`)
      
      // Filter by author
      const filteredData = allCommits.filter((item): item is ProcessedCommit => {
        if ('commit_author_raw' in item && item.commit_author_raw) {
          return item.commit_author_raw === this.config.commitAuthorRaw
        }
        if ('pr_author_display_name' in item && item.pr_author_display_name) {
          return item.pr_author_display_name === this.config.prAuthorDisplayName
        }
        return false
      })
      
      console.log(`Found ${filteredData.length} items by ${this.config.prAuthorDisplayName}`)
      
      // Cache the results
      this.setCachedData(maxDays, selectedRepos, filteredData)
      
      return filteredData
      
    } catch (error) {
      console.error('Error fetching all data:', error)
      throw error
    }
  }

  // Test authentication method
  async testAuthentication(): Promise<{ success: boolean; message: string; userInfo?: any }> {
    console.log('🔐 Testing Bitbucket API Token authentication...')
    
    try {
      // Test against user endpoint - should work with Bearer token
      const userInfo = await this.getFetch('https://api.bitbucket.org/2.0/user')
      
      if (userInfo) {
        return {
          success: true,
          message: `API Token authentication successful for user: ${userInfo.display_name || userInfo.username}`,
          userInfo: userInfo
        }
      }
      
      return {
        success: false,
        message: 'Authentication failed. Please check your Bitbucket API Token.'
      }
    } catch (error) {
      return {
        success: false,
        message: `Authentication test failed: ${error}`
      }
    }
  }

  // Check if user has valid credentials
  hasCredentials(): boolean {
    return !!(this.config.apiUsername && this.config.apiToken)
  }
}

// Export singleton instance with additional methods
export const bitbucketService = new BitbucketService()

// Extend the service instance with additional convenience methods
interface ExtendedBitbucketService extends BitbucketService {
  getAvailableRepositories(): Promise<BitbucketRepository[]>
  clearCache(pattern?: string | null): void
  fetchAllDataFresh(maxDays?: number, selectedRepos?: string[] | null): Promise<ProcessedCommit[]>
  testAuthentication(): Promise<{ success: boolean; message: string; userInfo?: any }>
}

// Add convenience methods to the service instance
const extendedService = bitbucketService as ExtendedBitbucketService

extendedService.getAvailableRepositories = async function(): Promise<BitbucketRepository[]> {
  return await this.fetchAllRepositories()
}

extendedService.clearCache = function(pattern: string | null = null): void {
  return this.clearCache(pattern)
}

extendedService.fetchAllDataFresh = function(maxDays: number = 12, selectedRepos: string[] | null = null): Promise<ProcessedCommit[]> {
  return this.fetchAllData(maxDays, selectedRepos, true) // Force refresh
}

extendedService.testAuthentication = function(): Promise<{ success: boolean; message: string; userInfo?: any }> {
  return baseService.testAuthentication()
}

export default extendedService