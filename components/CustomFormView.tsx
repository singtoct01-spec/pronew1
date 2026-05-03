import React, { useRef, useState } from 'react';
import { ArrowLeft, Printer, Save, Edit3, Check } from 'lucide-react';

interface CustomFormViewProps {
  html: string;
  title: string;
  id?: string;
  onBack: () => void;
  onSave?: (html: string, title: string) => void;
}

export const CustomFormView: React.FC<CustomFormViewProps> = ({ html, title, id, onBack, onSave }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formTitle, setFormTitle] = useState(title);

  const handleSave = () => {
    if (onSave && contentRef.current) {
      onSave(contentRef.current.innerHTML, formTitle);
      setIsEditing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 font-kanit">
      {/* Header - Hidden when printing */}
      <div className="bg-white border-b border-slate-200 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 shrink-0"
          >
            <ArrowLeft size={24} />
          </button>
          {isEditing ? (
            <input 
              type="text" 
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="text-xl font-bold text-slate-800 border-b-2 border-brand-500 bg-slate-50 px-2 py-1 focus:outline-none w-full"
              placeholder="ชื่อแบบฟอร์ม"
            />
          ) : (
            <h1 className="text-xl font-bold text-slate-800 break-words line-clamp-2">{formTitle}</h1>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {onSave && (
            <>
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm ${isEditing ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'}`}
              >
                <Edit3 size={18} />
                <span className="hidden sm:inline">{isEditing ? 'ยกเลิกแก้ไข' : 'แก้ไขฟอร์ม'}</span>
              </button>
              
              <button 
                onClick={handleSave}
                disabled={!isEditing && !!id} // If it has ID, only save when editing. If no ID, it's new, can always save
                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm ${(!isEditing && !!id) ? 'bg-slate-100 text-slate-400' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
              >
                <Save size={18} />
                <span className="hidden sm:inline">{id ? 'บันทึกการแก้ไข' : 'บันทึกเป็นฟอร์มมาตรฐาน'}</span>
              </button>
            </>
          )}
          <button 
            onClick={() => window.print()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 md:px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
          >
            <Printer size={18} />
            <span className="hidden sm:inline">พิมพ์เอกสาร</span>
          </button>
        </div>
      </div>

      {/* Document Container */}
      <div className="p-4 sm:p-8 print:p-0 flex justify-center">
        <div className="bg-white shadow-xl print:shadow-none w-full max-w-[210mm] min-h-[297mm] p-6 sm:p-8 print:p-0">
          
          {/* Excel-like Styles */}
          <style>{`
            .excel-like-content table {
              width: 100%;
              border-collapse: collapse;
              font-size: 14px;
              font-family: 'Kanit', sans-serif;
            }
            .excel-like-content th, .excel-like-content td {
              border: 1px solid #cbd5e1;
              padding: 6px 10px;
              vertical-align: middle;
            }
            .excel-like-content th {
              background-color: #f1f5f9;
              font-weight: 600;
              text-align: center;
              color: #334155;
            }
            .excel-like-content h1 { font-size: 24px; font-weight: bold; margin-bottom: 16px; text-align: center; }
            .excel-like-content h2 { font-size: 18px; font-weight: bold; margin-bottom: 12px; }
            .excel-like-content p { margin-bottom: 8px; }
            .excel-like-content [contenteditable="true"] { outline: 2px dashed #93c5fd; outline-offset: 2px; }
            .excel-like-content [contenteditable="true"]:focus { outline: 2px solid #3b82f6; background-color: #f8fafc; }
            
            /* Utility classes for the AI to use */
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .bg-gray { background-color: #f3f4f6; }
            .no-border { border: none !important; }
            .border-bottom { border-bottom: 1px solid #000 !important; border-top: none !important; border-left: none !important; border-right: none !important; }
          `}</style>
          
          {isEditing && (
            <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm flex gap-2 items-start border border-blue-200">
              <Edit3 size={16} className="mt-0.5 shrink-0" />
              <span>โหมดแก้ไข: คุณสามารถคลิกที่ข้อความหรือตารางด้านล่างเพื่อพิมพ์แก้ไขได้โดยตรง เมื่อแก้ไขเสร็จแล้วให้กดปุ่ม 'บันทึกการแก้ไข' ด้านบน</span>
            </div>
          )}

          {/* Render the HTML */}
          <div 
            ref={contentRef}
            className="w-full h-full excel-like-content"
            contentEditable={isEditing}
            suppressContentEditableWarning={true}
            dangerouslySetInnerHTML={{ __html: html }} 
          />
        </div>
      </div>
    </div>
  );
};

