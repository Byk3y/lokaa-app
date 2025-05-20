import React from 'react';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

interface CalendarControlsProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
}

export const CalendarControls: React.FC<CalendarControlsProps> = ({
  currentDate,
  setCurrentDate,
}) => {
  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="p-1">
      <div className="flex items-center justify-between mb-3">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handlePreviousMonth} 
          aria-label="Previous month" 
          className="hover:bg-gray-100 p-2 w-9 h-9 transition-colors duration-150 ease-in-out"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </Button>
        <h2 className="text-md font-semibold text-gray-700">
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h2>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleNextMonth} 
          aria-label="Next month" 
          className="hover:bg-gray-100 p-2 w-9 h-9 transition-colors duration-150 ease-in-out"
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </Button>
      </div>
      <Button variant="outline" onClick={handleToday} className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 py-2 transition-colors duration-150 ease-in-out">
        <Calendar className="mr-2 h-4 w-4" /> Today
      </Button>
    </div>
  );
}; 