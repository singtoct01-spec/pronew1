


import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Table, Calendar, Activity, ClipboardList, PackageSearch, History, Clock, Database, TrendingUp, FileText, AlertOctagon, Users, BrainCircuit, CheckCircle2, Cpu, BarChart3, Target, Calculator } from 'lucide-react';
import { AppUser, DatePeriod } from '../types';
import { getDateRangeForPeriod, formatDateOnly } from '../utils/dateUtils';

interface SidebarProps {
  currentView: string;
  onChangeView: (view: string) => void;
  currentUser: AppUser | null;
  selectedPeriod: DatePeriod;
  onPeriodChange: (period: DatePeriod) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, currentUser, selectedPeriod, onPeriodChange }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const menuCategories = [
    {
      title: 'ภาพรวม & แดชบอร์ด',
      items: [
        { id: 'dashboard', label: 'ภาพรวม (Overview)', icon: <LayoutDashboard size={20} /> },
        { id: 'planning-kpi', label: 'KPI แผนกวางแผน', icon: <Target size={20} /> },
        { id: 'analysis', label: 'วิเคราะห์การผลิต', icon: <TrendingUp size={20} /> },
        { id: 'oee', label: 'OEE Dashboard', icon: <Activity size={20} /> },
      ]
    },
    {
      title: 'แผนและการผลิต',
      items: [
        { id: 'plan', label: 'แผนการผลิต', icon: <ClipboardList size={20} /> },
        { id: 'smart-calculator', label: 'เครื่องมือคำนวณแผน', icon: <Calculator size={20} /> },
        { id: 'schedule', label: 'ไทม์ไลน์ (Timeline)', icon: <Calendar size={20} /> },
        { id: 'list', label: 'รายการงานทั้งหมด', icon: <Table size={20} /> },
        { id: 'import-plan', label: 'นำเข้าแผนผลิต (Excel)', icon: <FileText size={20} /> },
        { id: 'plan-vs-actual', label: 'ติดตามยอดผลิตรายชั่วโมง', icon: <Clock size={20} /> },
        { id: 'shift-production', label: 'บันทึกยอดผลิตรายกะ', icon: <ClipboardList size={20} /> },
        { id: 'completed-plan', label: 'ประวัติงานที่เสร็จ', icon: <CheckCircle2 size={20} /> },
      ]
    },
    {
      title: 'เครื่องจักร & ซ่อมบำรุง',
      items: [
        { id: 'machines', label: 'สถานะเครื่องจักร', icon: <Cpu size={20} /> },
        { id: 'downtime-logs', label: 'บันทึกเครื่องจักรขัดข้อง', icon: <AlertOctagon size={20} /> },
        { id: 'daily-downtime', label: 'รายงานเครื่องจอดรายวัน', icon: <AlertOctagon size={20} /> },
      ]
    },
    {
      title: 'คลังสินค้า & ข้อมูลหลัก',
      items: [
        { id: 'inventory-dashboard', label: 'Dashboard สินค้าคงคลัง FG', icon: <BarChart3 size={20} /> },
        { id: 'inventory', label: 'สินค้าคงเหลือ (FG) & วัตถุดิบ', icon: <PackageSearch size={20} /> },
        { id: 'master-data', label: 'ฐานข้อมูลหลัก (Master)', icon: <Database size={20} /> },
        { id: 'excel-sync', label: 'นำเข้า/ส่งออก (Excel)', icon: <FileText size={20} /> },
      ]
    },
    {
      title: 'เอกสาร & รายงาน',
      items: [
        { id: 'documents', label: 'ศูนย์เอกสาร', icon: <FileText size={20} /> },
        { id: 'form-templates', label: 'แบบฟอร์มเอกสาร', icon: <FileText size={20} /> },
        { id: 'daily-report', label: 'รายงานประจำวัน (AI)', icon: <FileText size={20} /> },
        { id: 'delayed-jobs-report', label: 'สรุปงานล่าช้า', icon: <AlertOctagon size={20} /> },
        { id: 'meeting-planner', label: 'แผนการประชุม (CAR/PAR)', icon: <Users size={20} /> },
      ]
    },
    {
      title: 'ระบบ & AI',
      items: [
        { id: 'ai-knowledge', label: 'คลังความรู้ AI', icon: <BrainCircuit size={20} /> },
        { id: 'history', label: 'ประวัติการทำงาน', icon: <History size={20} /> },
      ]
    }
  ];

  if (currentUser?.role === 'admin') {
    menuCategories[5].items.push({ id: 'users', label: 'จัดการผู้ใช้งาน', icon: <Users size={20} /> });
  }

  return (
    <div className="w-64 bg-slate-900 text-white flex-shrink-0 flex flex-col h-screen fixed left-0 top-0 z-10 hidden md:flex">
      <div className="p-6 border-b border-slate-700 flex items-center gap-3">
        <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center font-bold text-white">
          P
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">ProPlanner</h1>
          <p className="text-xs text-slate-400">ระบบวางแผนการผลิต</p>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar">
        {menuCategories.map((category, idx) => (
          <div key={idx} className="space-y-1">
            <h3 className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              {category.title}
            </h3>
            {category.items.map((item) => (
              <button
                key={item.id}
                onClick={() => onChangeView(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 font-kanit group ${
                  currentView === item.id 
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-900/20 translate-x-1' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white hover:translate-x-1'
                }`}
              >
                <div className={`${currentView === item.id ? 'text-white' : 'text-slate-500 group-hover:text-brand-400'} transition-colors`}>
                  {item.icon}
                </div>
                <span className="font-medium text-sm">{item.label}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700 font-kanit">
        {/* Real-time Clock Widget */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 mb-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2 text-brand-400">
            <Clock size={14} className="animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider">Real-time</span>
          </div>
          <div className="text-2xl font-mono font-bold text-white tracking-widest leading-none mb-1">
            {currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
          </div>
          <div className="text-xs text-slate-400">
            {currentTime.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>

        {/* Period Selector */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 backdrop-blur-sm">
          <p className="text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wider">รอบการผลิต (Period)</p>
          <select 
            value={selectedPeriod}
            onChange={(e) => onPeriodChange(e.target.value as DatePeriod)}
            className="w-full bg-slate-900 border border-slate-600 text-white text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block p-2.5 mb-2"
          >
            <option value="all">ทั้งหมด (All Time)</option>
            <option value="today">วันนี้ (Today)</option>
            <option value="this_week">สัปดาห์นี้ (This Week)</option>
            <option value="this_month">เดือนนี้ (This Month)</option>
            <option value="last_month">เดือนที่แล้ว (Last Month)</option>
          </select>
          
          {selectedPeriod !== 'all' && (
            <div className="text-xs text-brand-300 bg-brand-900/30 p-2 rounded border border-brand-800/50 text-center">
              {formatDateOnly(getDateRangeForPeriod(selectedPeriod).start)} - {formatDateOnly(getDateRangeForPeriod(selectedPeriod).end)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
