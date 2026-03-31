import React, { useState, useRef, useEffect } from 'react';
import { AppDocument } from '../types';
import { FileText, Upload, Trash2, Search, FileSpreadsheet, File as FileIcon, Eye, BrainCircuit, X, Download } from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import * as XLSX from 'xlsx';

interface DocumentCenterProps {
  onAnalyzeFile: (file: AppDocument) => void;
}

export const DocumentCenter: React.FC<DocumentCenterProps> = ({ onAnalyzeFile }) => {
  const [documents, setDocuments] = useState<AppDocument[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewDoc, setPreviewDoc] = useState<AppDocument | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'documents'), orderBy('uploadedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docsData: AppDocument[] = [];
      snapshot.forEach((doc) => {
        docsData.push({ id: doc.id, ...doc.data() } as AppDocument);
      });
      setDocuments(docsData);
    });
    return () => unsubscribe();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(10); // Show initial progress

    try {
      // 1. Extract content for AI (if possible)
      let parsedContent = '';
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
        parsedContent = await parseExcel(file);
      } else if (file.name.endsWith('.txt')) {
        parsedContent = await file.text();
      }
      
      setUploadProgress(40); // Parsing done

      // Limit parsed content size to avoid huge documents breaking the AI context
      if (parsedContent.length > 50000) {
        parsedContent = parsedContent.substring(0, 50000) + '\n...[ข้อมูลถูกตัดทอนเนื่องจากยาวเกินไป]...';
      }

      // 2. Determine upload method based on file size
      let downloadURL = '';
      
      // If file is < 800KB, store as Base64 in Firestore to bypass CORS issues
      if (file.size < 800000) {
        const toBase64 = (f: File) => new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(f);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
        });
        downloadURL = await toBase64(file);
        setUploadProgress(80);
        
        // Save to Firestore directly
        const newDoc: AppDocument = {
          id: `DOC-${Date.now()}`,
          name: file.name,
          type: file.type || file.name.split('.').pop() || 'unknown',
          url: downloadURL,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          uploader: 'System User',
          parsedContent: parsedContent
        };

        await setDoc(doc(db, 'documents', newDoc.id), newDoc);
        
        setIsUploading(false);
        setUploadProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
        
      } else {
        // For larger files, use Firebase Storage with a timeout
        const storageRef = ref(storage, `documents/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        // Add a timeout to detect CORS/Network issues
        const timeoutId = setTimeout(() => {
          if (uploadTask.snapshot.state === 'running' && uploadTask.snapshot.bytesTransferred === 0) {
            uploadTask.cancel();
            alert("การอัปโหลดใช้เวลานานผิดปกติ อาจเกิดจากไม่ได้ตั้งค่า CORS ใน Firebase Storage หรือไฟล์มีขนาดใหญ่เกินไป\n\nวิธีแก้: กรุณาใช้ไฟล์ขนาดเล็กกว่า 800KB หรือติดต่อผู้ดูแลระบบเพื่อตั้งค่า CORS");
            setIsUploading(false);
            setUploadProgress(0);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }
        }, 15000); // 15 seconds timeout

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = 40 + ((snapshot.bytesTransferred / snapshot.totalBytes) * 50); // Scale from 40% to 90%
            setUploadProgress(progress);
          },
          (error) => {
            clearTimeout(timeoutId);
            console.error("Upload failed:", error);
            alert("เกิดข้อผิดพลาดในการอัปโหลดไฟล์ (อาจเกิดจาก CORS หรือขนาดไฟล์)");
            setIsUploading(false);
            setUploadProgress(0);
            if (fileInputRef.current) fileInputRef.current.value = '';
          },
          async () => {
            clearTimeout(timeoutId);
            // 3. Get URL and save to Firestore
            downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            
            const newDoc: AppDocument = {
              id: `DOC-${Date.now()}`,
              name: file.name,
              type: file.type || file.name.split('.').pop() || 'unknown',
              url: downloadURL,
              size: file.size,
              uploadedAt: new Date().toISOString(),
              uploader: 'System User',
              parsedContent: parsedContent
            };

            await setDoc(doc(db, 'documents', newDoc.id), newDoc);
            
            setIsUploading(false);
            setUploadProgress(0);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }
        );
      }
    } catch (error) {
      console.error("Error processing file:", error);
      alert("เกิดข้อผิดพลาดในการจัดการไฟล์");
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const parseExcel = async (file: File): Promise<string> => {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      return XLSX.utils.sheet_to_csv(worksheet);
    } catch (err) {
      console.error("Error parsing excel:", err);
      throw err;
    }
  };

  const handleDelete = async (document: AppDocument) => {
    if (!window.confirm(`คุณต้องการลบไฟล์ ${document.name} ใช่หรือไม่?`)) return;
    
    try {
      // Delete from Storage
      const fileRef = ref(storage, document.url);
      await deleteObject(fileRef).catch(err => console.log("Storage file might not exist, proceeding to delete doc", err));
      
      // Delete from Firestore
      await deleteDoc(doc(db, 'documents', document.id));
    } catch (error) {
      console.error("Error deleting document:", error);
      alert("เกิดข้อผิดพลาดในการลบไฟล์");
    }
  };

  const getFileIcon = (name: string) => {
    if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
      return <FileSpreadsheet className="text-emerald-500" size={24} />;
    }
    if (name.endsWith('.pdf')) {
      return <FileText className="text-red-500" size={24} />;
    }
    return <FileIcon className="text-blue-500" size={24} />;
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const filteredDocs = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 font-kanit">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ศูนย์เอกสาร (Document Center)</h1>
          <p className="text-slate-500">อัปโหลด จัดการ และให้ AI วิเคราะห์ไฟล์ข้อมูลของคุณ</p>
        </div>
        
        <div className="flex items-center gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            accept=".xlsx,.xls,.csv,.pdf,.txt,.doc,.docx"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium shadow-sm transition-colors disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                กำลังอัปโหลด {Math.round(uploadProgress)}%
              </>
            ) : (
              <>
                <Upload size={20} />
                อัปโหลดไฟล์
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="ค้นหาชื่อไฟล์..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="text-sm text-slate-500 font-medium">
            ทั้งหมด {filteredDocs.length} ไฟล์
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                <th className="px-6 py-3 font-medium">ชื่อไฟล์</th>
                <th className="px-6 py-3 font-medium">ขนาด</th>
                <th className="px-6 py-3 font-medium">วันที่อัปโหลด</th>
                <th className="px-6 py-3 font-medium text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <FileText size={48} className="text-slate-300 mb-4" />
                      <p className="text-lg font-medium text-slate-600">ไม่พบไฟล์เอกสาร</p>
                      <p className="text-sm mt-1">อัปโหลดไฟล์เพื่อเริ่มต้นใช้งาน</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {getFileIcon(doc.name)}
                        <div>
                          <p className="font-medium text-slate-800">{doc.name}</p>
                          <p className="text-xs text-slate-500 uppercase">{doc.type}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatBytes(doc.size)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(doc.uploadedAt).toLocaleString('th-TH')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setPreviewDoc(doc)}
                          className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                          title="ดูตัวอย่าง"
                        >
                          <Eye size={18} />
                        </button>
                        <a 
                          href={doc.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="ดาวน์โหลด"
                        >
                          <Download size={18} />
                        </a>
                        <button 
                          onClick={() => onAnalyzeFile(doc)}
                          className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="วิเคราะห์ด้วย AI"
                        >
                          <BrainCircuit size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(doc)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="ลบไฟล์"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                {getFileIcon(previewDoc.name)}
                <h2 className="text-lg font-bold text-slate-800">{previewDoc.name}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    onAnalyzeFile(previewDoc);
                    setPreviewDoc(null);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg text-sm font-medium transition-colors"
                >
                  <BrainCircuit size={16} />
                  วิเคราะห์ด้วย AI
                </button>
                <button 
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
              {previewDoc.parsedContent ? (
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-700 mb-3 border-b pb-2">ตัวอย่างข้อมูล (Text/CSV)</h3>
                  <pre className="text-xs font-mono text-slate-600 whitespace-pre-wrap overflow-x-auto max-h-[60vh]">
                    {previewDoc.parsedContent}
                  </pre>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                  <FileText size={48} className="text-slate-300 mb-4" />
                  <p>ไม่สามารถแสดงตัวอย่างไฟล์ประเภทนี้ได้</p>
                  <a 
                    href={previewDoc.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-4 px-4 py-2 bg-brand-50 text-brand-600 rounded-lg hover:bg-brand-100 font-medium transition-colors"
                  >
                    ดาวน์โหลดเพื่อเปิดดู
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
