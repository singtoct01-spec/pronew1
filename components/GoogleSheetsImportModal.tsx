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

  const [publishedUrl, setPublishedUrl] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);

  if (!isOpen) return null;

  const handleJobChange = (index: number, field: keyof Partial<ProductionJob>, value: any) => {
    const updatedJobs = [...parsedJobs];
    updatedJobs[index] = { ...updatedJobs[index], [field]: value };
    setParsedJobs(updatedJobs);
  };

  const formatForDateTimeLocal = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  const handlePasteProcess = () => {
    try {
      const pasteData = textareaRef.current?.value || '';
      if (!pasteData.trim()) throw new Error('กรุณาวางข้อมูลก่อน');

      // Simple TSV parser for pasted data from Google Sheets
      const rows = pasteData.split('\n').map(row => row.split('\t'));
      
      const jobMap = new Map<string, Partial<ProductionJob>>();

      // Find the first data row (a row that has a date DD/MM/YYYY or numbers with commas)
      let firstDataRowIdx = -1;
      for (let i = 0; i < Math.min(10, rows.length); i++) {
        const hasDate = rows[i].some(cell => cell.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/));
        const hasNumberWithComma = rows[i].some(cell => cell.match(/^\s*\d{1,3}(,\d{3})+\s*$/));
        if (hasDate || hasNumberWithComma) {
          firstDataRowIdx = i;
          break;
        }
      }

      if (firstDataRowIdx === -1) {
         firstDataRowIdx = 1; // Fallback
      }

      // Merge headers to handle Excel merged cells (which leave empty cells to the right)
      const mergedHeaders: string[] = [];
      const maxCols = Math.max(...rows.map(r => r.length));
      
      for (let col = 0; col < maxCols; col++) {
        let headerParts = [];
        for (let r = 0; r < firstDataRowIdx; r++) {
          const cell = rows[r][col]?.trim();
          if (cell) {
             headerParts.push(cell);
          } else {
             // Look left for merged cell parent
             let parent = '';
             for (let left = col - 1; left >= 0; left--) {
                if (rows[r][left]?.trim()) {
                   parent = rows[r][left].trim();
                   break;
                }
             }
             if (parent) {
                 headerParts.push(parent);
             }
          }
        }
        mergedHeaders.push([...new Set(headerParts)].join(' ').toLowerCase());
      }

      let machineIdx = mergedHeaders.findIndex(h => h.includes('machine') || h.includes('เครื่อง'));
      let productIdx = mergedHeaders.findIndex(h => h.includes('product') || h.includes('สินค้า') || h.includes('รายการ'));
      let moldIdx = mergedHeaders.findIndex(h => h.includes('mold') || h.includes('แม่พิมพ์'));
      let targetIdx = mergedHeaders.findIndex(h => h.includes('target') || h.includes('ยอดผลิต') || h.includes('เป้าหมาย') || (h.includes('production') && h.includes('แผน')));
      let jobOrderIdx = mergedHeaders.findIndex(h => h.includes('job') || h.includes('เลขที่'));
      let noteIdx = mergedHeaders.findIndex(h => h.includes('note') || h.includes('หมายเหตุ'));
      let actualIdx = mergedHeaders.findIndex(h => h.includes('actual') || h.includes('ยอดการผลิตได้') || h.includes('ยอดการผลิดได้') || h.includes('ยอดที่ได้') || h.includes('ผลิตได้'));
      let colorIdx = mergedHeaders.findIndex(h => h.includes('color') || h.includes('สี') && !h.includes('สินค้า'));
      let capacityIdx = mergedHeaders.findIndex(h => h.includes('capacity') || h.includes('cap') || h.includes('แคป') || h.includes('ชม'));
      
      let startDateIdx = mergedHeaders.findIndex(h => (h.includes('เริ่มผลิต') || h.includes('start')) && (h.includes('วันที่') || h.includes('date')));
      let startTimeIdx = mergedHeaders.findIndex(h => (h.includes('เริ่มผลิต') || h.includes('start')) && (h.includes('เวลา') || h.includes('time')));
      let endDateIdx = mergedHeaders.findIndex(h => (h.includes('กำหนดแล้วเสร็จ') || h.includes('end')) && (h.includes('วันที่') || h.includes('date')));
      let endTimeIdx = mergedHeaders.findIndex(h => (h.includes('กำหนดแล้วเสร็จ') || h.includes('end')) && (h.includes('เวลา') || h.includes('time')));

      if (startDateIdx === -1) {
          startDateIdx = mergedHeaders.findIndex(h => h.includes('เริ่มผลิต') || h.includes('start'));
          if (startTimeIdx === -1 && startDateIdx !== -1) startTimeIdx = startDateIdx + 1;
      }

      if (endDateIdx === -1) {
          endDateIdx = mergedHeaders.findIndex(h => h.includes('กำหนดแล้วเสร็จ') || h.includes('end'));
          if (endTimeIdx === -1 && endDateIdx !== -1) endTimeIdx = endDateIdx + 1;
      }

      // Fallback to standard format if headers are not found
      if (machineIdx === -1 && productIdx === -1 && firstDataRowIdx === 0) {
          machineIdx = 0;
          productIdx = 1;
          moldIdx = 2;
          capacityIdx = 3;
          targetIdx = 4;
          colorIdx = 5;
          startDateIdx = 6;
          startTimeIdx = 7;
          endDateIdx = 9;
          endTimeIdx = 10;
          jobOrderIdx = 12;
          noteIdx = 13;
          actualIdx = 15;
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

      rows.slice(firstDataRowIdx).forEach((row, i) => {
        let cols = row;
        if (cols.length === 1 && cols[0].includes(' ')) {
           const splitByMultipleSpaces = cols[0].split(/\s{2,}/);
           if (splitByMultipleSpaces.length > 2) {
               cols = splitByMultipleSpaces;
           } else {
               cols = cols[0].split(/\s+/);
           }
        }

        if (cols.length < 3) return; // Not enough data
        if (!cols[0]?.trim() && !cols[1]?.trim()) return; // Empty row

        let jobOrder = jobOrderIdx !== -1 ? cols[jobOrderIdx]?.trim() : `JOB-IMP-${i}`;
        let productItem = productIdx !== -1 ? cols[productIdx]?.trim() : 'Unknown Product';
        let machineId = machineIdx !== -1 ? cols[machineIdx]?.trim() : 'IP1';
        let moldCode = moldIdx !== -1 ? cols[moldIdx]?.trim() : 'Standard';
        let totalProduction = targetIdx !== -1 ? parseInt(cols[targetIdx]?.replace(/,/g, '')) || 0 : 0;
        let actualProduction = actualIdx !== -1 ? parseInt(cols[actualIdx]?.replace(/,/g, '')) || 0 : 0;
        let capacityPerShift = capacityIdx !== -1 ? parseInt(cols[capacityIdx]?.replace(/,/g, '')) || 0 : 0;
        let color = colorIdx !== -1 ? cols[colorIdx]?.trim() : '-';
        let note = noteIdx !== -1 ? cols[noteIdx]?.trim() : '';
        
        let startDate: string | undefined;
        let endDate: string | undefined;

        if (startDateIdx !== -1) {
            const startD = cols[startDateIdx]?.trim();
            const startT = startTimeIdx !== -1 ? cols[startTimeIdx]?.trim() : '';
            startDate = parseThaiDate(startD, startT) || undefined;
        }

        if (endDateIdx !== -1) {
            const endD = cols[endDateIdx]?.trim();
            const endT = endTimeIdx !== -1 ? cols[endTimeIdx]?.trim() : '';
            endDate = parseThaiDate(endD, endT) || undefined;
        }

        if (!jobOrder) jobOrder = `JOB-IMP-${i}`;

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
          status: actualProduction >= totalProduction && totalProduction > 0 ? 'Overproduced' : 'Planned',
          moldCode,
          note
        };

        if (jobMap.has(jobOrder)) {
          const existingJob = jobMap.get(jobOrder)!;
          existingJob.totalProduction = Math.max(existingJob.totalProduction || 0, newJob.totalProduction || 0);
          existingJob.actualProduction = Math.max(existingJob.actualProduction || 0, newJob.actualProduction || 0);
          if (newJob.capacityPerShift && !existingJob.capacityPerShift) existingJob.capacityPerShift = newJob.capacityPerShift;
          if (newJob.color && newJob.color !== '-') existingJob.color = newJob.color;
          if (newJob.note) existingJob.note = newJob.note;
          if (newJob.startDate) existingJob.startDate = newJob.startDate;
          if (newJob.endDate) existingJob.endDate = newJob.endDate;
          existingJob.status = (existingJob.actualProduction || 0) >= (existingJob.totalProduction || 0) ? 'Overproduced' : 'Planned';
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

  const processExcelData = (data: any[]) => {
    const jobMap = new Map<string, Partial<ProductionJob>>();

    data.forEach((row, i) => {
      const jobOrder = row['JobOrder'] || row['เลขที่ใบสั่งผลิต'] || row['เลขที่ใบสั่งผลิต '] || `JOB-EXC-${i}`;
      
      let startDate: string | undefined;
      let endDate: string | undefined;
      
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

      startDate = parseThaiDate(startDateStr, startTimeStr) || undefined;
      endDate = parseThaiDate(endDateStr, endTimeStr) || undefined;

      const totalProduction = parseInt(String(row['Target'] || row['เป้าหมาย'] || row['ยอดผลิต'] || row['ยอดการผลิต(แผน)'] || 1000).replace(/,/g, '')) || 1000;
      const actualProduction = parseInt(String(row['Actual'] || row['ยอดการผลิดได้'] || row['ยอดการผลิตได้'] || row['ยอดผลิตได้'] || 0).replace(/,/g, '')) || 0;
      const capacityPerShift = parseInt(String(row['Capacity'] || row['Cap ต่อกะ'] || row['แคป/กะ'] || 0).replace(/,/g, '')) || 0;
      const color = row['Color'] || row['สี'] || row['Color '] || '-';

      const newJob: Partial<ProductionJob> = {
        id: `EXC-${Date.now()}-${i}`,
        jobOrder,
        productItem: row['Product'] || row['สินค้า'] || row['รายการสินค้า'] || 'Unknown Product',
        machineId: row['Machine'] || row['เครื่องจักร'] || row['เครื่อง'] || 'IP1',
        capacityPerShift,
        totalProduction,
        actualProduction,
        color,
        startDate,
        endDate,
        status: actualProduction >= totalProduction && totalProduction > 0 ? 'Overproduced' : 'Planned',
        moldCode: row['Mold'] || row['แม่พิมพ์'] || row['รหัสแม่พิมพ์'] || 'Standard',
        note: row['Note'] || row['หมายเหตุ'] || ''
      };

      if (jobMap.has(jobOrder)) {
        const existingJob = jobMap.get(jobOrder)!;
        existingJob.totalProduction = Math.max(existingJob.totalProduction || 0, newJob.totalProduction || 0);
        existingJob.actualProduction = Math.max(existingJob.actualProduction || 0, newJob.actualProduction || 0);
        if (newJob.capacityPerShift && !existingJob.capacityPerShift) existingJob.capacityPerShift = newJob.capacityPerShift;
        if (newJob.color && newJob.color !== '-') existingJob.color = newJob.color;
        if (newJob.note) existingJob.note = newJob.note;
        if (newJob.startDate) existingJob.startDate = newJob.startDate;
        if (newJob.endDate) existingJob.endDate = newJob.endDate;
        existingJob.status = (existingJob.actualProduction || 0) >= (existingJob.totalProduction || 0) ? 'Overproduced' : 'Planned';
      } else {
        jobMap.set(jobOrder, newJob);
      }
    });

    const jobs = Array.from(jobMap.values());
    if (jobs.length === 0) throw new Error('ไม่พบข้อมูล (ตรวจเช็คคอลัมน์ข้อมูล)');
    setParsedJobs(jobs);
    setError(null);
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

        processExcelData(data);
      } catch (err: any) {
        setError('ไม่สามารถอ่านไฟล์ Excel ได้ กรุณาตรวจสอบรูปแบบไฟล์');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleFetchPublishedCSV = async () => {
    if (!publishedUrl) return;
    setIsFetchingUrl(true);
    setError(null);
    try {
      let fetchUrl = publishedUrl.trim();
      
      // Basic validation
      if (fetchUrl.includes('/html')) {
        throw new Error('กรุณาใช้ลิงก์แชร์ (Share link) หรือลิงก์ Publish to web');
      }

      // Automatically format link to /export?format=csv if it is a regular share link
      if (fetchUrl.includes('/edit')) {
        fetchUrl = fetchUrl.split('/edit')[0] + '/export?format=csv';
      } else if (fetchUrl.includes('docs.google.com/spreadsheets') && fetchUrl.includes('/pub') && !fetchUrl.includes('output=csv')) {
        fetchUrl += (fetchUrl.includes('?') ? '&' : '?') + 'output=csv';
      }

      const response = await fetch(fetchUrl);
      if (!response.ok) throw new Error(`ไม่สามารถดึงข้อมูลได้ (Status: ${response.status})`);
      
      const csvText = await response.text();
      
      const wb = XLSX.read(csvText, { type: 'string' });
      const wsname = wb.SheetNames[0];
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wsname]) as any[];

      processExcelData(data);
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลจากลิงก์');
    } finally {
      setIsFetchingUrl(false);
    }
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
            <div className="flex items-center gap-2"><FileSpreadsheet size={16}/> ลิงก์จาก Google Sheets</div>
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
                <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileSpreadsheet size={32} className="text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">เชื่อมต่อผ่านลิงก์ Google Sheets</h3>
                <p className="text-slate-600 text-sm mb-6 max-w-md mx-auto">
                  ตั้งค่าไฟล์ต้นทางให้เป็น "Anyone with the link can view" หรือใช้ลิงก์ Publish to web (CSV) มาวางที่นี่ได้เลย
                </p>
                <div className="space-y-3 max-w-lg mx-auto text-left bg-white p-4 rounded-lg border border-slate-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">ลิงก์ CSV จาก Google Sheets</label>
                    <input 
                      type="text" 
                      placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv" 
                      className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                      value={publishedUrl}
                      onChange={(e) => setPublishedUrl(e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={handleFetchPublishedCSV}
                    disabled={!publishedUrl || isFetchingUrl}
                    className={`w-full py-2 rounded-lg text-sm font-medium mt-2 transition-colors flex justify-center items-center gap-2
                      ${publishedUrl && !isFetchingUrl ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}
                  >
                    {isFetchingUrl ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-200 border-t-white"></div>
                        กำลังดึงข้อมูล...
                      </>
                    ) : (
                      'ดึงข้อมูล'
                    )}
                  </button>
                </div>
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
              <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden max-h-[50vh] overflow-y-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-slate-100 text-slate-600 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-4 py-2 font-medium">Job Order</th>
                      <th className="px-4 py-2 font-medium">Product</th>
                      <th className="px-4 py-2 font-medium">Machine</th>
                      <th className="px-4 py-2 font-medium text-right">Target</th>
                      <th className="px-4 py-2 font-medium text-right">Actual</th>
                      <th className="px-4 py-2 font-medium">Start Date</th>
                      <th className="px-4 py-2 font-medium">End Date</th>
                      <th className="px-4 py-2 font-medium">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {parsedJobs.map((job, idx) => (
                      <tr key={idx} className="bg-white hover:bg-slate-50">
                        <td className="px-4 py-2 font-mono text-xs">
                          <input type="text" value={job.jobOrder || ''} onChange={(e) => handleJobChange(idx, 'jobOrder', e.target.value)} className="w-full p-1 border border-slate-300 rounded text-xs" />
                        </td>
                        <td className="px-4 py-2">
                          <input type="text" value={job.productItem || ''} onChange={(e) => handleJobChange(idx, 'productItem', e.target.value)} className="w-full p-1 border border-slate-300 rounded text-xs" />
                        </td>
                        <td className="px-4 py-2">
                          <input type="text" value={job.machineId || ''} onChange={(e) => handleJobChange(idx, 'machineId', e.target.value)} className="w-full p-1 border border-slate-300 rounded text-xs" />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <input type="number" value={job.totalProduction || 0} onChange={(e) => handleJobChange(idx, 'totalProduction', parseInt(e.target.value) || 0)} className="w-20 p-1 border border-slate-300 rounded text-xs text-right" />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <input type="number" value={job.actualProduction || 0} onChange={(e) => handleJobChange(idx, 'actualProduction', parseInt(e.target.value) || 0)} className="w-20 p-1 border border-slate-300 rounded text-xs text-right" />
                        </td>
                        <td className="px-4 py-2 text-xs">
                          <input type="datetime-local" value={formatForDateTimeLocal(job.startDate)} onChange={(e) => handleJobChange(idx, 'startDate', e.target.value ? new Date(e.target.value).toISOString() : undefined)} className="p-1 border border-slate-300 rounded text-xs" />
                        </td>
                        <td className="px-4 py-2 text-xs">
                          <input type="datetime-local" value={formatForDateTimeLocal(job.endDate)} onChange={(e) => handleJobChange(idx, 'endDate', e.target.value ? new Date(e.target.value).toISOString() : undefined)} className="p-1 border border-slate-300 rounded text-xs" />
                        </td>
                        <td className="px-4 py-2 text-xs">
                          <input type="text" value={job.note || ''} onChange={(e) => handleJobChange(idx, 'note', e.target.value)} className="w-full p-1 border border-slate-300 rounded text-xs" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
