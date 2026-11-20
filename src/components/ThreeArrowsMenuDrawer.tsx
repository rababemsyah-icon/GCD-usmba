import React, { useEffect, useMemo } from 'react';
import {
  X,
  BookOpen,
  ShoppingBag,
  FileCheck,
  LayoutDashboard,
  UserCheck,
  ShieldCheck,
  ChevronRight,
  Lock,
  Mail,
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
  emailCount?: number;
  onSelectRole?: (role: UserRole) => void;
  onLogout?: () => void;
  onOpenLogin?: () => void;
  maxChoices?: number;
  maxPdfSizeMB?: number;
}

export const ThreeArrowsMenuDrawer: React.FC<ThreeArrowsMenuDrawerProps> = ({
  isOpen,
  onClose,
  currentTab,
  onSelectTab,
  basketCount,
  openBasket,
  currentRole,
  emailCount = 0,
  onLogout,
  onOpenLogin,
  maxChoices = 3,
  maxPdfSizeMB = 5,
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

  // Strict RBAC: The menu displays ONLY authorized modules for the active role
  const authorizedModules = useMemo(() => {
    if (currentRole === 'visiteur') {
      const visitorModules: any[] = [
        {
          id: 'catalog',
          title: 'Sujets de Thèse',
          subtitle: 'Recherche et consultation des sujets disponibles',
          icon: BookOpen,
          badge: 'Catalogue',
        },
      ];
      if (basketCount > 0) {
        visitorModules.push({
          id: 'basket_trigger',
          title: 'Panier de Candidature',
          subtitle: 'Finaliser et candidater avec vos choix',
          icon: ShoppingBag,
          badge: `${basketCount}/${maxChoices} Sujets`,
          action: () => {
            onClose();
            openBasket();
          },
        });
      }
      return visitorModules;
    }

    if (currentRole === 'candidat') {
      return [
        {
          id: 'catalog',
          title: 'Sujets de Thèse',
          subtitle: 'Recherche et consultation des sujets disponibles',
          icon: BookOpen,
          badge: 'Catalogue',
        },
        {
          id: 'basket_trigger',
          title: 'Panier de Candidature',
          subtitle: `Sélection ordonnée (jusqu'à ${maxChoices} choix prioritaires)`,
          icon: ShoppingBag,
          badge: `${basketCount}/${maxChoices} Sujets`,
          action: () => {
            onClose();
            openBasket();
          },
        },
        {
          id: 'candidate_dashboard',
          title: 'Mon Dossier / Candidature',
          subtitle: "Suivi de l'avancement et état des pièces",
          icon: LayoutDashboard,
          badge: 'Dossier',
        },
        {
          id: 'ocr',
          title: 'Vérification des Documents',
          subtitle: `Dépôt, retrait et scan caméra (PDF ${maxPdfSizeMB} Mo max)`,
          icon: FileCheck,
          badge: 'Documents',
        },
        {
          id: 'notifications',
          title: 'Notifications Mail',
          subtitle: 'Boîte de réception : pièces, convocations et résultats',
          icon: Mail,
          badge: `${emailCount} reçus`,
        },
      ];
    }

    if (
      currentRole === 'administration' ||
      currentRole === 'admin_cedoc' ||
      currentRole === 'super_admin'
    ) {
      return [
        {
          id: 'administration_dashboard',
          title: 'Administration CEDoc & Personnel',
          subtitle: 'Contrôle des dossiers, gestion des rôles et campagne active',
          icon: UserCheck,
          badge: 'CEDoc',
        },
        {
          id: 'notifications',
          title: 'Notifications Mail',
          subtitle: 'Journal des e-mails automatiques envoyés aux candidats',
          icon: Mail,
          badge: `${emailCount} envoyés`,
        },
        {
          id: 'audit_trail',
          title: 'Journal d’Audit / Traçabilité',
          subtitle: 'Historique des transitions d’états, accès RBAC et logs',
          icon: Lock,
          badge: 'Audit',
        },
      ];
    }

    if (currentRole === 'directeur') {
      return [
        {
          id: 'supervisor_dashboard',
          title: 'Direction de Thèse',
          subtitle: 'Validation et décision d’encadrement',
          icon: UserCheck,
          badge: 'Encadrement',
        },
        {
          id: 'notifications',
          title: 'Notifications Mail',
          subtitle: 'Journal des alertes automatiques envoyées aux candidats',
          icon: Mail,
          badge: `${emailCount} envoyés`,
        },
        {
          id: 'catalog',
          title: 'Sujets de Thèse',
          subtitle: 'Consultation du catalogue doctoral',
          icon: BookOpen,
          badge: 'Catalogue',
        },
        {
          id: 'charter',
          title: 'Charte des Thèses',
          subtitle: 'Cadre réglementaire et signatures officielles',
          icon: ShieldCheck,
          badge: 'Charte',
        },
      ];
    }

    if (currentRole === 'chef_labo') {
      return [
        {
          id: 'supervisor_dashboard',
          title: 'Validation Structure de Recherche',
          subtitle: 'Validation du rattachement au laboratoire',
          icon: UserCheck,
          badge: 'Structure',
        },
        {
          id: 'notifications',
          title: 'Notifications Mail',
          subtitle: 'Journal des alertes automatiques envoyées aux candidats',
          icon: Mail,
          badge: `${emailCount} envoyés`,
        },
        {
          id: 'charter',
          title: 'Charte des Thèses',
          subtitle: 'Cadre réglementaire et signatures officielles',
          icon: ShieldCheck,
          badge: 'Charte',
        },
      ];
    }

    return [];
  }, [currentRole, basketCount, emailCount, openBasket, onClose, maxChoices, maxPdfSizeMB]);

  const roleDisplayLabel =
    currentRole === 'candidat'
      ? 'Candidat'
      : currentRole === 'directeur'
      ? 'Directeur de thèse'
      : currentRole === 'chef_labo'
      ? 'Direction de structure'
      : currentRole === 'administration' ||
        currentRole === 'admin_cedoc' ||
        currentRole === 'super_admin'
      ? 'Administration CEDoc'
      : 'Visiteur';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
        title="Cliquer pour fermer le menu"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-8">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200 text-slate-900">
          {/* Menu Drawer Header */}
          <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-white">
                <span className="flex items-center -space-x-1.5 font-bold">
                  <ChevronRight className="w-4 h-4 stroke-[3]" />
                  <ChevronRight className="w-4 h-4 stroke-[3]" />
                  <ChevronRight className="w-4 h-4 stroke-[3]" />
                </span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">
                  Menu & Modules
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">
                  Rôle : {roleDisplayLabel}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Fermer le menu (Échap)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Scrollable Body (Strictly Authorized Modules) */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
              Modules autorisés ({authorizedModules.length})
            </div>

            <div className="space-y-2">
              {authorizedModules.map((mod) => {
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
                    className={`w-full p-3.5 rounded-2xl text-left transition-all flex items-start gap-3.5 cursor-pointer border ${
                      isCurrent
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isCurrent
                          ? 'bg-slate-800 text-white'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`font-bold text-xs sm:text-sm truncate ${
                            isCurrent ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          {mod.title}
                        </span>
                        <span
                          className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full shrink-0 ${
                            isCurrent
                              ? 'bg-slate-800 text-white'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
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

          {/* Drawer Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            {currentRole !== 'visiteur' && onLogout ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="py-1.5 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-xs border border-red-200 cursor-pointer transition-colors"
              >
                Déconnexion
              </button>
            ) : onOpenLogin ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLogin();
                }}
                className="py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs cursor-pointer transition-colors"
              >
                Se connecter
              </button>
            ) : (
              <span>GCD-USMBA</span>
            )}

            <button
              onClick={onClose}
              className="py-1.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs cursor-pointer transition-colors"
            >
              Fermer le menu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
