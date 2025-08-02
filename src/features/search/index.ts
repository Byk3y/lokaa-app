// Core search functionality
export { usePostSearch, useSearchIntegration, useSearchURLSync } from './hooks';

// Search API and utilities
export { searchAPI } from './api';
export { searchPerformanceMonitor } from './utils';

// Components
export { SearchPerformanceDashboard, SearchFilters as SearchFiltersComponent } from './components';

// Types
export type {
  SearchResult,
  SearchFilters,
  SearchState,
  SearchSuggestion,
  SearchType
} from './types';