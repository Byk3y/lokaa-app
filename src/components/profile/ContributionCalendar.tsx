import React from 'react';

interface ContributionCalendarProps {
  userId: string;
}

// Generate placeholder data: last 12 weeks, random activity
const generateMockData = () => {
  const today = new Date();
  const days = 7 * 12; // 12 weeks
  const data: { date: Date; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    data.push({ date, count: Math.floor(Math.random() * 5) });
  }
  return data;
};

const activityData = generateMockData();

const getColor = (count: number) => {
  if (count === 0) return 'bg-gray-200';
  if (count === 1) return 'bg-green-100';
  if (count === 2) return 'bg-green-300';
  if (count === 3) return 'bg-green-400';
  if (count >= 4) return 'bg-green-600';
  return 'bg-gray-200';
};

const ContributionCalendar: React.FC<ContributionCalendarProps> = ({ userId }) => {
  // Group data by week
  const weeks: { date: Date; count: number }[][] = [];
  for (let i = 0; i < activityData.length; i += 7) {
    weeks.push(activityData.slice(i, i + 7));
  }

  return (
    <div className="bg-white rounded-2xl shadow border border-gray-100 p-6 mb-4">
      <h3 className="text-lg font-semibold mb-2">Activity</h3>
      <div className="overflow-x-auto">
        <div className="flex gap-1" style={{ minWidth: 320 }}>
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((day, di) => (
                <div
                  key={di}
                  className={`w-4 h-4 rounded ${getColor(day.count)} cursor-pointer transition-colors duration-200`}
                  title={`${day.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}: ${day.count} contribution${day.count !== 1 ? 's' : ''}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="text-xs text-gray-400 mt-2">Last 12 weeks</div>
    </div>
  );
};

export default ContributionCalendar; 