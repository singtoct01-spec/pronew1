import React, { useState, useRef, useEffect } from 'react';
import { AppDocument } from '../types';
import { FileText, Upload, Trash2, Search, FileSpreadsheet, File as FileIcon, Eye, BrainCircuit, X, Download } from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy, getDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Set worker path for pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const SpreadsheetViewer: React.FC<{ csvContent: string }> = ({ csvContent }) => {
  const [data, setData] = useState<any[][]>([]);

  useEffect(() => {
    try {
      const workbook = XLSX.read(csvContent, { type: 'string' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
      setData(jsonData);
    } catch (error) {
      console.error("Error parsing CSV for viewer:", error);
    }
  }, [csvContent]);

  if (!data || data.length === 0) return <div>กำลังโหลดข้อมูล...</div>;

  return (
    <div className="overflow-auto border border-slate-300 rounded bg-white max-h-[65vh]">
      <table className="w-full border-collapse text-sm whitespace-nowrap">
        <thead>
          <tr>
            <th className="bg-slate-100 border border-slate-300 px-3 py-1 text-center text-slate-500 font-normal w-10 sticky top-0 z-10"></th>
            {Array.from({ length: Math.max(...data.map(row => row.length)) }).map((_, i) => (
              <th key={i} className="bg-slate-100 border border-slate-300 px-3 py-1 text-center text-slate-700 font-medium sticky top-0 z-10">
                {String.fromCharCode(65 + (i % 26))}
                {i >= 26 ? Math.floor(i / 26) : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-blue-50/50">
              <td className="bg-slate-100 border border-slate-300 px-2 py-1 text-center text-slate-500 font-normal sticky left-0 z-10">
                {rowIndex + 1}
              </td>
              {Array.from({ length: Math.max(...data.map(r => r.length)) }).map((_, colIndex) => (
                <td key={colIndex} className="border border-slate-200 px-3 py-1.5 text-slate-800">
                  {row[colIndex] !== undefined && row[colIndex] !== null ? String(row[colIndex]) : ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

interface DocumentCenterProps {
  onAnalyzeFile: (file: AppDocument) => void;
}

export const DocumentCenter: React.FC<DocumentCenterProps> = ({ onAnalyzeFile }) => {
  const [documents, setDocuments] = useState<AppDocument[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewDoc, setPreviewDoc] = useState<AppDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [isSavingText, setIsSavingText] = useState(false);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<AppDocument | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveText = async () => {
    if (!previewDoc) return;
    setIsSavingText(true);
    try {
      await setDoc(doc(db, 'documents', previewDoc.id), {
        ...previewDoc,
        parsedContent: editedText
      });
      setPreviewDoc({ ...previewDoc, parsedContent: editedText });
      setIsEditingText(false);
      alert('บันทึกการแก้ไขเรียบร้อยแล้ว');
    } catch (error) {
      console.error("Error saving text:", error);
      alert('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setIsSavingText(false);
    }
  };

  useEffect(() => {
    const loadPreview = async () => {
      if (!previewDoc) {
        setPreviewUrl(null);
        return;
      }

      setIsLoadingPreview(true);
      try {
        let url = previewDoc.url;
        if (url.startsWith('firestore-chunked://')) {
          const parts = url.replace('firestore-chunked://', '').split('|');
          const docId = parts[0];
          const totalChunks = parseInt(parts[1], 10);
          const mimeType = parts[2] || 'application/octet-stream';
          
          const byteNumbers: number[] = [];
          for (let i = 0; i < totalChunks; i++) {
            const chunkDoc = await getDoc(doc(db, 'document_chunks', `${docId}_${i}`));
            if (chunkDoc.exists()) {
              const chunkBase64 = chunkDoc.data().data;
              try {
                const byteCharacters = atob(chunkBase64);
                for (let j = 0; j < byteCharacters.length; j++) {
                  byteNumbers.push(byteCharacters.charCodeAt(j));
                }
              } catch (e) {
                console.error("Error decoding chunk", i, e);
              }
            }
          }
          
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: mimeType });
          url = URL.createObjectURL(blob);
        }
        setPreviewUrl(url);
      } catch (error) {
        console.error("Error loading preview URL:", error);
      } finally {
        setIsLoadingPreview(false);
      }
    };

    loadPreview();

    // Cleanup blob URL
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewDoc]);

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
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(10); // Show initial progress

    try {
      const fileArray = Array.from(files) as File[];
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      
      for (let index = 0; index < fileArray.length; index++) {
        const file = fileArray[index];
        
        // 1. Extract content for AI (if possible)
        let parsedContent = '';
        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
          parsedContent = await parseExcel(file);
        } else if (file.name.endsWith('.pdf')) {
          parsedContent = await parsePdf(file);
        } else if (file.name.endsWith('.txt')) {
          parsedContent = await file.text();
        }
        
        // Limit parsed content size to avoid huge documents breaking the AI context
        if (parsedContent.length > 50000) {
          parsedContent = parsedContent.substring(0, 50000) + '\n...[ข้อมูลถูกตัดทอนเนื่องจากยาวเกินไป]...';
        }

        // 2. Determine upload method based on file size
        let downloadURL = '';
        
        // If file is < 700KB, store as Base64 in Firestore
        if (file.size < 700000) {
          const toBase64 = (f: File) => new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(f);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
          });
          downloadURL = await toBase64(file);
          
          // Save to Firestore directly
          const newDoc: AppDocument = {
            id: `DOC-${Date.now()}-${index}`,
            name: file.name,
            type: file.type || file.name.split('.').pop() || 'unknown',
            url: downloadURL,
            size: file.size,
            uploadedAt: new Date().toISOString(),
            uploader: 'System User',
            parsedContent: parsedContent
          };

          await setDoc(doc(db, 'documents', newDoc.id), newDoc);
          
        } else {
          // For larger files, chunk them into multiple Firestore documents to bypass CORS
          const chunkSize = 500000; // 500KB binary -> ~666KB Base64
          const totalChunks = Math.ceil(file.size / chunkSize);
          const docId = `DOC-${Date.now()}-${index}`;
          
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
            
            await setDoc(doc(db, 'document_chunks', `${docId}_${i}`), {
              docId,
              chunkIndex: i,
              data: base64
            });
            
            // Add a small delay to prevent overwhelming Firestore write queue
            await delay(150);
          }
          
          downloadURL = `firestore-chunked://${docId}|${totalChunks}|${file.type}`;
          
          const newDoc: AppDocument = {
            id: docId,
            name: file.name,
            type: file.type || file.name.split('.').pop() || 'unknown',
            url: downloadURL,
            size: file.size,
            uploadedAt: new Date().toISOString(),
            uploader: 'System User',
            parsedContent: parsedContent
          };

          await setDoc(doc(db, 'documents', newDoc.id), newDoc);
        }
      }
      
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
    } catch (error: any) {
      console.error("Error processing files:", error);
      if (error.message === "CORS_TIMEOUT") {
        alert("การอัปโหลดใช้เวลานานผิดปกติ อาจเกิดจากไม่ได้ตั้งค่า CORS ใน Firebase Storage หรือไฟล์มีขนาดใหญ่เกินไป\n\nวิธีแก้: กรุณาใช้ไฟล์ขนาดเล็กกว่า 800KB หรือติดต่อผู้ดูแลระบบเพื่อตั้งค่า CORS");
      } else {
        alert("เกิดข้อผิดพลาดในการจัดการไฟล์");
      }
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const parsePdf = async (file: File): Promise<string> => {
    try {
      const buffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += `--- Page ${i} ---\n${pageText}\n\n`;
      }
      return fullText;
    } catch (err) {
      console.error("Error parsing pdf:", err);
      throw err;
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
    setDeleteConfirmDoc(document);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmDoc) return;
    
    try {
      // Delete from Storage
      if (!deleteConfirmDoc.url.startsWith('data:') && !deleteConfirmDoc.url.startsWith('firestore-chunked://')) {
        const fileRef = ref(storage, deleteConfirmDoc.url);
        await deleteObject(fileRef).catch(err => console.log("Storage file might not exist, proceeding to delete doc", err));
      }
      
      // If it's a chunked file, delete chunks
      if (deleteConfirmDoc.url.startsWith('firestore-chunked://')) {
        const parts = deleteConfirmDoc.url.replace('firestore-chunked://', '').split('|');
        const docId = parts[0];
        const totalChunks = parseInt(parts[1], 10);
        for (let i = 0; i < totalChunks; i++) {
          await deleteDoc(doc(db, 'document_chunks', `${docId}_${i}`));
        }
      }
      
      // Delete from Firestore
      await deleteDoc(doc(db, 'documents', deleteConfirmDoc.id));
      setDeleteConfirmDoc(null);
    } catch (error) {
      console.error("Error deleting document:", error);
      alert("เกิดข้อผิดพลาดในการลบไฟล์");
      setDeleteConfirmDoc(null);
    }
  };

  const handleDownload = async (docObj: AppDocument) => {
    try {
      let downloadUrl = docObj.url;
      
      if (docObj.url.startsWith('firestore-chunked://')) {
        const parts = docObj.url.replace('firestore-chunked://', '').split('|');
        const docId = parts[0];
        const totalChunks = parseInt(parts[1], 10);
        const mimeType = parts[2] || 'application/octet-stream';
        
        const byteNumbers: number[] = [];
        for (let i = 0; i < totalChunks; i++) {
          const chunkDoc = await getDoc(doc(db, 'document_chunks', `${docId}_${i}`));
          if (chunkDoc.exists()) {
            const chunkBase64 = chunkDoc.data().data;
            try {
              const byteCharacters = atob(chunkBase64);
              for (let j = 0; j < byteCharacters.length; j++) {
                byteNumbers.push(byteCharacters.charCodeAt(j));
              }
            } catch (e) {
              console.error("Error decoding chunk", i, e);
            }
          }
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });
        downloadUrl = URL.createObjectURL(blob);
      }
      
      const a = window.document.createElement('a');
      a.href = downloadUrl;
      a.download = docObj.name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      
      if (downloadUrl.startsWith('blob:')) {
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 100);
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      alert("เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์");
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
    (doc.name || '').toLowerCase().includes((searchTerm || '').toLowerCase())
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
            multiple
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
                        <button 
                          onClick={() => handleDownload(doc)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="ดาวน์โหลด"
                        >
                          <Download size={18} />
                        </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
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
                    setIsEditingText(false);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg text-sm font-medium transition-colors"
                >
                  <BrainCircuit size={16} />
                  วิเคราะห์ด้วย AI
                </button>
                <button 
                  onClick={() => handleDownload(previewDoc)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-sm font-medium transition-colors"
                >
                  <Download size={16} />
                  ดาวน์โหลด
                </button>
                <button 
                  onClick={() => {
                    setPreviewDoc(null);
                    setIsEditingText(false);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors ml-2"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-0 overflow-hidden flex-1 bg-slate-100 flex flex-col relative">
              {isLoadingPreview && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/80 backdrop-blur-sm">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-3"></div>
                    <p className="text-slate-600 font-medium">กำลังโหลดเอกสาร...</p>
                  </div>
                </div>
              )}

              {previewDoc.name.toLowerCase().endsWith('.pdf') ? (
                <div className="w-full h-full flex-1">
                  {previewUrl ? (
                    <iframe src={`${previewUrl}#toolbar=0`} className="w-full h-full border-0" title="PDF Preview" />
                  ) : null}
                </div>
              ) : previewDoc.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/) ? (
                <div className="w-full h-full flex-1 flex items-center justify-center p-8">
                  {previewUrl ? (
                    <img src={previewUrl} alt={previewDoc.name} className="max-w-full max-h-full object-contain shadow-md rounded" />
                  ) : null}
                </div>
              ) : previewDoc.parsedContent ? (
                <div className="w-full h-full p-6 overflow-y-auto">
                  <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm h-full flex flex-col">
                    <div className="flex justify-between items-center mb-3 border-b pb-2">
                      <h3 className="text-sm font-bold text-slate-700">
                        {previewDoc.name.endsWith('.xlsx') || previewDoc.name.endsWith('.xls') || previewDoc.name.endsWith('.csv') 
                          ? 'ตัวอย่างข้อมูล (Spreadsheet View)' 
                          : 'ตัวอย่างข้อมูล (Text)'}
                      </h3>
                      {!(previewDoc.name.endsWith('.xlsx') || previewDoc.name.endsWith('.xls') || previewDoc.name.endsWith('.csv')) && (
                        <div className="flex gap-2">
                          {isEditingText ? (
                            <>
                              <button 
                                onClick={() => setIsEditingText(false)}
                                className="px-3 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                              >
                                ยกเลิก
                              </button>
                              <button 
                                onClick={handleSaveText}
                                disabled={isSavingText}
                                className="px-3 py-1 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded transition-colors disabled:opacity-50"
                              >
                                {isSavingText ? 'กำลังบันทึก...' : 'บันทึก'}
                              </button>
                            </>
                          ) : (
                            <button 
                              onClick={() => {
                                setEditedText(previewDoc.parsedContent || '');
                                setIsEditingText(true);
                              }}
                              className="px-3 py-1 text-xs font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 rounded transition-colors"
                            >
                              แก้ไขข้อความ
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 overflow-hidden">
                      {previewDoc.name.endsWith('.xlsx') || previewDoc.name.endsWith('.xls') || previewDoc.name.endsWith('.csv') ? (
                        <SpreadsheetViewer csvContent={previewDoc.parsedContent} />
                      ) : (
                        <textarea 
                          className={`w-full h-full p-4 text-sm font-mono text-slate-700 border rounded-lg focus:outline-none resize-none ${isEditingText ? 'bg-white border-brand-300 ring-2 ring-brand-100' : 'bg-slate-50 border-slate-200'}`}
                          value={isEditingText ? editedText : previewDoc.parsedContent}
                          onChange={(e) => setEditedText(e.target.value)}
                          readOnly={!isEditingText}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <FileText size={64} className="text-slate-300 mb-4" />
                  <p className="text-lg font-medium text-slate-600">ไม่สามารถแสดงตัวอย่างไฟล์ประเภทนี้ได้</p>
                  <p className="text-sm mt-2">กรุณาดาวน์โหลดไฟล์เพื่อเปิดดูในเครื่องของคุณ</p>
                  <button 
                    onClick={() => handleDownload(previewDoc)}
                    className="mt-6 px-6 py-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium transition-colors shadow-sm flex items-center gap-2"
                  >
                    <Download size={18} />
                    ดาวน์โหลดไฟล์
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">ยืนยันการลบไฟล์</h2>
              <p className="text-slate-600 mb-6">คุณต้องการลบไฟล์ "{deleteConfirmDoc.name}" ใช่หรือไม่? การกระทำนี้ไม่สามารถเรียกคืนได้</p>
              <div className="flex gap-3 justify-center">
                <button 
                  onClick={() => setDeleteConfirmDoc(null)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors font-medium"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors font-medium"
                >
                  ยืนยันการลบ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
