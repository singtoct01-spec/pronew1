import React from 'react';
import { ProductionJob } from '../types';
import { calculateBOM } from '../utils/bomCalculator';

import { formatDateTime } from '../utils/dateUtils';

interface ProductionOrderPrintProps {
  job: ProductionJob;
  onBack: () => void;
}

export const ProductionOrderPrint: React.FC<ProductionOrderPrintProps> = ({ job, onBack }) => {
  const bom = calculateBOM(job.productItem, job.totalProduction, job.color, job.machineId);
  
  const handlePrint = () => {
    window.print();
  };

  const displayColor = job.color && job.color !== '-' ? job.color : 'สีใส';

  return (
    <div className="bg-gray-100 min-h-screen p-4 print:p-0 print:bg-white font-sans text-black text-xs leading-tight">
      {/* Action Bar (Hidden in Print) */}
      <div className="max-w-[210mm] mx-auto mb-4 flex justify-between items-center print:hidden">
        <button 
          onClick={onBack}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 font-medium"
        >
          &larr; กลับ
        </button>
        <button 
          onClick={handlePrint}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 font-medium flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
          </svg>
          พิมพ์ใบสั่งผลิต
        </button>
      </div>

      {/* A4 Paper Container */}
      <div className="max-w-[210mm] mx-auto bg-white p-4 shadow-lg print:shadow-none print:p-0 print:max-w-none print:w-[210mm] print:h-[297mm]">
        
        {/* Header Section */}
        <div className="flex border border-black">
          {/* Logo & Title */}
          <div className="w-2/3 border-r border-black">
            <div className="flex items-center justify-center h-12 border-b border-black relative">
              <div className="absolute left-2 top-1">
                 <div className="font-bold text-xl italic">KPAC</div>
              </div>
              <h1 className="text-xl font-bold">ใบสั่งผลิต</h1>
            </div>
            <div className="p-1 grid grid-cols-2 gap-x-2 text-[10px]">
              <div className="flex"><span className="w-20">เลขที่ใบสั่งผลิต</span> <span className="text-blue-600">{job.jobOrder}</span></div>
              <div className="flex justify-end"><span className="mr-2">วันที่ออกเอกสาร</span> <span>{formatDateTime(new Date())}</span></div>
              
              <div className="flex"><span className="w-20">รหัสสินค้า</span> <span className="text-blue-600">{job.productItem}</span></div>
              <div className="flex"><span className="w-20">กำหนดเริ่มผลิต</span> <span className="text-blue-600">{job.startDate ? formatDateTime(job.startDate) : '-'} น.</span></div>
              
              <div className="flex"><span className="w-20">จำนวนสั่งผลิต</span> <span className="text-blue-600">{(job.totalProduction || 0).toLocaleString()} ชิ้น</span></div>
              <div className="flex"><span className="w-20">กำหนดจบผลิต</span> <span className="text-blue-600">{job.endDate ? formatDateTime(job.endDate) : '-'} น.</span></div>
            </div>
          </div>

          {/* Production Record Table */}
          <div className="w-1/3 text-[10px]">
            <div className="text-center border-b border-black">บันทึกส่วนของผลิต</div>
            <div className="text-center border-b border-black">รายงานยอดผลิต</div>
            <div className="grid grid-cols-4 h-full">
              <div className="border-r border-black text-center">กะ</div>
              <div className="col-span-2 border-r border-black text-center">ยอดผลิต(ชิ้น)</div>
              <div className="text-center">วันที่</div>
            </div>
            {/* Empty rows for recording */}
            {[...Array(5)].map((_, i) => (
              <div key={i} className="grid grid-cols-4 border-t border-black h-4">
                <div className="border-r border-black"></div>
                <div className="col-span-2 border-r border-black"></div>
                <div></div>
              </div>
            ))}
          </div>
        </div>

        {/* Product Details */}
        <div className="border-x border-b border-black bg-gray-300 text-center font-bold text-[10px] py-0.5">ข้อมูลผลิตภัณฑ์</div>
        <div className="border-x border-b border-black flex h-32">
          <div className="w-2/3 p-1 text-[10px] border-r border-black">
            <div className="grid grid-cols-[60px_1fr] mb-1">
              <div>ประเภท</div>
              <div className="text-blue-600">{bom.productDetails.type}</div>
            </div>
            <div className="grid grid-cols-[60px_1fr] mb-1">
              <div>โครงสร้าง</div>
              <div className="text-blue-600">{bom.productDetails.structure}</div>
            </div>
            <div className="grid grid-cols-[60px_1fr] mb-1">
              <div>สี</div>
              <div className="flex gap-4">
                <span className="font-bold">{displayColor}</span>
                <span>รหัสสี {displayColor === 'สีแดง' ? 'MERD24801' : displayColor === 'สีขาว' ? 'MS2016W3 BEST' : '-'}</span>
              </div>
            </div>
            <div className="grid grid-cols-[60px_1fr] mb-1">
              <div>น้ำหนัก</div>
              <div>{bom.productDetails.weight} กรัม</div>
            </div>
            <div className="grid grid-cols-[60px_1fr] mb-1">
              <div>กว้างปาก</div>
              <div>{bom.productDetails.mouthWidth} มม.</div>
            </div>
            <div className="grid grid-cols-[60px_1fr] mb-1">
              <div>กว้างโหล</div>
              <div>{bom.productDetails.jarWidth} มม.</div>
            </div>
            <div className="grid grid-cols-[60px_1fr] mb-1">
              <div>สูง</div>
              <div>{bom.productDetails.height} มม.</div>
            </div>
            <div className="grid grid-cols-[60px_1fr]">
              <div>ความจุ</div>
              <div>{bom.productDetails.capacity} มล.</div>
            </div>
          </div>
          <div className="w-1/3 flex items-center justify-center text-gray-400 text-xs">
            รูปสินค้า
          </div>
        </div>

        {/* Injection Department Section */}
        {bom.injection && (
          <>
            <div className="border-x border-b border-black bg-gray-300 text-center font-bold text-[10px] py-0.5">แผนก ฉีดพลาสติก</div>
            <div className="border-x border-b border-black flex text-[10px]">
              <div className="w-2/3 border-r border-black p-1">
                <div className="grid grid-cols-[80px_1fr] mb-1">
                  <div>เครื่องจักรที่ผลิต</div>
                  <div className="text-blue-600">{bom.injection.machine}</div>
                </div>
                <div className="grid grid-cols-[80px_1fr] mb-1">
                  <div>รหัสแม่พิมพ์</div>
                  <div className="text-blue-600">{bom.injection.mold}</div>
                </div>
                
                <div className="flex justify-between mb-1">
                  <div>วัตถุดิบรวมที่ใช้ทั้งหมด LL+HD</div>
                  <div>{bom.injection.totalRawMaterialKg} กก.</div>
                  <div className="border border-black px-1">จำนวนรอบผสมเม็ด</div>
                  <div className="text-right">{bom.injection.mixRounds} รอบ</div>
                </div>

                <div className="grid grid-cols-[80px_30px_50px_1fr_80px_50px_1fr] gap-x-1 mb-1">
                  <div>LLDPE 8420A</div>
                  <div className="text-right">{bom.injection.lldpe.percent}%</div>
                  <div className="text-right text-blue-600">{bom.injection.lldpe.kg}</div>
                  <div>กก.</div>
                  <div>LLDPE 8420A</div>
                  <div className="text-right text-blue-600">{bom.injection.lldpe.kgPerRound}</div>
                  <div>กก./รอบ</div>
                </div>
                <div className="grid grid-cols-[80px_30px_50px_1fr_80px_50px_1fr] gap-x-1 mb-1">
                  <div>HDPE 1600J</div>
                  <div className="text-right">{bom.injection.hdpe.percent}%</div>
                  <div className="text-right text-blue-600">{bom.injection.hdpe.kg}</div>
                  <div>กก.</div>
                  <div>HDPE 1600J</div>
                  <div className="text-right text-blue-600">{bom.injection.hdpe.kgPerRound}</div>
                  <div>กก./รอบ</div>
                </div>
                <div className="grid grid-cols-[80px_30px_50px_1fr_80px_50px_1fr] gap-x-1 mb-1">
                  <div>Scrap PE {displayColor}</div>
                  <div className="text-right">{bom.injection.scrap.percent}%</div>
                  <div className="text-right text-blue-600">{bom.injection.scrap.kg}</div>
                  <div>กก.</div>
                  <div>Scrap PE{displayColor}</div>
                  <div className="text-right text-blue-600">{bom.injection.scrap.kgPerRound}</div>
                  <div>กก./รอบ</div>
                </div>
                <div className="grid grid-cols-[80px_30px_50px_1fr_80px_50px_1fr] gap-x-1 mb-1">
                  <div>Master batch</div>
                  <div className="text-right">{bom.injection.masterBatch.percent}%</div>
                  <div className="text-right text-blue-600">{bom.injection.masterBatch.kg}</div>
                  <div>กก.</div>
                  <div>Master batch</div>
                  <div className="text-right text-blue-600">{bom.injection.masterBatch.kgPerRound}</div>
                  <div>กก./รอบ</div>
                </div>

                <div className="grid grid-cols-[80px_1fr] mt-2">
                  <div>วิธีการบรรจุ</div>
                  <div className="text-blue-600">{bom.injection.packMethod}</div>
                </div>
                <div className="flex mt-1">
                  <div className="w-20">จำนวนบรรจุ</div>
                  <div className="text-blue-600 w-20 text-right mr-2">{(bom.injection.qtyPerPack || 0).toLocaleString()}</div>
                  <div className="mr-8">ชิ้น</div>
                  <div className="mr-2">จำนวน</div>
                  <div className="text-right mr-2">{bom.injection.totalPacks}</div>
                  <div>กล่อง</div>
                </div>
                <div className="text-red-600 text-[9px] mt-1 font-bold">หมายเหตุ : เผื่อสูญเสียจากการผลิต 5%</div>
              </div>
              <div className="w-1/3 p-1">
                <div className="font-bold mb-1">ข้อกำหนดเพิ่มเติม</div>
                {/* Additional requirements area */}
              </div>
            </div>
          </>
        )}

        {/* Blow Department Section */}
        {bom.blow && (
          <>
            <div className="border-x border-b border-black bg-gray-300 text-center font-bold text-[10px] py-0.5">แผนก เป่าพลาสติก</div>
            <div className="border-x border-b border-black flex text-[10px]">
              <div className="w-2/3 border-r border-black p-1">
                <div className="grid grid-cols-[80px_1fr] mb-1">
                  <div>เครื่องจักรที่ผลิต</div>
                  <div className="text-blue-600 line-through decoration-black">{job.machineId}</div>
                  <div className="ml-2 text-blue-600">{bom.blow.machine}</div>
                </div>
                <div className="grid grid-cols-[80px_1fr] mb-1">
                  <div>รหัสแม่พิมพ์</div>
                  <div className="text-blue-600">{bom.blow.mold}</div>
                </div>
                
                {bom.blow.note && (
                   <div className="text-red-600 text-center my-2 font-bold">{bom.blow.note}</div>
                )}

                <div className="grid grid-cols-[80px_1fr] mb-1">
                  <div>Preform</div>
                  <div className="text-blue-600">{bom.blow.preformName}</div>
                </div>
                <div className="grid grid-cols-[80px_1fr] mb-1">
                  <div>จำนวนPreform</div>
                  <div className="text-blue-600">{(bom.blow.preformQty || 0).toLocaleString()} ชิ้น</div>
                </div>

                <div className="grid grid-cols-[80px_1fr] mt-2">
                  <div>วิธีการบรรจุ</div>
                  <div className="text-blue-600">{bom.blow.packMethod}</div>
                </div>
                <div className="flex mt-1">
                  <div className="w-20">จำนวนบรรจุ</div>
                  <div className="text-blue-600 w-20 text-right mr-2">{(bom.blow.qtyPerPack || 0).toLocaleString()}</div>
                  <div className="mr-8">ใบ</div>
                  <div className="mr-2">จำนวน</div>
                  <div className="text-right mr-2">{bom.blow.totalPacks}</div>
                  <div>แพ็คถุง</div>
                </div>
                <div className="text-red-600 text-[9px] mt-1 font-bold">หมายเหตุ : เผื่อสูญเสียจากการผลิต 2 %</div>
              </div>
              <div className="w-1/3 p-1">
                <div className="font-bold mb-1">ข้อกำหนดเพิ่มเติม</div>
                {/* Additional requirements area */}
              </div>
            </div>
          </>
        )}

        {/* BOM Table */}
        <div className="border-x border-b border-black bg-orange-200 text-center font-bold text-[10px] py-0.5">รายการที่ใช้ในการผลิต</div>
        <table className="w-full border-collapse border-x border-b border-black text-[10px]">
          <thead>
            <tr className="bg-orange-200">
              <th className="border border-black py-1 px-1 w-8">ลำดับ</th>
              <th className="border border-black py-1 px-1">รายการวัตถุดิบ และวัสดุประกอบ</th>
              <th className="border border-black py-1 px-1 w-12">บรรจุ</th>
              <th className="border border-black py-1 px-1 w-16">จำนวน</th>
              <th className="border border-black py-1 px-1 w-10">หน่วย</th>
              <th className="border border-black py-1 px-1 w-16">จำนวน</th>
              <th className="border border-black py-1 px-1 w-10">หน่วย</th>
              <th className="border border-black py-1 px-1 w-24">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            {bom.rows.map((row) => (
              <tr key={row.no}>
                <td className="border border-black py-1 px-1 text-center">{row.no}</td>
                <td className="border border-black py-1 px-1 text-left pl-2">{row.itemName}</td>
                <td className="border border-black py-1 px-1 text-center text-gray-400">{row.packSize}</td>
                <td className="border border-black py-1 px-1 text-right pr-2 text-blue-600">{typeof row.usageQty === 'number' ? row.usageQty.toLocaleString() : row.usageQty}</td>
                <td className="border border-black py-1 px-1 text-center text-blue-600">{row.usageUnit}</td>
                <td className="border border-black py-1 px-1 text-right pr-2 font-bold text-orange-600">{typeof row.purchaseQty === 'number' ? row.purchaseQty.toLocaleString() : row.purchaseQty}</td>
                <td className="border border-black py-1 px-1 text-center font-bold text-orange-600">{row.purchaseUnit}</td>
                <td className="border border-black py-1 px-1 text-center">{row.note}</td>
              </tr>
            ))}
            {/* Fill empty rows to make table look full */}
            {[...Array(Math.max(0, 9 - bom.rows.length))].map((_, i) => (
              <tr key={`empty-${i}`}>
                <td className="border border-black py-1 px-1 text-center">{bom.rows.length + i + 1}</td>
                <td className="border border-black py-1 px-1"></td>
                <td className="border border-black py-1 px-1"></td>
                <td className="border border-black py-1 px-1"></td>
                <td className="border border-black py-1 px-1"></td>
                <td className="border border-black py-1 px-1"></td>
                <td className="border border-black py-1 px-1"></td>
                <td className="border border-black py-1 px-1"></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Signatures */}
        <div className="flex justify-between mt-8 text-[10px] px-16">
          <div className="text-center">
            <div className="border-b border-black w-32 mx-auto mb-1"></div>
            <div>ฝ่ายวางแผน</div>
          </div>
          <div className="text-center">
            <div className="border-b border-black w-32 mx-auto mb-1 relative">
                {/* Signature placeholder */}
                <div className="absolute -top-6 left-0 right-0 text-blue-600 font-script text-lg">
                    {/* Simulated signature */}
                </div>
            </div>
            <div>ผู้อนุมัติ</div>
          </div>
        </div>
        <div className="text-right text-[8px] mt-2">PL-FM-002 R02 020369</div>

      </div>
    </div>
  );
};
