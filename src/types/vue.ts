import type { Ref, InjectionKey } from 'vue';
import type {
  AppFilters,
  UserRepository,
  ProcessedCommit
} from './bitbucket';

// Vue Component Props Interfaces
export interface AppNavigationProps {
  lastUpdated: Date | null;
  isLoading: boolean;
  filters: AppFilters;
}

export interface AppNavigationEmits {
  (event: 'refresh'): void;
  (event: 'force-refresh'): void;
  (event: 'clear-cache'): void;
  (event: 'filter-change', filters: Partial<AppFilters>): void;
}

export interface DashboardProps {
  data: ProcessedCommit[];
  filters: AppFilters;
  isLoading: boolean;
  lastUpdated: Date | null;
  error: string | null;
}

export interface DashboardEmits {
  (event: 'filter-change', filters: Partial<AppFilters>): void;
  (event: 'refresh'): void;
  (event: 'force-refresh'): void;
  (event: 'clear-cache'): void;
}

export interface HoursTableProps {
  data: ProcessedCommit[];
  isLoading: boolean;
}

export interface HoursFiltersProps {
  filters: AppFilters;
  availableRepos: string[];
}

export interface HoursFiltersEmits {
  (event: 'filter-change', filters: Partial<AppFilters>): void;
}

export interface RepoSelectorProps {
  compact: boolean;
  showStatus: boolean;
}

export interface RepoSelectorEmits {
  (event: 'repos-changed', repos: string[]): void;  
  (event: 'repository-status-changed', repo: UserRepository): void;
}

export interface PageToolbarProps {
  lastUpdated: Date | null;
  isLoading: boolean;
  filters: AppFilters;
}

export interface PageToolbarEmits {
  (event: 'refresh'): void;
  (event: 'force-refresh'): void;
  (event: 'clear-cache'): void;
  (event: 'filter-change', filters: Partial<AppFilters>): void;
}

export interface DetailsPageProps {
  data: ProcessedCommit[];
  filters: AppFilters;
  isLoading: boolean;
  lastUpdated: Date | null;
  error: string | null;
}

export interface DetailsPageEmits {
  (event: 'filter-change', filters: Partial<AppFilters>): void;
  (event: 'export'): void;
  (event: 'refresh'): void;
  (event: 'force-refresh'): void;
  (event: 'clear-cache'): void;
}

// Component State Interfaces
export interface AppState {
  isAuthenticated: Ref<boolean>;
  isLoading: Ref<boolean>;
  hoursData: Ref<ProcessedCommit[]>;
  filteredData: Ref<ProcessedCommit[]>;
  error: Ref<string | null>;
  lastUpdated: Ref<Date | null>;
  selectedRepos: Ref<string[]>;
  filters: Ref<AppFilters>;
}

export interface DashboardState {
  activityChartInstance: any;
  repoChartInstance: any;
}

export interface HoursTableState {
  sortField: Ref<string>;
  sortDirection: Ref<'asc' | 'desc'>;
  searchQuery: Ref<string>;
}

export interface RepoSelectorState {
  showSelector: boolean;
  loading: boolean;
  error: string | null;
  availableRepos: UserRepository[];
  selectedRepos: string[];
  togglingRepos: Set<number>;
}

// Utility Types
export interface FormatDateOptions {
  month: 'short' | 'long' | 'numeric' | '2-digit';
  day: 'numeric' | '2-digit';  
  hour: '2-digit';
  minute: '2-digit';
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'doughnut';
  data: any;
  options: any;
}

// Event Handler Types
export type RefreshHandler = () => void;
export type FilterChangeHandler = (filters: Partial<AppFilters>) => void;
export type RepoChangeHandler = (repos: string[]) => void;
export type SortHandler = (field: string) => void;
export type SearchHandler = (query: string) => void;

export const HOURS_DATA_KEY = Symbol('hoursData') as InjectionKey<Ref<ProcessedCommit[]>>;
export const FILTERED_DATA_KEY = Symbol('filteredData') as InjectionKey<Ref<ProcessedCommit[]>>;
export const FILTERS_KEY = Symbol('filters') as InjectionKey<Ref<AppFilters>>;
export const IS_LOADING_KEY = Symbol('isLoading') as InjectionKey<Ref<boolean>>;
export const IS_AUTHENTICATED_KEY = Symbol('isAuthenticated') as InjectionKey<Ref<boolean>>;