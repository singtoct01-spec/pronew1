import React, { useState } from 'react';
import { DowntimeLog } from '../types';
import { Calendar, Clock, AlertOctagon, FileDown, Search, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';

interface DailyDowntimeReportProps {
  logs: DowntimeLog[];
}

export const DailyDowntimeReport: React.FC<DailyDowntimeReportProps> = ({ logs }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7) // YYYY-MM
  );

  // Filter logs by selected month
  const filteredLogs = logs.filter(log => {
    if (!log.date) return false;
    return log.date.startsWith(selectedMonth);
  });

  // Group by Date
  const groupedByDate = filteredLogs.reduce((acc, log) => {
    const date = log.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(log);
    return acc;
  }, {} as Record<string, DowntimeLog[]>);

  // Sort dates descending
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const handleExportExcel = () => {
    const exportData: any[] = [];
    
    sortedDates.forEach(date => {
      const dayLogs = groupedByDate[date];
      dayLogs.forEach(log => {
        exportData.push({
          'วันที่': new Date(date).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }),
          'เครื่องจักร': log.machineId,
          'หมวดหมู่': log.category === 'Breakdown' ? 'เครื่องเสีย' : 
                     log.category === 'Setup' ? 'เปลี่ยนแม่พิมพ์' : 
                     log.category === 'Quality' ? 'ปัญหาคุณภาพ' : 
                     log.category === 'Material' ? 'รอวัตถุดิบ' : 'อื่นๆ',
          'สาเหตุ/อาการ': log.reason,
          'เวลาเริ่มเสีย': log.startTime || '-',
          'เวลาแก้เสร็จ': log.endTime || '-',
          'รวมเวลา (นาที)': log.durationMinutes,
          'ผลกระทบ': log.impactOnPlan || '-',
          'ผู้รายงาน': log.reporter || '-'
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daily Downtime");
    XLSX.writeFile(wb, `Daily_Downtime_Report_${selectedMonth}.xlsx`);
  };

  return (
    <div className="space-y-6 font-kanit pb-24">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center shadow-sm">
            <AlertOctagon size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">รายงานสรุปเครื่องจักรหยุดทำงาน (Daily Downtime)</h2>
            <p className="text-sm text-slate-500">สรุปเวลาสูญเสียรายวัน สำหรับรายงานผู้บริหาร</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-sm font-medium text-slate-700"
            />
          </div>
          <button 
            onClick={handleExportExcel}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-sm font-medium shadow-sm transition-colors"
          >
            <FileDown size={18} /> Export Excel
          </button>
        </div>
      </div>

      {/* Report Content */}
      <div className="space-y-6">
        {sortedDates.length > 0 ? (
          sortedDates.map(date => {
            const dayLogs = groupedByDate[date];
            const dailyTotalMinutes = dayLogs.reduce((sum, log) => sum + log.durationMinutes, 0);
            const dateObj = new Date(date);
            const formattedDate = dateObj.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

            return (
              <div key={date} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Daily Header */}
                <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-brand-100 text-brand-700 p-2 rounded-lg">
                      <Calendar size={20} />
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg">{formattedDate}</h3>
                  </div>
                  <div className="flex items-center gap-6 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-center">
                      <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">จำนวนครั้งที่เสีย</p>
                      <p className="font-bold text-slate-800">{dayLogs.length} ครั้ง</p>
                    </div>
                    <div className="w-px h-8 bg-slate-200"></div>
                    <div className="text-center">
                      <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">เวลารวมที่สูญเสีย</p>
                      <p className="font-bold text-red-600 flex items-center gap-1 justify-center">
                        <Clock size={14} /> {dailyTotalMinutes} นาที
                      </p>
                    </div>
                  </div>
                </div>

                {/* Daily Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider">
                        <th className="p-4 font-bold w-32">เครื่องจักร</th>
                        <th className="p-4 font-bold">สาเหตุ / อาการ</th>
                        <th className="p-4 font-bold w-32 text-center">เวลาเริ่มเสีย</th>
                        <th className="p-4 font-bold w-32 text-center">เวลาแก้เสร็จ</th>
                        <th className="p-4 font-bold w-32 text-right">รวม (นาที)</th>
                        <th className="p-4 font-bold">ผลกระทบ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {dayLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4">
                            <span className="inline-flex items-center justify-center bg-slate-800 text-white text-xs font-bold px-2.5 py-1 rounded-md">
                              {log.machineId}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="font-medium text-slate-800 text-sm">{log.reason}</div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {log.category === 'Breakdown' ? 'เครื่องเสีย' : 
                               log.category === 'Setup' ? 'เปลี่ยนแม่พิมพ์' : 
                               log.category === 'Quality' ? 'ปัญหาคุณภาพ' : 
                               log.category === 'Material' ? 'รอวัตถุดิบ' : 'อื่นๆ'}
                            </div>
                          </td>
                          <td className="p-4 text-center font-mono text-sm text-slate-600">
                            {log.startTime || '-'}
                          </td>
                          <td className="p-4 text-center font-mono text-sm text-slate-600">
                            {log.endTime || '-'}
                          </td>
                          <td className="p-4 text-right font-bold text-red-600 font-mono text-base">
                            {log.durationMinutes}
                          </td>
                          <td className="p-4 text-sm text-slate-600">
                            {log.impactOnPlan || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-1">ไม่พบข้อมูลเครื่องจักรหยุดทำงาน</h3>
            <p className="text-slate-500">ไม่มีบันทึกเครื่องจักรขัดข้องในเดือนที่เลือก</p>
          </div>
        )}
      </div>
    </div>
  );
};
