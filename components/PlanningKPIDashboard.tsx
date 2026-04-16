import React, { useState, useMemo } from 'react';
import { ProductionJob } from '../types';
import { Target, TrendingUp, AlertOctagon, Calendar, CheckCircle2, Clock, BarChart3, PieChart } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface PlanningKPIDashboardProps {
  jobs: ProductionJob[];
}

export const PlanningKPIDashboard: React.FC<PlanningKPIDashboardProps> = ({ jobs }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM

  // Filter jobs by selected month
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const jobDate = job.endDate || job.startDate;
      if (!jobDate) return false;
      return jobDate.startsWith(selectedMonth);
    });
  }, [jobs, selectedMonth]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalJobs = filteredJobs.length;
    if (totalJobs === 0) return { scheduleAttainment: 0, delayRate: 0, productionYield: 0, totalPlanned: 0, totalCompleted: 0, totalDelayed: 0, totalPlannedQty: 0, totalActualQty: 0 };

    const completedJobs = filteredJobs.filter(j => j.status === 'Completed').length;
    const delayedJobs = filteredJobs.filter(j => j.status === 'Delayed').length;
    
    // Schedule Attainment: % of jobs completed (not delayed)
    const scheduleAttainment = totalJobs > 0 ? ((totalJobs - delayedJobs) / totalJobs) * 100 : 0;
    
    // Delay Rate
    const delayRate = totalJobs > 0 ? (delayedJobs / totalJobs) * 100 : 0;

    // Production Yield (Actual vs Planned qty)
    let totalPlannedQty = 0;
    let totalActualQty = 0;
    filteredJobs.forEach(job => {
      totalPlannedQty += (job.totalProduction || 0);
      totalActualQty += (job.actualProduction || 0);
    });
    const productionYield = totalPlannedQty > 0 ? (totalActualQty / totalPlannedQty) * 100 : 0;

    return {
      scheduleAttainment,
      delayRate,
      productionYield,
      totalPlanned: totalJobs,
      totalCompleted: completedJobs,
      totalDelayed: delayedJobs,
      totalPlannedQty,
      totalActualQty
    };
  }, [filteredJobs]);

  // Chart Data: Plan vs Actual by Machine
  const machineData = useMemo(() => {
    const data: Record<string, { name: string; planned: number; actual: number }> = {};
    filteredJobs.forEach(job => {
      if (!data[job.machineId]) {
        data[job.machineId] = { name: job.machineId, planned: 0, actual: 0 };
      }
      data[job.machineId].planned += (job.totalProduction || 0);
      data[job.machineId].actual += (job.actualProduction || 0);
    });
    return Object.values(data);
  }, [filteredJobs]);

  // Chart Data: Delay Reasons
  const delayReasonData = useMemo(() => {
    const reasons: Record<string, number> = {};
    filteredJobs.filter(j => j.status === 'Delayed').forEach(job => {
      const reason = job.delayReason || job.remarks || 'ไม่ระบุสาเหตุ';
      // Simplify reason grouping by taking first few words or exact match
      const shortReason = reason.length > 30 ? reason.substring(0, 30) + '...' : reason;
      reasons[shortReason] = (reasons[shortReason] || 0) + 1;
    });
    return Object.entries(reasons).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredJobs]);

  const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef'];

  return (
    <div className="p-6 max-w-7xl mx-auto font-kanit">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Target className="text-brand-500" /> KPI แผนกวางแผน (Planning Department KPIs)
          </h1>
          <p className="text-slate-500">ตัวชี้วัดประสิทธิภาพการวางแผนและการผลิตตามแผน</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
          <Calendar size={20} className="text-slate-500" />
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border-none focus:ring-0 text-slate-700 font-medium outline-none"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 size={24} />
            </div>
            <span className={`text-sm font-bold px-2 py-1 rounded-full ${kpis.scheduleAttainment >= 90 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              เป้าหมาย: 90%
            </span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium mb-1">ความสำเร็จตามแผน (Schedule Attainment)</h3>
          <div className="text-3xl font-bold text-slate-800 mb-2">{kpis.scheduleAttainment.toFixed(1)}%</div>
          <p className="text-xs text-slate-500 mt-auto">สัดส่วนงานที่ทำเสร็จตรงตามเวลาที่วางแผนไว้</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
              <AlertOctagon size={24} />
            </div>
            <span className={`text-sm font-bold px-2 py-1 rounded-full ${kpis.delayRate <= 10 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              เป้าหมาย: &lt;10%
            </span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium mb-1">อัตรางานล่าช้า (Delay Rate)</h3>
          <div className="text-3xl font-bold text-slate-800 mb-2">{kpis.delayRate.toFixed(1)}%</div>
          <p className="text-xs text-slate-500 mt-auto">สัดส่วนงานที่ล่าช้ากว่าแผน ({kpis.totalDelayed} จาก {kpis.totalPlanned} งาน)</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <TrendingUp size={24} />
            </div>
            <span className={`text-sm font-bold px-2 py-1 rounded-full ${kpis.productionYield >= 95 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              เป้าหมาย: 95%
            </span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium mb-1">ยอดผลิตจริงเทียบแผน (Production Yield)</h3>
          <div className="text-3xl font-bold text-slate-800 mb-2">{kpis.productionYield.toFixed(1)}%</div>
          <p className="text-xs text-slate-500 mt-auto">ปริมาณผลิตจริง {kpis.totalActualQty.toLocaleString()} / แผน {kpis.totalPlannedQty.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
              <Clock size={24} />
            </div>
          </div>
          <h3 className="text-slate-500 text-sm font-medium mb-1">จำนวนงานทั้งหมด (Total Jobs)</h3>
          <div className="text-3xl font-bold text-slate-800 mb-2">{kpis.totalPlanned} <span className="text-lg font-normal text-slate-500">งาน</span></div>
          <p className="text-xs text-slate-500 mt-auto">เสร็จสิ้น {kpis.totalCompleted} งาน</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Plan vs Actual Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <BarChart3 size={20} className="text-brand-500" /> ยอดผลิตตามแผน vs ผลิตจริง (แยกตามเครื่องจักร)
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={machineData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{fill: '#f1f5f9'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="planned" name="ยอดตามแผน (Plan)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" name="ยอดผลิตจริง (Actual)" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Delay Reasons Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <PieChart size={20} className="text-red-500" /> สัดส่วนสาเหตุงานล่าช้า (Root Causes)
          </h3>
          <div className="h-80">
            {delayReasonData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={delayReasonData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {delayReasonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <CheckCircle2 size={48} className="text-emerald-400 mb-4" />
                <p>ไม่มีข้อมูลงานล่าช้าในเดือนนี้</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
