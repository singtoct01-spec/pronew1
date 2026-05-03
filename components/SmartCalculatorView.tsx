import React, { useState, useEffect } from 'react';
import { Calculator, Clock, Calendar, Settings2, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { calculateProductionSchedule } from '../utils/productionCalculator';

export const SmartCalculatorView: React.FC = () => {
  const [targetQty, setTargetQty] = useState<number>(44800);
  const [ratePerHour, setRatePerHour] = useState<number>(800);
  const [startDateStr, setStartDateStr] = useState<string>(() => {
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 10);
  });
  const [startTimeStr, setStartTimeStr] = useState<string>("19:00");
  const [allowDayOT, setAllowDayOT] = useState<boolean>(false);
  const [allowNightOT, setAllowNightOT] = useState<boolean>(false);
  const [run24Hours, setRun24Hours] = useState<boolean>(false);

  const [result, setResult] = useState<{
    actualStartDate: Date;
    endDate: Date;
    workingMinutes: number;
    totalMinutes: number;
  } | null>(null);

  useEffect(() => {
    if (targetQty > 0 && ratePerHour > 0 && startDateStr && startTimeStr) {
      const start = new Date(`${startDateStr}T${startTimeStr}`);
      const res = calculateProductionSchedule(start, targetQty, ratePerHour, allowDayOT, allowNightOT, run24Hours);
      setResult(res);
    } else {
      setResult(null);
    }
  }, [targetQty, ratePerHour, startDateStr, startTimeStr, allowDayOT, allowNightOT, run24Hours]);

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }) + ' น.';
  };

  const formatDuration = (minutes: number) => {
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const mins = Math.round(minutes % 60);
    
    let parts = [];
    if (days > 0) parts.push(`${days} วัน`);
    if (hours > 0) parts.push(`${hours} ชั่วโมง`);
    if (mins > 0) parts.push(`${mins} นาที`);
    
    return parts.join(' ') || '0 นาที';
  };

  return (
    <div className="p-6 max-w-5xl mx-auto font-kanit">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Calculator className="text-brand-500" /> เครื่องมือคำนวณเวลาวางแผนผลิตอัจฉริยะ
        </h1>
        <p className="text-slate-500 mt-1">คำนวณเวลาเริ่มและเวลาจบงานอัตโนมัติ โดยหักเวลาพักและเวลา OT ตามเงื่อนไขของโรงงาน</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Form */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Settings2 size={20} className="text-slate-400" /> ข้อมูลการผลิต
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">ยอดผลิตที่ต้องการ (ชิ้น)</label>
                <input 
                  type="number" 
                  value={targetQty || ''}
                  onChange={(e) => setTargetQty(Number(e.target.value))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-lg font-medium text-brand-700"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">ความเร็วในการผลิต (ชิ้น/ชม.)</label>
                <input 
                  type="number" 
                  value={ratePerHour || ''}
                  onChange={(e) => setRatePerHour(Number(e.target.value))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-lg font-medium text-blue-700"
                />
                {ratePerHour > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    Cycle Time: {((3600 / ratePerHour)).toFixed(2)} วินาที/ชิ้น
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">เวลาเริ่มงาน (ตามแผน)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="date" 
                    value={startDateStr}
                    onChange={(e) => setStartDateStr(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none font-medium text-slate-700"
                  />
                  <input 
                    type="time" 
                    value={startTimeStr}
                    onChange={(e) => setStartTimeStr(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none font-medium text-slate-700"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="block text-sm font-bold text-slate-700 mb-3">รูปแบบการทำงาน</label>
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                    <div>
                      <span className="font-medium text-slate-800 block">เดินเครื่องตลอด 24 ชั่วโมง (No Break)</span>
                      <span className="text-xs text-slate-500">ไม่มีการหยุดพักเบรกใดๆ ทำงานต่อเนื่อง</span>
                    </div>
                    <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                      <input type="checkbox" checked={run24Hours} onChange={(e) => setRun24Hours(e.target.checked)} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer" style={{ right: run24Hours ? '0' : '1.5rem', borderColor: run24Hours ? '#10b981' : '#cbd5e1' }}/>
                      <label className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${run24Hours ? 'bg-emerald-500' : 'bg-slate-300'}`}></label>
                    </div>
                  </label>
                </div>
              </div>

              {!run24Hours && (
                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-sm font-bold text-slate-700 mb-3">เงื่อนไขการทำ OT</label>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                      <div>
                        <span className="font-medium text-slate-800 block">เปิดทำ OT กะเช้า</span>
                        <span className="text-xs text-slate-500">17:00 - 20:00 น. (3 ชม.)</span>
                      </div>
                      <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                        <input type="checkbox" checked={allowDayOT} onChange={(e) => setAllowDayOT(e.target.checked)} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer" style={{ right: allowDayOT ? '0' : '1.5rem', borderColor: allowDayOT ? '#10b981' : '#cbd5e1' }}/>
                        <label className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${allowDayOT ? 'bg-emerald-500' : 'bg-slate-300'}`}></label>
                      </div>
                    </label>

                    <label className="flex items-center justify-between p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                      <div>
                        <span className="font-medium text-slate-800 block">เปิดทำ OT กะดึก</span>
                        <span className="text-xs text-slate-500">05:00 - 08:00 น. (3 ชม.)</span>
                      </div>
                      <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                        <input type="checkbox" checked={allowNightOT} onChange={(e) => setAllowNightOT(e.target.checked)} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer" style={{ right: allowNightOT ? '0' : '1.5rem', borderColor: allowNightOT ? '#10b981' : '#cbd5e1' }}/>
                        <label className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${allowNightOT ? 'bg-emerald-500' : 'bg-slate-300'}`}></label>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-7">
          {result ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-full flex flex-col">
              <div className="bg-slate-800 p-6 text-white">
                <h2 className="text-xl font-bold flex items-center gap-2 mb-1">
                  <CheckCircle2 className="text-emerald-400" /> ผลการคำนวณ
                </h2>
                <p className="text-slate-300 text-sm">ระบบได้หักเวลาพักและเวลาที่ไม่ได้ทำ OT ออกให้แล้ว</p>
              </div>
              
              <div className="p-6 flex-1 flex flex-col justify-center">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div className="relative">
                    <div className="text-sm font-bold text-slate-500 mb-2 flex items-center gap-2">
                      <Calendar size={16} /> เวลาเริ่มเดินเครื่องจริง
                    </div>
                    <div className="text-xl font-bold text-slate-800 bg-slate-50 p-4 rounded-lg border border-slate-200">
                      {formatDateTime(result.actualStartDate)}
                    </div>
                    {result.actualStartDate.getTime() !== new Date(`${startDateStr}T${startTimeStr}`).getTime() && (
                      <div className="absolute -bottom-6 left-0 text-xs text-amber-600 flex items-center gap-1">
                        <AlertCircle size={12} /> เลื่อนจากแผนเนื่องจากติดช่วงพัก/ปิด OT
                      </div>
                    )}
                  </div>
                  
                  <div className="hidden md:flex items-center justify-center text-slate-300">
                    <ArrowRight size={32} />
                  </div>

                  <div>
                    <div className="text-sm font-bold text-brand-600 mb-2 flex items-center gap-2">
                      <Calendar size={16} /> เวลาจบงาน (คาดการณ์)
                    </div>
                    <div className="text-xl font-bold text-brand-700 bg-brand-50 p-4 rounded-lg border border-brand-200">
                      {formatDateTime(result.endDate)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-auto">
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <div className="text-sm text-slate-500 mb-1">เวลาเดินเครื่องสุทธิ</div>
                    <div className="text-lg font-bold text-slate-800">{formatDuration(result.workingMinutes)}</div>
                    <div className="text-xs text-slate-400 mt-1">({(result.workingMinutes / 60).toFixed(2)} ชม.)</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <div className="text-sm text-slate-500 mb-1">ระยะเวลารวม (Lead Time)</div>
                    <div className="text-lg font-bold text-slate-800">{formatDuration(result.totalMinutes)}</div>
                    <div className="text-xs text-slate-400 mt-1">รวมเวลาพักและหยุดรอ</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full flex flex-col items-center justify-center p-12 text-center text-slate-500">
              <Calculator size={48} className="text-slate-300 mb-4" />
              <p className="text-lg font-medium text-slate-600">กรุณากรอกข้อมูลให้ครบถ้วน</p>
              <p className="text-sm mt-1">ระบบจะคำนวณเวลาเริ่มและจบงานให้อัตโนมัติ</p>
            </div>
          )}
        </div>
      </div>

      {/* Reference Info */}
      <div className="mt-8 bg-blue-50 p-6 rounded-xl border border-blue-100">
        <h3 className="font-bold text-blue-800 mb-4 flex items-center gap-2">
          <Clock size={20} /> ข้อมูลอ้างอิงเวลาทำงาน (Shift Schedule)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <h4 className="font-bold text-blue-900 mb-2 border-b border-blue-200 pb-1">กะเช้า (Day Shift)</h4>
            <ul className="space-y-1 text-blue-800">
              <li><span className="font-medium">เวลาทำงานปกติ:</span> 08:00 - 17:00 น.</li>
              <li><span className="font-medium">เวลาพัก:</span> 12:00 - 13:00 น.</li>
              <li><span className="font-medium">เวลาทำ OT:</span> 17:00 - 20:00 น.</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-blue-900 mb-2 border-b border-blue-200 pb-1">กะดึก (Night Shift)</h4>
            <ul className="space-y-1 text-blue-800">
              <li><span className="font-medium">เวลาทำงานปกติ:</span> 20:00 - 05:00 น.</li>
              <li><span className="font-medium">เวลาพัก:</span> 00:00 - 01:00 น.</li>
              <li><span className="font-medium">เวลาทำ OT:</span> 05:00 - 08:00 น.</li>
            </ul>
          </div>
          <div className="md:col-span-2 mt-2 pt-4 border-t border-blue-200 text-blue-900">
            <span className="font-bold">หมายเหตุ:</span> สำหรับเครื่องจักรที่ทำงานต่อเนื่องไม่มีพักเบรก (เช่น เครื่องเป่าขวด หรือเครื่องออโต้) สามารถเปิดใช้งานโหมด <span className="font-medium bg-blue-100 px-1 rounded">เดินเครื่องตลอด 24 ชั่วโมง (No Break)</span> ได้
          </div>
        </div>
      </div>
    </div>
  );
};
