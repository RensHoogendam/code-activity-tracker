// Type definitions for Bitbucket API responses and internal data structures

export interface BitbucketRepository {
  name: string;
  updated_on: string | null;
  language: string | null;
  workspace?: string;
  is_enabled?: boolean;
  is_primary?: boolean;
}

export interface UserRepository {
  id: number;
  name: string;
  updated_on: string | null;
  language: string | null;
  workspace: string;
  is_enabled: boolean;
  is_primary: boolean;
}

export interface BitbucketPullRequest {
  id: number;
  title: string;
  author: {
    display_name: string;
  };
  created_on: string;
  updated_on: string;
  links: {
    commits: {
      href: string;
    };
  };
}

export interface BitbucketCommit {
  hash: string;
  date: string;
  message: string;
  author: {
    raw: string;
  };
}

export interface BitbucketApiResponse<T> {
  next?: string;
  values: T[];
}

// Internal data structures
export interface CompactPullRequest {
  id: number;
  title: string;
  author_display_name: string;
  created_on: string;
  updated_on: string;
  links_commits_href: string;
}

export interface CompactCommit {
  hash: string;
  date: string;
  author_raw: string;
  message: string;
}

export interface ProcessedPullRequest {
  repo: string;
  pr: string;
  pr_id: number;
  pr_author_display_name: string;
  pr_created_on: string;
  pr_updated_on: string;
  pr_links_commits_href: string;
  ticket: string | null;
  ticket_source: string | null;
}

export interface ProcessedCommit {
  commit_hash: string;
  commit_date: string;
  commit_author_raw: string;
  commit_message: string;
  repo: string;
  branch?: string | null; // New: branch information
  pr_state?: 'MERGED' | 'OPEN' | 'DECLINED' | 'SUPERSEDED' | null; // New: PR state
  ticket: string | null;
  ticket_source: string | null;
  // PR-specific fields - null for direct commits
  pr: string | null;
  pr_id: number | null;
  pr_author_display_name: string | null;
  pr_created_on: string | null;
  pr_updated_on: string | null;
  pr_links_commits_href: string | null;
}

export interface BitbucketServiceConfig {
  apiToken: string;
  apiUsername: string;
  prAuthorDisplayName: string;
  commitAuthorRaw: string;
  authorEmail?: string; // New: author email for API filtering
  repos: string[];
  baseUrl: string;
  workspaces?: string[]; // New: workspace configuration
}

export interface CacheData<T> {
  data: T;
  timestamp: number;
}

export interface ServiceCache {
  data: Map<string, CacheData<ProcessedCommit[]>>;
  repositories: BitbucketRepository[] | null;
  repositoriesTimestamp: number | null;
}

export interface FetchPullRequestsParams {
  repo: string;
  states?: string[];
  sort?: string;
  updatedOn?: string;
}

export interface FetchCommitsParams {
  pullRequest: ProcessedPullRequest;
  sort?: string;
  since?: string;
}

export type ProcessedActivity = ProcessedCommit;

// Repository management API responses
export interface RepositoryStatusResponse {
  success: boolean;
  message: string;
  repository?: UserRepository;
}

export interface RepositoryToggleResponse {
  success: boolean;
  message: string;
  is_enabled: boolean;
  repository?: UserRepository;
}

// UI and Application Types
export interface AppFilters {
  repo: string;
  dateRange: number;
  author: string;
  type: 'all' | 'commits' | 'pullrequests';
}

export interface DashboardMetrics {
  totalCommits: number;
  totalPRs: number;
  uniqueTickets: number;
  activeRepos: number;
  commitsTrend: number;
  prsTrend: number;
  ticketsTrend: number;
  reposTrend: number;
}

export interface ActivityItem {
  id: string;
  type: 'commit' | 'pull_request';
  repository: string;
  repo: string;
  date: string;
  message?: string;
  title?: string;
  pr_title?: string;
  ticket?: string | null;
  ticket_source?: string | null;
  commit_hash?: string;
  pr_id?: number;
  branch?: string | null;
  pr_state?: 'MERGED' | 'OPEN' | 'DECLINED' | 'SUPERSEDED' | null;
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

export interface ChartDatapoint {
  date: string;
  commits: number;
  pullRequests: number;
}

export interface RepoActivity {
  name: string;
  commits: number;
  count: number; // Alias for commits for backward compatibility
  pullRequests: number;
  lastActivity: string;
}

// Background Job System Types
export interface RefreshJobStatus {
  job_id: string;
  status: 'started' | 'processing' | 'completed' | 'failed' | 'cancelled';
  message: string;
  updated_at: string;
  elapsed_time: number; // in seconds
  elapsed_time_human: string;
  parameters: {
    max_days: number;
    selected_repos_count: number;
    author_filter: string;
  };
  time_since_update: {
    human_readable: string;
    seconds: number;
  };
  is_running: boolean;
  is_completed: boolean;
  is_failed: boolean;
  is_cancelled?: boolean;
  started_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  error?: string;
  progress?: number; // Optional - for future progress tracking
}

export interface ResponseWithRefreshStatus<T> {
  data: T;
  refresh_status?: RefreshJobStatus;
  cached?: boolean;
  cache_expires_at?: string;
  repositories_used?: string[];
}

// Authentication and Service Status
export interface AuthenticationState {
  isAuthenticated: boolean;
  hasCredentials: boolean;
  lastChecked?: Date;
}

export interface ServiceStatus {
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refreshJob?: RefreshJobStatus;
}

export interface TestResult {
  success: boolean;
  message: string;
}