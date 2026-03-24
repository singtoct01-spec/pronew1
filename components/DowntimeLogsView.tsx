import React, { useState } from 'react';
import { DowntimeLog } from '../types';
import { AlertOctagon, Clock, Wrench, AlertTriangle, FileText, Search, Filter, Trash2 } from 'lucide-react';

import { formatDateOnly } from '../utils/dateUtils';

interface DowntimeLogsViewProps {
  logs: DowntimeLog[];
  onDeleteLog?: (id: string) => void;
}

export const DowntimeLogsView: React.FC<DowntimeLogsViewProps> = ({ logs, onDeleteLog }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.machineId.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          log.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (log.reporter && log.reporter.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = filterCategory === 'All' || log.category === filterCategory;
    return matchesSearch && matchesCategory;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalDowntime = filteredLogs.reduce((sum, log) => sum + log.durationMinutes, 0);
  
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Breakdown': return <Wrench className="text-red-500" size={18} />;
      case 'Setup': return <Clock className="text-blue-500" size={18} />;
      case 'Quality': return <AlertTriangle className="text-orange-500" size={18} />;
      case 'Material': return <FileText className="text-purple-500" size={18} />;
      default: return <AlertOctagon className="text-slate-500" size={18} />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Breakdown': return 'bg-red-50 text-red-700 border-red-200';
      case 'Setup': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Quality': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Material': return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 font-kanit">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">เวลาสูญเสียรวม (นาที)</p>
            <p className="text-2xl font-bold text-slate-800">{totalDowntime.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
            <AlertOctagon size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">จำนวนครั้งที่ขัดข้อง</p>
            <p className="text-2xl font-bold text-slate-800">{filteredLogs.length}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Wrench size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">เครื่องที่เสียบ่อยสุด</p>
            <p className="text-xl font-bold text-slate-800">
              {filteredLogs.length > 0 ? 
                Object.entries(filteredLogs.reduce((acc, log) => { acc[log.machineId] = (acc[log.machineId] || 0) + 1; return acc; }, {} as Record<string, number>))
                .sort((a: [string, number], b: [string, number]) => b[1] - a[1])[0][0] 
                : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="ค้นหาเครื่องจักร, อาการ, ผู้รายงาน..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          {['All', 'Breakdown', 'Setup', 'Quality', 'Material', 'Other'].map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                filterCategory === cat 
                  ? 'bg-brand-500 text-white shadow-sm' 
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat === 'All' ? 'ทั้งหมด' : 
               cat === 'Breakdown' ? 'เครื่องเสีย' : 
               cat === 'Setup' ? 'เปลี่ยนแม่พิมพ์/สี' : 
               cat === 'Quality' ? 'ปัญหาคุณภาพ' : 
               cat === 'Material' ? 'รอวัตถุดิบ' : 'อื่นๆ'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm">
                <th className="p-4 font-medium">วันที่/เวลา</th>
                <th className="p-4 font-medium">เครื่องจักร</th>
                <th className="p-4 font-medium">หมวดหมู่</th>
                <th className="p-4 font-medium">สาเหตุ/อาการ</th>
                <th className="p-4 font-medium text-right">เวลาที่เสีย (นาที)</th>
                <th className="p-4 font-medium">ผลกระทบ (งานตกแผน)</th>
                <th className="p-4 font-medium">ผู้รายงาน</th>
                {onDeleteLog && <th className="p-4 font-medium text-right">จัดการ</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length > 0 ? (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-sm text-slate-600">
                      <div>{formatDateOnly(log.date)}</div>
                      <div className="text-xs text-slate-400">
                        {log.startTime && log.endTime ? `${log.startTime} - ${log.endTime}` : ''}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-slate-800">{log.machineId}</span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${getCategoryColor(log.category)}`}>
                        {getCategoryIcon(log.category)}
                        {log.category === 'Breakdown' ? 'เครื่องเสีย' : 
                         log.category === 'Setup' ? 'เปลี่ยนแม่พิมพ์' : 
                         log.category === 'Quality' ? 'ปัญหาคุณภาพ' : 
                         log.category === 'Material' ? 'รอวัตถุดิบ' : 'อื่นๆ'}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-700 max-w-xs truncate" title={log.reason}>
                      {log.reason}
                    </td>
                    <td className="p-4 text-right font-bold text-red-600">
                      {log.durationMinutes}
                    </td>
                    <td className="p-4 text-sm text-slate-600 max-w-xs truncate" title={log.impactOnPlan || '-'}>
                      {log.impactOnPlan || '-'}
                    </td>
                    <td className="p-4 text-sm text-slate-500">
                      {log.reporter || '-'}
                    </td>
                    {onDeleteLog && (
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => onDeleteLog(log.id)}
                          className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                          title="ลบข้อมูล"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    ไม่พบข้อมูลบันทึกเครื่องจักรขัดข้อง
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
