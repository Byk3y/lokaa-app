import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PostsPaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  postsPerPage: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export const PostsPagination: React.FC<PostsPaginationProps> = ({
  currentPage,
  totalPages,
  totalCount,
  postsPerPage,
  onPageChange,
  isLoading = false,
}) => {
  // Don't show pagination if there's only one page or less
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * postsPerPage + 1;
  const endItem = Math.min(currentPage * postsPerPage, totalCount);

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageClick = (page: number) => {
    if (page !== currentPage) {
      onPageChange(page);
    }
  };

  // Generate page numbers to show (max 5 pages visible)
  const getVisiblePages = () => {
    const delta = 2; // Number of pages to show on each side of current page
    const pages: number[] = [];
    
    let start = Math.max(1, currentPage - delta);
    let end = Math.min(totalPages, currentPage + delta);
    
    // Adjust if we're near the beginning or end
    if (end - start < 4) {
      if (start === 1) {
        end = Math.min(totalPages, start + 4);
      } else if (end === totalPages) {
        start = Math.max(1, end - 4);
      }
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  const visiblePages = getVisiblePages();

  return (
    <div 
      className="flex items-center justify-between py-6 border-t border-gray-200 bg-white rounded-lg"
      style={{ 
        width: '768px',
        minWidth: '768px',
        maxWidth: '768px'
      }}
    >
      {/* Left side - Previous button */}
      <button
        onClick={handlePrevious}
        disabled={currentPage === 1 || isLoading}
        className={cn(
          "flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors",
          currentPage === 1 || isLoading
            ? "text-gray-400 cursor-not-allowed"
            : "text-gray-700 hover:text-teal-700 hover:bg-teal-50"
        )}
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        Previous
      </button>

      {/* Center - Page numbers and count display */}
      <div className="flex items-center space-x-4">
        {/* Page numbers */}
        <div className="flex items-center space-x-1">
          {visiblePages.map((page) => (
            <button
              key={page}
              onClick={() => handlePageClick(page)}
              disabled={isLoading}
              className={cn(
                "px-3 py-2 text-sm font-medium rounded-md transition-colors min-w-[40px] flex items-center justify-center",
                page === currentPage
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-gray-700 hover:text-teal-700 hover:bg-teal-50",
                isLoading && "cursor-not-allowed opacity-50"
              )}
            >
              {page}
            </button>
          ))}
        </div>

        {/* Count display */}
        <span className="text-sm text-gray-600 whitespace-nowrap">
          {startItem}-{endItem} of {totalCount}
        </span>
      </div>

      {/* Right side - Next button */}
      <button
        onClick={handleNext}
        disabled={currentPage >= totalPages || isLoading}
        className={cn(
          "flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors",
          currentPage >= totalPages || isLoading
            ? "text-gray-400 cursor-not-allowed"
            : "text-gray-700 hover:text-teal-700 hover:bg-teal-50"
        )}
      >
        Next
        <ChevronRight className="w-4 h-4 ml-1" />
      </button>
    </div>
  );
};

export default PostsPagination; 