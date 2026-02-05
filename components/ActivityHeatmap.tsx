import React, { useMemo, useState, useEffect } from 'react';
import { Icon } from './Icon';

interface ActivityHeatmapProps {
  data: Record<string, number>; // "YYYY-MM-DD": count
}

interface DayData {
  date: string;
  count: number;
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ data }) => {
  const [selectedDay, setSelectedDay] = useState<{ date: string; count: number } | null>(null);
  // Track the end date of the current view (default to today)
  const [viewEndDate, setViewEndDate] = useState<Date>(new Date());

  // Generate grid data covering approx 6 months (26 weeks) ending at viewEndDate
  const { weeks, monthLabels } = useMemo(() => {
    // Determine the anchor end date (ensure we don't go into the future beyond today if navigating)
    const today = new Date();
    const effectiveEndDate = viewEndDate > today ? today : viewEndDate;
    
    // We want 26 weeks (approx 6 months)
    const weeksToShow = 26;
    
    // Calculate start date: End Date - (weeks * 7 days)
    const startDate = new Date(effectiveEndDate);
    startDate.setDate(effectiveEndDate.getDate() - (weeksToShow * 7));

    // Align start date to the previous Sunday to ensure grid starts with a proper column
    const dayOfWeek = startDate.getDay(); // 0 is Sunday
    startDate.setDate(startDate.getDate() - dayOfWeek);

    const generatedWeeks: DayData[][] = [];
    const generatedMonthLabels: { index: number; label: string }[] = [];
    
    let currentWeek: DayData[] = [];
    let currentDate = new Date(startDate);
    
    // Generate exactly weeksToShow columns + 1 buffer to handle the partial week at the end
    for (let w = 0; w <= weeksToShow; w++) {
        for (let d = 0; d < 7; d++) {
            // Format YYYY-MM-DD manually
            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const dayStr = String(currentDate.getDate()).padStart(2, '0');
            const formattedDate = `${year}-${month}-${dayStr}`;
            
            // Do not render future squares if we are at the "Today" view end
            const isFuture = currentDate > today;

            currentWeek.push({
                date: formattedDate,
                count: isFuture ? -1 : (data[formattedDate] || 0) // -1 indicates future/invalid
            });
            
            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // Only push the week if it has at least one valid day (not all future)
        // actually for grid consistency we push it, but render invisible if future
        generatedWeeks.push(currentWeek);

        // Check for month change to add label
        // We label a month if this week contains the 1st of the month OR if it's the first week and we need a label
        const firstDayOfWeek = currentWeek[0];
        const lastDayOfWeek = currentWeek[6];
        
        // Get English Month Name
        const monthName = new Date(firstDayOfWeek.date).toLocaleString('en-US', { month: 'short' });

        if (w === 0) {
             generatedMonthLabels.push({ index: w, label: monthName });
        } else {
             const prevWeekMonth = parseInt(generatedWeeks[w-1][0].date.split('-')[1]);
             const currWeekMonth = parseInt(firstDayOfWeek.date.split('-')[1]);
             if (currWeekMonth !== prevWeekMonth) {
                 generatedMonthLabels.push({ index: w, label: monthName });
             }
        }

        currentWeek = [];
    }

    return { weeks: generatedWeeks, monthLabels: generatedMonthLabels };
  }, [data, viewEndDate]);

  // GitHub colors
  const getColor = (count: number) => {
    if (count === -1) return 'invisible'; // Future days
    if (count === 0) return 'bg-gray-100';
    if (count <= 2) return 'bg-emerald-200';
    if (count <= 5) return 'bg-emerald-300';
    if (count <= 10) return 'bg-emerald-500';
    return 'bg-emerald-700';
  };

  const handleDayClick = (day: DayData) => {
    if (day.count !== -1) {
      setSelectedDay(day);
    }
  };

  const handlePrevPage = () => {
    const newDate = new Date(viewEndDate);
    newDate.setMonth(newDate.getMonth() - 6);
    setViewEndDate(newDate);
  };

  const handleNextPage = () => {
    const today = new Date();
    const newDate = new Date(viewEndDate);
    newDate.setMonth(newDate.getMonth() + 6);
    
    if (newDate > today) {
        setViewEndDate(today);
    } else {
        setViewEndDate(newDate);
    }
  };

  const isLatest = () => {
      const today = new Date();
      // If viewEndDate is same month/year as today
      return viewEndDate.getMonth() === today.getMonth() && viewEndDate.getFullYear() === today.getFullYear();
  };

  return (
    <div className="flex flex-col items-center w-full max-w-full">
      {/* Selected Day Info */}
      <div className="h-8 mb-2 flex items-center justify-center text-sm font-medium text-gray-700">
         {selectedDay ? (
            <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full animate-in fade-in">
                <Icon name="calendar_today" className="text-xs text-gray-400" />
                <span>{selectedDay.date}</span>
                <span className="w-1 h-1 bg-gray-300 rounded-full mx-1"></span>
                <span className={selectedDay.count > 0 ? "text-emerald-600 font-bold" : "text-gray-500"}>
                    {selectedDay.count} words
                </span>
            </div>
         ) : (
            <span className="text-gray-400 text-xs">Tap a square to view details</span>
         )}
      </div>

      <div className="flex items-start gap-2 w-full">
        {/* Prev Button */}
        <button 
            onClick={handlePrevPage}
            className="mt-8 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 p-1 rounded-full transition-colors"
        >
            <Icon name="chevron_left" />
        </button>

        {/* Chart Container */}
        <div className="flex flex-row flex-1 overflow-hidden justify-center">
            {/* Weekday Labels (Left Column) */}
            <div className="flex flex-col gap-[3px] pr-2 pt-[18px] text-[10px] text-gray-400 font-medium">
                <div className="h-[10px] leading-[10px] opacity-0">Sun</div>
                <div className="h-[10px] leading-[10px]">Mon</div>
                <div className="h-[10px] leading-[10px] opacity-0">Tue</div>
                <div className="h-[10px] leading-[10px]">Wed</div>
                <div className="h-[10px] leading-[10px] opacity-0">Thu</div>
                <div className="h-[10px] leading-[10px]">Fri</div>
                <div className="h-[10px] leading-[10px] opacity-0">Sat</div>
            </div>

            {/* Grid Scroll Area */}
            <div className="overflow-x-auto no-scrollbar relative px-1">
                <div className="min-w-max">
                    {/* Month Labels */}
                    <div className="flex h-[18px] relative mb-1">
                        {monthLabels.map((m, i) => (
                            <div 
                                key={i} 
                                className="absolute text-[10px] text-gray-400 font-medium whitespace-nowrap"
                                style={{ left: `${m.index * 13}px` }} 
                            >
                                {m.label}
                            </div>
                        ))}
                    </div>

                    {/* The Grid - Added padding to container to prevent ring clipping */}
                    <div className="flex gap-[3px] p-[2px]">
                        {weeks.map((week, wIndex) => (
                        <div key={wIndex} className="flex flex-col gap-[3px]">
                            {week.map((day) => (
                            <div
                                key={day.date}
                                onClick={() => handleDayClick(day)}
                                className={`w-[10px] h-[10px] rounded-[2px] ${getColor(day.count)} transition-all ${day.count !== -1 ? 'hover:opacity-80 cursor-pointer' : ''} ${selectedDay?.date === day.date ? 'ring-2 ring-gray-400 ring-offset-1 z-10' : ''}`}
                            />
                            ))}
                        </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {/* Next Button */}
        <button 
            onClick={handleNextPage}
            disabled={isLatest()}
            className={`mt-8 p-1 rounded-full transition-colors ${isLatest() ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:text-indigo-600 hover:bg-gray-100'}`}
        >
            <Icon name="chevron_right" />
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-4 text-[10px] text-gray-400 self-end">
        <span>Less</span>
        <div className="w-[10px] h-[10px] bg-gray-100 rounded-[2px]" />
        <div className="w-[10px] h-[10px] bg-emerald-200 rounded-[2px]" />
        <div className="w-[10px] h-[10px] bg-emerald-300 rounded-[2px]" />
        <div className="w-[10px] h-[10px] bg-emerald-500 rounded-[2px]" />
        <div className="w-[10px] h-[10px] bg-emerald-700 rounded-[2px]" />
        <span>More</span>
      </div>
    </div>
  );
};