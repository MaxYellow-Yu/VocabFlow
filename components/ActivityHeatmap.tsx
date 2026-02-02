import React, { useMemo } from 'react';

interface ActivityHeatmapProps {
  data: Record<string, number>; // "YYYY-MM-DD": count
}

interface DayData {
  date: string;
  count: number;
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ data }) => {
  // Generate last 365 days
  const calendarData = useMemo<DayData[]>(() => {
    const today = new Date();
    // Adjust to Beijing time for consistency with storage if needed, 
    // but here we just need relative days ending today.
    const days: DayData[] = [];
    // Go back 52 weeks * 7 days roughly
    for (let i = 364; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      
      // We rely on the storage service effectively passing dates that match YYYY-MM-DD
      // Note: The storage uses Beijing time, here we use local browser time for day generation.
      // Ideally, we'd sync timezones, but for visual purposes, local date string usually suffices
      // provided the user doesn't travel across date line frequently. 
      // For strict correctness, we'd need a date-fns library, but keeping it dependency-free.
      
      // Let's ensure dateStr matches the format stored (YYYY-MM-DD)
      // We manually construct YYYY-MM-DD to avoid timezone shifts of toISOString
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;

      days.push({
        date: formattedDate,
        count: data[formattedDate] || 0
      });
    }
    return days;
  }, [data]);

  // GitHub colors (approximate)
  const getColor = (count: number) => {
    if (count === 0) return 'bg-gray-100'; // No contribution
    if (count <= 5) return 'bg-green-200'; // Low
    if (count <= 15) return 'bg-green-400'; // Medium
    if (count <= 30) return 'bg-green-600'; // High
    return 'bg-green-800'; // Very High
  };

  const getTooltip = (date: string, count: number) => {
    return `${count} words on ${date}`;
  };

  // Group by weeks for the grid
  const weeks: DayData[][] = [];
  let currentWeek: DayData[] = [];
  
  calendarData.forEach((day, index) => {
    currentWeek.push(day);
    if (currentWeek.length === 7 || index === calendarData.length - 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  return (
    <div className="flex flex-col items-center w-full">
      <div className="flex gap-1 overflow-x-auto pb-2 w-full justify-start md:justify-center">
        {weeks.map((week, wIndex) => (
          <div key={wIndex} className="flex flex-col gap-1">
            {week.map((day) => (
              <div
                key={day.date}
                className={`w-3 h-3 rounded-sm ${getColor(day.count)} transition-colors hover:ring-2 hover:ring-gray-400 cursor-pointer`}
                title={getTooltip(day.date, day.count)}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-4 text-xs text-gray-500 self-end">
        <span>Less</span>
        <div className="w-3 h-3 bg-gray-100 rounded-sm" />
        <div className="w-3 h-3 bg-green-200 rounded-sm" />
        <div className="w-3 h-3 bg-green-400 rounded-sm" />
        <div className="w-3 h-3 bg-green-600 rounded-sm" />
        <div className="w-3 h-3 bg-green-800 rounded-sm" />
        <span>More</span>
      </div>
    </div>
  );
};