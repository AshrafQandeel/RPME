
import React, { useState } from 'react';
import { ShieldAlert, Check, X, Lock, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { UserProfile } from '../types';

interface PasswordUpdateProps {
  user: UserProfile;
  onUpdate: (newPassword: string) => void;
}

const PasswordUpdate: React.FC<PasswordUpdateProps> = ({ user, onUpdate }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const requirements = [
    { label: 'Min 8 chars', met: password.length >= 8 },
    { label: 'Lowercase', met: /[a-z]/.test(password) },
    { label: 'Uppercase', met: /[A-Z]/.test(password) },
    { label: 'Special char', met: /[^A-Za-z0-9]/.test(password) },
    { label: 'One number', met: /[0-9]/.test(password) },
    { label: 'Match', met: password !== '' && password === confirm }
  ];

  const isValid = requirements.every(r => r.met);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) onUpdate(password);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[95vh] flex flex-col">
        <div className="bg-indigo-600 p-6 sm:p-8 text-white flex flex-col items-center shrink-0">
          <ShieldAlert size={40} className="mb-4 sm:size-[48px]" />
          <h2 className="text-xl sm:text-2xl font-black text-center">Security Policy Update</h2>
          <p className="text-indigo-100 text-[10px] sm:text-xs mt-2 opacity-80 uppercase tracking-widest font-bold">Action Required</p>
        </div>

        <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar">
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-6 sm:mb-8 flex gap-3 text-amber-800">
            <AlertTriangle className="shrink-0" size={20} />
            <p className="text-[10px] sm:text-xs font-medium leading-relaxed">
              Your security policy requires a password update {user.must_change_password ? 'upon first login' : 'due to periodic rotation'}.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div className="space-y-1.5">
              <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Secure Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-xl sm:rounded-2xl py-3.5 sm:py-4 pl-12 pr-12 outline-none transition-all font-bold text-slate-700 text-sm"
                  placeholder="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type={showConfirm ? "text" : "password"} 
                  required 
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-xl sm:rounded-2xl py-3.5 sm:py-4 pl-12 pr-12 outline-none transition-all font-bold text-slate-700 text-sm"
                  placeholder="Confirm password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
                <button 
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4">
              {requirements.map((req, i) => (
                <div key={i} className={`flex items-center gap-1.5 text-[9px] sm:text-[10px] font-bold ${req.met ? 'text-green-600' : 'text-slate-300'}`}>
                  {req.met ? <Check size={12} /> : <X size={12} />}
                  {req.label}
                </div>
              ))}
            </div>

            <button 
              disabled={!isValid}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl sm:rounded-2xl shadow-xl transition-all disabled:bg-slate-100 disabled:text-slate-300 disabled:shadow-none text-xs sm:text-sm"
            >
              Finalize Security Update
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PasswordUpdate;
