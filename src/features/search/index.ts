// Core search functionality - Vercel deployment fix
export { usePostSearch } from '@/features/search/hooks/usePostSearch';
export { useSearchIntegration } from '@/features/search/hooks/useSearchIntegration';
export { useSearchURLSync } from '@/features/search/hooks/useSearchURLSync';

// Search API and utilities
export { searchAPI } from '@/features/search/api/search-api.js';
export { searchPerformanceMonitor } from '@/features/search/utils/searchPerformance';

// Components
export { SearchPerformanceDashboard } from '@/features/search/components/SearchPerformanceDashboard';
export { SearchFilters as SearchFiltersComponent } from '@/features/search/components/SearchFilters';

// Types
export type {
  SearchResult,
  SearchFilters,
  SearchState,
  SearchSuggestion,
  SearchType
} from '@/features/search/types';