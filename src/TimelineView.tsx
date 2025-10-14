import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronDown, ChevronRight, ZoomIn, ZoomOut, ChevronLeft, ChevronRight as ArrowRight } from 'lucide-react';
import { fetchWorkItems } from './azure-devops-service';

const TimelineView: React.FC = () => {
  const [data, setData] = useState<{ valueStreams: any[] }>({ valueStreams: [] });
  const [expandedEpics, setExpandedEpics] = useState<{[key: string]: boolean}>({});
  const [quarterOffset, setQuarterOffset] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const today = new Date();

  const calculateTimelineRange = () => {
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

  const { timelineStart, timelineEnd } = calculateTimelineRange();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const isDev = process.env.NODE_ENV === 'development' || !window.location.hostname.includes('dev.azure.com');
        
        let valueStreams;
        if (isDev) {
          const orgUrl = process.env.REACT_APP_AZDO_ORG_URL;
          const project = process.env.REACT_APP_AZDO_PROJECT;
          const pat = process.env.REACT_APP_AZDO_PAT;
          
          if (!orgUrl || !project || !pat) {
            throw new Error('Missing Azure DevOps configuration. Please set REACT_APP_AZDO_ORG_URL, REACT_APP_AZDO_PROJECT, and REACT_APP_AZDO_PAT in your .env file.');
          }
          
          console.log('Fetching data from Azure DevOps...');
          valueStreams = await fetchWorkItems({ orgUrl, project, pat });
        } else {
          console.log('Fetching data via Azure DevOps extension SDK...');
          valueStreams = await fetchWorkItems();
        }
        
        console.log('Fetched value streams:', valueStreams);
        
        if (valueStreams.length === 0) {
          setError('No epics found in Azure DevOps. Make sure you have Epics in your project.');
        }
        
        setData({ valueStreams });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        console.error('Error fetching work items:', err);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  const generateTimeline = () => {
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

  const timeline = generateTimeline();

  const quarters = timeline.reduce((acc, item) => {
    const key = `${item.year}-Q${item.quarter}`;
    if (!acc[key]) {
      acc[key] = { year: item.year, quarter: item.quarter, months: [] };
    }
    acc[key].months.push(item);
    return acc;
  }, {} as any);

  const toggleEpic = (epicId: string) => {
    setExpandedEpics(prev => ({ ...prev, [epicId]: !prev[epicId] }));
  };

  const calculateBarStyle = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const totalDays = (timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24);
    const startOffset = (startDate.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24);
    const duration = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    
    const minWidth = 2;
    const calculatedWidth = Math.max((duration / totalDays) * 100, minWidth);
    
    if (startDate > timelineEnd || endDate < timelineStart) {
      return { display: 'none' };
    }
    
    return {
      left: `${Math.max(0, (startOffset / totalDays) * 100)}%`,
      width: `${calculatedWidth}%`
    };
  };

  const getCurrentDatePosition = () => {
    const totalDays = (timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24);
    const currentOffset = (today.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24);
    return `${(currentOffset / totalDays) * 100}%`;
  };

  const monthColumnWidth = `${(1 / timeline.length) * 100}%`;

  const calculateRowHeight = (vs: any) => {
    let height = 0;
    vs.epics.forEach((epic: any) => {
      height += 75;
      if (expandedEpics[epic.id]) {
        height += epic.features.length * 60;
      }
    });
    return Math.max(height + 20, 100);
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.2, 2));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
  };

  const handlePreviousQuarter = () => {
    setQuarterOffset(prev => prev - 1);
  };

  const handleNextQuarter = () => {
    setQuarterOffset(prev => prev + 1);
  };

  const handleToday = () => {
    setQuarterOffset(0);
  };

  const getValueStreamWidth = () => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 640) return 'w-32';
      if (window.innerWidth < 1024) return 'w-40';
    }
    return 'w-56';
  };

  const getValueStreamWidthPx = () => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 640) return 128; // 8rem = 128px
      if (window.innerWidth < 1024) return 160; // 10rem = 160px
    }
    return 224; // 14rem = 224px
  };

  const [vsWidth, setVsWidth] = useState(getValueStreamWidth());

  useEffect(() => {
    const handleResize = () => {
      setVsWidth(getValueStreamWidth());
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  const isItemVisible = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return !(startDate > timelineEnd || endDate < timelineStart);
  };

  const getUserStoryProgress = (itemId: string, isEpic: boolean) => {
    const total = Math.floor(Math.random() * 20) + 5;
    const completed = Math.floor(Math.random() * total);
    return { total, completed };
  };

  return (
    <div className="w-full h-screen bg-gray-50 overflow-hidden flex flex-col">
      <div className="bg-white border-b border-gray-200 p-2 sm:p-4 shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="hidden sm:inline">Value Stream Timeline</span>
            <span className="sm:hidden">Timeline</span>
          </h1>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 border-r pr-2 mr-2">
              <button
                onClick={handlePreviousQuarter}
                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-md transition-colors"
                title="Previous Quarter"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button
                onClick={handleToday}
                className="px-2 py-1 text-xs sm:text-sm bg-blue-100 hover:bg-blue-200 rounded-md transition-colors font-medium"
                title="Go to Current Quarter"
              >
                Today
              </button>
              <button
                onClick={handleNextQuarter}
                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-md transition-colors"
                title="Next Quarter"
              >
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            <button
              onClick={handleZoomOut}
              className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-md transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <span className="text-xs sm:text-sm text-gray-600 hidden sm:inline">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-md transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading timeline data...</p>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <h2 className="text-red-800 font-semibold mb-2">Error Loading Data</h2>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && data.valueStreams.length > 0 && (
        <div className="flex-1 overflow-auto relative" ref={timelineRef}>
          <div 
            className="min-w-full"
            style={{ 
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'top left',
              width: `${100 / zoomLevel}%`
            }}
          >
            <div className="flex flex-col" style={{ minWidth: '800px' }}>
              <div className="sticky top-0 z-10 bg-white border-b-2 border-gray-300 flex" ref={headerRef}>
                <div className={`${vsWidth} flex-shrink-0 border-r-2 border-gray-300 bg-gray-100 p-2 font-semibold text-sm flex items-center justify-center`}>
                  Value Stream
                </div>
                <div className="flex-1 min-w-0 relative">
                  <div className="flex border-b border-gray-200">
                    {Object.values(quarters).map((q: any, idx: number) => (
                      <div
                        key={idx}
                        className="border-r border-gray-200 bg-blue-50 p-1 sm:p-2 text-center font-semibold text-xs sm:text-sm"
                        style={{ width: `${(q.months.length / timeline.length) * 100}%` }}
                      >
                        <span className="hidden sm:inline">Q{q.quarter} {q.year}</span>
                        <span className="sm:hidden">Q{q.quarter}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex">
                    {timeline.map((item, idx) => (
                      <div
                        key={idx}
                        className="border-r border-gray-200 bg-gray-50 p-1 sm:p-2 text-center text-xs sm:text-sm"
                        style={{ width: monthColumnWidth }}
                      >
                        {item.monthName}
                      </div>
                    ))}
                  </div>

                  {/* Today line in header */}
                  {today >= timelineStart && today <= timelineEnd && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-gray-400 z-20 pointer-events-none"
                      style={{ left: getCurrentDatePosition() }}
                    >
                      <div className="absolute -top-2 -left-2 w-4 h-4 bg-gray-400 rounded-full"></div>
                      <div className="absolute -top-6 -left-8 sm:-left-12 bg-gray-400 text-white text-xs px-1 sm:px-2 py-1 rounded whitespace-nowrap">
                        Today
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1">
                {data.valueStreams
                  .filter(vs => vs.epics.length > 0)
                  .map((vs) => {
                    const rowHeight = calculateRowHeight(vs);
                    
                    return (
                      <div key={vs.id} className="flex border-b-2 border-gray-400" style={{ minHeight: `${rowHeight}px` }}>
                        <div className={`${vsWidth} flex-shrink-0 border-r-2 border-gray-300 bg-blue-100 p-2 sm:p-4 flex items-center justify-center`}>
                          <span className="font-semibold text-xs sm:text-sm break-words text-center">{vs.name}</span>
                        </div>

                        <div className="flex-1 relative bg-white min-w-0">
                          <div className="absolute inset-0 flex">
                            {timeline.map((month, idx) => (
                              <div
                                key={idx}
                                className="border-r border-gray-200"
                                style={{ width: monthColumnWidth }}
                              ></div>
                            ))}
                          </div>

                          {/* Today line in value stream row */}
                          {today >= timelineStart && today <= timelineEnd && (
                            <div
                              className="absolute top-0 bottom-0 w-0.5 bg-gray-400 z-20 pointer-events-none"
                              style={{ left: getCurrentDatePosition() }}
                            ></div>
                          )}

                          {vs.epics.map((epic: any, epicIdx: number) => {
                            if (!isItemVisible(epic.iterationStart, epic.iterationEnd)) {
                              return null;
                            }

                            let yOffset = 10;
                            for (let i = 0; i < epicIdx; i++) {
                              if (isItemVisible(vs.epics[i].iterationStart, vs.epics[i].iterationEnd)) {
                                yOffset += 75;
                                if (expandedEpics[vs.epics[i].id]) {
                                  yOffset += vs.epics[i].features.filter((f: any) => 
                                    isItemVisible(f.iterationStart, f.iterationEnd)
                                  ).length * 60;
                                }
                              }
                            }

                            const barStyle = calculateBarStyle(epic.iterationStart, epic.iterationEnd);
                            if (barStyle.display === 'none') return null;

                            const epicProgress = getUserStoryProgress(epic.id, true);
                            const progressPercentage = (epicProgress.completed / epicProgress.total) * 100;

                            return (
                              <div key={epic.id}>
                                <div
                                  className="absolute bg-white rounded-lg shadow-md border-l-4 border-orange-500 cursor-pointer hover:shadow-lg transition-shadow z-10 overflow-hidden"
                                  style={{
                                    ...barStyle,
                                    top: `${yOffset}px`,
                                    height: '64px'
                                  }}
                                  onClick={() => toggleEpic(epic.id)}
                                  title={`${epic.title}\nStart: ${new Date(epic.iterationStart).toLocaleDateString()}\nEnd: ${new Date(epic.iterationEnd).toLocaleDateString()}`}
                                >
                                  <div className="px-2 py-2 h-full flex flex-col">
                                    <div className="flex items-start gap-1 mb-2">
                                      {expandedEpics[epic.id] ? (
                                        <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 text-gray-600 mt-0.5" />
                                      ) : (
                                        <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 text-gray-600 mt-0.5" />
                                      )}
                                      <span className="text-xs sm:text-sm font-semibold text-gray-800 truncate flex-1 leading-tight">
                                        {epic.title}
                                      </span>
                                    </div>
                                    
                                    <div className="mt-auto">
                                      <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs text-gray-600">
                                          {epicProgress.completed}/{epicProgress.total} stories
                                        </span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
                                        <div 
                                          className="bg-orange-500 h-1.5 rounded-full transition-all"
                                          style={{ width: `${progressPercentage}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {expandedEpics[epic.id] && epic.features.map((feature: any, featureIdx: number) => {
                                  if (!isItemVisible(feature.iterationStart, feature.iterationEnd)) {
                                    return null;
                                  }

                                  const featureBarStyle = calculateBarStyle(feature.iterationStart, feature.iterationEnd);
                                  if (featureBarStyle.display === 'none') return null;

                                  const featureProgress = getUserStoryProgress(feature.id, false);
                                  const featureProgressPercentage = (featureProgress.completed / featureProgress.total) * 100;

                                  return (
                                    <div
                                      key={feature.id}
                                      className="absolute bg-white rounded-lg shadow-md border-l-4 border-purple-500 z-10 overflow-hidden"
                                      style={{
                                        ...featureBarStyle,
                                        top: `${yOffset + 75 + featureIdx * 60}px`,
                                        height: '52px'
                                      }}
                                      title={`${feature.title}\nStart: ${new Date(feature.iterationStart).toLocaleDateString()}\nEnd: ${new Date(feature.iterationEnd).toLocaleDateString()}`}
                                    >
                                      <div className="px-2 py-2 h-full flex flex-col">
                                        <span className="text-xs font-medium text-gray-800 truncate mb-2 leading-tight">
                                          {feature.title}
                                        </span>
                                        
                                        <div className="mt-auto">
                                          <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs text-gray-600">
                                              {featureProgress.completed}/{featureProgress.total} stories
                                            </span>
                                          </div>
                                          <div className="w-full bg-gray-200 rounded-full h-1 mb-1">
                                            <div 
                                              className="bg-purple-500 h-1 rounded-full transition-all"
                                              style={{ width: `${featureProgressPercentage}%` }}
                                            ></div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && data.valueStreams.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-600">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-semibold mb-2">No Data Available</p>
            <p className="text-sm">No epics with valid iterations found in your Azure DevOps project.</p>
            <p className="text-xs mt-2 text-gray-500">Make sure your epics are assigned to iterations with start and end dates.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimelineView;