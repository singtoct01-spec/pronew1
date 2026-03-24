import React, { useMemo } from 'react';
import { ProductionJob, SIMULATED_NOW, sortMachines } from '../types';
import { Cpu, Zap, AlertTriangle, Play, Pause, AlertOctagon, CheckCircle2, Clock } from 'lucide-react';

import { formatDateTime, formatTimeOnly } from '../utils/dateUtils';

interface MachineGridProps {
  jobs: ProductionJob[];
  onEditJob: (job: ProductionJob) => void;
}

export const MachineGrid: React.FC<MachineGridProps> = ({ jobs, onEditJob }) => {
  // Extract unique machines
  const machineIds = sortMachines(Array.from(new Set(jobs.map(j => j.machineId))));

  const getMachineStatus = (machineId: string) => {
    // Find job active at SIMULATED_NOW
    const activeJob = jobs.find(j => 
      j.machineId === machineId && 
      new Date(j.startDate) <= SIMULATED_NOW && 
      new Date(j.endDate) >= SIMULATED_NOW
    );
    
    // If no active job, find the next one or the last one
    const nextJob = !activeJob ? jobs.find(j => j.machineId === machineId && new Date(j.startDate) > SIMULATED_NOW) : null;
    
    return { activeJob, nextJob };
  };

  const getProgress = (start: string, end: string) => {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const now = SIMULATED_NOW.getTime();
    const total = e - s;
    const elapsed = now - s;
    return Math.min(Math.max((elapsed / total) * 100, 0), 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Running': return 'border-emerald-500 bg-emerald-50';
      case 'Delayed': return 'border-red-500 bg-red-50';
      case 'Stopped': return 'border-slate-400 bg-slate-100';
      case 'Maintenance': return 'border-orange-500 bg-orange-50';
      default: return 'border-slate-200 bg-white';
    }
  };

  const getStatusTextThai = (status: string) => {
      switch (status) {
      case 'Running': return 'กำลังผลิต';
      case 'Delayed': return 'ล่าช้า/ตกแผน';
      case 'Stopped': return 'หยุด';
      case 'Maintenance': return 'ซ่อมบำรุง';
      default: return 'ว่าง (Idle)';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Running': return <Play size={16} className="text-emerald-600" />;
      case 'Delayed': return <AlertTriangle size={16} className="text-red-600" />;
      case 'Stopped': return <Pause size={16} className="text-slate-600" />;
      case 'Maintenance': return <AlertOctagon size={16} className="text-orange-600" />;
      default: return <Cpu size={16} className="text-slate-400" />;
    }
  };

  // Calculate summary stats
  const stats = useMemo(() => {
    let running = 0;
    let delayed = 0;
    let stopped = 0;
    let idle = 0;

    machineIds.forEach(id => {
      const { activeJob } = getMachineStatus(id);
      if (activeJob) {
        if (activeJob.status === 'Running') running++;
        else if (activeJob.status === 'Delayed') delayed++;
        else if (activeJob.status === 'Stopped' || activeJob.status === 'Maintenance') stopped++;
      } else {
        idle++;
      }
    });

    return { running, delayed, stopped, idle, total: machineIds.length };
  }, [machineIds, jobs]);

  return (
    <div className="space-y-6 font-kanit">
      {/* Summary Header */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="bg-brand-100 p-2 rounded-lg text-brand-600">
               <Cpu size={24} />
            </div>
            <div>
               <h2 className="text-lg font-bold text-slate-800">สถานะเครื่องจักร (Real-time)</h2>
               <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock size={12} />
                  <span>ข้อมูล ณ {formatDateTime(SIMULATED_NOW)}</span>
               </div>
            </div>
         </div>
         
         <div className="flex gap-3 overflow-x-auto pb-2 md:pb-0">
            <div className="flex flex-col items-center px-4 py-2 bg-emerald-50 rounded-lg border border-emerald-100 min-w-[80px]">
               <span className="text-2xl font-bold text-emerald-600">{stats.running}</span>
               <span className="text-[10px] text-emerald-800 uppercase font-semibold">กำลังผลิต</span>
            </div>
            <div className="flex flex-col items-center px-4 py-2 bg-red-50 rounded-lg border border-red-100 min-w-[80px]">
               <span className="text-2xl font-bold text-red-600">{stats.delayed}</span>
               <span className="text-[10px] text-red-800 uppercase font-semibold">ล่าช้า</span>
            </div>
            <div className="flex flex-col items-center px-4 py-2 bg-slate-100 rounded-lg border border-slate-200 min-w-[80px]">
               <span className="text-2xl font-bold text-slate-600">{stats.stopped}</span>
               <span className="text-[10px] text-slate-700 uppercase font-semibold">หยุด/ซ่อม</span>
            </div>
            <div className="flex flex-col items-center px-4 py-2 bg-white rounded-lg border border-slate-200 min-w-[80px]">
               <span className="text-2xl font-bold text-slate-400">{stats.idle}</span>
               <span className="text-[10px] text-slate-500 uppercase font-semibold">ว่าง</span>
            </div>
         </div>
      </div>

      {/* Machine Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {machineIds.map(id => {
          const { activeJob, nextJob } = getMachineStatus(id);
          const displayJob = activeJob || nextJob;
          
          return (
            <div 
              key={id} 
              onClick={() => displayJob && onEditJob(displayJob)}
              className={`relative rounded-xl border-t-4 shadow-sm p-4 transition-all hover:shadow-md bg-white flex flex-col h-full ${activeJob ? getStatusColor(activeJob.status).replace('border-', 'border-t-') : 'border-t-slate-300'} ${displayJob ? 'cursor-pointer hover:-translate-y-1' : ''}`}
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center ${activeJob ? 'bg-white shadow-sm' : 'bg-slate-100'}`}>
                    <Cpu className={activeJob ? 'text-slate-700' : 'text-slate-400'} size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 leading-none">{id}</h3>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${activeJob ? (activeJob.status === 'Running' ? 'bg-emerald-100 text-emerald-700' : activeJob.status === 'Delayed' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700') : 'bg-slate-100 text-slate-500'}`}>
                      {activeJob ? getStatusTextThai(activeJob.status) : 'ว่าง (Idle)'}
                    </span>
                  </div>
                </div>
                <div className="p-1.5 rounded-md bg-white shadow-sm border border-slate-100">
                  {activeJob ? getStatusIcon(activeJob.status) : <CheckCircle2 size={16} className="text-slate-300"/>}
                </div>
              </div>

              {/* Content */}
              <div className="flex-grow flex flex-col justify-center">
                {displayJob ? (
                  <div className="space-y-2">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">สินค้าที่ผลิต</div>
                      <div className="font-semibold text-slate-700 text-sm truncate" title={displayJob.productItem}>{displayJob.productItem}</div>
                      <div className="text-xs text-slate-500 mt-1 flex justify-between">
                         <span>แม่พิมพ์: <span className="font-mono text-slate-700">{displayJob.moldCode}</span></span>
                      </div>
                    </div>
                    
                    {activeJob && (
                      <div className="pt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-500 font-medium">ความคืบหน้า</span>
                          <span className="font-bold text-slate-700">{Math.round(getProgress(activeJob.startDate, activeJob.endDate))}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${activeJob.status === 'Delayed' ? 'bg-red-500' : 'bg-emerald-500'}`} 
                            style={{ width: `${getProgress(activeJob.startDate, activeJob.endDate)}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-[9px] text-slate-400 mt-1.5 font-mono">
                          <span>{formatTimeOnly(activeJob.startDate)}</span>
                          <span>{formatTimeOnly(activeJob.endDate)}</span>
                        </div>
                      </div>
                    )}
                    
                    {!activeJob && nextJob && (
                       <div className="mt-auto pt-2 border-t border-slate-100">
                          <div className="text-[10px] text-slate-400 mb-1">งานถัดไป:</div>
                          <div className="text-xs font-medium text-slate-600 truncate">{nextJob.productItem}</div>
                          <div className="text-[10px] text-brand-600 mt-0.5 flex items-center gap-1">
                             <Clock size={10} />
                             เริ่ม {formatDateTime(nextJob.startDate)}
                          </div>
                       </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 py-4">
                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-2">
                       <CheckCircle2 size={20} className="text-slate-300" />
                    </div>
                    <span className="text-xs font-medium">ไม่มีแผนงาน</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};