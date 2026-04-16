import React, { useState, useMemo } from 'react';
import { ProductionJob } from '../types';
import { AlertOctagon, Calendar, Download, Search, Filter, FileText, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';

interface DelayedJobsReportProps {
  jobs: ProductionJob[];
}

export const DelayedJobsReport: React.FC<DelayedJobsReportProps> = ({ jobs }) => {
  const [dateRange, setDateRange] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');

  // Calculate date ranges
  const handleDateRangeChange = (range: 'daily' | 'weekly' | 'monthly' | 'custom') => {
    setDateRange(range);
    const today = new Date();
    
    if (range === 'daily') {
      setStartDate(today.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (range === 'weekly') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); // Monday
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
      
      setStartDate(startOfWeek.toISOString().split('T')[0]);
      setEndDate(endOfWeek.toISOString().split('T')[0]);
    } else if (range === 'monthly') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      setStartDate(startOfMonth.toISOString().split('T')[0]);
      setEndDate(endOfMonth.toISOString().split('T')[0]);
    }
  };

  // Filter jobs
  const delayedJobs = useMemo(() => {
    return jobs.filter(job => {
      // Must be delayed
      if (job.status !== 'Delayed') return false;

      // Date filtering (use planned end date or actual end date if available)
      const jobDateStr = job.actualEndDate || job.endDate;
      if (!jobDateStr) return false;
      
      const jobDate = new Date(jobDateStr).toISOString().split('T')[0];
      
      if (jobDate < startDate || jobDate > endDate) return false;

      // Search filtering
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          job.jobOrder.toLowerCase().includes(term) ||
          job.productItem.toLowerCase().includes(term) ||
          job.machineId.toLowerCase().includes(term) ||
          (job.delayReason && job.delayReason.toLowerCase().includes(term))
        );
      }

      return true;
    }).sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
  }, [jobs, startDate, endDate, searchTerm]);

  const exportToExcel = () => {
    const data = delayedJobs.map(job => ({
      'เลขที่ใบสั่งผลิต (Job Order)': job.jobOrder,
      'รายการสินค้า (Product/BOM)': job.productItem,
      'เครื่องจักร (Machine)': job.machineId,
      'เวลาเริ่มตามแผน (Planned Start)': new Date(job.startDate).toLocaleString('th-TH'),
      'เวลาจบตามแผน (Planned End)': new Date(job.endDate).toLocaleString('th-TH'),
      'เวลาเริ่มจริง (Actual Start)': job.actualStartDate ? new Date(job.actualStartDate).toLocaleString('th-TH') : '-',
      'เวลาจบจริง (Actual End)': job.actualEndDate ? new Date(job.actualEndDate).toLocaleString('th-TH') : '-',
      'สาเหตุที่ล่าช้า (Root Cause)': job.delayReason || job.remarks || 'ไม่ได้ระบุสาเหตุ',
      'หมายเหตุ (Note)': job.note || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Delayed Jobs');
    XLSX.writeFile(wb, `Delayed_Jobs_Report_${startDate}_to_${endDate}.xlsx`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <AlertOctagon className="text-red-500" /> สรุปรายงานงานล่าช้า (Delayed Jobs Report)
          </h1>
          <p className="text-slate-500">รวบรวมข้อมูลงานที่ตกแผน พร้อมสาเหตุ เพื่อนำไปวิเคราะห์และแก้ไข</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors border border-slate-200"
          >
            <Printer size={20} /> พิมพ์รายงาน
          </button>
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Download size={20} /> Export Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-slate-700 mb-1">ช่วงเวลา</label>
            <select 
              value={dateRange}
              onChange={(e) => handleDateRangeChange(e.target.value as any)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="daily">รายวัน (Daily)</option>
              <option value="weekly">รายสัปดาห์ (Weekly)</option>
              <option value="monthly">รายเดือน (Monthly)</option>
              <option value="custom">กำหนดเอง (Custom)</option>
            </select>
          </div>
          
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-slate-700 mb-1">ตั้งแต่วันที่</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDateRange('custom');
              }}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-slate-700 mb-1">ถึงวันที่</label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDateRange('custom');
              }}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-slate-700 mb-1">ค้นหา</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="ค้นหา Job, Item, สาเหตุ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            </div>
          </div>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900">รายงานสรุปงานล่าช้า (Delayed Jobs Report)</h1>
        <p className="text-slate-700 mt-2">
          ประจำวันที่: {new Date(startDate).toLocaleDateString('th-TH')} ถึง {new Date(endDate).toLocaleDateString('th-TH')}
        </p>
      </div>

      {/* Report Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">เลขที่ Job / รายการ (BOM)</th>
                <th className="px-4 py-3">เครื่องจักร</th>
                <th className="px-4 py-3">เวลาตามแผน (Plan)</th>
                <th className="px-4 py-3">เวลาจริง (Actual)</th>
                <th className="px-4 py-3 w-1/3">สาเหตุที่ล่าช้า (Root Cause)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {delayedJobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    <AlertOctagon size={48} className="mx-auto text-slate-300 mb-3" />
                    <p>ไม่พบข้อมูลงานล่าช้าในช่วงเวลาที่เลือก</p>
                  </td>
                </tr>
              ) : (
                delayedJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{job.jobOrder}</div>
                      <div className="text-slate-500 text-xs mt-0.5">{job.productItem}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
                        {job.machineId}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-700">เริ่ม: {new Date(job.startDate).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}</div>
                      <div className="text-slate-700">จบ: {new Date(job.endDate).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-700">เริ่ม: {job.actualStartDate ? new Date(job.actualStartDate).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '-'}</div>
                      <div className="text-slate-700">จบ: {job.actualEndDate ? new Date(job.actualEndDate).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '-'}</div>
                    </td>
                    <td className="px-4 py-3">
                      {job.delayReason ? (
                        <div className="text-red-700 bg-red-50 p-2 rounded border border-red-100 text-xs whitespace-pre-wrap">
                          {job.delayReason}
                        </div>
                      ) : job.remarks ? (
                        <div className="text-amber-700 bg-amber-50 p-2 rounded border border-amber-100 text-xs whitespace-pre-wrap">
                          {job.remarks}
                        </div>
                      ) : (
                        <div className="text-slate-400 italic text-xs">
                          ไม่ได้ระบุสาเหตุ (กรุณาอัปเดตข้อมูล)
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="mt-4 bg-blue-50 p-4 rounded-lg border border-blue-100 flex gap-3 print:hidden">
        <div className="text-blue-500 shrink-0 mt-0.5"><FileText size={20} /></div>
        <div>
          <p className="text-sm font-medium text-blue-800">คำแนะนำในการบันทึกข้อมูล</p>
          <p className="text-xs text-blue-600 mt-1">
            เพื่อให้รายงานมีความสมบูรณ์ เมื่อมีการเปลี่ยนสถานะงานเป็น "ล่าช้า" (Delayed) ควรระบุ "สาเหตุที่ล่าช้า" (Delay Reason) และเวลาจบจริงเสมอ ข้อมูลเหล่านี้ AI สามารถช่วยสรุปให้ได้จากรายงานประจำวัน
          </p>
        </div>
      </div>
    </div>
  );
};
