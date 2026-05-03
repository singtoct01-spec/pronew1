import React, { useState } from 'react';
import { X, Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface InventoryImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: any[]) => Promise<void> | void;
}

export const InventoryImportModal: React.FC<InventoryImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'api'>('upload');
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);

  if (!isOpen) return null;

  const processExcelData = (rawData: any[][]) => {
    let importedItems: any[] = [];
    
    let isFGReport = false;
    // Scan first 10 rows for the FG report signature
    for (let i = 0; i < Math.min(10, rawData.length); i++) {
        const rowStr = (rawData[i] || []).join(' ');
        if (rowStr.includes('รายงานยอดสินค้า') || rowStr.includes('บริษัท เคแพค') || rowStr.includes('รายการรับ-เบิก สินค้าสำเร็จรูป')) {
           isFGReport = true;
           break;
        }
    }

    if (isFGReport) {
      // --- ROBUST FG REPORT PARSING LOGIC ---
      let isDataRow = false;
      let codeIdx = -1;
      let nameIdx = -1;
      let pcsIdx = -1;
      let customerIdx = -1;
      let totalStockIdx = -1;
      let minStockIdx = -1;
      let maxStockIdx = -1;
      let statusIdx = -1;

      for (let i = 0; i < rawData.length; i++) {
        const row: any = rawData[i];
        
        // Detect header row by scanning for keywords
        if (!isDataRow) {
           codeIdx = row.findIndex((cell: any) => String(cell).includes('รหัสสินค้า') || String(cell) === 'รหัส');
           nameIdx = row.findIndex((cell: any) => String(cell).includes('ชื่อรายการสินค้า') || String(cell).includes('ชื่อสินค้า') || String(cell) === 'รายการ');
           pcsIdx = row.findIndex((cell: any) => String(cell).trim() === 'PCS');
           customerIdx = row.findIndex((cell: any) => String(cell).includes('ชื่อลูกค้า'));
           
           // totalStockIdx for 'คิดเป็นชิ้น' under 'ยอดรวมทั้งสองคลัง'
           let bothWarehouseIdx = row.findIndex((cell: any) => String(cell).includes('ยอดรวมทั้งสองคลัง'));
           if (bothWarehouseIdx !== -1) {
               totalStockIdx = bothWarehouseIdx + 2; 
           } else {
               totalStockIdx = row.findIndex((cell: any) => String(cell).includes('ยอดรวม') || String(cell).includes('ยอดคงเหลือ'));
           }

           minStockIdx = row.findIndex((cell: any) => String(cell).includes('จุดต่ำสุด'));
           maxStockIdx = row.findIndex((cell: any) => String(cell).includes('จุดสูงสุด'));
           statusIdx = row.findIndex((cell: any) => String(cell).includes('สถานะ'));
           
           if (nameIdx !== -1) {
              isDataRow = true;
              if (codeIdx === -1 && nameIdx > 0) codeIdx = nameIdx - 1;
              if (totalStockIdx === -1 || totalStockIdx < nameIdx) {
                 totalStockIdx = row.findIndex((cell: any, idx: number) => idx > nameIdx && (String(cell).includes('ยอดรวม') || String(cell).includes('รวม')));
                 if (totalStockIdx === -1) totalStockIdx = nameIdx + 1; // Fallback
              }
           }
           continue;
        }

        if (isDataRow) {
          // Skip completely empty rows
          if (!row.some((cell: any) => String(cell).trim() !== '')) continue;
          
          let code = codeIdx !== -1 ? String(row[codeIdx] || '').trim() : '';
          let name = nameIdx !== -1 ? String(row[nameIdx] || '').trim() : '';

          if (!name) {
             const firstTextCellIdx = row.findIndex((c: any) => typeof c === 'string' && c.trim() !== '' && !c.match(/^[0-9,.-]+$/));
             if (firstTextCellIdx !== -1) {
                name = String(row[firstTextCellIdx]).trim();
             }
          }
          
          if (!name || name === '-' || name === '0' || name === 'รวม') continue;
          if (!code) code = name;

          let currentStockStr = totalStockIdx !== -1 ? String(row[totalStockIdx] || '').trim() : '0';
          let currentStock = Number(currentStockStr.replace(/,/g, ''));
          
          if (isNaN(currentStock) || currentStock === 0) {
             for (let j = nameIdx + 1; j < row.length; j++) {
                 const cellText = String(row[j] || '').trim();
                 if (cellText && cellText !== '-') {
                     const numTokens = cellText.replace(/,/g, '');
                     if (!isNaN(Number(numTokens)) && Number(numTokens) !== 0) {
                         currentStock = Number(numTokens);
                         break;
                     }
                 }
             }
          }

          if (isNaN(currentStock)) currentStock = 0;

          let category = 'FG'; 
          if (name.includes('Preform') || name.includes('พรีฟอร์ม')) category = 'Preform';
          if (name.includes('ฝา')) category = 'Other'; 
            
          let minStockStr = minStockIdx !== -1 ? String(row[minStockIdx] || '0').replace(/,/g, '') : '0';
          let minStock = Number(minStockStr);
          let maxStockStr = maxStockIdx !== -1 ? String(row[maxStockIdx] || '0').replace(/,/g, '') : '0';
          let maxStock = Number(maxStockStr);
          let statusText = statusIdx !== -1 ? String(row[statusIdx] || '').trim() : '';
          let pcsNum = pcsIdx !== -1 ? String(row[pcsIdx] || '').trim() : '';
          let customerStr = customerIdx !== -1 ? String(row[customerIdx] || '').trim() : '';

          let remarksParts = [];
          if (pcsNum && pcsNum !== '-') remarksParts.push(`บรรจุ: ${pcsNum} PCS`);
          if (customerStr && customerStr !== '-') remarksParts.push(`ลูกค้า: ${customerStr}`);
          if (statusText && statusText !== '-') remarksParts.push(`สถานะ: ${statusText}`);
          
          let safeCode = String(code || `ITEM-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`);
          let safeId = safeCode.replace(/\//g, '-').replace(/\\/g, '-');

          importedItems.push({
             id: safeId, 
             code: safeCode,
             name: name,
             category: category as any,
             unit: name.includes('กล่อง') ? 'box' : (name.includes('แพ็ค') ? 'pack' : 'pcs'), 
             currentStock: currentStock,
             minStock: isNaN(minStock) ? 0 : minStock, 
             maxStock: isNaN(maxStock) ? 0 : maxStock, 
             location: 'คลังสินค้า', 
             lastUpdated: new Date().toISOString(),
             group: '',
             remarks: remarksParts.join(', '),
             usage: ''
          });
        }
      }
    } else {
      // --- STANDARD TEMPLATE PARSING LOGIC ---
      const headers = rawData[0] || [];
      const objectData = rawData.slice(1).map(rowArray => {
          let rowObj: any = {};
          headers.forEach((header: string, index: number) => {
             rowObj[header] = rowArray[index];
          });
          return rowObj;
      });

      objectData.forEach((row: any) => {
        const code = row['รหัสสินค้า'] || row['code'] || '';
        const name = row['ชื่อสินค้า'] || row['name'] || '';
        if (!code && !name) return; // Skip empty rows

        let safeCode = String(code || `ITEM-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`);
        let safeId = safeCode.replace(/\//g, '-').replace(/\\/g, '-');

        importedItems.push({
          id: safeId,
          code: safeCode,
          name: name,
          category: (row['หมวดหมู่'] || row['category'] || 'Other') as any,
          unit: row['หน่วย'] || row['unit'] || 'pcs',
          currentStock: Number(String(row['ยอดคงเหลือ'] || row['currentStock'] || 0).replace(/,/g, '')),
          minStock: Number(String(row['Min Stock'] || row['minStock'] || 0).replace(/,/g, '')),
          maxStock: Number(String(row['Max Stock'] || row['maxStock'] || 0).replace(/,/g, '')),
          location: row['สถานที่เก็บ'] || row['location'] || '',
          lastUpdated: new Date().toISOString(),
          group: row['กลุ่ม'] || row['group'] || '',
          remarks: row['หมายเหตุ'] || row['remarks'] || '',
          usage: row['การใช้งาน'] || row['usage'] || ''
        });
      });
    }

    if (importedItems.length === 0) throw new Error('ไม่พบข้อมูล (ตรวจเช็คคอลัมน์ข้อมูล)');
    return importedItems;
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
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wsname], { header: 1 }) as any[][];

      const importedItems = processExcelData(data);
      executeImport(importedItems);
      
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลจากลิงก์');
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const executeImport = async (items: any[]) => {
    setIsImporting(true);
    try {
      await onImport(items);
      onClose();
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        // Read as array of arrays to detect format
        const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        
        const importedItems = processExcelData(rawData);
        
        executeImport(importedItems);
      } catch (err: any) {
        setError(err.message || 'ไม่สามารถอ่านไฟล์ Excel ได้ กรุณาตรวจสอบรูปแบบไฟล์');
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <Upload size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-800">นำเข้าข้อมูลสินค้าคงคลัง (FG)</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl flex items-start gap-3 border border-red-100">
              <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
              <div className="text-sm">{error}</div>
            </div>
          )}

          <div className="flex space-x-6 border-b border-slate-200 mb-6">
            <button 
              onClick={() => setActiveTab('upload')}
              className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'upload' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              <div className="flex items-center gap-2"><Upload size={16}/> อัปโหลดไฟล์ Excel</div>
            </button>
            <button 
              onClick={() => setActiveTab('api')}
              className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'api' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              <div className="flex items-center gap-2"><FileSpreadsheet size={16}/> ลิงก์จาก Google Sheets</div>
            </button>
          </div>

          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div 
                className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                onClick={() => document.getElementById('inventory-upload-input')?.click()}
              >
                <Upload size={32} className="mx-auto text-slate-400 mb-3" />
                <p className="text-slate-700 font-medium mb-1">คลิกที่นี่เพื่อเลือกไฟล์ Excel (.xlsx, .csv)</p>
                <p className="text-xs text-slate-500">
                  รองรับไฟล์รูปแบบ Template มาตรฐาน และระบบรายงาน FG แบบเก่า
                </p>
                <input 
                  id="inventory-upload-input"
                  type="file" 
                  accept=".xlsx, .csv" 
                  className="hidden" 
                  onChange={handleFileUpload}
                />
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
                  ตั้งค่าไฟล์ต้นทางให้เป็น "Anyone with the link can view" จากนั้นคัดลอกลิงก์แชร์มาวางด้านล่างได้เลย
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
                    disabled={!publishedUrl || isFetchingUrl || isImporting}
                    className={`w-full py-2 rounded-lg text-sm font-medium mt-2 transition-colors flex justify-center items-center gap-2
                      ${publishedUrl && !isFetchingUrl && !isImporting ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}
                  >
                    {isFetchingUrl || isImporting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-200 border-t-white"></div>
                        กำลังประมวลผล...
                      </>
                    ) : (
                      'ดึงข้อมูล'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
