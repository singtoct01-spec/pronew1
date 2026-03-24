import React from 'react';
import { ProductionJob } from '../types';
import { Printer, ArrowLeft } from 'lucide-react';

import { formatDateOnly, formatTimeOnly } from '../utils/dateUtils';

interface ProductionPlanPrintProps {
  jobs: ProductionJob[];
  onBack: () => void;
}

export const ProductionPlanPrint: React.FC<ProductionPlanPrintProps> = ({ jobs, onBack }) => {
  // Sort jobs by machine
  const sortedJobs = [...jobs].sort((a, b) => {
    const getMachineSortKey = (machineId: string) => {
      const match = machineId.match(/^([A-Z]+)(\d+)?(.*)$/i);
      if (!match) return { prefix: machineId, num: 0, suffix: '' };
      return {
        prefix: match[1].toUpperCase(),
        num: match[2] ? parseInt(match[2], 10) : 0,
        suffix: match[3] || ''
      };
    };

    const PREFIX_ORDER = ['IP', 'IO', 'AB', 'IB', 'B'];
    const keyA = getMachineSortKey(a.machineId);
    const keyB = getMachineSortKey(b.machineId);

    const indexA = PREFIX_ORDER.indexOf(keyA.prefix);
    const indexB = PREFIX_ORDER.indexOf(keyB.prefix);

    if (indexA !== -1 && indexB !== -1) {
      if (indexA !== indexB) return indexA - indexB;
      if (keyA.num !== keyB.num) return keyA.num - keyB.num;
      return keyA.suffix.localeCompare(keyB.suffix);
    }
    
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;

    return a.machineId.localeCompare(b.machineId, undefined, { numeric: true, sensitivity: 'base' });
  });

  const formatDate = (isoStr: string) => {
    return formatDateOnly(isoStr);
  };

  const formatTime = (isoStr: string) => {
    return formatTimeOnly(isoStr);
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sarabun">
      {/* Header - Hidden when printing */}
      <div className="bg-white border-b border-slate-200 p-4 flex justify-between items-center print:hidden sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-slate-800">พิมพ์แผนการผลิต (PL-FM-001)</h1>
        </div>
        <button 
          onClick={() => window.print()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <Printer size={20} />
          พิมพ์เอกสาร
        </button>
      </div>

      {/* Document Container */}
      <div className="p-8 print:p-0 flex justify-center">
        <div className="bg-white shadow-xl print:shadow-none w-full max-w-[297mm] min-h-[210mm] p-8 print:p-0">
          
          {/* Document Header */}
          <div className="flex justify-between items-start mb-4">
            <div className="font-bold text-lg">PL-FM-001 R02 020326</div>
          </div>

          {/* Main Table */}
          <table className="w-full border-collapse border border-black text-sm text-center">
            <thead>
              <tr>
                <th colSpan={12} className="border border-black p-2 bg-gray-50 text-left font-bold text-lg">
                  แผนการผลิต
                </th>
              </tr>
              <tr>
                <th colSpan={12} className="border border-black p-2 bg-gray-50 text-left">
                  ประจำวันที่ ........................................................................................
                </th>
              </tr>
              <tr className="bg-gray-100">
                <th rowSpan={2} className="border border-black p-2 w-16">เครื่อง</th>
                <th rowSpan={2} className="border border-black p-2 w-48">รายการสินค้า</th>
                <th rowSpan={2} className="border border-black p-2 w-24">รหัสแม่พิมพ์</th>
                <th rowSpan={2} className="border border-black p-2 w-20">Cap ต่อ กะ</th>
                <th rowSpan={2} className="border border-black p-2 w-24">ยอดผลิต</th>
                <th rowSpan={2} className="border border-black p-2 w-20">สี</th>
                <th colSpan={2} className="border border-black p-2">เริ่มผลิต</th>
                <th colSpan={2} className="border border-black p-2">กำหนดแล้วเสร็จ</th>
                <th rowSpan={2} className="border border-black p-2 w-32">เลขที่ใบสั่งผลิต</th>
                <th rowSpan={2} className="border border-black p-2 w-48">หมายเหตุ</th>
              </tr>
              <tr className="bg-gray-100">
                <th className="border border-black p-1 w-20">วันที่</th>
                <th className="border border-black p-1 w-16">เวลา</th>
                <th className="border border-black p-1 w-20">วันที่</th>
                <th className="border border-black p-1 w-16">เวลา</th>
              </tr>
            </thead>
            <tbody>
              {sortedJobs.map((job, index) => (
                <tr key={job.id || index} className="h-8">
                  <td className="border border-black p-1">{job.machineId}</td>
                  <td className="border border-black p-1 text-left px-2">{job.productItem}</td>
                  <td className="border border-black p-1">{job.moldCode}</td>
                  <td className="border border-black p-1">{job.capacityPerShift?.toLocaleString() || '-'}</td>
                  <td className="border border-black p-1">{job.totalProduction?.toLocaleString() || '-'}</td>
                  <td className="border border-black p-1">{job.color || '-'}</td>
                  <td className="border border-black p-1">{formatDate(job.startDate)}</td>
                  <td className="border border-black p-1">{formatTime(job.startDate)}</td>
                  <td className="border border-black p-1">{formatDate(job.endDate)}</td>
                  <td className="border border-black p-1">{formatTime(job.endDate)}</td>
                  <td className="border border-black p-1">{job.jobOrder}</td>
                  <td className="border border-black p-1 text-left px-2 text-xs">{job.remarks || ''}</td>
                </tr>
              ))}
              {/* Fill empty rows to make it look like a full page if there are few jobs */}
              {Array.from({ length: Math.max(0, 20 - sortedJobs.length) }).map((_, i) => (
                <tr key={`empty-${i}`} className="h-8">
                  <td className="border border-black p-1"></td>
                  <td className="border border-black p-1"></td>
                  <td className="border border-black p-1"></td>
                  <td className="border border-black p-1"></td>
                  <td className="border border-black p-1"></td>
                  <td className="border border-black p-1"></td>
                  <td className="border border-black p-1"></td>
                  <td className="border border-black p-1"></td>
                  <td className="border border-black p-1"></td>
                  <td className="border border-black p-1"></td>
                  <td className="border border-black p-1"></td>
                  <td className="border border-black p-1"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
