// app/dashboard/layout.js
'use client'; 

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Sélecteur visuel premium pour l'état actif / inactif
  const getLinkClass = (href) => {
    const baseClass = "group flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 relative overflow-hidden ";
    if (pathname === href) {
      return baseClass + "bg-blue-600/90 text-white shadow-[0_8px_20px_rgba(37,99,235,0.2)] border border-blue-500/30 backdrop-blur-md transform -translate-y-[1px]"; 
    }
    return baseClass + "text-slate-500 hover:text-blue-600 hover:bg-white/80 hover:shadow-[0_4px_12px_rgba(0,0,0,0.02)] border border-transparent hover:border-slate-100/80"; 
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-200 via-slate-100 to-slate-300 flex font-sans antialiased text-slate-800 p-4 md:p-6 gap-6 relative overflow-hidden">
      
      
      {/* Background Decorative Premium Ambient Blurs */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-200/20 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-indigo-100/30 rounded-full blur-[100px] pointer-events-none z-0" />
      
      {/* 📁 FLOATING ASIDE SIDEBAR - Fixed layout height without layout breaking */}
      <aside 
        className={`h-full bg-white/70 backdrop-blur-2xl border border-white/80 flex flex-col flex-shrink-0 print:hidden shadow-[0_24px_60px_-15px_rgba(15,23,42,0.04)] rounded-3xl transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] relative group/sidebar z-10 ${
          isCollapsed ? 'w-24' : 'w-76'
        }`}
      >
        {/* Premium Invisible-to-Visible Collapse Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-9 w-7 h-7 bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-full flex items-center justify-center text-xs shadow-[0_4px_12px_rgba(0,0,0,0.05)] cursor-pointer opacity-0 group-hover/sidebar:opacity-100 transition-all duration-300 hover:bg-slate-50 hover:scale-105 active:scale-95 z-50 text-slate-400 hover:text-slate-700"
          aria-label="Toggle Sidebar"
        >
          <span className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}>←</span>
        </button>

        {/* Beautiful Logo Area */}
        <div className={`p-6 border-b border-slate-200/40 flex-shrink-0 transition-all duration-300 ${isCollapsed ? 'text-center px-2' : 'text-left'}`}>
          {!isCollapsed ? (
            <div className="flex flex-col gap-0.5 animate-[fadeIn_0.4s_ease-out]">
              <h2 className="text-lg font-black tracking-tight bg-gradient-to-r from-slate-950 via-slate-900 to-blue-900 bg-clip-text text-transparent">
                Gestion des Congés
              </h2>
              <p className="text-[10px] uppercase tracking-widest font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mt-0.5">
                Ressources Humaines
              </p>
            </div>
          ) : (
            <span className="text-base font-black text-blue-600 bg-gradient-to-br from-white to-blue-50/50 w-12 h-12 rounded-2xl inline-flex items-center justify-center shadow-[0_4px_12px_rgba(37,99,235,0.08)] border border-blue-100/80 group-hover/sidebar:scale-105 transition-transform duration-300">
              GC
            </span>
          )}
        </div>
        
        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200/50">
          <Link href="/dashboard" className={getLinkClass('/dashboard')}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-lg flex-shrink-0 transition-all duration-300 ${pathname === '/dashboard' ? 'bg-white/20 shadow-xs' : 'bg-slate-100/60 group-hover:bg-blue-50 group-hover:scale-105'}`}>
              📊
            </div>
            <span className={`transition-all duration-300 whitespace-nowrap ${isCollapsed ? 'opacity-0 w-0 overflow-hidden translate-x-[-10px]' : 'opacity-100 translate-x-0'}`}>
              Tableau de Bord
            </span>
            {pathname === '/dashboard' && !isCollapsed && (
              <span className="absolute right-3 w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            )}
          </Link>
          
          <Link href="/dashboard/new-leave" className={getLinkClass('/dashboard/new-leave')}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-lg flex-shrink-0 transition-all duration-300 ${pathname === '/dashboard/new-leave' ? 'bg-white/20 shadow-xs' : 'bg-slate-100/60 group-hover:bg-blue-50 group-hover:scale-105'}`}>
              ➕
            </div>
            <span className={`transition-all duration-300 whitespace-nowrap ${isCollapsed ? 'opacity-0 w-0 overflow-hidden translate-x-[-10px]' : 'opacity-100 translate-x-0'}`}>
              Nouveau Congé
            </span>
            {pathname === '/dashboard/new-leave' && !isCollapsed && (
              <span className="absolute right-3 w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            )}
          </Link>
          
          <Link href="/dashboard/employees" className={getLinkClass('/dashboard/employees')}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-lg flex-shrink-0 transition-all duration-300 ${pathname === '/dashboard/employees' ? 'bg-white/20 shadow-xs' : 'bg-slate-100/60 group-hover:bg-blue-50 group-hover:scale-105'}`}>
              👥
            </div>
            <span className={`transition-all duration-300 whitespace-nowrap ${isCollapsed ? 'opacity-0 w-0 overflow-hidden translate-x-[-10px]' : 'opacity-100 translate-x-0'}`}>
              Liste des Employés
            </span>
            {pathname === '/dashboard/employees' && !isCollapsed && (
              <span className="absolute right-3 w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            )}
          </Link>
          
          <Link href="/dashboard/reports" className={getLinkClass('/dashboard/reports')}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-lg flex-shrink-0 transition-all duration-300 ${pathname === '/dashboard/reports' ? 'bg-white/20 shadow-xs' : 'bg-slate-100/60 group-hover:bg-blue-50 group-hover:scale-105'}`}>
              🗂️
            </div>
            <span className={`transition-all duration-300 whitespace-nowrap ${isCollapsed ? 'opacity-0 w-0 overflow-hidden translate-x-[-10px]' : 'opacity-100 translate-x-0'}`}>
              Archives & Rapports
            </span>
            {pathname === '/dashboard/reports' && !isCollapsed && (
              <span className="absolute right-3 w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            )}
          </Link>
        </nav>

        {/* Premium Workspace/Brand Status Card Footer */}
        {!isCollapsed && (
          <div className="p-4 m-4 bg-gradient-to-b from-white/60 to-slate-50/40 border border-slate-200/50 rounded-2xl flex flex-col gap-3 justify-start flex-shrink-0 shadow-xs animate-[fadeIn_0.5s_ease-out]">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center flex-shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]"></span>
                <span className="absolute w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-slate-700">Système Sécurisé</span>
                <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">v2.6 Premium</span>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* 🟢 FLOATING MAIN CONTENT CONTAINER - Fixed viewport height layout */}
      <main className="flex-1 h-full bg-white/60 backdrop-blur-2xl border border-white/80 rounded-3xl p-6 md:p-8 overflow-y-auto shadow-[0_24px_60px_-15px_rgba(15,23,42,0.04)] z-10 transition-all duration-300">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

    </div>
  );
}