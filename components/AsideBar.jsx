
import React from "react";
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navItems } from "../config/sidebar.config";

export default function AsideBar({
}) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const pathname = usePathname();

    const getLinkClass = (href) => {
        const baseClass = "group flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 relative overflow-hidden ";
        if (pathname === href) {
        return baseClass + "bg-blue-600/90 text-white shadow-[0_8px_20px_rgba(37,99,235,0.2)] border border-blue-500/30 backdrop-blur-md transform -translate-y-[1px]";
        }
        return baseClass + "text-slate-500 hover:text-blue-600 hover:bg-white/80 hover:shadow-[0_4px_12px_rgba(0,0,0,0.02)] border border-transparent hover:border-slate-100/80";
    };

    return(
        <aside
        className={`h-full bg-white/70 backdrop-blur-2xl border border-white/80 flex flex-col flex-shrink-0 print:hidden shadow-[0_24px_60px_-15px_rgba(15,23,42,0.04)] rounded-3xl transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] relative group/sidebar z-10 ${isCollapsed ? 'w-24' : 'w-76'
          }`}
      >
        {/* Premium Invisible-to-Visible Collapse Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-9 w-7 h-7 bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-full flex items-center justify-center text-xs shadow-[0_4px_12px_rgba(0,0,0,0.05)] cursor-pointer opacity-0 group-hover/sidebar:opacity-100 transition-transform duration-300 hover:bg-slate-50 hover:scale-105 active:scale-95 z-50 text-slate-400 hover:text-slate-700"
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

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200/50">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link href={item.href} key={item.index} className={getLinkClass(item.href)}>
                {/* Icon Wrapper (Stays stable) */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-lg flex-shrink-0 transition-all duration-300 ${isActive ? 'bg-white/20 shadow-xs' : 'bg-slate-100/60 group-hover:bg-blue-50 group-hover:scale-105'
                  }`}>
                  {item.icon}
                </div>

                {/* Smooth Text Container (Locks layout sizing) */}
                <div className={`grid transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isCollapsed ? 'grid-cols-[0fr] opacity-0 translate-x-[-10px]' : 'grid-cols-[1fr] opacity-100 translate-x-0'
                  }`}>
                  <span className="whitespace-nowrap overflow-hidden font-medium text-sm pl-2">
                    {item.title}
                  </span>
                </div>

                {/* Active Indicator */}
                {isActive && !isCollapsed && (
                  <span className="absolute right-3 w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                )}
              </Link>
            );
          })}
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
    )
}