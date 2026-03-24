import React, { useState, useEffect } from 'react';
import { ProductionJob, Status } from '../types';
import { Clock, TrendingUp, AlertTriangle, CheckCircle2, Save, X } from 'lucide-react';

import { formatTimeOnly } from '../utils/dateUtils';

interface PlanVsActualDashboardProps {
  jobs: ProductionJob[];
  onUpdateActuals?: (jobId: string, actuals: number, reason?: string) => void;
}

export const PlanVsActualDashboard: React.FC<PlanVsActualDashboardProps> = ({ jobs, onUpdateActuals }) => {
  const [now, setNow] = useState(new Date());
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [inputActual, setInputActual] = useState<string>('');
  const [inputReason, setInputReason] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const activeJobs = jobs.filter(j => j.status === 'Running');

  useEffect(() => {
    if (!selectedJobId && activeJobs.length > 0) {
      setSelectedJobId(activeJobs[0].id);
    }
  }, [activeJobs, selectedJobId]);

  const selectedJob = activeJobs.find(j => j.id === selectedJobId) || activeJobs[0];

  const handleSave = () => {
    if (!selectedJob || !onUpdateActuals) return;
    
    const actualVal = parseInt(inputActual);
    if (isNaN(actualVal) || actualVal < 0) return;

    setIsUpdating(true);
    // Simulate API call
    setTimeout(() => {
      onUpdateActuals(selectedJob.id, actualVal, inputReason);
      setInputActual('');
      setInputReason('');
      setIsUpdating(false);
    }, 500);
  };

  if (activeJobs.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
        <TrendingUp size={48} className="mx-auto text-slate-300 mb-4" />
        <h3 className="text-lg font-bold text-slate-800 mb-2">ไม่มีงานที่กำลังผลิต</h3>
        <p className="text-slate-500">เริ่มงานในแผนการผลิตเพื่อติดตามยอดผลิตรายชั่วโมง</p>
      </div>
    );
  }

  // Calculate hourly target based on total production and duration
  const getHourlyTarget = (job: ProductionJob) => {
    const start = new Date(job.startDate);
    const end = new Date(job.endDate);
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (durationHours <= 0) return job.totalProduction;
    return Math.round(job.totalProduction / durationHours);
  };

  const hourlyTarget = selectedJob ? getHourlyTarget(selectedJob) : 0;
  const currentActual = selectedJob?.actualProduction || 0;
  
  // Estimate expected production at current time
  const getExpectedProduction = (job: ProductionJob) => {
    const start = new Date(job.startDate);
    const end = new Date(job.endDate);
    if (now < start) return 0;
    if (now > end) return job.totalProduction;
    
    const totalDuration = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    const progress = elapsed / totalDuration;
    
    return Math.round(job.totalProduction * progress);
  };

  const expectedProduction = selectedJob ? getExpectedProduction(selectedJob) : 0;
  const isBehind = currentActual < expectedProduction;
  const diff = currentActual - expectedProduction;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">ติดตามยอดผลิต (Plan vs Actual)</h2>
          <p className="text-slate-500">อัปเดตยอดผลิตจริงเทียบกับแผนงานแบบ Real-time</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
          <Clock size={18} className="text-indigo-600" />
          <span className="font-mono font-medium text-slate-700">
            {formatTimeOnly(now)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Job Selection & Status */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">เลือกงานที่กำลังผลิต</h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {activeJobs.map(job => (
                <button
                  key={job.id}
                  onClick={() => setSelectedJobId(job.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedJobId === job.id 
                      ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' 
                      : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-slate-800">{job.productItem}</span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {job.machineId}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600 truncate">รหัสงาน: {job.jobOrder}</div>
                  <div className="mt-2 flex justify-between items-center text-xs">
                    <span className="text-slate-500">เป้าหมาย: {(job.totalProduction || 0).toLocaleString()}</span>
                    <span className={`font-bold ${(job.actualProduction || 0) >= getExpectedProduction(job) ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {(job.actualProduction || 0).toLocaleString()}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Dashboard & Input */}
        <div className="lg:col-span-2 space-y-6">
          {selectedJob && (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                  <p className="text-xs text-slate-500 uppercase font-bold mb-1">เป้าหมายรวม</p>
                  <p className="text-2xl font-mono font-bold text-slate-800">{(selectedJob.totalProduction || 0).toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                  <p className="text-xs text-slate-500 uppercase font-bold mb-1">เป้าหมายรายชั่วโมง</p>
                  <p className="text-2xl font-mono font-bold text-indigo-600">{hourlyTarget.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                  <p className="text-xs text-slate-500 uppercase font-bold mb-1">เป้าหมายสะสม (ถึงปัจจุบัน)</p>
                  <p className="text-2xl font-mono font-bold text-slate-800">{expectedProduction.toLocaleString()}</p>
                </div>
                <div className={`bg-white rounded-xl shadow-sm border p-4 ${isBehind ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-50'}`}>
                  <p className={`text-xs uppercase font-bold mb-1 ${isBehind ? 'text-rose-600' : 'text-emerald-600'}`}>
                    สถานะปัจจุบัน
                  </p>
                  <div className="flex items-center gap-2">
                    {isBehind ? <AlertTriangle size={20} className="text-rose-600" /> : <CheckCircle2 size={20} className="text-emerald-600" />}
                    <p className={`text-2xl font-mono font-bold ${isBehind ? 'text-rose-700' : 'text-emerald-700'}`}>
                      {diff > 0 ? '+' : ''}{diff.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">ความคืบหน้า: {selectedJob.productItem}</h3>
                    <p className="text-sm text-slate-500">รหัสงาน: {selectedJob.jobOrder}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-mono font-bold text-slate-800">
                      {currentActual.toLocaleString()} <span className="text-lg text-slate-400">/ {(selectedJob.totalProduction || 0).toLocaleString()}</span>
                    </p>
                  </div>
                </div>
                
                <div className="relative h-6 bg-slate-100 rounded-full overflow-hidden mt-4">
                  {/* Expected Progress Marker */}
                  <div 
                    className="absolute top-0 bottom-0 border-r-2 border-slate-800 z-10 transition-all duration-500"
                    style={{ width: `${Math.min(100, (expectedProduction / selectedJob.totalProduction) * 100)}%` }}
                  >
                    <div className="absolute -top-6 -right-3 text-[10px] font-bold text-slate-800 bg-white px-1 rounded shadow-sm border border-slate-200">
                      Plan
                    </div>
                  </div>
                  
                  {/* Actual Progress Bar */}
                  <div 
                    className={`h-full transition-all duration-500 ${isBehind ? 'bg-rose-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, (currentActual / selectedJob.totalProduction) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Input Form */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <TrendingUp size={20} className="text-indigo-600" />
                  อัปเดตยอดผลิตล่าสุด
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">ยอดผลิตที่ได้เพิ่ม (ชิ้น)</label>
                    <input
                      type="number"
                      value={inputActual}
                      onChange={(e) => setInputActual(e.target.value)}
                      placeholder="เช่น 500"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-lg"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">หมายเหตุ / สาเหตุที่ล่าช้า (ถ้ามี)</label>
                    <input
                      type="text"
                      value={inputReason}
                      onChange={(e) => setInputReason(e.target.value)}
                      placeholder="เช่น รอวัตถุดิบ, เครื่องขัดข้อง..."
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={!inputActual || isUpdating}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isUpdating ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Save size={18} />
                    )}
                    บันทึกยอดผลิต
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
