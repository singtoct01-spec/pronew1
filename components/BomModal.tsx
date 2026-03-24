import React, { useState, useEffect } from 'react';
import { ProductBOM, InventoryItem, ProductSpec } from '../types';
import { X, Save, Plus, Trash2, Copy } from 'lucide-react';
import { SearchableSelect } from './SearchableSelect';

interface BomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bom: Omit<ProductBOM, 'id'> | ProductBOM) => void;
  initialData?: ProductBOM | null;
  inventory: InventoryItem[];
  boms: ProductBOM[];
  productSpecs?: ProductSpec[];
}

export const BomModal: React.FC<BomModalProps> = ({ isOpen, onClose, onSave, initialData, inventory, boms, productSpecs = [] }) => {
  const [productItem, setProductItem] = useState('');
  const [materials, setMaterials] = useState<{ inventoryItemId: string; qtyPerUnit: number; unitType: string; alternativeItemId?: string; alternativeRatio?: number }[]>([]);
  const [selectedBomToCopy, setSelectedBomToCopy] = useState<string>('');
  const [version, setVersion] = useState<number>(1);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [sopUrl, setSopUrl] = useState<string>('');
  const [status, setStatus] = useState<'Active' | 'Archived'>('Active');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [templateWeight, setTemplateWeight] = useState<number | ''>('');

  const BOM_TEMPLATES = [
    {
      id: 'pe_cap',
      name: 'ฝา PE (PE Cap)',
      description: 'LLDPE 80%, HDPE 20% + Master batch 2%',
      materials: [
        { name: 'LLDPE (80%)', ratio: 0.80, unit: 'kg' },
        { name: 'HDPE (20%)', ratio: 0.20, unit: 'kg' },
        { name: 'Master Batch (2%)', ratio: 0.02, unit: 'kg' }
      ]
    },
    {
      id: 'pp_cap',
      name: 'ฝา PP (PP Cap)',
      description: 'PP 100% + Master batch 2%',
      materials: [
        { name: 'PP (100%)', ratio: 1.00, unit: 'kg' },
        { name: 'Master Batch (2%)', ratio: 0.02, unit: 'kg' }
      ]
    },
    {
      id: 'pet_preform',
      name: 'พรีฟอร์ม (PET Preform)',
      description: 'PET 100%',
      materials: [
        { name: 'PET (100%)', ratio: 1.00, unit: 'kg' }
      ]
    }
  ];

  useEffect(() => {
    if (initialData) {
      setProductItem(initialData.productItem);
      setMaterials(initialData.materials || []);
      setVersion(initialData.version || 1);
      setImageUrl(initialData.imageUrl || '');
      setSopUrl(initialData.sopUrl || '');
      setStatus(initialData.status || 'Active');
    } else {
      setProductItem('');
      setMaterials([]);
      setVersion(1);
      setImageUrl('');
      setSopUrl('');
      setStatus('Active');
    }
    setSelectedBomToCopy('');
  }, [initialData, isOpen]);

  const handleCopyBom = () => {
    if (!selectedBomToCopy) return;
    const bomToCopy = boms.find(b => b.id === selectedBomToCopy);
    if (bomToCopy) {
      // Copy materials, but keep the productItem empty or keep current if user already typed something
      setMaterials([...bomToCopy.materials]);
      if (!productItem) {
        setProductItem(`${bomToCopy.productItem} (Copy)`);
      }
    }
  };

  const handleApplyTemplate = () => {
    if (!selectedTemplate || !templateWeight) {
      alert('กรุณาเลือกโครงสร้างหลักและระบุน้ำหนักรวม (กรัม)');
      return;
    }
    
    const template = BOM_TEMPLATES.find(t => t.id === selectedTemplate);
    if (!template) return;

    const weightKg = Number(templateWeight) / 1000; // Convert g to kg
    
    const newMaterials = template.materials.map(mat => {
      // Try to find a matching inventory item by name/category
      let matchedItem = '';
      if (mat.name.includes('PP')) {
        matchedItem = inventory.find(i => i.name.includes('PP') && i.category === 'Resin')?.id || '';
      } else if (mat.name.includes('PET')) {
        matchedItem = inventory.find(i => i.name.includes('PET') && i.category === 'Resin')?.id || '';
      } else if (mat.name.includes('Master Batch')) {
        matchedItem = inventory.find(i => i.category === 'Pigment')?.id || '';
      }

      return {
        inventoryItemId: matchedItem,
        qtyPerUnit: Number((weightKg * mat.ratio).toFixed(6)),
        unitType: mat.unit,
        _templateHint: mat.name // Temporary field for UI hint
      };
    });

    if (materials.length === 0 || window.confirm('ต้องการแทนที่ส่วนประกอบเดิมด้วยโครงสร้างหลักนี้หรือไม่?')) {
      setMaterials(newMaterials as any);
    }
  };

  if (!isOpen) return null;

  const handleAddMaterial = () => {
    setMaterials([...materials, { inventoryItemId: '', qtyPerUnit: 0, unitType: 'pcs' }]);
  };

  const handleRemoveMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const handleMaterialChange = (index: number, field: string, value: string | number) => {
    const newMaterials = [...materials];
    newMaterials[index] = { ...newMaterials[index], [field]: value };
    
    // Auto-fill unit based on selected inventory item
    if (field === 'inventoryItemId') {
      const selectedItem = inventory.find(i => i.id === value);
      if (selectedItem) {
        newMaterials[index].unitType = selectedItem.unit;
      }
    }
    
    setMaterials(newMaterials);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!productItem.trim()) {
      alert('กรุณาระบุชื่อสินค้า');
      return;
    }
    
    if (materials.length === 0) {
      alert('กรุณาเพิ่มส่วนประกอบอย่างน้อย 1 รายการ');
      return;
    }
    
    const hasEmptyMaterial = materials.some(m => !m.inventoryItemId || m.qtyPerUnit <= 0);
    if (hasEmptyMaterial) {
      alert('กรุณาระบุวัตถุดิบและปริมาณให้ครบถ้วนและถูกต้อง');
      return;
    }

    const bomData: Omit<ProductBOM, 'id'> | ProductBOM = {
      ...(initialData?.id ? { id: initialData.id } : {}),
      productItem,
      materials,
      version,
      imageUrl,
      sopUrl,
      status
    };

    onSave(bomData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-kanit">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">
            {initialData ? 'แก้ไขสูตรการผลิต' : 'สร้างสูตรการผลิตใหม่'}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form id="bom-form" onSubmit={handleSubmit} className="space-y-6">
            {!initialData && boms && boms.length > 0 && (
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 w-full">
                  <label className="block text-sm font-medium text-indigo-800 mb-1">คัดลอกสูตรจาก (Copy from existing BOM)</label>
                  <SearchableSelect
                    value={selectedBomToCopy}
                    onChange={setSelectedBomToCopy}
                    options={boms.map(bom => ({ value: bom.id, label: bom.productItem }))}
                    placeholder="-- เลือกสูตรที่ต้องการคัดลอก --"
                    className="w-full"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCopyBom}
                  disabled={!selectedBomToCopy}
                  className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-colors w-full sm:w-auto justify-center"
                >
                  <Copy size={18} />
                  คัดลอก
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อสินค้า (Product Name) *</label>
                <SearchableSelect
                  options={productSpecs.map(s => ({ value: s.code, label: `[${s.code}] ${s.name}` }))}
                  value={productItem}
                  onChange={setProductItem}
                  placeholder="เลือกรหัสสินค้าจาก Master Data..."
                  allowCustom={true}
                  required={true}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">เวอร์ชัน (Version)</label>
                <input
                  type="number"
                  min="1"
                  value={version}
                  onChange={(e) => setVersion(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ลิงก์รูปภาพสินค้า (Image URL)</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ลิงก์เอกสารมาตรฐาน (SOP URL)</label>
                <input
                  type="url"
                  value={sopUrl}
                  onChange={(e) => setSopUrl(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">สถานะ (Status)</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'Active' | 'Archived')}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white"
                >
                  <option value="Active">ใช้งาน (Active)</option>
                  <option value="Archived">ยกเลิก (Archived)</option>
                </select>
              </div>
            </div>

            {/* Base Structure Template Section */}
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <label className="block text-sm font-medium text-emerald-800 mb-1">โครงสร้างหลัก (Base Structure)</label>
                <SearchableSelect
                  value={selectedTemplate}
                  onChange={setSelectedTemplate}
                  options={BOM_TEMPLATES.map(t => ({ value: t.id, label: `${t.name} (${t.description})` }))}
                  placeholder="-- เลือกโครงสร้างหลัก --"
                  className="w-full"
                />
              </div>
              <div className="w-full sm:w-32">
                <label className="block text-sm font-medium text-emerald-800 mb-1">น้ำหนักรวม (g)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={templateWeight}
                  onChange={(e) => setTemplateWeight(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2.5 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                  placeholder="เช่น 5"
                />
              </div>
              <button
                type="button"
                onClick={handleApplyTemplate}
                disabled={!selectedTemplate || !templateWeight}
                className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-colors w-full sm:w-auto justify-center"
              >
                <Plus size={18} />
                นำไปใช้
              </button>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-slate-700">ส่วนประกอบ (Materials) *</label>
                <button
                  type="button"
                  onClick={handleAddMaterial}
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 text-sm font-medium transition-colors"
                >
                  <Plus size={16} /> เพิ่มวัตถุดิบ
                </button>
              </div>

              {materials.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 border border-slate-200 border-dashed rounded-lg text-slate-500 text-sm">
                  ยังไม่มีส่วนประกอบ กรุณากดปุ่ม "เพิ่มวัตถุดิบ"
                </div>
              ) : (
                <div className="space-y-3">
                  {materials.map((mat, index) => {
                    const selectedItem = inventory.find(i => i.id === mat.inventoryItemId);
                    const unitPrice = selectedItem?.unitPrice || 0;
                    const cost = unitPrice * mat.qtyPerUnit;

                    return (
                    <div key={index} className="flex flex-col bg-slate-50 p-3 rounded-lg border border-slate-200 gap-3">
                      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                        <div className="flex-1 w-full">
                          <label className="block text-xs font-medium text-slate-500 mb-1">
                            วัตถุดิบหลัก {(mat as any)._templateHint && <span className="text-emerald-600 font-semibold ml-1">คำแนะนำ: เลือก {(mat as any)._templateHint}</span>}
                          </label>
                          <SearchableSelect
                            required={true}
                            value={mat.inventoryItemId}
                            onChange={(value) => handleMaterialChange(index, 'inventoryItemId', value)}
                            options={inventory.filter(item => item.category !== 'FG').map(item => ({
                              value: item.id,
                              label: `[${item.code}] ${item.name} (${item.currentStock} ${item.unit}) ${item.unitPrice ? `- ฿${item.unitPrice}/${item.unit}` : ''}`
                            }))}
                            placeholder="-- เลือกวัตถุดิบ --"
                            className="w-full text-sm"
                          />
                        </div>
                        <div className="w-full sm:w-32">
                          <label className="block text-xs font-medium text-slate-500 mb-1">ปริมาณ</label>
                          <input
                            type="number"
                            required
                            min="0"
                            step="0.0001"
                            value={mat.qtyPerUnit || ''}
                            onChange={(e) => handleMaterialChange(index, 'qtyPerUnit', Number(e.target.value))}
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                            placeholder="ปริมาณ"
                          />
                        </div>
                        <div className="w-full sm:w-24">
                          <label className="block text-xs font-medium text-slate-500 mb-1">หน่วย</label>
                          <input
                            type="text"
                            required
                            value={mat.unitType}
                            onChange={(e) => handleMaterialChange(index, 'unitType', e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm bg-slate-100"
                            placeholder="หน่วย"
                            readOnly
                          />
                        </div>
                        <div className="w-full sm:w-24">
                          <label className="block text-xs font-medium text-slate-500 mb-1">ต้นทุน (฿)</label>
                          <input
                            type="text"
                            value={cost > 0 ? cost.toFixed(4) : '-'}
                            className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-slate-100 text-slate-600"
                            readOnly
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveMaterial(index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors self-end sm:self-auto mt-5"
                          title="ลบรายการ"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      
                      {/* Alternative Material Section */}
                      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center pl-0 sm:pl-4 border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0">
                        <div className="flex-1 w-full">
                          <label className="block text-xs font-medium text-slate-500 mb-1">วัตถุดิบทดแทน (ถ้ามี)</label>
                          <SearchableSelect
                            value={mat.alternativeItemId || ''}
                            onChange={(value) => handleMaterialChange(index, 'alternativeItemId', value)}
                            options={inventory.filter(i => i.id !== mat.inventoryItemId && i.category !== 'FG').map(item => ({
                              value: item.id,
                              label: `[${item.code}] ${item.name}`
                            }))}
                            placeholder="-- ไม่มี --"
                            className="w-full text-sm"
                          />
                        </div>
                        <div className="w-full sm:w-32">
                          <label className="block text-xs font-medium text-slate-500 mb-1">สัดส่วนทดแทน (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={mat.alternativeRatio || ''}
                            onChange={(e) => handleMaterialChange(index, 'alternativeRatio', Number(e.target.value))}
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                            placeholder="เช่น 100"
                            disabled={!mat.alternativeItemId}
                          />
                        </div>
                      </div>
                    </div>
                  );
                  })}
                  
                  {/* Total Cost Calculation */}
                  <div className="flex justify-end pt-4 mt-4 border-t border-slate-200">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-4">
                      <div className="text-emerald-800 font-medium">ต้นทุนวัตถุดิบรวมโดยประมาณ:</div>
                      <div className="text-2xl font-bold text-emerald-600">
                        ฿{materials.reduce((total, mat) => {
                          const item = inventory.find(i => i.id === mat.inventoryItemId);
                          return total + ((item?.unitPrice || 0) * mat.qtyPerUnit);
                        }, 0).toFixed(4)}
                      </div>
                      <div className="text-sm text-emerald-600">/ ชิ้น</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            form="bom-form"
            className="px-6 py-2 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 transition-colors flex items-center gap-2"
          >
            <Save size={18} />
            บันทึกสูตรการผลิต
          </button>
        </div>
      </div>
    </div>
  );
};
