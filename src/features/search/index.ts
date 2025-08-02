// Core search functionality
export { usePostSearch } from './hooks/usePostSearch.ts';
export { useSearchIntegration } from './hooks/useSearchIntegration.ts';
export { useSearchURLSync } from './hooks/useSearchURLSync.ts';

// Search API and utilities
export { searchAPI } from './api/search-api.ts';
export { searchPerformanceMonitor } from './utils/searchPerformance.ts';

// Components
export { SearchPerformanceDashboard } from './components/SearchPerformanceDashboard.tsx';
export { SearchFilters as SearchFiltersComponent } from './components/SearchFilters.tsx';

// Types
export type {
  SearchResult,
  SearchFilters,
  SearchState,
  SearchSuggestion,
  SearchType
} from './types.ts';