import React from 'react';
import { LayoutDashboard, Users, ShieldAlert, FileText, Settings, Globe } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { label: 'Client Management', path: '/clients', icon: <Users size={20} /> },
    { label: 'Sanctions List', path: '/sanctions', icon: <Globe size={20} /> },
    { label: 'Screening Reports', path: '/reports', icon: <FileText size={20} /> },
    { label: 'System Admin', path: '/admin', icon: <Settings size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full z-10">
        <div className="p-6 border-b border-slate-700">
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
            <p className="font-semibold text-slate-200 mb-1">System Status</p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span>Sanctions: Synced</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span>Database: Connected</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 overflow-y-auto">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-20 px-8 py-4 flex justify-between items-center shadow-sm">
          <h2 className="text-xl font-semibold text-gray-800">
            {navItems.find(n => n.path === location.pathname)?.label || 'Overview'}
          </h2>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">Compliance Officer</p>
              <p className="text-xs text-gray-500">Logged in</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200">
              CO
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;