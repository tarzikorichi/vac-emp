'use client';
import React, { useState, useEffect } from 'react';
import { getLeaveRequests } from '../../actions/leave-request';
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import LeaveCertificateDocument from '../../print/LeaveCertificateDocument';
// ملاحظة: يمكنك إنشاء ملف PDF منفصل للوثيقة الثانية إذا كنت تستخدم الحزم المتقدمة، أو الاعتماد على الطباعة المباشرة المحدثة بالأسفل.

export default function LeaveRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [editableRequest, setEditableRequest] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDbLoading, setIsDbLoading] = useState(false);
  
  // حقل تحديد نوع الوثيقة النشطة للمعاينة والطباعة: 'conge' أو 'recuperation'
  const [activeDocType, setActiveDocType] = useState('conge');

  async function fetchRequestsFromDB() {
    setIsDbLoading(true);
    try {
      const result = await getLeaveRequests();
      if (result && result.success) {
        setRequests(result.data || []);
      }
    } catch (err) {
      console.error("Erreur de base de données :", err);
      alert("Une erreur est survenue lors de la connexion à la base de données");
    } finally {
      setIsDbLoading(false);
    }
  }

  useEffect(() => {
    fetchRequestsFromDB();
  }, []);

  // المزامنة الذكية عند اختيار موظف
  const handleSelectRequest = (req) => {
    setSelectedRequest(req);
    setEditableRequest({ 
      ...req,
      // إضافة حقول إضافية افتراضية خاصة بالوثيقة الجديدة إذا لم تكن موجودة لمنع الأخطاء
      compensationMotif: req.compensationMotif || '',
      consommationDetails: req.consommationDetails || ''
    });

    // ذكاء اصطناعي محلي: إذا كانت المدة تشير إلى 6 أشهر أو عطلة خاصة، حوّل النموذج تلقائياً
    if (req.duration >= 180 || req.durationText?.toLowerCase().includes('6 month') || req.typeText?.toLowerCase().includes('spécial')) {
      setActiveDocType('recuperation');
    } else {
      setActiveDocType('conge');
    }
  };

  const handleFieldChange = (field, newValue) => {
    if (!editableRequest) return;
    setEditableRequest(prev => ({
      ...prev,
      [field]: newValue
    }));
  };

  const filteredRequests = requests?.filter(req => {
    const employeeName = req?.name || '';
    const employeeDept = req?.department || '';
    return employeeName.toLowerCase().includes(searchTerm.toLowerCase()) || 
           employeeDept.toLowerCase().includes(searchTerm.toLowerCase());
  }) || [];

  return (
    <div className="min-h-screen bg-slate-50/80 p-4 md:p-8 font-sans text-left print:bg-white print:p-0 selection:bg-teal-100 selection:text-teal-900" dir="ltr">
      
      {/* ==================== En-tête de la page ==================== */}
      <div className="mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white/90 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] print:hidden">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.4)]"></div>
            <h1 className="text-xl font-black bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900 bg-clip-text text-transparent">Panneau de contrôle et d'aperçu des titres administratifs</h1>
          </div>
          <p className="text-xs font-bold text-slate-500">Consultez les registres en direct, modifiez le document directement sur la feuille à l'écran, et imprimez instantanément.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          <div className="relative w-full sm:w-72">
            <input 
              type="text" 
              placeholder="Rechercher par nom d'employé..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all duration-300"
            />
          </div>
          
        </div>
      </div>

      {/* ==================== Architecture de l'écran ==================== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* 🗂️ Côté gauche : Panneau des registres */}
        <div className="xl:col-span-4 bg-white rounded-3xl border border-slate-200/70 shadow-[0_15px_40px_-15px_rgba(0,0,0,0.05)] p-5 space-y-4 print:hidden">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-xs font-black text-slate-700 tracking-wider flex items-center gap-2">
              <span>📂</span> Registres extraits de SQLite
            </h3>
            <span className="text-[10px] bg-teal-50 text-teal-700 border border-teal-100 px-2.5 py-1 rounded-xl font-black">
              {filteredRequests.length} employé(s)
            </span>
          </div>

          <div className="space-y-2.5 max-h-[68vh] overflow-y-auto pl-1">
            {isDbLoading ? (
              <div className="text-center py-12 text-xs font-bold text-teal-600 animate-pulse">Récupération des données...</div>
            ) : filteredRequests.map((req) => (
              <div 
                key={req.id}
                onClick={() => handleSelectRequest(req)}
                className={`group p-4 rounded-2xl border transition-all duration-300 cursor-pointer flex justify-between items-center relative overflow-hidden ${
                  selectedRequest?.id === req.id 
                    ? 'border-teal-200 bg-gradient-to-r from-teal-50/60 via-white to-white shadow-[0_8px_20px_-8px_rgba(20,184,166,0.2)]' 
                    : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200'
                }`}
              >
                {selectedRequest?.id === req.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-teal-400 to-emerald-500 rounded-l-md"></div>
                )}
                <div className="space-y-1">
                  <h4 className={`text-xs font-black ${selectedRequest?.id === req.id ? 'text-teal-700' : 'text-slate-800'}`}>{req.name}</h4>
                  <p className="text-[11px] text-slate-500 font-bold">{req.position}</p>
                  <p className="text-[10px] text-slate-400 font-semibold pt-1">Service : <span className="text-slate-600">{req.department}</span></p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-[9px] bg-white text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md font-bold">N° {req.docNum}</span>
                  <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded font-black">{req.duration} jours</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 📄 Côté droit : Zone de prévisualisation et traitement */}
        <div className="xl:col-span-8 w-full flex flex-col items-center justify-center space-y-6">
          
          {editableRequest ? (
            <>
              {/* 🔄 أداة التبديل العلوية بين نوعي الوثائق المتاحة للموظف المختار */}
              <div className="w-full max-w-[21cm] bg-slate-100 p-1.5 rounded-2xl flex gap-2 border border-slate-200 shadow-inner print:hidden">
                <button
                  onClick={() => setActiveDocType('conge')}
                  className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all ${activeDocType === 'conge' ? 'bg-white text-teal-700 shadow-xs border border-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  📄 Titre de Congé (الأساسي)
                </button>
                <button
                  onClick={() => setActiveDocType('recuperation')}
                  className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${activeDocType === 'recuperation' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  ✨ Droit à la Récupération (الخاص بـ 6 أشهر / التعويضي)
                </button>
              </div>

              {/* Barre d'actions & Téléchargement PDF */}
              <div className="w-full max-w-[21cm] bg-white border border-slate-200/80 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs print:hidden">
                <div className="text-left">
                  <h4 className="text-xs font-black text-slate-800">Génération du Document Officiel</h4>
                  <p className="text-[10px] text-slate-400 font-medium">Document actuellement configuré sur le format : <span className="font-bold text-teal-600">{activeDocType === 'conge' ? 'Titre de Congé' : 'Droit à la Récupération'}</span></p>
                </div>
                
                <PDFDownloadLink
                  document={<LeaveCertificateDocument data={editableRequest} />}
                  fileName={`Document_${editableRequest?.name?.replace(/\s+/g, '_') || 'export'}.pdf`}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-all duration-150 cursor-pointer text-center"
                >
                  {({ loading }) => (loading ? 'Génération du PDF...' : 'Télécharger le PDF Officiel 📄')}
                </PDFDownloadLink>
              </div>

              {/* Bannière d'instruction */}
              <div className="w-full max-w-[21cm] bg-amber-50 border border-amber-200 p-3 rounded-2xl text-center text-[11px] font-bold text-amber-700 flex items-center justify-center gap-2 shadow-sm print:hidden">
                <span>⚡</span> Système d'édition en direct actif : Cliquez sur n'importe quel texte souligné en pointillés pour modifier son contenu instantanément avant le téléchargement ou l'impression !
              </div>

              {/* ==================== الورقة الأولى: TITRE DE CONGÉ ==================== */}
              {activeDocType === 'conge' && (
                <div className="w-full max-w-[21cm] bg-white rounded-xl p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-200 transition-all duration-300 print:shadow-none print:border-none print:p-0 print:rounded-none">
                  <div className="w-full bg-white text-left font-serif text-slate-900 select-text">
                    <div className="border-[5px] double border-slate-900 p-8 flex flex-col justify-between min-h-[26.5cm]">
                      
                      <div className="text-center space-y-1">
                        <h2 className="text-xs font-bold tracking-wide">République Algérienne Démocratique et Populaire</h2>
                        <h2 className="text-xs font-bold underline decoration-double underline-offset-4">Ministère de la Santé</h2>
                        <div className="pt-3 text-left text-[11px] space-y-1 font-bold pl-2">
                          <p>Direction de la Santé et de la Population de la Wilaya de Ghardaïa</p>
                          <p>Établissement Public de Santé de Proximité de Berriane</p>
                          <p>Sous-Direction de la Gestion des Ressources Humaines</p>
                          <p className="pt-1 text-slate-800">
                            N° : <span contentEditable suppressContentEditableWarning onBlur={(e) => handleFieldChange('docNum', e.target.innerText)} className="font-black border-b border-dashed border-teal-600 hover:bg-slate-50 px-2 cursor-text focus:outline-none print:border-none">{editableRequest.docNum}</span> / 
                            <span contentEditable suppressContentEditableWarning onBlur={(e) => handleFieldChange('year', e.target.innerText)} className="font-black border-b border-dashed border-teal-600 hover:bg-slate-50 px-1 cursor-text focus:outline-none print:border-none">{editableRequest.year}</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-center my-6">
                        <h1 className="text-2xl font-black tracking-widest border-b-4 border-double border-slate-900 inline-block px-14 pb-1.5">TITRE DE CONGÉ</h1>
                      </div>

                      <div className="space-y-4.5 text-[12.5px] font-bold px-4 flex-1 pt-3 text-slate-900">
                        <p>🔳 Nom et Prénom : <span contentEditable suppressContentEditableWarning onBlur={(e) => handleFieldChange('name', e.target.innerText)} className="ml-3 font-black text-[13.5px] border-b border-dashed border-slate-400 hover:bg-slate-50 px-3 py-0.5 print:border-none">{editableRequest.name}</span></p>
                        <p>🔳 Grade / Fonction : <span contentEditable suppressContentEditableWarning onBlur={(e) => handleFieldChange('position', e.target.innerText)} className="ml-3 border-b border-dashed border-slate-400 hover:bg-slate-50 px-3 py-0.5 print:border-none">{editableRequest.position}</span></p>
                        <p>🔳 Service : <span contentEditable suppressContentEditableWarning onBlur={(e) => handleFieldChange('department', e.target.innerText)} className="ml-3 border-b border-dashed border-slate-400 hover:bg-slate-50 px-3 py-0.5 print:border-none">{editableRequest.department}</span></p>
                        <p>🔳 Nom et Prénom du remplaçant : <span contentEditable suppressContentEditableWarning onBlur={(e) => handleFieldChange('substitute', e.target.innerText)} className="ml-3 border-b border-dashed border-slate-400 hover:bg-slate-50 px-3 py-0.5 print:border-none">{editableRequest.substitute}</span></p>
                        <p>🔳 Type de congé : <span contentEditable suppressContentEditableWarning onBlur={(e) => handleFieldChange('typeText', e.target.innerText)} className="ml-3 border-b border-dashed border-slate-400 hover:bg-slate-50 px-3 py-0.5 print:border-none">{editableRequest.typeText}</span></p>
                        <p>🔳 Durée : <span contentEditable suppressContentEditableWarning onBlur={(e) => handleFieldChange('durationText', e.target.innerText)} className="ml-3 border-b border-dashed border-slate-400 hover:bg-slate-50 px-3 py-0.5 print:border-none">{editableRequest.durationText} ({editableRequest.duration}) jour(s)</span></p>
                        <p>🔳 Date de départ : <span contentEditable suppressContentEditableWarning onBlur={(e) => handleFieldChange('startDate', e.target.innerText)} className="ml-3 font-black border-b border-dashed border-slate-400 hover:bg-slate-50 px-3 py-0.5 print:border-none">{editableRequest.startDate}</span></p>
                        <p>🔳 Date de retour : <span contentEditable suppressContentEditableWarning onBlur={(e) => handleFieldChange('endDate', e.target.innerText)} className="ml-3 font-black border-b border-dashed border-slate-400 hover:bg-slate-50 px-3 py-0.5 print:border-none">{editableRequest.endDate}</span></p>
                      </div>

                      <div className="border-t-2 border-slate-950 pt-4 mt-5 grid grid-cols-12 gap-6 text-[11px] font-bold">
                        <div className="col-span-5 border-r border-slate-300 pr-3 space-y-2">
                          <p className="text-xs">Jours restants :</p>
                          <p className="whitespace-pre-line text-sm font-black tracking-widest" contentEditable suppressContentEditableWarning onBlur={(e) => handleFieldChange('remaining', e.target.innerText)}>{editableRequest.remaining}</p>
                        </div>
                        <div className="col-span-7 space-y-1.5">
                          <p className="text-xs underline tracking-wide">DÉCISION :</p>
                          <div className="space-y-1.5 pl-2">
                            <p>• Nombre de jours accordés : <span contentEditable suppressContentEditableWarning onBlur={(e) => handleFieldChange('duration', e.target.innerText)} className="font-black px-1 border-b border-dashed border-slate-400 print:border-none">{editableRequest.duration} jour(s)</span></p>
                            <p>• Du : <span contentEditable suppressContentEditableWarning onBlur={(e) => handleFieldChange('startDate', e.target.innerText)} className="font-black px-1 border-b border-dashed border-slate-400 print:border-none">{editableRequest.startDate}</span></p>
                            <p>• Au : <span contentEditable suppressContentEditableWarning onBlur={(e) => handleFieldChange('endDate', e.target.innerText)} className="font-black px-1 border-b border-dashed border-slate-400 print:border-none">{editableRequest.endDate}</span></p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-8 pt-2 flex justify-between items-end text-[11px] font-bold">
                        <p>Fait à Berriane, le : ............................</p>
                        <div className="text-center pr-10 space-y-1">
                          <p className="text-xs underline underline-offset-4 tracking-wide">Le Directeur</p>
                          <p className="text-[9px] text-slate-500 font-medium print:hidden">(Espace réservé au cachet)</p>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              )}

              {/* ==================== الورقة الثانية الجديدة: RECONNAISSANCE DU DROIT A LA RECUPERATION ==================== */}
              {activeDocType === 'recuperation' && (
                <div className="w-full max-w-[21cm] bg-white rounded-xl p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-200 transition-all duration-300 print:shadow-none print:border-none print:p-0 print:rounded-none">
                  <div className="w-full bg-white text-left font-sans text-slate-900 select-text">
                    <div className="p-4 flex flex-col justify-between min-h-[26.5cm]">
                      
                      {/* En-tête المحدث حسب الصورة الإدارية لولاية غرداية */}
                      <div className="text-center space-y-0.5">
                        <h2 className="text-xs font-bold tracking-wide">République Algérienne Démocratique et Populaire</h2>
                        <h2 className="text-xs font-bold">Ministère de la santé</h2>
                        <div className="pt-2 text-left text-[11px] space-y-0.5 font-bold pl-2">
                          <p>Direction de la Santé, de la Population de la Wilaya de Ghardaïa</p>
                          <p className="pt-0.5 text-slate-800">
                            N° : ........................ / <span contentEditable suppressContentEditableWarning onBlur={(e) => handleFieldChange('year', e.target.innerText)} className="font-black border-b border-dashed border-teal-600 px-1 focus:bg-amber-50 print:border-none">{editableRequest.year || '2026'}</span>
                          </p>
                        </div>
                      </div>

                      {/* عنوان الوثيقة المحاط بإطار ثنائي مميز جداً طبق الأصل */}
                      <div className="text-center my-6">
                        <div className="border-[4px] double border-slate-900 rounded-xl py-3 px-10 inline-block font-black text-[17px] tracking-wider text-slate-950 shadow-xs">
                          RECONISSANCE DU DROIT A LA RECUPERATION
                        </div>
                      </div>

                      {/* محتوى الاستمارة والبيانات التفصيلية للموظف وطبيعة التعويض */}
                      <div className="space-y-4 text-[13px] font-bold px-6 flex-1 pt-2 text-slate-900 leading-relaxed">
                        <p className="text-slate-950 font-black text-[13.5px]">Je soussigné reconnait que :</p>
                        
                        <div className="pl-6 space-y-2 text-slate-800">
                          <p>❖ Nom et prénom : <span contentEditable suppressContentEditableWarning onBlur={(e) => handleFieldChange('name', e.target.innerText)} className="ml-2 font-black text-[14px] text-slate-950 border-b border-dashed border-slate-400 hover:bg-slate-50 px-2 focus:bg-amber-50 focus:outline-none print:border-none">{editableRequest.name}</span></p>
                          <p>❖ Grade : <span contentEditable suppressContentEditableWarning onBlur={(e) => handleFieldChange('position', e.target.innerText)} className="ml-2 border-b border-dashed border-slate-400 hover:bg-slate-50 px-2 focus:bg-amber-50 focus:outline-none print:border-none">{editableRequest.position}</span></p>
                          <p>❖ Fonction : <span contentEditable suppressContentEditableWarning onBlur={(e) => handleFieldChange('position', e.target.innerText)} className="ml-2 border-b border-dashed border-slate-400 hover:bg-slate-50 px-2 focus:bg-amber-50 focus:outline-none print:border-none">{editableRequest.position}</span></p>
                          <p>❖ Service : <span contentEditable suppressContentEditableWarning onBlur={(e) => handleFieldChange('department', e.target.innerText)} className="ml-2 border-b border-dashed border-slate-400 hover:bg-slate-50 px-2 focus:bg-amber-50 focus:outline-none print:border-none">{editableRequest.department}</span></p>
                        </div>

                        <p className="pt-4 text-slate-950 font-black">
                          A le droit à une récupération de (nombre des jours) : (
                          <span contentEditable suppressContentEditableWarning onBlur={(e) => handleFieldChange('duration', e.target.innerText)} className="font-black text-blue-700 border-b-2 border-dashed border-blue-500 hover:bg-slate-50 px-3 focus:bg-amber-50 focus:outline-none print:border-none">{editableRequest.duration}</span>
                          ) Jour(s)
                        </p>
                        
                        {/* حقل مبرر التعويض القابل للكتابة السطرية المباشرة */}
                        <div className="pt-2 space-y-1.5">
                          <p className="text-slate-950">En compensation de (préciser le motif et la date) :</p>
                          <div 
                            contentEditable 
                            suppressContentEditableWarning 
                            onBlur={(e) => handleFieldChange('compensationMotif', e.target.innerText)} 
                            className="w-full min-h-[70px] border-b border-dashed border-slate-400 font-normal text-slate-700 leading-relaxed focus:outline-none focus:bg-amber-50 px-2 py-1 transition-colors print:border-none"
                            placeholder="Cliquez pour spécifier le motif et la date..."
                          >
                            {editableRequest.compensationMotif || ".........................................................................................................................................................................................................................................................................................................................................."}
                          </div>
                        </div>
                      </div>

                      {/* التوقيعات والمسؤولين أسفل الورقة */}
                      <div className="mt-6 pt-4 flex justify-between items-start text-[11.5px] font-bold px-4">
                        <div className="text-left space-y-1">
                          <p>Le responsable hiérarchique</p>
                        </div>
                        <div className="text-right space-y-1.5">
                          <p>Berriane le : ............................</p>
                          <p className="pr-12">Le directeur :</p>
                        </div>
                      </div>

                      {/* خط الفصل الأسود الممتد تماماً مثل الاستمارة الأصلية */}
                      <div className="border-t border-slate-950 my-6"></div>

                      {/* جزء الاستهلاك والمتبقي سفلي */}
                      <div className="text-[11.5px] font-bold space-y-2 px-2">
                        <p className="text-slate-900">En cas consommation préciser le nombre de jour, le titre et le reliquat :</p>
                        <div 
                          contentEditable 
                          suppressContentEditableWarning 
                          onBlur={(e) => handleFieldChange('consommationDetails', e.target.innerText)} 
                          className="w-full min-h-[50px] border-b border-dashed border-slate-400 font-normal text-slate-700 focus:outline-none focus:bg-amber-50 px-2 transition-colors print:border-none"
                        >
                          {editableRequest.consommationDetails || ".........................................................................................................................................................................................................................................................................................................................................."}
                        </div>
                      </div>

                      {/* الملاحظات الإدارية الصارمة أسفل الجدول */}
                      <div className="mt-6 text-[10.5px] font-bold space-y-1.5 text-slate-900 bg-slate-50/50 p-3 rounded-xl border border-slate-100 print:bg-white print:border-none">
                        <p className="underline tracking-wide">Remarque :</p>
                        <ul className="list-none pl-1 space-y-1 font-semibold text-slate-800">
                          <li>- Le droit à la récupération n’est autorisé que pour une nécessité de service absolu et après l’accord de l’administration.</li>
                          <li>- Ce document doit être garde dans le dossier de l’intéresse.</li>
                        </ul>
                      </div>

                    </div>
                  </div>
                </div>
              )}

              {/* Visionneuse Web interactive (masquée à l'impression) */}
              <div className="w-full max-w-[21cm] h-[500px] bg-slate-900 rounded-2xl overflow-hidden shadow-md print:hidden">
                 <PDFViewer width="100%" height="100%" className="border-none">
                    <LeaveCertificateDocument data={editableRequest} />
                 </PDFViewer>
              </div>
            </>
          ) : (
            <div className="border border-dashed border-slate-300 bg-white rounded-3xl p-16 text-center text-xs font-bold text-slate-500 w-full shadow-xs">
              🔒 Veuillez sélectionner un registre d'employé dans la liste de gauche pour charger le document interactif.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}