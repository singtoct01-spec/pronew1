import React, { useMemo } from 'react';
import { TrendingUp, AlertCircle, CheckCircle2, PauseCircle, Activity, BarChart3, PieChart } from 'lucide-react';
import { ProductionJob, DowntimeLog, ShiftProductionLog } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';

interface DashboardStatsProps {
  data: ProductionJob[];
  downtimeLogs?: DowntimeLog[];
  shiftProductionLogs?: ShiftProductionLog[];
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ data, downtimeLogs = [], shiftProductionLogs = [] }) => {
  const totalJobs = data.length;
  const delayedJobs = data.filter(j => j.status === 'Delayed').length;
  const runningJobs = data.filter(j => j.status === 'Running').length;
  const stoppedMachines = data.filter(j => j.status === 'Stopped' || j.status === 'Maintenance').length;

  // --- 1. Calculate OEE (Simulated based on available data) ---
  // A = Availability (Uptime / Planned Time)
  // P = Performance (Actual Output / Theoretical Output)
  // Q = Quality (Good Parts / Total Parts) - We'll simulate this as we don't have scrap data yet
  const oeeMetrics = useMemo(() => {
    let totalPlannedMinutes = 0;
    let totalDowntimeMinutes = 0;
    let totalTargetProduction = 0;
    let totalActualProduction = 0;

    data.forEach(job => {
      if (job.startDate && job.endDate && (job.status === 'Running' || job.status === 'Completed' || job.status === 'Delayed')) {
        const start = new Date(job.startDate).getTime();
        const end = new Date(job.endDate).getTime();
        if (!isNaN(start) && !isNaN(end)) {
           totalPlannedMinutes += (end - start) / (1000 * 60);
        }
        totalTargetProduction += job.totalProduction || 0;
        totalActualProduction += job.actualProduction || 0;
      }
    });

    downtimeLogs.forEach(log => {
      totalDowntimeMinutes += log.durationMinutes;
    });

    const availability = totalPlannedMinutes > 0 ? Math.max(0, (totalPlannedMinutes - totalDowntimeMinutes) / totalPlannedMinutes) : 0.85; // Default 85% if no data
    const performance = totalTargetProduction > 0 ? Math.min(1, totalActualProduction / totalTargetProduction) : 0.90; // Default 90% if no data
    const quality = 0.98; // Simulated 98% Good Rate (2% Scrap)

    const oee = availability * performance * quality;

    return {
      availability: (availability * 100).toFixed(1),
      performance: (performance * 100).toFixed(1),
      quality: (quality * 100).toFixed(1),
      oee: (oee * 100).toFixed(1)
    };
  }, [data, downtimeLogs]);

  // --- 2. Production vs Target Data for Bar Chart ---
  const productionData = useMemo(() => {
    // Group by Machine Prefix (IP, IO, AB) for simplicity, or top 5 machines
    const machineStats: Record<string, { name: string, target: number, actual: number }> = {};
    
    data.forEach(job => {
      if (!job.machineId) return;
      const prefix = job.machineId.match(/^[A-Z]+/)?.[0] || 'Other';
      if (!machineStats[prefix]) {
        machineStats[prefix] = { name: prefix, target: 0, actual: 0 };
      }
      machineStats[prefix].target += job.totalProduction || 0;
      machineStats[prefix].actual += job.actualProduction || 0;
    });

    return Object.values(machineStats).sort((a, b) => b.target - a.target);
  }, [data]);

  // --- 3. Downtime Analysis Data for Pie Chart ---
  const downtimeData = useMemo(() => {
    const categoryCounts: Record<string, number> = {};
    downtimeLogs.forEach(log => {
      categoryCounts[log.category] = (categoryCounts[log.category] || 0) + log.durationMinutes;
    });

    return Object.entries(categoryCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [downtimeLogs]);

  const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#64748b'];

  const today = new Date().toISOString().split('T')[0];
  const shortfallsToday = shiftProductionLogs.filter(log => log.date === today && log.isBelowTarget).length;

  const cards = [
    {
      label: 'Overall Equipment Effectiveness',
      value: `${oeeMetrics.oee}%`,
      icon: <Activity className="text-indigo-500" size={24} />,
      color: 'border-l-4 border-indigo-500',
      subtext: `A: ${oeeMetrics.availability}% | P: ${oeeMetrics.performance}% | Q: ${oeeMetrics.quality}%`,
    },
    {
      label: 'งานที่กำลังผลิต',
      value: runningJobs,
      icon: <TrendingUp className="text-emerald-500" size={24} />,
      color: 'border-l-4 border-emerald-500',
      subtext: 'เครื่องกำลังเดิน (Active)',
    },
    {
      label: 'งานตกแผน/เร่งด่วน',
      value: delayedJobs,
      icon: <AlertCircle className="text-red-500" size={24} />,
      color: 'border-l-4 border-red-500',
      subtext: 'ต้องรีบตรวจสอบแก้ไข',
    },
    {
      label: 'เครื่องหยุด/ซ่อม',
      value: stoppedMachines,
      icon: <PauseCircle className="text-slate-500" size={24} />,
      color: 'border-l-4 border-slate-500',
      subtext: 'ไม่มีแผน หรือ รอซ่อม',
    },
    {
      label: 'ตกแคปวันนี้',
      value: shortfallsToday,
      icon: <AlertCircle className="text-orange-500" size={24} />,
      color: 'border-l-4 border-orange-500',
      subtext: 'ยอดผลิตต่ำกว่าเป้า',
    },
  ];

  return (
    <div className="space-y-6 font-kanit">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {cards.map((card, idx) => (
          <div key={idx} className={`bg-white rounded-xl shadow-sm p-6 ${card.color} flex items-start justify-between`}>
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">{card.label}</p>
              <h3 className="text-3xl font-bold text-slate-800">{card.value}</h3>
              <p className="text-xs text-slate-400 mt-2">{card.subtext}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-full">
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Production vs Target Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="text-brand-600" size={20} />
            <h3 className="text-lg font-bold text-slate-800">ยอดผลิตจริง vs เป้าหมาย (แยกตามกลุ่มเครื่อง)</h3>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={productionData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(value) => `${value / 1000}k`} />
                <RechartsTooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="target" name="เป้าหมาย (Target)" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" name="ผลิตจริง (Actual)" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Downtime Analysis Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-6">
            <PieChart className="text-orange-500" size={20} />
            <h3 className="text-lg font-bold text-slate-800">สัดส่วนสาเหตุเครื่องจักรหยุด (Downtime Analysis)</h3>
          </div>
          <div className="h-72 w-full flex items-center justify-center">
            {downtimeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={downtimeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {downtimeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value: number) => [`${value} นาที`, 'ระยะเวลา']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px' }} />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-400 flex flex-col items-center">
                <PieChart size={48} className="mb-2 opacity-20" />
                <p>ยังไม่มีข้อมูล Downtime</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};