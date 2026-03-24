import React, { useState } from 'react';
import { X, Upload, FileSpreadsheet, ClipboardPaste, CheckCircle2, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { ProductionJob } from '../types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (jobs: Partial<ProductionJob>[]) => Promise<void> | void;
}

export const GoogleSheetsImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'upload' | 'api'>('paste');
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [parsedJobs, setParsedJobs] = useState<Partial<ProductionJob>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  if (!isOpen) return null;

  const handlePasteProcess = () => {
    try {
      const pasteData = textareaRef.current?.value || '';
      if (!pasteData.trim()) throw new Error('กรุณาวางข้อมูลก่อน');

      // Simple TSV parser for pasted data from Google Sheets
      const rows = pasteData.split('\n').map(row => row.split('\t'));
      
      const jobMap = new Map<string, Partial<ProductionJob>>();

      rows.forEach((row, i) => {
        // If row only has 1 column, it might be space-separated (fallback for weird copy-pastes)
        let cols = row;
        if (cols.length === 1 && cols[0].includes(' ')) {
           const splitByMultipleSpaces = cols[0].split(/\s{2,}/);
           if (splitByMultipleSpaces.length > 2) {
               cols = splitByMultipleSpaces;
           } else {
               // Last resort: split by single space, but this might break "09.00 น."
               cols = cols[0].split(/\s+/);
           }
        }

        if (cols.length < 3) return; // Not enough data

        // Skip header rows
        const firstCell = cols[0]?.trim();
        if (firstCell === 'เครื่อง' || firstCell === 'Machine' || firstCell === 'JobOrder' || cols[4]?.trim() === 'ยอดผลิต') return;
        if (!firstCell && cols[6]?.trim() === 'วันที่') return;

        let jobOrder = '';
        let productItem = '';
        let machineId = '';
        let capacityPerShift = 0;
        let totalProduction = 1000;
        let actualProduction = 0;
        let color = '';
        let startDate = new Date().toISOString();
        let endDate = new Date(Date.now() + 86400000).toISOString();
        let moldCode = 'Standard';
        let note = '';

        // Find all date columns to anchor the parsing
        const dateIndices: number[] = [];
        for (let j = 4; j < cols.length; j++) {
            if (cols[j]?.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/)) {
                dateIndices.push(j);
            }
        }

        const parseThaiDate = (dateStr: string, timeStr: string) => {
          if (!dateStr) return null;
          const parts = dateStr.split('/');
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            let year = parseInt(parts[2], 10);
            if (year > 2500) year -= 543;
            
            let hours = 0;
            let minutes = 0;
            if (timeStr) {
               const timeParts = timeStr.includes(':') ? timeStr.split(':') : timeStr.split('.');
               if (timeParts.length >= 2) {
                  hours = parseInt(timeParts[0], 10);
                  minutes = parseInt(timeParts[1], 10);
               }
            }
            const date = new Date(year, month, day, hours, minutes);
            if (!isNaN(date.getTime())) return date.toISOString();
          }
          return null;
        };

        if (dateIndices.length >= 2 || cols.length >= 10) {
            machineId = cols[0]?.trim() || 'IP1';
            productItem = cols[1]?.trim() || 'Unknown Product';
            moldCode = cols[2]?.trim() || 'Standard';
            capacityPerShift = parseInt(cols[3]?.replace(/,/g, '')) || 0;
            
            const startIdx = dateIndices.length > 0 ? dateIndices[0] : 6;
            
            // Total production is usually 2 columns before start date, or at index 4
            const prodCol = startIdx >= 6 ? 4 : (startIdx > 2 ? startIdx - 2 : 4);
            totalProduction = parseInt(cols[prodCol]?.replace(/,/g, '')) || 1000;
            
            // Color is usually 1 column before start date
            if (startIdx > prodCol + 1) {
                color = cols[startIdx - 1]?.trim() || '';
            }

            if (dateIndices.length >= 2) {
                const startDateStr = cols[dateIndices[0]]?.trim();
                const startTimeStr = cols[dateIndices[0] + 1]?.trim();
                const endDateStr = cols[dateIndices[1]]?.trim();
                const endTimeStr = cols[dateIndices[1] + 1]?.trim();
                
                startDate = parseThaiDate(startDateStr, startTimeStr) || new Date().toISOString();
                endDate = parseThaiDate(endDateStr, endTimeStr) || new Date(Date.now() + 86400000).toISOString();

                // Find Job Order (first non-empty string after end date that isn't "น.")
                let jobOrderIdx = -1;
                for (let j = dateIndices[1] + 2; j <= dateIndices[1] + 6; j++) {
                    const val = cols[j]?.trim();
                    if (val && val !== 'น.' && val !== 'น') {
                        jobOrderIdx = j;
                        break;
                    }
                }
                
                if (jobOrderIdx !== -1) {
                    jobOrder = cols[jobOrderIdx]?.trim() || `JOB-IMP-${i}`;
                    
                    // Note is usually the next column if it's not a number
                    const nextVal = cols[jobOrderIdx + 1]?.trim();
                    if (nextVal && isNaN(Number(nextVal.replace(/,/g, '')))) {
                        note = nextVal;
                    }
                    
                    // Find actual production (first number after Job Order)
                    let actualProd = 0;
                    for (let j = jobOrderIdx + 1; j <= jobOrderIdx + 8; j++) {
                        const val = cols[j]?.replace(/,/g, '').trim();
                        if (val && val !== '-' && !isNaN(Number(val))) {
                            actualProd = parseInt(val);
                            break;
                        }
                    }
                    actualProduction = actualProd;
                } else {
                    jobOrder = `JOB-IMP-${i}`;
                }

            } else {
                // Fallback if dates not found but has many columns
                jobOrder = cols[10]?.trim() || `JOB-IMP-${i}`;
                note = cols[11]?.trim() || '';
                actualProduction = parseInt(cols[12]?.replace(/,/g, '')) || 0;
            }
        } else {
            // Old format fallback
            jobOrder = cols[0]?.trim() || `JOB-IMP-${i}`;
            productItem = cols[1]?.trim() || 'Unknown Product';
            machineId = cols[2]?.trim() || 'IP1';
            totalProduction = parseInt(cols[3]?.replace(/,/g, '')) || 1000;
            
            try {
              if (cols[4] && cols[4].trim() !== '') {
                const parsedStart = new Date(cols[4]);
                if (!isNaN(parsedStart.getTime())) startDate = parsedStart.toISOString();
              }
            } catch (e) {}
            
            try {
              if (cols[5] && cols[5].trim() !== '') {
                const parsedEnd = new Date(cols[5]);
                if (!isNaN(parsedEnd.getTime())) endDate = parsedEnd.toISOString();
              }
            } catch (e) {}
        }

        const newJob: Partial<ProductionJob> = {
          id: `IMP-${Date.now()}-${i}`,
          jobOrder,
          productItem,
          machineId,
          capacityPerShift,
          totalProduction,
          actualProduction,
          color,
          startDate,
          endDate,
          status: 'Planned',
          moldCode,
          note
        };

        if (jobMap.has(jobOrder)) {
          const existingJob = jobMap.get(jobOrder)!;
          // ยึดเอายอดผลิตตัวที่เพิ่มขึ้นมาเข้าแผน
          existingJob.totalProduction = Math.max(existingJob.totalProduction || 0, newJob.totalProduction || 0);
          existingJob.actualProduction = Math.max(existingJob.actualProduction || 0, newJob.actualProduction || 0);
        } else {
          jobMap.set(jobOrder, newJob);
        }
      });

      const jobs = Array.from(jobMap.values());
      if (jobs.length === 0) throw new Error('ไม่พบข้อมูลที่สามารถนำเข้าได้ (ตรวจสอบคอลัมน์ข้อมูล)');

      setParsedJobs(jobs);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการอ่านข้อมูล');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const jobMap = new Map<string, Partial<ProductionJob>>();

        data.forEach((row, i) => {
          const jobOrder = row['JobOrder'] || row['เลขที่ใบสั่งผลิต'] || row['เลขที่ใบสั่งผลิต '] || `JOB-EXC-${i}`;
          
          let startDate = new Date().toISOString();
          let endDate = new Date(Date.now() + 86400000).toISOString();
          
          // Try to parse dates if available
          const startDateStr = row['StartDate'] || row['เริ่มผลิต วันที่'] || row['เริ่มผลิตวันที่'];
          const startTimeStr = row['StartTime'] || row['เริ่มผลิต เวลา'] || row['เริ่มผลิตเวลา'];
          const endDateStr = row['EndDate'] || row['กำหนดแล้วเสร็จ วันที่'] || row['กำหนดแล้วเสร็จวันที่'];
          const endTimeStr = row['EndTime'] || row['กำหนดแล้วเสร็จ เวลา'] || row['กำหนดแล้วเสร็จเวลา'];

          const parseThaiDate = (dateStr: any, timeStr: any) => {
            if (!dateStr) return null;
            const str = String(dateStr).trim();
            const parts = str.split('/');
            if (parts.length === 3) {
              const day = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10) - 1;
              let year = parseInt(parts[2], 10);
              if (year > 2500) year -= 543;
              
              let hours = 0;
              let minutes = 0;
              if (timeStr) {
                 const tStr = String(timeStr).trim();
                 const timeParts = tStr.includes(':') ? tStr.split(':') : tStr.split('.');
                 if (timeParts.length >= 2) {
                    hours = parseInt(timeParts[0], 10);
                    minutes = parseInt(timeParts[1], 10);
                 }
              }
              const date = new Date(year, month, day, hours, minutes);
              if (!isNaN(date.getTime())) return date.toISOString();
            } else if (typeof dateStr === 'number') {
               // Excel serial date
               const date = new Date(Math.round((dateStr - 25569) * 86400 * 1000));
               if (!isNaN(date.getTime())) return date.toISOString();
            }
            return null;
          };

          startDate = parseThaiDate(startDateStr, startTimeStr) || new Date().toISOString();
          endDate = parseThaiDate(endDateStr, endTimeStr) || new Date(Date.now() + 86400000).toISOString();

          const totalProduction = parseInt(String(row['Target'] || row['เป้าหมาย'] || row['ยอดผลิต'] || 1000).replace(/,/g, '')) || 1000;
          const actualProduction = parseInt(String(row['Actual'] || row['ยอดการผลิดได้'] || row['ยอดการผลิตได้'] || 0).replace(/,/g, '')) || 0;

          const newJob: Partial<ProductionJob> = {
            id: `EXC-${Date.now()}-${i}`,
            jobOrder,
            productItem: row['Product'] || row['สินค้า'] || row['รายการสินค้า'] || 'Unknown Product',
            machineId: row['Machine'] || row['เครื่องจักร'] || row['เครื่อง'] || 'IP1',
            totalProduction,
            actualProduction,
            startDate,
            endDate,
            status: 'Planned',
            moldCode: row['Mold'] || row['แม่พิมพ์'] || row['รหัสแม่พิมพ์'] || 'Standard',
            note: row['Note'] || row['หมายเหตุ'] || ''
          };

          if (jobMap.has(jobOrder)) {
            const existingJob = jobMap.get(jobOrder)!;
            existingJob.totalProduction = Math.max(existingJob.totalProduction || 0, newJob.totalProduction || 0);
            existingJob.actualProduction = Math.max(existingJob.actualProduction || 0, newJob.actualProduction || 0);
          } else {
            jobMap.set(jobOrder, newJob);
          }
        });

        const jobs = Array.from(jobMap.values());

        setParsedJobs(jobs);
        setError(null);
      } catch (err: any) {
        setError('ไม่สามารถอ่านไฟล์ Excel ได้ กรุณาตรวจสอบรูปแบบไฟล์');
      }
    };
    reader.readAsBinaryString(file);
  };

  const confirmImport = async () => {
    setIsImporting(true);
    try {
      await onImport(parsedJobs);
      onClose();
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการนำเข้าข้อมูล');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-kanit">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">นำเข้าข้อมูลจาก Google Sheets / Excel</h2>
              <p className="text-sm text-slate-500">สร้างใบสั่งผลิตหลายรายการพร้อมกัน</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-slate-200 px-4 pt-2 gap-4 bg-slate-50">
          <button 
            onClick={() => setActiveTab('paste')}
            className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'paste' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <div className="flex items-center gap-2"><ClipboardPaste size={16}/> วางข้อมูล (Copy/Paste)</div>
          </button>
          <button 
            onClick={() => setActiveTab('upload')}
            className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'upload' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <div className="flex items-center gap-2"><Upload size={16}/> อัปโหลดไฟล์ Excel</div>
          </button>
          <button 
            onClick={() => setActiveTab('api')}
            className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'api' ? 'border-blue-500 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <div className="flex items-center gap-2"><FileSpreadsheet size={16}/> เชื่อมต่อ API อัตโนมัติ</div>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'paste' && (
            <div className="space-y-4">
              <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm flex gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <p>เปิด Google Sheets ของคุณ ลากคลุมข้อมูลที่ต้องการ (รวมหัวตาราง) กด Ctrl+C แล้วนำมาวาง (Ctrl+V) ในช่องด้านล่างนี้</p>
              </div>
              <textarea 
                ref={textareaRef}
                className="w-full h-40 p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-mono whitespace-pre"
                placeholder="JobOrder&#9;Product&#9;Machine&#9;Target&#10;JOB-001&#9;กระปุก 500g&#9;IP1&#9;5000"
              />
              <button 
                onClick={handlePasteProcess}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 text-sm font-medium"
              >
                ตรวจสอบข้อมูล
              </button>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-4">
               <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors">
                  <Upload size={40} className="text-slate-400 mb-4" />
                  <p className="text-slate-700 font-medium mb-1">ลากไฟล์ Excel (.xlsx, .csv) มาวางที่นี่</p>
                  <p className="text-slate-500 text-sm mb-4">หรือคลิกเพื่อเลือกไฟล์จากเครื่องของคุณ</p>
                  <input 
                    type="file" 
                    accept=".xlsx, .xls, .csv" 
                    onChange={handleFileUpload}
                    className="hidden" 
                    id="excel-upload"
                  />
                  <label htmlFor="excel-upload" className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 cursor-pointer text-sm font-medium shadow-sm">
                    เลือกไฟล์
                  </label>
               </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileSpreadsheet size={32} className="text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">เชื่อมต่อ Google Sheets API</h3>
                <p className="text-slate-600 text-sm mb-6 max-w-md mx-auto">
                  ดึงข้อมูลใบสั่งผลิตจาก "แบบฟอร์มใหม่ กระปุก-โหล ผูกสูตร" ของคุณโดยอัตโนมัติแบบ Real-time
                </p>
                <div className="space-y-3 max-w-sm mx-auto text-left bg-white p-4 rounded-lg border border-slate-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Google Sheet ID</label>
                    <input type="text" placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms" className="w-full p-2 border border-slate-300 rounded bg-slate-50 text-sm" disabled />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Sheet Name</label>
                    <input type="text" placeholder="e.g. Sheet1" className="w-full p-2 border border-slate-300 rounded bg-slate-50 text-sm" disabled />
                  </div>
                  <button className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium mt-2 opacity-50 cursor-not-allowed">
                    ตั้งค่าการเชื่อมต่อ (Coming Soon)
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-4">* ฟีเจอร์นี้ต้องการการตั้งค่า Google Cloud OAuth</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {parsedJobs.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-500" />
                  พบข้อมูล {parsedJobs.length} รายการ
                </h3>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 text-slate-600 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 font-medium">Job Order</th>
                      <th className="px-4 py-2 font-medium">Product</th>
                      <th className="px-4 py-2 font-medium">Machine</th>
                      <th className="px-4 py-2 font-medium">Target</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {parsedJobs.slice(0, 5).map((job, idx) => (
                      <tr key={idx} className="bg-white">
                        <td className="px-4 py-2 font-mono text-xs">{job.jobOrder}</td>
                        <td className="px-4 py-2">{job.productItem}</td>
                        <td className="px-4 py-2">{job.machineId}</td>
                        <td className="px-4 py-2">{job.totalProduction}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedJobs.length > 5 && (
                  <div className="p-2 text-center text-xs text-slate-500 bg-white border-t border-slate-100">
                    ... และอีก {parsedJobs.length - 5} รายการ
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose} disabled={isImporting} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
            ยกเลิก
          </button>
          <button 
            onClick={confirmImport}
            disabled={parsedJobs.length === 0 || isImporting}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2
              ${parsedJobs.length > 0 && !isImporting ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
          >
            {isImporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-400 border-t-transparent"></div>
                กำลังนำเข้า...
              </>
            ) : (
              <>
                <Upload size={16} />
                นำเข้า {parsedJobs.length > 0 ? parsedJobs.length : ''} รายการ
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
