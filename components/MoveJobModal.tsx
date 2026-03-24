import React, { useState } from 'react';
import { ProductionJob } from '../types';
import { X, ArrowRightLeft, SplitSquareHorizontal, CheckCircle2 } from 'lucide-react';

interface MoveJobModalProps {
  job: ProductionJob;
  jobs: ProductionJob[];
  machines: string[];
  onClose: () => void;
  onUpdateJob: (job: ProductionJob) => void;
}

export const MoveJobModal: React.FC<MoveJobModalProps> = ({ job, jobs, machines, onClose, onUpdateJob }) => {
  const [actionType, setActionType] = useState<'move' | 'split'>('move');
  const [targetMachine, setTargetMachine] = useState(job.machineId);
  const [targetMold, setTargetMold] = useState(job.moldCode);
  
  const remainingQty = Math.max(0, job.totalProduction - (job.actualProduction || 0));
  const maxSplitQty = Math.max(1, remainingQty);
  
  const [splitQty, setSplitQty] = useState(Math.floor(maxSplitQty / 2) || 1);
  const [reason, setReason] = useState('');

  const uniqueMolds = Array.from(new Set(jobs.map(j => j.moldCode).filter(Boolean)));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (actionType === 'move') {
      onUpdateJob({
        ...job,
        machineId: targetMachine,
        moldCode: targetMold,
        remarks: reason ? `${job.remarks ? job.remarks + ' | ' : ''}ย้ายจาก ${job.machineId}: ${reason}` : job.remarks
      });
    } else {
      // Split job
      const remainingQty = job.totalProduction - splitQty;
      
      // Update current job
      onUpdateJob({
        ...job,
        totalProduction: remainingQty,
        remarks: `${job.remarks ? job.remarks + ' | ' : ''}แบ่งงาน ${splitQty} ชิ้น ไป ${targetMachine}`
      });
      
      // Create new job
      const newJobId = `JOB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      onUpdateJob({
        ...job,
        id: newJobId,
        machineId: targetMachine,
        moldCode: targetMold,
        totalProduction: splitQty,
        actualProduction: 0,
        remarks: `แบ่งงานมาจาก ${job.machineId} (${job.jobOrder})${reason ? ' | ' + reason : ''}`
      });
    }
    
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-kanit">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <ArrowRightLeft className="text-blue-600" size={20} />
            ย้ายเครื่อง / แบ่งงาน
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-1 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="mb-6 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <p className="text-sm text-slate-500 mb-1">งานปัจจุบัน:</p>
            <p className="font-bold text-slate-800">{job.productItem} ({job.jobOrder})</p>
            <div className="flex gap-4 mt-2 text-sm">
              <span className="text-slate-600">เครื่อง: <span className="font-bold">{job.machineId}</span></span>
              <span className="text-slate-600">แม่พิมพ์: <span className="font-bold">{job.moldCode}</span></span>
              <span className="text-slate-600">เป้าหมาย: <span className="font-bold">{job.totalProduction.toLocaleString()}</span></span>
            </div>
          </div>

          <form id="move-job-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-4 mb-4">
              <label className={`flex-1 flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${actionType === 'move' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-blue-200 text-slate-500'}`}>
                <input type="radio" name="actionType" value="move" checked={actionType === 'move'} onChange={() => setActionType('move')} className="sr-only" />
                <ArrowRightLeft size={24} className="mb-2" />
                <span className="font-bold">ย้ายงานทั้งหมด</span>
                <span className="text-xs opacity-80 text-center mt-1">ย้ายไปเครื่องอื่น/เปลี่ยนแม่พิมพ์</span>
              </label>
              
              <label className={`flex-1 flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${remainingQty <= 0 ? 'opacity-50 cursor-not-allowed border-slate-200 bg-slate-50' : actionType === 'split' ? 'border-blue-500 bg-blue-50 text-blue-700 cursor-pointer' : 'border-slate-200 hover:border-blue-200 text-slate-500 cursor-pointer'}`}>
                <input type="radio" name="actionType" value="split" checked={actionType === 'split'} onChange={() => setActionType('split')} className="sr-only" disabled={remainingQty <= 0} />
                <SplitSquareHorizontal size={24} className="mb-2" />
                <span className="font-bold">แบ่งงาน</span>
                <span className="text-xs opacity-80 text-center mt-1">แบ่งยอดผลิตไปเดินเครื่องอื่น</span>
                {remainingQty <= 0 && <span className="text-[10px] text-red-500 mt-1 font-bold">ยอดผลิตครบแล้ว</span>}
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">เครื่องจักรเป้าหมาย</label>
                <select 
                  value={targetMachine} 
                  onChange={e => setTargetMachine(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {machines.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">แม่พิมพ์เป้าหมาย</label>
                <input 
                  type="text" 
                  value={targetMold || ''} 
                  onChange={e => setTargetMold(e.target.value)}
                  list="mold-list-move"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="รหัสแม่พิมพ์"
                  required
                />
                <datalist id="mold-list-move">
                  {uniqueMolds.map(m => <option key={m} value={m} />)}
                </datalist>
              </div>
            </div>

            {actionType === 'split' && (
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mt-4">
                <label className="block text-sm font-bold text-blue-800 mb-2">จำนวนที่ต้องการแบ่งไปเครื่องใหม่</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="number" 
                    value={splitQty} 
                    onChange={e => setSplitQty(Math.min(Math.max(1, parseInt(e.target.value) || 0), maxSplitQty))}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg text-lg font-bold text-blue-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="1"
                    max={maxSplitQty}
                    required
                  />
                  <span className="text-blue-800 font-medium whitespace-nowrap">ชิ้น</span>
                </div>
                <div className="mt-2 text-sm text-blue-700 flex justify-between">
                  <span>เครื่องเดิมจะเหลือเป้าหมาย: <strong>{(job.totalProduction - splitQty).toLocaleString()}</strong></span>
                  <span>เครื่องใหม่จะได้เป้าหมาย: <strong>{splitQty.toLocaleString()}</strong></span>
                </div>
                {job.actualProduction > 0 && (
                  <div className="mt-1 text-xs text-blue-600">
                    * งานนี้ผลิตไปแล้ว {job.actualProduction.toLocaleString()} ชิ้น (ยอดคงเหลือที่แบ่งได้: {remainingQty.toLocaleString()} ชิ้น)
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">หมายเหตุ / เหตุผลการย้าย (ถ้ามี)</label>
              <input 
                type="text" 
                value={reason} 
                onChange={e => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="เช่น แม่พิมพ์มีปัญหา, เร่งด่วน"
              />
            </div>
          </form>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors">
            ยกเลิก
          </button>
          <button type="submit" form="move-job-form" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm">
            <CheckCircle2 size={16} />
            ยืนยันการ{actionType === 'move' ? 'ย้าย' : 'แบ่ง'}งาน
          </button>
        </div>
      </div>
    </div>
  );
};
