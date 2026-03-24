


import React, { useState } from 'react';
import { ProductionJob, Status, InventoryItem, ProductBOM } from '../types';
import { Search, Filter, AlertTriangle, Pencil, Flame, Zap, PauseCircle, CalendarClock, FileText, CheckSquare, Square, Printer, Tag, AlertOctagon, Edit2 } from 'lucide-react';
import { SearchableSelect } from './SearchableSelect';

import { formatDateTime } from '../utils/dateUtils';

interface JobTableProps {
  jobs: ProductionJob[];
  inventory: InventoryItem[];
  boms: ProductBOM[];
  onEditJob: (job: ProductionJob) => void;
  onPrintHandover?: (selectedJobs: ProductionJob[]) => void;
  onPrintTag?: (job: ProductionJob) => void;
  onViewOrder?: (job: ProductionJob) => void;
}

export const JobTable: React.FC<JobTableProps> = ({ jobs, inventory, boms, onEditJob, onPrintHandover, onPrintTag, onViewOrder }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());

  // Pre-calculate maps for O(1) lookups
  const inventoryMap = React.useMemo(() => {
    const map = new Map<string, InventoryItem>();
    inventory.forEach(item => map.set(item.id, item));
    return map;
  }, [inventory]);

  const bomMap = React.useMemo(() => {
    const map = new Map<string, ProductBOM>();
    boms.forEach(bom => {
      map.set(bom.productItem.toLowerCase(), bom);
    });
    return map;
  }, [boms]);

  const getStockStatus = (job: ProductionJob) => {
    // 1. If job has specific materials defined, check them
    if (job.materials && job.materials.length > 0) {
        for (const mat of job.materials) {
            if (mat.inventoryItemId) {
                const item = inventoryMap.get(mat.inventoryItemId);
                const required = mat.qtyPcs > 0 ? mat.qtyPcs : mat.qtyKg;
                if (item && item.currentStock < required) return { status: 'Shortage', item: item.name };
            }
        }
        return { status: 'OK' };
    }

    // 2. If no materials, try to find BOM
    const jobProductLower = job.productItem.toLowerCase();
    let bom = bomMap.get(jobProductLower);
    
    // Fallback to partial match if exact match not found
    if (!bom) {
      bom = boms.find(b => b.productItem.toLowerCase().includes(jobProductLower) || jobProductLower.includes(b.productItem.toLowerCase()));
    }
    
    if (bom) {
        for (const mat of bom.materials) {
            const item = inventoryMap.get(mat.inventoryItemId);
            if (item) {
                const totalQty = mat.qtyPerUnit * (job.totalProduction || 0);
                if (item.currentStock < totalQty) {
                    return { status: 'Shortage', item: item.name };
                }
            }
        }
        return { status: 'OK' };
    }

    return { status: 'Unknown' };
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = 
      job.machineId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.jobOrder.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.productItem.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'All' || job.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const toggleSelectAll = () => {
    if (selectedJobIds.size === filteredJobs.length && filteredJobs.length > 0) {
      setSelectedJobIds(new Set());
    } else {
      setSelectedJobIds(new Set(filteredJobs.map(j => j.id)));
    }
  };

  const toggleSelectJob = (id: string) => {
    const newSelected = new Set(selectedJobIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedJobIds(newSelected);
  };

  const handlePrintHandoverClick = () => {
    if (onPrintHandover && selectedJobIds.size > 0) {
      const selectedJobsList = jobs.filter(j => selectedJobIds.has(j.id));
      onPrintHandover(selectedJobsList);
    }
  };

  const getStatusBadge = (status: Status) => {
    switch (status) {
      case 'Running': return <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">กำลังผลิต</span>;
      case 'Delayed': return <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium flex items-center gap-1"><AlertTriangle size={10}/> ตกแผน</span>;
      case 'Stopped': return <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">หยุด</span>;
      case 'Paused': return <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium flex items-center gap-1"><PauseCircle size={10}/> หยุดชั่วคราว</span>;
      case 'Rescheduled': return <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-medium flex items-center gap-1"><CalendarClock size={10}/> เลื่อนแผน</span>;
      case 'Maintenance': return <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-medium">ซ่อมบำรุง</span>;
      case 'Completed': return <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">เสร็จสิ้น</span>;
      default: return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">{status}</span>;
    }
  };

  const formatDate = (dateStr: string) => {
    return formatDateTime(dateStr);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden font-kanit">
      <div className="p-5 border-b border-slate-200 flex flex-col gap-4">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-slate-800">รายการผลิตทั้งหมด</h2>
                {selectedJobIds.size > 0 && (
                    <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md text-xs font-bold">
                        เลือก {selectedJobIds.size} รายการ
                    </span>
                )}
            </div>
            
            <div className="flex gap-2">
                {selectedJobIds.size > 0 && onPrintHandover && (
                    <button 
                        onClick={handlePrintHandoverClick}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 text-sm transition-colors shadow-sm animate-in fade-in"
                    >
                        <Printer size={16} /> พิมพ์ใบนำส่งเอกสาร ({selectedJobIds.size})
                    </button>
                )}
            </div>
        </div>

        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="ค้นหาเครื่อง, สินค้า, Job Order..." 
              className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="relative md:w-64 z-10">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={16} />
            <SearchableSelect 
              className="pl-8"
              value={filterStatus}
              onChange={setFilterStatus}
              options={[
                { value: 'All', label: 'สถานะทั้งหมด' },
                { value: 'Running', label: 'กำลังผลิต (Running)' },
                { value: 'Paused', label: 'หยุดชั่วคราว (Paused)' },
                { value: 'Delayed', label: 'ตกแผน (Delayed)' },
                { value: 'Stopped', label: 'หยุด (Stopped)' },
                { value: 'Maintenance', label: 'ซ่อมบำรุง (Maintenance)' }
              ]}
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
            <tr>
              <th className="px-4 py-4 w-10">
                <button onClick={toggleSelectAll} className="text-slate-400 hover:text-slate-600">
                    {selectedJobIds.size === filteredJobs.length && filteredJobs.length > 0 ? <CheckSquare size={20} className="text-brand-600"/> : <Square size={20} />}
                </button>
              </th>
              <th className="px-4 py-4">เครื่องจักร</th>
              <th className="px-4 py-4">สินค้า / ออเดอร์</th>
              <th className="px-4 py-4">ประเภท/ความสำคัญ</th>
              <th className="px-4 py-4">สถานะ</th>
              <th className="px-4 py-4 text-right">ยอดเป้าหมาย</th>
              <th className="px-4 py-4 text-right">ผลิตได้</th>
              <th className="px-4 py-4 text-right bg-slate-100 border-x border-slate-200">คงเหลือ</th>
              <th className="px-4 py-4">เวลาเริ่ม</th>
              <th className="px-4 py-4">เวลาจบ</th>
              <th className="px-4 py-4 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredJobs.length > 0 ? filteredJobs.map((job) => {
              const remaining = job.totalProduction - (job.actualProduction || 0);
              const isOver = remaining < 0;
              const stockStatus = getStockStatus(job);
              const isShortage = stockStatus.status === 'Shortage';

              return (
              <tr key={job.id} className={`hover:bg-slate-50 transition-colors group ${selectedJobIds.has(job.id) ? 'bg-indigo-50/50' : ''}`}>
                <td className="px-4 py-4">
                    <button onClick={() => toggleSelectJob(job.id)} className="text-slate-400 hover:text-slate-600">
                        {selectedJobIds.has(job.id) ? <CheckSquare size={20} className="text-brand-600"/> : <Square size={20} />}
                    </button>
                </td>
                <td className="px-4 py-4 font-semibold text-slate-800">{job.machineId}</td>
                <td className="px-4 py-4">
                  <div className="font-medium text-slate-900 flex items-center gap-2">
                    {job.productItem}
                    {isShortage && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold animate-pulse" title={`ขาดวัตถุดิบ: ${stockStatus.item}`}>
                            <AlertOctagon size={10}/> ขาดของ!
                        </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1"><FileText size={10}/> {job.jobOrder}</div>
                </td>
                <td className="px-4 py-4">
                    <div className="flex flex-col gap-1">
                        {job.priority === 'Urgent' && <span className="inline-flex items-center gap-1 text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold w-fit"><Flame size={10}/> ด่วน</span>}
                        {job.jobType === 'Inserted' && <span className="inline-flex items-center gap-1 text-[10px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded font-bold w-fit"><Zap size={10}/> งานแทรก</span>}
                        {(!job.priority || job.priority === 'Normal') && (!job.jobType || job.jobType === 'Planned') && <span className="text-slate-400 text-xs">-</span>}
                    </div>
                </td>
                <td className="px-4 py-4">{getStatusBadge(job.status)}</td>
                <td className="px-4 py-4 text-right font-mono text-slate-600">
                  {(job.totalProduction || 0).toLocaleString()}
                </td>
                <td className="px-4 py-4 text-right font-mono text-slate-800">
                  {job.actualProduction ? job.actualProduction.toLocaleString() : '-'}
                </td>
                <td className={`px-4 py-4 text-right font-mono bg-slate-50 border-x border-slate-100 font-bold ${isOver ? 'text-emerald-600' : 'text-slate-800'}`}>
                  {isOver ? `+${Math.abs(remaining).toLocaleString()}` : remaining.toLocaleString()}
                </td>
                <td className="px-4 py-4 text-slate-600 whitespace-nowrap text-xs">{formatDate(job.startDate)}</td>
                <td className="px-4 py-4 text-slate-600 whitespace-nowrap text-xs">{formatDate(job.endDate)}</td>
                <td className="px-4 py-4 text-right">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onViewOrder && (
                        <button 
                            onClick={() => onViewOrder(job)}
                            className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            title="ดูใบสั่งผลิต"
                        >
                            <FileText size={16} />
                        </button>
                    )}
                    <button 
                        onClick={() => onPrintTag && onPrintTag(job)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="พิมพ์ใบปะหน้า (Sticker)"
                    >
                        <Tag size={16} />
                    </button>
                    <button 
                        onClick={() => onEditJob(job)}
                        className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        title="แก้ไข"
                    >
                        <Edit2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            )}) : (
              <tr>
                <td colSpan={11} className="px-6 py-12 text-center text-slate-400">
                  ไม่พบข้อมูลที่ค้นหา
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
