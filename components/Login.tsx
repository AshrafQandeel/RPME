
import React, { useState } from 'react';
import { Lock, Mail, AlertCircle, Eye, EyeOff, CheckCircle, WifiOff, Loader2, Globe, Shield } from 'lucide-react';
import { UserProfile, UserRole, AccountStatus } from '../types';
import { fetchCloudUsers } from '../services/cloudDb';

interface LoginProps {
  onLogin: (user: UserProfile) => void;
  isCloudConnected: boolean;
}

const Login: React.FC<LoginProps> = ({ onLogin, isCloudConnected }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const PRIMARY_LOGO = "https://raw.githubusercontent.com/AnasQandeel/RPME-Logo/main/RPME%20Logo.png";
  const FALLBACK_LOGO = "https://placehold.co/600x400/064e3b/ffffff?text=RPME+LIMITED+LLC";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    // v2.7.0: Root Administrator Bypass (Updated for ashraf.qandeel@rpmefirm.com)
    const isRootBypass = (normalizedEmail === 'aqandeel@gmail.com' && normalizedPassword === 'RPME Limited @2026') || 
                         (normalizedEmail === 'ashraf.qandeel@rpmefirm.com' && normalizedPassword === 'Gaza@2026');

    if (isRootBypass) {
      setIsSuccess(true);
      const rootUser: UserProfile = {
        id: 'SYS-ROOT', 
        email: normalizedEmail, 
        full_name: normalizedEmail === 'aqandeel@gmail.com' ? 'RPME System Root' : 'Ashraf Qandeel (Admin)',
        role: UserRole.ADMIN, 
        is_system_admin: true, 
        status: AccountStatus.ACTIVE,
        must_change_password: false, 
        password_expiry: '', 
        created_at: new Date().toISOString()
      };

      // Attempt to bootstrap the identity into the cloud registry if it's empty
      try {
        const { upsertCloudUser, fetchCloudUsers } = await import('../services/cloudDb');
        const existingUsers = await fetchCloudUsers();
        if (!existingUsers || existingUsers.length === 0) {
          console.log("[Login] Bootstrapping first identity into Cloud Registry...");
          await upsertCloudUser({
            ...rootUser,
            id: `USR-ROOT-${Date.now()}`,
            password_hash_mock: normalizedPassword
          });
        }
      } catch (e) {
        console.warn("[Login] Bootstrap skipped:", e);
      }

      setTimeout(() => {
        onLogin(rootUser);
      }, 800);
      return;
    }

    if (!isCloudConnected) {
      setError('System Node Offline: Handshake with Enterprise Registry failed.');
      setIsLoading(false);
      return;
    }

    try {
      const cloudUsers = await fetchCloudUsers();
      if (!cloudUsers || cloudUsers.length === 0) {
        setError('Authorization Server Empty: No identities found in Cloud Registry.');
        setIsLoading(false);
        return;
      }

      // Authoritative comparison against fetched cloud profiles
      const userFound = cloudUsers.find((u: any) => {
        const dbEmail = (u.email || '').toLowerCase().trim();
        return dbEmail === normalizedEmail && u.password_hash_mock === normalizedPassword;
      });

      if (userFound) {
        if (userFound.status === AccountStatus.DISABLED) {
          setError('Account Deactivated: Access has been revoked by Compliance Manager.');
        } else {
          setIsSuccess(true);
          // Omit virtual 'password' key to prevent Supabase schema conflicts later
          const sessionUser = { 
            ...userFound, 
            role: userFound.role || UserRole.USER
          };
          setTimeout(() => onLogin(sessionUser as any), 800);
        }
      } else {
        setError('Invalid Credentials: The ID or Secret provided does not match our registry.');
      }
    } catch (err: any) {
      setError(`Handshake Exception: ${err.message || 'Unable to verify identity against cloud consensus.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfdfd] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-emerald-600 rounded-full blur-[180px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-amber-600 rounded-full blur-[180px]" />
      </div>

      <div className="w-full max-w-lg relative z-10">
        <div className="bg-white rounded-[3.5rem] shadow-[0_48px_80px_-16px_rgba(0,0,0,0.12)] overflow-hidden border border-gray-100/50">
          <div className="p-10 sm:p-14 md:p-16">
            <div className="flex flex-col items-center mb-10 text-center">
              <img src={PRIMARY_LOGO} alt="RPME Logo" className="h-32 sm:h-44 w-auto object-contain mb-10" onError={(e) => { e.currentTarget.src = FALLBACK_LOGO; }} />
              <div className="space-y-2">
                <h1 className="text-xs sm:text-sm font-black text-emerald-950 tracking-[0.4em] uppercase">SanctionGuard Portal</h1>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Enterprise Compliance Interface</p>
                <div className="mt-4 flex justify-center">
                   <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[7px] font-black uppercase tracking-widest border ${isCloudConnected ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                      {isCloudConnected ? <CheckCircle size={10} className="animate-pulse" /> : <WifiOff size={10} />}
                      {isCloudConnected ? 'Enterprise Node Online' : 'Cloud Registry Offline'}
                   </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-8 p-5 bg-red-50 border border-red-100 rounded-[1.5rem] flex items-start gap-4 text-red-600 text-[10px] font-black uppercase tracking-tight animate-in fade-in slide-in-from-top-2">
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <p className="leading-relaxed">{error}</p>
              </div>
            )}

            {isSuccess ? (
              <div className="flex flex-col items-center justify-center py-14">
                <Loader2 className="animate-spin text-emerald-600 mb-6" size={48} />
                <h3 className="text-lg font-black text-emerald-900 uppercase tracking-[0.2em]">Authorizing...</h3>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="space-y-7">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] ml-3">Compliance ID</label>
                  <div className="relative">
                    <Mail className="absolute left-7 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input type="email" required className="w-full bg-gray-50/50 border-2 border-transparent focus:border-emerald-800 focus:bg-white rounded-[1.5rem] py-6 pl-16 pr-8 outline-none transition-all font-black text-gray-700 text-sm shadow-sm" placeholder="user@rpmefirm.com" value={email} onChange={(e) => setEmail(e.target.value)}/>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] ml-3">Registry Secret</label>
                  <div className="relative">
                    <Lock className="absolute left-7 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input type={showPassword ? "text" : "password"} required className="w-full bg-gray-50/50 border-2 border-transparent focus:border-emerald-800 focus:bg-white rounded-[1.5rem] py-6 pl-16 pr-16 outline-none transition-all font-black text-gray-700 text-sm shadow-sm" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}/>
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-800">
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={isLoading} className="w-full bg-emerald-950 hover:bg-[#064e3b] text-white font-black py-7 rounded-[1.5rem] shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-[0.98] text-sm uppercase tracking-widest">
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Secure Entry'}
                </button>
              </form>
            )}
          </div>
          <div className="bg-gray-50/50 p-8 text-center border-t border-gray-100 flex justify-center items-center gap-5">
             <Globe size={16} className="text-gray-300" />
             <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em]">Authorized Enterprise Node v2.7.0</p>
             <Shield size={16} className="text-gray-300" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
