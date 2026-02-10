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

export interface ProcessedCommit extends ProcessedPullRequest {
  commit_hash: string;
  commit_date: string;
  commit_author_raw: string;
  commit_message: string;
}

export interface BitbucketServiceConfig {
  apiToken: string;
  apiUsername: string;
  prAuthorDisplayName: string;
  commitAuthorRaw: string;
  repos: string[];
  baseUrl: string;
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