'use client';
import React, { useState, useEffect } from 'react';
import { getAllEmployees, updateEmployeeRecognitionBalance } from '../../actions/employee';
import { showAlert } from '../../utils/alert';

export default function BalancesManagement() {
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState(''); // ✅ حقل تتبع نص البحث
  const [mounted, setMounted] = useState(false);

  async function loadEmployeesBalance() {
    const result = await getAllEmployees();
    if (result.success) {
      setEmployees(result.data);
      console.log(result.data)
    } else {
      showAlert.toastError(`Erreur lors de la récupération des employés : ${result.error}`);
    }
  }

  useEffect(() => {
    loadEmployeesBalance();
    setMounted(true);
  }, []);

  // دالة زيادة أو نقصان عدد الأيام محلياً في الـ State
  const handleUpdateDays = async (id, daysRec, operation) => {
    const currentDays = daysRec
    // const newDays = operation === 'increment' ? currentDays + 1 : Math.max(0, currentDays - 1);
    const newDays = operation === 'increment' ? currentDays + 1 : operation === 'decrement' ?  Math.max(0, currentDays - 1) : daysRec
    const req = await updateEmployeeRecognitionBalance(id, newDays)
    if(req.success){
      showAlert.success('Le solde a été mis à jour avec succès !')
      loadEmployeesBalance()
    } else {
      showAlert.error(req.error)
    }


  };

  // ✅ تصفية الموظفين بناءً على الاسم المكتوب
  const filteredEmployees = employees.filter(emp => {
    if (!emp || !emp.name) return false; // إذا كان الموظف أو الاسم فارغاً، تخطاه ولا تكسر التطبيق
    return emp.name.toLowerCase().includes(searchTerm.toLowerCase());
   });

  if (!mounted) return <div className="p-6 text-slate-400 animate-pulse">Chargement de la page...</div>;

  return (
    <div className="p-6 space-y-6 text-left" dir="ltr" suppressHydrationWarning>
      
      {/* رأس الصفحة العلوية */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-lg font-black text-slate-900">Gestion Historique des Soldes</h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Ajustement direct des droits de congés annuels par employé (2023 - 2026)</p>
        </div>

        {/* ✅ شريط البحث الجديد */}
        <div className="relative w-full md:w-72">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400 text-sm">
            🔍
          </span>
          <input
            type="text"
            placeholder="Rechercher par nom..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 placeholder-slate-400"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* الجدول التفاعلي للأرصدة */}
      <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-xs">
        <div className="overflow-x-auto scrollbar-none">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-black uppercase tracking-wider text-slate-400">
                <th className="p-4 pl-6">Nom & Prénom</th>
                <th className="p-4">Spécialité</th>
                <th className="p-4">Service</th>
                <th className="p-4 text-center bg-indigo-50/40 text-indigo-700 font-black">Reconnaissance jours</th>
                
              </tr>
            </thead>
            <tbody className="text-slate-600 text-sm divide-y divide-slate-100/70">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-400 text-xs font-semibold animate-pulse">
                    Chargement des données des employés...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                // ✅ عرض رسالة تنبيه في حال عدم وجود نتائج تطابق البحث
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-400 text-xs font-bold bg-slate-50/50">
                    ⚠️ Aucun employé trouvé avec le nom "{searchTerm}"
                  </td>
                </tr>
              ) : (
                // ✅ هنا نستخدم المصفوفة المفلترة بدلاً من المصفوفة الكاملة
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/40 transition-colors duration-150">
                    <td className="p-4 pl-6 font-bold text-slate-800">{emp.name}</td>
                    <td className="p-4 text-xs font-semibold text-slate-400">{emp.position}</td>
                    <td className="p-4 text-xs font-bold text-slate-600">{emp.department}</td>
                    
                    <td className={`p-4 text-center 'bg-indigo-50/10'}`}>
                        <div className="flex items-center justify-center gap-2.5">
                          <button 
                            onClick={() => handleUpdateDays(emp.id, emp.recognitionBalance, 'decrement')}
                            className="w-6 h-6 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-600 font-bold transition-all flex items-center justify-center text-xs shadow-2xs cursor-pointer select-none"
                          >
                            -
                          </button>
                          
                          <input
                            type="number"
                            min="0"
                            value={emp.recognitionBalance ?? ''}
                            onChange={(e) => handleUpdateDays(emp.id, e.target.value, 'addNum')}
                            className="w-12 text-center font-mono font-black text-slate-800 bg-slate-50 border border-slate-200 rounded-md py-0.5 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:bg-white transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          
                          <button 
                            onClick={() => handleUpdateDays(emp.id, emp.recognitionBalance, 'increment')}
                            className="w-6 h-6 rounded-lg border border-slate-200 bg-white hover:bg-emerald-50 hover:text-emerald-600 font-bold transition-all flex items-center justify-center text-xs shadow-2xs cursor-pointer select-none"
                          >
                            +
                          </button>
                        </div>
                      </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}