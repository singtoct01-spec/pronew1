import React, { useState } from 'react';
import { FileText, Copy, RefreshCw, Send, CheckCircle2, AlertCircle, Save, History, Trash2, ChevronRight } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { ProductionJob, DailyReportLog } from '../types';

interface DailyReportGeneratorProps {
  jobs: ProductionJob[];
  dailyReports: DailyReportLog[];
  onSaveReport: (rawText: string, generatedReport: string) => void;
  onDeleteReport: (id: string) => void;
}

export const DailyReportGenerator: React.FC<DailyReportGeneratorProps> = ({ jobs, dailyReports, onSaveReport, onDeleteReport }) => {
  const [rawText, setRawText] = useState('');
  const [generatedReport, setGeneratedReport] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const handleGenerate = async () => {
    if (!rawText.trim()) {
      setError('กรุณาวางข้อความที่ต้องการสรุป');
      return;
    }

    setIsGenerating(true);
    setError('');
    
    try {
      const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY || '';
      if (!apiKey) {
        setError('ไม่พบ API Key ในระบบ กรุณาตั้งค่า Environment Variable GEMINI_API_KEY');
        setIsGenerating(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const activeJobs = jobs.filter(j => j.status === 'Running' || j.status === 'Delayed');
      const capacityContext = activeJobs.map(j => `- เครื่อง ${j.machineId}: สินค้า ${j.productItem} (โมลด์ ${j.moldCode}) มีเป้าหมายการผลิต (Capacity/กะ) = ${j.capacityPerShift.toLocaleString()} ชิ้น`).join('\n');

      const prompt = `
คุณคือผู้ช่วยผู้จัดการโรงงานผลิต หน้าที่ของคุณคือการนำข้อความดิบที่ได้จากการแชทรายงานปัญหาและการผลิตในแต่ละวัน มาเรียบเรียงใหม่ให้เป็น "รายงานสรุปการผลิตประจำวัน" ที่อ่านง่าย เป็นมืออาชีพ และเหมาะสำหรับส่งให้ผู้บริหารหรือหัวหน้างานอ่านผ่าน LINE

ข้อมูลเป้าหมายการผลิต (Capacity ต่อกะ) ของแต่ละเครื่องในปัจจุบัน (ใช้อ้างอิงสำหรับการคำนวณงานตกแคป):
${capacityContext || 'ไม่มีข้อมูลเป้าหมายการผลิตในขณะนี้'}

ข้อความดิบ:
"""
${rawText}
"""

กรุณาจัดรูปแบบรายงานให้น่าอ่าน โดยแบ่งเป็นหัวข้อดังนี้ (ปรับเปลี่ยนได้ตามความเหมาะสมของข้อมูล):
1. 📊 สรุปภาพรวมการผลิต (ระบุวันที่และกะถ้ามี)
2. ⚠️ ปัญหาเครื่องจักรและการแก้ไข (ระบุเบอร์เครื่อง, ปัญหา, การแก้ไข)
   **สำคัญมาก:** ต้องระบุเวลาเริ่มแก้ไข - เวลาแก้ไขเสร็จ - และรวมเวลาที่ใช้แก้ไข (Downtime Duration) ให้ชัดเจนเสมอ หากมีข้อมูลในข้อความดิบ (เช่น เริ่ม 15.00 น. เสร็จ 16.00 น. ใช้เวลา 1 ชั่วโมง)
3. ❌ ปัญหาคุณภาพชิ้นงาน (ของเสีย, คราบขาว, งานนิ่ม ฯลฯ)
4. 📉 รายงานการตกแคป (ตกเป้าหมายการผลิต)
   - ให้นำข้อมูลจากข้อความดิบมาเปรียบเทียบกับ "ข้อมูลเป้าหมายการผลิต" ด้านบน
   - ระบุว่าเครื่องไหนตกแคป (ผลิตได้น้อยกว่าเป้าหมาย) และตกไปเท่าไหร่ (ถ้ามีข้อมูล)
5. 📈 สถานะการผลิต (งานเกินแผน, การจัดการกำลังคน, เครื่องที่เดินปกติ/จอด)
6. 📌 สรุปสาเหตุหลักของปัญหาในวันนี้

ใช้ Emoji ประกอบหัวข้อให้น่าสนใจ แต่อย่าใช้เยอะเกินไปจนดูไม่เป็นทางการ
ใช้ Bullet points เพื่อให้อ่านง่าย
ภาษาที่ใช้ต้องกระชับ ชัดเจน และเป็นทางการ
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      setGeneratedReport(response.text || '');
      setIsSaved(false);
    } catch (err) {
      console.error('Error generating report:', err);
      setError('เกิดข้อผิดพลาดในการสร้างรายงาน กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedReport);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSave = () => {
    if (!rawText || !generatedReport) return;
    onSaveReport(rawText, generatedReport);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const loadHistoryItem = (report: DailyReportLog) => {
    setRawText(report.rawText);
    setGeneratedReport(report.generatedReport);
    setShowHistory(false);
  };

  return (
    <div className="flex flex-col h-full space-y-4 relative">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-1">
            <FileText className="text-blue-600" />
            ผู้ช่วยสร้างรายงานประจำวัน (AI Daily Report)
          </h2>
          <p className="text-sm text-slate-500">
            วางข้อความแชทหรือบันทึกการทำงานประจำวันลงในช่องด้านซ้าย แล้วให้ AI ช่วยเรียบเรียงเป็นรายงานที่อ่านง่ายสำหรับส่งให้หัวหน้าผ่าน LINE
          </p>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${showHistory ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
        >
          <History size={18} />
          ประวัติรายงาน
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-[500px]">
        {/* Input Section */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <label className="block text-sm font-bold text-slate-700 mb-2">
            ข้อมูลดิบ / ข้อความแชท
          </label>
          <textarea
            className="flex-1 w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
            placeholder="วางข้อความที่นี่ เช่น: สรุปรายงานการผลิตประจำวันที่ 24 มีนาคม 2569 IP6 มีรายการตกแผน..."
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
          />
          {error && (
            <div className="mt-2 text-red-500 text-sm flex items-center gap-1">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !rawText.trim()}
            className="mt-4 w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="animate-spin" size={20} />
                กำลังประมวลผล...
              </>
            ) : (
              <>
                <Send size={20} />
                สร้างรายงานด้วย AI
              </>
            )}
          </button>
        </div>

        {/* Output Section */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-bold text-slate-700">
              รายงานที่เรียบเรียงแล้ว
            </label>
            <div className="flex gap-2">
              {generatedReport && (
                <>
                  <button
                    onClick={handleSave}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isSaved ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                    }`}
                  >
                    {isSaved ? <CheckCircle2 size={16} /> : <Save size={16} />}
                    {isSaved ? 'บันทึกแล้ว' : 'บันทึก'}
                  </button>
                  <button
                    onClick={handleCopy}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isCopied ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {isCopied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                    {isCopied ? 'คัดลอกแล้ว' : 'คัดลอก'}
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="flex-1 relative">
            {generatedReport ? (
              <textarea
                className="w-full h-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm bg-slate-50"
                value={generatedReport}
                onChange={(e) => setGeneratedReport(e.target.value)}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
                <FileText size={48} className="mb-2 opacity-20" />
                <p>รายงานจะแสดงที่นี่</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History Sidebar */}
      {showHistory && (
        <div className="absolute top-[80px] right-0 bottom-0 w-80 bg-white shadow-xl border-l border-slate-200 z-10 flex flex-col animate-in slide-in-from-right-8">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <History size={18} className="text-blue-600" />
              ประวัติรายงาน
            </h3>
            <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-600">
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {dailyReports.length > 0 ? (
              dailyReports.map((report) => (
                <div key={report.id} className="bg-white border border-slate-200 rounded-lg p-3 hover:border-blue-300 transition-colors group">
                  <div className="flex justify-between items-start mb-2">
                    <div 
                      className="cursor-pointer flex-1"
                      onClick={() => loadHistoryItem(report)}
                    >
                      <div className="text-xs text-slate-500 mb-1">
                        {new Date(report.date).toLocaleString('th-TH', { 
                          year: 'numeric', month: 'short', day: 'numeric', 
                          hour: '2-digit', minute: '2-digit' 
                        })}
                      </div>
                      <div className="text-sm font-medium text-slate-800 line-clamp-2">
                        {report.rawText.substring(0, 60)}...
                      </div>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDeleteReport(report.id); }}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                      title="ลบรายงาน"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center p-6 text-slate-400 text-sm">
                <History size={32} className="mx-auto mb-2 opacity-20" />
                ยังไม่มีประวัติรายงาน
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
