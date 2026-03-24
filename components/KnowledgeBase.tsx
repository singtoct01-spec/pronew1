
import React, { useState } from 'react';
import { CustomKnowledge, InventoryItem, ProductBOM, ProductSpec, MachineMoldCapability } from '../types';
import { Search, Database, Disc, Settings, Weight, Package, Layers, Info, Box, BookOpen, Plus, Trash2, Edit2, Copy, Printer } from 'lucide-react';
import { BomModal } from './BomModal';

interface KnowledgeBaseProps {
  customKnowledge: CustomKnowledge[];
  inventory: InventoryItem[];
  boms: ProductBOM[];
  productSpecs: ProductSpec[];
  machineCapabilities: MachineMoldCapability[];
  onSaveKnowledge: (knowledge: Omit<CustomKnowledge, 'id' | 'updatedAt'>, id?: string) => void;
  onDeleteKnowledge: (id: string) => void;
  onAddBom?: (bom: Omit<ProductBOM, 'id'>) => void;
  onUpdateBom?: (bom: ProductBOM) => void;
  onDeleteBom?: (id: string) => void;
}

export const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ customKnowledge, inventory, boms, productSpecs, machineCapabilities, onSaveKnowledge, onDeleteKnowledge, onAddBom, onUpdateBom, onDeleteBom }) => {
  const [activeTab, setActiveTab] = useState<'products' | 'machines' | 'boms' | 'packaging'>('products');
  const [searchTerm, setSearchTerm] = useState('');
  
  // BOM Modal State
  const [isBomModalOpen, setIsBomModalOpen] = useState(false);
  const [editingBom, setEditingBom] = useState<ProductBOM | null>(null);

  const handleOpenAddBom = () => {
    setEditingBom(null);
    setIsBomModalOpen(true);
  };

  const handleOpenEditBom = (bom: ProductBOM) => {
    setEditingBom(bom);
    setIsBomModalOpen(true);
  };

  const handleSaveBom = (bom: Omit<ProductBOM, 'id'> | ProductBOM) => {
    if ('id' in bom && bom.id) {
      onUpdateBom?.(bom as ProductBOM);
    } else {
      onAddBom?.(bom);
    }
  };

  const handleDeleteBomClick = (id: string) => {
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบสูตรการผลิตนี้?')) {
      onDeleteBom?.(id);
    }
  };

  const handleDuplicateBom = (bom: ProductBOM) => {
    const duplicatedBom = {
      ...bom,
      productItem: `${bom.productItem} (Copy)`,
      id: undefined, // Remove ID to create a new one
      version: 1, // Reset version for new copy
    };
    setEditingBom(duplicatedBom as any);
    setIsBomModalOpen(true);
  };

  const handlePrintBom = (bom: ProductBOM) => {
    // Basic print functionality - opens a new window with a printable view
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let materialsHtml = '';
    let totalCost = 0;

    bom.materials.forEach(mat => {
      const item = inventory.find(i => i.id === mat.inventoryItemId);
      const cost = (item?.unitPrice || 0) * mat.qtyPerUnit;
      totalCost += cost;
      materialsHtml += `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${item?.code || mat.inventoryItemId}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${item?.name || 'Unknown'}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${mat.qtyPerUnit}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${mat.unitType}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${cost.toFixed(2)} ฿</td>
        </tr>
      `;
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>สูตรการผลิต (BOM) - ${bom.productItem}</title>
          <style>
            body { font-family: 'Sarabun', sans-serif; padding: 20px; color: #333; }
            h1 { color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
            .header-info { margin-bottom: 20px; }
            .header-info p { margin: 5px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #f8fafc; padding: 10px; border: 1px solid #ddd; text-align: left; }
            .total-row { font-weight: bold; background-color: #f1f5f9; }
          </style>
        </head>
        <body>
          <h1>สูตรการผลิต (Master BOM)</h1>
          <div class="header-info">
            <p><strong>รหัส/ชื่อสินค้า:</strong> ${bom.productItem}</p>
            <p><strong>เวอร์ชัน:</strong> ${bom.version || 1}</p>
            <p><strong>สถานะ:</strong> ${bom.status === 'Archived' ? 'ยกเลิก (Archived)' : 'ใช้งาน (Active)'}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>รหัสวัตถุดิบ</th>
                <th>ชื่อวัตถุดิบ</th>
                <th style="text-align: right;">ปริมาณที่ใช้</th>
                <th style="text-align: center;">หน่วย</th>
                <th style="text-align: right;">ต้นทุนโดยประมาณ</th>
              </tr>
            </thead>
            <tbody>
              ${materialsHtml}
              <tr class="total-row">
                <td colspan="4" style="padding: 10px; border: 1px solid #ddd; text-align: right;">ต้นทุนวัตถุดิบรวมต่อชิ้น:</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${totalCost.toFixed(2)} ฿</td>
              </tr>
            </tbody>
          </table>
          <script>
            window.onload = () => { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filteredProducts = productSpecs.filter(p => 
    p.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMachines = machineCapabilities.filter(m =>
    m.machineGroup.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.moldName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredBoms = boms.filter(b => 
    b.productItem.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 font-kanit">
      
      {/* Tabs */}
      <div className="flex space-x-4 border-b border-slate-200 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('products')}
          className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'products' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center gap-2">
            <Package size={18} />
            ข้อมูลสินค้า (Products)
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('packaging')}
          className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'packaging' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center gap-2">
            <Box size={18} />
            มาตรฐานการบรรจุ (Packaging)
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('boms')}
          className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'boms' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center gap-2">
            <Layers size={18} />
            สูตรการผลิต (BOM)
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('machines')}
          className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'machines' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center gap-2">
            <Settings size={18} />
            เครื่องจักร & แม่พิมพ์
          </div>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50 flex-wrap gap-4">
           <div className="flex items-center gap-3">
              <Database size={20} className="text-brand-600"/>
              <h2 className="text-lg font-bold text-slate-800">
                {activeTab === 'products' ? 'ฐานข้อมูลสินค้า (Master Products)' : 
                 activeTab === 'boms' ? 'สูตรการผลิตมาตรฐาน (Master BOM)' : 
                 activeTab === 'packaging' ? 'มาตรฐานการบรรจุหีบห่อ (Packaging Standard)' :
                 'ฐานข้อมูลเครื่องจักร (Machine Master)'}
              </h2>
           </div>
           <div className="flex items-center gap-3 w-full md:w-auto">
              {activeTab === 'boms' && (
                <button 
                  onClick={handleOpenAddBom}
                  className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Plus size={16} />
                  สร้างสูตรการผลิต
                </button>
              )}
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="ค้นหาข้อมูล..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-full"
                />
              </div>
           </div>
        </div>

        <div className="overflow-x-auto">
          {activeTab === 'products' && (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">รหัสสินค้า</th>
                  <th className="px-6 py-4">ชื่อเรียก</th>
                  <th className="px-6 py-4">ประเภท</th>
                  <th className="px-6 py-4">วัสดุ</th>
                  <th className="px-6 py-4">น้ำหนัก</th>
                  <th className="px-6 py-4">ขนาด (กxส)</th>
                  <th className="px-6 py-4">ใช้กับ Preform</th>
                  <th className="px-6 py-4 text-right">บรรจุ (ชิ้น/ลัง)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-bold text-brand-700">{p.code}</td>
                    <td className="px-6 py-4">{p.name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        p.type === 'Preform' ? 'bg-orange-100 text-orange-700' :
                        p.type === 'Jar' ? 'bg-blue-100 text-blue-700' :
                        p.type === 'Cap' ? 'bg-purple-100 text-purple-700' :
                        'bg-slate-100'
                      }`}>
                        {p.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">{p.material}</td>
                    <td className="px-6 py-4">{p.weight}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                        {p.width ? `${p.width}mm` : '-'} x {p.height ? `${p.height}mm` : '-'}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-600">{p.preformCode || '-'}</td>
                    <td className="px-6 py-4 text-right">{p.packSize}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'packaging' && (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 w-[25%]">สินค้า</th>
                  <th className="px-6 py-4 w-[15%]">วิธีการบรรจุ</th>
                  <th className="px-6 py-4 w-[20%]">ถุง (Bag Info)</th>
                  <th className="px-6 py-4 w-[20%]">กล่อง (Box Info)</th>
                  <th className="px-6 py-4 w-[20%]">การเรียง (Layer)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p, idx) => {
                    const pack = p.packagingDetail;
                    return (
                        <tr key={idx} className="hover:bg-slate-50 align-top">
                            <td className="px-6 py-4">
                                <div className="font-bold text-slate-800">{p.code}</div>
                                <div className="text-xs text-slate-500">{p.name}</div>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                    pack?.method === 'Box' ? 'bg-amber-100 text-amber-700' :
                                    pack?.method === 'Bag' ? 'bg-blue-100 text-blue-700' :
                                    'bg-slate-100 text-slate-600'
                                }`}>
                                    {pack?.method || '-'}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                {pack?.bagType ? (
                                    <div className="text-xs space-y-1">
                                        <div className="font-medium text-slate-700">{pack.bagType}</div>
                                        <div className="text-slate-500">ขนาด: {pack.bagSize}</div>
                                        <div className="font-mono text-indigo-600">{pack.qtyPerBag} ชิ้น/ถุง</div>
                                    </div>
                                ) : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="px-6 py-4">
                                {pack?.boxType ? (
                                    <div className="text-xs space-y-1">
                                        <div className="font-medium text-slate-700">{pack.boxType}</div>
                                        <div className="text-slate-500">ขนาด: {pack.boxSize}</div>
                                        <div className="font-mono text-emerald-600 font-bold">{pack.qtyPerBox} ชิ้น/กล่อง</div>
                                    </div>
                                ) : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="px-6 py-4">
                                {pack?.layerConfig ? (
                                    <div className="text-xs bg-slate-100 p-2 rounded text-slate-600 border border-slate-200">
                                        {pack.layerConfig}
                                    </div>
                                ) : <span className="text-slate-300">-</span>}
                            </td>
                        </tr>
                    );
                })}
              </tbody>
            </table>
          )}

          {activeTab === 'boms' && (
            <div className="divide-y divide-slate-100">
               {filteredBoms.length > 0 ? filteredBoms.map((bom, idx) => (
                 <div key={idx} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Layers size={18} className="text-indigo-500" />
                            <h3 className="font-bold text-slate-800 text-base">{bom.productItem}</h3>
                            {bom.version && <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">v{bom.version}</span>}
                            {bom.status === 'Archived' && <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">ยกเลิกแล้ว</span>}
                        </div>
                        <div className="flex gap-1">
                          <button 
                            className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                            onClick={() => handlePrintBom(bom)}
                            title="พิมพ์สูตร"
                          >
                            <Printer size={16} />
                          </button>
                          <button 
                            className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                            onClick={() => handleDuplicateBom(bom)}
                            title="คัดลอกสูตร"
                          >
                            <Copy size={16} />
                          </button>
                          <button 
                            className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                            onClick={() => handleOpenEditBom(bom)}
                            title="แก้ไขสูตร"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            onClick={() => bom.id && handleDeleteBomClick(bom.id)}
                            title="ลบสูตร"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {bom.materials.map((mat, mIdx) => {
                            const item = inventory.find(i => i.id === mat.inventoryItemId);
                            return (
                                <div key={mIdx} className="bg-white border border-slate-200 p-2 rounded-lg flex justify-between items-center text-sm shadow-sm">
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-slate-700">{item?.code || 'Unknown'}</span>
                                        <span className="text-[10px] text-slate-500">{item?.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-mono font-bold text-indigo-600">{mat.qtyPerUnit}</span>
                                        <span className="text-xs text-slate-400 ml-1">{mat.unitType}</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-500">ต้นทุนวัตถุดิบรวมโดยประมาณ:</span>
                      <span className="text-sm font-bold text-emerald-600">
                        ฿{bom.materials.reduce((total, mat) => {
                          const item = inventory.find(i => i.id === mat.inventoryItemId);
                          return total + ((item?.unitPrice || 0) * mat.qtyPerUnit);
                        }, 0).toFixed(4)}
                      </span>
                    </div>
                 </div>
               )) : (
                 <div className="p-12 text-center text-slate-400 italic flex flex-col items-center">
                    <Info size={32} className="mb-2 opacity-50" />
                    <p>ไม่พบสูตรการผลิตที่ค้นหา</p>
                 </div>
               )}
            </div>
          )}

          {activeTab === 'machines' && (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">กลุ่มเครื่องจักร</th>
                  <th className="px-6 py-4">ชื่อแม่พิมพ์</th>
                  <th className="px-6 py-4 text-center">จำนวน Cavity</th>
                  <th className="px-6 py-4 text-center">Cycle Time (วินาที)</th>
                  <th className="px-6 py-4 text-right">กำลังผลิต (ชิ้น/ชม.)</th>
                  <th className="px-6 py-4 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMachines.map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-bold text-slate-700">{m.machineGroup}</td>
                    <td className="px-6 py-4">{m.moldName}</td>
                    <td className="px-6 py-4 text-center">{m.cavity}</td>
                    <td className="px-6 py-4 text-center">{m.cycleTimeSec}s</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600">
                        {m.theoreticalOutputHr?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                            m.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                            {m.status}
                        </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <BomModal 
        isOpen={isBomModalOpen}
        onClose={() => setIsBomModalOpen(false)}
        onSave={handleSaveBom}
        initialData={editingBom}
        inventory={inventory}
        boms={boms}
        productSpecs={productSpecs}
      />
    </div>
  );
};
