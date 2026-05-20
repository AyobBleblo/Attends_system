import { useMemo } from 'react';

/**
 * AttendanceHeatmap — GitHub-style 12-week × 7-day attendance calendar.
 * Props:
 *   data : { date: 'YYYY-MM-DD', count: number }[]
 *          — if omitted, falls back to generated demo data.
 *
 * TODO: Replace mock data with real API call when backend exposes
 *       /api/attendance/heatmap/?days=84
 */

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WEEKS = 12;

/** Map an attendance count to a Tailwind bg class */
const countToClass = (count) => {
  if (!count || count === 0) return 'bg-slate-100 dark:bg-slate-800';
  if (count < 5)  return 'bg-[#D4AF37]/20';
  if (count < 15) return 'bg-[#D4AF37]/50';
  if (count < 30) return 'bg-[#D4AF37]/75';
  return 'bg-[#D4AF37]';
};

/** Generate demo data for the last WEEKS*7 days */
const generateDemo = () => {
  const days = WEEKS * 7;
  const today = new Date();
  const result = {};
  for (let i = days; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    // Weekends low, weekdays higher
    const dow = d.getDay();
    const isWeekend = dow === 0 || dow === 6;
    result[key] = isWeekend ? Math.floor(Math.random() * 3) : Math.floor(Math.random() * 40);
  }
  return result;
};

const AttendanceHeatmap = ({ data }) => {
  const countMap = useMemo(() => {
    if (data && data.length > 0) {
      return Object.fromEntries(data.map(d => [d.date, d.count]));
    }
    return generateDemo();
  }, [data]);

  // Build grid: columns = weeks (oldest left), rows = days (Sun top)
  const today = new Date();
  // go back to start of the grid
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - (WEEKS * 7 - 1));
  // Align to Sunday
  startDate.setDate(startDate.getDate() - startDate.getDay());

  // Build week columns
  const weeks = [];
  let cursor = new Date(startDate);
  for (let w = 0; w < WEEKS; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const key = cursor.toISOString().slice(0, 10);
      week.push({ date: key, count: countMap[key] ?? 0, dayObj: new Date(cursor) });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  // Month labels (show when first day of month appears in a column)
  const monthLabels = weeks.map((week) => {
    const first = week[0].dayObj;
    // show month label if any cell in this week is the 1st
    const hasFirst = week.some(cell => cell.dayObj.getDate() === 1);
    if (hasFirst) {
      const cell = week.find(c => c.dayObj.getDate() === 1);
      return MONTHS[cell.dayObj.getMonth()];
    }
    return '';
  });

  const totalScans = Object.values(countMap).reduce((s, v) => s + (v || 0), 0);

  return (
    <div className="float-card p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Attendance Heatmap
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Last {WEEKS} weeks · {totalScans.toLocaleString()} total scans
          </p>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
          <span>Low</span>
          {['bg-slate-100 dark:bg-slate-800', 'bg-[#D4AF37]/20', 'bg-[#D4AF37]/50', 'bg-[#D4AF37]/75', 'bg-[#D4AF37]'].map((cls, i) => (
            <div key={i} className={`w-3 h-3 rounded-sm ${cls}`} />
          ))}
          <span>High</span>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {/* Day-of-week labels */}
        <div className="flex flex-col gap-1 mr-1 pt-5 shrink-0">
          {DAYS.map((day, i) => (
            <div
              key={day}
              className="h-3 w-6 text-[9px] text-slate-400 dark:text-slate-500 flex items-center"
            >
              {i % 2 === 1 ? day.slice(0, 1) : ''}
            </div>
          ))}
        </div>

        {/* Week columns */}
        <div className="flex gap-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-0.5">
              {/* Month label row */}
              <div className="h-4 text-[9px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                {monthLabels[wi]}
              </div>
              {/* 7 day cells */}
              {week.map((cell) => (
                <div
                  key={cell.date}
                  title={`${cell.date}: ${cell.count} scans`}
                  className={`w-3 h-3 rounded-sm transition-all duration-150 cursor-default hover:ring-1 hover:ring-[#D4AF37]/60 ${countToClass(cell.count)}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AttendanceHeatmap;
