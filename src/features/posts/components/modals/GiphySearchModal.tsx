import React, { forwardRef } from 'react';
import { Grid } from '@giphy/react-components';
import { Search } from 'lucide-react';
import './GiphySearchModal.css';

interface GiphySearchModalProps {
  searchTerm: string;
  onSearchChange: (searchTerm: string) => void;
  fetchGifs: (offset: number) => Promise<any>;
  fetchGifsByCategory: (category: string, offset: number) => Promise<any>;
  onGifSelect: (gif: any) => void;
  visible: boolean;
  activeCategory: string;
  onClose?: () => void;
  standalone?: boolean; // Whether this modal should render its own backdrop
}

/**
 * Giphy search modal for selecting GIFs - Redesigned to match Skool's clean design
 */
export const GiphySearchModal = forwardRef<HTMLDivElement, GiphySearchModalProps>(
  function GiphySearchModal({ 
    searchTerm, 
    onSearchChange, 
    fetchGifs, 
    fetchGifsByCategory, 
    onGifSelect, 
    visible, 
    activeCategory,
    onClose,
    standalone = true
  }, ref) {
    if (!visible) return null;
    
    const modalContent = (
      <div className="bg-white rounded-2xl shadow-2xl w-[281px] h-[396px] overflow-hidden flex flex-col">
        {/* Search Header */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input 
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              autoFocus
            />
          </div>
        </div>
        
        {/* GIF Grid Container */}
        <div className="p-3 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <div className="gif-grid-container">
          {searchTerm.trim() ? (
            <Grid 
              key={`search-${searchTerm}`}
              fetchGifs={fetchGifs}
                width={257} // 281 - 24px padding
                columns={2}
                gutter={8}
              noLink={true}
              hideAttribution={true}
              onGifClick={onGifSelect}
            />
          ) : (
            <Grid 
              key={`category-${activeCategory}`}
              fetchGifs={(offset) => fetchGifsByCategory(activeCategory, offset)}
                width={257} // 281 - 24px padding
                columns={2}
                gutter={8}
              noLink={true}
              hideAttribution={true}
              onGifClick={onGifSelect}
              />
            )}
          </div>
        </div>
        
        {/* Footer with GIPHY branding */}
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center justify-center">
            <span className="text-xs text-gray-500 font-medium tracking-wide">
              POWERED BY{' '}
              <span className="font-bold text-gray-700">GIPHY</span>
            </span>
          </div>
        </div>
      </div>
    );

    if (standalone) {
      // Standalone version with backdrop for use outside of other modals
      return (
        <div 
          ref={ref}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={(e) => {
            // Close on backdrop click
            if (e.target === e.currentTarget && onClose) {
              onClose();
            }
          }}
        >
          {modalContent}
        </div>
      );
    }

    // Embedded version without backdrop for use inside other modals
    return (
      <div 
        ref={ref}
        className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none"
        onClick={(e) => {
          // Close on backdrop click
          if (e.target === e.currentTarget && onClose) {
            onClose();
          }
        }}
      >
        <div 
          className="pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {modalContent}
        </div>
      </div>
    );
  }
); 