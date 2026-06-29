// app/dashboard/layout.js
'use client';
import AsideBar from '../../components/AsideBar';

export default function DashboardLayout({ children }) {

  return (
    <div className="h-screen bg-gradient-to-br from-slate-200 via-slate-100 to-slate-300 flex font-sans antialiased text-slate-800 p-4 md:p-6 gap-6 relative overflow-hidden">
      {/* Background Decorative Premium Ambient Blurs */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-200/20 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-indigo-100/30 rounded-full blur-[100px] pointer-events-none z-0" />

      {/* 📁 FLOATING ASIDE SIDEBAR - Fixed layout height without layout breaking */}
      <AsideBar 
      />

      {/* 🟢 FLOATING MAIN CONTENT CONTAINER - Fixed viewport height layout */}
      <main className="flex-1 h-full bg-white/60 backdrop-blur-2xl border border-white/80 rounded-3xl p-6 md:p-8 overflow-y-auto shadow-[0_24px_60px_-15px_rgba(15,23,42,0.04)] z-10 transition-all duration-300">
        <div className="max-w-none mx-auto">
          {children}
        </div>
      </main>

    </div>
  );
}