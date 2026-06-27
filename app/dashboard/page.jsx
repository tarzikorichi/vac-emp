'use client';

import React, { useState, useEffect } from 'react';
import { getLeaveAlerts, getDashboardStats, getActiveLeavesWithReturnDate } from '../actions/leave-request';

export default function Dashboard() {
  // Données simulées traduites et adaptées
  const [stats, setStats] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [activeLeaves, setActiveLeaves] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  async function fetchAlerts() {
    const result = await getLeaveAlerts();
    if (result.success) {
      setAlerts(result.data);
    }
    console.log('Alertes critiques récupérées :', result.data);
  }
  async function loadStats() {
    const result = await getDashboardStats();
    if (result.success) {
      setStats(result.data);
    }
  }
  async function loadActiveLeaves() {
    setIsLoading(true);
    const result = await getActiveLeavesWithReturnDate();
    if (result.success) {
      setActiveLeaves(result.data);
    }
    setIsLoading(false);
  }
  useEffect(() => {
    fetchAlerts();
    loadStats();
    loadActiveLeaves();
  }, []);


  if (isLoading) return <p className="text-sm p-5 text-slate-400 animate-pulse">Chargement البيانات...</p>;
  if (activeLeaves.length === 0) {
    return (
      <div className="text-center p-8 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs font-bold bg-slate-50">
        🛡️ Aucun employé n'est en congé actuellement.
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-transparent font-sans text-slate-800">

      {/* HEADER — Entête épurée et moderne */}
      <header className="relative overflow-hidden rounded-3xl mb-10 border border-slate-200/70 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-7 shadow-[0_10px_40px_rgba(15,23,42,0.05)] print:hidden">

        {/* Decorative Background */}
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-slate-300/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-indigo-400/5 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

          {/* Left */}
          <div className="space-y-3">

            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
              Dashboard
              <span className="h-1 w-1 rounded-full bg-slate-300"></span>
              Personnel
            </div>

            <div className="flex items-center gap-4">

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-white shadow-lg">
                📊
              </div>

              <div>

                <h1 className="text-4xl font-black tracking-tight text-slate-900">
                  Tableau de Bord
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Suivi des soldes de congés, absences et de la situation légale du personnel.
                </p>

              </div>

            </div>

            <div className="flex flex-wrap gap-2 pt-2">

              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                📅 27 Juin 2026
              </span>

              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                Synchronisé il y a 2 min
              </span>

            </div>

          </div>

          {/* Right */}
          <div className="flex flex-col items-end gap-4">

            {/* Server */}
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm">

              <div className="relative">
                <span className="absolute inline-flex h-3 w-3 animate-ping rounded-full bg-emerald-400 opacity-60"></span>
                <span className="relative block h-3 w-3 rounded-full bg-emerald-500"></span>
              </div>

              <div>

                <p className="text-xs text-slate-400 font-semibold">
                  Serveur EPSP
                </p>

                <p className="text-sm font-bold text-emerald-600">
                  Connecté
                </p>

              </div>

            </div>

            {/* Actions */}
            <div className="flex gap-2 " >

              <button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md">
                ⟳ Actualiser
              </button>

              <button className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-lg">
                Exporter
              </button>

            </div>

          </div>

        </div>

      </header>

      {/* SECTION ALERTES — Alertes critiques (Règle des 6 mois / 21 jours) */}
      {alerts.length > 0 && (
        <section className="mb-10 print:hidden animate-[fadeIn_0.5s_ease-out]">
          <div className="bg-rose-50/40 backdrop-blur-md border border-rose-100/70 p-6 rounded-3xl shadow-[0_12px_40px_-12px_rgba(244,63,94,0.08)]">
            <div className="flex items-center gap-2.5 text-rose-800 font-black text-sm mb-5 tracking-tight">
              <span className="text-xl inline-block animate-bounce">⚠️</span>
              <h2>Alertes Critiques : Congés Médicaux Dus Immédiatement (21 Jours)</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {alerts.map((alert) => (
                <div key={alert.id} className=" bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex justify-between items-center group hover:border-rose-200/80 hover:shadow-[0_8px_24px_rgba(244,63,94,0.04)] transition-all duration-300 hover:-translate-y-0.5">
                  <div className="space-y-1">
                    <h4 className="font-black text-slate-900 text-sm group-hover:text-rose-950 transition-colors">{alert.name}</h4>
                    <p className="text-xs text-slate-400 font-semibold">{alert.role}</p>
                    <div className="pt-2">
                      <span className="inline-flex items-center text-[11px] text-rose-600 font-bold bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100/50">
                        Dernier congé : {alert.lastSpecialLeave}
                      </span>
                    </div>
                  </div>
                  <span className="bg-gradient-to-r from-rose-500 to-rose-600 text-white text-[10px] font-black px-3 py-2 rounded-xl uppercase tracking-wider shadow-xs shadow-rose-500/10 group-hover:scale-105 transition-all duration-300">
                    Échéance
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SECTION STATISTIQUES — Cartes d'indicateurs clés */}
      
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-[0_10px_30px_-10px_rgba(0,0,0,0.02)] transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.04)] hover:-translate-y-1 group">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Effectif Total</p>
              <h3 className="text-5xl font-black text-slate-950 tracking-tight transition-all duration-300 group-hover:text-blue-600">{stats.totalEmployees}</h3>
            </div>
            <span className="w-11 h-11 bg-blue-50/60 text-blue-600 rounded-2xl flex items-center justify-center text-xl border border-blue-100/30 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-xs">👥</span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-[0_10px_30px_-10px_rgba(0,0,0,0.02)] transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.04)] hover:-translate-y-1 group">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">En Congé Actuellement</p>
              <h3 className="text-5xl font-black text-emerald-600 tracking-tight">{stats.currentlyOnLeave}</h3>
            </div>
            <span className="w-11 h-11 bg-emerald-50/60 text-emerald-600 rounded-2xl flex items-center justify-center text-xl border border-emerald-100/30 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-xs">🌴</span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-[0_10px_30px_-10px_rgba(0,0,0,0.02)] transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.04)] hover:-translate-y-1 group">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Régime Spécifique</p>
              <h3 className="text-5xl font-black text-amber-600 tracking-tight">{stats.specialRoleCount}</h3>
            </div>
            <span className="w-11 h-11 bg-amber-50/60 text-amber-600 rounded-2xl flex items-center justify-center text-xl border border-amber-100/30 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-xs">🩻</span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-[0_10px_30px_-10px_rgba(0,0,0,0.02)] transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.04)] hover:-translate-y-1 group">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Jours Exceptionnels</p>
              <h3 className="text-5xl font-black text-purple-600 tracking-tight">{stats.totalExceptionalDays}</h3>
            </div>
            <span className="w-11 h-11 bg-purple-50/60 text-purple-600 rounded-2xl flex items-center justify-center text-xl border border-purple-100/30 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-xs">🛡️</span>
          </div>
        </div>
      </section>

      {/* SECTION TABLEAU — Grille de Données des Soldes Annuels */}
      <section className="bg-white rounded-3xl border border-slate-200/50 shadow-[0_12px_40px_-15px_rgba(15,23,42,0.03)] overflow-hidden transition-shadow duration-300 hover:shadow-[0_16px_48px_-12px_rgba(15,23,42,0.05)]">
        <div className="p-6 border-b border-slate-100 bg-slate-50/30 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="space-y-0.5">
            <h3 className="font-black text-slate-900 text-base tracking-tight">Situation Actuelle des Soldes par Année</h3>
            <p className="text-xs text-slate-400 font-semibold">Détail des droits annuels (limite de 2 ans) et reliquats exceptionnels cumulés</p>
          </div>
          
        </div>

        <div className="overflow-x-auto scrollbar-none">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 sticky top-0 z-10 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-widest">Employé / Service</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-widest">Période du Congé</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-widest">Date de Reprise (تاريخ العودة)</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-widest">Régime de Travail</th>
              </tr>
            </thead>
            <tbody className="text-slate-600 text-sm divide-slate-100/70">
              {activeLeaves.map((leave) => (
                <tr key={leave.id} className="group border-b border-slate-100 transition-all duration-300 hover:bg-blue-50/40 hover:shadow-lg hover:border-l-4 hover:border-blue-500">

                  {/* الموظف والمصلحة */}
                  <td className="py-6 px-6 pl-7">
                    <div className="font-bold text-slate-800 text-[13px] group-hover:text-blue-950 transition-colors">{leave.name}</div>
                    <div className="text-[11px] text-slate-400 font-semibold mt-0.5">{leave.department}</div>
                  </td>

                  {/* فترة العطلة من ... إلى */}
                  <td className="py-6 px-6 text-xs font-medium text-slate-600">
                    <div className="flex flex-col gap-0.5">
                      <span>Du: <span className="font-bold text-slate-800">{leave.startDate}</span></span>
                      <span>Au: <span className="font-bold text-slate-800">{leave.endDate}</span></span>
                    </div>
                  </td>

                  {/* تاريخ العودة الفعلي المحسوب تلقائياً */}
                  <td className="py-6 px-6 text-xs font-bold text-indigo-600 bg-indigo-50/30 group-hover:bg-indigo-50/60 transition-colors">
                    <span className="inline-flex items-center gap-1.5 capitalize">
                      🗓️ {leave.returnDate}
                    </span>
                  </td>

                  {/* نظام العمل (خاص أو عادي) */}
                  <td className="py-6 px-6 pr-7">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl border transition-all duration-300 ${leave.regimeType === 'Radio / Asthme'
                        ? 'bg-amber-50/80 text-amber-700 border-amber-100 shadow-2xs group-hover:bg-amber-100 ring-2 ring-amber-500/20'
                        : 'bg-blue-50/80 text-blue-700 border-blue-100 shadow-2xs group-hover:bg-blue-100'
                      }`}>
                      {leave.regimeType}
                    </span>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </section>

    </div>
  );
}