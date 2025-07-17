import React, { memo } from 'react';
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface ClassroomHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  primaryColor: string;
}

export const ClassroomHeader = memo<ClassroomHeaderProps>(({
  searchQuery,
  onSearchChange,
  primaryColor
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center">
          <h2 className="text-xl font-semibold text-[#37474F]">Courses</h2>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-4 py-2 text-sm border-gray-300 focus:border-primary focus:ring-primary rounded-md shadow-sm"
            style={{ 
              '--tw-ring-color': primaryColor,
              borderColor: searchQuery ? primaryColor : undefined
            } as React.CSSProperties}
          />
        </div>
      </div>
    </div>
  );
});

ClassroomHeader.displayName = 'ClassroomHeader'; 