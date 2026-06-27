'use client';
import React, { useState, useEffect } from 'react';
import { getAllLeaveRequests } from '../../actions/leave-request';

export default function ArchivePage() {
  const [archive, setArchive] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllLeaveRequests().then(({ data }) => {
      setArchive(data);
      setLoading(false);
    });
  }, []);

  // دالة ذكية لترجمة وتنسيق نوع العطلة بشكل جمالي
  const formatLeaveType = (type) => {
    switch (type) {
      case 'annual': return { label: 'Annuel', css: 'bg-blue-50 text-blue-700 border-blue-100' };
      case 'exceptional': return { label: 'Exceptionnel', css: 'bg-amber-50 text-amber-700 border-amber-100' };
      case 'special': return { label: 'Spécial', css: 'bg-purple-50 text-purple-700 border-purple-100' };
      default: return { label: type, css: 'bg-slate-50 text-slate-700 border-slate-100' };
    }
  };

  return (
    <div className="min-h-screen bg-transparent font-sans text-slate-900">
      
      {/* Header de la page - Entête Épurée Premium */}
      <div className="mb-8 border-b border-slate-200/60 pb-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in">
        <div>
          <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 bg-clip-text text-transparent">
            Registre Général des Congés
          </h1>
          <p className="text-xs text-slate-400 font-semibold mt-1">
            Archives numériques de l'Établissement Public de Santé de Proximité (EPSP) Berriane
          </p>
        </div>
        
        {/* شارة إحصائية خفيفة تدل على عدد السجلات المحفوظة */}
        <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-xs text-xs font-bold text-slate-600">
          Total : <span className="text-blue-600 font-black">{archive?.length || 0}</span> Enregistrements
        </div>
      </div>

      {/* Structure du Registre Premium SaaS Data Grid */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden transition-all duration-300">
        
        {loading ? (
          <div className="p-16 text-center text-sm font-medium text-slate-400 animate-pulse">
            Chargement du registre en cours...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200/60 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="p-4 pl-6">N° Registre</th>
                  <th className="p-4">Nom & Prénom</th>
                  <th className="p-4">Type de Congé</th>
                  <th className="p-4">Période du Congé</th>
                  <th className="p-4">Remplaçant</th>
                  <th className="p-4 pr-6">Observations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {archive?.map((req) => {
                  const typeBadge = formatLeaveType(req.leaveType);
                  return (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors duration-200 group">
                      {/* ID التوثيق */}
                      <td className="p-4 pl-6 text-xs font-mono font-bold text-slate-400 group-hover:text-slate-600 transition-colors">
                        #{req.id.toString().padStart(4, '0')}
                      </td>
                      
                      {/* اسم الموظف مع رتبته إذا وجدت */}
                      <td className="p-4">
                        <div className="font-bold text-slate-800 text-[13px]">{req.employee?.name}</div>
                        {req.employee?.position && (
                          <div className="text-[10px] text-slate-400 font-medium mt-0.5">{req.employee.position}</div>
                        )}
                      </td>
                      
                      {/* شارة نوع العطلة الملونة بنعومة */}
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${typeBadge.css}`}>
                          {typeBadge.label}
                        </span>
                      </td>
                      
                      {/* التواريخ والمدة التفصيلية */}
                      <td className="p-4">
                        <div className="text-xs font-semibold text-slate-700">
                          Du <span className="font-mono text-slate-600">{new Date(req.startDate).toLocaleDateString('fr-FR')}</span> au <span className="font-mono text-slate-600">{new Date(req.endDate).toLocaleDateString('fr-FR')}</span>
                        </div>
                        <div className="text-[10px] font-black text-slate-400 mt-0.5 uppercase tracking-wide">
                          Durée: {req.daysTaken} Jours
                        </div>
                      </td>
                      
                      {/* المستخلف */}
                      <td className="p-4 text-xs font-bold text-slate-600">
                        {req.substitute && req.substitute !== '/' && req.substitute !== '............?' ? (
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                            {req.substitute}
                          </div>
                        ) : (
                          <span className="text-slate-300 font-normal">Aucun</span>
                        )}
                      </td>
                      
                      {/* الملاحظات */}
                      <td className="p-4 pr-6 text-xs text-slate-500 italic font-medium max-w-xs truncate">
                        {req.notes || <span className="text-slate-300 not-italic">—</span>}
                      </td>
                    </tr>
                  );
                })}

                {archive?.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-16 text-center text-xs font-bold text-slate-400">
                      Aucun enregistrement trouvé dans les archives historiques.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer du Registre */}
        <div className="p-4 bg-slate-50/50 border-t border-slate-100 text-center text-[10px] font-bold text-slate-400 tracking-wide uppercase">
          Fin du registre d'archives — Généré de manière sécurisée par le système RH
        </div>
      </div>
    </div>
  );
}