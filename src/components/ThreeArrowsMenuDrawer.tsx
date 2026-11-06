import React, { useEffect } from 'react';
import {
  X,
  BookOpen,
  ShoppingBag,
  FileCheck,
  Sparkles,
  LayoutDashboard,
  UserCheck,
  ShieldCheck,
  ChevronRight,
  GraduationCap,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { UserRole } from '../types';

interface ThreeArrowsMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: string;
  onSelectTab: (tab: string) => void;
  basketCount: number;
  openBasket: () => void;
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
}

export const ThreeArrowsMenuDrawer: React.FC<ThreeArrowsMenuDrawerProps> = ({
  isOpen,
  onClose,
  currentTab,
  onSelectTab,
  basketCount,
  openBasket,
  currentRole,
  onSelectRole,
}) => {
  // Support Escape to close drawer
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modules = [
    {
      id: 'catalog',
      title: 'Sujets de Thèse',
      subtitle: 'Recherche par mots-clés, laboratoire, encadrant',
      icon: BookOpen,
      badge: 'Recherche',
      badgeColor: 'bg-slate-100 text-slate-700',
    },
    {
      id: 'basket_trigger',
      title: 'Panier de Candidature',
      subtitle: 'Sélection ordonnée des 3 sujets',
      icon: ShoppingBag,
      badge: `${basketCount}/3 Sujets`,
      badgeColor: basketCount === 3 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-800',
      action: () => {
        onClose();
        openBasket();
      },
    },
    {
      id: 'ocr',
      title: 'Vérification des Documents',
      subtitle: 'Lecture de la CIN et des diplômes (OCR)',
      icon: FileCheck,
      badge: 'OCR',
      badgeColor: 'bg-slate-100 text-slate-800',
    },
    {
      id: 'matching',
      title: 'Adéquation & Mérite',
      subtitle: 'Évaluation du dossier et convocation',
      icon: Sparkles,
      badge: 'Mérite',
      badgeColor: 'bg-slate-100 text-slate-800',
    },
    {
      id: 'candidate_dashboard',
      title: 'Espace Candidat',
      subtitle: 'Suivi du dossier et carnet de thèse',
      icon: LayoutDashboard,
      badge: 'Dossier',
      badgeColor: 'bg-slate-100 text-slate-800',
    },
    {
      id: 'supervisor_dashboard',
      title: 'Espace Direction & Validation',
      subtitle: 'Contrôle Agent, Encadrant, Labo, CEDoc',
      icon: UserCheck,
      badge: 'Commission',
      badgeColor: 'bg-slate-100 text-slate-800',
    },
    {
      id: 'audit_trail',
      title: 'Journal d’Audit & Traçabilité',
      subtitle: 'Historique des transitions d’états et logs',
      icon: Lock,
      badge: 'Audit',
      badgeColor: 'bg-slate-100 text-slate-800',
    },
    {
      id: 'charter',
      title: 'Charte des Thèses',
      subtitle: 'Consultation et signature du document',
      icon: ShieldCheck,
      badge: 'Contrat',
      badgeColor: 'bg-slate-100 text-slate-800',
    },
  ];

  const roles: { role: UserRole; name: string; title: string; establishment: string }[] = [
    {
      role: 'candidat',
      name: 'Youssef Alaoui Mdaghri',
      title: 'Candidat au Doctorat',
      establishment: 'Master IA & Big Data (FST Fès)',
    },
    {
      role: 'agent_pedagogique',
      name: 'Mme. Imane Bernoussi',
      title: 'Agent Pédagogique (Contrôle Conformité)',
      establishment: 'Pôle Doctoral - Scolarité Centrale',
    },
    {
      role: 'directeur',
      name: 'Pr. Mustapha Bennani',
      title: 'Directeur de Thèse',
      establishment: 'FST Fès • Laboratoire LISER',
    },
    {
      role: 'coencadrant',
      name: 'Dr. Fatima Zahra Alami',
      title: 'Co-Encadrant de Thèse',
      establishment: 'ENSA Fès • Labo LRI',
    },
    {
      role: 'chef_labo',
      name: 'Dr. Karim El Amrani',
      title: 'Directeur de Structure (Chef de Labo)',
      establishment: 'Laboratoire LISER',
    },
    {
      role: 'admin_cedoc',
      name: 'Pr. Rachid El Ghoumari',
      title: 'Directeur du CEDoc (Validation Finale)',
      establishment: 'CEDoc Sciences et Technologies',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
        title="Cliquer pour fermer le menu"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-8">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
          {/* Menu Drawer Header */}
          <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                <span className="flex items-center -space-x-1.5 font-bold">
                  <ChevronRight className="w-4 h-4 stroke-[3]" />
                  <ChevronRight className="w-4 h-4 stroke-[3]" />
                  <ChevronRight className="w-4 h-4 stroke-[3]" />
                </span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">
                  Menu
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors cursor-pointer"
              title="Fermer le menu (Échap)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Section 1: Navigation Modules */}
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                Modules du Système
              </div>

              <div className="space-y-1.5">
                {modules.map((mod) => {
                  const Icon = mod.icon;
                  const isCurrent = currentTab === mod.id;

                  return (
                    <button
                      key={mod.id}
                      onClick={() => {
                        if (mod.action) {
                          mod.action();
                        } else {
                          onSelectTab(mod.id);
                          onClose();
                        }
                      }}
                      className={`w-full p-3 rounded-2xl text-left transition-all flex items-start gap-3 cursor-pointer ${
                        isCurrent
                          ? 'bg-slate-900 text-white shadow-md ring-1 ring-slate-800'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200/80 hover:border-slate-300'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          isCurrent
                            ? 'bg-emerald-500 text-white'
                            : 'bg-white text-slate-700 border border-slate-200'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-xs sm:text-sm truncate">{mod.title}</span>
                          <span
                            className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full shrink-0 ${
                              mod.badgeColor
                            }`}
                          >
                            {mod.badge}
                          </span>
                        </div>
                        <p
                          className={`text-[11px] mt-0.5 leading-snug line-clamp-1 ${
                            isCurrent ? 'text-slate-300' : 'text-slate-500'
                          }`}
                        >
                          {mod.subtitle}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Role Switcher (Demonstrator) */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Changer de Rôle (Démonstrateur)
                </span>
                <span className="text-[10px] font-mono text-emerald-700 font-bold">Actif: {currentRole}</span>
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                {roles.map((r) => {
                  const isSelected = currentRole === r.role;
                  return (
                    <button
                      key={r.role}
                      onClick={() => {
                        onSelectRole(r.role);
                        if (r.role === 'candidat') onSelectTab('catalog');
                        else if (r.role === 'directeur' || r.role === 'chef_labo')
                          onSelectTab('supervisor_dashboard');
                        else if (r.role === 'admin_cedoc') onSelectTab('charter');
                        onClose();
                      }}
                      className={`p-2.5 rounded-xl text-left transition-all border flex items-center justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isSelected ? 'bg-emerald-600' : 'bg-slate-300'
                            }`}
                          />
                          {r.name}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate pl-3.5">
                          {r.title} • {r.establishment}
                        </div>
                      </div>
                      {isSelected && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-600 text-white shrink-0">
                          Sélectionné
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>


          </div>

          {/* Drawer Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>GCD-USMBA v3.8</span>
            <button
              onClick={onClose}
              className="py-1.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer transition-colors"
            >
              Fermer le menu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
