import React, { useState, useRef } from 'react';
import { Upload, FileImage, Image as ImageIcon, Loader2, Save, ScanLine, X, AlertCircle, Database, Plus, ChevronRight, Calculator, CheckCircle2, BrainCircuit } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import { InventoryItem, ProductBOM } from '../types';

interface BomScannerViewProps {
  inventory: InventoryItem[];
  onAddBom: (bom: ProductBOM) => void;
  onClose?: () => void;
}

export const BomScannerView: React.FC<BomScannerViewProps> = ({ inventory, onAddBom, onClose }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedBOM, setExtractedBOM] = useState<Partial<ProductBOM> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
      setExtractedBOM(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const scanImage = async () => {
    if (!selectedImage) return;

    setIsScanning(true);
    setError(null);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is not set. Cannot use AI features.');
      }

      const ai = new GoogleGenAI({ apiKey });

      // Transform inventory to a simple list for AI context
      const inventoryContext = inventory.map(item => ({
        id: item.id,
        name: item.name,
        code: item.code,
        category: item.category
      }));

      const base64Data = selectedImage.split(',')[1];
      const mimeType = selectedImage.substring(selectedImage.indexOf(":") + 1, selectedImage.indexOf(";"));

      const prompt = `
        Analyze this production order / bill of materials image.
        Extract the product name and the list of materials required.
        
        Important:
        1. Try to find a match for each material in the provided "Current Inventory" list, and use its ID as "inventoryItemId".
        2. "qtyPerUnit" should be the amount of material used per ONE piece of the final product. If the document shows total material for a total production run, you must calculate: (Total Material / Total Output Quantity). Example: 700 kg total for 28800 pcs = 700/28800 = 0.0243 kg/pc.
        3. If no clear match in inventory, use a placeholder ID or leave null, we will handle it.
        
        Current Inventory:
        ${JSON.stringify(inventoryContext, null, 2)}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: {
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType
              }
            }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              productItem: {
                 type: Type.STRING,
                 description: "The name of the main product being manufactured."
              },
              totalOrderQty: {
                 type: Type.NUMBER,
                 description: "The total production quantity requested in the document."
              },
              materials: {
                type: Type.ARRAY,
                description: "List of raw materials or components needed.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    rawMaterialName: {
                      type: Type.STRING,
                      description: "The name of the material as written in the document."
                    },
                    inventoryItemId: {
                      type: Type.STRING,
                      description: "The exact matching ID from the provided Current Inventory, if any."
                    },
                    totalAmountDoc: {
                      type: Type.NUMBER,
                      description: "Total amount stated in document for the full order (e.g. 700 kg)."
                    },
                    qtyPerUnit: {
                      type: Type.NUMBER,
                      description: "Calculated amount per 1 piece of final product."
                    },
                    unitType: {
                      type: Type.STRING,
                      description: "Unit of measurement (e.g., kg, g, pcs)."
                    }
                  },
                  required: ["rawMaterialName", "qtyPerUnit", "unitType"]
                }
              }
            },
            required: ["productItem", "materials"]
          }
        }
      });

      const jsonStr = response.text.trim();
      const data = JSON.parse(jsonStr);

      setExtractedBOM({
        productItem: data.productItem,
        materials: data.materials.map((m: any) => ({
          inventoryItemId: m.inventoryItemId || `tmp-${Date.now()}-${Math.random()}`,
          rawMaterialName: m.rawMaterialName,
          qtyPerUnit: m.qtyPerUnit,
          unitType: m.unitType,
          totalAmountDoc: m.totalAmountDoc
        })) as any // We add temp fields for UI review
      });

    } catch (err: any) {
       console.error("Scanning Error:", err);
       setError(err.message || 'เกิดข้อผิดพลาดในการวิเคราะห์เอกสาร');
    } finally {
      setIsScanning(false);
    }
  };

  const handleSaveBOM = () => {
    if (!extractedBOM || !extractedBOM.productItem) return;

    // Filter out items without matched inventory or let user fix it later
    const newBom: ProductBOM = {
      id: `bom-${Date.now()}`,
      productItem: extractedBOM.productItem,
      version: 1,
      status: 'Active',
      materials: extractedBOM.materials?.map((m: any) => ({
        inventoryItemId: m.inventoryItemId.startsWith('tmp-') ? '' : m.inventoryItemId,
        qtyPerUnit: m.qtyPerUnit,
        unitType: m.unitType
      })) || []
    };

    onAddBom(newBom);
    if (onClose) onClose();
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden font-kanit">
      <div className="bg-slate-800 p-4 text-white flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ScanLine className="text-emerald-400" /> วิเคราะห์และคลายสูตร BOM จากเอกสาร (AI BOM Scanner)
        </h2>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        )}
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded text-red-700 flex items-start gap-3">
            <AlertCircle className="shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div>
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FileImage size={18} className="text-blue-500" /> เอกสารต้นฉบับ (ใบสั่งผลิต / สูตรการผลิต)
            </h3>
            
            {selectedImage ? (
              <div className="space-y-4">
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 relative aspect-[4/3] flex items-center justify-center">
                  <img src={selectedImage} alt="Document" className="max-w-full max-h-full object-contain" />
                  <button 
                    onClick={() => { setSelectedImage(null); setExtractedBOM(null); }}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-lg hover:bg-black/70 backdrop-blur"
                  >
                    <X size={18} />
                  </button>
                </div>
                {!extractedBOM && (
                  <button
                    onClick={scanImage}
                    disabled={isScanning}
                    className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {isScanning ? <Loader2 className="animate-spin" /> : <BrainCircuit />}
                    {isScanning ? 'กำลังวิเคราะห์ด้วย AI...' : 'เริ่มวิเคราะห์ข้อมูลและสร้าง BOM'}
                  </button>
                )}
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center bg-slate-50 hover:bg-blue-50 hover:border-blue-300 transition-colors cursor-pointer group"
              >
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm group-hover:scale-110 transition-transform text-blue-500">
                  <ImageIcon size={32} />
                </div>
                <h4 className="font-bold text-slate-700 text-lg mb-1">อัปโหลดรูปภาพใบสั่งผลิต</h4>
                <p className="text-sm text-slate-500 mb-4">รองรับไฟล์ JPG, PNG หรือจับภาพหน้าจอแล้ววาง (Paste)</p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 shadow-sm">
                  <Upload size={16} /> เลือกไฟล์จากเครื่อง
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Database size={18} className="text-emerald-500" /> ข้อมูล BOM ที่วิเคราะห์ได้
            </h3>

            {isScanning ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-500 space-y-4">
                <Loader2 size={40} className="animate-spin text-brand-500" />
                <div className="text-center">
                  <p className="font-bold text-slate-700">กำลังถอดรหัสเอกสาร...</p>
                  <p className="text-sm">กำลังคำนวณปริมาณการใช้วัตถุดิบต่อหน่วย (qtyPerUnit)</p>
                </div>
              </div>
            ) : extractedBOM ? (
              <div className="space-y-6">
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">รหัส/ชื่อสินค้าปลายทาง</label>
                  <div className="text-xl font-bold text-slate-800">{extractedBOM.productItem}</div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    สูตรการผลิต (Material Requirements)
                  </h4>
                  <div className="space-y-3">
                    {extractedBOM.materials?.map((mat: any, idx: number) => {
                      const invItem = inventory.find(i => i.id === mat.inventoryItemId);
                      const isMatched = !!invItem;

                      return (
                        <div key={idx} className={`p-4 rounded-lg border ${isMatched ? 'bg-white border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-bold text-slate-800">{mat.rawMaterialName}</div>
                              <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                {isMatched ? (
                                  <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 size={12} /> {invItem.code} | {invItem.name}</span>
                                ) : (
                                  <span className="text-amber-600 flex items-center gap-1"><AlertCircle size={12} /> ไม่พบในคลัง (ต้องผูกข้อมูลใหม่)</span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-brand-600">
                                {Number(mat.qtyPerUnit.toFixed(7))} {mat.unitType}/ชิ้น
                              </div>
                              {mat.totalAmountDoc && (
                                <div className="text-[10px] text-slate-400 mt-1" title="ดึงมาจากเอกสารโดยตรง">
                                  อ้างอิง: เอกสารระบุรวม {mat.totalAmountDoc} {mat.unitType}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <button
                    onClick={handleSaveBOM}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    <Save size={20} /> บันทึกและนำเข้าโครงสร้าง BOM
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                <Calculator size={48} className="mb-4 opacity-20" />
                <p>รอการอัปโหลดไฟล์</p>
                <p className="text-sm mt-1">ระบบจะแกะข้อมูลสูตรและคำนวณสัดส่วนให้อัตโนมัติ</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
