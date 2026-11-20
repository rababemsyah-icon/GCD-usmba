import React, { useState } from 'react';
import {
  GraduationCap,
  ShoppingBag,
  ChevronRight,
  User as UserIcon,
  ChevronDown,
  LogIn,
  LogOut,
  Building,
} from 'lucide-react';
import { UserRole, User } from '../types';

export interface PersonaProfile {
  id: string;
  role: UserRole;
  label: string;
  name: string;
  description: string;
  establishment: string;
  badge: string;
  color: string;
}

export const TEST_PERSONAS: PersonaProfile[] = [
  {
    id: 'persona-cand-youssef',
    role: 'candidat',
    label: 'Candidat : Youssef Alaoui (Inscrit / Attestation disponible)',
    name: 'Youssef Alaoui (Candidat)',
    description: 'Dossier complet admis LP, charte signée, attestation délivrée',
    establishment: 'FST Fès (Master IA)',
    badge: 'Candidat',
    color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  {
    id: 'persona-prof-bennani',
    role: 'directeur',
    label: 'Directeur de thèse : Pr. Mustapha Bennani',
    name: 'Pr. Mustapha Bennani (Directeur Thèse)',
    description: 'Revue de mérite en 3 lignes, notation entretien oral /20',
    establishment: 'FST Fès • Labo LISER',
    badge: 'Directeur Thèse',
    color: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  },
  {
    id: 'persona-lab-elamrani',
    role: 'chef_labo',
    label: 'Directeur Laboratoire : Dr. Karim El Amrani',
    name: 'Dr. Karim El Amrani (Directeur Labo)',
    description: 'Validation de rattachement de structure et signature de laboratoire',
    establishment: 'Laboratoire LISER',
    badge: 'Directeur Labo',
    color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
  },
  {
    id: 'persona-admin-scolarite',
    role: 'administration',
    label: 'Administrateur : Mme. Imane Bernoussi',
    name: 'Mme. Imane Bernoussi (Administrateur)',
    description: 'Scolarité centrale, recherche instantanée et contrôle',
    establishment: 'Scolarité Centrale USMBA',
    badge: 'Administrateur',
    color: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  },
];

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  basketCount: number;
  openBasket: () => void;
  currentRole: UserRole;
  setCurrentRole?: (role: UserRole) => void;
  isAuthenticated: boolean;
  currentUser: Partial<User> | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  onOpenThreeArrowsMenu: () => void;
  activePersonaId?: string;
  setActivePersonaId?: (id: string) => void;
  maxChoices?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  basketCount,
  openBasket,
  currentRole,
  isAuthenticated,
  currentUser,
  onOpenLogin,
  onLogout,
  onOpenThreeArrowsMenu,
  maxChoices = 3,
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const tabLabels: Record<string, string> = {
    catalog: 'Sujets de Thèse',
    ocr: 'Vérification des Documents',
    matching: 'Adéquation & Mérite',
    candidate_dashboard: 'Mon Dossier / Candidature',
    supervisor_dashboard: currentRole === 'directeur' ? 'Direction de Thèse' : 'Validation Laboratoire',
    administration_dashboard: 'Scolarité & Contrôle des Pièces',
    notifications: 'Notifications Mail',
    audit_trail: 'Journal d’Audit / Traçabilité',
    charter: 'Charte des Thèses',
  };

  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
      case 'candidat':
        return 'Candidat';
      case 'directeur':
        return 'Directeur de thèse';
      case 'chef_labo':
        return 'Direction de structure';
      case 'administration':
      case 'admin_cedoc':
      case 'super_admin':
        return 'Administration CEDoc';
      default:
        return 'Visiteur';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand + Active View */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex items-center gap-2.5 cursor-pointer group text-left"
              onClick={() => {
                if (!isAuthenticated || currentRole === 'visiteur') {
                  setCurrentTab('catalog');
                } else if (
                  currentRole === 'administration' ||
                  currentRole === 'admin_cedoc' ||
                  currentRole === 'super_admin'
                ) {
                  setCurrentTab('administration_dashboard');
                } else if (currentRole === 'directeur' || currentRole === 'chef_labo') {
                  setCurrentTab('supervisor_dashboard');
                } else if (currentRole === 'candidat') {
                  setCurrentTab('candidate_dashboard');
                } else {
                  setCurrentTab('catalog');
                }
              }}
              title="Accueil GCD-USMBA"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs group-hover:bg-slate-800 transition-all">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-base text-slate-900 tracking-tight flex items-center gap-1.5">
                  GCD<span className="text-slate-700 font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">USMBA</span>
                </span>
                <span className="block text-[10px] text-slate-400 tracking-wider font-mono">CYCLE DOCTORAL</span>
              </div>
            </button>

            {/* Active Tab indicator */}
            <div className="hidden lg:flex items-center pl-3 border-l border-slate-200 text-xs">
              <span className="font-semibold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                {tabLabels[currentTab] || 'Tableau de bord'}
              </span>
            </div>
          </div>

          {/* Center / Right */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Basket Button (STRICT: Visible ONLY when authenticated AND role is Candidat) */}
            {isAuthenticated && currentRole === 'candidat' && (
              <button
                onClick={openBasket}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  basketCount >= maxChoices
                    ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                    : basketCount > 0
                    ? 'bg-slate-800 hover:bg-slate-700 text-white'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                }`}
                title={`Panier de candidature (${maxChoices} choix max)`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-bold">Panier</span>
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold font-mono ${
                    basketCount > 0 ? 'bg-slate-200 text-slate-900' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {basketCount}/{maxChoices}
                </span>
              </button>
            )}

            {/* Authentication Control: Login Button OR User Profile Menu */}
            {!isAuthenticated ? (
              <button
                type="button"
                onClick={onOpenLogin}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Connexion</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    title="Mon profil & session"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                    <span className="truncate max-w-[170px] sm:max-w-[240px] text-slate-900 font-semibold">
                      {currentUser?.fullName || 'Utilisateur'} ({getRoleDisplayName(currentRole)})
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {/* Real User Profile Dropdown with Logout Button */}
                  {isProfileMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-3.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150 space-y-3">
                      <div className="space-y-1 pb-2.5 border-b border-slate-100">
                        <div className="font-bold text-xs text-slate-900 flex items-center justify-between gap-2">
                          <span className="truncate">{currentUser?.fullName}</span>
                          <span className="inline-flex items-center whitespace-nowrap shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            {getRoleDisplayName(currentRole)}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {currentUser?.email}
                        </div>
                        {currentUser?.establishment && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 pt-0.5">
                            <Building className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{currentUser.establishment}</span>
                          </div>
                        )}
                      </div>

                      {/* Déconnexion Button inside dropdown */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors border border-red-200"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Déconnexion</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Direct Déconnexion Button */}
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-red-50 text-slate-600 hover:text-red-700 border border-slate-200 hover:border-red-200 text-xs font-semibold cursor-pointer transition-colors shadow-xs flex items-center gap-1.5"
                  title="Déconnexion"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Déconnexion</span>
                </button>
              </div>
            )}

            {/* Three Arrows Menu Button */}
            <button
              onClick={onOpenThreeArrowsMenu}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95 group"
              title="Menu navigation complet"
            >
              <span className="flex items-center -space-x-1.5 text-slate-900 group-hover:translate-x-0.5 transition-transform">
                <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
                <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
                <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
              </span>
              <span className="hidden sm:inline">Menu</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
