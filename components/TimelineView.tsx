
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { ProductionJob } from '../types';
import { GripVertical, Search, Filter, AlertCircle, CheckCircle2, PlayCircle, Clock, Info } from 'lucide-react';
import { SearchableSelect } from './SearchableSelect';

interface TimelineViewProps {
  jobs: ProductionJob[];
  onUpdateJob?: (job: ProductionJob) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ jobs, onUpdateJob }) => {
  // --- Filter & Search State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Apply Filters
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchesSearch = 
        job.jobOrder.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.productItem.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'All' || job.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [jobs, searchTerm, statusFilter]);

  // 1. Calculate Dynamic Date Range (using filteredJobs for range, or all jobs?)
  // It's usually better to keep the timeline scale stable based on ALL jobs, 
  // but only SHOW filtered jobs.
  const { startDate, endDate, totalDays, days } = useMemo(() => {
    // Use a fixed window around the current date to prevent browser freezing
    // from extremely large date ranges (e.g., bad imported data)
    const now = new Date();
    
    const start = new Date(now);
    start.setDate(start.getDate() - 7); // 7 days ago
    start.setHours(0, 0, 0, 0);

    const end = new Date(now);
    end.setDate(end.getDate() + 30); // 30 days ahead
    end.setHours(23, 59, 59, 999);

    const diffTime = end.getTime() - start.getTime();
    const daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const dayArray = [];
    for(let i = 0; i < daysCount; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      dayArray.push(d);
    }

    return { startDate: start, endDate: end, totalDays: daysCount, days: dayArray };
  }, []);

  const machines = Array.from(new Set(jobs.map(j => j.machineId))) as string[];
  machines.sort((a, b) => {
      return a.localeCompare(b, undefined, { numeric: true });
  });

  const getPosition = (dateStr: string) => {
    const d = new Date(dateStr);
    const diffTime = Math.max(0, d.getTime() - startDate.getTime());
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    const percentage = (diffDays / totalDays) * 100;
    return Math.min(Math.max(percentage, 0), 100);
  };

  const getDateFromPercentage = (percentage: number) => {
    const diffDays = (percentage / 100) * totalDays;
    const d = new Date(startDate.getTime() + diffDays * 24 * 60 * 60 * 1000);
    return d;
  };

  const getBarColor = (status: string) => {
    switch (status) {
      case 'Running': return 'bg-emerald-500 border-emerald-600';
      case 'Delayed': return 'bg-red-500 border-red-600';
      case 'Completed': return 'bg-blue-400 border-blue-500';
      case 'Maintenance': return 'bg-orange-400 border-orange-500 stripes-orange';
      case 'Paused': return 'bg-amber-400 border-amber-500';
      default: return 'bg-slate-300 border-slate-400';
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'Running': return 'bg-emerald-600';
      case 'Delayed': return 'bg-red-600';
      case 'Completed': return 'bg-blue-500';
      case 'Paused': return 'bg-amber-500';
      default: return 'bg-slate-400';
    }
  };

  // View & Snap State
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [snapMode, setSnapMode] = useState<'free' | 'hour' | 'half-day' | 'day'>('hour');

  const getMinWidth = () => {
    switch (viewMode) {
      case 'day': return `${Math.max(1000, totalDays * 240)}px`;
      case 'week': return `${Math.max(1000, totalDays * 120)}px`;
      case 'month': return `${Math.max(1000, totalDays * 40)}px`;
      default: return '1000px';
    }
  };

  const snapDate = (date: Date, mode: 'free' | 'hour' | 'half-day' | 'day') => {
    if (mode === 'free') return date;
    const d = new Date(date);
    if (mode === 'hour') {
      const minutes = d.getMinutes();
      if (minutes >= 30) d.setHours(d.getHours() + 1);
      d.setMinutes(0, 0, 0);
    } else if (mode === 'half-day') {
      const hours = d.getHours();
      if (hours < 6) d.setHours(0, 0, 0, 0);
      else if (hours < 18) d.setHours(12, 0, 0, 0);
      else {
        d.setDate(d.getDate() + 1);
        d.setHours(0, 0, 0, 0);
      }
    } else if (mode === 'day') {
      const hours = d.getHours();
      if (hours >= 12) d.setDate(d.getDate() + 1);
      d.setHours(0, 0, 0, 0);
    }
    return d;
  };

  // Drag & Drop State
  const timelineRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    jobId: string;
    type: 'move' | 'resize-left' | 'resize-right';
    startX: number;
    startLeft: number;
    startWidth: number;
    startMachine: string;
    currentLeft: number;
    currentWidth: number;
    currentMachine: string;
  } | null>(null);

  // Tooltip State
  const [hoveredJob, setHoveredJob] = useState<{job: ProductionJob, x: number, y: number} | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState || !timelineRef.current) return;

      const timelineRect = timelineRef.current.getBoundingClientRect();
      const deltaX = e.clientX - dragState.startX;
      const deltaPercentage = (deltaX / timelineRect.width) * 100;

      let newLeft = dragState.startLeft;
      let newWidth = dragState.startWidth;

      if (dragState.type === 'move') {
        newLeft = Math.max(0, Math.min(100 - newWidth, dragState.startLeft + deltaPercentage));
      } else if (dragState.type === 'resize-left') {
        const maxLeft = dragState.startLeft + dragState.startWidth;
        newLeft = Math.max(0, Math.min(maxLeft, dragState.startLeft + deltaPercentage));
        newWidth = dragState.startWidth + (dragState.startLeft - newLeft);
      } else if (dragState.type === 'resize-right') {
        newWidth = Math.max(0, Math.min(100 - dragState.startLeft, dragState.startWidth + deltaPercentage));
      }

      // Apply snapping
      if (snapMode !== 'free') {
        if (dragState.type === 'move') {
          const rawStartDate = getDateFromPercentage(newLeft);
          const snappedStartDate = snapDate(rawStartDate, snapMode);
          newLeft = getPosition(snappedStartDate.toISOString());
        } else if (dragState.type === 'resize-left') {
          const rawStartDate = getDateFromPercentage(newLeft);
          const snappedStartDate = snapDate(rawStartDate, snapMode);
          const snappedLeft = getPosition(snappedStartDate.toISOString());
          
          const rightEdge = dragState.startLeft + dragState.startWidth;
          if (snappedLeft < rightEdge) {
            newLeft = snappedLeft;
            newWidth = rightEdge - newLeft;
          }
        } else if (dragState.type === 'resize-right') {
          const rawEndDate = getDateFromPercentage(dragState.startLeft + newWidth);
          const snappedEndDate = snapDate(rawEndDate, snapMode);
          const snappedRight = getPosition(snappedEndDate.toISOString());
          
          if (snappedRight > dragState.startLeft) {
            newWidth = snappedRight - dragState.startLeft;
          }
        }
      }

      // Ensure minimum width (e.g., 1 hour)
      if (newWidth <= 0) {
          const minWidthDate = new Date(getDateFromPercentage(newLeft).getTime() + 60 * 60 * 1000);
          newWidth = getPosition(minWidthDate.toISOString()) - newLeft;
      }

      setDragState(prev => prev ? { ...prev, currentLeft: newLeft, currentWidth: newWidth } : null);
    };

    const handleMouseUp = () => {
      if (dragState && onUpdateJob) {
        const job = jobs.find(j => j.id === dragState.jobId);
        if (job) {
          const newStartDate = getDateFromPercentage(dragState.currentLeft).toISOString();
          const newEndDate = getDateFromPercentage(dragState.currentLeft + dragState.currentWidth).toISOString();
          
          onUpdateJob({
            ...job,
            machineId: dragState.currentMachine,
            startDate: newStartDate,
            endDate: newEndDate
          });
        }
      }
      setDragState(null);
    };

    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, jobs, onUpdateJob, totalDays, startDate]);

  const handleMouseDown = (e: React.MouseEvent, job: ProductionJob, type: 'move' | 'resize-left' | 'resize-right') => {
    e.stopPropagation();
    if (!job.startDate || !job.endDate) return;

    setHoveredJob(null); // Hide tooltip when dragging starts

    const left = getPosition(job.startDate);
    const width = getPosition(job.endDate) - left;

    setDragState({
      jobId: job.id,
      type,
      startX: e.clientX,
      startLeft: left,
      startWidth: width,
      startMachine: job.machineId,
      currentLeft: left,
      currentWidth: width,
      currentMachine: job.machineId
    });
  };

  const handleRowDragEnter = (machineId: string) => {
    if (dragState && dragState.type === 'move' && dragState.currentMachine !== machineId) {
      setDragState(prev => prev ? { ...prev, currentMachine: machineId } : null);
    }
  };

  const handleJobMouseEnter = (e: React.MouseEvent, job: ProductionJob) => {
    if (dragState) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredJob({
      job,
      x: rect.left + rect.width / 2,
      y: rect.top
    });
  };

  const handleJobMouseLeave = () => {
    setHoveredJob(null);
  };

  // Calculate Current Time Position
  const now = new Date();
  const nowPosition = getPosition(now.toISOString());
  const showNowLine = now >= startDate && now <= endDate;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full font-kanit select-none relative">
      {/* Header & Controls */}
      <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white sticky top-0 z-30">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Timeline การผลิต (Interactive)</h2>
          <p className="text-xs text-slate-500">
             ลากและวางเพื่อย้ายคิวงาน หรือดึงขอบเพื่อเปลี่ยนเวลา
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
          {/* View Mode */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setViewMode('day')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${viewMode === 'day' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
            >
              รายวัน
            </button>
            <button 
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${viewMode === 'week' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
            >
              รายสัปดาห์
            </button>
            <button 
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${viewMode === 'month' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
            >
              รายเดือน
            </button>
          </div>

          {/* Snap Mode */}
          <div className="flex items-center gap-2 w-full sm:w-auto z-20">
            <span className="text-xs text-slate-500">Snap:</span>
            <SearchableSelect 
              className="w-32"
              value={snapMode}
              onChange={(value) => setSnapMode(value as any)}
              options={[
                { value: 'free', label: 'อิสระ (Free)' },
                { value: 'hour', label: 'รายชั่วโมง (Hour)' },
                { value: 'half-day', label: 'ครึ่งวัน (Half-day)' },
                { value: 'day', label: 'เต็มวัน (Day)' }
              ]}
            />
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-48">
            <Search className="absolute left-2.5 top-2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="ค้นหา Job / สินค้า..." 
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto z-10">
            <Filter size={16} className="text-slate-400" />
            <SearchableSelect 
              className="w-40"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'All', label: 'ทุกสถานะ' },
                { value: 'Running', label: 'กำลังผลิต (Running)' },
                { value: 'Delayed', label: 'ล่าช้า (Delayed)' },
                { value: 'Planned', label: 'รอผลิต (Planned)' },
                { value: 'Completed', label: 'เสร็จสิ้น (Completed)' }
              ]}
            />
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-xs ml-auto bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-500 rounded-sm"></div> Running</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded-sm"></div> Delayed</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-400 rounded-sm"></div> Completed</div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto relative flex-1">
        <div className="pb-4" style={{ minWidth: getMinWidth() }}>
            {/* Header Dates */}
            <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-20 h-10 shadow-sm">
                <div className="w-24 flex-shrink-0 p-2 text-xs font-bold text-slate-500 border-r border-slate-200 flex items-center justify-center bg-slate-100 sticky left-0 z-30 shadow-r">
                    Machine
                </div>
                <div className="flex-1 relative" ref={timelineRef}>
                    {days.map((day, i) => (
                        <div key={i} className={`absolute h-full border-r border-slate-200 flex flex-col items-center justify-center text-[10px] text-slate-500 ${day.getDay() === 0 || day.getDay() === 6 ? 'bg-slate-50' : ''}`} 
                             style={{ left: `${(i/totalDays)*100}%`, width: `${100/totalDays}%` }}>
                            <span className="font-bold">{day.getDate()}</span>
                            <span className="text-[9px]">{day.toLocaleDateString('en-GB', { weekday: 'short' })}</span>
                        </div>
                    ))}
                    
                    {/* Current Time Line (Header Part) */}
                    {showNowLine && (
                      <div 
                        className="absolute top-0 bottom-0 w-px bg-red-500 z-40"
                        style={{ left: `${nowPosition}%` }}
                      >
                        <div className="absolute -top-0 -translate-x-1/2 bg-red-500 text-white text-[9px] font-bold px-1 rounded-sm whitespace-nowrap">
                          วันนี้
                        </div>
                      </div>
                    )}
                </div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-slate-100 relative">
                {/* Current Time Line (Body Part) */}
                {showNowLine && (
                  <div 
                    className="absolute top-0 bottom-0 w-px bg-red-500/50 z-10 pointer-events-none"
                    style={{ left: `calc(6rem + ${nowPosition} * (100% - 6rem) / 100)` }} // 6rem is w-24
                  />
                )}

                {machines.map(machineId => {
                    const machineJobs = filteredJobs.filter(j => j.machineId === machineId && (!dragState || dragState.jobId !== j.id));
                    const isDragTarget = dragState && dragState.currentMachine === machineId;
                    
                    return (
                        <div 
                          key={machineId} 
                          className={`flex h-14 transition-colors ${isDragTarget ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
                          onMouseEnter={() => handleRowDragEnter(machineId)}
                        >
                            <div className="w-24 flex-shrink-0 p-2 font-bold text-slate-700 border-r border-slate-200 flex items-center justify-center bg-white sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                {machineId}
                            </div>
                            <div className="flex-1 relative group">
                                {/* Grid Lines Background */}
                                {days.map((day, i) => (
                                    <div key={i} className={`absolute top-0 bottom-0 border-r border-slate-100 ${day.getDay() === 0 || day.getDay() === 6 ? 'bg-slate-50/50' : ''}`} 
                                        style={{ left: `${(i/totalDays)*100}%` }}></div>
                                ))}

                                {/* Static Job Bars */}
                                {machineJobs.map(job => {
                                    if (!job.startDate || !job.endDate || isNaN(new Date(job.startDate).getTime()) || isNaN(new Date(job.endDate).getTime())) return null;

                                    const left = getPosition(job.startDate);
                                    const width = getPosition(job.endDate) - left;
                                    
                                    if (width <= 0) return null;

                                    // Calculate Progress
                                    const progress = job.totalProduction > 0 
                                      ? Math.min(100, Math.round(((job.actualProduction || 0) / job.totalProduction) * 100))
                                      : 0;

                                    return (
                                        <div 
                                            key={job.id}
                                            className={`absolute top-2 bottom-2 rounded-md shadow-sm border ${getBarColor(job.status)} cursor-grab active:cursor-grabbing flex items-center overflow-hidden transition-all hover:z-30 hover:shadow-md group/job`}
                                            style={{ left: `${left}%`, width: `${width}%` }}
                                            onMouseDown={(e) => handleMouseDown(e, job, 'move')}
                                            onMouseEnter={(e) => handleJobMouseEnter(e, job)}
                                            onMouseLeave={handleJobMouseLeave}
                                        >
                                            {/* Progress Bar Background */}
                                            <div 
                                              className={`absolute left-0 top-0 bottom-0 ${getProgressColor(job.status)} opacity-40`}
                                              style={{ width: `${progress}%` }}
                                            />

                                            {/* Left Resize Handle */}
                                            <div 
                                              className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-black/20 z-10"
                                              onMouseDown={(e) => handleMouseDown(e, job, 'resize-left')}
                                            />
                                            
                                            <div className="flex flex-col overflow-hidden pointer-events-none w-full px-2 z-10">
                                                <span className="text-[10px] text-white font-bold whitespace-nowrap truncate drop-shadow-md leading-tight">
                                                    {job.productItem}
                                                </span>
                                                <div className="flex justify-between items-center">
                                                  <span className="text-[8px] text-white/90 whitespace-nowrap truncate leading-tight">
                                                      {job.jobOrder}
                                                  </span>
                                                  {progress > 0 && (
                                                    <span className="text-[8px] text-white font-bold ml-1 drop-shadow-md">
                                                      {progress}%
                                                    </span>
                                                  )}
                                                </div>
                                            </div>

                                            {/* Right Resize Handle */}
                                            <div 
                                              className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-black/20 z-10"
                                              onMouseDown={(e) => handleMouseDown(e, job, 'resize-right')}
                                            />
                                        </div>
                                    );
                                })}

                                {/* Dragging Job Bar */}
                                {dragState && dragState.currentMachine === machineId && (() => {
                                    const job = jobs.find(j => j.id === dragState.jobId);
                                    if (!job) return null;
                                    return (
                                        <div 
                                            key={`drag-${job.id}`}
                                            className={`absolute top-2 bottom-2 rounded-md shadow-lg border ${getBarColor(job.status)} opacity-80 z-50 flex items-center px-2 overflow-hidden ring-2 ring-blue-500`}
                                            style={{ left: `${dragState.currentLeft}%`, width: `${dragState.currentWidth}%` }}
                                        >
                                            <div className="flex flex-col overflow-hidden pointer-events-none w-full">
                                                <span className="text-[10px] text-white font-bold whitespace-nowrap truncate drop-shadow-md leading-tight">
                                                    {job.productItem}
                                                </span>
                                                <span className="text-[8px] text-white/90 whitespace-nowrap truncate leading-tight">
                                                    {getDateFromPercentage(dragState.currentLeft).toLocaleDateString('en-GB', {day:'numeric', month:'short'})} - {getDateFromPercentage(dragState.currentLeft + dragState.currentWidth).toLocaleDateString('en-GB', {day:'numeric', month:'short'})}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      </div>

      {/* Custom Tooltip / Popover */}
      {hoveredJob && (
        <div 
          className="fixed z-[100] bg-white rounded-xl shadow-xl border border-slate-200 p-4 w-72 pointer-events-none transform -translate-x-1/2 -translate-y-full mt-[-10px]"
          style={{ 
            left: hoveredJob.x, 
            top: hoveredJob.y,
            // Ensure tooltip stays within viewport
            marginLeft: Math.max(0, 144 - hoveredJob.x) + Math.min(0, window.innerWidth - (hoveredJob.x + 144))
          }}
        >
          {/* Tooltip Arrow */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b border-r border-slate-200 transform rotate-45"></div>
          
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">{hoveredJob.job.productItem}</h3>
                <p className="text-xs text-slate-500 font-mono">{hoveredJob.job.jobOrder}</p>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                hoveredJob.job.status === 'Running' ? 'bg-emerald-100 text-emerald-700' :
                hoveredJob.job.status === 'Delayed' ? 'bg-red-100 text-red-700' :
                hoveredJob.job.status === 'Completed' ? 'bg-blue-100 text-blue-700' :
                'bg-slate-100 text-slate-700'
              }`}>
                {hoveredJob.job.status}
              </span>
            </div>

            <div className="space-y-2 mt-3">
              <div className="flex items-center text-xs text-slate-600">
                <Clock size={14} className="mr-2 text-slate-400" />
                <span>
                  {new Date(hoveredJob.job.startDate).toLocaleDateString('en-GB', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit', hour12: false})} - 
                  {new Date(hoveredJob.job.endDate).toLocaleDateString('en-GB', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit', hour12: false})}
                </span>
              </div>
              
              <div className="flex items-center text-xs text-slate-600">
                <Info size={14} className="mr-2 text-slate-400" />
                <span>แม่พิมพ์: <span className="font-medium">{hoveredJob.job.moldCode}</span></span>
              </div>

              {/* Progress Section in Tooltip */}
              <div className="pt-2 border-t border-slate-100 mt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">ความคืบหน้า</span>
                  <span className="font-bold text-slate-700">
                    {(hoveredJob.job.actualProduction || 0).toLocaleString()} / {(hoveredJob.job.totalProduction || 0).toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      hoveredJob.job.status === 'Delayed' ? 'bg-red-500' : 
                      hoveredJob.job.status === 'Completed' ? 'bg-blue-500' : 
                      'bg-emerald-500'
                    }`}
                    style={{ 
                      width: `${hoveredJob.job.totalProduction > 0 ? Math.min(100, ((hoveredJob.job.actualProduction || 0) / hoveredJob.job.totalProduction) * 100) : 0}%` 
                    }}
                  ></div>
                </div>
                <div className="text-right text-[10px] text-slate-400 mt-0.5">
                  {hoveredJob.job.totalProduction > 0 ? Math.round(((hoveredJob.job.actualProduction || 0) / hoveredJob.job.totalProduction) * 100) : 0}%
                </div>
              </div>

              {hoveredJob.job.remarks && (
                <div className="mt-2 p-2 bg-amber-50 rounded text-xs text-amber-800 border border-amber-100">
                  <span className="font-bold">หมายเหตุ:</span> {hoveredJob.job.remarks}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

