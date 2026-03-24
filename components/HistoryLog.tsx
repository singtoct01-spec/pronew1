
import React, { useState } from 'react';
import { AuditLog, AiMessage, ProductionJob } from '../types';
import { History, MessageSquare, Bot, User, Clock, FileText, RotateCcw, CheckCircle, ChevronDown, ChevronUp, Database, X, AlertTriangle } from 'lucide-react';

import { formatDateTime, formatTimeOnly } from '../utils/dateUtils';

interface HistoryLogProps {
  logs: AuditLog[];
  aiMessages: AiMessage[];
  onRevert: (log: AuditLog) => void;
  jobs: ProductionJob[];
}

export const HistoryLog: React.FC<HistoryLogProps> = ({ logs, aiMessages, onRevert, jobs }) => {
  const [activeTab, setActiveTab] = useState<'system' | 'ai'>('system');
  const [revertLog, setRevertLog] = useState<AuditLog | null>(null);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const formatDate = (isoStr: string) => {
    return formatDateTime(isoStr);
  };

  const handleRevertClick = (log: AuditLog) => {
    setRevertLog(log);
    setPassword('');
    setPasswordError(false);
  };

  const confirmRevert = () => {
    if (password === "kpbom-a0784") {
      if (revertLog) {
        onRevert(revertLog);
      }
      setRevertLog(null);
    } else {
      setPasswordError(true);
    }
  };

  const cancelRevert = () => {
    setRevertLog(null);
    setPassword('');
    setPasswordError(false);
  };

  const getLiveStatus = (action: any) => {
    if (!action || !action.data) return null;
    
    // BATCH_UPSERT
    if (action.type === 'BATCH_UPSERT' && Array.isArray(action.data)) {
      const jobOrders = action.data.map((j: any) => j.jobOrder).filter(Boolean);
      const liveJobs = jobs.filter(j => jobOrders.includes(j.jobOrder));
      return {
        _status: `พบข้อมูลในระบบ ${liveJobs.length} จาก ${jobOrders.length} รายการ`,
        liveData: liveJobs.map(j => ({ 
          jobOrder: j.jobOrder, 
          status: j.status, 
          actual: j.actualProduction, 
          target: j.totalProduction, 
          machine: j.machineId 
        }))
      };
    }
    
    // Single UPDATE or CREATE or updateJobStatus
    const jobOrder = action.data.jobOrder;
    if (jobOrder) {
      const liveJob = jobs.find(j => j.jobOrder === jobOrder);
      if (liveJob) {
        return {
          _status: 'พบข้อมูลในระบบ (Found)',
          liveData: { 
            jobOrder: liveJob.jobOrder, 
            status: liveJob.status, 
            actual: liveJob.actualProduction, 
            target: liveJob.totalProduction, 
            machine: liveJob.machineId 
          }
        };
      } else {
        return { _status: 'ไม่พบข้อมูลในระบบ (Not Found)' };
      }
    }
    
    // Fallback for other actions
    return action.data;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden font-kanit">
      <div className="p-5 border-b border-slate-200 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <History className="text-brand-600" />
            ประวัติการทำงาน & แชท AI
        </h2>
        <div className="flex bg-slate-100 p-1 rounded-lg">
            <button 
                onClick={() => setActiveTab('system')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'system' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                System Log
            </button>
            <button 
                onClick={() => setActiveTab('ai')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'ai' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <MessageSquare size={14} /> AI Chat
            </button>
        </div>
      </div>

      {activeTab === 'system' && (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-4">เวลา</th>
                        <th className="px-6 py-4">ผู้ใช้งาน</th>
                        <th className="px-6 py-4">การกระทำ</th>
                        <th className="px-6 py-4">รายละเอียด</th>
                        <th className="px-6 py-4 text-right">ย้อนกลับ</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {logs.length > 0 ? logs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 font-mono text-slate-500 whitespace-nowrap">
                                {formatDate(log.timestamp)}
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-700">
                                {log.user}
                            </td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                    log.action === 'CREATE' ? 'bg-emerald-100 text-emerald-700' :
                                    log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                                    log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                                    log.action === 'REVERT' ? 'bg-purple-100 text-purple-700' :
                                    'bg-slate-100 text-slate-600'
                                }`}>
                                    {log.action}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-slate-600">
                                {log.details}
                            </td>
                            <td className="px-6 py-4 text-right">
                                {log.snapshot && (
                                    <button 
                                        onClick={() => handleRevertClick(log)}
                                        className="text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ml-auto border border-purple-200 min-w-[60px]"
                                        title="ย้อนกลับข้อมูลไปที่จุดนี้"
                                    >
                                        <RotateCcw size={14} /> 
                                        <span className="leading-tight text-center">ย้อน<br/>กลับ</span>
                                    </button>
                                )}
                            </td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                ยังไม่มีประวัติการเปลี่ยนแปลง
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="p-4 bg-slate-50 min-h-[400px] max-h-[600px] overflow-y-auto space-y-4">
            {aiMessages.length > 0 ? aiMessages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'model' && (
                        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white shrink-0 mt-1">
                            <Bot size={16} />
                        </div>
                    )}
                    
                    <div className={`max-w-[70%] rounded-2xl p-4 shadow-sm ${
                        msg.role === 'user' 
                            ? 'bg-indigo-600 text-white rounded-tr-none' 
                            : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                    }`}>
                         {/* Header Info */}
                         <div className={`flex items-center gap-2 mb-2 text-[10px] font-medium ${msg.role === 'user' ? 'text-indigo-200 justify-end' : 'text-slate-500'}`}>
                            {msg.role === 'user' ? 'คุณ' : 'ProPlanner Brain'}
                         </div>

                         {/* Image */}
                         {msg.image && (
                            <div className="mb-2 rounded overflow-hidden border border-slate-200">
                                <img src={msg.image} alt="Upload" className="max-h-40 w-auto object-cover" />
                            </div>
                         )}
                         
                         {/* Text */}
                         <div className="whitespace-pre-wrap text-sm">{msg.text}</div>

                         {/* Action Log */}
                         {msg.actionProposal && !msg.verifiedAction && (
                             <div className={`mt-2 pt-2 border-t text-xs flex items-center gap-1 ${msg.role === 'user' ? 'border-indigo-500 text-indigo-200' : 'border-slate-100 text-slate-500'}`}>
                                <FileText size={12} />
                                <span>Action: {msg.actionProposal.type}</span>
                             </div>
                         )}

                         {/* Pending Function Calls Log */}
                         {msg.pendingFunctionCalls && !msg.verifiedAction && (
                             <div className={`mt-2 pt-2 border-t text-xs flex items-center gap-1 ${msg.role === 'user' ? 'border-indigo-500 text-indigo-200' : 'border-slate-100 text-slate-500'}`}>
                                <FileText size={12} />
                                <span>Pending: {msg.pendingFunctionCalls.length} actions</span>
                             </div>
                         )}

                         {/* Verified Action Card */}
                         {msg.verifiedAction && (
                           <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3 animate-in fade-in zoom-in-95 duration-200 text-slate-800">
                             <div className="flex items-start gap-2 mb-2">
                               <CheckCircle className="text-emerald-600 shrink-0" size={16} />
                               <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
                                 ดำเนินการแล้ว (Executed)
                               </span>
                             </div>
                             <details className="text-xs text-slate-600 bg-white rounded border border-emerald-100 mb-1 overflow-hidden">
                               <summary className="p-2 cursor-pointer font-medium hover:bg-slate-50 outline-none flex justify-between items-center">
                                 <span>ตรวจสอบข้อมูลจริงในระบบ (Verify Live Data)</span>
                                 <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Live</span>
                               </summary>
                               <div className="p-2 border-t border-emerald-100 font-mono overflow-x-auto max-h-48 bg-slate-50">
                                 {JSON.stringify(getLiveStatus(msg.verifiedAction), null, 2)}
                               </div>
                             </details>
                           </div>
                         )}

                         {/* Timestamp at bottom right */}
                         <div className={`text-[10px] mt-2 text-right ${msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400'}`}>
                            {msg.timestamp ? formatTimeOnly(msg.timestamp) : ''}
                         </div>
                    </div>

                    {msg.role === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 shrink-0 mt-1">
                            <User size={16} />
                        </div>
                    )}
                </div>
            )) : (
                <div className="text-center py-12 text-slate-400">
                    <Bot size={48} className="mx-auto mb-3 opacity-20" />
                    <p>ยังไม่มีประวัติการสนทนากับ AI</p>
                </div>
            )}
        </div>
      )}
      {/* Password Modal */}
      {revertLog && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-kanit">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <RotateCcw className="text-purple-600" size={20} />
                ยืนยันการย้อนกลับข้อมูล
              </h3>
              <button onClick={cancelRevert} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-1 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4 text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                <p className="text-sm">การย้อนกลับข้อมูลจะทำให้ข้อมูลปัจจุบันถูกแทนที่ด้วยข้อมูล ณ เวลา <strong>{formatDate(revertLog.timestamp)}</strong></p>
              </div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                กรุณาใส่รหัสผ่านเพื่อยืนยัน
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    confirmRevert();
                  }
                }}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:outline-none ${
                  passwordError 
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50' 
                    : 'border-slate-300 focus:ring-purple-500 focus:border-purple-500'
                }`}
                placeholder="รหัสผ่าน"
                autoFocus
              />
              {passwordError && (
                <p className="text-red-500 text-xs mt-1">รหัสผ่านไม่ถูกต้อง</p>
              )}
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={cancelRevert}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
              >
                ยกเลิก
              </button>
              <button 
                onClick={confirmRevert}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
              >
                ยืนยัน
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
