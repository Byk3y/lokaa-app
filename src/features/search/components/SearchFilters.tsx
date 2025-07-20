import React, { useState, useEffect } from 'react';
import { Calendar, User, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getSupabaseClient } from '@/integrations/supabase/client';
import type { SearchFilters } from '../types';

interface SearchFiltersProps {
  filters: SearchFilters;
  onChange: (filters: Partial<SearchFilters>) => void;
  spaceId: string;
  onClose?: () => void;
}

export function SearchFilters({ filters, onChange, spaceId, onClose }: SearchFiltersProps) {
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = getSupabaseClient();

  useEffect(() => {
    loadCategories();
  }, [spaceId]);

  const loadCategories = async () => {
    if (!spaceId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, icon')
        .eq('space_id', spaceId)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    onChange({ [key]: value });
  };

  const clearAllFilters = () => {
    onChange({
      category_id: undefined,
      date_from: undefined,
      date_to: undefined,
      sort_by: 'relevance'
    });
  };

  const hasActiveFilters = filters.category_id || filters.date_from || filters.date_to;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-full max-w-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Filter Results</h3>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-gray-500 hover:text-gray-700"
            >
              Clear All
            </Button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X size={16} className="text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Category Filter */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Tag size={14} className="inline mr-1" />
          Category
        </label>
        <select
          value={filters.category_id || ''}
          onChange={(e) => handleFilterChange('category_id', e.target.value || undefined)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-lokaa-500 focus:border-transparent"
          disabled={isLoading}
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.icon && `${category.icon} `}{category.name}
            </option>
          ))}
        </select>
      </div>

      {/* Date Range Filter */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Calendar size={14} className="inline mr-1" />
          Date Range
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <Input
              type="date"
              value={filters.date_from || ''}
              onChange={(e) => handleFilterChange('date_from', e.target.value || undefined)}
              className="text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <Input
              type="date"
              value={filters.date_to || ''}
              onChange={(e) => handleFilterChange('date_to', e.target.value || undefined)}
              className="text-sm"
            />
          </div>
        </div>
      </div>

      {/* Sort Order */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sort By
        </label>
        <select
          value={filters.sort_by || 'relevance'}
          onChange={(e) => handleFilterChange('sort_by', e.target.value as any)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-lokaa-500 focus:border-transparent"
        >
          <option value="relevance">Relevance</option>
          <option value="date">Newest First</option>
          <option value="popularity">Most Popular</option>
        </select>
      </div>

      {/* Results Count Info */}
      <div className="text-xs text-gray-500 text-center">
        Filters help narrow down search results
      </div>
    </div>
  );
}