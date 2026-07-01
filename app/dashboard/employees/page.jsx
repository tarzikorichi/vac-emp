'use client';

import React, { useState, useEffect } from 'react';
import { createEmployee, getAllEmployees, updateEmployee, deleteEmployee, getUniqueDepartments } from './../../actions/employee';
import { showAlert } from '../../utils/alert';
import { useMemo } from 'react';

export default function EmployeesRegister() {

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalEditing, setIsModalEditing] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);

  // États pour la recherche et le filtrage
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedRoleType, setSelectedRoleType] = useState('');

  const filteredEmployees = useMemo(
    () => {
      return employees.filter((emp) => {
        const matchesName = emp.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = selectedDept === '' || emp.department === selectedDept;

        let matchesRole = true;
        if (selectedRoleType === 'normal') {
          matchesRole = !emp.isSpecialRole; 
        } else if (selectedRoleType === 'special') {
          matchesRole = emp.isSpecialRole; 
        }

        return matchesName && matchesDept && matchesRole;
    });
    }, [employees, searchTerm, selectedDept, selectedRoleType]) 

  async function loadEmployees() {
      const result = await getAllEmployees();
      if (result.success) {
        setEmployees(result.data); // Stockage des employés de SQLite dans l'état
      } else {
        console.log(`Une erreur est survenue lors de la récupération des employés : ${result.error}`);
        showAlert.toastError(`Une erreur est survenue lors de la récupération des employés : ${result.error}`);
      }

      const res = await getUniqueDepartments()
      setDepartments(res)
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  // État du formulaire pour ajouter/modifier un employé
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    department: '',
    position: '',
    isSpecialRole: false
  });

  // Gestion de la soumission du formulaire
  const handleAddEmployee = (e) => {
    e.preventDefault();
    if (!newEmployee.name || !newEmployee.department) return;

    if (isModalEditing) {
      updateEmployee(newEmployee.id, newEmployee).then((result) => {
        if (result.success) {
          showAlert.toastSuccess(`L'employé ${newEmployee.name} a été modifié avec succès`);
          loadEmployees();
        } else {
          showAlert.toastError(`Une erreur est survenue lors de la modification : ${result.error}`);
        }
      });
    } else {
      createEmployee(newEmployee).then((result) => {
        if (result.success) {
          showAlert.toastSuccess(`L'employé ${newEmployee.name} a été ajouté avec succès`);
          loadEmployees();
        } else {
          showAlert.toastError(`Une erreur est survenue lors de l'ajout : ${result.error}`);
        }
      });
    }
    
    setIsModalOpen(false);
    setIsModalEditing(false);
    setNewEmployee({ name: '', department: '', position: '', isSpecialRole: false });
  };

  const handleEditEmployee = (employee) => {
      setNewEmployee(employee);
      setIsModalOpen(true);
      setIsModalEditing(true);
  }

  const handleDeleteEmployee = (employeeId) => {
      showAlert.confirm("Confirmation de suppression", "Êtes-vous sûr de vouloir supprimer cet employé ?").then((confirmed) => {
          if (confirmed) {
              deleteEmployee(employeeId).then((result) => {
                  if (result.success) {
                      showAlert.toastSuccess("Employé supprimé avec succès");
                      loadEmployees();
                  } else {
                      showAlert.toastError(`Une erreur est survenue lors de la suppression : ${result.error}`);
                  }
              });
          }
      });
  }

  return (
    <>
      {/* En-tête de la page */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm transition-all">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5.5 h-5.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-2.533-3.076c-2.23-.8-4.431-1.422-6.621-1.94m-6 3c0-1.03.414-1.964 1.081-2.649M16.5 10.5a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zM1.5 15.036a11.56 11.56 0 016.709-1.355A11.48 11.48 0 0111 15.036m0 0a11.43 11.43 0 01-2.107 3.307M11 15.036a11.48 11.48 0 00-2.107-3.307M7.5 7.5a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Registre Général du Personnel</h1>
            <p className="text-xs font-medium text-slate-400 mt-1">Ajouter, modifier et suivre le statut professionnel, les départements et les services</p>
          </div>
        </div>
        
        <button 
          onClick={() => { setIsModalOpen(true); setIsModalEditing(false); }}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/15 hover:shadow-blue-500/25 hover:-translate-y-0.5 active:scale-98 transition-all flex items-center gap-2 cursor-pointer w-full md:w-auto justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Ajouter un nouvel employé
        </button>
      </div>

      {/* Barre de Recherche et Filtres */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Recherche par nom */}
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </span>
          <input 
            type="text" 
            placeholder="Rechercher par nom..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 text-slate-800 rounded-xl text-sm placeholder-slate-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition-all shadow-2xs"
          />
        </div>

        {/* Filtrage par Service */}
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h18v18H3V3z" />
            </svg>
          </span>
          <select 
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-slate-50/50 border border-slate-200 text-slate-700 rounded-xl text-sm focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition-all shadow-2xs appearance-none cursor-pointer font-medium"
          >
            <option value="">Tous les services et départements</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px] opacity-70">▼</span>
        </div>

        {/* Filtrage par Régime de travail */}
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          <select 
            value={selectedRoleType}
            onChange={(e) => setSelectedRoleType(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-slate-50/50 border border-slate-200 text-slate-700 rounded-xl text-sm focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition-all shadow-2xs appearance-none cursor-pointer font-medium"
          >
            <option value="">Tous les régimes de congé</option>
            <option value="normal">Régime Standard</option>
            <option value="special">Régime Spécifique (Radio / Asthme)</option>
          </select>
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px] opacity-70">▼</span>
        </div>

      </div>
        
      {/* Tableau des employés */}
      <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-y-2">
            <thead>
              <tr className="text-slate-400 font-bold text-xs uppercase tracking-wider select-none">
                <th className="pl-6 pr-4 pb-2 font-extrabold w-24">N° Registre</th>
                <th className="p-2 pb-2 font-extrabold">Employé</th>
                <th className="p-2 pb-2 font-extrabold">Service / Département</th>
                <th className="p-2 pb-2 font-extrabold">Grade & Fonction</th>
                <th className="p-2 pb-2 font-extrabold">Régime de Congé</th>
                <th className="p-2 pb-2 font-extrabold text-center w-32">Actions</th>
              </tr>
            </thead>
            
            <tbody className="text-slate-600 text-sm">
              {filteredEmployees.map((emp) => (
                <tr 
                  key={emp.id} 
                  className="bg-white group transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/5 cursor-pointer border border-transparent"
                >
                  {/* N° Registre */}
                  <td className="p-4 pl-6 font-mono text-xs first:rounded-l-xl border-y border-l border-slate-100 group-hover:border-blue-100 transition-colors">
                    <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded-md font-semibold border border-slate-200/30">
                      #{String(emp.id).padStart(4, '0')}
                    </span>
                  </td>
                  
                  {/* Nom de l'employé */}
                  <td className="p-4 border-y border-slate-100 group-hover:border-blue-100 group-hover:bg-blue-50/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors duration-200">
                          {emp.name}
                        </span>
                      </div>
                    </div>
                  </td>
                  
                  {/* Département */}
                  <td className="p-4 border-y border-slate-100 group-hover:border-blue-100 group-hover:bg-blue-50/10 transition-colors">
                    <div className="flex items-center gap-1.5 font-medium text-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400/70 group-hover:bg-blue-500 group-hover:animate-pulse transition-colors"></span>
                      {emp.department}
                    </div>
                  </td>
                  
                  {/* Grade / Poste */}
                  <td className="p-4 text-slate-500 font-normal border-y border-slate-100 group-hover:border-blue-100 group-hover:bg-blue-50/10 transition-colors">
                    {emp.position}
                  </td>
                  
                  {/* Régime des congés */}
                  <td className="p-4 border-y border-slate-100 group-hover:border-blue-100 group-hover:bg-blue-50/10 transition-colors">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border shadow-2xs transition-all duration-300 ${
                      emp.isSpecialRole 
                        ? 'bg-amber-50 text-amber-800 border-amber-200/70 group-hover:bg-amber-100' 
                        : 'bg-blue-50 text-blue-800 border-blue-200/70 group-hover:bg-blue-100'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${emp.isSpecialRole ? 'bg-amber-500 animate-pulse' : 'bg-blue-500'}`}></span>
                      {emp.isSpecialRole ? 'Spécifique (21 j / 6 mois)' : 'Standard (50 j / an)'}
                    </span>
                  </td>
                  
                  {/* Actions de gestion */}
                  <td className="p-4 text-center last:rounded-r-xl border-y border-r border-slate-100 group-hover:border-blue-100 group-hover:bg-blue-50/10 transition-colors">
                    <div className="flex items-center justify-center gap-1">
                      <button 
                        onClick={() => handleEditEmployee(emp)} 
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-100/70 rounded-xl transition-all duration-200 cursor-pointer"
                        title="Modifier"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4.5 h-4.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </button>
                      
                      <button 
                        onClick={() => handleDeleteEmployee(emp.id)} 
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-100/70 rounded-xl transition-all duration-200 cursor-pointer"
                        title="Supprimer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4.5 h-4.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL : Ajouter / Modifier un employé */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-50 transition-all duration-300">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
            
            {/* Header du Modal */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-xl text-blue-600 shadow-sm">
                  👤
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 tracking-tight">
                    {isModalEditing ? "Modifier la fiche de l'employé" : "Créer une nouvelle fiche employé"}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Veuillez saisir les informations professionnelles avec précision</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            {/* Corps du Formulaire */}
            <form onSubmit={handleAddEmployee} className="p-6 space-y-5 flex-1">
              
              {/* Nom & Prénom */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 ml-1">Nom et prénom complet</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">📝</span>
                  <input 
                    type="text" 
                    required
                    value={newEmployee.name}
                    onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition-all shadow-sm"
                    placeholder="Ex: Tarzi Ben Mohamed..."
                  />
                </div>
              </div>

              {/* Service */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 ml-1">Service ou Département Administratif</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">🏢</span>
                  <input 
                    type="text" 
                    required
                    value={newEmployee.department}
                    onChange={(e) => setNewEmployee({...newEmployee, department: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition-all shadow-sm"
                    placeholder="Ex: Service de Radiologie et Analyses"
                  />
                </div>
              </div>

              {/* Grade / Fonction */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 ml-1">Grade / Fonction actuelle</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">💼</span>
                  <input 
                    type="text" 
                    required
                    value={newEmployee.position}
                    onChange={(e) => setNewEmployee({...newEmployee, position: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition-all shadow-sm"
                    placeholder="Ex: Technicien Supérieur en Informatique"
                  />
                </div>
              </div>

              {/* Toggle Régime Spécifique */}
              <label className={`block p-4 rounded-xl border transition-all cursor-pointer select-none group mt-6 ${
                newEmployee.isSpecialRole 
                  ? 'bg-amber-50/50 border-amber-200 shadow-sm shadow-amber-50' 
                  : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg shadow-sm border transition-colors ${
                      newEmployee.isSpecialRole ? 'bg-amber-100 border-amber-200' : 'bg-white border-slate-200 group-hover:bg-slate-100'
                    }`}>
                      ⚠️
                    </div>
                    <div>
                      <span className={`block text-sm font-bold ${newEmployee.isSpecialRole ? 'text-amber-900' : 'text-slate-700'}`}>
                        Soumis au régime médical spécifique ?
                      </span>
                      <p className={`text-xs mt-0.5 ${newEmployee.isSpecialRole ? 'text-amber-700/80' : 'text-slate-400'}`}>
                        Réservé aux manipulateurs radio, imagerie ou agents atteints de pathologies chroniques (ex: Asthme).
                      </p>
                    </div>
                  </div>
                  
                  {/* Toggle Switch adapté LTR */}
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      checked={newEmployee.isSpecialRole}
                      onChange={(e) => setNewEmployee({...newEmployee, isSpecialRole: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-amber-500 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-[20px]"></div>
                  </div>
                </div>
              </label>

              {/* Actions du Modal */}
              <div className="flex gap-3 justify-end pt-5 border-t border-slate-100 mt-6 bg-slate-50/20 px-6 py-4 -mx-6 -mb-6">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 hover:text-slate-800 transition-all text-sm font-medium active:scale-98 cursor-pointer"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/15 hover:shadow-blue-500/25 transition-all text-sm font-bold active:scale-98 cursor-pointer"
                >
                  Confirmer et enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}