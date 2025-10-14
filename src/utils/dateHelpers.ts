export const calculateTimelineRange = (quarterOffset: number) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentQuarter = Math.floor(currentMonth / 3);
  
  const startQuarterOffset = -1 + quarterOffset;
  const totalQuarters = 4;
  
  let startQuarter = currentQuarter + startQuarterOffset;
  let startYear = currentYear;
  
  while (startQuarter < 0) {
    startQuarter += 4;
    startYear -= 1;
  }
  while (startQuarter >= 4) {
    startQuarter -= 4;
    startYear += 1;
  }
  
  const startMonth = startQuarter * 3;
  const timelineStart = new Date(startYear, startMonth, 1);
  
  let endQuarter = startQuarter + totalQuarters - 1;
  let endYear = startYear;
  
  while (endQuarter >= 4) {
    endQuarter -= 4;
    endYear += 1;
  }
  
  const endMonth = (endQuarter + 1) * 3;
  const timelineEnd = new Date(endYear, endMonth, 0);
  
  return { timelineStart, timelineEnd };
};

export const generateTimeline = (timelineStart: Date, timelineEnd: Date) => {
  const timeline = [];
  const current = new Date(timelineStart);
  
  while (current <= timelineEnd) {
    const year = current.getFullYear();
    const month = current.getMonth();
    const quarter = Math.floor(month / 3) + 1;
    
    timeline.push({
      year,
      quarter,
      month,
      monthName: current.toLocaleString('default', { month: 'short' }),
      date: new Date(current)
    });
    
    current.setMonth(current.getMonth() + 1);
  }
  
  return timeline;
};

export const groupTimelineByQuarters = (timeline: any[]) => {
  return timeline.reduce((acc, item) => {
    const key = `${item.year}-Q${item.quarter}`;
    if (!acc[key]) {
      acc[key] = { year: item.year, quarter: item.quarter, months: [] };
    }
    acc[key].months.push(item);
    return acc;
  }, {} as any);
};

export const isItemVisible = (start: string, end: string, timelineStart: Date, timelineEnd: Date) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return !(startDate > timelineEnd || endDate < timelineStart);
};