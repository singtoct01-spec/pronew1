
import React, { useState } from 'react';
import { ProductionJob, ProductSpec } from '../types';
import { ChevronLeft, Printer, Minus, Plus, Settings, Grid, LayoutGrid, Square } from 'lucide-react';

import { formatDateOnly } from '../utils/dateUtils';

interface ProductTagViewProps {
  job: ProductionJob;
  productSpecs: ProductSpec[];
  onBack: () => void;
}

type LayoutType = '2-up' | '4-up' | '8-up' | '12-up';

export const ProductTagView: React.FC<ProductTagViewProps> = ({ job, productSpecs, onBack }) => {
  const [qtyPerPack, setQtyPerPack] = useState<number>(100); 
  const [numberOfTags, setNumberOfTags] = useState<number>(8); // Default to 8 (1 full page of 8-up)
  const [layout, setLayout] = useState<LayoutType>('8-up'); // Default layout
  const [mfgDate, setMfgDate] = useState<string>(formatDateOnly(new Date()));

  const handlePrint = () => {
    window.print();
  };

  // Logic to find material from specs
  const spec = productSpecs.find(s => job.productItem.includes(s.code));
  const material = spec ? spec.material : 'PP'; 

  const bomString = `${job.jobOrder} ${job.moldCode} ${job.color !== '-' ? job.color : ''}`;

  // Layout Configuration
  const getLayoutConfig = (type: LayoutType) => {
    switch (type) {
      case '2-up': // 2 tags per page (Very Large) - 1 col x 2 rows
        return { 
          width: '190mm', height: '135mm', 
          fontSize: 'text-base', headerSize: 'text-4xl',
          cols: 'grid-cols-1', gap: 'gap-y-[10mm]',
          padding: 'p-6'
        };
      case '4-up': // 4 tags per page (Large) - 2 cols x 2 rows
        return { 
          width: '94mm', height: '135mm', 
          fontSize: 'text-sm', headerSize: 'text-2xl',
          cols: 'grid-cols-2', gap: 'gap-x-[5mm] gap-y-[10mm]',
          padding: 'p-3'
        };
      case '8-up': // 8 tags per page (Standard) - 2 cols x 4 rows
        return { 
          width: '94mm', height: '68mm', 
          fontSize: 'text-[9px]', headerSize: 'text-lg',
          cols: 'grid-cols-2', gap: 'gap-x-[5mm] gap-y-[5mm]',
          padding: 'p-1.5'
        };
      case '12-up': // 12 tags per page (Small) - 3 cols x 4 rows
        return { 
          width: '62mm', height: '68mm', 
          fontSize: 'text-[7px]', headerSize: 'text-sm',
          cols: 'grid-cols-3', gap: 'gap-x-[4mm] gap-y-[4mm]',
          padding: 'p-1'
        };
      default: return { width: '94mm', height: '68mm', fontSize: 'text-[9px]', headerSize: 'text-lg', cols: 'grid-cols-2', gap: 'gap-[5mm]', padding: 'p-2' };
    }
  };

  const config = getLayoutConfig(layout);

  const Tag = () => (
    <div 
      className={`border-2 border-black bg-white text-black relative box-border flex flex-col font-sans ${config.padding}`}
      style={{ width: config.width, height: config.height }}
    >
        {/* Header */}
        <div className="flex items-center border-b-2 border-black pb-1 mb-0.5">
            <div className="w-[15%]">
               <div className={`font-bold text-red-600 tracking-tighter leading-none ${layout === '12-up' ? 'text-sm' : 'text-2xl'}`}>KPAC</div>
            </div>
            <div className="w-[85%] text-center">
                 <div className={`${layout === '12-up' ? 'text-[6px]' : 'text-[8px]'} font-bold text-left`}>Product name :</div>
                 <div className={`${config.headerSize} font-bold leading-none -mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis`}>
                    {job.productItem} {job.color !== '-' ? job.color : ''}
                 </div>
            </div>
        </div>

        {/* Grid Content */}
        <div className={`flex-1 flex flex-col justify-between ${config.fontSize} leading-tight`}>
            {/* Row 1 */}
            <div className="flex border-b border-dotted border-gray-400 pb-px">
                <div className="w-1/2 flex items-baseline">
                    <span className="font-bold w-[35%]">Machine:</span>
                    <span className="font-bold text-center flex-1">{job.machineId}</span>
                </div>
                <div className="w-1/2 flex items-baseline">
                    <span className="font-bold w-[35%]">Qty:</span>
                    <span className="font-bold text-center flex-1">{qtyPerPack}</span>
                    <span className="w-[20%] text-right">pcs</span>
                </div>
            </div>
            {/* Row 2 */}
            <div className="flex border-b border-dotted border-gray-400 pb-px">
                <div className="w-1/2 flex items-baseline">
                    <span className="font-bold w-[35%]">Material:</span>
                    <span className="font-bold text-center flex-1">{material}</span>
                </div>
                <div className="w-1/2 flex items-baseline">
                    <span className="font-bold w-[35%]">MFG:</span>
                    <span className="text-center flex-1 font-bold">{mfgDate}</span>
                </div>
            </div>
            {/* Row 3 */}
            <div className="flex border-b border-dotted border-gray-400 pb-px">
                <div className="w-1/2 flex items-baseline">
                    <span className="font-bold w-[35%]">Volume:</span>
                    <span className="text-center flex-1">-</span>
                </div>
                <div className="w-1/2 flex items-baseline">
                    <span className="font-bold w-[35%] whitespace-nowrap">Pack No:</span>
                    <span className="text-center flex-1"></span>
                </div>
            </div>
            {/* Row 4 */}
            <div className="flex border-b border-dotted border-gray-400 pb-px items-center">
                <div className="w-full flex items-center">
                    <span className="font-bold mr-1">Type:</span>
                    <span className={`${layout === '12-up' ? 'text-[5px]' : 'text-[7px]'} flex-1 truncate`}>อุณหภูมิใช้งาน ไม่เกิน 70°C แบบใช้ครั้งเดียว</span>
                    <span className="font-bold ml-1">Member:</span>
                </div>
            </div>
             {/* Row 5 */}
             <div className="flex border-b border-dotted border-gray-400 pb-px items-center">
                <div className="w-full flex items-center">
                    <span className="font-bold mr-1">Warn:</span>
                    <span className={`${layout === '12-up' ? 'text-[5px]' : 'text-[7px]'} flex-1 truncate`}>ห้ามใช้กับเตาไมโครเวฟ ห้ามวางใกล้เปลวไฟ</span>
                    <div className="ml-auto flex items-center">
                        <span className="font-bold mr-1">Bom:</span>
                        <span className="font-bold truncate max-w-[50px] text-[7px]">{bomString}</span>
                    </div>
                </div>
            </div>
             {/* Row 6: Shift */}
             <div className="flex border-b border-dotted border-gray-400 pb-px items-center py-0.5">
                <span className="font-bold mr-2">Shift:</span>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 border border-black"></div> A</div>
                    <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 border border-black"></div> B</div>
                </div>
            </div>
            {/* Row 7: Time Grid */}
            <div className={`grid grid-cols-8 gap-px text-[6px] py-0.5 border-b border-dotted border-gray-400 leading-none ${layout === '12-up' ? 'hidden' : ''}`}>
                {['8:00','9:00','10:00','11:00','12:00','13:00','14:00','15:00',
                  '16:00','17:00','18:00','19:00','20:00','21:00','22:00','23:00',
                  '0:00','1:00','2:00','3:00','4:00','5:00','6:00','7:00'].map(t => (
                      <div key={t} className="flex items-center gap-0.5">
                          <div className="w-1.5 h-1.5 border border-black shrink-0"></div>
                          <span className="scale-[0.8] origin-left">{t}</span>
                      </div>
                  ))}
            </div>
            {/* Row 8: QC */}
            <div className="flex items-center pt-0.5">
                <span className="font-bold mr-1">QC Result:</span>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 border border-black rounded-sm"></div> Pass</div>
                    <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 border border-black rounded-sm"></div> Fail</div>
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="mt-auto border-t border-black pt-0.5 relative">
             <p className={`${layout === '12-up' ? 'text-[4px]' : 'text-[6px]'} leading-tight text-gray-600`}>
                ผลิตโดย : บริษัท เคแพค อินดัสทรี จำกัด 45/54 หมู่ 2 ถนนบ้านแพ้ว-พระประโทน ตำบลชัยมงคล อำเภอเมืองสมุทรสาคร จังหวัดสมุทรสาคร 74000 <br/>
                สินค้ามีอายุการจัดเก็บ 2 ปี หลังจากวันที่ผลิต
             </p>
             <div className="absolute bottom-0 right-0 text-[5px] text-gray-400">PDD-FM-016 REV.02 150825</div>
        </div>
        
        {/* Right Side Icons (Mock) */}
        <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-80">
             <div className="w-5 h-5 border border-black rounded-full flex items-center justify-center bg-white">
                <span className="text-[5px] text-center leading-none">Food<br/>Grade</span>
             </div>
             <div className="w-5 h-5 border border-black rounded flex items-center justify-center bg-white">
                 <span className="text-[5px]">QR</span>
             </div>
             <div className="w-5 h-5 flex items-center justify-center">
                  <div className="text-[12px]">♻️</div>
             </div>
        </div>
    </div>
  );

  return (
    <div className="bg-slate-100 min-h-screen p-4 md:p-8 font-sans">
      {/* Control Header */}
      <div className="max-w-[210mm] mx-auto mb-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 print:hidden">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors bg-white px-4 py-2 rounded-lg shadow-sm"
        >
          <ChevronLeft size={20} /> ย้อนกลับ
        </button>

        <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-lg shadow-sm border border-slate-200 w-full xl:w-auto">
             <div className="flex items-center gap-2 px-2 border-r border-slate-200">
                <Settings size={16} className="text-slate-400" />
                <span className="text-sm font-bold text-slate-700 hidden sm:inline">ตั้งค่า:</span>
             </div>
             
             {/* Layout Selector */}
             <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">ขนาด:</span>
                <div className="flex bg-slate-100 rounded p-1 gap-1">
                    <button 
                        onClick={() => { setLayout('2-up'); setNumberOfTags(2); }} 
                        className={`p-1 rounded text-xs flex items-center gap-1 ${layout === '2-up' ? 'bg-white shadow text-blue-700 font-bold' : 'text-slate-500 hover:bg-slate-200'}`}
                        title="ใหญ่มาก (2 ดวง/หน้า)"
                    >
                        <Square size={14}/> 2
                    </button>
                    <button 
                        onClick={() => { setLayout('4-up'); setNumberOfTags(4); }} 
                        className={`p-1 rounded text-xs flex items-center gap-1 ${layout === '4-up' ? 'bg-white shadow text-blue-700 font-bold' : 'text-slate-500 hover:bg-slate-200'}`}
                        title="ใหญ่ (4 ดวง/หน้า)"
                    >
                        <LayoutGrid size={14}/> 4
                    </button>
                    <button 
                        onClick={() => { setLayout('8-up'); setNumberOfTags(8); }} 
                        className={`p-1 rounded text-xs flex items-center gap-1 ${layout === '8-up' ? 'bg-white shadow text-blue-700 font-bold' : 'text-slate-500 hover:bg-slate-200'}`}
                        title="มาตรฐาน (8 ดวง/หน้า)"
                    >
                        <Grid size={14}/> 8
                    </button>
                    <button 
                        onClick={() => { setLayout('12-up'); setNumberOfTags(12); }} 
                        className={`p-1 rounded text-xs flex items-center gap-1 ${layout === '12-up' ? 'bg-white shadow text-blue-700 font-bold' : 'text-slate-500 hover:bg-slate-200'}`}
                        title="เล็ก (12 ดวง/หน้า)"
                    >
                        <Grid size={14} className="opacity-50"/> 12
                    </button>
                </div>
             </div>

             <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500">จำนวน/แพ็ค:</label>
                <input 
                    type="number" 
                    value={qtyPerPack} 
                    onChange={(e) => setQtyPerPack(Number(e.target.value))}
                    className="w-16 px-2 py-1 border border-slate-300 rounded text-sm text-center"
                />
             </div>

             <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500">พิมพ์ (ดวง):</label>
                <div className="flex items-center">
                    <button onClick={() => setNumberOfTags(Math.max(1, numberOfTags - 1))} className="p-1 hover:bg-slate-100 rounded"><Minus size={14}/></button>
                    <input 
                        type="number" 
                        value={numberOfTags} 
                        onChange={(e) => setNumberOfTags(Number(e.target.value))}
                        className="w-12 px-1 py-1 border-0 text-center text-sm font-bold"
                    />
                    <button onClick={() => setNumberOfTags(numberOfTags + 1)} className="p-1 hover:bg-slate-100 rounded"><Plus size={14}/></button>
                </div>
             </div>

             <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 shadow-md transition-colors ml-auto xl:ml-2"
             >
                <Printer size={16} /> <span className="hidden sm:inline">พิมพ์</span>
            </button>
        </div>
      </div>

      {/* A4 Paper Container */}
      <div className="max-w-[210mm] mx-auto bg-white shadow-xl print:shadow-none print:border-none min-h-[297mm] relative print:w-[210mm] print:h-[297mm] overflow-hidden">
         <div className={`grid ${config.cols} ${config.gap} content-start p-[10mm]`}>
            {Array.from({ length: numberOfTags }).map((_, i) => (
                <div key={i} className="flex justify-center">
                    <Tag />
                </div>
            ))}
         </div>
      </div>
      
      <style>{`
        @media print {
            @page {
                size: A4 portrait;
                margin: 0;
            }
            body {
                background: white;
            }
            .print\\:hidden {
                display: none;
            }
        }
      `}</style>
    </div>
  );
};
