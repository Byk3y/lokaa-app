// Core search functionality
export { usePostSearch } from './hooks/usePostSearch';
export { useSearchIntegration } from './hooks/useSearchIntegration';
export { useSearchURLSync } from './hooks/useSearchURLSync';

// Search API and utilities
export { searchAPI } from './api/search-api';
export { searchPerformanceMonitor } from './utils/searchPerformance';

// Components
export { SearchPerformanceDashboard } from './components/SearchPerformanceDashboard';
export { SearchFilters as SearchFiltersComponent } from './components/SearchFilters';

// Types
export type {
  SearchResult,
  SearchFilters,
  SearchState,
  SearchSuggestion,
  SearchType
} from './types';