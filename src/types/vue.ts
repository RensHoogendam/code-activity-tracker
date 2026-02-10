import type { Ref, InjectionKey } from 'vue';
import type {
  AppFilters,
  ProcessedCommit
} from './bitbucket';

// Shared Application State
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