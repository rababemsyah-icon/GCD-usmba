import React, { useState } from 'react';
import { X, ShieldCheck, Mail, ArrowRight, UserCheck, KeyRound, Building, CheckCircle2 } from 'lucide-react';
import { User } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessAuth: (user: Partial<User>) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccessAuth }) => {
  const [authMode, setAuthMode] = useState<'sso' | 'external'>('sso');
  const [ssoEmail, setSsoEmail] = useState('youssef.alaoui@usmba.ac.ma');
  const [extFullName, setExtFullName] = useState('');
  const [extEmail, setExtEmail] = useState('');
  const [extCin, setExtCin] = useState('');
  const [extUniversity, setExtUniversity] = useState('');

  if (!isOpen) return null;

  const handleSsoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSuccessAuth({
      id: 'usr-candidate-youssef',
      email: ssoEmail,
      fullName: 'Youssef Alaoui Mdaghri',
      role: 'CANDIDAT',
      ssoProvider: 'usmba',
      ocrVerified: true,
      cinNumber: 'CD689412',
      cneNumber: 'M134567890',
    });
    onClose();
  };

  const handleExternalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSuccessAuth({
      id: `usr-ext-${Date.now()}`,
      email: extEmail || 'candidat.externe@gmail.com',
      fullName: extFullName || 'Sara Benjelloun',
      role: 'CANDIDAT',
      ssoProvider: 'local',
      ocrVerified: false,
      cinNumber: extCin || 'BK541289',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-2 border border-emerald-400/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            Accès Sécurisé USMBA Identity
          </div>
          <h2 className="text-xl font-extrabold text-white">Validation du Panier Doctorat</h2>
          <p className="text-xs text-slate-300 mt-1">
            Authentifiez-vous pour lier vos 3 choix et accéder à la capture OCR de vos pièces d'identité.
          </p>
        </div>

        {/* Auth Mode Toggle */}
        <div className="p-6">
          <div className="flex rounded-xl bg-slate-100 p-1 mb-5">
            <button
              onClick={() => setAuthMode('sso')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                authMode === 'sso'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Building className="w-3.5 h-3.5 text-emerald-600" />
              Compte Académique USMBA (SSO)
            </button>
            <button
              onClick={() => setAuthMode('external')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                authMode === 'external'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
              Candidat Externe
            </button>
          </div>

          {authMode === 'sso' ? (
            /* SSO Form */
            <form onSubmit={handleSsoSubmit} className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-emerald-950">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Connexion SSO 1-Click pour les lauréats USMBA
                </div>
                <p className="text-emerald-800 text-[11px] leading-relaxed">
                  L'adresse institutionnelle <code className="font-mono bg-emerald-100 px-1 py-0.5 rounded font-bold">@usmba.ac.ma</code> synchronise directement votre profil académique (Apogée) et valide automatiquement la vérification de vos diplômes.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  E-mail Académique Institutionnel
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={ssoEmail}
                    onChange={(e) => setSsoEmail(e.target.value)}
                    required
                    placeholder="prenom.nom@usmba.ac.ma"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">Youssef Alaoui Mdaghri</div>
                  <div className="text-[11px] text-slate-500">Master IA FST Fès • CNE: M134567890</div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  Prêt
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <span>Connexion SSO 1-Click & Valider le Panier</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* External Candidate Form */
            <form onSubmit={handleExternalSubmit} className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900">
                <div className="font-bold flex items-center gap-1.5 text-blue-950 mb-1">
                  <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                  Création de compte simplifiée avec auto-complétion
                </div>
                <p className="text-[11px] text-blue-800">
                  Réservé aux candidats diplômés d'autres universités nationales ou internationales. Le module OCR extraira vos relevés à l'étape suivante.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nom & Prénom</label>
                <input
                  type="text"
                  value={extFullName}
                  onChange={(e) => setExtFullName(e.target.value)}
                  placeholder="Sara Benjelloun"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">E-mail personnel</label>
                  <input
                    type="email"
                    value={extEmail}
                    onChange={(e) => setExtEmail(e.target.value)}
                    placeholder="sara.b@gmail.com"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Numéro de CIN</label>
                  <input
                    type="text"
                    value={extCin}
                    onChange={(e) => setExtCin(e.target.value)}
                    placeholder="BK541289"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Université d'origine</label>
                <input
                  type="text"
                  value={extUniversity}
                  onChange={(e) => setExtUniversity(e.target.value)}
                  placeholder="Université Mohammed V de Rabat / Autre"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all mt-2"
              >
                <span>Créer mon compte & Passer à l'OCR</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
