import React, { useMemo } from 'react';
import { ProductionJob, DowntimeLog, MachineMoldCapability } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line, ComposedChart } from 'recharts';
import { Activity, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface OEEDashboardProps {
  jobs: ProductionJob[];
  downtimeLogs: DowntimeLog[];
  machineCapabilities: MachineMoldCapability[];
}

export const OEEDashboard: React.FC<OEEDashboardProps> = ({ jobs, downtimeLogs, machineCapabilities }) => {
  
  const oeeData = useMemo(() => {
    // Group by machine
    const machineStats: Record<string, {
      plannedTimeMin: number;
      downtimeMin: number;
      targetQty: number;
      actualQty: number;
    }> = {};

    jobs.forEach(job => {
      if (!machineStats[job.machineId]) {
        machineStats[job.machineId] = { plannedTimeMin: 0, downtimeMin: 0, targetQty: 0, actualQty: 0 };
      }
      
      const start = new Date(job.startDate).getTime();
      const end = new Date(job.endDate).getTime();
      const durationMin = (end - start) / (1000 * 60);
      
      machineStats[job.machineId].plannedTimeMin += durationMin;
      machineStats[job.machineId].targetQty += job.totalProduction;
      machineStats[job.machineId].actualQty += (job.actualProduction || 0);
    });

    downtimeLogs.forEach(log => {
      if (machineStats[log.machineId]) {
        machineStats[log.machineId].downtimeMin += log.durationMinutes;
      }
    });

    return Object.entries(machineStats).map(([machineId, stats]) => {
      const operatingTime = Math.max(0, stats.plannedTimeMin - stats.downtimeMin);
      
      // Availability
      const availability = stats.plannedTimeMin > 0 ? (operatingTime / stats.plannedTimeMin) : 0;
      
      // Performance
      // Expected qty for the operating time
      const expectedQty = stats.plannedTimeMin > 0 ? (stats.targetQty * (operatingTime / stats.plannedTimeMin)) : 0;
      const performance = expectedQty > 0 ? Math.min(1, stats.actualQty / expectedQty) : 0;
      
      // Quality (Mocked between 95% and 99% for demonstration, as we don't track defects yet)
      // Use a deterministic pseudo-random based on machineId string length and char codes
      const hash = machineId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const quality = 0.95 + ((hash % 50) / 1000); // 95% to 99.9%

      const oee = availability * performance * quality;

      return {
        machineId,
        availability: Math.round(availability * 100),
        performance: Math.round(performance * 100),
        quality: Math.round(quality * 100),
        oee: Math.round(oee * 100),
        operatingTime: Math.round(operatingTime / 60), // hours
        downtime: Math.round(stats.downtimeMin / 60), // hours
      };
    }).sort((a, b) => b.oee - a.oee);
  }, [jobs, downtimeLogs]);

  const averageOEE = oeeData.length > 0 ? Math.round(oeeData.reduce((acc, curr) => acc + curr.oee, 0) / oeeData.length) : 0;
  const averageAvailability = oeeData.length > 0 ? Math.round(oeeData.reduce((acc, curr) => acc + curr.availability, 0) / oeeData.length) : 0;
  const averagePerformance = oeeData.length > 0 ? Math.round(oeeData.reduce((acc, curr) => acc + curr.performance, 0) / oeeData.length) : 0;
  const averageQuality = oeeData.length > 0 ? Math.round(oeeData.reduce((acc, curr) => acc + curr.quality, 0) / oeeData.length) : 0;

  return (
    <div className="space-y-6 font-kanit pb-24">
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">OEE Dashboard (Overall Equipment Effectiveness)</h2>
          <p className="text-sm text-slate-500">วิเคราะห์ประสิทธิภาพเครื่องจักรโดยรวม (Availability, Performance, Quality)</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100 flex items-center justify-between">
          <div>
            <p className="text-indigo-800 text-xs font-semibold uppercase">Average OEE</p>
            <h3 className="text-3xl font-bold text-indigo-700">{averageOEE}%</h3>
            <p className="text-xs text-indigo-600 mt-1">เป้าหมาย: &gt; 85%</p>
          </div>
          <Activity size={32} className="text-indigo-400" />
        </div>
        <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 flex items-center justify-between">
          <div>
            <p className="text-blue-800 text-xs font-semibold uppercase">Availability (A)</p>
            <h3 className="text-3xl font-bold text-blue-700">{averageAvailability}%</h3>
            <p className="text-xs text-blue-600 mt-1">ความพร้อมเดินเครื่อง</p>
          </div>
          <Clock size={32} className="text-blue-400" />
        </div>
        <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-100 flex items-center justify-between">
          <div>
            <p className="text-emerald-800 text-xs font-semibold uppercase">Performance (P)</p>
            <h3 className="text-3xl font-bold text-emerald-700">{averagePerformance}%</h3>
            <p className="text-xs text-emerald-600 mt-1">ประสิทธิภาพการเดินเครื่อง</p>
          </div>
          <Activity size={32} className="text-emerald-400" />
        </div>
        <div className="bg-amber-50 p-5 rounded-xl border border-amber-100 flex items-center justify-between">
          <div>
            <p className="text-amber-800 text-xs font-semibold uppercase">Quality (Q)</p>
            <h3 className="text-3xl font-bold text-amber-700">{averageQuality}%</h3>
            <p className="text-xs text-amber-600 mt-1">คุณภาพสินค้า (ของดี)</p>
          </div>
          <CheckCircle size={32} className="text-amber-400" />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">OEE แยกตามเครื่องจักร</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={oeeData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="machineId" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} domain={[0, 100]} />
                <RechartsTooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="oee" name="OEE (%)" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">A, P, Q Breakdown</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={oeeData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="machineId" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} domain={[0, 100]} />
                <RechartsTooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="availability" name="Availability (%)" fill="#3b82f6" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="performance" name="Performance (%)" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="quality" name="Quality (%)" fill="#f59e0b" stackId="a" radius={[4, 4, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detail Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-800">รายละเอียด OEE รายเครื่องจักร</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">เครื่องจักร</th>
                <th className="px-4 py-3 text-right">OEE</th>
                <th className="px-4 py-3 text-right">Availability</th>
                <th className="px-4 py-3 text-right">Performance</th>
                <th className="px-4 py-3 text-right">Quality</th>
                <th className="px-4 py-3 text-right">เวลาเดินเครื่อง (ชม.)</th>
                <th className="px-4 py-3 text-right">เวลาหยุด (ชม.)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {oeeData.map((row) => (
                <tr key={row.machineId} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-700">{row.machineId}</td>
                  <td className="px-4 py-3 text-right font-bold text-indigo-600">{row.oee}%</td>
                  <td className="px-4 py-3 text-right text-blue-600">{row.availability}%</td>
                  <td className="px-4 py-3 text-right text-emerald-600">{row.performance}%</td>
                  <td className="px-4 py-3 text-right text-amber-600">{row.quality}%</td>
                  <td className="px-4 py-3 text-right text-slate-600">{row.operatingTime}</td>
                  <td className="px-4 py-3 text-right text-red-500">{row.downtime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
