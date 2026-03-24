
import React, { useRef } from 'react';
import { ProductionJob } from '../types';
import { ChevronLeft, Printer, FileText, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { formatDateOnly, formatTimeOnly } from '../utils/dateUtils';

interface DocumentHandoverViewProps {
  jobs: ProductionJob[];
  onBack: () => void;
}

export const DocumentHandoverView: React.FC<DocumentHandoverViewProps> = ({ jobs, onBack }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    if (!printRef.current) return;
    
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2, // Higher resolution
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Document_Handover_${new Date().getTime()}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("เกิดข้อผิดพลาดในการสร้างไฟล์ PDF");
    }
  };

  const currentDate = new Date();
  const dateStr = formatDateOnly(currentDate);
  const timeStr = formatTimeOnly(currentDate);

  return (
    <div className="bg-slate-100 min-h-screen p-4 md:p-8 font-sans">
      {/* Control Header */}
      <div className="max-w-[210mm] mx-auto mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors bg-white px-4 py-2 rounded-lg shadow-sm"
        >
          <ChevronLeft size={20} /> ย้อนกลับ
        </button>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={handleExportPDF}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-md transition-colors"
          >
            <Download size={18} /> Export PDF
          </button>
          <button 
            onClick={handlePrint}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 shadow-md transition-colors"
          >
            <Printer size={18} /> พิมพ์ใบนำส่ง
          </button>
        </div>
      </div>

      {/* A4 Paper */}
      <div ref={printRef} className="max-w-[210mm] mx-auto bg-white shadow-xl print:shadow-none print:border-none min-h-[297mm] p-[15mm] relative text-black">
        
        {/* Header */}
        <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-start">
            <div>
                <h1 className="text-2xl font-bold uppercase tracking-wide">ใบนำส่งเอกสาร</h1>
                <h2 className="text-lg font-semibold text-gray-600">Document Transmittal Form</h2>
            </div>
            <div className="text-right">
                <div className="text-3xl font-bold text-red-600 tracking-tighter">KPAC</div>
                <p className="text-sm text-gray-500">FM-PL-009 (Rev.02)</p>
            </div>
        </div>

        {/* Info Section */}
        <div className="flex justify-between mb-6 text-sm border border-gray-300 p-4 rounded-lg bg-gray-50 print:bg-white print:border-black">
            <div className="space-y-2">
                <p><span className="font-bold w-24 inline-block">จาก (From):</span> แผนกวางแผนการผลิต (Planning Dept.)</p>
                <p><span className="font-bold w-24 inline-block">ถึง (To):</span> แผนกฝ่ายผลิต (Production Dept.)</p>
            </div>
            <div className="space-y-2 text-right">
                <p><span className="font-bold">วันที่ (Date):</span> {dateStr}</p>
                <p><span className="font-bold">เวลา (Time):</span> {timeStr}</p>
            </div>
        </div>

        <div className="mb-4">
            <p className="font-bold mb-2">เรื่อง: ขอส่งมอบเอกสารใบสั่งผลิตและเอกสารประกอบ ดังรายการต่อไปนี้</p>
        </div>

        {/* Table */}
        <table className="w-full border-collapse border border-black text-sm mb-8">
            <thead className="bg-gray-200 print:bg-gray-100">
                <tr>
                    <th className="border border-black px-2 py-2 w-[8%] text-center">ลำดับ</th>
                    <th className="border border-black px-2 py-2 w-[15%]">เลขที่ใบสั่งผลิต<br/>(Job Order)</th>
                    <th className="border border-black px-2 py-2 w-[10%]">เครื่องจักร</th>
                    <th className="border border-black px-2 py-2 w-[22%]">สินค้า (Product)</th>
                    <th className="border border-black px-2 py-2 w-[23%]">รายการเอกสารแนบ</th>
                    <th className="border border-black px-2 py-2 w-[10%] text-center">จำนวน<br/>(ชุด)</th>
                    <th className="border border-black px-2 py-2 w-[12%]">หมายเหตุ</th>
                </tr>
            </thead>
            <tbody>
                {jobs.map((job, index) => {
                    const isTestRun = job.jobType === 'Inserted' || job.remarks?.includes('เทส') || job.remarks?.includes('Test');
                    return (
                        <tr key={job.id}>
                            <td className="border border-black px-2 py-3 text-center">{index + 1}</td>
                            <td className="border border-black px-2 py-3 font-semibold">{job.jobOrder}</td>
                            <td className="border border-black px-2 py-3 text-center">{job.machineId}</td>
                            <td className="border border-black px-2 py-3">{job.productItem}</td>
                            <td className="border border-black px-2 py-3">
                                <div className="flex flex-col gap-1 text-[11px] leading-tight">
                                    <span className="flex items-center gap-1">
                                        <span className="font-bold">◻</span> ใบสั่งผลิต (Job Order)
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <span className="font-bold">◻</span> สติกเกอร์/Tag
                                    </span>
                                    <span className={`flex items-center gap-1 ${isTestRun ? 'font-semibold text-black' : 'text-gray-500'}`}>
                                        <span className={isTestRun ? 'font-bold' : ''}>◻</span> ใบขอทดสอบ (สี/งานใหม่)
                                    </span>
                                </div>
                            </td>
                            <td className="border border-black px-2 py-3 text-center">1</td>
                            <td className="border border-black px-2 py-3 text-xs">{job.priority === 'Urgent' ? 'งานด่วน' : ''}</td>
                        </tr>
                    );
                })}
                {/* Empty rows filler */}
                {Array.from({ length: Math.max(0, 15 - jobs.length) }).map((_, i) => (
                     <tr key={`empty-${i}`} className="h-[45px]">
                        <td className="border border-black px-2 py-2"></td>
                        <td className="border border-black px-2 py-2"></td>
                        <td className="border border-black px-2 py-2"></td>
                        <td className="border border-black px-2 py-2"></td>
                        <td className="border border-black px-2 py-2"></td>
                        <td className="border border-black px-2 py-2"></td>
                        <td className="border border-black px-2 py-2"></td>
                     </tr>
                ))}
            </tbody>
        </table>

        {/* Footer Signatures */}
        <div className="grid grid-cols-2 gap-8 mt-auto absolute bottom-[15mm] left-[15mm] right-[15mm]">
            <div className="border border-black p-4 text-center">
                <p className="font-bold mb-8">ผู้ส่งเอกสาร (Sender)</p>
                <div className="border-b border-dotted border-black w-3/4 mx-auto mb-2"></div>
                <p className="text-sm mb-2">(......................................................)</p>
                <p className="text-sm font-bold">แผนกวางแผนการผลิต</p>
                <p className="text-xs mt-2">วันที่ ......./......./.......</p>
            </div>
            <div className="border border-black p-4 text-center bg-gray-50 print:bg-white">
                <p className="font-bold mb-8">ผู้รับเอกสาร (Receiver)</p>
                <div className="border-b border-dotted border-black w-3/4 mx-auto mb-2"></div>
                <p className="text-sm mb-2">(......................................................)</p>
                <p className="text-sm font-bold">แผนกผลิต / หัวหน้างาน</p>
                <p className="text-xs mt-2 text-red-600 font-bold">** กรุณาตรวจสอบเอกสารให้ครบถ้วนก่อนเซ็นรับ **</p>
                <p className="text-xs mt-1">วันที่ ......./......./.......</p>
            </div>
        </div>

      </div>
    </div>
  );
};
