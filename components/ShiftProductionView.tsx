import React, { useState, useMemo } from 'react';
import { ProductionJob, ShiftProductionLog, Machine } from '../types';
import { Plus, Search, Filter, AlertTriangle, CheckCircle2, Calendar, Clock, Download } from 'lucide-react';
import { SearchableSelect } from './SearchableSelect';

interface ShiftProductionViewProps {
  logs: ShiftProductionLog[];
  jobs: ProductionJob[];
  onSaveLog: (log: Omit<ShiftProductionLog, 'id' | 'createdAt'>) => void;
}

export const ShiftProductionView: React.FC<ShiftProductionViewProps> = ({ logs, jobs, onSaveLog }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterShift, setFilterShift] = useState('All');
  const [filterDate, setFilterDate] = useState('');

  // Form State
  const [formData, setFormData] = useState<{
    date: string;
    shift: string;
    machineId: string;
    jobId: string;
    target: number | '';
    actualGood: number | '';
    actualStarred: number | '';
    reason: string;
  }>({
    date: new Date().toISOString().split('T')[0],
    shift: 'A',
    machineId: '',
    jobId: '',
    target: '',
    actualGood: '',
    actualStarred: '',
    reason: '',
  });

  const activeJobs = jobs.filter(j => j.status === 'Running' || j.status === 'Planned' || j.status === 'Delayed');
  const selectedJob = jobs.find(j => j.id === formData.jobId);
  const totalActual = (Number(formData.actualGood) || 0) + (Number(formData.actualStarred) || 0);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = (log.machineId || '').toLowerCase().includes((searchTerm || '').toLowerCase()) || 
                            (log.productItem || '').toLowerCase().includes((searchTerm || '').toLowerCase());
      const matchesShift = filterShift === 'All' || log.shift === filterShift;
      const matchesDate = !filterDate || log.date === filterDate;
      return matchesSearch && matchesShift && matchesDate;
    });
  }, [logs, searchTerm, filterShift, filterDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.machineId || !formData.jobId || !formData.target || Number(formData.target) <= 0) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    const targetValue = Number(formData.target) || 0;
    const variance = totalActual - targetValue;
    const isBelowTarget = variance < 0;

    if (isBelowTarget && !formData.reason) {
      alert('กรุณาระบุสาเหตุที่ผลิตไม่ได้ตามเป้าหมาย (ตกแคป)');
      return;
    }

    onSaveLog({
      date: formData.date,
      shift: formData.shift,
      machineId: formData.machineId,
      jobId: formData.jobId,
      jobOrder: selectedJob?.jobOrder,
      productItem: selectedJob?.productItem || 'Unknown',
      target: targetValue,
      actual: totalActual,
      actualGood: formData.actualGood === '' ? 0 : Number(formData.actualGood),
      actualStarred: formData.actualStarred === '' ? 0 : Number(formData.actualStarred),
      variance,
      isBelowTarget,
      reason: formData.reason,
      reporter: 'System User' // Should be current user
    });

    setIsModalOpen(false);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      shift: 'A',
      machineId: '',
      jobId: '',
      target: 0,
      actualGood: 0,
      actualStarred: 0,
      reason: '',
    });
  };

  const exportToCSV = () => {
    const headers = ['วันที่', 'กะ', 'เครื่องจักร', 'Job Order', 'สินค้า', 'เป้าหมาย', 'ผลิตจริง (รวม)', 'งานดี', 'งานดอกจัน', 'ผลต่าง', 'สถานะ', 'สาเหตุ'];
    const csvData = filteredLogs.map(log => [
      log.date,
      log.shift === 'A' ? 'กะ A' : log.shift === 'B' ? 'กะ B' : log.shift === 'Day' ? 'กะเช้า' : log.shift === 'Night' ? 'กะดึก' : log.shift,
      log.machineId,
      log.jobOrder || '-',
      log.productItem,
      log.target,
      log.actual,
      log.actualGood || 0,
      log.actualStarred || 0,
      log.variance,
      log.isBelowTarget ? 'ตกแคป' : 'ตามเป้า',
      log.reason || '-'
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `shift_production_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">บันทึกยอดผลิตรายวัน/รายกะ</h1>
          <p className="text-sm text-gray-500 mt-1">บันทึกและติดตามยอดผลิต เทียบเป้าหมาย (Capacity)</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <Download size={20} />
            Export CSV
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Plus size={20} />
            บันทึกยอดผลิต
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-200 flex flex-wrap gap-4 bg-gray-50">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="ค้นหาเครื่องจักร, สินค้า..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="w-48">
            <input
              type="date"
              lang="th-TH"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="w-48 relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={filterShift}
              onChange={(e) => setFilterShift(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none"
            >
              <option value="All">ทุกกะ</option>
              <option value="A">กะ A</option>
              <option value="B">กะ B</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-200">
                <th className="p-4 font-medium">วันที่ / กะ</th>
                <th className="p-4 font-medium">เครื่องจักร</th>
                <th className="p-4 font-medium">สินค้า / Job Order</th>
                <th className="p-4 font-medium text-right">เป้าหมาย</th>
                <th className="p-4 font-medium text-right">ผลิตจริง</th>
                <th className="p-4 font-medium text-right">ผลต่าง</th>
                <th className="p-4 font-medium">สถานะ</th>
                <th className="p-4 font-medium">สาเหตุ (ถ้าตกแคป)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">
                    ไม่พบข้อมูลยอดผลิต
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-gray-400" />
                        <span className="font-medium text-gray-900">{log.date}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                        <Clock size={14} />
                        <span>{log.shift === 'A' ? 'กะ A' : log.shift === 'B' ? 'กะ B' : log.shift === 'Day' ? 'กะเช้า' : log.shift === 'Night' ? 'กะดึก' : log.shift}</span>
                      </div>
                    </td>
                    <td className="p-4 font-medium text-indigo-600">{log.machineId}</td>
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{log.productItem}</div>
                      <div className="text-sm text-gray-500">{log.jobOrder || '-'}</div>
                    </td>
                    <td className="p-4 text-right text-gray-600">{(log.target || 0).toLocaleString()}</td>
                    <td className="p-4 text-right">
                      <div className="font-medium text-gray-900 border-b border-gray-100 pb-1 mb-1">
                        {(log.actual || 0).toLocaleString()} <span className="text-xs font-normal text-gray-500">ชิ้น</span>
                      </div>
                      {(log.actualGood !== undefined || log.actualStarred !== undefined) && (
                        <div className="flex flex-col gap-0.5 text-xs text-left w-fit ml-auto">
                           {log.actualGood !== undefined && <div className="text-emerald-600 flex justify-between gap-2"><span>งานดี:</span> <span>{log.actualGood.toLocaleString()}</span></div>}
                           {log.actualStarred !== undefined && <div className="text-amber-600 flex justify-between gap-2"><span>ดอกจัน:</span> <span>{log.actualStarred.toLocaleString()}</span></div>}
                        </div>
                      )}
                    </td>
                    <td className={`p-4 text-right font-medium ${(log.variance || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {(log.variance || 0) > 0 ? '+' : ''}{(log.variance || 0).toLocaleString()}
                    </td>
                    <td className="p-4">
                      {log.isBelowTarget ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <AlertTriangle size={14} />
                          ตกแคป
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle2 size={14} />
                          ตามเป้า
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-600 max-w-xs truncate" title={log.reason}>
                      {log.reason || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">บันทึกยอดผลิต</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">วันที่</label>
                  <input
                    type="date"
                    lang="th-TH"
                    required
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">กะการทำงาน</label>
                  <select
                    required
                    value={formData.shift}
                    onChange={e => setFormData({...formData, shift: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="A">กะ A</option>
                    <option value="B">กะ B</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">งานที่กำลังผลิต (Job)</label>
                <SearchableSelect
                  options={activeJobs.map(job => {
                    const hasColor = job.color && job.color !== '-';
                    const moldInfo = job.moldCode && job.moldCode !== '-' ? ` แม่พิมพ์ ${job.moldCode}` : '';
                    return {
                      value: job.id,
                      label: `${job.machineId} - ${job.jobOrder} (${job.productItem}${moldInfo})${hasColor ? ` [สี: ${job.color}]` : ''}`,
                    };
                  })}
                  value={formData.jobId}
                  onChange={(jobId) => {
                    const job = jobs.find(j => j.id === jobId);
                    setFormData({
                      ...formData, 
                      jobId, 
                      machineId: job?.machineId || '',
                      target: job?.capacityPerShift || 0
                    });
                  }}
                  placeholder="-- ค้นหาและเลือกงาน --"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">เป้าหมาย (Capacity/Shift)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.target}
                    onChange={e => setFormData({...formData, target: e.target.value === '' ? '' : Number(e.target.value)})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-gray-50 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ยอดผลิตได้ <span className="text-emerald-600">(งานดี)</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="0"
                    value={formData.actualGood}
                    onChange={e => setFormData({...formData, actualGood: e.target.value === '' ? '' : Number(e.target.value)})}
                    className="w-full px-4 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ยอดผลิตได้ <span className="text-amber-500">(งานดอกจัน/ตกเกรด)</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="0"
                    value={formData.actualStarred}
                    onChange={e => setFormData({...formData, actualStarred: e.target.value === '' ? '' : Number(e.target.value)})}
                    className="w-full px-4 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-bold text-amber-600"
                  />
                </div>
              </div>

              <div className="bg-indigo-50 p-4 rounded-lg flex justify-between items-center border border-indigo-100">
                <span className="font-medium text-indigo-900">ยอดผลิตจริงรวม (Total Actual)</span>
                <span className="text-2xl font-bold text-indigo-700">{totalActual.toLocaleString()}</span>
              </div>

              {totalActual < Number(formData.target) && Number(formData.target) > 0 && (
                <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                  <div className="flex items-center gap-2 text-red-800 mb-2 font-medium">
                    <AlertTriangle size={18} />
                    ยอดผลิตต่ำกว่าเป้าหมาย (ตกแคป {Number(formData.target) - totalActual} ชิ้น)
                  </div>
                  <label className="block text-sm font-medium text-red-700 mb-1">สาเหตุที่ตกแคป *</label>
                  <textarea
                    required
                    value={formData.reason}
                    onChange={e => setFormData({...formData, reason: e.target.value})}
                    placeholder="ระบุสาเหตุ เช่น เครื่องเสีย, รอวัตถุดิบ, เปลี่ยนแม่พิมพ์..."
                    className="w-full px-4 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    rows={3}
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

