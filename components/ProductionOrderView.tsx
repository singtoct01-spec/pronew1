import React from 'react';
import { ProductionJob, ProductBOM, InventoryItem } from '../types';
import { Printer, ChevronLeft, Download } from 'lucide-react';

import { formatDateOnly } from '../utils/dateUtils';

interface ProductionOrderViewProps {
  job: ProductionJob;
  boms: ProductBOM[];
  inventory: InventoryItem[];
  onBack: () => void;
}

export const ProductionOrderView: React.FC<ProductionOrderViewProps> = ({ job, boms, inventory, onBack }) => {
  const handlePrint = () => {
    window.print();
  };

  // Helper to determine form type
  const isJar = job.productType?.toLowerCase().includes('jar') || job.productItem.includes('โหล') || job.productType?.includes('โหล');
  const isCap = job.productType?.toLowerCase().includes('cap') || job.productItem.includes('ฝา') || job.productType?.includes('ฝา');
  const isPreform = job.productType?.toLowerCase().includes('preform') || job.productItem.toLowerCase().includes('preform');

  // Helper to find BOM for raw material calculation (Mock logic for display)
  const bom = boms.find(b => job.productItem.includes(b.productItem));
  
  // Format Date Helper
  const fmtDate = (d: string) => {
    if(!d) return '';
    const date = new Date(d);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth()+1).toString().padStart(2, '0')}/${(date.getFullYear()+543)}`;
  };
  const fmtTime = (d: string) => {
    if(!d) return '';
    const date = new Date(d);
    return `${date.getHours().toString().padStart(2, '0')}.${date.getMinutes().toString().padStart(2, '0')} น.`;
  };

  return (
    <div className="bg-slate-100 min-h-screen p-4 md:p-8 pb-20 font-sans">
      {/* Control Header (Hide during print) */}
      <div className="max-w-[210mm] mx-auto mb-6 flex justify-between items-center print:hidden">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors bg-white px-4 py-2 rounded-lg shadow-sm"
        >
          <ChevronLeft size={20} /> ย้อนกลับ
        </button>
        <div className="flex gap-3">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 shadow-md transition-colors"
          >
            <Printer size={18} /> พิมพ์ใบสั่งผลิต
          </button>
        </div>
      </div>

      {/* The Printable Form - A4 Width approx 210mm */}
      <div className="max-w-[210mm] mx-auto bg-white shadow-xl print:shadow-none print:border-none text-black overflow-hidden relative">
        
        {/* Paper Container */}
        <div className="p-[10mm] min-h-[297mm] relative" style={{ fontFamily: '"Angsana New", "Sarabun", serif' }}>
            
            {/* 1. Header Section */}
            <table className="w-full border-collapse border border-black mb-0">
                <tbody>
                    <tr>
                        <td className="border border-black p-2 w-[20%] align-middle text-center">
                            <div className="text-3xl font-bold tracking-tighter text-red-600">KPAC</div>
                        </td>
                        <td className="border border-black p-2 w-[45%] align-middle text-center">
                            <h1 className="text-[26px] font-bold">
                                ใบสั่งผลิต{isJar ? 'ขวดโหล' : isCap ? 'ฝา' : isPreform ? 'พรีฟอร์ม' : 'สินค้า'}
                            </h1>
                        </td>
                        <td className="border border-black p-0 w-[35%] align-top">
                            <div className="bg-gray-200 text-center border-b border-black text-[18px] font-bold">บันทึกส่วนของผลิต</div>
                            <div className="text-center border-b border-black text-[16px]">รายงานยอดผลิต</div>
                            <table className="w-full text-[14px]">
                                <thead>
                                    <tr>
                                        <th className="border-r border-black w-[25%] font-normal">แพ็ค/กล่อง</th>
                                        <th className="border-r border-black w-[25%] font-normal">กะ</th>
                                        <th className="border-r border-black w-[25%] font-normal">ยอดผลิต(ชิ้น)</th>
                                        <th className="font-normal">วันที่</th>
                                    </tr>
                                </thead>
                                {/* Empty rows for writing */}
                                <tbody>
                                    <tr className="h-6"><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td></td></tr>
                                    <tr className="h-6"><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td></td></tr>
                                </tbody>
                            </table>
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* 2. Job Info */}
            <table className="w-full border-collapse border-x border-b border-black text-[18px]">
                <tbody>
                    <tr className="h-[28px]">
                        <td className="border-r border-black pl-2 w-[15%] font-bold">เลขที่ใบสั่งผลิต</td>
                        <td className="border-r border-black pl-2 w-[25%] text-blue-700">{job.jobOrder}</td>
                        <td className="border-r border-black pl-2 w-[15%]"></td>
                        <td className="border-r border-black pl-2 w-[15%]"></td>
                        <td className="border-r border-black w-[10%]"></td>
                        <td className="border-r border-black w-[10%]"></td>
                        <td className="w-[10%]"></td>
                    </tr>
                    <tr className="h-[28px]">
                        <td className="border-r border-black pl-2 font-bold">รหัสสินค้า</td>
                        <td className="border-r border-black pl-2 text-blue-700">{job.productItem.split(' ')[0]}</td>
                        <td className="border-r border-black pl-2 font-bold">เวลาเริ่มผลิต</td>
                        <td className="border-r border-black pl-2 text-blue-700 text-center">{fmtDate(job.startDate)}</td>
                        <td className="border-r border-black pl-2 text-blue-700 text-center" colSpan={3}>{fmtTime(job.startDate)}</td>
                    </tr>
                    <tr className="h-[28px]">
                        <td className="border-r border-black pl-2 font-bold">จำนวนสั่งผลิต</td>
                        <td className="border-r border-black pl-2 text-blue-700 font-bold">{(job.totalProduction || 0).toLocaleString()} <span className="text-black font-normal">ชิ้น</span></td>
                        <td className="border-r border-black pl-2 font-bold">เวลาจบผลิต</td>
                        <td className="border-r border-black pl-2 text-blue-700 text-center">{fmtDate(job.endDate)}</td>
                        <td className="border-r border-black pl-2 text-blue-700 text-center" colSpan={3}>{fmtTime(job.endDate)}</td>
                    </tr>
                </tbody>
            </table>

            {/* 3. Product Specs */}
            <div className="bg-gray-300 border-x border-b border-black text-center font-bold text-[18px]">ข้อมูลผลิตภัณฑ์</div>
            <table className="w-full border-collapse border-x border-b border-black text-[18px]">
                <tbody>
                    <tr>
                        {/* Specs Column */}
                        <td className="w-[40%] align-top p-0 border-r border-black">
                             <table className="w-full">
                                <tbody>
                                    <tr className="h-[28px] border-b border-gray-300">
                                        <td className="pl-2 w-[40%]">ประเภท</td>
                                        <td className="pl-2 text-blue-700">{job.productType || '-'}</td>
                                    </tr>
                                    <tr className="h-[28px] border-b border-gray-300">
                                        <td className="pl-2">โครงสร้าง</td>
                                        <td className="pl-2 text-blue-700">{job.structure || 'PET 100%'}</td>
                                    </tr>
                                    <tr className="h-[28px] border-b border-gray-300">
                                        <td className="pl-2">สี</td>
                                        <td className="pl-2 text-blue-700">{job.color}</td>
                                    </tr>
                                    <tr className="h-[28px] border-b border-gray-300">
                                        <td className="pl-2">น้ำหนัก</td>
                                        <td className="pl-2 text-blue-700 text-right pr-4">{job.weightG || '-'}</td>
                                        <td className="w-[30px]">กรัม</td>
                                    </tr>
                                    <tr className="h-[28px] border-b border-gray-300">
                                        <td className="pl-2">กว้างปาก</td>
                                        <td className="pl-2 text-blue-700 text-right pr-4">{job.mouthWidthMm || '-'}</td>
                                        <td className="w-[30px]">มม.</td>
                                    </tr>
                                    <tr className="h-[28px] border-b border-gray-300">
                                        <td className="pl-2">กว้างโหล</td>
                                        <td className="pl-2 text-blue-700 text-right pr-4">{job.widthMm || '-'}</td>
                                        <td className="w-[30px]">มม.</td>
                                    </tr>
                                    <tr className="h-[28px] border-b border-gray-300">
                                        <td className="pl-2">สูง</td>
                                        <td className="pl-2 text-blue-700 text-right pr-4">{job.heightMm || '-'}</td>
                                        <td className="w-[30px]">มม.</td>
                                    </tr>
                                    <tr className="h-[28px]">
                                        <td className="pl-2">ความจุ</td>
                                        <td className="pl-2 text-blue-700 text-right pr-4">{job.capacityMl || '-'}</td>
                                        <td className="w-[30px]">มล.</td>
                                    </tr>
                                </tbody>
                             </table>
                        </td>
                        {/* Image Column */}
                        <td className="w-[60%] align-middle text-center bg-white relative">
                             <div className="absolute top-1 left-0 w-full text-center text-[16px]">รูปสินค้า</div>
                             {/* Placeholder for Image */}
                             <div className="h-[200px] flex items-center justify-center">
                                {/* If you had real images, they would go here. */}
                                <div className="text-gray-300 text-[100px] font-thin select-none">
                                    {isJar ? 'JAR' : isCap ? 'CAP' : 'IMG'}
                                </div>
                             </div>
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* 4. Injection Plan (แผนก ฉีดพลาสติก) */}
            <div className="bg-gray-300 border-x border-b border-black text-center font-bold text-[18px]">แผนก ฉีดพลาสติก</div>
            <table className="w-full border-collapse border-x border-b border-black text-[18px]">
                <tbody>
                    <tr>
                        <td className="border-r border-black w-[15%] pl-2 h-[28px]">เครื่องจักรที่ผลิต</td>
                        <td className="border-r border-black w-[15%] pl-2 text-blue-700 font-bold">{(!isJar) ? job.machineId : ''}</td>
                        <td className="border-r border-black w-[20%] pl-2">ข้อกำหนดเพิ่มเติม</td>
                        <td className="w-[50%] p-1 align-top text-blue-700" rowSpan={isJar ? 4 : 5}>
                             {job.additionalRequirements || job.remarks || '-'}
                        </td>
                    </tr>
                    <tr>
                        <td className="border-r border-black pl-2 h-[28px]">รหัสแม่พิมพ์</td>
                        <td className="border-r border-black pl-2 text-blue-700">{(!isJar) ? job.moldCode : ''}</td>
                        <td className="border-r border-black"></td>
                    </tr>

                    {/* Logic Separation: Jar vs Cap/Preform */}
                    {!isJar ? (
                        /* Cap/Preform Detail Layout */
                        <>
                            <tr>
                                <td className="border-r border-black pl-2 text-[16px]">ผสมวัตถุดิบ</td>
                                <td className="border-r border-black text-right pr-2 text-blue-700">5.00 <span className="text-black">รอบ</span></td>
                                <td className="border-r border-black pl-2 text-[16px]">วัตถุดิบทั้งหมด</td>
                            </tr>
                            <tr>
                                <td colSpan={3} className="border-r border-black p-0">
                                     <table className="w-full text-[16px]">
                                        <tbody>
                                            <tr className="border-y border-dashed border-gray-400">
                                                <td className="pl-2 w-[30%]">PP เม็ดใหม่ใส</td>
                                                <td className="text-center w-[15%]">-</td>
                                                <td className="w-[15%]">กก./รอบ</td>
                                                <td className="pl-2 w-[25%]">PP เม็ดใหม่ใส</td>
                                                <td className="text-right pr-1 w-[10%] text-blue-700">100%</td>
                                                <td className="text-right pr-2 w-[15%] text-blue-700">266.11 กก.</td>
                                            </tr>
                                            <tr className="border-b border-dashed border-gray-400">
                                                <td className="pl-2">ScrapPP ใส</td>
                                                <td className="text-center">-</td>
                                                <td className="">กก./รอบ</td>
                                                <td className="pl-2">ScrapPP ใส</td>
                                                <td className="text-right pr-1 text-blue-700">0%</td>
                                                <td className="text-right pr-2 text-blue-700">- กก.</td>
                                            </tr>
                                            <tr>
                                                <td className="pl-2">Master batch</td>
                                                <td className="text-center text-blue-700">1.06</td>
                                                <td className="">กก./รอบ</td>
                                                <td className="pl-2">Master batch</td>
                                                <td className="text-right pr-1 text-blue-700">2%</td>
                                                <td className="text-right pr-2 text-blue-700">5.32 กก.</td>
                                            </tr>
                                        </tbody>
                                     </table>
                                </td>
                            </tr>
                        </>
                    ) : (
                        /* Jar Layout (Empty Injection mostly) */
                        <>
                            <tr className="h-[28px]"><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td></tr>
                            <tr className="h-[28px]"><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td></tr>
                        </>
                    )}
                    
                    {/* Packing Section */}
                    <tr className="border-t border-black">
                        <td className="border-r border-black pl-2 h-[28px]">วิธีการบรรจุ</td>
                        <td className="border-r border-black pl-2 text-blue-700" colSpan={3}>
                           {!isJar ? (job.packagingMethod || 'แพ็คถุง') : ''}
                        </td>
                    </tr>
                    <tr className="border-b border-black">
                         <td className="border-r border-black pl-2 h-[28px]">จำนวนบรรจุ</td>
                         <td className="border-r border-black pl-2 text-blue-700 text-right pr-4 font-bold">
                            {!isJar ? '135' : ''}
                         </td>
                         <td className="pl-2">ชิ้น/ลัง</td>
                         <td></td>
                    </tr>
                    
                    {/* Warning Footer */}
                    <tr>
                        <td colSpan={4} className="pl-2 text-red-600 text-[16px]">
                            หมายเหตุ : เผื่อสูญเสียจากการผลิต {isCap ? '5' : '2'} %
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* 5. Blow Plan (แผนก เป้าพลาสติก) - Only for Jar */}
            <div className="bg-gray-300 border-x border-b border-black text-center font-bold text-[18px]">แผนก เป่าพลาสติก</div>
            <table className="w-full border-collapse border-x border-b border-black text-[18px]">
                <tbody>
                     {isJar ? (
                         // Active Blow Plan
                         <>
                            <tr>
                                <td className="border-r border-black w-[15%] pl-2 h-[28px]">เครื่องจักรที่ผลิต</td>
                                <td className="border-r border-black w-[15%] pl-2 text-blue-700 font-bold">{job.machineId}</td>
                                <td className="border-r border-black w-[20%] pl-2">ข้อกำหนดเพิ่มเติม</td>
                                <td className="w-[50%] p-1 align-top text-blue-700" rowSpan={5}>
                                    {job.additionalRequirements}
                                </td>
                            </tr>
                            <tr>
                                <td className="border-r border-black pl-2 h-[28px]">รหัสแม่พิมพ์</td>
                                <td className="border-r border-black pl-2 text-blue-700">{job.moldCode}</td>
                                <td className="border-r border-black"></td>
                            </tr>
                            <tr>
                                <td className="border-r border-black pl-2 h-[28px]">Preform</td>
                                <td className="border-r border-black pl-2 text-blue-700">P44-4</td>
                                <td className="border-r border-black"></td>
                            </tr>
                            <tr>
                                <td className="border-r border-black pl-2 h-[28px]">จำนวนPreform</td>
                                <td className="border-r border-black pl-2 text-blue-700 text-right pr-2 font-bold">{((job.totalProduction || 0) * 1.02).toLocaleString()}</td>
                                <td className="border-r border-black pl-2">ชิ้น</td>
                            </tr>
                            <tr>
                                <td className="border-r border-black pl-2 h-[28px]">วิธีการบรรจุ</td>
                                <td className="border-r border-black pl-2 text-blue-700 font-bold">{job.packagingMethod || 'ถุง HD ฟ้า'}</td>
                                <td className="border-r border-black"></td>
                            </tr>
                            <tr className="border-b border-black">
                                <td className="border-r border-black pl-2 h-[28px]">จำนวนบรรจุ</td>
                                <td className="border-r border-black pl-2 text-blue-700 text-right pr-2 font-bold">72</td>
                                <td className="border-r border-black pl-2">ชิ้น/แพ็ค</td>
                                <td></td>
                            </tr>
                         </>
                     ) : (
                         // Empty Blow Plan
                         <>
                            {[...Array(6)].map((_, i) => (
                                <tr key={i} className={`h-[28px] ${i===5?'border-b border-black':''}`}>
                                    <td className="border-r border-black w-[15%]"></td>
                                    <td className="border-r border-black w-[15%]"></td>
                                    <td className="border-r border-black w-[20%]"></td>
                                    <td className="w-[50%]"></td>
                                </tr>
                            ))}
                         </>
                     )}
                     <tr>
                        <td colSpan={4} className="pl-2 text-red-600 text-[16px]">
                            หมายเหตุ : เผื่อสูญเสียจากการผลิต 2 %
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* 6. Signatures Middle */}
            <table className="w-full border-collapse border border-black mt-2 text-[18px]">
                <thead>
                    <tr>
                        <th className="border-r border-black w-1/3 h-[40px] align-bottom pb-1">ฝ่ายวางแผน</th>
                        <th className="border-r border-black w-1/3 align-bottom pb-1">ผู้อนุมัติ</th>
                        <th className="w-1/3 align-bottom pb-1">ฝ่ายผลิต</th>
                    </tr>
                </thead>
            </table>

            {/* 7. Material Withdrawal (เบิกวัตถุดิบ) */}
            <div className="bg-gray-300 border-x border-b border-black text-center font-bold text-[18px] mt-2">เบิกวัตถุดิบ</div>
            <table className="w-full border-collapse border border-black text-[16px]">
                <thead>
                    <tr>
                        <th className="border-r border-black w-[5%] font-normal">ลำดับ</th>
                        <th className="border-r border-black w-[35%] font-normal">รายการเบิก</th>
                        <th className="border-r border-black w-[10%] font-normal">จำนวน(ชิ้น)</th>
                        <th className="border-r border-black w-[8%] font-normal">หน่วย</th>
                        <th className="border-r border-black w-[10%] font-normal">จำนวน(กก.)</th>
                        <th className="border-r border-black w-[8%] font-normal">หน่วย</th>
                        <th className="border-r border-black w-[10%] font-normal">LOT NO.</th>
                        <th className="font-normal w-[14%]">หมายเหตุ</th>
                    </tr>
                </thead>
                <tbody>
                    {/* Rows */}
                    {[...Array(6)].map((_, idx) => {
                        const mat = job.materials?.[idx];
                        return (
                            <tr key={idx} className="h-[28px] border-b border-black">
                                <td className="border-r border-black text-center">{idx + 1}</td>
                                <td className="border-r border-black pl-1 text-blue-700">{mat?.name || ''}</td>
                                <td className="border-r border-black text-right pr-1 text-blue-700">{mat?.qtyPcs ? mat.qtyPcs.toLocaleString() : ''}</td>
                                <td className="border-r border-black text-center text-blue-700">{mat?.qtyPcs ? mat.unit : ''}</td>
                                <td className="border-r border-black text-right pr-1 text-blue-700">{mat?.qtyKg ? mat.qtyKg.toLocaleString() : ''}</td>
                                <td className="border-r border-black text-center text-blue-700">{mat?.qtyKg ? 'กก.' : ''}</td>
                                <td className="border-r border-black text-center">{mat?.lotNo}</td>
                                <td className="pl-1">{mat?.remarks}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* 8. Footer Signatures */}
            <div className="mt-auto pt-4"> {/* Push to bottom if needed, or just flow */}
                <table className="w-full border-collapse border border-black mt-2 text-[18px]">
                    <thead>
                        <tr>
                            <th className="border-r border-black w-1/3 h-[80px] align-bottom pb-2">ผู้จ่าย</th>
                            <th className="border-r border-black w-1/3 align-bottom pb-2">ผู้รับ</th>
                            <th className="w-1/3 align-bottom pb-2">ผู้อนุมัติ</th>
                        </tr>
                    </thead>
                </table>
                <div className="text-[14px] text-blue-700 mt-1">
                     {formatDateOnly(new Date())}
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};
