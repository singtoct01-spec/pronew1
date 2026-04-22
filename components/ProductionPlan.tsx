


import React, { useState, useEffect, useRef } from 'react';
import { ProductionJob, Status, SIMULATED_NOW, sortMachines, InventoryItem, ProductBOM } from '../types';
import { Edit2, Clock, AlertTriangle, CheckCircle2, PauseCircle, Hammer, Calendar, ArrowRight, Package, Hash, Palette, Layers, AlertCircle, FileDown, Printer, FileText, Flame, Zap, GitCommit, AlertOctagon, TrendingUp, Download, Upload, Tag, Share, X, ArrowRightLeft } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { MoveJobModal } from './MoveJobModal';

import { formatDateTime, formatDateOnly, formatTimeOnly } from '../utils/dateUtils';

interface ProductionPlanProps {
  jobs: ProductionJob[];
  inventory: InventoryItem[];
  boms: ProductBOM[];
  onEditJob: (job: ProductionJob) => void;
  onViewOrder: (job: ProductionJob) => void;
  onPrintTag?: (job: ProductionJob) => void;
  onPrintHandover?: (jobs: ProductionJob[]) => void;
  onImportJobs?: (jobs: Partial<ProductionJob>[]) => void;
  onPrintPlan?: () => void;
  onOpenImportModal?: () => void;
  onUpdateJob?: (job: ProductionJob) => void;
}

const LiveClock = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <span>ข้อมูล ณ วันที่ {formatDateOnly(now)} เวลา <span className="font-mono font-bold text-brand-600">{formatTimeOnly(now)}</span></span>
  );
};

export const ProductionPlan: React.FC<ProductionPlanProps> = ({ jobs, inventory, boms, onEditJob, onViewOrder, onPrintTag, onPrintHandover, onImportJobs, onPrintPlan, onOpenImportModal, onUpdateJob }) => {
  const [editingActualJobId, setEditingActualJobId] = useState<string | null>(null);
  const [tempActualQty, setTempActualQty] = useState<number>(0);
  const [movingJob, setMovingJob] = useState<ProductionJob | null>(null);

  const handleExportExcel = () => {
    const exportData = jobs.map(job => ({
      'เครื่องจักร': job.machineId,
      'เลขที่ใบสั่งผลิต': job.jobOrder,
      'สินค้า': job.productItem,
      'แม่พิมพ์': job.moldCode,
      'สถานะ': job.status,
      'วันที่เริ่ม': formatDateTime(job.startDate),
      'วันที่จบ': formatDateTime(job.endDate),
      'เป้าหมาย': job.totalProduction,
      'ผลิตได้': job.actualProduction || 0,
      'คงเหลือ': job.totalProduction - (job.actualProduction || 0),
      'หมายเหตุ': job.remarks || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Production Plan");
    XLSX.writeFile(wb, `Production_Plan_${new Date().getTime()}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('landscape');
    
    // Add title
    doc.setFontSize(16);
    doc.text('Production Plan Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Date: ${formatDateTime(new Date())}`, 14, 22);

    const tableColumn = ["Machine", "Job Order", "Product", "Mold", "Status", "Start", "End", "Target", "Actual"];
    const tableRows = [];

    // Sort jobs by machine for better readability in PDF
    const sortedJobs = [...jobs].sort((a, b) => a.machineId.localeCompare(b.machineId));

    sortedJobs.forEach(job => {
      const jobData = [
        job.machineId,
        job.jobOrder,
        job.productItem,
        job.moldCode,
        job.status,
        formatDateOnly(job.startDate),
        formatDateOnly(job.endDate),
        job.totalProduction.toString(),
        (job.actualProduction || 0).toString()
      ];
      tableRows.push(jobData);
    });

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [71, 85, 105] }
    });

    doc.save(`Production_Plan_${new Date().getTime()}.pdf`);
  };

  const groupedJobs: { [key: string]: ProductionJob[] } = jobs.reduce((acc, job) => {
    if (!acc[job.machineId]) acc[job.machineId] = [];
    acc[job.machineId].push(job);
    return acc;
  }, {} as { [key: string]: ProductionJob[] });

  // Ensure all known machines are in the list, even if they have no jobs
  const ALL_KNOWN_MACHINES = [
    'IP1', 'IP2', 'IP3', 'IP4', 'IP5', 'IP6', 'IP7', 'IP8', 'IP10', 
    'IO1', 'IO7', 'IO2', 'IO3', 'IO4', 'IO5', 'IO6', 
    'AB1', 'AB2', 'AB3', 'AB4', 'AB5', 
    'IB1', 
    'B1', 'B6', 'B2', 'B3', 'B4', 'B5', 'B10', 'B7', 'B8'
  ];

  const allMachineIds = Array.from(new Set([
    ...ALL_KNOWN_MACHINES,
    ...Object.keys(groupedJobs)
  ]));

  const sortedMachineIds = sortMachines(allMachineIds);

  // Sort jobs within each machine by date
  Object.keys(groupedJobs).forEach(machineId => {
    groupedJobs[machineId].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  });

  // --- Helpers ---
  const getStatusColor = (status: Status) => {
    switch (status) {
      case 'Running': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'Delayed': return 'text-red-600 bg-red-50 border-red-200';
      case 'Completed': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'Maintenance': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'Stopped': return 'text-slate-500 bg-slate-100 border-slate-200';
      case 'Paused': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'Rescheduled': return 'text-purple-600 bg-purple-50 border-purple-200';
      default: return 'text-slate-500 bg-white border-slate-200';
    }
  };

  const getStatusTextThai = (status: Status) => {
     switch (status) {
      case 'Running': return 'กำลังผลิต';
      case 'Delayed': return 'ตกแผน/ล่าช้า';
      case 'Completed': return 'เสร็จสิ้น';
      case 'Maintenance': return 'ซ่อมบำรุง';
      case 'Stopped': return 'หยุดเดิน';
      case 'Paused': return 'หยุดชั่วคราว';
      case 'Rescheduled': return 'เลื่อนแผน';
      case 'No Plan': return 'รอดำเนินการ';
      case 'Planned': return 'รอดำเนินการ';
      default: return status;
    }
  };

  const getColorBadgeStyle = (colorName: string) => {
    if (!colorName || colorName === '-' || colorName.trim() === '') return null;
    
    const name = (colorName || '').toLowerCase();
    let bg = 'bg-slate-100';
    let text = 'text-slate-700';
    let border = 'border-slate-200';

    if (name.includes('ใส')) { bg = 'bg-slate-50'; text = 'text-slate-600'; border = 'border-slate-300'; }
    else if (name.includes('ขาว')) { bg = 'bg-white'; text = 'text-slate-800'; border = 'border-slate-300'; }
    else if (name.includes('ดำ')) { bg = 'bg-slate-900'; text = 'text-white'; border = 'border-slate-800'; }
    else if (name.includes('แดง')) { bg = 'bg-red-500'; text = 'text-white'; border = 'border-red-600'; }
    else if (name.includes('เขียว')) { bg = 'bg-emerald-500'; text = 'text-white'; border = 'border-emerald-600'; }
    else if (name.includes('น้ำเงิน') || name.includes('ฟ้า')) { bg = 'bg-blue-500'; text = 'text-white'; border = 'border-blue-600'; }
    else if (name.includes('เหลือง')) { bg = 'bg-yellow-400'; text = 'text-yellow-900'; border = 'border-yellow-500'; }
    else if (name.includes('ชมพู')) { bg = 'bg-pink-400'; text = 'text-white'; border = 'border-pink-500'; }
    else if (name.includes('ม่วง')) { bg = 'bg-purple-500'; text = 'text-white'; border = 'border-purple-600'; }
    else if (name.includes('ส้ม')) { bg = 'bg-orange-500'; text = 'text-white'; border = 'border-orange-600'; }
    else if (name.includes('ทอง')) { bg = 'bg-yellow-600'; text = 'text-white'; border = 'border-yellow-700'; }
    else if (name.includes('เงิน') || name.includes('เทา')) { bg = 'bg-slate-400'; text = 'text-white'; border = 'border-slate-500'; }
    else if (name.includes('ชา') || name.includes('น้ำตาล')) { bg = 'bg-amber-700'; text = 'text-white'; border = 'border-amber-800'; }

    return `${bg} ${text} border ${border}`;
  };

  const formatDateShort = (dateString: string) => {
    return formatDateTime(dateString);
  };

  const calculateTimeProgress = (start: string, end: string) => {
    if (!start || !end) return 0;
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    // Use SIMULATED_NOW for time reference
    const now = SIMULATED_NOW.getTime(); 
    if (now < s) return 0;
    if (now > e) return 100;
    return Math.min(Math.round(((now - s) / (e - s)) * 100), 100);
  };

  const getDurationHours = (start: string, end: string) => {
    if (!start || !end) return 0;
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    return Math.round((e - s) / (1000 * 60 * 60));
  };

  const checkOverlap = (currentJob: ProductionJob, allMachineJobs: ProductionJob[]) => {
    const start = new Date(currentJob.startDate).getTime();
    const end = new Date(currentJob.endDate).getTime();

    return allMachineJobs.some(otherJob => {
        if (otherJob.id === currentJob.id) return false;
        const otherStart = new Date(otherJob.startDate).getTime();
        const otherEnd = new Date(otherJob.endDate).getTime();
        return (start < otherEnd && end > otherStart);
    });
  };

  // Pre-calculate maps for O(1) lookups
  const inventoryMap = React.useMemo(() => {
    const map = new Map<string, InventoryItem>();
    inventory.forEach(item => map.set(item.id, item));
    return map;
  }, [inventory]);

  const bomMap = React.useMemo(() => {
    const map = new Map<string, ProductBOM>();
    boms.forEach(bom => {
      map.set(String(bom.productItem || '').toLowerCase(), bom);
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
    const jobProductLower = String(job.productItem || '').toLowerCase();
    let bom = bomMap.get(jobProductLower);
    
    // Fallback to partial match if exact match not found
    if (!bom) {
      bom = boms.find(b => String(b.productItem || '').toLowerCase().includes(jobProductLower) || jobProductLower.includes(String(b.productItem || '').toLowerCase()));
    }
    
    if (bom) {
        for (const mat of bom.materials) {
            const item = inventoryMap.get(mat.inventoryItemId);
            if (item) {
                const wasteMultiplier = mat.wastePercentage ? (1 + (mat.wastePercentage / 100)) : 1;
                const totalQty = (mat.qtyPerUnit * (job.totalProduction || 0)) * wasteMultiplier;
                if (item.currentStock < totalQty) {
                    return { status: 'Shortage', item: item.name };
                }
            }
        }
        return { status: 'OK' };
    }

    return { status: 'Unknown' };
  };

  return (
    <div className="space-y-6 pb-24 font-kanit">
      
      {/* 1. Top Control Bar & Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
         <div className="flex gap-4 items-center">
             <div className="bg-slate-800 p-3 rounded-lg text-white shadow-sm">
                <Calendar size={20} />
             </div>
             <div>
                <h2 className="text-lg font-bold text-slate-800">ตารางการผลิต (Master Plan)</h2>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                   <Clock size={12} className="text-brand-500"/>
                   <LiveClock />
                </div>
             </div>
         </div>
         <div className="flex gap-2 w-full md:w-auto flex-wrap justify-end">
            <button onClick={() => onOpenImportModal?.()} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 border border-blue-700 rounded-lg text-white hover:bg-blue-700 text-sm font-medium shadow-sm transition-colors">
                <Upload size={16} /> นำเข้าข้อมูล (Import)
            </button>
            <button onClick={onPrintPlan} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 border border-indigo-700 rounded-lg text-white hover:bg-indigo-700 text-sm font-medium shadow-sm transition-colors">
                <Printer size={16} /> พิมพ์แผน (PL-FM-001)
            </button>
            <button onClick={handleExportPDF} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors">
                <FileDown size={16} /> Export PDF
            </button>
            <button onClick={handleExportExcel} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium shadow-sm transition-colors">
                <FileDown size={16} /> Export Excel
            </button>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         {/* Stats Cards ... (Keep existing) */}
         <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-center justify-between">
            <div>
               <p className="text-emerald-800 text-xs font-semibold uppercase">กำลังเดินเครื่อง</p>
               <h3 className="text-2xl font-bold text-emerald-700">{jobs.filter(j => j.status === 'Running').length} <span className="text-sm font-normal text-emerald-600">งาน</span></h3>
            </div>
            <Clock size={24} className="text-emerald-500" />
         </div>
         <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-center justify-between">
            <div>
               <p className="text-red-800 text-xs font-semibold uppercase">งานล่าช้า/ตกแผน</p>
               <h3 className="text-2xl font-bold text-red-700">{jobs.filter(j => j.status === 'Delayed').length} <span className="text-sm font-normal text-red-600">งาน</span></h3>
            </div>
            <AlertTriangle size={24} className="text-red-500" />
         </div>
         <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-center justify-between">
            <div>
               <p className="text-amber-800 text-xs font-semibold uppercase">หยุดชั่วคราว/แทรก</p>
               <h3 className="text-2xl font-bold text-amber-700">{jobs.filter(j => j.status === 'Paused' || j.jobType === 'Inserted').length} <span className="text-sm font-normal text-amber-600">งาน</span></h3>
            </div>
            <PauseCircle size={24} className="text-amber-500" />
         </div>
         <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
             <div>
               <p className="text-blue-800 text-xs font-semibold uppercase">แผนรวมทั้งหมด</p>
               <h3 className="text-2xl font-bold text-blue-700">{jobs.length} <span className="text-sm font-normal text-blue-600">งาน</span></h3>
            </div>
            <Layers size={24} className="text-blue-500" />
         </div>
      </div>

      {/* 2. Main Production Board */}
      <div className="space-y-4">
        {sortedMachineIds.map((machineId) => {
            const machineJobs = groupedJobs[machineId] || [];
            
            return (
                <div key={machineId} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {/* Machine Header */}
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className={`px-3 py-1 rounded-lg text-sm font-bold shadow-sm tracking-wide ${machineJobs.length > 0 ? 'bg-slate-800 text-white' : 'bg-slate-300 text-slate-600'}`}>
                                {machineId}
                            </div>
                            <span className="text-xs text-slate-500 font-medium">
                                {machineJobs.length > 0 ? `มี ${machineJobs.length} รายการ` : 'ไม่มีแผนการผลิต (Idle)'}
                            </span>
                        </div>
                        {machineJobs.length === 0 && (
                             <button 
                                onClick={() => onEditJob({ machineId } as any)}
                                className="text-[10px] bg-white border border-slate-300 hover:border-brand-500 hover:text-brand-600 px-2 py-1 rounded transition-colors"
                             >
                                + เพิ่มงาน
                             </button>
                        )}
                    </div>

                    {/* Job Rows */}
                    <div className="divide-y divide-slate-100">
                        {machineJobs.length > 0 ? (
                            machineJobs.map((job) => {
                                // --- Calculation Logic ---
                                const timePercent = calculateTimeProgress(job.startDate, job.endDate);
                                const actualQty = job.actualProduction || 0;
                                const totalQty = job.totalProduction || 1;
                                const actualPercent = Math.min(Math.round((actualQty / totalQty) * 100), 100);
                                const expectedQty = Math.round((timePercent / 100) * totalQty);
                                const remainingQty = totalQty - actualQty; // Calculate Remaining

                                const duration = getDurationHours(job.startDate, job.endDate);
                                const isDelayed = job.status === 'Delayed';
                                const isUrgent = job.priority === 'Urgent';
                                const isInserted = job.jobType === 'Inserted';
                                const isPaused = job.status === 'Paused';
                                const hasConflict = checkOverlap(job, machineJobs);
                                const stockStatus = getStockStatus(job);
                                const isShortage = stockStatus.status === 'Shortage';

                                // Determine Actual Bar Color based on performance
                                let actualBarColor = 'bg-emerald-500';
                                let actualTextColor = 'text-emerald-600';
                                
                                if (job.status === 'Delayed') {
                                    actualBarColor = 'bg-red-500';
                                    actualTextColor = 'text-red-600';
                                } else if (job.status === 'Completed') {
                                    actualBarColor = 'bg-blue-500';
                                    actualTextColor = 'text-blue-600';
                                } else if (job.status === 'Running') {
                                    if (actualPercent < timePercent - 10) { // Behind schedule > 10%
                                        actualBarColor = 'bg-red-500';
                                        actualTextColor = 'text-red-600';
                                    } else if (actualPercent < timePercent - 2) { // Slightly behind
                                        actualBarColor = 'bg-amber-500';
                                        actualTextColor = 'text-amber-600';
                                    }
                                } else if (job.status === 'Paused' || job.status === 'Stopped') {
                                    actualBarColor = 'bg-slate-400';
                                    actualTextColor = 'text-slate-600';
                                } else if (job.status === 'Maintenance') {
                                    actualBarColor = 'bg-orange-400';
                                    actualTextColor = 'text-orange-600';
                                }

                                let rowBg = 'hover:bg-slate-50';
                                if (hasConflict) rowBg = 'bg-orange-50/50 hover:bg-orange-100/50 border-l-4 border-orange-500';
                                else if (isDelayed) rowBg = 'bg-red-50/40 hover:bg-red-50';
                                else if (isUrgent) rowBg = 'bg-red-50/60 hover:bg-red-100/50';
                                else if (isInserted) rowBg = 'bg-blue-50/40 hover:bg-blue-50';

                                return (
                                    <div key={job.id} className={`p-4 transition-colors relative group ${rowBg}`}>
                                        {!hasConflict && <div className={`absolute left-0 top-0 bottom-0 w-1 ${isUrgent ? 'bg-red-600' : isInserted ? 'bg-blue-500' : isDelayed ? 'bg-red-400' : job.status === 'Running' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>}

                                        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                                            <div className="flex-1 min-w-[200px]">
                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                    <h4 className={`font-bold text-lg ${isDelayed || isUrgent ? 'text-red-700' : 'text-slate-800'}`}>
                                                        {job.productItem}
                                                    </h4>
                                                    {job.color && job.color !== '-' && (
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium shadow-sm ${getColorBadgeStyle(job.color)}`}>
                                                            {job.color}
                                                        </span>
                                                    )}
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${getStatusColor(job.status)}`}>{getStatusTextThai(job.status)}</span>
                                                    {isShortage && <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 font-bold animate-pulse" title={`ขาดวัตถุดิบ: ${stockStatus.item}`}><AlertOctagon size={10}/> ขาดวัตถุดิบ!</span>}
                                                    {isUrgent && <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-600 text-white font-bold animate-pulse"><Flame size={10}/> ด่วน!</span>}
                                                    {isInserted && <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 font-bold"><Zap size={10}/> ทดลอง</span>}
                                                </div>
                                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                                                    <div className="flex items-center gap-1 bg-white/50 px-1.5 py-0.5 rounded border border-transparent hover:border-slate-200"><Hash size={12}/> Order: {job.jobOrder}</div>
                                                    <div className="flex items-center gap-1 bg-white/50 px-1.5 py-0.5 rounded border border-transparent hover:border-slate-200"><Package size={12}/> Mold: {job.moldCode}</div>
                                                </div>
                                            </div>

                                            <div className="flex-[1.5] w-full md:w-auto min-w-[300px]">
                                                {/* Header Dates */}
                                                <div className="flex justify-between text-xs mb-2">
                                                    <span className={`font-mono ${hasConflict ? 'text-red-600 font-bold' : 'text-slate-500'}`}>เริ่ม: {formatDateShort(job.startDate)}</span>
                                                    <span className="text-slate-400 text-[10px]">{duration} ชม.</span>
                                                    <span className={`font-mono text-right ${hasConflict ? 'text-red-600 font-bold' : 'text-slate-500'}`}>จบ: {formatDateShort(job.endDate)}</span>
                                                </div>
                                                
                                                {/* DUAL PROGRESS BAR */}
                                                <div className="space-y-2">
                                                    {/* 1. Actual Progress */}
                                                    <div>
                                                        <div className="flex justify-between items-center text-[10px] mb-0.5">
                                                            <span className={`font-bold ${actualTextColor}`}>ผลิตจริง (Actual)</span>
                                                            
                                                            {editingActualJobId === job.id ? (
                                                              <div className="flex items-center gap-1">
                                                                <input 
                                                                  type="number" 
                                                                  value={tempActualQty}
                                                                  onChange={(e) => setTempActualQty(parseInt(e.target.value) || 0)}
                                                                  className="w-16 px-1 py-0.5 text-xs border border-emerald-300 rounded text-right focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                                                  autoFocus
                                                                  onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                      if (onUpdateJob) {
                                                                        onUpdateJob({ ...job, actualProduction: tempActualQty });
                                                                      }
                                                                      setEditingActualJobId(null);
                                                                    } else if (e.key === 'Escape') {
                                                                      setEditingActualJobId(null);
                                                                    }
                                                                  }}
                                                                />
                                                                <button 
                                                                  onClick={() => {
                                                                    if (onUpdateJob) {
                                                                      onUpdateJob({ ...job, actualProduction: tempActualQty });
                                                                    }
                                                                    setEditingActualJobId(null);
                                                                  }}
                                                                  className="text-emerald-600 hover:text-emerald-700 bg-emerald-50 rounded p-0.5"
                                                                >
                                                                  <CheckCircle2 size={12} />
                                                                </button>
                                                                <button 
                                                                  onClick={() => setEditingActualJobId(null)}
                                                                  className="text-slate-400 hover:text-slate-600 bg-slate-50 rounded p-0.5"
                                                                >
                                                                  <X size={12} />
                                                                </button>
                                                              </div>
                                                            ) : (
                                                              <span 
                                                                className={`font-bold font-mono ${actualTextColor} cursor-pointer hover:underline flex items-center gap-1`}
                                                                onClick={() => {
                                                                  setEditingActualJobId(job.id);
                                                                  setTempActualQty(actualQty);
                                                                }}
                                                                title="คลิกเพื่ออัปเดตยอดผลิต"
                                                              >
                                                                  {(actualQty || 0).toLocaleString()} <span className="text-slate-400 font-normal">/ {(totalQty || 0).toLocaleString()}</span>
                                                                  <Edit2 size={10} className="text-slate-300" />
                                                              </span>
                                                            )}
                                                        </div>
                                                        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden border border-slate-300 relative">
                                                            <div className={`h-full rounded-full transition-all duration-500 ${actualBarColor}`} style={{ width: `${actualPercent}%` }}></div>
                                                        </div>
                                                        {/* Remaining Label */}
                                                        <div className="flex justify-end text-[10px] mt-0.5 md:hidden">
                                                            <span className={`font-mono font-bold ${(remainingQty || 0) > 0 ? 'text-slate-500' : 'text-emerald-600'}`}>
                                                                {(remainingQty || 0) > 0 ? `เหลือ: ${(remainingQty || 0).toLocaleString()}` : `เกินเป้า: +${Math.abs(remainingQty || 0).toLocaleString()}`}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* 2. Expected Progress (Time) */}
                                                    <div className="hidden sm:block">
                                                        <div className="flex justify-between text-[10px] mb-0.5 text-slate-500">
                                                            <span className="flex items-center gap-1"><Clock size={10}/> เป้าหมาย (ตามเวลา)</span>
                                                            <span className="font-mono">{(expectedQty || 0).toLocaleString()} ({timePercent}%)</span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200 relative">
                                                            <div className="h-full bg-slate-400 opacity-60 rounded-full transition-all duration-500" style={{ width: `${timePercent}%` }}></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right Summary Box */}
                                            <div className="w-full md:w-32 text-right border-l border-slate-200 pl-4 border-dashed md:block hidden">
                                                <div className="mb-2">
                                                    <p className="text-[10px] text-slate-400 uppercase">เป้าหมาย (Target)</p>
                                                    <p className="text-lg font-mono font-bold text-slate-800">{(job.totalProduction || 0).toLocaleString()}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-slate-400 uppercase">คงเหลือ (Remaining)</p>
                                                    <p className={`text-md font-mono font-bold ${(remainingQty || 0) <= 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                                                        {(remainingQty || 0) <= 0 ? '+' : ''}{(remainingQty || 0) <= 0 ? Math.abs(remainingQty || 0).toLocaleString() : (remainingQty || 0).toLocaleString()}
                                                    </p>
                                                    {(remainingQty || 0) <= 0 && <p className="text-[9px] text-emerald-600 font-bold">Over Target</p>}
                                                </div>
                                            </div>

                                            <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-2">
                                                <button 
                                                    onClick={() => onViewOrder(job)}
                                                    className="px-3 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium transition-all hover:bg-slate-700 flex items-center gap-2 shadow-sm"
                                                    title="ดูใบสั่งผลิต"
                                                >
                                                    <FileText size={16} /> <span className="md:hidden lg:inline">ใบสั่งผลิต</span>
                                                </button>
                                                {onPrintTag && (
                                                    <button 
                                                        onClick={() => onPrintTag(job)}
                                                        className="p-2 bg-white border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-lg transition-colors shadow-sm"
                                                        title="พิมพ์ป้ายบ่งชี้ (Product Tag)"
                                                    >
                                                        <Tag size={16} />
                                                    </button>
                                                )}
                                                {onPrintHandover && (
                                                    <button 
                                                        onClick={() => onPrintHandover([job])}
                                                        className="p-2 bg-white border border-slate-200 hover:bg-emerald-50 hover:text-emerald-600 text-slate-600 rounded-lg transition-colors shadow-sm"
                                                        title="พิมพ์ใบส่งมอบงาน"
                                                    >
                                                        <Share size={16} />
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => setMovingJob(job)}
                                                    className="p-2 bg-white border border-slate-200 hover:bg-blue-50 hover:text-blue-600 text-slate-600 rounded-lg transition-colors shadow-sm"
                                                    title="ย้ายเครื่อง/แบ่งงาน"
                                                >
                                                    <ArrowRightLeft size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => onEditJob(job)}
                                                    className="p-2 bg-white border border-slate-200 hover:bg-brand-50 hover:text-brand-600 text-slate-600 rounded-lg transition-colors shadow-sm"
                                                    title="แก้ไขรายการ"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {job.remarks && (
                                            <div className={`mt-2 text-xs italic ${isPaused ? 'text-amber-700' : 'text-slate-500'} flex items-center gap-1`}>
                                                <AlertCircle size={12} className={isPaused ? 'text-amber-600' : 'text-slate-400'} /> 
                                                {job.remarks}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="p-4 text-center text-slate-400 text-sm italic bg-slate-50/50">
                                เครื่องว่าง (Idle) - พร้อมรับงานใหม่
                            </div>
                        )}
                    </div>
                </div>
            );
        })}
      </div>

      {movingJob && onUpdateJob && (
        <MoveJobModal
          job={movingJob}
          jobs={jobs}
          machines={allMachineIds}
          onClose={() => setMovingJob(null)}
          onUpdateJob={onUpdateJob}
        />
      )}
    </div>
  );
};
