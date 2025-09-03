import { log } from '@/utils/logger';

/**
 * 🚀 Cursor-Based Pagination - Efficient pagination for large datasets
 * 
 * Features:
 * - Cursor-based pagination for better performance
 * - Consistent ordering and filtering
 * - Efficient database queries
 * - Support for different cursor types
 * - Pagination state management
 */

export interface Cursor {
  value: string | number;
  direction: 'before' | 'after';
  timestamp?: number;
}

export interface PaginationOptions {
  limit?: number;
  cursor?: Cursor;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

export interface PaginatedResult<T> {
  data: T[];
  nextCursor?: Cursor;
  prevCursor?: Cursor;
  hasNext: boolean;
  hasPrev: boolean;
  total?: number;
  pageInfo: {
    limit: number;
    count: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface CursorPaginationConfig {
  defaultLimit: number;
  maxLimit: number;
  cursorField: string;
  timestampField?: string;
  enableTotalCount?: boolean;
}

class CursorPagination {
  private static instance: CursorPagination;
  private config: CursorPaginationConfig;

  constructor(config: CursorPaginationConfig = {
    defaultLimit: 20,
    maxLimit: 100,
    cursorField: 'id',
    timestampField: 'created_at',
    enableTotalCount: false
  }) {
    this.config = config;
  }

  static getInstance(config?: CursorPaginationConfig): CursorPagination {
    if (!CursorPagination.instance) {
      CursorPagination.instance = new CursorPagination(config);
    }
    return CursorPagination.instance;
  }

  /**
   * 🎯 PAGINATE QUERY
   */
  async paginate<T>(
    queryFn: (options: any) => Promise<T[]>,
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<T>> {
    const {
      limit = this.config.defaultLimit,
      cursor,
      orderBy = this.config.cursorField,
      orderDirection = 'desc',
      filters = {}
    } = options;

    // Validate limit
    const validatedLimit = Math.min(Math.max(limit, 1), this.config.maxLimit);

    try {
      // Build query options
      const queryOptions = {
        limit: validatedLimit + 1, // Fetch one extra to determine hasNext
        orderBy,
        orderDirection,
        filters,
        cursor
      };

      // Execute query
      const results = await queryFn(queryOptions);
      
      // Determine pagination info
      const hasNext = results.length > validatedLimit;
      const data = hasNext ? results.slice(0, validatedLimit) : results;
      
      // Generate cursors
      const nextCursor = hasNext && data.length > 0 ? 
        this.generateCursor(data[data.length - 1], 'after', orderBy) : undefined;
      
      const prevCursor = cursor && data.length > 0 ? 
        this.generateCursor(data[0], 'before', orderBy) : undefined;

      const result: PaginatedResult<T> = {
        data,
        nextCursor,
        prevCursor,
        hasNext,
        hasPrev: !!cursor,
        pageInfo: {
          limit: validatedLimit,
          count: data.length,
          hasNextPage: hasNext,
          hasPreviousPage: !!cursor
        }
      };

      log.debug('Utils', `📄 [CursorPagination] Paginated query: ${data.length} items, hasNext: ${hasNext}, hasPrev: ${!!cursor}`);

      return result;

    } catch (error) {
      log.error('Utils', `❌ [CursorPagination] Pagination failed:`, error);
      throw error;
    }
  }

  /**
   * 🔄 GENERATE CURSOR
   */
  private generateCursor<T>(item: T, direction: 'before' | 'after', orderBy: string): Cursor {
    const value = (item as any)[orderBy];
    const timestamp = this.config.timestampField ? (item as any)[this.config.timestampField] : undefined;
    
    return {
      value: value || '',
      direction,
      timestamp: timestamp ? new Date(timestamp).getTime() : undefined
    };
  }

  /**
   * 🔍 PARSE CURSOR
   */
  parseCursor(cursor: Cursor): {
    value: string | number;
    direction: 'before' | 'after';
    timestamp?: number;
  } {
    return {
      value: cursor.value,
      direction: cursor.direction,
      timestamp: cursor.timestamp
    };
  }

  /**
   * 🏗️ BUILD QUERY CONDITIONS
   */
  buildQueryConditions(
    cursor: Cursor | undefined,
    orderBy: string,
    orderDirection: 'asc' | 'desc'
  ): Record<string, any> {
    if (!cursor) {
      return {};
    }

    const { value, direction } = cursor;
    const conditions: Record<string, any> = {};

    if (direction === 'after') {
      if (orderDirection === 'desc') {
        conditions[`${orderBy}.lt`] = value;
      } else {
        conditions[`${orderBy}.gt`] = value;
      }
    } else if (direction === 'before') {
      if (orderDirection === 'desc') {
        conditions[`${orderBy}.gt`] = value;
      } else {
        conditions[`${orderBy}.lt`] = value;
      }
    }

    // Add timestamp condition if available
    if (cursor.timestamp && this.config.timestampField) {
      const timestampCondition = direction === 'after' ? 'lt' : 'gt';
      conditions[`${this.config.timestampField}.${timestampCondition}`] = new Date(cursor.timestamp).toISOString();
    }

    return conditions;
  }

  /**
   * 📊 GET PAGINATION STATS
   */
  getPaginationStats(): {
    defaultLimit: number;
    maxLimit: number;
    cursorField: string;
    timestampField?: string;
  } {
    return {
      defaultLimit: this.config.defaultLimit,
      maxLimit: this.config.maxLimit,
      cursorField: this.config.cursorField,
      timestampField: this.config.timestampField
    };
  }

  /**
   * 🔧 UPDATE CONFIG
   */
  updateConfig(newConfig: Partial<CursorPaginationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    log.debug('Utils', `🔧 [CursorPagination] Config updated:`, this.config);
  }
}

/**
 * 🎯 PAGINATION HELPERS
 */

/**
 * Create a paginated query for Supabase
 */
export function createSupabasePaginatedQuery<T>(
  supabaseQuery: any,
  options: PaginationOptions = {}
) {
  return async (queryOptions: any): Promise<T[]> => {
    const {
      limit,
      orderBy,
      orderDirection,
      filters,
      cursor
    } = queryOptions;

    let query = supabaseQuery;

    // Apply filters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    // Apply cursor conditions
    const cursorPagination = CursorPagination.getInstance();
    const cursorConditions = cursorPagination.buildQueryConditions(cursor, orderBy, orderDirection);
    
    Object.entries(cursorConditions).forEach(([key, value]) => {
      const [field, operator] = key.split('.');
      if (operator === 'lt') {
        query = query.lt(field, value);
      } else if (operator === 'gt') {
        query = query.gt(field, value);
      }
    });

    // Apply ordering
    query = query.order(orderBy, { ascending: orderDirection === 'asc' });

    // Apply limit
    query = query.limit(limit);

    const { data, error } = await query;
    
    if (error) {
      throw error;
    }

    return data || [];
  };
}

/**
 * Create a paginated query for generic data
 */
export function createGenericPaginatedQuery<T>(
  data: T[],
  options: PaginationOptions = {}
) {
  return async (queryOptions: any): Promise<T[]> => {
    const {
      limit,
      orderBy,
      orderDirection,
      filters,
      cursor
    } = queryOptions;

    let filteredData = [...data];

    // Apply filters
    if (filters) {
      filteredData = filteredData.filter(item => {
        return Object.entries(filters).every(([key, value]) => {
          return (item as any)[key] === value;
        });
      });
    }

    // Apply cursor conditions
    if (cursor) {
      const cursorPagination = CursorPagination.getInstance();
      const cursorConditions = cursorPagination.buildQueryConditions(cursor, orderBy, orderDirection);
      
      filteredData = filteredData.filter(item => {
        return Object.entries(cursorConditions).every(([key, value]) => {
          const [field, operator] = key.split('.');
          const itemValue = (item as any)[field];
          
          if (operator === 'lt') {
            return itemValue < value;
          } else if (operator === 'gt') {
            return itemValue > value;
          }
          return true;
        });
      });
    }

    // Apply ordering
    filteredData.sort((a, b) => {
      const aValue = (a as any)[orderBy];
      const bValue = (b as any)[orderBy];
      
      if (orderDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Apply limit
    return filteredData.slice(0, limit);
  };
}

// Export singleton instance
export const cursorPagination = CursorPagination.getInstance();

// Export class for testing
export { CursorPagination };

// Export types
export type { Cursor, PaginationOptions, PaginatedResult, CursorPaginationConfig };
