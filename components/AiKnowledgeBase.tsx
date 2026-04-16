import React, { useState } from 'react';
import { CustomKnowledge, InventoryItem, ProductBOM, ProductSpec, MachineMoldCapability } from '../types';
import { Search, BookOpen, Plus, Trash2, Edit2, BrainCircuit, Tag, Folder, Link as LinkIcon, X, Upload, FileText, File as FileIcon, Image as ImageIcon, Loader2 } from 'lucide-react';
import { ref, uploadBytes, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, doc, setDoc, getDoc } from 'firebase/firestore';
import { storage, db } from '../firebase';
import { extractTextFromFile } from '../utils/fileExtractor';

import { formatDateTime } from '../utils/dateUtils';

interface AiKnowledgeBaseProps {
  customKnowledge: CustomKnowledge[];
  inventory: InventoryItem[];
  boms: ProductBOM[];
  productSpecs: ProductSpec[];
  machineCapabilities: MachineMoldCapability[];
  onSaveKnowledge: (knowledge: Omit<CustomKnowledge, 'id' | 'updatedAt'>, id?: string) => void;
  onDeleteKnowledge: (id: string) => void;
}

const CATEGORIES = ['ทั่วไป', 'เครื่องจักร', 'คุณภาพ (QC)', 'ความปลอดภัย', 'กระบวนการผลิต', 'อื่นๆ'];

export const AiKnowledgeBase: React.FC<AiKnowledgeBaseProps> = ({ 
  customKnowledge, 
  inventory,
  boms,
  productSpecs,
  machineCapabilities,
  onSaveKnowledge, 
  onDeleteKnowledge 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('ทั้งหมด');
  const [isAddingKnowledge, setIsAddingKnowledge] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTopic, setNewTopic] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('ทั่วไป');
  const [newTags, setNewTags] = useState('');
  const [newLinkedData, setNewLinkedData] = useState<NonNullable<CustomKnowledge['linkedData']>>([]);
  const [newFiles, setNewFiles] = useState<NonNullable<CustomKnowledge['files']>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [linkSearchTerm, setLinkSearchTerm] = useState('');
  const [linkType, setLinkType] = useState<'Machine' | 'Product' | 'Inventory' | 'BOM'>('Machine');

  const filteredKnowledge = customKnowledge.filter(k => {
    const matchesSearch = (k.topic || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
                          (k.content || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
                          (k.tags && k.tags.some(t => (t || '').toLowerCase().includes((searchTerm || '').toLowerCase())));
    const matchesCategory = filterCategory === 'ทั้งหมด' || k.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setIsUploading(true);
    try {
      const files = Array.from(e.target.files) as File[];
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      
      const results: { file: File, url: string, extractedText: string }[] = [];
      
      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        let url = '';
        
        if (file.size < 700000) {
          const toBase64 = (f: File) => new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(f);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
          });
          url = await toBase64(file);
        } else {
          // Chunked
          const chunkSize = 500000;
          const totalChunks = Math.ceil(file.size / chunkSize);
          const fileId = `KNOW-${Date.now()}-${index}`;
          
          for (let i = 0; i < totalChunks; i++) {
            const chunk = file.slice(i * chunkSize, (i + 1) * chunkSize);
            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.readAsDataURL(chunk);
              reader.onload = () => {
                const result = reader.result as string;
                const base64Data = result.includes(',') ? result.split(',')[1] : result;
                resolve(base64Data);
              };
              reader.onerror = reject;
            });
            
            await setDoc(doc(db, 'document_chunks', `${fileId}_${i}`), {
              docId: fileId,
              chunkIndex: i,
              data: base64
            });
            
            // Add a small delay to prevent overwhelming Firestore write queue
            await delay(150);
          }
          url = `firestore-chunked://${fileId}|${totalChunks}|${file.type}`;
        }
        
        // 2. Extract text from file
        const extractedText = await extractTextFromFile(file);
        
        results.push({ file, url, extractedText });
      }

      let combinedContent = '';
      const newFilesList: { name: string; url: string; type: string; size: number }[] = [];

      for (const result of results) {
        const { file, url, extractedText } = result;
        if (extractedText && extractedText.trim() !== '' && !extractedText.startsWith('[File uploaded:')) {
          combinedContent += (combinedContent ? '\n\n' : '') + `--- เนื้อหาจากไฟล์ ${file.name} ---\n` + extractedText;
        }
        newFilesList.push({
          name: file.name,
          url,
          type: file.type || file.name.split('.').pop() || 'unknown',
          size: file.size
        });
      }

      setNewContent(prev => prev + (prev && combinedContent ? '\n\n' : '') + combinedContent);
      setNewFiles(prev => [...prev, ...newFilesList]);
      
    } catch (error: any) {
      console.error("Error uploading file:", error);
      if (error.message === "CORS_TIMEOUT") {
        alert("การอัปโหลดใช้เวลานานผิดปกติ อาจเกิดจากไม่ได้ตั้งค่า CORS ใน Firebase Storage หรือไฟล์มีขนาดใหญ่เกินไป\n\nวิธีแก้: กรุณาติดต่อผู้ดูแลระบบเพื่อตั้งค่า CORS");
      } else {
        alert("เกิดข้อผิดพลาดในการอัปโหลดไฟล์");
      }
    } finally {
      setIsUploading(false);
      // Reset file input
      if (e.target) e.target.value = '';
    }
  };

  const handleDownloadFile = async (file: { name: string, url: string, type: string }) => {
    if (file.url.startsWith('firestore-chunked://')) {
      try {
        const parts = file.url.replace('firestore-chunked://', '').split('|');
        const docId = parts[0];
        const totalChunks = parseInt(parts[1], 10);
        const mimeType = parts[2] || 'application/octet-stream';
        
        let fullBase64 = '';
        for (let i = 0; i < totalChunks; i++) {
          const chunkDoc = await getDoc(doc(db, 'document_chunks', `${docId}_${i}`));
          if (chunkDoc.exists()) {
            fullBase64 += chunkDoc.data().data;
          }
        }
        
        const dataUrl = `data:${mimeType};base64,${fullBase64}`;
        
        const a = window.document.createElement('a');
        a.href = dataUrl;
        a.download = file.name;
        window.document.body.appendChild(a);
        a.click();
        window.document.body.removeChild(a);
      } catch (error) {
        console.error("Error downloading chunked file:", error);
        alert("เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์");
      }
    } else {
      window.open(file.url, '_blank');
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setNewTopic('');
    setNewContent('');
    setNewCategory('ทั่วไป');
    setNewTags('');
    setNewLinkedData([]);
    setNewFiles([]);
    setLinkSearchTerm('');
    setIsAddingKnowledge(true);
  };

  const handleOpenEdit = (k: CustomKnowledge) => {
    setEditingId(k.id);
    setNewTopic(k.topic);
    setNewContent(k.content);
    setNewCategory(k.category || 'ทั่วไป');
    setNewTags(k.tags ? k.tags.join(', ') : '');
    setNewLinkedData(k.linkedData || []);
    setNewFiles(k.files || []);
    setLinkSearchTerm('');
    setIsAddingKnowledge(true);
  };

  const handleSave = () => {
    if (!newTopic.trim() || !newContent.trim()) return;
    
    const tagsArray = newTags.split(',').map(t => t.trim()).filter(t => t !== '');
    
    // Check if topic already exists (when adding new)
    if (!editingId) {
      const existing = customKnowledge.find(k => (k.topic || '').toLowerCase() === (newTopic || '').toLowerCase());
      if (existing) {
        // Append to existing
        onSaveKnowledge({
          topic: existing.topic,
          content: existing.content + '\n\n' + newContent,
          category: newCategory,
          tags: tagsArray,
          linkedData: [...(existing.linkedData || []), ...newLinkedData].filter((v, i, a) => a.findIndex(t => (t.id === v.id && t.type === v.type)) === i),
          files: [...(existing.files || []), ...newFiles].filter((v, i, a) => a.findIndex(t => t.url === v.url) === i)
        }, existing.id);
      } else {
        // Create new
        onSaveKnowledge({ 
          topic: newTopic, 
          content: newContent,
          category: newCategory,
          tags: tagsArray,
          linkedData: newLinkedData,
          files: newFiles
        });
      }
    } else {
      // Update existing
      onSaveKnowledge({ 
        topic: newTopic, 
        content: newContent,
        category: newCategory,
        tags: tagsArray,
        linkedData: newLinkedData,
        files: newFiles
      }, editingId);
    }

    setNewTopic('');
    setNewContent('');
    setNewCategory('ทั่วไป');
    setNewTags('');
    setNewLinkedData([]);
    setNewFiles([]);
    setIsAddingKnowledge(false);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลนี้?')) {
      onDeleteKnowledge(id);
    }
  };

  return (
    <div className="space-y-6 font-kanit">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50 flex-wrap gap-4">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <BrainCircuit size={24}/>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">คลังความรู้ AI (AI Knowledge Base)</h2>
                <p className="text-sm text-slate-500">ข้อมูลและกฎเกณฑ์ที่ AI เรียนรู้จากผู้ใช้งาน</p>
              </div>
           </div>
           <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
              <div className="flex bg-white rounded-lg border border-slate-200 p-1">
                {['ทั้งหมด', ...CATEGORIES].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      filterCategory === cat 
                        ? 'bg-indigo-50 text-indigo-700' 
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="ค้นหาหัวข้อ เนื้อหา หรือแท็ก..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <button 
                onClick={handleOpenAdd}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 w-full md:w-auto justify-center"
              >
                <Plus size={16} />
                เพิ่มข้อมูลให้ AI
              </button>
           </div>
        </div>

        <div className="p-5 bg-slate-50/50 min-h-[400px]">
          {filteredKnowledge.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredKnowledge.map((k) => (
                <div key={k.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow relative group flex flex-col h-full">
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button onClick={() => handleOpenEdit(k)} className="text-slate-400 hover:text-indigo-600 p-1 bg-white rounded-md shadow-sm border border-slate-100">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(k.id)} className="text-slate-400 hover:text-red-600 p-1 bg-white rounded-md shadow-sm border border-slate-100">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <h3 className="font-bold text-slate-800 mb-2 pr-16 flex items-center gap-2">
                    <BookOpen size={16} className="text-indigo-500 shrink-0" />
                    <span className="truncate">{k.topic}</span>
                  </h3>
                  {k.category && (
                    <div className="mb-3">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
                        <Folder size={12} />
                        {k.category}
                      </span>
                    </div>
                  )}
                  <div className="text-sm text-slate-600 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-100 flex-1 overflow-y-auto max-h-48 mb-3">
                    {k.content}
                  </div>
                  {k.tags && k.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {k.tags.map((tag, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-medium border border-indigo-100">
                          <Tag size={10} />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {k.linkedData && k.linkedData.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {k.linkedData.map((link, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200" title={`Linked to ${link.type}`}>
                          <LinkIcon size={10} className="text-slate-400" />
                          {link.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {k.files && k.files.length > 0 && (
                    <div className="flex flex-col gap-1 mb-3">
                      <span className="text-xs font-medium text-slate-500 mb-1">ไฟล์แนบ:</span>
                      <div className="flex flex-wrap gap-2">
                        {k.files.map((file, idx) => (
                          <button 
                            key={idx} 
                            onClick={() => handleDownloadFile(file)} 
                            className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md text-xs hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors"
                          >
                            {file.type.includes('image') ? <ImageIcon size={12} className="text-blue-500" /> : 
                             file.type.includes('pdf') ? <FileText size={12} className="text-red-500" /> : 
                             <FileIcon size={12} className="text-slate-500" />}
                            <span className="truncate max-w-[120px]">{file.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-auto text-[10px] text-slate-400 flex justify-between items-center pt-3 border-t border-slate-100">
                    <span>อัปเดตล่าสุด: {formatDateTime(k.updatedAt)}</span>
                    {k.createdBy && <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{k.createdBy}</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 italic flex flex-col items-center justify-center h-full">
              <BrainCircuit size={48} className="mb-4 opacity-20" />
              <p className="text-lg text-slate-500 mb-2">ยังไม่มีข้อมูลความรู้ในระบบ</p>
              <p className="text-sm">เพิ่มข้อมูลเพื่อให้ AI ช่วยเหลือคุณได้แม่นยำขึ้น เช่น กฎการทำงาน หรือข้อควรระวัง</p>
              <button 
                onClick={handleOpenAdd}
                className="mt-6 text-indigo-600 hover:text-indigo-700 font-medium text-sm flex items-center gap-1"
              >
                <Plus size={16} /> เริ่มเพิ่มข้อมูลแรกของคุณ
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Knowledge Modal */}
      {isAddingKnowledge && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <BrainCircuit size={24} className="text-indigo-600" />
                {editingId ? 'แก้ไขข้อมูลความรู้' : 'เพิ่มข้อมูลความรู้ให้ AI'}
              </h2>
              <button 
                onClick={() => setIsAddingKnowledge(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              {!editingId && (
                <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm flex items-start gap-2 border border-blue-100">
                  <BookOpen size={16} className="mt-0.5 shrink-0" />
                  <p>หากคุณเพิ่มข้อมูลใน <strong>หัวข้อ (Topic)</strong> ที่มีอยู่แล้ว ระบบจะนำเนื้อหาใหม่ไป <strong>ต่อท้าย</strong> ข้อมูลเดิมโดยอัตโนมัติ</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">หมวดหมู่ (Category)</label>
                <select 
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">หัวข้อ (Topic)</label>
                <input 
                  type="text" 
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="เช่น กฎการเปลี่ยนแม่พิมพ์, ข้อควรระวังเครื่อง IP1"
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">รายละเอียด (Content)</label>
                <textarea 
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="พิมพ์ข้อมูลที่คุณต้องการให้ AI จดจำ..."
                  rows={6}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
                />
              </div>
              
              {/* File Upload Section */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Upload size={16} className="text-indigo-500" /> 
                  แนบไฟล์ (PDF, Excel, Word, รูปภาพ)
                </label>
                <p className="text-xs text-slate-500 mb-3">ระบบจะพยายามดึงข้อความจากไฟล์มาใส่ในรายละเอียดให้อัตโนมัติ เพื่อให้ AI อ่านได้</p>
                
                <div className="flex flex-wrap gap-3 mb-3">
                  {newFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-lg text-sm shadow-sm">
                      {file.type.includes('image') ? <ImageIcon size={16} className="text-blue-500" /> : 
                       file.type.includes('pdf') ? <FileText size={16} className="text-red-500" /> : 
                       <FileIcon size={16} className="text-slate-500" />}
                      <button 
                        type="button"
                        onClick={() => handleDownloadFile(file)} 
                        className="text-indigo-600 hover:underline truncate max-w-[150px] text-left"
                      >
                        {file.name}
                      </button>
                      <button 
                        type="button"
                        onClick={() => setNewFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-red-500 ml-1"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                
                <div className="relative">
                  <input 
                    type="file" 
                    id="knowledge-file-upload"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg"
                    multiple
                  />
                  <label 
                    htmlFor="knowledge-file-upload"
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 bg-white text-slate-700 cursor-pointer hover:bg-slate-50 transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isUploading ? (
                      <><Loader2 size={16} className="animate-spin" /> กำลังอัปโหลดและประมวลผล...</>
                    ) : (
                      <><Plus size={16} /> เลือกไฟล์</>
                    )}
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">แท็ก (Tags) <span className="text-slate-400 font-normal">- คั่นด้วยเครื่องหมายจุลภาค (,)</span></label>
                <input 
                  type="text" 
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="เช่น IP1, ความปลอดภัย, แม่พิมพ์"
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <div className="border-t border-slate-100 pt-4 mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <LinkIcon size={16} /> เชื่อมโยงกับข้อมูลหลัก (Data Linking)
                </label>
                
                {/* Current Links */}
                {newLinkedData.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {newLinkedData.map((link, idx) => (
                      <div key={idx} className="flex items-center gap-1 bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg text-xs">
                        <span className="font-medium text-slate-600">{link.type}:</span>
                        <span className="text-slate-800">{link.name}</span>
                        <button 
                          onClick={() => setNewLinkedData(prev => prev.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-red-500 ml-1"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Link Controls */}
                <div className="flex gap-2 mb-2">
                  <select 
                    value={linkType}
                    onChange={(e) => setLinkType(e.target.value as any)}
                    className="p-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500"
                  >
                    <option value="Machine">เครื่องจักร (Machine)</option>
                    <option value="Product">สินค้า (Product Spec)</option>
                    <option value="Inventory">วัตถุดิบ (Inventory)</option>
                    <option value="BOM">สูตรการผลิต (BOM)</option>
                  </select>
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                      type="text"
                      placeholder="ค้นหาเพื่อเชื่อมโยง..."
                      value={linkSearchTerm}
                      onChange={(e) => setLinkSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Search Results */}
                {linkSearchTerm && (
                  <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg bg-white shadow-sm">
                    {linkType === 'Machine' && Array.from<string>(new Set(machineCapabilities.map(m => m.machineGroup)))
                      .filter(m => (m || '').toLowerCase().includes((linkSearchTerm || '').toLowerCase()))
                      .map(m => (
                      <div 
                        key={m}
                        onClick={() => {
                          if (!newLinkedData.find(l => l.type === 'Machine' && l.id === m)) {
                            setNewLinkedData(prev => [...prev, { type: 'Machine', id: m, name: m }]);
                          }
                          setLinkSearchTerm('');
                        }}
                        className="p-2 hover:bg-slate-50 cursor-pointer text-sm border-b border-slate-100 last:border-0"
                      >
                        {m}
                      </div>
                    ))}
                    
                    {linkType === 'Product' && productSpecs
                      .filter(p => (p.code || '').toLowerCase().includes((linkSearchTerm || '').toLowerCase()) || (p.name || '').toLowerCase().includes((linkSearchTerm || '').toLowerCase()))
                      .map(p => (
                      <div 
                        key={p.code}
                        onClick={() => {
                          if (!newLinkedData.find(l => l.type === 'Product' && l.id === p.code)) {
                            setNewLinkedData(prev => [...prev, { type: 'Product', id: p.code, name: `${p.code} - ${p.name}` }]);
                          }
                          setLinkSearchTerm('');
                        }}
                        className="p-2 hover:bg-slate-50 cursor-pointer text-sm border-b border-slate-100 last:border-0"
                      >
                        {p.code} - {p.name}
                      </div>
                    ))}

                    {linkType === 'Inventory' && inventory
                      .filter(i => (i.code || '').toLowerCase().includes((linkSearchTerm || '').toLowerCase()) || (i.name || '').toLowerCase().includes((linkSearchTerm || '').toLowerCase()))
                      .map(i => (
                      <div 
                        key={i.id}
                        onClick={() => {
                          if (!newLinkedData.find(l => l.type === 'Inventory' && l.id === i.id)) {
                            setNewLinkedData(prev => [...prev, { type: 'Inventory', id: i.id, name: `${i.code} - ${i.name}` }]);
                          }
                          setLinkSearchTerm('');
                        }}
                        className="p-2 hover:bg-slate-50 cursor-pointer text-sm border-b border-slate-100 last:border-0"
                      >
                        {i.code} - {i.name}
                      </div>
                    ))}

                    {linkType === 'BOM' && boms
                      .filter(b => (b.productItem || '').toLowerCase().includes((linkSearchTerm || '').toLowerCase()))
                      .map(b => (
                      <div 
                        key={b.id || b.productItem}
                        onClick={() => {
                          if (!newLinkedData.find(l => l.type === 'BOM' && l.id === (b.id || b.productItem))) {
                            setNewLinkedData(prev => [...prev, { type: 'BOM', id: b.id || b.productItem, name: b.productItem }]);
                          }
                          setLinkSearchTerm('');
                        }}
                        className="p-2 hover:bg-slate-50 cursor-pointer text-sm border-b border-slate-100 last:border-0"
                      >
                        {b.productItem}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setIsAddingKnowledge(false)}
                className="px-6 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors"
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleSave}
                disabled={!newTopic.trim() || !newContent.trim()}
                className="px-6 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                บันทึกข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
