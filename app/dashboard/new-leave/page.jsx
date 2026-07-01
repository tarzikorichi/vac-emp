'use client';
import React, { useState, useEffect, useRef, useMemo, } from 'react';
import { getAllEmployeesForLeaveRegistration, runHistoricalMigration } from './../../actions/employee';
import { createLeaveRequest } from './../../actions/leave-request';
import { showAlert } from '../../utils/alert';
import { useRouter } from 'next/navigation';

export default function NewLeave() {
  const router = useRouter();

  // États du formulaire (Form States) - إضافة حقل المستخلف (substitute) هنا
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [normalLeave, setNormalLeave] = useState({ type: 'annual', startDate: '', endDate: '', reason: '', substitute: '' });
  const [specialLeave, setSpecialLeave] = useState({ periodType: '6months', startDate: '', medicalReport: '', notes: '', substitute: '' });
  const [employeesMock, setEmployeesMock] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);

  const selectedEmployee = useMemo(() => {
    return employeesMock.find(emp => String(emp.id) === String(selectedEmpId));
  }, [selectedEmpId, employeesMock]);

  async function loadEmployees() {
    const result = await getAllEmployeesForLeaveRegistration();
    if (result.success) {
      setEmployeesMock(result.data);
    } else {
      showAlert.toastError(`Erreur lors de la récupération des employés : ${result.error}`);
    }
  }

  useEffect(() => {
    loadEmployees();

  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      setSearchQuery(selectedEmployee.name);
    } else {
      setSearchQuery('');
    }
  }, [selectedEmployee])

  const filteredEmployees = useMemo(() => {
    if (!searchQuery || (selectedEmployee && searchQuery === selectedEmployee.name)) {
      return employeesMock;
    }
    return employeesMock.filter((emp) =>
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.department?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, employeesMock, selectedEmployee]);

  const handleSelect = (emp) => {
    setSelectedEmpId(emp.id); // Triggers your parent handler logic
    setSearchQuery(emp.name);
    setIsOpen(false);
    handleChangeEmployee(emp.id)
  };

  const handleClear = () => {
    setSelectedEmpId('');
    setSearchQuery('');
    setIsOpen(true);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        // Reset query to selected name if they click away without picking
        setSearchQuery(selectedEmployee ? selectedEmployee.name : '');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedEmployee]);

  const currentEmployee = employeesMock.find(emp => emp.id === Number(selectedEmpId));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeLeave = currentEmployee?.leaveRequests?.find(request => {
    if (request.status !== "approved") return false; // نتحقق فقط من العطل المقبولة
    const startDate = new Date(request.startDate);
    startDate.setHours(0,0,0,0);
    const endDate = new Date(request.endDate);
    endDate.setHours(0,0,0,0);
    return today >= startDate && today <= endDate;
  });

  // 📐 Fonction pour calculer la date de fin selon la date de début et le nombre de jours
  const getEndDate = (startDate, days) => {
    if (!startDate || !days || days <= 0) return '';
    const date = new Date(startDate);
    date.setDate(date.getDate() + parseInt(days) - 1);
    return date.toISOString().split('T')[0];
  };

  // 📐 Fonction pour calculer le nombre de jours entre deux dates
  const getDaysCount = (startDate, endDate) => {
    if (!startDate || !endDate) return '';
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end - start;
    if (diffTime < 0) return 0;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  // 📐 Fonction pour calculer la date réelle de reprise du travail
  const getReturnDate = (endDate) => {
    if (!endDate) return '';
    const date = new Date(endDate);
    date.setDate(date.getDate() + 1);
    return date.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const currentDuration = getDaysCount(normalLeave.startDate, normalLeave.endDate);

  // Gestionnaire unifié de dépôt des congés
  const handleAddLeave = async (e, category) => {
    e.preventDefault();
    if (isLoading) return;
    if (activeLeave) return showAlert.toastError('Opération impossible :d\ Cet employé est déjà en congé actuellement. Vous ne pouvez pas lui attribuer un nouveau congé pour le moment.');
    if (!selectedEmpId) return showAlert.toastError('Veuillez d\'abord sélectionner un employé');

    let payload = {
      employeeId: parseInt(selectedEmpId),
      startDate: '',
      endDate: '',
      daysTaken: 0,
      leaveType: '',
      notes: '',
      substitute: '' // إضافة الحقل في الـ Payload المرسل للأكشن
    };

    if (category === 'normal') {
      if (!normalLeave.startDate || !normalLeave.endDate) {
        return showAlert.toastError('Veuillez spécifier la date de début et de fin du congé ordinaire');
      }
      payload.startDate = normalLeave.startDate;
      payload.endDate = normalLeave.endDate;
      payload.daysTaken = currentDuration;
      payload.leaveType = normalLeave.type;
      payload.notes = normalLeave.reason;
      payload.substitute = normalLeave.substitute; // تمرير اسم مستخلف العطلة العادية
    } else if (category === 'special') {
      if (!specialLeave.startDate) {
        return showAlert.toastError('Veuillez spécifier la date de début du congé spécial');
      }
      if (!specialLeave.medicalReport) {
        return showAlert.toastError('Veuillez saisir la référence du rapport de la médecine du travail');
      }

      // 🛠️ بداية منطق حساب التاريخ باستثناء الجمعة والسبت
      let currentDate = new Date(specialLeave.startDate);
      let workingDaysCount = 0;
      const totalDaysNeeded = 21;

      while (workingDaysCount < totalDaysNeeded) {
        const dayOfWeek = currentDate.getDay(); // 0 = الأحد, 5 = الجمعة, 6 = السبت

        // إذا كان اليوم الحالي ليس عطلة نهاية أسبوع (ليس جمعة 5 وليس سبت 6)
        if (dayOfWeek !== 5 && dayOfWeek !== 6) {
          workingDaysCount++; // احسبه كـ يوم عمل فعلي
        }

        // إذا لم نصل بعد إلى اليوم الـ 21، ننتقل بالرزنامة إلى اليوم التالي
        if (workingDaysCount < totalDaysNeeded) {
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }

      // تحويل تاريخ النهاية المحسوب إلى صيغة نصية نظيفة (YYYY-MM-DD) لتخزينه
      const calculatedEndDate = currentDate.toISOString().split('T')[0];
      // 🛑 نهاية منطق الحساب المحدث

      payload.startDate = specialLeave.startDate;
      payload.endDate = calculatedEndDate;
      payload.daysTaken = 21;
      payload.leaveType = specialLeave.periodType;
      payload.notes = `Rapport Médecine du Travail : ${specialLeave.medicalReport}. ${specialLeave.notes || ''}`;
      payload.substitute = specialLeave.substitute; // تمرير اسم مستخلف العطلة الخاصة
      // if (!specialLeave.startDate) {
      //   return showAlert.toastError('Veuillez spécifier la date de début du congé spécial');
      // }
      // if (!specialLeave.medicalReport) {
      //   return showAlert.toastError('Veuillez saisir la référence du rapport de la médecine du travail');
      // }

      // const calculatedEndDate = getEndDate(specialLeave.startDate, 21);

      // payload.startDate = specialLeave.startDate;
      // payload.endDate = calculatedEndDate;
      // payload.daysTaken = 21;
      // payload.leaveType = specialLeave.periodType;
      // payload.notes = `Rapport Médecine du Travail : ${specialLeave.medicalReport}. ${specialLeave.notes || ''}`;
      // payload.substitute = specialLeave.substitute; // تمرير اسم مستخلف العطلة الخاصة
    }

    setIsLoading(true);
    try {
      const result = await createLeaveRequest(payload);
      if (result.success) {
        showAlert.toastSuccess('Congé enregistré avec succès ! Redirection vers la page d\'impression...');
        router.push(`/dashboard/leave-requests`);
      } else {
        showAlert.toastError("Échec du dépôt de congé : " + result.error);
      }
    } catch (err) {
      showAlert.toastError("Une erreur inattendue est survenue lors du traitement");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeEmployee = (id) => {
    setSelectedEmpId(id);

    if (id) {
      const today = new Date().toISOString().split('T')[0];
      setNormalLeave(prev => ({ ...prev, startDate: today, endDate: '', substitute: '' }));
      setSpecialLeave(prev => ({ ...prev, startDate: today, medicalReport: '', notes: '', substitute: '' }));
    }
  };

  return (
    <div className="mx-auto p-4 md:p-6 space-y-6 text-left" dir="ltr">

      <button
        onClick={async () => {
          if (confirm("Êtes-vous sûr de vouloir migrer le registre papier maintenant ?")) {
            const result = await runHistoricalMigration();
            if (result.success) {
              showAlert.toastSuccess(result.message);
            } else {
              showAlert.toastError("Échec de la migration : " + result.error);
            }
          }
        }}
        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
      >
        📥 Cliquez ici pour migrer le registre papier immédiatement
      </button>

      {/* 1. En-tête de la page */}
      <header className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-8">
        {/* Background */}
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-indigo-500/5 blur-3xl" />
        <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-blue-500/5 blur-3xl" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          {/* LEFT */}
          <div className="flex gap-5">
            {/* Icon */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <span className="inline-flex rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                Gestion des congés
              </span>
              <h1 className="mt-3 text-3xl font-black text-slate-900">
                Nouveau congé
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                Planifiez et attribuez un nouveau congé à un employé en respectant les règles légales et le solde disponible.
              </p>
            </div>
          </div>
          {/* RIGHT */}
          <div className="flex flex-wrap gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Statut
              </p>
              <p className="mt-1 font-bold text-emerald-600">
                Brouillon
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Étape
              </p>
              <p className="mt-1 font-bold text-slate-700">
                1 / 3
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Sélection de l'employé et carte d'information */}
      <div className="space-y-6">

        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <label className="mb-3 block text-sm font-bold text-slate-700">
            Rechercher un employé
          </label>

          {/* Main Container */}
          <div className="relative" ref={containerRef}>
            {/* User Icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 z-10 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.1a7.5 7.5 0 0115 0"
              />
            </svg>

            {/* Input Text Field */}
            <input
              type="text"
              placeholder="Tapez le nom d'un employé..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-10 font-medium outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100/50 text-slate-800 placeholder-slate-400"
            />

            {/* Right Action Trigger Buttons (Chevron or Clear Cross) */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchQuery && (
                <button
                  onClick={handleClear}
                  type="button"
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                >
                  ✕
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`p-1 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              >
                ▾
              </button>
            </div>

            {/* Floating Filtered Results Box */}
            {isOpen && (
              <div className="absolute left-0 right-0 mt-2 max-h-60 overflow-y-auto rounded-2xl border border-slate-200/80 bg-white p-2 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 scrollbar-thin">
                {filteredEmployees.length === 0 ? (
                  <div className="p-3 text-center text-sm text-slate-400 font-medium">
                    Aucun employé trouvé
                  </div>
                ) : (
                  filteredEmployees.map((emp) => {
                    const isCurrent = String(emp.id) === String(selectedEmpId);
                    return (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => handleSelect(emp)}
                        className={`w-full flex items-center justify-between px-4 py-2.5 my-0.5 rounded-xl text-left text-sm font-medium transition-all ${isCurrent
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-700 hover:bg-slate-50 active:bg-slate-100'
                          }`}
                      >
                        <span>{emp.name}</span>
                        {emp.department && (
                          <span className={`text-xs uppercase tracking-wider px-2 py-0.5 rounded-md ${isCurrent ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-500'
                            }`}>
                            {emp.department}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {currentEmployee && (() => {

          let daysRemaining = 0;
          if (activeLeave) {
            const endDate = new Date(activeLeave.endDate);
            const diffTime = endDate - today;
            // حساب الأيام المتبقية مع إضافة يوم النهاية نفسه
            daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
          }

          return (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
              {/* Header */}
              <div className="flex flex-col gap-6 p-8 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-5">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-2xl font-black text-white shadow-lg">
                    {currentEmployee.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">
                      {currentEmployee.name}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {currentEmployee.position}
                    </p>
                    <p className="font-semibold text-slate-700">
                      {currentEmployee.department}
                    </p>
                  </div>
                </div>

                <span
                  className={`rounded-full px-5 py-2 text-sm font-bold ${currentEmployee.isSpecialRole
                    ? "bg-amber-100 text-amber-700"
                    : "bg-blue-100 text-blue-700"
                    }`}
                >
                  {currentEmployee.isSpecialRole ? "Régime spécial" : "Congés standards"}
                </span>
              </div>

              {/* Statistics */}
              {/* قمنا بتغيير التوزيع إلى 4 أعمدة بدلاً من 3 لاستيعاب بطاقة الحالة الحالية */}
              <div className="grid border-t border-slate-100 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">

                {/* Box 1: Congés annuels */}
                <div className="p-8">
                  <p className="text-sm font-semibold text-slate-400">
                    Congés annuels
                  </p>
                  <h3 className="mt-2 text-5xl font-black text-blue-600">
                    {currentEmployee.totalAnnualBalance}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    jours consommés
                  </p>
                </div>

                {/* Box 2: Congés Reconissance */}
                <div className="p-8">
                  <p className="text-sm font-semibold text-slate-400">
                    Congés Reconnaissance
                  </p>
                  <h3 className="mt-2 text-5xl font-black text-violet-600">
                    {currentEmployee.recognitionBalance}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    jours
                  </p>
                </div>

                {/* Box 3: Régime */}
                <div className="p-8">
                  <p className="text-sm font-semibold text-slate-400">
                    Régime
                  </p>
                  <h3
                    className={`mt-4 text-2xl font-black ${currentEmployee.isSpecialRole ? "text-amber-600" : "text-blue-600"
                      }`}
                  >
                    {currentEmployee.isSpecialRole ? "Spécial" : "Standard"}
                  </h3>
                </div>

                {/* Box 4: الجديد - حالة التواجد الحالية وعمر العطلة المتبقي */}
                <div className={`p-8 transition-all duration-300 ${activeLeave
                  ? "bg-rose-600 text-white shadow-[inset_0_0_20px_rgba(0,0,0,0.02)]"
                  : "bg-slate-50/50 text-slate-800"
                  }`}>
                  <p className={`text-sm font-semibold ${activeLeave ? "text-rose-100" : "text-slate-400"}`}>
                    Statut Actuel
                  </p>

                  {activeLeave ? (
                    <div className="mt-4 animate-[fadeIn_0.3s_ease-out]">
                      <h3 className="text-3xl font-black flex items-center gap-2.5 tracking-tight text-white">
                        <span className="h-3 w-3 rounded-full bg-white animate-ping absolute inline-flex"></span>
                        <span className="h-3 w-3 rounded-full bg-white relative inline-flex"></span>
                        En Congé
                      </h3>

                      <p className="mt-3 text-sm font-medium text-rose-100/90 bg-rose-700/40 border border-white/10 px-3 py-2 rounded-xl inline-block backdrop-blur-xs">
                        Retour dans : <span className="text-base font-extrabold text-white">{daysRemaining} {daysRemaining > 1 ? 'jours' : 'jour'}</span>
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4">
                      <h3 className="text-2xl font-black text-emerald-600 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                        Présent
                      </h3>
                      <p className="mt-2 text-sm text-slate-500">
                        Au poste de travail
                      </p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          );
        })()}

      </div>
      {/* 3. Sections des deux types de congés */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ================= Côté Gauche : Congés Ordinaires ================= */}
        <div className={`bg-white rounded-2xl border p-6 transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${currentEmployee
          ? 'border-blue-500 shadow-md ring-4 ring-blue-500/5'
          : 'border-slate-200/80 shadow-xs opacity-60'
          }`}>
          <form onSubmit={(e) => handleAddLeave(e, 'normal')} className="space-y-5 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <span className="text-xl">📅</span>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">1. Régime des Congés Ordinaires Standards</h3>
                  <p className="text-xxs text-slate-400 mt-0.5">Disponible pour tous (solde annuel de 50 jours ou absences exceptionnelles/familiales)</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 ml-1">Type de congé</label>
                <select
                  disabled={!currentEmployee || isLoading}
                  value={normalLeave.type}
                  onChange={(e) => setNormalLeave({ ...normalLeave, type: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none disabled:cursor-not-allowed"
                >
                  <option value="annual">Congé annuel ordinaire</option>
                  <option value="reconissance">Congé Reconissance</option>
                  <option value="exceptionnel">congé exceptionnel</option>
                </select>
              </div>

              {/* 🆕 حقل إدخال اسم المستخلف للعطلة العادية */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 ml-1">Nom et prénom du remplaçant (المستخلف)</label>
                <input
                  type="text"
                  disabled={!currentEmployee || isLoading}
                  value={normalLeave.substitute}
                  onChange={(e) => setNormalLeave({ ...normalLeave, substitute: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs placeholder-slate-400 focus:bg-white focus:outline-none disabled:cursor-not-allowed font-semibold"
                  placeholder="Ex: Mohamed Benali"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 ml-1">Date de début du congé</label>
                  <input
                    type="date"
                    disabled={!currentEmployee || isLoading}
                    required={!!currentEmployee}
                    value={normalLeave.startDate}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      const newEnd = currentDuration ? getEndDate(newStart, currentDuration) : normalLeave.endDate;
                      setNormalLeave({ ...normalLeave, startDate: newStart, endDate: newEnd });
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-blue-200 text-slate-700 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-blue-600 ml-1">Nombre de jours demandés</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      placeholder="Ex: 26"
                      disabled={!currentEmployee || !normalLeave.startDate || isLoading}
                      value={currentDuration || ''}
                      onChange={(e) => {
                        const days = e.target.value;
                        const computedEnd = getEndDate(normalLeave.startDate, days);
                        setNormalLeave({ ...normalLeave, endDate: computedEnd });
                      }}
                      className="w-full p-2.5 pr-10 bg-blue-50/50 border border-blue-300 text-blue-700 rounded-xl text-xs font-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-blue-400 pointer-events-none">jours</span>
                  </div>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 ml-1">Date de fin du congé</label>
                  <input
                    type="date"
                    disabled={!currentEmployee || isLoading}
                    required={!!currentEmployee}
                    value={normalLeave.endDate}
                    onChange={(e) => {
                      setNormalLeave({ ...normalLeave, endDate: e.target.value });
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-blue-200 text-slate-700 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {normalLeave.startDate && normalLeave.endDate && currentDuration > 0 && (
                <div className="bg-emerald-50 border border-emerald-200/60 rounded-xl p-2.5 flex items-center gap-2 text-emerald-800 animate-in slide-in-from-top-2 duration-200">
                  <span className="text-sm">🗓️</span>
                  <p className="text-xxs font-bold">
                    Calcul administratif précis : Le congé dure <span className="font-black text-xs text-emerald-600 mx-0.5">{currentDuration}</span> jours. Reprise effective du travail le <span className="font-black text-xs text-indigo-600 underline decoration-indigo-200 mx-0.5">{getReturnDate(normalLeave.endDate)}</span>.
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 ml-1">Motif ou notes administratives</label>
                <textarea
                  rows="3"
                  disabled={!currentEmployee || isLoading}
                  value={normalLeave.reason}
                  onChange={(e) => setNormalLeave({ ...normalLeave, reason: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs placeholder-slate-400 focus:bg-white focus:outline-none disabled:cursor-not-allowed"
                  placeholder="Écrivez vos remarques organisationnelles ici..."
                ></textarea>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 mt-6">
              <button
                type="submit"
                disabled={!currentEmployee || isLoading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? 'Validation...' : 'Confirmer et valider le congé ordinaire / exceptionnel'}
              </button>
            </div>
          </form>
        </div>

        {/* ================= Côté Droit : Congés Spéciaux ================= */}
        <div className={`bg-white rounded-2xl border p-6 transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${currentEmployee && currentEmployee.isSpecialRole
          ? 'border-amber-500 shadow-md ring-4 ring-amber-500/5'
          : 'border-slate-200/80 shadow-xs opacity-40 bg-slate-50/50'
          }`}>

          {!currentEmployee?.isSpecialRole && currentEmployee && (
            <div className="absolute inset-0 bg-slate-50/40 backdrop-blur-[1px] flex flex-col items-center justify-center p-4 z-10 text-center">
              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs max-w-xs">
                <span className="text-xl">🔒</span>
                <h4 className="text-xs font-bold text-slate-700 mt-2">Congés spéciaux verrouillés</h4>
                <p className="text-[11px] text-slate-400 mt-1">Cet employé est soumis au régime général. Il ne fait pas partie des services de radiologie ou des pathologies chroniques concernés par ces congés spécifiques.</p>
              </div>
            </div>
          )}

          <form onSubmit={(e) => handleAddLeave(e, 'special')} className="space-y-5 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <span className="text-xl">⚠️</span>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">2. Régime des Congés Spécifiques Spéciaux</h3>
                  <p className="text-xxs text-slate-400 mt-0.5">Réservé exclusivement : Radiologie & Unité Contre la Tuberculose et les Maladies Respiratoires</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 ml-1">Période légale ciblée</label>
                <select
                  disabled={!currentEmployee?.isSpecialRole || isLoading}
                  value={specialLeave.periodType}
                  onChange={(e) => setSpecialLeave({ ...specialLeave, periodType: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none disabled:cursor-not-allowed"
                >
                  <option value="6months">Session de 21 jours (Allouée tous les 6 mois)</option>

                </select>
              </div>

              {/* 🆕 حقل إدخال اسم المستخلف للعطلة الخاصة */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 ml-1">Nom et prénom du remplaçant (المستخلف)</label>
                <input
                  type="text"
                  disabled={!currentEmployee?.isSpecialRole || isLoading}
                  value={specialLeave.substitute}
                  onChange={(e) => setSpecialLeave({ ...specialLeave, substitute: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs placeholder-slate-400 focus:bg-white focus:outline-none disabled:cursor-not-allowed font-semibold"
                  placeholder="Ex: Mohamed Benali"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 ml-1">Date de départ en congé</label>
                <input
                  type="date"
                  disabled={!currentEmployee?.isSpecialRole || isLoading}
                  required={currentEmployee && currentEmployee.isSpecialRole}
                  value={specialLeave.startDate}
                  onChange={(e) => setSpecialLeave({ ...specialLeave, startDate: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs focus:bg-white focus:outline-none disabled:cursor-not-allowed"
                />

                {specialLeave.startDate && (
                  <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-2.5 mt-2 flex flex-col gap-1 text-amber-900 animate-in slide-in-from-top-2 duration-200">
                    <p className="text-xxs font-bold">
                      💡 Calcul automatique du système : <span className="font-black text-xs text-amber-700">21 jours consécutifs</span>
                    </p>
                    <p className="text-[11px] font-medium">
                      • Date exacte de reprise : <span className="font-bold text-slate-900">{getReturnDate(getEndDate(specialLeave.startDate, 21))}</span>
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 ml-1">N° ou référence du rapport de la médecine du travail</label>
                <input
                  type="text"
                  disabled={!currentEmployee?.isSpecialRole || isLoading}
                  required={currentEmployee && currentEmployee.isSpecialRole}
                  value={specialLeave.medicalReport}
                  onChange={(e) => setSpecialLeave({ ...specialLeave, medicalReport: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs placeholder-slate-400 focus:bg-white focus:outline-none disabled:cursor-not-allowed"
                  placeholder="Ex : Service Médecine du Travail - Doc N° 402/2026"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 mt-6">
              <button
                type="submit"
                disabled={!currentEmployee || !currentEmployee.isSpecialRole || isLoading}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? 'Validation...' : 'Confirmer et valider le congé spécial'}
              </button>
            </div>
          </form>
        </div>

      </div>

    </div>
  );
}