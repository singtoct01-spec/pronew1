import React, { useState, useEffect } from 'react';
import { ProductionJob, Status, RawMaterial, ProductBOM, InventoryItem, ProductSpec } from '../types';
import { X, Save, AlertCircle, Calendar, Plus, Trash2, Wand2, Ruler, Flame, GitCommit, PauseCircle, CheckCircle2, Upload } from 'lucide-react';
import { SearchableSelect } from './SearchableSelect';

interface EditJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: ProductionJob | null;
  jobs?: ProductionJob[];
  inventory: InventoryItem[];
  boms: ProductBOM[];
  productSpecs: ProductSpec[];
  onSave: (updatedJob: ProductionJob) => void;
  onOpenImportModal?: () => void;
}

export const EditJobModal: React.FC<EditJobModalProps> = ({ isOpen, onClose, job, jobs = [], inventory, boms, productSpecs, onSave, onOpenImportModal }) => {
  const [formData, setFormData] = useState<Partial<ProductionJob>>({
    status: 'Running',
    productItem: '',
    productType: 'แก้วน้ำพลาสติก',
    color: '-',
    totalProduction: 0,
    capacityPerShift: 0,
    actualProduction: 0,
    priority: 'Normal',
    jobType: 'Planned',
    materials: []
  });

  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [isStartDateFocused, setIsStartDateFocused] = useState(false);
  const [isEndDateFocused, setIsEndDateFocused] = useState(false);

  const formatThaiDateTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes} น.`;
  };

  const toInputString = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const offset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - offset);
    return localDate.toISOString().slice(0, 16);
  };

  useEffect(() => {
    if (job) {
      setFormData({ 
        ...job,
        priority: job.priority || 'Normal',
        jobType: job.jobType || 'Planned'
      });
    } else {
      setFormData({
        status: 'No Plan',
        productItem: '',
        productType: 'แก้วน้ำพลาสติก',
        color: '-',
        priority: 'Normal',
        jobType: 'Planned',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000).toISOString(),
        materials: []
      });
    }
  }, [job, isOpen]);

  const addMaterial = () => {
    const newMaterial: RawMaterial = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      qtyPcs: 0,
      qtyKg: 0,
      unit: 'ชิ้น',
      lotNo: '',
      remarks: ''
    };
    setFormData(prev => ({ ...prev, materials: [...(prev.materials || []), newMaterial] }));
  };

  const updateMaterial = (id: string, field: keyof RawMaterial, value: any) => {
    setFormData(prev => {
      const materials = prev.materials || [];
      const updatedIndex = materials.findIndex(m => m.id === id);
      if (updatedIndex === -1) return prev;
      
      const newMaterials = [...materials];
      const m = newMaterials[updatedIndex];
      const newValue = value as number;
      
      newMaterials[updatedIndex] = { ...m, [field]: value };
      
      let newTarget = prev.totalProduction;
      
      // If we updated quantity and it has a bom definition, we can reverse calculate the target
      if ((field === 'qtyKg' || field === 'qtyPcs') && m.bomQtyPerUnit && newValue >= 0) {
         const wasteMultiplier = m.wastePercentage ? (1 + (m.wastePercentage / 100)) : 1;
         const baseQty = newValue / wasteMultiplier;
         if (field === 'qtyPcs' || field === 'qtyKg') { // Prevent division by zero if bomQtyPerUnit is 0
           newTarget = m.bomQtyPerUnit > 0 ? Math.round(baseQty / m.bomQtyPerUnit) : prev.totalProduction;
         }
         
         // Sync other materials based on the new target
         if (newTarget !== prev.totalProduction) {
           newMaterials.forEach((otherMat, idx) => {
              if (idx !== updatedIndex && otherMat.bomQtyPerUnit) {
                 const otherBaseQty = otherMat.bomQtyPerUnit * (newTarget || 0);
                 const otherWasteMultiplier = otherMat.wastePercentage ? (1 + (otherMat.wastePercentage / 100)) : 1;
                 const otherTotal = otherBaseQty * otherWasteMultiplier;
                 if (otherMat.unit === 'ชิ้น') {
                    newMaterials[idx] = { ...otherMat, qtyPcs: Math.ceil(otherTotal) };
                 } else if (otherMat.unit === 'กก.') {
                    newMaterials[idx] = { ...otherMat, qtyKg: parseFloat(otherTotal.toFixed(2)) };
                 }
              }
           });
         }
      }

      // If we updated wastePercentage, just recalculate this specific material based on current target
      if (field === 'wastePercentage' && m.bomQtyPerUnit !== undefined) {
         const baseQty = m.bomQtyPerUnit * (prev.totalProduction || 0);
         const wasteMultiplier = newValue ? (1 + (newValue / 100)) : 1;
         const totalQtyWithWaste = baseQty * wasteMultiplier;
         newMaterials[updatedIndex] = {
             ...newMaterials[updatedIndex],
             qtyPcs: m.unit === 'ชิ้น' ? Math.ceil(totalQtyWithWaste) : newMaterials[updatedIndex].qtyPcs,
             qtyKg: m.unit === 'กก.' ? parseFloat(totalQtyWithWaste.toFixed(2)) : newMaterials[updatedIndex].qtyKg,
         };
      }

      return {
        ...prev,
        totalProduction: newTarget,
        materials: newMaterials
      };
    });
  };

  const updateTargetProduction = (target: number) => {
    setFormData(prev => {
      const newForm = { ...prev, totalProduction: target };
      if (prev.materials && prev.materials.length > 0) {
        newForm.materials = prev.materials.map(m => {
          if (m.bomQtyPerUnit !== undefined) {
            const baseQty = m.bomQtyPerUnit * target;
            const wasteMultiplier = m.wastePercentage ? (1 + (m.wastePercentage / 100)) : 1;
            const totalQtyWithWaste = baseQty * wasteMultiplier;
            return {
              ...m,
              qtyPcs: m.unit === 'ชิ้น' ? Math.ceil(totalQtyWithWaste) : m.qtyPcs,
              qtyKg: m.unit === 'กก.' ? parseFloat(totalQtyWithWaste.toFixed(2)) : m.qtyKg,
            };
          }
          return m;
        });
      }
      return newForm;
    });
  };

  const removeMaterial = (id: string) => {
    setFormData(prev => ({
      ...prev,
      materials: (prev.materials || []).filter(m => m.id !== id)
    }));
  };

  const autoFillMaterialsFromBOM = (productOverride?: string, colorOverride?: string, targetOverride?: number) => {
    const product = productOverride !== undefined ? productOverride : (formData.productItem || '');
    const color = colorOverride !== undefined ? colorOverride : (formData.color && formData.color !== '-' ? formData.color : '');
    const target = targetOverride !== undefined ? targetOverride : (formData.totalProduction || 0);
    
    const searchTerms = [
        String(`${product} (${color})`).trim().toLowerCase(),
        String(`${product} ${color}`).trim().toLowerCase(),
        String(product || '').toLowerCase()
    ];

    let bom: ProductBOM | undefined;
    for (const term of searchTerms) {
        bom = boms.find(b => String(b.productItem || '').toLowerCase() === term); 
        if (bom) break;
    }
    
    if (!bom) {
         bom = boms.find(b => String(b.productItem || '').toLowerCase().includes(String(product || '').toLowerCase()));
    }

    if (!bom) {
      if (!productOverride) alert(`ไม่พบสูตรการผลิต (BOM) สำหรับสินค้า "${product}" ${color ? `สี ${color}` : ''}`);
      return;
    }

    const newMaterials: RawMaterial[] = bom.materials.map(mat => {
      const inventoryItem = inventory.find(i => i.id === mat.inventoryItemId);
      const baseQty = mat.qtyPerUnit * target;
      const wasteMultiplier = mat.wastePercentage ? (1 + (mat.wastePercentage / 100)) : 1;
      const totalQtyWithWaste = baseQty * wasteMultiplier;

      return {
        id: Math.random().toString(36).substr(2, 9),
        inventoryItemId: mat.inventoryItemId,
        name: inventoryItem ? `${inventoryItem.code} (${inventoryItem.name})` : 'Unknown Material',
        qtyPcs: mat.unitType === 'pcs' ? Math.ceil(totalQtyWithWaste) : 0,
        qtyKg: mat.unitType === 'kg' ? parseFloat(totalQtyWithWaste.toFixed(2)) : 0,
        wastePercentage: mat.wastePercentage,
        bomQtyPerUnit: mat.qtyPerUnit,
        unit: mat.unitType === 'pcs' ? 'ชิ้น' : 'กก.',
        lotNo: '',
        remarks: 'Auto-filled from BOM'
      };
    });

    setFormData(prev => ({ ...prev, materials: newMaterials }));
  };

  const autoFillSpecsFromMaster = () => {
    if (!formData.productItem) {
        alert('กรุณาระบุชื่อสินค้าก่อนดึงสเปค');
        return;
    }

    const sortedSpecs = [...productSpecs].sort((a, b) => b.code.length - a.code.length);
    const matchedSpec = sortedSpecs.find(spec => 
        String(formData.productItem || '').toLowerCase().includes(String(spec.code || '').toLowerCase())
    );

    if (matchedSpec) {
        let weight = 0;
        if (matchedSpec.weight) {
            if (matchedSpec.weight.includes('-')) {
                const parts = matchedSpec.weight.split('-').map(s => parseFloat(s));
                weight = (parts[0] + parts[1]) / 2;
            } else {
                weight = parseFloat(matchedSpec.weight);
            }
        }

        setFormData(prev => ({
            ...prev,
            weightG: weight || prev.weightG,
            heightMm: matchedSpec.height || prev.heightMm,
            widthMm: matchedSpec.width || prev.widthMm, 
            productType: `${matchedSpec.type} (${matchedSpec.material})` || prev.productType
        }));
    } else {
        alert('ไม่พบข้อมูลสเปคสำหรับสินค้านี้ในฐานข้อมูล');
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as ProductionJob);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col font-kanit">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h3 className="font-bold text-xl text-slate-800">{job ? 'แก้ไขรายการผลิต' : 'เพิ่มรายการผลิตใหม่'}</h3>
            {!job && onOpenImportModal && (
              <button 
                type="button"
                onClick={() => { onClose(); onOpenImportModal(); }} 
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors"
              >
                <Upload size={14} /> นำเข้าจาก Excel
              </button>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full p-2 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-8">
          {/* Datalists for Autocomplete */}
          <datalist id="machine-list">
            {Array.from(new Set(jobs.map(j => j.machineId).filter(Boolean))).map(m => <option key={m} value={m} />)}
          </datalist>
          <datalist id="product-type-list">
            {Array.from(new Set(jobs.map(j => j.productType).filter(Boolean))).map(pt => <option key={pt} value={pt} />)}
          </datalist>
          <datalist id="color-list">
            {Array.from(new Set(jobs.map(j => j.color).filter(Boolean))).map(c => <option key={c} value={c} />)}
          </datalist>
          <datalist id="mold-list">
            {Array.from(new Set(jobs.map(j => j.moldCode).filter(Boolean))).map(m => <option key={m} value={m} />)}
          </datalist>

          {/* Section 1: Basic Job Info */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-brand-600 uppercase tracking-widest border-l-4 border-brand-500 pl-2">ข้อมูลทั่วไป & สถานะงาน</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">รหัสเครื่องจักร</label>
                <input 
                  type="text" value={formData.machineId || ''} 
                  onChange={e => setFormData({ ...formData, machineId: e.target.value })}
                  list="machine-list"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm" placeholder="เช่น IP1, B3" required 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">เลขที่ใบสั่งผลิต (Job Order)</label>
                <input 
                  type="text" value={formData.jobOrder || ''} 
                  onChange={e => setFormData({ ...formData, jobOrder: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm" placeholder="เช่น B6902-xxx" required 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">สถานะปัจจุบัน</label>
                <SearchableSelect 
                  value={formData.status || ''} 
                  onChange={value => setFormData({ ...formData, status: value as Status })}
                  options={[
                    { value: 'Running', label: '🟢 กำลังผลิต (Running)' },
                    { value: 'Paused', label: '⏸️ หยุดชั่วคราว (Paused)' },
                    { value: 'Stopped', label: '⛔ หยุด (Stopped)' },
                    { value: 'Delayed', label: '⚠️ ตกแผน/ล่าช้า (Delayed)' },
                    { value: 'Rescheduled', label: '📅 เลื่อนแผน (Rescheduled)' },
                    { value: 'Maintenance', label: '🔧 ซ่อมบำรุง' },
                    { value: 'Completed', label: '✅ เสร็จสิ้น' },
                    { value: 'No Plan', label: '⏳ รอดำเนินการ' }
                  ]}
                  className={`w-full font-bold ${
                    formData.status === 'Running' ? 'text-emerald-700' :
                    formData.status === 'Delayed' ? 'text-red-700' :
                    formData.status === 'Paused' ? 'text-amber-700' :
                    formData.status === 'Rescheduled' ? 'text-purple-700' : ''
                  }`}
                />
              </div>
            </div>

            {/* Special Flags Row */}
            <div className="flex gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
               <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 mb-1">ระดับความสำคัญ (Priority)</label>
                  <div className="flex gap-2">
                    <button type="button" 
                        onClick={() => setFormData({...formData, priority: 'Normal'})}
                        className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold border transition-colors ${formData.priority === 'Normal' ? 'bg-white border-slate-400 text-slate-700 shadow-sm' : 'border-transparent text-slate-400 hover:bg-slate-200'}`}>
                        ปกติ
                    </button>
                    <button type="button" 
                        onClick={() => setFormData({...formData, priority: 'Urgent'})}
                        className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold border transition-colors flex items-center justify-center gap-1 ${formData.priority === 'Urgent' ? 'bg-red-50 border-red-400 text-red-600 shadow-sm' : 'border-transparent text-slate-400 hover:bg-slate-200'}`}>
                        <Flame size={12} /> งานด่วน
                    </button>
                  </div>
               </div>
               <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 mb-1">ประเภทงาน (Job Type)</label>
                  <SearchableSelect 
                    value={formData.jobType || ''}
                    onChange={(value) => setFormData({...formData, jobType: value as any})}
                    options={[
                      { value: 'Planned', label: 'ตามแผนปกติ (Planned)' },
                      { value: 'Inserted', label: '⚡ งานแทรก (Inserted)' },
                      { value: 'Rework', label: '🛠️ งานแก้ (Rework)' }
                    ]}
                    className="w-full"
                  />
               </div>
            </div>
          </div>

          {/* Section 2: Product Specifications */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-brand-600 uppercase tracking-widest border-l-4 border-brand-500 pl-2">ข้อมูลผลิตภัณฑ์</h4>
                <button 
                  id="btn-auto-spec"
                  type="button" 
                  onClick={autoFillSpecsFromMaster}
                  className="text-xs flex items-center gap-1 text-slate-600 hover:text-brand-600 font-bold bg-slate-100 hover:bg-brand-50 px-3 py-1.5 rounded-lg transition-colors border border-slate-200"
                >
                  <Ruler size={14} /> ดึงสเปค (Auto Spec)
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2 relative">
                <label className="block text-xs font-bold text-slate-500 mb-1">ชื่อสินค้า (Product Item)</label>
                <input 
                  type="text" 
                  value={showProductDropdown ? productSearch : (formData.productItem || '')} 
                  onChange={e => {
                    setProductSearch(e.target.value);
                    setFormData({ ...formData, productItem: e.target.value });
                    setShowProductDropdown(true);
                  }} 
                  onFocus={() => {
                    setProductSearch(formData.productItem || '');
                    setShowProductDropdown(true);
                  }}
                  onBlur={() => setTimeout(() => setShowProductDropdown(false), 200)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" 
                  required 
                  placeholder="เช่น QE307-2, B01" 
                />
                {showProductDropdown && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {boms.filter(b => String(b.productItem || '').toLowerCase().includes(String(productSearch || '').toLowerCase())).length > 0 ? (
                      boms.filter(b => String(b.productItem || '').toLowerCase().includes(String(productSearch || '').toLowerCase())).map((bom, idx) => (
                        <div 
                          key={idx}
                          className="px-3 py-2 hover:bg-brand-50 cursor-pointer text-sm border-b border-slate-100 last:border-0"
                          onClick={() => {
                            // Extract color if present in format "Product (Color)"
                            let product = bom.productItem;
                            let color = formData.color || '-';
                            const colorMatch = product.match(/\(([^)]+)\)$/);
                            if (colorMatch) {
                              color = colorMatch[1];
                              product = product.replace(/\s*\([^)]+\)$/, '');
                            }
                            
                            setFormData(prev => ({ 
                              ...prev, 
                              productItem: product,
                              color: color
                            }));
                            setProductSearch(product);
                            setShowProductDropdown(false);
                            
                            // We can't auto-fill BOM materials here because totalProduction might be 0
                            // But we can try to auto-fill specs
                            setTimeout(() => {
                              const btn = document.getElementById('btn-auto-spec');
                              if (btn) btn.click();
                              autoFillMaterialsFromBOM(product, color, formData.totalProduction);
                            }, 100);
                          }}
                        >
                          <div className="font-bold text-slate-800">{bom.productItem}</div>
                          <div className="text-xs text-slate-500">
                            วัตถุดิบ: {bom.materials.length} รายการ
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-slate-500 text-center">ไม่พบรายการสินค้าในระบบ BOM</div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">ประเภทสินค้า</label>
                <input type="text" value={formData.productType || ''} onChange={e => setFormData({ ...formData, productType: e.target.value })} list="product-type-list" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="เช่น แก้วพลาสติก" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">สี (Color)</label>
                <input type="text" value={formData.color || ''} onChange={e => setFormData({ ...formData, color: e.target.value })} list="color-list" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">รหัสแม่พิมพ์ (Mold)</label>
                <input type="text" value={formData.moldCode || ''} onChange={e => setFormData({ ...formData, moldCode: e.target.value })} list="mold-list" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">น้ำหนัก (กรัม)</label>
                <input type="number" step="0.1" value={formData.weightG || ''} onChange={e => setFormData({ ...formData, weightG: parseFloat(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">สูง (มม.)</label>
                <input type="number" value={formData.heightMm || ''} onChange={e => setFormData({ ...formData, heightMm: parseFloat(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">กว้าง (มม.)</label>
                <input type="number" value={formData.widthMm || ''} onChange={e => setFormData({ ...formData, widthMm: parseFloat(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1">ยอดผลิตที่ต้องการ (Target)</label>
                <input 
                  type="number" 
                  value={formData.totalProduction || ''} 
                  onChange={e => {
                    const newTarget = parseInt(e.target.value) || 0;
                    updateTargetProduction(newTarget);
                  }} 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-brand-700" 
                  required 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">ยอดผลิตได้จริง (Actual)</label>
                <input type="number" value={formData.actualProduction || ''} onChange={e => setFormData({ ...formData, actualProduction: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-emerald-600" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">วิธีบรรจุ</label>
                <input type="text" value={formData.packagingMethod || ''} onChange={e => setFormData({ ...formData, packagingMethod: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
            </div>
          </div>

          {/* Section 3: Schedule */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-brand-600 uppercase tracking-widest border-l-4 border-brand-500 pl-2">กำหนดการ (Schedule)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">เวลาเริ่มผลิต (ตามแผน)</label>
                  {isStartDateFocused ? (
                    <input 
                      type="datetime-local" 
                      lang="th-TH" 
                      autoFocus
                      value={toInputString(formData.startDate)} 
                      onChange={e => setFormData({ ...formData, startDate: new Date(e.target.value).toISOString() })} 
                      onBlur={() => setIsStartDateFocused(false)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" 
                    />
                  ) : (
                    <input 
                      type="text" 
                      value={formatThaiDateTime(formData.startDate)} 
                      onFocus={() => setIsStartDateFocused(true)}
                      readOnly
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm cursor-pointer bg-white" 
                    />
                  )}
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">เวลาสิ้นสุด (ตามแผน)</label>
                  {isEndDateFocused ? (
                    <input 
                      type="datetime-local" 
                      lang="th-TH" 
                      autoFocus
                      value={toInputString(formData.endDate)} 
                      onChange={e => setFormData({ ...formData, endDate: new Date(e.target.value).toISOString() })} 
                      onBlur={() => setIsEndDateFocused(false)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" 
                    />
                  ) : (
                    <input 
                      type="text" 
                      value={formatThaiDateTime(formData.endDate)} 
                      onFocus={() => setIsEndDateFocused(true)}
                      readOnly
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm cursor-pointer bg-white" 
                    />
                  )}
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">เวลาเริ่มผลิต (จริง)</label>
                  <input 
                    type="datetime-local" 
                    lang="th-TH" 
                    value={toInputString(formData.actualStartDate)} 
                    onChange={e => setFormData({ ...formData, actualStartDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" 
                  />
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">เวลาสิ้นสุด (จริง)</label>
                  <input 
                    type="datetime-local" 
                    lang="th-TH" 
                    value={toInputString(formData.actualEndDate)} 
                    onChange={e => setFormData({ ...formData, actualEndDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" 
                  />
               </div>
            </div>
            
            {formData.status === 'Delayed' && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <label className="block text-sm font-bold text-red-700 mb-2">สาเหตุที่ล่าช้า (Root Cause)</label>
                <textarea 
                  value={formData.delayReason || ''} 
                  onChange={e => setFormData({ ...formData, delayReason: e.target.value })} 
                  className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:ring-red-500 focus:border-red-500" 
                  rows={3}
                  placeholder="ระบุสาเหตุที่ทำให้งานล่าช้ากว่าแผน..."
                  required
                />
                <p className="text-xs text-red-500 mt-1">จำเป็นต้องระบุสาเหตุเมื่อสถานะเป็น "ล่าช้า"</p>
              </div>
            )}
          </div>

          {/* Section 4: Materials */}
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
              <h4 className="text-sm font-bold text-brand-600 uppercase tracking-widest pl-2">รายการเบิกวัตถุดิบ (BOM)</h4>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={autoFillMaterialsFromBOM}
                  className="text-xs flex items-center gap-1 text-white font-bold bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                >
                  <Wand2 size={14} /> ดึงสูตร BOM
                </button>
                <button 
                  type="button" onClick={addMaterial}
                  className="text-xs flex items-center gap-1 text-brand-600 hover:text-brand-700 font-bold bg-white border border-slate-300 px-3 py-1.5 rounded-lg"
                >
                  <Plus size={14} /> เพิ่มเอง
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              {formData.materials?.map((m, idx) => {
                // Check Stock Status
                const inventoryItem = m.inventoryItemId ? inventory.find(i => i.id === m.inventoryItemId) : null;
                const requiredQty = m.qtyPcs > 0 ? m.qtyPcs : m.qtyKg;
                const currentStock = inventoryItem ? inventoryItem.currentStock : 0;
                const isShortage = inventoryItem && currentStock < requiredQty;

                return (
                <div key={m.id} className={`flex flex-col xl:flex-row gap-2 p-2 rounded-lg border ${isShortage ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="hidden xl:flex items-center justify-center font-bold text-slate-400 w-6 shrink-0">{idx + 1}</div>
                  
                  <div className="flex-1 min-w-0">
                    <SearchableSelect
                      options={inventory.filter(i => i.category !== 'FG').map(i => ({ value: i.id, label: `[${i.code}] ${i.name}` }))}
                      value={m.inventoryItemId || ''}
                      onChange={(value) => {
                        const item = inventory.find(i => i.id === value);
                        if (item) {
                          setFormData(prev => ({
                            ...prev,
                            materials: (prev.materials || []).map(mat => mat.id === m.id ? { ...mat, inventoryItemId: item.id, name: item.name, unit: item.unit } : mat)
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            materials: (prev.materials || []).map(mat => mat.id === m.id ? { ...mat, inventoryItemId: undefined, name: value } : mat)
                          }));
                        }
                      }}
                      allowCustom={true}
                      placeholder="ค้นหาวัตถุดิบ..."
                    />
                    {isShortage && (
                        <div className="text-[10px] text-red-600 font-bold flex items-center gap-1 mt-1">
                            <AlertCircle size={10} /> ของขาด! มีแค่ {(currentStock || 0).toLocaleString()} {m.unit}
                        </div>
                    )}
                    {!isShortage && inventoryItem && (
                        <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
                            <CheckCircle2 size={10} /> พร้อมใช้ ({(currentStock || 0).toLocaleString()} {m.unit})
                        </div>
                    )}
                  </div>
                  
                  <div className="flex flex-row gap-2 shrink-0">
                    <div className="w-16 border-r border-slate-200 pr-2">
                      <input type="number" placeholder="เผื่อ(%)" value={m.wastePercentage || ''} onChange={e => updateMaterial(m.id, 'wastePercentage', parseFloat(e.target.value))} className="w-full text-xs p-1.5 border border-slate-300 rounded text-center" title="เปอร์เซ็นต์เผื่อสูญเสีย (%)" />
                      <span className="text-[10px] text-slate-400 block text-center mt-0.5 truncate leading-tight" title="เผื่อเสีย %">เผื่อเสีย %</span>
                    </div>
                    <div className="w-20">
                      <input type="number" placeholder="กก." value={m.qtyKg > 0 ? m.qtyKg : m.qtyPcs} onChange={e => updateMaterial(m.id, m.qtyKg > 0 ? 'qtyKg' : 'qtyPcs', parseFloat(e.target.value))} className={`w-full text-xs p-1.5 border rounded font-bold ${isShortage ? 'text-red-700 border-red-300 bg-red-100' : 'border-slate-300'}`} />
                      <span className="text-[10px] text-slate-400 block text-right">{m.unit}</span>
                    </div>
                    <div className="w-24">
                      <input type="text" placeholder="LOT NO." value={m.lotNo} onChange={e => updateMaterial(m.id, 'lotNo', e.target.value)} className="w-full text-xs p-1.5 border border-slate-300 rounded" />
                    </div>
                    <div className="w-24">
                      <input type="text" placeholder="หมายเหตุ" value={m.remarks === 'Auto-filled from BOM' ? '' : m.remarks} onChange={e => updateMaterial(m.id, 'remarks', e.target.value)} className="w-full text-xs p-1.5 border border-slate-300 rounded" title={m.remarks} />
                    </div>
                    <div className="w-8 flex justify-center">
                      <button type="button" onClick={() => removeMaterial(m.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors aspect-square h-fit" title="ลบรายการนี้">
                        <Trash2 size={16}/>
                      </button>
                    </div>
                  </div>
                </div>
              )})}
              {(!formData.materials || formData.materials.length === 0) && (
                <div className="text-center py-4 text-xs text-slate-400 italic">
                  ยังไม่มีรายการเบิกวัตถุดิบ
                </div>
              )}
            </div>
          </div>

          {/* Section 5: Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">หมายเหตุ / เหตุผลการหยุดงาน / สาเหตุงานด่วน</label>
            <textarea 
              value={formData.remarks || ''}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              rows={3}
              className={`w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-brand-500 resize-none text-sm ${formData.status === 'Paused' || formData.status === 'Stopped' ? 'border-red-300 bg-red-50' : 'border-slate-300'}`}
              placeholder={formData.status === 'Paused' ? "ระบุสาเหตุการหยุดชั่วคราว..." : "ระบุข้อกำหนดพิเศษ เช่น ห้ามมีเส้นผม, ป้องกันฝุ่น..."}
            />
          </div>

          <div className="pt-6 flex justify-end gap-3 sticky bottom-0 bg-white border-t border-slate-100 py-4 mt-8">
            <button 
              type="button" onClick={onClose}
              className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors"
            >
              ยกเลิก
            </button>
            <button 
              type="submit" 
              className="px-8 py-2.5 bg-brand-600 text-white font-bold hover:bg-brand-700 rounded-xl shadow-lg shadow-brand-500/30 flex items-center gap-2 active:scale-95 transition-all"
            >
              <Save size={18} /> บันทึกข้อมูล
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};