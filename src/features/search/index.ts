// Core search functionality - Vercel deployment fix
export { usePostSearch, useSearchIntegration, useSearchURLSync } from '@/features/search/hooks';

// Search API and utilities
export { searchAPI } from '@/features/search/api';
export { searchPerformanceMonitor } from '@/features/search/utils';

// Components
export { SearchPerformanceDashboard, SearchFilters as SearchFiltersComponent } from '@/features/search/components';

// Types
export type {
  SearchResult,
  SearchFilters,
  SearchState,
  SearchSuggestion,
  SearchType
} from '@/features/search/types';