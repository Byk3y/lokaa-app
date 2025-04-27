import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CalendarTabProps {
  space: {
    id: string;
    name: string;
  };
}

export default function CalendarTab({ space }: CalendarTabProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<{ date: Date; title: string; type: string }[]>([]);
  
  // Function to generate calendar days
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // Get first day of month and total days in month
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Get day of week of first day (0 = Sunday, 6 = Saturday)
    const firstDayOfWeek = firstDayOfMonth.getDay();
    
    // Create array of days
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };
  
  // Function to go to previous month
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  
  // Function to go to next month
  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };
  
  // Helper function to format date
  const formatMonth = (date: Date) => {
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };
  
  // Check if a date has events
  const hasEvents = (date: Date) => {
    if (!date) return false;
    return events.some(event => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };
  
  // Generate array of weekday names
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Generate calendar days
  const days = generateCalendarDays();
  
  return (
    <div className="flex-1 space-y-6">
      {/* Calendar Header */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-xl shadow-[0_4px_6px_rgba(0,0,0,0.1),0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden"
      >
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-[#26A69A] mr-2" />
            <h2 className="text-lg font-medium text-[#37474F]">Calendar</h2>
          </div>
          
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button 
              className="bg-[#26A69A] hover:bg-[#FF6F61] text-white rounded-xl flex items-center transition-colors"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              New Event
            </Button>
          </motion.div>
        </div>
      </motion.div>
      
      {/* Month Navigation and Calendar */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-white rounded-xl shadow-[0_4px_6px_rgba(0,0,0,0.1),0_1px_3px_rgba(0,0,0,0.08)]"
      >
        {/* Month Navigation */}
        <div className="p-4 border-b border-[#E0F2F1] flex items-center justify-between">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={goToPreviousMonth}
            className="h-8 w-8 rounded-full bg-[#F5FAFA] flex items-center justify-center text-[#26A69A] hover:bg-[#E0F2F1] transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </motion.button>
          
          <h3 className="text-[#37474F] font-medium">
            {formatMonth(currentMonth)}
          </h3>
          
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={goToNextMonth}
            className="h-8 w-8 rounded-full bg-[#F5FAFA] flex items-center justify-center text-[#26A69A] hover:bg-[#E0F2F1] transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </motion.button>
        </div>
        
        {/* Calendar Grid */}
        <div className="p-4">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 mb-2">
            {weekdays.map((day, index) => (
              <div key={index} className="text-center py-2 text-sm font-medium text-[#78909C]">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => (
              <motion.div 
                key={index}
                whileHover={day ? { scale: 1.05, backgroundColor: "#F5FAFA" } : {}}
                className={`
                  aspect-square rounded-lg flex flex-col items-center justify-center p-1
                  ${day ? 'cursor-pointer' : ''}
                  ${day && day.getDate() === new Date().getDate() && 
                    day.getMonth() === new Date().getMonth() && 
                    day.getFullYear() === new Date().getFullYear() 
                    ? 'bg-[#E0F2F1] border border-[#26A69A]' 
                    : 'hover:bg-[#F5FAFA]'}
                `}
              >
                {day && (
                  <>
                    <span className={`
                      text-sm font-medium 
                      ${hasEvents(day) ? 'text-[#26A69A]' : 'text-[#37474F]'}
                    `}>
                      {day.getDate()}
                    </span>
                    
                    {hasEvents(day) && (
                      <div className="h-1.5 w-1.5 rounded-full bg-[#26A69A] mt-1"></div>
                    )}
                  </>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
      
      {/* Events List - Empty State */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="bg-gradient-to-br from-[#E0F2F1] to-[#B2DFDB] rounded-xl shadow-[0_4px_6px_rgba(0,0,0,0.1),0_1px_3px_rgba(0,0,0,0.08)] p-6 text-center"
      >
        <div className="bg-white/70 backdrop-blur-sm rounded-lg p-6 max-w-md mx-auto">
          <div className="h-14 w-14 mx-auto bg-[#F5FAFA] rounded-full flex items-center justify-center mb-4">
            <Calendar className="h-7 w-7 text-[#26A69A]" />
          </div>
          <h3 className="text-lg font-medium text-[#37474F] mb-2">No events scheduled</h3>
          <p className="text-[#78909C] mb-4">
            Create your first event to connect with your community and plan activities together.
          </p>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            className="inline-block"
          >
            <Button 
              className="bg-[#26A69A] hover:bg-[#FF6F61] text-white font-medium rounded-xl px-6 transition-colors"
            >
              Schedule Event
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
} 