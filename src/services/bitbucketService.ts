// Bitbucket Service - Laravel Backend Integration
// NEW: Uses Laravel API backend for all Bitbucket operations (recommended approach)
// Provides better security, caching, and error handling
//
// IMPORTANT: This service requires a Laravel backend running at localhost:8000
// The Laravel backend handles all Bitbucket API authentication and data processing
// Frontend tokens are no longer needed - all credentials are managed server-side

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
  FetchCommitsParams,
  UserRepository,
  RepositoryStatusResponse,
  RepositoryToggleResponse
} from '../types/bitbucket'

class BitbucketService {
  private config: BitbucketServiceConfig
  private cache: ServiceCache
  private apiBase: string

  constructor() {
    // Use Laravel backend API as primary data source
    this.apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'
    
    this.config = {
      apiToken: '', // Tokens now stored server-side in Laravel backend
      apiUsername: import.meta.env.VITE_BITBUCKET_AUTHOR_USERNAME || 'RensHoogendam', // For API filtering
      prAuthorDisplayName: import.meta.env.VITE_BITBUCKET_PR_AUTHOR_DISPLAY_NAME || 'Rens Hoogendam',
      commitAuthorRaw: import.meta.env.VITE_BITBUCKET_COMMIT_AUTHOR_RAW || 'RensHoogendam <r.hoogendam@atabix.nl>',
      authorEmail: import.meta.env.VITE_BITBUCKET_AUTHOR_EMAIL,
      repos: [], // Will be populated dynamically
      baseUrl: `${this.apiBase}/bitbucket` // Laravel backend endpoints
    }
    
    const workspaces = import.meta.env.VITE_BITBUCKET_WORKSPACES?.split(',') || ['atabix']
    this.config.workspaces = workspaces.map((ws: string) => ws.trim())
    
    // Initialize cache
    this.cache = {
      data: new Map(),
      repositories: null,
      repositoriesTimestamp: null
    }
  }

  // Laravel Backend API fetch wrapper
  private async getFetch<T = any>(url: string): Promise<T | undefined> {
    console.log('🌐 Laravel API fetch():', url)
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      })
      
      if (response.ok) {
        try {
          return await response.json()
        } catch (error) {
          console.error('JSON parsing error:', { error, url })
          return undefined
        }
      }
      
      // Enhanced error handling for Laravel backend responses
      if (response.status === 401) {
        console.error('🔐 Laravel backend authentication failed (401):', {
          message: 'Backend authentication issue with Bitbucket API',
          suggestion: 'Check Laravel backend configuration and Bitbucket token setup',
          url: url
        })
      } else if (response.status === 403) {
        console.error('🚫 Access forbidden (403):', {
          message: 'Backend reports insufficient permissions',
          suggestion: 'Verify Bitbucket token permissions in Laravel backend',
          url: url
        })
      } else if (response.status === 404) {
        console.error('❓ Resource not found (404):', {
          message: 'Laravel backend endpoint not found',
          suggestion: 'Ensure Laravel backend is running on localhost:8000',
          url: url
        })
      } else if (response.status === 500) {
        console.error('🔥 Laravel backend error (500):', {
          message: 'Internal server error in Laravel backend',
          suggestion: 'Check Laravel logs for detailed error information',
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
      // Check if Laravel backend is accessible
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.error('🔌 Laravel backend connection failed:', {
          message: 'Cannot connect to Laravel backend',
          suggestion: 'Ensure Laravel backend is running on localhost:8000',
          apiBase: this.apiBase
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

  // Fetch all repositories via Laravel backend
  async fetchAllRepositories(): Promise<BitbucketRepository[]> {
    // Check cache first (cache repos for 1 hour)
    if (this.cache.repositories && this.cache.repositoriesTimestamp && this.isCacheValid(this.cache.repositoriesTimestamp, 60)) {
      console.log('Using cached repositories')
      return this.cache.repositories
    }
    
    console.log('🔍 Fetching repositories via Laravel backend...')
    
    try {
      // Use Laravel backend endpoint for repositories
      const workspaces = 'atabix'
      const url = `${this.apiBase}/repositories?workspaces=${workspaces}`
      
      const response = await this.getFetch<{ data: BitbucketRepository[] }>(url)
      
      if (!response || !response.data) {
        console.warn('No repositories returned from Laravel backend')
        return []
      }
      
      const allRepositories = response.data
      
      // Sort all repositories by name
      const result = allRepositories.sort((a, b) => a.name.localeCompare(b.name))
      
      // Cache the results
      this.cache.repositories = result
      this.cache.repositoriesTimestamp = Date.now()
      console.log(`✅ Cached ${result.length} repositories from Laravel backend`)
      
      return result
      
    } catch (error) {
      console.error('Error fetching repositories from Laravel backend:', error)
      return []
    }
  }

  // Fetch user repositories with enable/disable status
  async fetchUserRepositories(): Promise<UserRepository[]> {
    console.log('🔍 Fetching user repositories via Laravel backend...')
    
    try {
      const url = `${this.apiBase}/repositories/user`
      
      const response = await this.getFetch<{ data: UserRepository[] }>(url)
      
      if (!response || !response.data) {
        console.warn('No user repositories returned from Laravel backend')
        return []
      }
      
      const userRepositories = response.data
      
      // Sort repositories by name
      const result = userRepositories.sort((a, b) => a.name.localeCompare(b.name))
      
      console.log(`✅ Fetched ${result.length} user repositories from Laravel backend`)
      
      return result
      
    } catch (error) {
      console.error('Error fetching user repositories from Laravel backend:', error)
      return []
    }
  }

  // Enable a repository for the user
  async enableRepository(repositoryId: number): Promise<RepositoryStatusResponse> {
    console.log('✅ Enabling repository via Laravel backend...', repositoryId)
    
    try {
      const url = `${this.apiBase}/repositories/user/${repositoryId}/enable`
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('✅ Repository enabled successfully:', result)
        // Clear cache to force refresh
        this.cache.repositories = null
        this.cache.repositoriesTimestamp = null
        return result
      } else {
        throw new Error(`Failed to enable repository: ${response.statusText}`)
      }
      
    } catch (error) {
      console.error('Error enabling repository:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to enable repository'
      return {
        success: false,
        message: errorMessage
      }
    }
  }

  // Disable a repository for the user
  async disableRepository(repositoryId: number): Promise<RepositoryStatusResponse> {
    console.log('❌ Disabling repository via Laravel backend...', repositoryId)
    
    try {
      const url = `${this.apiBase}/repositories/user/${repositoryId}/disable`
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('❌ Repository disabled successfully:', result)
        // Clear cache to force refresh
        this.cache.repositories = null
        this.cache.repositoriesTimestamp = null
        return result
      } else {
        throw new Error(`Failed to disable repository: ${response.statusText}`)
      }
      
    } catch (error) {
      console.error('Error disabling repository:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to disable repository'
      return {
        success: false,
        message: errorMessage
      }
    }
  }

  // Toggle repository enable/disable status using repository name
  async toggleRepositoryStatus(repositoryName: string): Promise<RepositoryToggleResponse> {
    console.log('🔄 Toggling repository status via Laravel backend...', repositoryName)
    
    try {
      const url = `${this.apiBase}/repositories/user/${encodeURIComponent(repositoryName)}/toggle`
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('🔄 Repository status toggled successfully:', result)
        // Clear cache to force refresh
        this.cache.repositories = null
        this.cache.repositoriesTimestamp = null
        return result
      } else {
        throw new Error(`Failed to toggle repository status: ${response.statusText}`)
      }
      
    } catch (error) {
      console.error('Error toggling repository status:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to toggle repository status'
      return {
        success: false,
        message: errorMessage,
        is_enabled: false
      }
    }
  }

  // Save user repository selections (bulk update)
  async saveUserRepositorySelections(repositoryNames: string[]): Promise<RepositoryStatusResponse> {
    console.log('💾 Saving user repository selections via Laravel backend...', repositoryNames)
    
    try {
      const url = `${this.apiBase}/repositories/user`
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled_repositories: repositoryNames
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('💾 Repository selections saved successfully:', result)
        // Clear cache to force refresh
        this.cache.repositories = null
        this.cache.repositoriesTimestamp = null
        return {
          success: true,
          message: 'Repository selections saved successfully'
        }
      } else {
        const errorText = await response.text()
        throw new Error(`Failed to save repository selections: ${response.statusText} - ${errorText}`)
      }
      
    } catch (error) {
      console.error('Error saving repository selections:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to save repository selections'
      return {
        success: false,
        message: errorMessage
      }
    }
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
  // @ts-expect-error - Method may be used in future, keeping for potential utility
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

  // Fetch commits directly from repository (not through PRs) with server-side author filtering
  private async getFetchRepositoryCommits(repo: string, since: string, sort: string = '-date'): Promise<BitbucketApiResponse<BitbucketCommit> | undefined> {
    const dateFilter = since.length ? `date>=${since}` : ''
    const sortParam = sort.length ? `&sort=${sort}` : ''
    
    // Use username parameter for server-side filtering (more efficient than client-side filtering)
    // This filters commits by the username associated with the author
    const usernameParam = this.config.apiUsername ? `&username=${this.config.apiUsername}` : ''
    
    const queryParam = dateFilter ? `q=${dateFilter}` : 'q='
    
    // Fetch commits directly from the repository with server-side author filtering
    const url = `${this.config.baseUrl}/${repo}/commits?${queryParam}${sortParam}${usernameParam}&fields=next,values.hash,values.date,values.message,values.author.raw,values.author.user.username`
    
    console.log('🔍 Fetching repository commits with server-side author filtering:', url)
    console.log(`📋 Filtering by username: ${this.config.apiUsername}`)
    
    const result = await this.getFetch(url)
    
    // If no results and we have a username, try alternative filtering method
    if ((!result || !result.values?.length) && this.config.apiUsername) {
      console.log('🔄 No results with username parameter, trying alternative query method...')
      return await this.getFetchRepositoryCommitsAlternative(repo, since, sort)
    }
    
    return result
  }

  // Alternative method using advanced query filtering (fallback)
  private async getFetchRepositoryCommitsAlternative(repo: string, since: string, sort: string = '-date'): Promise<BitbucketApiResponse<BitbucketCommit> | undefined> {
    const dateFilter = since.length ? `date>=${since}` : ''
    const sortParam = sort.length ? `&sort=${sort}` : ''
    
    // Method 2: Use advanced query syntax with author.user.username filter
    const authorFilter = this.config.apiUsername ? `author.user.username="${this.config.apiUsername}"` : ''
    
    const fullQuery = [dateFilter, authorFilter].filter(Boolean).join(' AND ')
    const queryParam = fullQuery ? `q=${encodeURIComponent(fullQuery)}` : 'q='
    
    const url = `${this.config.baseUrl}/${repo}/commits?${queryParam}${sortParam}&fields=next,values.hash,values.date,values.message,values.author.raw,values.author.user.username`
    
    console.log('🔍 Alternative filtering: Using advanced query syntax:', url)
    console.log(`📋 Query filter: ${fullQuery}`)
    
    return await this.getFetch(url)
  }

  // Get all pages of repository commits
  private async getAllRepositoryCommits(repo: string, maxDays: number): Promise<({ next?: string; values: CompactCommit[] } | undefined)[]> {
    const maxPages = 3  // Limit API calls
    let pages = []
    let i = 0
    
    let pageRaw = await this.getFetchRepositoryCommits(repo, this.getUpdateOnFilter(maxDays))
    
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

  // Get all commits for all pull requests
  // @ts-expect-error - Method may be used in future, keeping for potential utility
  private async getAllReposListCommits(pullRequests: ProcessedPullRequest[], maxDays: number): Promise<(ProcessedCommit | ProcessedPullRequest)[]> {
    if (!pullRequests.length) return []

    let allCommits: (ProcessedCommit | ProcessedPullRequest)[] = []

    // ENHANCED: Fetch commits from both PRs AND directly from repositories
    // This ensures we don't miss commits from deleted branches
    
    // 1. Get commits from pull requests (existing logic)
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

    // 2. ALSO fetch commits directly from each repository to catch any missed commits
    console.log('🔍 ENHANCEMENT: Also fetching commits directly from repositories to catch commits from deleted branches...')
    
    for (const repo of this.config.repos) {
      const repositoryCommits = await this.getAllRepositoryCommits(repo, maxDays)
      const repositoryCommitsCompact = this.getAllCompactRepositoryCommits(repo, repositoryCommits.filter(Boolean))
      
      // Server-side filtering should have already filtered by author, but double-check for safety
      const ourCommits = repositoryCommitsCompact.filter((commit: ProcessedCommit) => 
        commit.commit_author_raw === this.config.commitAuthorRaw ||
        commit.commit_author_raw?.includes(this.config.apiUsername) // Fallback check
      )
      
      console.log(`📊 Server-side filtered: ${repositoryCommitsCompact.length} commits in ${repo} (should all be by ${this.config.apiUsername})`)
      console.log(`📊 Client-side verified: ${ourCommits.length} commits match author criteria`)
      
      allCommits = [...allCommits, ...ourCommits]
    }

    // Add pull requests as items too
    allCommits = [...allCommits, ...pullRequests]

    return allCommits
  }

  // Transform repository commit data (for commits fetched directly from repository)
  private getAllCompactRepositoryCommits(repo: string, data: ({ next?: string; values: CompactCommit[] } | undefined)[]): ProcessedCommit[] {
    if (!data) return []

    return data
      .filter(Boolean)
      .reduce((accumulator: CompactCommit[], page) => {
        return [...accumulator, ...(page?.values || [])]
      }, [])
      .map((item): ProcessedCommit => {
        const commitMessage = item.message || ''
        const ticketRef = this.getPrimaryTicket(commitMessage)
        
        return {
          repo,
          pr: null, // No PR association for direct repository commits
          pr_id: null,
          pr_author_display_name: null,
          pr_created_on: null,
          pr_updated_on: null,
          pr_links_commits_href: null,
          commit_hash: item.hash,
          commit_date: item.date,
          commit_author_raw: item.author_raw,
          commit_message: commitMessage,
          ticket: ticketRef,
          ticket_source: ticketRef ? 'commit message' : null
        }
      })
  }

  // Transform pull request data
  // @ts-expect-error - Method may be used in future, keeping for potential utility
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

  // Main method to fetch all data via Laravel backend
  async fetchAllData(maxDays: number = 12, selectedRepos: string[] | null = null, forceRefresh: boolean = false): Promise<ProcessedCommit[]> {
    try {
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cachedData = this.getCachedData(maxDays, selectedRepos)
        if (cachedData) {
          return cachedData
        }
      }
      
      console.log('🚀 Fetching fresh data via Laravel backend...')
      
      // Use new Laravel backend endpoint for unified activity (commits + pull requests)
      const params = new URLSearchParams({
        days: maxDays.toString(),
        author: this.config.authorEmail || this.config.apiUsername // Use username/email instead of display name
      })
      
      // Build URL with repositories parameter manually to avoid double encoding
      let url = `${this.apiBase}/bitbucket/activity?${params.toString()}`
      
      // Add repository filtering if specified (avoid URLSearchParams encoding)
      // if (selectedRepos && selectedRepos.length > 0) {
      //   const reposParam = selectedRepos.join(',')
      //   url += `&repositories=${reposParam}`
      // }
      
      
      const response = await this.getFetch<{
        data: Array<{
          type: 'commit' | 'pull_request'
          repository: string
          hash?: string
          date: string
          message?: string
          author_raw?: string
          author_username?: string | null
          ticket?: string | null
          branch?: string // New: branch information for commits
          // PR-specific fields
          pr_id?: number
          pr_title?: string
          pr_author?: string
          pr_created_on?: string
          pr_updated_on?: string
          pr_state?: 'MERGED' | 'OPEN' | 'DECLINED' | 'SUPERSEDED' // New: PR states
        }>
        cached?: boolean
        cache_expires_at?: string
        repositories_used?: string[]
      }>(url)
      
      if (!response || !response.data) {
        throw new Error('Failed to fetch data from Laravel backend')
      }
      
      // Pass through the clean backend format with minimal transformation
      const allData: any[] = response.data.map(item => ({
        // Keep all backend fields as-is
        ...item,
        // Add compatibility fields for any components still expecting old format  
        repo: item.repository,
        pr: item.pr_title || null,
        commit_hash: item.hash || null,
        commit_date: item.date,
        commit_message: item.message || null,
        commit_author_raw: item.author_raw || null,
        pr_id: (item as any).pull_request_id || null,
        pr_author_display_name: item.pr_author || null,
        pr_created_on: item.pr_created_on || null,
        pr_updated_on: item.pr_updated_on || null,
        pr_links_commits_href: null,
        ticket_source: item.ticket ? (item.type === 'commit' ? 'commit message' : 'PR title') : null
      }))
      
      // Sort by date (newest first) 
      const sortedData = allData.sort((a, b) => {
        const dateA = new Date(a.commit_date || '').getTime()
        const dateB = new Date(b.commit_date || '').getTime()
        return dateB - dateA
      })
      
      console.log(`✅ Received ${sortedData.length} activity items from Laravel backend (commits + PRs)`)
      if (response.cached) {
        console.log('📊 Cache info:', { 
          cached: response.cached, 
          expires_at: response.cache_expires_at,
          repositories_used: response.repositories_used?.length 
        })
      }
      
      // Cache the results
      this.setCachedData(maxDays, selectedRepos, sortedData)
      
      return sortedData
      
    } catch (error) {
      console.error('Error fetching data from Laravel backend:', error)
      throw error
    }
  }

  // Test Laravel backend authentication
  async testAuthentication(): Promise<{ success: boolean; message: string; userInfo?: any }> {
    console.log('🔐 Testing Laravel backend authentication...')
    
    try {
      const response = await this.getFetch<{ 
        success: boolean; 
        message: string; 
        user_info?: any
      }>(`${this.apiBase}/bitbucket/test-auth`)
      
       return response || {
        success: false,
        message: 'No response from Laravel backend during authentication test'
       }
    } catch (error) {
      return {
        success: false,
        message: `Laravel backend authentication test failed: ${error}`
      }
    }
  }

  // Check if Laravel backend is accessible
  hasCredentials(): boolean {
    // With Laravel backend, credentials are managed server-side
    return !!this.apiBase
  }
}

// Export singleton instance with proper typing
export const bitbucketService = new BitbucketService()

// Additional convenience methods for the service
bitbucketService.fetchAllData = function(maxDays: number = 12, selectedRepos: string[] | null = null): Promise<ProcessedCommit[]> {
  return this.fetchAllData(maxDays, selectedRepos, true) // Force refresh
}

export default bitbucketService