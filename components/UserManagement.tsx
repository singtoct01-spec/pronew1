import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { AppUser } from '../types';
import { Plus, Edit, Trash2, Shield, User, Key, CheckCircle, XCircle } from 'lucide-react';
import { SearchableSelect } from './SearchableSelect';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  
  const [formData, setFormData] = useState<Partial<AppUser>>({
    username: '',
    password: '',
    name: '',
    role: 'user',
    isActive: true
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData: AppUser[] = [];
      snapshot.forEach((doc) => {
        usersData.push({ id: doc.id, ...doc.data() } as AppUser);
      });
      setUsers(usersData);
    });

    return () => unsubscribe();
  }, []);

  const handleOpenModal = (user?: AppUser) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        password: user.password || '',
        name: user.name,
        role: user.role,
        isActive: user.isActive
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        password: '',
        name: '',
        role: 'user',
        isActive: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const userId = editingUser?.id || `user-${Date.now()}`;
      const userToSave: AppUser = {
        id: userId,
        username: formData.username!,
        name: formData.name!,
        role: formData.role as 'admin' | 'user',
        isActive: formData.isActive!,
        createdAt: editingUser?.createdAt || new Date().toISOString()
      };

      if (formData.password) {
        userToSave.password = formData.password;
      } else if (editingUser?.password) {
        userToSave.password = editingUser.password;
      }

      await setDoc(doc(db, 'users', userId), userToSave, { merge: true });
      setIsModalOpen(false);
      alert('บันทึกข้อมูลผู้ใช้งานสำเร็จ');
    } catch (error) {
      console.error("Error saving user:", error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (window.confirm('คุณต้องการลบผู้ใช้งานนี้ใช่หรือไม่?')) {
      try {
        await deleteDoc(doc(db, 'users', id));
        alert('ลบผู้ใช้งานสำเร็จ');
      } catch (error) {
        console.error("Error deleting user:", error);
        alert('เกิดข้อผิดพลาดในการลบข้อมูล');
      }
    }
  };

  return (
    <div className="space-y-6 font-kanit">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">จัดการผู้ใช้งานระบบ</h2>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors shadow-sm text-sm font-medium"
        >
          <Plus size={16} />
          เพิ่มผู้ใช้งาน
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">รหัสผู้ใช้งาน (ID)</th>
                <th className="px-6 py-4">ชื่อ-นามสกุล</th>
                <th className="px-6 py-4">สิทธิ์การใช้งาน</th>
                <th className="px-6 py-4">สถานะ</th>
                <th className="px-6 py-4 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Hardcoded Admin Fallback Display */}
              {!users.some(u => u.username === 'admin') && (
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">admin</td>
                  <td className="px-6 py-4">ผู้ดูแลระบบ (Admin)</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                      <Shield size={12} />
                      Admin
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                      <CheckCircle size={12} />
                      ใช้งานได้
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-slate-400 text-xs italic">
                    (ระบบพื้นฐาน)
                  </td>
                </tr>
              )}
              
              {users.map(user => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">{user.username}</td>
                  <td className="px-6 py-4">{user.name}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                      user.role === 'admin' 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {user.role === 'admin' ? <Shield size={12} /> : <User size={12} />}
                      {user.role === 'admin' ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                      user.isActive 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {user.isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {user.isActive ? 'ใช้งานได้' : 'ระงับการใช้งาน'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenModal(user)}
                        className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        title="แก้ไข"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="ลบ"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    ยังไม่มีข้อมูลผู้ใช้งานในระบบ (นอกจาก admin พื้นฐาน)
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg">
                {editingUser ? 'แก้ไขผู้ใช้งาน' : 'เพิ่มผู้ใช้งานใหม่'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <XCircle size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">รหัสผู้ใช้งาน (ID) *</label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  placeholder="เช่น user01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">รหัสผ่าน (Password) *</label>
                <input
                  type="text"
                  required={!editingUser} // Required only for new users
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  placeholder={editingUser ? "ปล่อยว่างถ้าไม่ต้องการเปลี่ยนรหัสผ่าน" : "กำหนดรหัสผ่าน"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อ-นามสกุล *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  placeholder="ชื่อพนักงาน"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">สิทธิ์การใช้งาน</label>
                  <SearchableSelect
                    value={formData.role || 'user'}
                    onChange={(value) => setFormData({...formData, role: value as 'admin' | 'user'})}
                    className="w-full"
                    options={[
                      { value: 'user', label: 'User (ทั่วไป)' },
                      { value: 'admin', label: 'Admin (ผู้ดูแลระบบ)' }
                    ]}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">สถานะ</label>
                  <SearchableSelect
                    value={formData.isActive ? 'active' : 'inactive'}
                    onChange={(value) => setFormData({...formData, isActive: value === 'active'})}
                    className="w-full"
                    options={[
                      { value: 'active', label: 'ใช้งานได้' },
                      { value: 'inactive', label: 'ระงับการใช้งาน' }
                    ]}
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium transition-colors shadow-sm"
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
