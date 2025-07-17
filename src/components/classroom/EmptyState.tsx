import React from 'react';
import { motion } from 'framer-motion';
import { Search, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  searchTerm: string;
  onClearSearch: () => void;
}

export function EmptyState({ searchTerm, onClearSearch }: EmptyStateProps) {
  if (searchTerm) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="col-span-full flex flex-col items-center justify-center py-12 text-center"
      >
        <div className="bg-gray-100 rounded-full p-4 mb-4">
          <Search className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          No courses found
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          No courses match your search for "{searchTerm}"
        </p>
        <Button 
          variant="outline" 
          size="sm"
          onClick={onClearSearch}
        >
          Clear Search
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="col-span-full flex flex-col items-center justify-center py-12 text-center"
    >
      <div className="bg-gray-100 rounded-full p-4 mb-4">
        <GraduationCap className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">
        No courses available
      </h3>
      <p className="text-sm text-gray-600">
        There are no courses in this space yet. Check back later!
      </p>
    </motion.div>
  );
} 