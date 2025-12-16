import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, ShieldAlert, FileText, Settings, Globe, AlertCircle, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
  cloudError?: string | null;
}

const Layout: React.FC<LayoutProps> = ({ children, cloudError }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Close sidebar automatically on route change (mobile UX)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const navItems = [
    { label: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { label: 'Client Management', path: '/clients', icon: <Users size={20} /> },
    { label: 'Sanctions List', path: '/sanctions', icon: <Globe size={20} /> },
    { label: 'Screening Reports', path: '/reports', icon: <FileText size={20} /> },
    { label: 'System Admin', path: '/admin', icon: <Settings size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 overflow-hidden">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col 
          transform transition-transform duration-300 ease-in-out 
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:translate-x-0 md:static md:inset-auto md:h-full flex-shrink-0
        `}
      >
        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded bg-white flex items-center justify-center overflow-hidden shrink-0">
              <img 
                src="https://ui-avatars.com/api/?name=RPME+Audit&background=ffffff&color=0f172a&bold=true&size=128" 
                alt="RPME Logo" 
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">SanctionGuard</h1>
              <p className="text-xs text-slate-400">UN Compliance System</p>
            </div>
          </div>
          {/* Close Button (Mobile Only) */}
          <button 
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-slate-400 hover:text-white p-1"
          >
            <X size={24} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                location.pathname === item.path
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-800 rounded p-3 text-xs text-slate-400">
            <div className="flex justify-between items-center mb-1">
               <p className="font-semibold text-slate-200">System Status</p>
               <span className="text-[10px] bg-slate-700 px-1 rounded">v1.2.0</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span>Sanctions: Synced</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${cloudError ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></span>
              <span>Database: {cloudError ? 'Error' : 'Connected'}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto flex flex-col h-full w-full relative min-w-0">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm flex-shrink-0">
           {/* Alert Banner */}
           {cloudError && (
              <div className="bg-red-600 text-white px-4 md:px-8 py-3 flex items-center justify-between animate-fade-in">
                  <div className="flex items-center gap-3">
                      <AlertCircle size={20} className="shrink-0" />
                      <span className="text-sm font-medium line-clamp-1">{cloudError}</span>
                  </div>
                  <Link 
                    to="/admin" 
                    className="bg-white text-red-600 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider hover:bg-red-50 transition-colors whitespace-nowrap ml-2"
                  >
                    Fix
                  </Link>
              </div>
           )}
           
           <div className="px-4 md:px-8 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                {/* Hamburger Button (Mobile Only) */}
                <button 
                  onClick={() => setSidebarOpen(true)}
                  className="md:hidden text-gray-500 hover:text-gray-900 p-1 -ml-2"
                >
                  <Menu size={24} />
                </button>
                <h2 className="text-xl font-semibold text-gray-800">
                  {navItems.find(n => n.path === location.pathname)?.label || 'Overview'}
                </h2>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">Compliance Officer</p>
                  <p className="text-xs text-gray-500">Logged in</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200">
                  CO
                </div>
              </div>
          </div>
        </header>

        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full flex-1">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;