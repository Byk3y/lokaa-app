import React from 'react';
import { Calendar, Clock } from 'lucide-react';

interface UpcomingActivityCardProps {
  title?: string;
  eventTitle?: string;
  description?: string;
  startTime?: string;
  className?: string;
}

/**
 * A decorative component that shows upcoming activity in a frosted glass card,
 * inspired by the ChronoTask Reminders design.
 */
export default function UpcomingActivityCard({
  title = "Upcoming Activity",
  eventTitle = "Weekly AMA",
  description = "Q&A with the Founder",
  startTime = "18:00 WAT",
  className = ""
}: UpcomingActivityCardProps) {
  return (
    <div className={`relative w-[280px] h-[200px] ${className}`}>
      {/* Main Card with Frosted Glass Effect */}
      <div
        className="absolute inset-0 rounded-2xl shadow-lg"
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(224, 224, 224, 0.3)',
          transform: 'rotate(2deg)',
        }}
      >
        {/* Tab at the top */}
        <div
          className="absolute -top-2 left-8 w-20 h-6 rounded-t-lg"
          style={{
            background: 'rgba(255, 255, 255, 0.9)',
            border: '1px solid rgba(224, 224, 224, 0.3)',
            borderBottom: 'none',
          }}
        />
        
        {/* Card Content */}
        <div className="p-6 h-full flex flex-col">
          {/* Header with title and icon */}
          <div className="flex items-center justify-between mb-4">
            <h3 
              className="text-gray-600 font-semibold"
              style={{ fontSize: '16px' }}
            >
              {title}
            </h3>
            <Calendar className="w-5 h-5 text-gray-400" />
          </div>
          
          {/* Event Title */}
          <h4 
            className="text-gray-900 font-medium mb-2"
            style={{ fontSize: '18px' }}
          >
            {eventTitle}
          </h4>
          
          {/* Description */}
          <p 
            className="text-gray-500 mb-4 flex-1"
            style={{ fontSize: '14px' }}
          >
            {description}
          </p>
          
          {/* Time Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-teal-600" />
              <span 
                className="text-teal-600 font-medium px-3 py-1 rounded-full"
                style={{ 
                  fontSize: '13px',
                  background: 'rgba(0, 191, 165, 0.1)',
                  border: '1px solid rgba(0, 191, 165, 0.2)'
                }}
              >
                {startTime}
              </span>
            </div>
          </div>
        </div>
        
        {/* Subtle bottom shadow layer */}
        <div
          className="absolute -bottom-1 -right-1 w-full h-full rounded-2xl -z-10"
          style={{
            background: 'rgba(0, 0, 0, 0.05)',
            filter: 'blur(4px)',
          }}
        />
      </div>
    </div>
  );
} 