import React, { useRef, useState } from 'react';
import { ProductBOM, InventoryItem } from '../types';
import { X, Upload, FileDown, AlertTriangle, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExcelBomImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  onImport: (boms: Omit<ProductBOM, 'id'>[]) => void;
}

export const ExcelBomImportModal: React.FC<ExcelBomImportModalProps> = ({ isOpen, onClose, inventory, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [importedData, setImportedData] = useState<Omit<ProductBOM, 'id'>[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const downloadTemplate = () => {
    // Template data based on ProductBOM structure
    // We expect one row per material per product
    const wsData = [
      ['ProductCode', 'InventoryItemID', 'InventoryItemCode', 'QtyPerUnit', 'WastePercentage', 'UnitType'],
      ['PE307B', 'inv-1', 'LLDPE-8420A', 0.00756, 5, 'kg'],
      ['PE307B', 'inv-2', 'HDPE-1600J', 0.00189, 5, 'kg'],
      ['PE307B', 'inv-4', 'MB-CLR', 0.00018, 5, 'kg'],
      ['PE307B', 'inv-5', 'BOX-370', 0.001, 1, 'ใบ'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, // ProductCode
      { wch: 20 }, // InventoryItemID
      { wch: 25 }, // InventoryItemCode
      { wch: 15 }, // QtyPerUnit
      { wch: 15 }, // WastePercentage
      { wch: 15 }, // UnitType
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BOM Import Template");
    XLSX.writeFile(wb, "KPAC_BOM_Import_Template.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        processImportData(data);
      } catch (err) {
        setError('ไม่สามารถอ่านไฟล์ได้ กรุณาตรวจสอบว่าเป็นไฟล์ Excel (.xlsx) ที่ถูกต้อง');
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const processImportData = (data: any[]) => {
    try {
      const bomsMap = new Map<string, Omit<ProductBOM, 'id'>>();
      let hasError = false;

      data.forEach((row, index) => {
        const productCode = row['ProductCode'] || row['รหัสสินค้า'];
        const itemId = row['InventoryItemID'] || row['รหัสวัตถุดิบ (ระบบ)'];
        const itemCode = row['InventoryItemCode'] || row['รหัสวัตถุดิบ'];
        const qtyPerUnit = parseFloat(row['QtyPerUnit'] || row['ปริมาณต่อชิ้น'] || 0);
        const wastePct = parseFloat(row['WastePercentage'] || row['เผื่อเสีย (%)'] || 0);
        let unitType = row['UnitType'] || row['หน่วย'] || 'pcs';

        if (!productCode || (!itemId && !itemCode)) {
          console.warn(`Row ${index + 2} skipped due to missing required fields`);
          return;
        }

        // Try to match inventory item
        let matchedItem = inventory.find(i => i.id === itemId || i.code === itemCode);
        
        if (!matchedItem) {
          // Soft match logic? Optional
          setError(`ไม่พบวัตถุดิบ ${itemCode || itemId} ในฐานข้อมูล (แถว ${index + 2})`);
          hasError = true;
          return;
        }

        if (!unitType) unitType = matchedItem.unit;

        if (!bomsMap.has(productCode)) {
          bomsMap.set(productCode, {
            productItem: productCode,
            materials: [],
            version: 1,
            status: 'Active'
          });
        }

        const bom = bomsMap.get(productCode)!;
        bom.materials.push({
          inventoryItemId: matchedItem.id,
          qtyPerUnit,
          wastePercentage: wastePct,
          unitType: unitType
        });
      });

      if (!hasError && bomsMap.size > 0) {
        setImportedData(Array.from(bomsMap.values()));
      }
    } catch (err) {
      setError('รูปแบบข้อมูลไม่ถูกต้อง กรุณาตรวจสอบให้ตรงกับ Template');
    } finally {
      setIsProcessing(false);
    }
  };

  const handeSave = () => {
    if (importedData.length > 0) {
      onImport(importedData);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-kanit">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">นำเข้าข้อมูลสูตรการผลิต (BOM)</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Step 1: Download Template */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
              <span className="bg-brand-100 text-brand-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
              ดาวน์โหลด Template
            </h3>
            <p className="text-sm text-slate-600 mb-4 ml-8">เราแนะนำให้ใช้ไฟล์ Excel (.xlsx) จะง่ายและแม่นยำที่สุด</p>
            <button 
              onClick={downloadTemplate}
              className="ml-8 border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
            >
              <FileDown size={16} />
              ดาวน์โหลด BOM Import Template
            </button>
          </div>

          {/* Step 2: Upload */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
              <span className="bg-brand-100 text-brand-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
              อัปโหลดไฟล์ Excel
            </h3>
            
            <div 
              className="ml-8 border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-white hover:bg-slate-50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-12 h-12 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <Upload size={24} />
              </div>
              <p className="text-slate-600 font-medium mb-1">คลิกเพื่อเลือกไฟล์ Excel (.xlsx)</p>
              <p className="text-xs text-slate-400">ขนาดไฟล์ไม่เกิน 10MB</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".xlsx, .xls, .csv" 
                onChange={handleFileUpload}
              />
            </div>
            
            {error && (
              <div className="ml-8 mt-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            {importedData.length > 0 && !error && (
              <div className="ml-8 mt-4 p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm flex items-start gap-2">
                <CheckCircle size={16} className="mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold">เตรียมนำข้อมูลเข้าสำเร็จ!</div>
                  <div className="mt-1 opacity-90">ตรวจสอบพบสูตรการผลิตจำนวน {importedData.length} รายการ</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
          >
            ยกเลิก
          </button>
          <button 
            onClick={handeSave}
            disabled={importedData.length === 0 || !!error}
            className="px-6 py-2 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Upload size={18} />
            นำเข้าข้อมูลหลัก
          </button>
        </div>
      </div>
    </div>
  );
};
