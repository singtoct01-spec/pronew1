import React, { useState, useEffect } from 'react';
import { Users, Calendar, Clock, FileText, Printer, Plus, CheckSquare, AlertTriangle, X, ChevronRight, FileSignature, Target, FileBarChart } from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ProductionJob, DowntimeLog, DailyReportLog } from '../types';

interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  relatedReportId?: string;
  relatedJobIds?: string[];
  attendees: string[];
  status: 'Draft' | 'Scheduled' | 'Completed';
  createdAt: string;
}

interface MeetingPlannerViewProps {
  jobs: ProductionJob[];
  downtimeLogs: DowntimeLog[];
  dailyReports: DailyReportLog[];
}

export const MeetingPlannerView: React.FC<MeetingPlannerViewProps> = ({ jobs, downtimeLogs, dailyReports }) => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('ประชุมติดตามงานล่าช้าประจำวัน');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('10:00');
  const [location, setLocation] = useState('ห้องประชุม 1');
  const [relatedReportId, setRelatedReportId] = useState('');
  const [relatedJobIds, setRelatedJobIds] = useState<string[]>([]);
  const [attendees, setAttendees] = useState<string[]>(['ฝ่ายผลิต', 'ฝ่ายวางแผน', 'ฝ่ายซ่อมบำรุง', 'ฝ่ายควบคุมคุณภาพ (QC)']);

  // Allow selecting any job, but sort delayed ones first
  const sortedJobs = [...jobs].sort((a, b) => {
    if (a.status === 'Delayed' && b.status !== 'Delayed') return -1;
    if (a.status !== 'Delayed' && b.status === 'Delayed') return 1;
    return 0;
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'meetings'), (snapshot) => {
      const meetingsData: Meeting[] = [];
      snapshot.forEach((doc) => {
        meetingsData.push({ id: doc.id, ...doc.data() } as Meeting);
      });
      // Sort by date descending
      meetingsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setMeetings(meetingsData);
    });

    return () => unsubscribe();
  }, []);

  const handleSaveMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const meetingData = {
        title,
        date,
        time,
        location,
        relatedReportId,
        relatedJobIds,
        attendees,
        status: 'Scheduled',
        createdAt: new Date().toISOString()
      };

      if (selectedMeeting) {
        await setDoc(doc(db, 'meetings', selectedMeeting.id), meetingData, { merge: true });
      } else {
        await addDoc(collection(db, 'meetings'), meetingData);
      }

      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving meeting:", error);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (deleteConfirmId) {
      await deleteDoc(doc(db, 'meetings', deleteConfirmId));
      if (selectedMeeting?.id === deleteConfirmId) {
        setSelectedMeeting(null);
      }
      setDeleteConfirmId(null);
    }
  };

  const resetForm = () => {
    setTitle('ประชุมติดตามงานล่าช้าประจำวัน');
    setDate(new Date().toISOString().split('T')[0]);
    setTime('10:00');
    setLocation('ห้องประชุม 1');
    setRelatedReportId('');
    setRelatedJobIds([]);
    setAttendees(['ฝ่ายผลิต', 'ฝ่ายวางแผน', 'ฝ่ายซ่อมบำรุง', 'ฝ่ายควบคุมคุณภาพ (QC)']);
    setSelectedMeeting(null);
  };

  const openEditModal = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setTitle(meeting.title);
    setDate(meeting.date);
    setTime(meeting.time);
    setLocation(meeting.location);
    setRelatedReportId(meeting.relatedReportId || '');
    setRelatedJobIds(meeting.relatedJobIds || []);
    setAttendees(meeting.attendees);
    setIsModalOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const toggleAttendee = (dept: string) => {
    if (attendees.includes(dept)) {
      setAttendees(attendees.filter(a => a !== dept));
    } else {
      setAttendees([...attendees, dept]);
    }
  };

  const departments = [
    'ฝ่ายผลิต', 'ฝ่ายวางแผน', 'ฝ่ายซ่อมบำรุง', 'ฝ่ายควบคุมคุณภาพ (QC)', 
    'ฝ่ายคลังสินค้า', 'ฝ่ายจัดซื้อ', 'ผู้จัดการโรงงาน'
  ];

  return (
    <>
      {/* Screen View */}
      <div className="p-6 max-w-7xl mx-auto print:hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Users className="text-brand-500" /> แผนการประชุม (Meeting Planner)
            </h1>
            <p className="text-slate-500">จัดการนัดหมายประชุมเพื่อแก้ไขปัญหางานตกแผนและป้องกันการเกิดซ้ำ</p>
          </div>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
        >
          <Plus size={20} />
          สร้างนัดหมายประชุม
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Meeting List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h2 className="font-bold text-slate-800">รายการนัดหมายประชุม</h2>
            </div>
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {meetings.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <Calendar size={48} className="mx-auto text-slate-300 mb-3" />
                  <p>ยังไม่มีการนัดหมายประชุม</p>
                </div>
              ) : (
                meetings.map(meeting => (
                  <div 
                    key={meeting.id}
                    onClick={() => setSelectedMeeting(meeting)}
                    className={`p-4 cursor-pointer transition-colors hover:bg-slate-50 ${selectedMeeting?.id === meeting.id ? 'bg-brand-50 border-l-4 border-brand-500' : 'border-l-4 border-transparent'}`}
                  >
                    <h3 className="font-medium text-slate-800 line-clamp-2 mb-2">{meeting.title}</h3>
                    <div className="flex items-center gap-4 text-xs text-slate-500 mb-2">
                      <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(meeting.date).toLocaleDateString('th-TH')}</span>
                      <span className="flex items-center gap-1"><Clock size={14} /> {meeting.time} น.</span>
                    </div>
                    {meeting.relatedReportId && (
                      <div className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded text-xs font-medium">
                        <FileBarChart size={12} /> อ้างอิงรายงาน AI
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Meeting Details & Documents */}
        <div className="lg:col-span-2">
          {selectedMeeting ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
              <div className="p-6 border-b border-slate-200 flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 mb-2">{selectedMeeting.title}</h2>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                    <span className="flex items-center gap-1.5"><Calendar size={16} className="text-slate-400" /> {new Date(selectedMeeting.date).toLocaleDateString('th-TH')}</span>
                    <span className="flex items-center gap-1.5"><Clock size={16} className="text-slate-400" /> {selectedMeeting.time} น.</span>
                    <span className="flex items-center gap-1.5"><Users size={16} className="text-slate-400" /> {selectedMeeting.location}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => openEditModal(selectedMeeting)}
                    className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    แก้ไข
                  </button>
                  <button 
                    onClick={() => handleDelete(selectedMeeting.id)}
                    className="px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    ลบ
                  </button>
                </div>
              </div>

              <div className="p-6 flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <Users size={18} className="text-brand-500" /> หน่วยงานที่ต้องเข้าร่วม
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedMeeting.attendees.map(dept => (
                        <span key={dept} className="px-2.5 py-1 bg-white border border-slate-300 rounded-md text-sm text-slate-700">
                          {dept}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                    <h3 className="font-bold text-red-800 mb-3 flex items-center gap-2">
                      <FileBarChart size={18} /> อ้างอิงรายงานประจำวัน (AI Report)
                    </h3>
                    {selectedMeeting.relatedReportId ? (
                      <div>
                        <p className="font-medium text-red-700">
                          รายงานวันที่ {dailyReports.find(r => r.id === selectedMeeting.relatedReportId) 
                            ? new Date(dailyReports.find(r => r.id === selectedMeeting.relatedReportId)!.date).toLocaleDateString('th-TH') 
                            : 'ไม่พบข้อมูล'}
                        </p>
                        <p className="text-sm text-red-600 mt-1 line-clamp-2">
                          {dailyReports.find(r => r.id === selectedMeeting.relatedReportId)?.generatedReport || ''}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">ไม่ได้ระบุรายงานอ้างอิง</p>
                    )}
                  </div>
                </div>

                {selectedMeeting.relatedJobIds && selectedMeeting.relatedJobIds.length > 0 && (
                  <div className="mb-8">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-200 pb-2">
                      <AlertTriangle size={20} className="text-amber-500" /> งานที่ล่าช้าที่เกี่ยวข้อง
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedMeeting.relatedJobIds.map(jobId => {
                        const job = jobs.find(j => j.id === jobId);
                        if (!job) return null;
                        return (
                          <div key={job.id} className="p-3 border border-slate-200 rounded-lg bg-white flex justify-between items-center">
                            <div>
                              <p className="font-medium text-slate-800 text-sm">{job.productName}</p>
                              <p className="text-xs text-slate-500 mt-0.5">แผน: {new Date(job.plannedEndDate).toLocaleDateString('th-TH')}</p>
                            </div>
                            {job.status === 'Delayed' && (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-medium">ล่าช้า</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mb-8">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-200 pb-2">
                    <CheckSquare size={20} className="text-emerald-500" /> เอกสารที่ต้องเตรียมเข้าประชุม
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg bg-white">
                      <FileText className="text-blue-500 shrink-0 mt-0.5" size={20} />
                      <div>
                        <p className="font-medium text-slate-800 text-sm">รายงาน Plan vs Actual</p>
                        <p className="text-xs text-slate-500 mt-0.5">สรุปยอดผลิตจริงเทียบกับแผน</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg bg-white">
                      <FileText className="text-amber-500 shrink-0 mt-0.5" size={20} />
                      <div>
                        <p className="font-medium text-slate-800 text-sm">รายงาน Downtime</p>
                        <p className="text-xs text-slate-500 mt-0.5">ประวัติเครื่องจักรขัดข้อง (ถ้ามี)</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg bg-white">
                      <FileSignature className="text-purple-500 shrink-0 mt-0.5" size={20} />
                      <div>
                        <p className="font-medium text-slate-800 text-sm">ใบลงทะเบียน & วาระประชุม</p>
                        <p className="text-xs text-slate-500 mt-0.5">พิมพ์จากระบบได้ทันที</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg bg-white">
                      <FileText className="text-red-500 shrink-0 mt-0.5" size={20} />
                      <div>
                        <p className="font-medium text-slate-800 text-sm">ใบ CAR / PAR</p>
                        <p className="text-xs text-slate-500 mt-0.5">ฟอร์มบันทึกการแก้ไขและป้องกัน</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-200 pb-2">
                    <Target size={20} className="text-brand-500" /> หัวข้อการประชุม (Agenda)
                  </h3>
                  <div className="space-y-4 relative before:absolute before:inset-y-0 before:left-[11px] before:w-0.5 before:bg-slate-200 pl-8">
                    <div className="relative">
                      <div className="absolute -left-[37px] w-6 h-6 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white">1</div>
                      <h4 className="font-medium text-slate-800">สรุปสถานการณ์ (What happened?)</h4>
                      <p className="text-sm text-slate-600 mt-1">ทบทวนเป้าหมายเทียบกับผลลัพธ์จริง</p>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-[37px] w-6 h-6 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white">2</div>
                      <h4 className="font-medium text-slate-800">วิเคราะห์สาเหตุ (Root Cause Analysis)</h4>
                      <p className="text-sm text-slate-600 mt-1">วิเคราะห์ด้วยหลัก 4M1E (คน, เครื่องจักร, วัตถุดิบ, วิธีการ, สภาพแวดล้อม)</p>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-[37px] w-6 h-6 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white">3</div>
                      <h4 className="font-medium text-slate-800">แนวทางแก้ไขระยะสั้น (Correction)</h4>
                      <p className="text-sm text-slate-600 mt-1">วิธีแก้ปัญหาเฉพาะหน้าเพื่อให้ส่งมอบงานทัน</p>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-[37px] w-6 h-6 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white">4</div>
                      <h4 className="font-medium text-slate-800">แนวทางป้องกันระยะยาว (Preventive Action)</h4>
                      <p className="text-sm text-slate-600 mt-1">วิธีป้องกันไม่ให้เกิดปัญหาซ้ำ</p>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-[37px] w-6 h-6 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white">5</div>
                      <h4 className="font-medium text-slate-800">สรุปผู้รับผิดชอบ (Action Plan)</h4>
                      <p className="text-sm text-slate-600 mt-1">กำหนดผู้รับผิดชอบและระยะเวลาแล้วเสร็จ</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                <button 
                  onClick={() => window.print()}
                  className="flex items-center gap-2 bg-slate-800 text-white px-6 py-2.5 rounded-lg hover:bg-slate-900 transition-colors"
                >
                  <Printer size={20} />
                  พิมพ์วาระประชุมและใบลงชื่อ
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full flex flex-col items-center justify-center p-12 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Users size={40} className="text-slate-300" />
              </div>
              <h2 className="text-xl font-bold text-slate-700 mb-2">เลือกการประชุมเพื่อดูรายละเอียด</h2>
              <p className="text-slate-500 max-w-md">
                คลิกที่รายการประชุมด้านซ้ายมือเพื่อดูวาระการประชุม เอกสารที่ต้องเตรียม และพิมพ์ใบลงทะเบียน
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800">
                {selectedMeeting ? 'แก้ไขนัดหมายประชุม' : 'สร้างนัดหมายประชุมใหม่'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSaveMeeting} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">หัวข้อการประชุม</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">วันที่</label>
                  <input 
                    type="date" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">เวลา</label>
                  <input 
                    type="time" 
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">สถานที่</label>
                  <input 
                    type="text" 
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">อ้างอิงรายงานประจำวัน (AI Report)</label>
                  <select 
                    value={relatedReportId}
                    onChange={(e) => setRelatedReportId(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">-- ไม่ระบุ --</option>
                    {dailyReports.map(report => (
                      <option key={report.id} value={report.id}>
                        รายงานวันที่ {new Date(report.date).toLocaleDateString('th-TH')}
                      </option>
                    ))}
                  </select>
                  {dailyReports.length === 0 && (
                    <p className="text-xs text-slate-500 mt-1">ไม่มีรายงานในระบบ</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">อ้างอิงงานที่ล่าช้า (เลือกได้หลายรายการ)</label>
                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
                  {sortedJobs.map(job => (
                    <label key={job.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={relatedJobIds.includes(job.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setRelatedJobIds([...relatedJobIds, job.id]);
                          } else {
                            setRelatedJobIds(relatedJobIds.filter(id => id !== job.id));
                          }
                        }}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      <div className="flex-1 flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-700">{job.productName}</span>
                        {job.status === 'Delayed' && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">ล่าช้า</span>
                        )}
                      </div>
                    </label>
                  ))}
                  {sortedJobs.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-2">ไม่มีข้อมูลงาน</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">หน่วยงานที่ต้องเข้าร่วม</label>
                <div className="flex flex-wrap gap-2">
                  {departments.map(dept => (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => toggleAttendee(dept)}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                        attendees.includes(dept) 
                          ? 'bg-brand-50 border-brand-200 text-brand-700 font-medium' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {dept}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex gap-3 mt-4">
                <div className="text-blue-500 shrink-0 mt-0.5"><CheckSquare size={20} /></div>
                <div>
                  <p className="text-sm font-medium text-blue-800">ระบบจะสร้างวาระการประชุมอัตโนมัติ</p>
                  <p className="text-xs text-blue-600 mt-1">
                    เมื่อบันทึกแล้ว คุณสามารถพิมพ์ใบลงทะเบียนและวาระการประชุม (Agenda) ที่มีหัวข้อการวิเคราะห์สาเหตุ (4M1E) และแนวทางแก้ไขได้ทันที
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
                >
                  บันทึกนัดหมาย
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 print:hidden">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">ยืนยันการลบ</h2>
              <p className="text-slate-600 mb-6">คุณต้องการลบการประชุมนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถเรียกคืนได้</p>
              <div className="flex gap-3 justify-center">
                <button 
                  onClick={() => setDeleteConfirmId(null)}
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

    {/* Print View Component */}
    {selectedMeeting && (
      <div className="hidden print:block bg-white p-8 max-w-4xl mx-auto text-black font-sans">
        <div className="print-page">
          <div className="text-center mb-6 border-b-2 border-black pb-4">
            <h1 className="text-2xl font-bold mb-2">วาระการประชุม และ ติดตามงานล่าช้า</h1>
            <h2 className="text-xl">{selectedMeeting.title}</h2>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div><span className="font-bold">วันที่ประชุม:</span> {new Date(selectedMeeting.date).toLocaleDateString('th-TH')}</div>
            <div><span className="font-bold">เวลา:</span> {selectedMeeting.time} น.</div>
            <div><span className="font-bold">สถานที่:</span> {selectedMeeting.location}</div>
            <div>
              <span className="font-bold">อ้างอิงรายงาน:</span>{' '}
              {selectedMeeting.relatedReportId && dailyReports.find(r => r.id === selectedMeeting.relatedReportId)
                ? `รายงานประจำวันที่ ${new Date(dailyReports.find(r => r.id === selectedMeeting.relatedReportId)!.date).toLocaleDateString('th-TH')}`
                : '-'}
            </div>
          </div>

          {/* Daily Report Summary (if selected) */}
          {selectedMeeting.relatedReportId && dailyReports.find(r => r.id === selectedMeeting.relatedReportId) && (
            <div className="mb-6 border border-gray-300 p-4 bg-gray-50 rounded">
              <h3 className="font-bold text-base mb-2 flex items-center gap-2">
                <AlertTriangle size={16} /> สรุปประเด็นงานล่าช้าจาก AI
              </h3>
              <div className="text-sm text-gray-800 whitespace-pre-wrap">
                {dailyReports.find(r => r.id === selectedMeeting.relatedReportId)?.generatedReport}
              </div>
            </div>
          )}

          {/* Related Jobs List */}
          {selectedMeeting.relatedJobIds && selectedMeeting.relatedJobIds.length > 0 && (
            <div className="mb-6">
              <h3 className="font-bold text-base mb-2 border-b border-gray-300 pb-1 flex items-center gap-2">
                <AlertTriangle size={16} /> งานที่ล่าช้าที่เกี่ยวข้อง
              </h3>
              <ul className="list-disc pl-6 space-y-1 text-sm">
                {selectedMeeting.relatedJobIds.map(jobId => {
                  const job = jobs.find(j => j.id === jobId);
                  if (!job) return null;
                  return (
                    <li key={job.id}>
                      <strong>{job.productName}</strong> (แผน: {new Date(job.plannedEndDate).toLocaleDateString('th-TH')})
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="mb-6">
            <h3 className="font-bold text-base mb-2 border-b border-gray-300 pb-1 flex items-center gap-2">
              <Target size={16} /> หัวข้อการประชุม (Agenda)
            </h3>
            <ol className="list-decimal pl-6 space-y-2 text-sm">
              <li>
                <strong>สรุปสถานการณ์ (What happened?)</strong> - ทบทวนเป้าหมายเทียบกับผลลัพธ์จริง
              </li>
              <li>
                <strong>วิเคราะห์สาเหตุ (Root Cause)</strong> - วิเคราะห์ปัญหาที่ทำให้งานล่าช้า
              </li>
              <li>
                <strong>แนวทางแก้ไข (Action Plan)</strong> - กำหนดวิธีแก้ปัญหาและผู้รับผิดชอบ
              </li>
            </ol>
          </div>

          <div>
            <h3 className="font-bold text-base mb-2 border-b border-gray-300 pb-1 flex items-center gap-2">
              <FileSignature size={16} /> ผู้เข้าร่วมประชุม (Attendance)
            </h3>
            <table className="w-full border-collapse border border-black text-sm mt-2">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black py-1.5 px-3 w-12 text-center">ลำดับ</th>
                  <th className="border border-black py-1.5 px-3 w-48 text-left">ชื่อ - นามสกุล</th>
                  <th className="border border-black py-1.5 px-3 w-32 text-left">หน่วยงาน</th>
                  <th className="border border-black py-1.5 px-3 w-32 text-center">ลายเซ็น</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: Math.max(5, selectedMeeting.attendees.length) }).map((_, i) => (
                  <tr key={i}>
                    <td className="border border-black py-3 px-3 text-center">{i + 1}</td>
                    <td className="border border-black py-3 px-3"></td>
                    <td className="border border-black py-3 px-3 text-gray-600 text-xs">
                      {selectedMeeting.attendees[i] || ''}
                    </td>
                    <td className="border border-black py-3 px-3"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-8 flex justify-between text-sm">
            <div className="text-center">
              <p>_________________________</p>
              <p className="mt-1">ผู้บันทึกการประชุม</p>
            </div>
            <div className="text-center">
              <p>_________________________</p>
              <p className="mt-1">ประธานในที่ประชุม</p>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
};
