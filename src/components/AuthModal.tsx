import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ShieldCheck,
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Ban,
} from 'lucide-react';
import { User, UserRole } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessAuth: (user: Partial<User>, mappedRole?: UserRole) => void;
  pendingApplicationCount?: number;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccessAuth,
  pendingApplicationCount = 0,
}) => {
  // Never pre-fill plaintext credentials in the login form
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setPassword('');
      setErrorMsg(null);
      setShowPassword(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!identifier.trim()) {
      setErrorMsg('Veuillez saisir votre adresse e-mail ou identifiant institutionnel.');
      return;
    }

    if (!password.trim()) {
      setErrorMsg('Veuillez saisir votre mot de passe.');
      passwordInputRef.current?.focus();
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
          provider: 'password',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Identifiants incorrects ou compte désactivé.');
        setIsLoading(false);
        return;
      }

      setPassword('');
      onSuccessAuth(data.user, data.role);
      onClose();
    } catch (err: any) {
      setErrorMsg(`Erreur de connexion au serveur : ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    const targetEmail = identifier.trim();

    if (!targetEmail) {
      setErrorMsg(
        'Saisissez ou sélectionnez d’abord votre adresse Google institutionnelle (@usmba.ac.ma) ci-dessus.'
      );
      return;
    }

    setIsGoogleLoading(true);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(
          data.error || 'Connexion Google refusée : compte inexistant ou désactivé.'
        );
        setIsGoogleLoading(false);
        return;
      }

      setPassword('');
      onSuccessAuth(data.user, data.role);
      onClose();
    } catch (err: any) {
      setErrorMsg(`Erreur lors de l’authentification Google : ${err.message}`);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const TEST_ACCOUNT_PASSWORD = 'Test@2026';

  // One-click institutional test account selection: fills e-mail and optional test password
  const handleQuickSelect = (email: string, prefillPassword?: string) => {
    setIdentifier(email);
    setPassword(prefillPassword ?? '');
    setErrorMsg(null);
    if (!prefillPassword) {
      setTimeout(() => passwordInputRef.current?.focus(), 0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150 text-slate-900">
        {/* Header */}
        <div className="bg-slate-900 p-6 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-200 text-xs font-semibold mb-2 border border-slate-700">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-300" />
            Portail Authentifié GCD-USMBA
          </div>
          <h2 className="text-xl font-bold text-white">Connexion à la Plateforme</h2>
          <p className="text-xs text-slate-300 mt-1">
            Accès réservé aux comptes institutionnels actifs. Votre espace est attribué selon votre rôle.
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {pendingApplicationCount > 0 && (
            <div className="p-3 rounded-xl bg-slate-100 border border-slate-300 text-xs text-slate-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-slate-900 shrink-0" />
              <span>
                Connectez-vous pour finaliser et soumettre votre panier ({pendingApplicationCount} sujet{pendingApplicationCount > 1 ? 's' : ''} sélectionné{pendingApplicationCount > 1 ? 's' : ''}).
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} noValidate className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                E-mail ou Identifiant institutionnel :
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="nom.prenom@usmba.ac.ma"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mot de passe :
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  ref={passwordInputRef}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Saisissez votre mot de passe"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                  title={showPassword ? 'Masquer' : 'Afficher'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50 mt-2"
            >
              <span>{isLoading ? 'Vérification...' : 'Se connecter'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Institutional Google SSO Option (Enforces Active Status Check) */}
          <div className="relative flex items-center py-0.5">
            <div className="flex-grow border-t border-slate-200" />
            <span className="shrink-0 mx-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              ou SSO Google USMBA
            </span>
            <div className="flex-grow border-t border-slate-200" />
          </div>

          <button
            type="button"
            disabled={isLoading || isGoogleLoading}
            onClick={handleGoogleLogin}
            className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs rounded-xl border border-slate-300 shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h6.44a5.5 5.5 0 0 1-2.39 3.61v3h3.87c2.26-2.08 3.57-5.15 3.57-8.64Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.87-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.29v3.1A12 12 0 0 0 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.29 14.29A7.2 7.2 0 0 1 4.91 12c0-.8.14-1.57.38-2.29V6.61H1.29A12 12 0 0 0 0 12c0 1.94.46 3.77 1.29 5.39l4-3.1Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.76c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.61l4 3.1C6.23 6.87 8.88 4.76 12 4.76Z"
              />
            </svg>
            <span>
              {isGoogleLoading
                ? 'Vérification du compte Google...'
                : 'Continuer avec Google (@usmba.ac.ma)'}
            </span>
          </button>

          {/* Quick Institutional Accounts Shortcuts */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Comptes institutionnels (sélection rapide) :
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => handleQuickSelect('sara.berrada@usmba.ac.ma', TEST_ACCOUNT_PASSWORD)}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-900 text-white text-left cursor-pointer transition-colors col-span-2"
              >
                <div className="font-bold flex items-center justify-between gap-2">
                  <span>★ Sara Berrada</span>
                  <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-1.5 py-0.5 rounded whitespace-nowrap">
                    Candidat • Actif
                  </span>
                </div>
                <div className="text-[10px] text-slate-300 flex items-center justify-between gap-2 mt-0.5">
                  <span className="truncate">sara.berrada@usmba.ac.ma</span>
                  <span className="font-mono text-slate-400 whitespace-nowrap shrink-0">
                    Mdp : {TEST_ACCOUNT_PASSWORD}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect('sara.idrissi@usmba.ac.ma', TEST_ACCOUNT_PASSWORD)}
                className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-slate-800 text-left cursor-pointer transition-colors col-span-2"
              >
                <div className="font-bold text-emerald-950 flex items-center justify-between gap-2">
                  <span>Sara Idrissi</span>
                  <span className="text-[10px] font-mono bg-emerald-200/80 text-emerald-900 px-1.5 py-0.5 rounded whitespace-nowrap">
                    Candidat • Vierge
                  </span>
                </div>
                <div className="text-[10px] text-emerald-800 truncate">sara.idrissi@usmba.ac.ma</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect('youssef.alaoui@usmba.ac.ma', TEST_ACCOUNT_PASSWORD)}
                className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-left cursor-pointer transition-colors"
              >
                <div className="font-bold truncate">Youssef Alaoui</div>
                <div className="text-[10px] text-slate-500 whitespace-nowrap">Candidat</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect('m.bennani@usmba.ac.ma', TEST_ACCOUNT_PASSWORD)}
                className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-left cursor-pointer transition-colors"
              >
                <div className="font-bold truncate">Pr. Bennani</div>
                <div className="text-[10px] text-slate-500 whitespace-nowrap">Directeur de thèse</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect('k.elamrani@usmba.ac.ma', TEST_ACCOUNT_PASSWORD)}
                className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-left cursor-pointer transition-colors"
              >
                <div className="font-bold truncate">Dr. El Amrani</div>
                <div className="text-[10px] text-slate-500 whitespace-nowrap">Direction de structure</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect('scolarite.cedoc@usmba.ac.ma', TEST_ACCOUNT_PASSWORD)}
                className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-left cursor-pointer transition-colors"
              >
                <div className="font-bold truncate">Mme. Bernoussi</div>
                <div className="text-[10px] text-slate-500 whitespace-nowrap">Administration CEDoc</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect('h.tazi@usmba.ac.ma', TEST_ACCOUNT_PASSWORD)}
                className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-900 text-left cursor-pointer transition-colors col-span-2 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="font-bold truncate flex items-center gap-1">
                    <Ban className="w-3 h-3 text-rose-600 shrink-0" />
                    <span>Pr. Hassan Tazi</span>
                  </div>
                  <div className="text-[10px] text-rose-700 truncate">h.tazi@usmba.ac.ma</div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-200/80 text-rose-900 whitespace-nowrap shrink-0">
                  Compte Inactif
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
