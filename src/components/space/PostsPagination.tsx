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
      className="!flex !flex-row !items-center !justify-between gap-2 py-4 px-2 sm:px-4 border-t border-gray-200 bg-white rounded-lg w-full md:w-[768px] max-w-full overflow-hidden"
      style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
    >
      {/* Previous button */}
      <button
        onClick={handlePrevious}
        disabled={currentPage === 1 || isLoading}
        className={cn(
          "flex items-center px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors flex-shrink-0",
          currentPage === 1 || isLoading
            ? "text-gray-400 cursor-not-allowed"
            : "text-gray-700 hover:text-teal-700 hover:bg-teal-50"
        )}
      >
        <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5" />
        <span className="hidden xs:inline text-xs">Prev</span>
      </button>

      {/* Center - Page numbers and count display */}
      <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1 justify-center">
        {/* Page numbers */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          {visiblePages.map((page) => (
            <button
              key={page}
              onClick={() => handlePageClick(page)}
              disabled={isLoading}
              className={cn(
                "px-1.5 sm:px-2 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded transition-colors min-w-[24px] sm:min-w-[32px] flex items-center justify-center flex-shrink-0",
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

        {/* Count display - more compact */}
        <span className="hidden sm:inline text-xs text-gray-600 whitespace-nowrap flex-shrink-0 ml-1">
          {startItem}-{endItem} of {totalCount}
        </span>
      </div>

      {/* Next button */}
      <button
        onClick={handleNext}
        disabled={currentPage >= totalPages || isLoading}
        className={cn(
          "flex items-center px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors flex-shrink-0",
          currentPage >= totalPages || isLoading
            ? "text-gray-400 cursor-not-allowed"
            : "text-gray-700 hover:text-teal-700 hover:bg-teal-50"
        )}
      >
        <span className="hidden xs:inline text-xs">Next</span>
        <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 ml-0.5" />
      </button>
    </div>
  );
};

export default PostsPagination; 