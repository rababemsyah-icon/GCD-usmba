import React from 'react';
import {
  GraduationCap,
  ShoppingBag,
  ChevronRight,
  User,
} from 'lucide-react';
import { UserRole } from '../types';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  basketCount: number;
  openBasket: () => void;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  onOpenThreeArrowsMenu: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  basketCount,
  openBasket,
  currentRole,
  onOpenThreeArrowsMenu,
}) => {
  const roleBadges: Record<UserRole, { shortName: string; badge: string; color: string }> = {
    candidat: {
      shortName: 'Youssef Alaoui',
      badge: 'Candidat',
      color: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    },
    agent_pedagogique: {
      shortName: 'Mme. Bernoussi',
      badge: 'Agent Pédagogique',
      color: 'bg-amber-50 text-amber-800 border-amber-300',
    },
    directeur: {
      shortName: 'Pr. Bennani',
      badge: 'Directeur Thèse',
      color: 'bg-blue-50 text-blue-800 border-blue-300',
    },
    coencadrant: {
      shortName: 'Dr. Alami',
      badge: 'Co-Encadrant',
      color: 'bg-sky-50 text-sky-800 border-sky-300',
    },
    chef_labo: {
      shortName: 'Dr. El Amrani',
      badge: 'Directeur Labo',
      color: 'bg-indigo-50 text-indigo-800 border-indigo-300',
    },
    admin_cedoc: {
      shortName: 'Pr. El Ghoumari',
      badge: 'Directeur CEDoc',
      color: 'bg-purple-50 text-purple-800 border-purple-300',
    },
  };

  const tabLabels: Record<string, string> = {
    catalog: 'Sujets de Thèse',
    ocr: 'Vérification des Documents',
    matching: 'Adéquation & Mérite',
    candidate_dashboard: 'Espace Candidat',
    supervisor_dashboard: 'Direction & Validation',
    audit_trail: 'Journal d’Audit & Traçabilité',
    charter: 'Charte des Thèses',
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      {/* Main Bar: Distraction-free, minimal cognitive load */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Left: Brand + Active View Pill */}
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-2.5 cursor-pointer group"
              onClick={() => setCurrentTab('catalog')}
              title="Accueil"
            >
              <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <span className="font-extrabold text-base text-slate-900 tracking-tight">
                  USMBA
                </span>
              </div>
            </div>

            {/* Subtle Active Module Indicator */}
            <div className="hidden sm:flex items-center pl-3 border-l border-slate-200 text-xs">
              <span className="font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                {tabLabels[currentTab] || 'Sujets'}
              </span>
            </div>
          </div>

          {/* Right Action: Basket Button + The "Three Arrows" Menu Button */}
          <div className="flex items-center gap-2.5">
            {/* Basket Button (Essential action for candidacy) */}
            <button
              onClick={openBasket}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                basketCount === 3
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-400/30'
                  : basketCount > 0
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
              title="Ouvrir le panier (3 choix requis)"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-bold">Panier</span>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold font-mono ${
                  basketCount === 3
                    ? 'bg-white text-emerald-800'
                    : basketCount > 0
                    ? 'bg-white text-amber-900'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {basketCount}/3
              </span>
            </button>

            {/* Active Role Indicator Pill */}
            <div
              onClick={onOpenThreeArrowsMenu}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs cursor-pointer transition-colors"
              title="Cliquer pour changer de rôle ou de module"
            >
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-medium text-slate-700">{roleBadges[currentRole].shortName}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${roleBadges[currentRole].color}`}>
                {roleBadges[currentRole].badge}
              </span>
            </div>

            {/* LE BOUTON DE TROIS FLÈCHES (MENU SANS DISTRACTION) */}
            <button
              onClick={onOpenThreeArrowsMenu}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-95 group border border-slate-700"
              title="Ouvrir le menu de navigation et des modules (3 flèches)"
            >
              {/* Three sequential arrows */}
              <span className="flex items-center -space-x-1.5 text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                <ChevronRight className="w-4 h-4 stroke-[3]" />
                <ChevronRight className="w-4 h-4 stroke-[3]" />
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </span>
              <span>Menu</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
