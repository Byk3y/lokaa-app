import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
        const { data, error } = await supabase.rpc('user_activity_by_month', {
          user_id_input: userId,
          start_date: startOfYear,
        });
        if (error) throw error;
        if (!Array.isArray(data)) {
          setError('Unexpected data format from activity RPC');
          console.error('user_activity_by_month returned non-array:', data);
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
        console.error('Error fetching activity data:', err);
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
    <div className="bg-white rounded-2xl shadow border border-gray-100 p-6 mb-4 w-full max-w-xl">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-sm text-gray-500 font-medium mb-1">Activity</div>
          <div className="text-4xl font-bold text-gray-900">{currentValue}</div>
          <div className="text-sm mt-1">
            <span className="text-green-600 font-semibold">+{change}%</span>
            <span className="text-gray-400 ml-1">from last year</span>
          </div>
        </div>
        <div>
          <select
            className="bg-gray-100 rounded-lg px-3 py-1 text-sm text-gray-700 border-none focus:ring-2 focus:ring-blue-200"
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
        <div className="h-40 flex items-center justify-center text-gray-400">Loading...</div>
      ) : error ? (
        <div className="h-40 flex items-center justify-center text-red-400">{error}</div>
      ) : (
        <div className="relative mt-6 mb-2 h-40 flex items-end">
          {/* Average label (move to top left above chart) */}
          <span className="absolute left-0 top-0 bg-gray-900 text-white text-xs px-2 py-0.5 rounded shadow z-20" style={{ fontSize: '11px', transform: 'translateY(-120%)' }}>
            Avg {average}
          </span>
          {/* Average line */}
          <div className="absolute left-0 right-0 flex items-center" style={{ bottom: `${(average / Math.max(...activityData, 1)) * 100}%`, top: 'auto' }}>
            <div className="w-full border-t border-dotted border-gray-300 relative"></div>
          </div>
          {/* Bars */}
          <div className="flex w-full h-full items-end gap-2 z-10">
            {activityData.map((val, i) => (
              <div key={months[i]} className="flex flex-col items-center justify-end h-full">
                <div
                  className={`rounded-t-lg w-7 flex items-end justify-center relative transition-all duration-200 ${i === highlightIndex ? 'bg-blue-500' : 'bg-blue-100'}`}
                  style={{ height: `${val * 2}px` }}
                >
                  {i === highlightIndex && val > 0 && (
                    <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-0.5 rounded shadow" style={{ fontSize: '11px' }}>{val}</span>
                  )}
                </div>
                <span className="text-xs text-gray-400 mt-2">{months[i]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityBarChart; 