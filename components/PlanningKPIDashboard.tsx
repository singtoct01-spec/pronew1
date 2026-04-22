import React, { useState, useMemo } from 'react';
import { ProductionJob } from '../types';
import { Target, TrendingUp, AlertOctagon, Calendar, CheckCircle2, Clock, BarChart3, PieChart, X, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface PlanningKPIDashboardProps {
  jobs: ProductionJob[];
}

type MetricType = 'attainment' | 'delay' | 'yield' | 'total' | null;

export const PlanningKPIDashboard: React.FC<PlanningKPIDashboardProps> = ({ jobs }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [selectedMetric, setSelectedMetric] = useState<MetricType>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const handleCardClick = (metric: MetricType) => {
    setSelectedMetric(metric);
    setIsModalOpen(true);
  };

  const getDrilldownData = () => {
    switch (selectedMetric) {
      case 'attainment':
        return filteredJobs.filter(j => j.status !== 'Delayed');
      case 'delay':
        return filteredJobs.filter(j => j.status === 'Delayed');
      case 'yield':
        return filteredJobs.filter(j => j.totalProduction && j.totalProduction > 0);
      case 'total':
        return filteredJobs;
      default:
        return [];
    }
  };

  const getMetricTitle = () => {
    switch (selectedMetric) {
      case 'attainment': return 'รายการงานที่ไม่ล่าช้า (On-time Jobs)';
      case 'delay': return 'รายการงานที่ล่าช้า (Delayed Jobs)';
      case 'yield': return 'รายละเอียดปริมาณผลิตจริงเทียบแผน (Yield Details)';
      case 'total': return 'รายการงานทั้งหมดในเดือนนี้ (Total Jobs)';
      default: return '';
    }
  };

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
        <div 
          onClick={() => handleCardClick('attainment')}
          className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex flex-col cursor-pointer hover:border-brand-400 hover:shadow-md transition-all"
        >
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

        <div 
          onClick={() => handleCardClick('delay')}
          className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex flex-col cursor-pointer hover:border-red-400 hover:shadow-md transition-all"
        >
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

        <div 
          onClick={() => handleCardClick('yield')}
          className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex flex-col cursor-pointer hover:border-blue-400 hover:shadow-md transition-all"
        >
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

        <div 
          onClick={() => handleCardClick('total')}
          className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex flex-col cursor-pointer hover:border-purple-400 hover:shadow-md transition-all"
        >
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

      {/* Drill-down Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <FileText className="text-brand-500" />
                {getMetricTitle()}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-red-500 p-2 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
              {getDrilldownData().length > 0 ? (
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3">เลขที่ใบสั่งผลิต</th>
                          <th className="px-4 py-3">เครื่องจักร</th>
                          <th className="px-4 py-3">สินค้า</th>
                          <th className="px-4 py-3">ยอดแผน</th>
                          {selectedMetric === 'yield' && <th className="px-4 py-3 text-brand-600">ยอดจริง</th>}
                          <th className="px-4 py-3 text-center">เริ่ม</th>
                          <th className="px-4 py-3 text-center">จบ</th>
                          <th className="px-4 py-3 text-center">สถานะ</th>
                          {(selectedMetric === 'delay' || selectedMetric === 'total') && (
                            <th className="px-4 py-3">หมายเหตุ/สาเหตุ</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {getDrilldownData().map(job => (
                          <tr key={job.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium text-brand-600">{job.jobOrder}</td>
                            <td className="px-4 py-3 font-bold">{job.machineId}</td>
                            <td className="px-4 py-3 text-slate-700">{job.productItem}</td>
                            <td className="px-4 py-3">{job.totalProduction?.toLocaleString()}</td>
                            {selectedMetric === 'yield' && (
                              <td className="px-4 py-3 font-bold text-brand-600">
                                {job.actualProduction?.toLocaleString() || 0}
                              </td>
                            )}
                            <td className="px-4 py-3 text-center text-slate-500">
                              {new Date(job.startDate).toLocaleDateString('th-TH')}
                            </td>
                            <td className="px-4 py-3 text-center text-slate-500">
                              {new Date(job.endDate).toLocaleDateString('th-TH')}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                job.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                                job.status === 'Running' ? 'bg-blue-100 text-blue-700' :
                                job.status === 'Delayed' ? 'bg-red-100 text-red-700' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {job.status}
                              </span>
                            </td>
                            {(selectedMetric === 'delay' || selectedMetric === 'total') && (
                              <td className="px-4 py-3 text-xs text-red-600">
                                {job.delayReason || job.remarks || '-'}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <FileText size={48} className="mb-4 text-slate-300" />
                  <p>ไม่มีข้อมูลรายการงานในหมวดหมู่นี้</p>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-200 flex justify-between items-center text-sm text-slate-500">
              <span>แสดงผลสถิติของเดือน <span className="font-bold text-slate-700">{selectedMonth}</span></span>
              <span>รวมทั้งหมด <span className="font-bold text-brand-600">{getDrilldownData().length}</span> รายการ</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
