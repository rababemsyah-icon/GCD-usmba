import React, { useEffect } from 'react';
import { X, Award, BookOpen, Tag, Mail, ShoppingBag, Plus, Check } from 'lucide-react';
import { Subject, BasketChoice } from '../types';

interface SubjectDetailModalProps {
  subject: Subject | null;
  onClose: () => void;
  basketChoices: BasketChoice[];
  onAddChoice: (subject: Subject) => void;
  onRemoveChoice: (subjectId: string) => void;
  onOpenBasket?: () => void;
  onApplySubject?: (subject: Subject) => void;
}

export const SubjectDetailModal: React.FC<SubjectDetailModalProps> = ({
  subject,
  onClose,
  basketChoices,
  onAddChoice,
  onRemoveChoice,
  onOpenBasket,
}) => {
  useEffect(() => {
    if (!subject) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [subject, onClose]);

  if (!subject) return null;

  const isSelected = basketChoices.some((c) => c.subjectId === subject.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150 text-slate-900">
        {/* Header */}
        <div className="bg-slate-900 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fermer (Échap)"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
              {subject.code}
            </span>
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              {subject.cedoc}
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">
            {subject.title}
          </h2>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[68vh] overflow-y-auto text-xs sm:text-sm text-slate-700">
          {/* Supervisor Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
                {subject.professorName.split(' ').map((n) => n[0]).slice(0, 2).join('')}
              </div>
              <div>
                <div className="font-semibold text-slate-900 text-sm">
                  {subject.professorName}
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {subject.professorEmail}
                </div>
              </div>
            </div>
            <div className="text-right text-xs">
              <span className="font-semibold text-slate-800">{subject.establishment}</span>
              <div className="text-slate-500 text-[11px]">{subject.laboratory}</div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5 text-slate-500">
              <BookOpen className="w-4 h-4 text-slate-600" />
              Projet & Objectifs Scientifiques
            </h4>
            <p className="text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              {subject.description}
            </p>
          </div>

          {/* Prerequisites */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-semibold block text-xs uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-slate-600" />
                Diplôme requis
              </span>
              <div className="text-xs font-semibold text-slate-900">
                {subject.requiredDiplomaField}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-semibold block text-xs uppercase tracking-wider text-slate-500 mb-1">
                Conditions académiques
              </span>
              <div className="text-xs space-y-1 text-slate-700">
                <div>• Seuil Master : <strong className="font-mono text-slate-900">{subject.minMasterAverage}/20</strong></div>
                <div>• Postes disponibles : <strong className="font-mono text-slate-900">{subject.quota} doctorant(s)</strong></div>
              </div>
            </div>
          </div>

          {/* Keywords */}
          {subject.keywords.length > 0 && (
            <div>
              <h4 className="font-semibold text-slate-500 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                Mots-clés de recherche
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {subject.keywords.map((kw) => (
                  <span
                    key={kw}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium"
                  >
                    #{kw}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer (Add to basket & access basket) */}
        <div className="p-4 px-6 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Fermer
          </button>

          <div className="flex items-center gap-2">
            {isSelected ? (
              <button
                type="button"
                onClick={() => {
                  onRemoveChoice(subject.id);
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-200 hover:bg-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-emerald-700" />
                <span>Retirer du panier</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onAddChoice(subject);
                }}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter au panier ({basketChoices.length}/3)</span>
              </button>
            )}

            {onOpenBasket && basketChoices.length > 0 && (
              <button
                type="button"
                onClick={onOpenBasket}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Accéder au panier ({basketChoices.length}/3)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
