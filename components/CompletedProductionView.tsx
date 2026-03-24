
import React, { useState, useEffect } from 'react';
import { ProductionJob, Status, sortMachines, InventoryItem, ProductBOM } from '../types';
import { Clock, CheckCircle2, Calendar, FileDown, Printer, FileText, Tag, Share, Search, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';

import { formatDateTime } from '../utils/dateUtils';

interface CompletedProductionViewProps {
  jobs: ProductionJob[];
  onViewOrder: (job: ProductionJob) => void;
  onPrintTag?: (job: ProductionJob) => void;
  onPrintHandover?: (jobs: ProductionJob[]) => void;
}

export const CompletedProductionView: React.FC<CompletedProductionViewProps> = ({ jobs, onViewOrder, onPrintTag, onPrintHandover }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMachine, setFilterMachine] = useState('All');

  const completedJobs = jobs.filter(j => j.status === 'Completed');

  const filteredJobs = completedJobs.filter(job => {
    const matchesSearch = job.productItem.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         job.jobOrder.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.moldCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMachine = filterMachine === 'All' || job.machineId === filterMachine;
    return matchesSearch && matchesMachine;
  });

  const machines = Array.from(new Set(completedJobs.map(j => j.machineId))).sort();

  const handleExportExcel = () => {
    const exportData = filteredJobs.map(job => ({
      'เครื่องจักร': job.machineId,
      'เลขที่ใบสั่งผลิต': job.jobOrder,
      'สินค้า': job.productItem,
      'แม่พิมพ์': job.moldCode,
      'วันที่เริ่ม': formatDateTime(job.startDate),
      'วันที่จบ': formatDateTime(job.endDate),
      'เป้าหมาย': job.totalProduction,
      'ผลิตได้จริง': job.actualProduction || 0,
      'หมายเหตุ': job.remarks || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Completed Jobs");
    XLSX.writeFile(wb, `Completed_Jobs_${new Date().getTime()}.xlsx`);
  };

  const formatDateShort = (dateString: string) => {
    return formatDateTime(dateString);
  };

  return (
    <div className="space-y-6 pb-24 font-kanit">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
         <div className="flex gap-4 items-center">
             <div className="bg-blue-600 p-3 rounded-lg text-white shadow-sm">
                <CheckCircle2 size={20} />
             </div>
             <div>
                <h2 className="text-lg font-bold text-slate-800">ประวัติการผลิตที่เสร็จสิ้น (Completed Jobs)</h2>
                <p className="text-xs text-slate-500">รายการงานที่ผลิตเสร็จสมบูรณ์แล้ว แยกตามเครื่องจักร</p>
             </div>
         </div>
         <div className="flex gap-2 w-full md:w-auto">
            <button onClick={handleExportExcel} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium shadow-sm transition-colors">
                <FileDown size={16} /> Export Excel
            </button>
         </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="ค้นหา สินค้า, Order, แม่พิมพ์..." 
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <select 
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm appearance-none"
            value={filterMachine}
            onChange={(e) => setFilterMachine(e.target.value)}
          >
            <option value="All">ทุกเครื่องจักร</option>
            {machines.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex items-center justify-end text-sm text-slate-500 font-medium">
          พบทั้งหมด {filteredJobs.length} รายการ
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">เครื่อง</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">สินค้า / แม่พิมพ์</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Job Order</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">วันที่เริ่ม - จบ</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">เป้าหมาย</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">ผลิตได้จริง</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredJobs.length > 0 ? (
                filteredJobs.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()).map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center justify-center bg-slate-800 text-white text-xs font-bold px-2 py-1 rounded min-w-[40px]">
                        {job.machineId}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-bold text-slate-800">{job.productItem}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">Mold: {job.moldCode}</span>
                        {job.color && job.color !== '-' && (
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{job.color}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm font-mono text-slate-600">{job.jobOrder}</td>
                    <td className="px-4 py-4">
                      <div className="text-xs text-slate-500">เริ่ม: {formatDateShort(job.startDate)}</div>
                      <div className="text-xs text-emerald-600 font-bold">จบ: {formatDateShort(job.endDate)}</div>
                    </td>
                    <td className="px-4 py-4 text-right font-mono font-bold text-slate-700">
                      {job.totalProduction.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-right font-mono font-bold text-blue-600">
                      {(job.actualProduction || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => onViewOrder(job)}
                          className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                          title="ดูใบสั่งผลิต"
                        >
                          <FileText size={16} />
                        </button>
                        {onPrintTag && (
                          <button 
                            onClick={() => onPrintTag(job)}
                            className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                            title="พิมพ์ป้ายบ่งชี้"
                          >
                            <Tag size={16} />
                          </button>
                        )}
                        {onPrintHandover && (
                          <button 
                            onClick={() => onPrintHandover([job])}
                            className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                            title="พิมพ์ใบส่งมอบงาน"
                          >
                            <Share size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400 italic">
                    ไม่พบรายการที่เสร็จสิ้นตามเงื่อนไขการค้นหา
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
