import React from 'react';
import { ProductionJob } from '../types';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ProductionAnalysisProps {
  jobs: ProductionJob[];
}

export const ProductionAnalysis: React.FC<ProductionAnalysisProps> = ({ jobs }) => {
  // Filter only running or completed jobs for analysis
  const activeJobs = jobs.filter(j => j.status === 'Running' || j.status === 'Completed' || j.status === 'Delayed');

  const calculateProgress = (job: ProductionJob) => {
    const percentage = (job.actualProduction || 0) / job.totalProduction * 100;
    return Math.min(percentage, 100).toFixed(1);
  };

  const getDiff = (job: ProductionJob) => {
    if (job.yesterdayProduction === undefined) return 0;
    return (job.actualProduction || 0) - job.yesterdayProduction;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-slate-500 text-sm font-medium">ยอดผลิตรวมวันนี้ (Total Production Today)</h3>
          <p className="text-3xl font-bold text-slate-800 mt-2">
            {activeJobs.reduce((acc, job) => acc + (job.actualProduction || 0), 0).toLocaleString()} <span className="text-sm font-normal text-slate-500">ชิ้น</span>
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           <h3 className="text-slate-500 text-sm font-medium">ยอดเพิ่มขึ้นจากเมื่อวาน (Increase from Yesterday)</h3>
           <p className="text-3xl font-bold text-emerald-600 mt-2">
             +{activeJobs.reduce((acc, job) => acc + getDiff(job), 0).toLocaleString()} <span className="text-sm font-normal text-slate-500">ชิ้น</span>
           </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           <h3 className="text-slate-500 text-sm font-medium">ความคืบหน้าเฉลี่ย (Avg. Progress)</h3>
           <p className="text-3xl font-bold text-blue-600 mt-2">
             {(activeJobs.reduce((acc, job) => acc + ((job.actualProduction || 0) / job.totalProduction * 100), 0) / activeJobs.length || 0).toFixed(1)}%
           </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-bold text-lg text-slate-800">รายละเอียดการผลิตรายเครื่อง (Machine Production Detail)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">เครื่อง (Machine)</th>
                <th className="px-6 py-4">สินค้า (Product)</th>
                <th className="px-6 py-4">Job Order</th>
                <th className="px-6 py-4 text-right">เป้าหมาย (Target)</th>
                <th className="px-6 py-4 text-right">ผลิตได้ (Actual)</th>
                <th className="px-6 py-4 text-right">เพิ่มจากเมื่อวาน (Diff)</th>
                <th className="px-6 py-4 text-center">%</th>
                <th className="px-6 py-4 text-center">สถานะ (Status)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeJobs.map((job) => {
                const diff = getDiff(job);
                return (
                  <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{job.machineId}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{job.productItem}</div>
                      <div className="text-xs text-slate-500">{job.moldCode}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{job.jobOrder}</td>
                    <td className="px-6 py-4 text-right font-mono">{(job.totalProduction || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-800">
                      {(job.actualProduction || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right font-mono">
                      {diff > 0 ? (
                        <span className="text-emerald-600 flex items-center justify-end gap-1">
                          <TrendingUp size={14} /> +{diff.toLocaleString()}
                        </span>
                      ) : diff < 0 ? (
                        <span className="text-red-600 flex items-center justify-end gap-1">
                          <TrendingDown size={14} /> {diff.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-slate-400 flex items-center justify-end gap-1">
                          <Minus size={14} /> 0
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        Number(calculateProgress(job)) >= 100 ? 'bg-emerald-100 text-emerald-700' :
                        Number(calculateProgress(job)) >= 80 ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {calculateProgress(job)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <span className={`px-2 py-1 rounded-full text-xs ${
                          job.status === 'Running' ? 'bg-green-100 text-green-700' :
                          job.status === 'Completed' ? 'bg-blue-100 text-blue-700' :
                          job.status === 'Delayed' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-700'
                       }`}>
                         {job.status}
                       </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
