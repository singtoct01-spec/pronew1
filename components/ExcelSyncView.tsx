import React, { useState } from 'react';
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { db } from '../firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { ProductionJob, InventoryItem, ProductBOM, ProductSpec, MachineMoldCapability } from '../types';

interface ExcelSyncViewProps {
  jobs: ProductionJob[];
  inventory: InventoryItem[];
  boms: ProductBOM[];
  productSpecs: ProductSpec[];
  machineCapabilities: MachineMoldCapability[];
}

export const ExcelSyncView: React.FC<ExcelSyncViewProps> = ({ jobs, inventory, boms, productSpecs, machineCapabilities }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);

  const handleExport = () => {
    setIsExporting(true);
    try {
      const wb = XLSX.utils.book_new();

      // 1. Jobs
      const wsJobs = XLSX.utils.json_to_sheet(jobs);
      XLSX.utils.book_append_sheet(wb, wsJobs, "Jobs");

      // 2. Inventory
      const wsInventory = XLSX.utils.json_to_sheet(inventory);
      XLSX.utils.book_append_sheet(wb, wsInventory, "Inventory");

      // 3. BOMs (flatten materials for simple export, or just stringify)
      const bomsExport = boms.map(b => ({
        ...b,
        materials: JSON.stringify(b.materials)
      }));
      const wsBoms = XLSX.utils.json_to_sheet(bomsExport);
      XLSX.utils.book_append_sheet(wb, wsBoms, "BOMs");

      // 4. Product Specs
      const specsExport = productSpecs.map(p => ({
        ...p,
        packagingDetail: JSON.stringify(p.packagingDetail)
      }));
      const wsSpecs = XLSX.utils.json_to_sheet(specsExport);
      XLSX.utils.book_append_sheet(wb, wsSpecs, "ProductSpecs");

      // 5. Machine Capabilities
      const wsMachines = XLSX.utils.json_to_sheet(machineCapabilities);
      XLSX.utils.book_append_sheet(wb, wsMachines, "MachineCapabilities");

      XLSX.writeFile(wb, `ProPlanner_DataExport_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error("Export error:", error);
      alert("เกิดข้อผิดพลาดในการส่งออกข้อมูล");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus({ type: 'info', message: 'กำลังอ่านไฟล์ Excel...' });

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      
      const batch = writeBatch(db);
      let updateCount = 0;

      // Import Jobs
      if (wb.SheetNames.includes("Jobs")) {
        const wsJobs = wb.Sheets["Jobs"];
        const importedJobs = XLSX.utils.sheet_to_json<any>(wsJobs);
        importedJobs.forEach(job => {
          if (job.id) {
            const docRef = doc(db, 'jobs', String(job.id));
            batch.set(docRef, job, { merge: true });
            updateCount++;
          }
        });
      }

      // Import Inventory
      if (wb.SheetNames.includes("Inventory")) {
        const wsInventory = wb.Sheets["Inventory"];
        const importedInventory = XLSX.utils.sheet_to_json<any>(wsInventory);
        importedInventory.forEach(item => {
          if (item.id) {
            const docRef = doc(db, 'inventory', String(item.id));
            batch.set(docRef, item, { merge: true });
            updateCount++;
          }
        });
      }

      // Import BOMs
      if (wb.SheetNames.includes("BOMs")) {
        const wsBoms = wb.Sheets["BOMs"];
        const importedBoms = XLSX.utils.sheet_to_json<any>(wsBoms);
        importedBoms.forEach(bom => {
          if (bom.id) {
            try {
              if (typeof bom.materials === 'string') {
                bom.materials = JSON.parse(bom.materials);
              }
            } catch (e) {
              console.warn("Could not parse materials for BOM", bom.id);
            }
            const docRef = doc(db, 'boms', String(bom.id));
            batch.set(docRef, bom, { merge: true });
            updateCount++;
          }
        });
      }

      // Import Product Specs
      if (wb.SheetNames.includes("ProductSpecs")) {
        const wsSpecs = wb.Sheets["ProductSpecs"];
        const importedSpecs = XLSX.utils.sheet_to_json<any>(wsSpecs);
        importedSpecs.forEach(spec => {
          if (spec.code) {
            try {
              if (typeof spec.packagingDetail === 'string') {
                spec.packagingDetail = JSON.parse(spec.packagingDetail);
              }
            } catch (e) {
              console.warn("Could not parse packagingDetail for Spec", spec.code);
            }
            // Assuming code is used as ID or we need to query. If no ID, we might need to handle differently.
            // For simplicity, we use code as document ID if it exists, or just add.
            const docRef = doc(db, 'productSpecs', String(spec.code));
            batch.set(docRef, spec, { merge: true });
            updateCount++;
          }
        });
      }

      // Import Machine Capabilities
      if (wb.SheetNames.includes("MachineCapabilities")) {
        const wsMachines = wb.Sheets["MachineCapabilities"];
        const importedMachines = XLSX.utils.sheet_to_json<any>(wsMachines);
        importedMachines.forEach(machine => {
          if (machine.machineGroup && machine.moldName) {
            const docId = `${machine.machineGroup}_${machine.moldName}`.replace(/\//g, '-');
            const docRef = doc(db, 'machineCapabilities', docId);
            batch.set(docRef, machine, { merge: true });
            updateCount++;
          }
        });
      }

      if (updateCount > 0) {
        setImportStatus({ type: 'info', message: `กำลังบันทึกข้อมูล ${updateCount} รายการลงฐานข้อมูล...` });
        await batch.commit();
        setImportStatus({ type: 'success', message: `นำเข้าข้อมูลสำเร็จ ${updateCount} รายการ` });
      } else {
        setImportStatus({ type: 'warning' as any, message: 'ไม่พบข้อมูลที่สามารถนำเข้าได้ (ตรวจสอบว่ามีคอลัมน์ id หรือ code)' });
      }

    } catch (error) {
      console.error("Import error:", error);
      setImportStatus({ type: 'error', message: `เกิดข้อผิดพลาด: ${(error as Error).message}` });
    } finally {
      setIsImporting(false);
      // Reset file input
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div className="space-y-6 font-kanit">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
          <FileSpreadsheet size={24} className="text-brand-600" />
          <div>
            <h2 className="text-lg font-bold text-slate-800">นำเข้า/ส่งออกข้อมูล (Excel Sync)</h2>
            <p className="text-sm text-slate-500">รวบรวมข้อมูลทั้งหมดในระบบให้อยู่ในไฟล์ Excel เดียว</p>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Export Section */}
          <div className="border border-slate-200 rounded-xl p-6 flex flex-col items-center text-center space-y-4 hover:border-brand-300 transition-colors bg-slate-50/50">
            <div className="w-16 h-16 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center mb-2">
              <Download size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">ส่งออกข้อมูล (Export)</h3>
            <p className="text-sm text-slate-600 mb-4">
              ดาวน์โหลดข้อมูลทั้งหมด (แผนการผลิต, คลังสินค้า, สูตรการผลิต, ฯลฯ) เป็นไฟล์ Excel (.xlsx) โดยแยกเป็น Sheet
            </p>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="mt-auto bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  กำลังส่งออก...
                </>
              ) : (
                <>
                  <Download size={20} />
                  ดาวน์โหลดไฟล์ Excel
                </>
              )}
            </button>
          </div>

          {/* Import Section */}
          <div className="border border-slate-200 rounded-xl p-6 flex flex-col items-center text-center space-y-4 hover:border-emerald-300 transition-colors bg-slate-50/50">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
              <Upload size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">นำเข้าข้อมูล (Import)</h3>
            <p className="text-sm text-slate-600 mb-4">
              อัปโหลดไฟล์ Excel ที่ได้จากการส่งออก เพื่ออัปเดตข้อมูลกลับเข้าสู่ระบบ (ระบบจะอัปเดตตาม ID ของแต่ละรายการ)
            </p>
            
            <div className="mt-auto w-full">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleImport}
                disabled={isImporting}
                className="hidden"
                id="excel-upload"
              />
              <label
                htmlFor="excel-upload"
                className={`bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2 cursor-pointer w-full justify-center ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isImporting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    กำลังนำเข้า...
                  </>
                ) : (
                  <>
                    <Upload size={20} />
                    อัปโหลดไฟล์ Excel
                  </>
                )}
              </label>
            </div>
          </div>
        </div>

        {importStatus && (
          <div className={`m-6 p-4 rounded-lg flex items-start gap-3 ${
            importStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
            importStatus.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            {importStatus.type === 'success' ? <CheckCircle2 className="mt-0.5 flex-shrink-0" size={20} /> : <AlertCircle className="mt-0.5 flex-shrink-0" size={20} />}
            <div>
              <h4 className="font-bold">{importStatus.type === 'success' ? 'สำเร็จ' : importStatus.type === 'error' ? 'ข้อผิดพลาด' : 'สถานะ'}</h4>
              <p className="text-sm mt-1">{importStatus.message}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
