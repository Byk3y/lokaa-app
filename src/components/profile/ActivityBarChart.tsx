import { log } from '@/utils/logger';
import React, { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface ActivityBarChartProps {
  userId: string;
}

const ActivityBarChart: React.FC<ActivityBarChartProps> = ({ userId }) => {
  const [activityData, setActivityData] = useState<number[]>(Array(12).fill(0));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    const fetchActivity = async () => {
      setLoading(true);
      setError(null);
      try {
        const startOfYear = new Date(selectedYear, 0, 1).toISOString();
        const { data, error } = await getSupabaseClient().rpc('user_activity_by_month', {
          user_id_input: userId,
          start_date: startOfYear,
        });
        if (error) throw error;
        if (!Array.isArray(data)) {
          setError('Unexpected data format from activity RPC');
          log.error('Component', 'user_activity_by_month returned non-array:', data);
          setActivityData(Array(12).fill(0));
        } else {
          const monthMap: { [key: string]: number } = {};
          data.forEach((row: any) => {
            const monthIdx = new Date(row.month).getMonth();
            monthMap[monthIdx] = row.contributions;
          });
          const arr = Array(12).fill(0).map((_, i) => monthMap[i] || 0);
          setActivityData(arr);
        }
      } catch (err: any) {
        setError('Failed to load activity data');
        log.error('Component', 'Error fetching activity data:', err);
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchActivity();
  }, [userId, selectedYear]);

  // Calculate stats
  const total = activityData.reduce((a, b) => a + b, 0);
  const average = Math.round(total / 12);
  const highlightIndex = activityData.indexOf(Math.max(...activityData));
  const currentValue = total > 0 ? Math.round((total / 12) * 100) / 100 : 0;
  const change = 0; // Placeholder, can be calculated with previous year data

  // Allow user to select from current year and previous 4 years
  const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="w-full">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-3xl font-bold text-gray-900 flex items-center">
            {currentValue}
            <span className="ml-2 text-xs py-1 px-2 bg-blue-100 text-blue-700 rounded-full font-medium">
              <span className="text-green-600 font-semibold">+{change}%</span>
              <span className="text-gray-500 ml-1">from last year</span>
            </span>
          </div>
        </div>
        <div>
          <select
            className="bg-gray-100 rounded-lg px-3 py-1.5 text-sm text-gray-700 border-none focus:ring-2 focus:ring-blue-200 shadow-sm hover:bg-gray-200 transition-colors duration-150"
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
          >
            {yearOptions.map(year => (
              <option key={year} value={year}>{year === new Date().getFullYear() ? 'This year' : year}</option>
            ))}
          </select>
        </div>
      </div>
      {loading ? (
        <div className="h-44 flex items-center justify-center text-gray-400">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
            <div className="h-32 w-full bg-gray-100 rounded"></div>
          </div>
        </div>
      ) : error ? (
        <div className="h-44 flex items-center justify-center text-red-400 bg-red-50 rounded-lg p-4">
          <div>{error}</div>
        </div>
      ) : (
        <div className="relative mt-6 mb-4 h-44 flex items-end bg-gradient-to-b from-blue-50/30 to-transparent rounded-lg p-4">
          {/* Average label */}
          <div className="absolute left-4 top-0 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs px-3 py-1 rounded-full shadow-sm z-20" style={{ transform: 'translateY(-50%)' }}>
            Average: {average} contributions
          </div>
          {/* Average line */}
          <div 
            className="absolute left-0 right-0 flex items-center" 
            style={{ 
              bottom: `${(average / Math.max(...activityData, 1)) * 100}%`, 
              top: 'auto' 
            }}
          >
            <div className="w-full border-t border-dashed border-blue-300 relative">
              <div className="absolute right-4 -top-3 bg-white text-blue-600 text-xs px-1 rounded shadow-sm border border-blue-200">
                {average}
              </div>
            </div>
          </div>
          {/* Bars */}
          <div className="flex w-full h-full items-end gap-2 z-10 pt-6">
            {activityData.map((val, i) => {
              const height = val > 0 ? Math.max(val * 2, 4) : 0; // Ensure minimum height for non-zero values
              const isHighest = i === highlightIndex && val > 0;
              
              return (
                <div key={months[i]} className="flex flex-col items-center justify-end h-full flex-1 group">
                  <div
                    className={`rounded-lg w-full flex items-end justify-center relative transition-all duration-300 transform ${
                      isHighest 
                        ? 'bg-gradient-to-t from-blue-500 to-blue-400 shadow-lg' 
                        : 'bg-gradient-to-t from-blue-300 to-blue-200 group-hover:from-blue-400 group-hover:to-blue-300'
                    } hover:shadow-md group-hover:scale-105`}
                    style={{ height: `${height}px` }}
                  >
                    <span className={`absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded shadow transition-opacity duration-150 ${
                      isHighest ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}>
                      {val}
                    </span>
                  </div>
                  <span className={`text-xs mt-2 font-medium transition-colors duration-150 ${
                    isHighest ? 'text-blue-600' : 'text-gray-500 group-hover:text-blue-500'
                  }`}>
                    {months[i]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityBarChart; 