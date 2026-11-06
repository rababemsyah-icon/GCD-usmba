import React from 'react';
import { X, Building2, User, Award, BookOpen, CheckCircle, Tag, Layers, Mail } from 'lucide-react';
import { Subject, BasketChoice } from '../types';

interface SubjectDetailModalProps {
  subject: Subject | null;
  onClose: () => void;
  basketChoices: BasketChoice[];
  onAddChoice: (subject: Subject) => void;
  onRemoveChoice: (subjectId: string) => void;
}

export const SubjectDetailModal: React.FC<SubjectDetailModalProps> = ({
  subject,
  onClose,
  basketChoices,
  onAddChoice,
  onRemoveChoice,
}) => {
  if (!subject) return null;

  const basketIndex = basketChoices.findIndex((c) => c.subjectId === subject.id);
  const inBasket = basketIndex !== -1;
  const rank = inBasket ? basketIndex + 1 : null;
  const isBasketFull = basketChoices.length >= 3 && !inBasket;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              {subject.code}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
              {subject.cedoc}
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-white leading-snug">
            {subject.title}
          </h2>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto text-xs sm:text-sm text-slate-700">
          {/* Supervisor Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-800 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                {subject.professorName.split(' ').map((n) => n[0]).slice(0, 2).join('')}
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  {subject.professorName}
                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-blue-100 text-blue-800 font-medium">
                    Directeur de Thèse
                  </span>
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
            <h4 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              Projet & Objectifs Scientifiques
            </h4>
            <p className="text-slate-600 leading-relaxed bg-white p-3.5 rounded-xl border border-slate-200">
              {subject.description}
            </p>
          </div>

          {/* Prerequisites */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900">
              <span className="font-bold block text-xs uppercase tracking-wider text-amber-800 mb-1 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5" />
                Diplôme requis
              </span>
              <div className="text-xs font-medium text-amber-950">
                {subject.requiredDiplomaField}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-bold block text-xs uppercase tracking-wider text-slate-500 mb-1">
                Conditions académiques
              </span>
              <div className="text-xs space-y-1 text-slate-700">
                <div>• Seuil Master : <strong className="font-mono text-slate-900">{subject.minMasterAverage}/20</strong></div>
                <div>• Nombre de postes financés : <strong className="font-mono text-slate-900">{subject.quota} doctorant(s)</strong></div>
              </div>
            </div>
          </div>

          {/* Keywords */}
          <div>
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              Mots-clés de recherche
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {subject.keywords.map((kw) => (
                <span
                  key={kw}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium"
                >
                  #{kw}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
          >
            Fermer
          </button>

          {inBasket ? (
            <button
              onClick={() => onRemoveChoice(subject.id)}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-red-100 text-red-800 hover:bg-red-200 border border-red-300 transition-colors"
            >
              Retirer du panier (Choix {rank})
            </button>
          ) : (
            <button
              disabled={isBasketFull}
              onClick={() => {
                onAddChoice(subject);
                onClose();
              }}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                isBasketFull
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isBasketFull ? 'Panier déjà complet (3/3)' : 'Ajouter à mon panier'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
