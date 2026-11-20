import React from 'react';
import {
  ShoppingBag,
  X,
  ArrowUp,
  ArrowDown,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Building2,
  User,
  ArrowRight,
} from 'lucide-react';
import { Subject, BasketChoice } from '../types';

interface SubjectBasketDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  basketChoices: BasketChoice[];
  allSubjects: Subject[];
  onRemoveChoice: (subjectId: string) => void;
  onMoveChoice: (currentIndex: number, direction: 'up' | 'down') => void;
  onProceedToAuth: () => void;
  maxChoices?: number;
  campaignClosedReason?: string | null;
}

export const SubjectBasketDrawer: React.FC<SubjectBasketDrawerProps> = ({
  isOpen,
  onClose,
  basketChoices,
  allSubjects,
  onRemoveChoice,
  onMoveChoice,
  onProceedToAuth,
  maxChoices = 3,
  campaignClosedReason = null,
}) => {
  if (!isOpen) return null;

  const count = basketChoices.length;
  const hasChoices = count >= 1 && count <= maxChoices;
  const canSubmit = hasChoices && !campaignClosedReason;

  // Resolve subjects with their rank
  const selectedSubjects = basketChoices.map((choice) => {
    const subject = allSubjects.find((s) => s.id === choice.subjectId);
    return {
      choice,
      subject,
    };
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-lg bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200 text-slate-900">
          {/* Header */}
          <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-white">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  Panier de Candidature
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
                      hasChoices ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-900'
                    }`}
                  >
                    {count}/{maxChoices} Sujets
                  </span>
                </h2>
                <p className="text-xs text-slate-300">Jusqu'à {maxChoices} sujet{maxChoices > 1 ? 's' : ''} de thèse ordonné{maxChoices > 1 ? 's' : ''}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Status */}
          <div
            className={`px-5 py-2.5 text-xs flex items-center gap-2.5 border-b ${
              campaignClosedReason
                ? 'bg-amber-50 text-amber-900 border-amber-200'
                : hasChoices
                ? 'bg-slate-100 text-slate-800 border-slate-200'
                : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
          >
            {campaignClosedReason ? (
              <>
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-semibold text-xs text-amber-900">{campaignClosedReason}</span>
              </>
            ) : hasChoices ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-slate-900 shrink-0" />
                <span className="font-semibold text-xs text-slate-900">
                  {count} choix sélectionné{count > 1 ? 's' : ''} par ordre de préférence (max {maxChoices}).
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="font-medium text-xs text-slate-600">
                  Sélectionnez jusqu'à {maxChoices} sujets ordonnés pour candidater.
                </span>
              </>
            )}
          </div>

          {/* Basket Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {count === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
                <ShoppingBag className="w-12 h-12 stroke-[1.5] text-slate-300 mb-3" />
                <h3 className="font-semibold text-slate-700 text-sm">Aucun sujet sélectionné</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Parcourez le catalogue et sélectionnez jusqu'à {maxChoices} sujets distincts.
                </p>
              </div>
            ) : (
              selectedSubjects.map(({ choice, subject }, index) => {
                const rankLabels = [
                  '1er Choix (Prioritaire)',
                  '2ème Choix',
                  '3ème Choix',
                  '4ème Choix',
                  '5ème Choix',
                ];
                const rankColors = [
                  'border-slate-900 bg-slate-900 text-white',
                  'border-slate-700 bg-slate-700 text-white',
                  'border-slate-500 bg-slate-600 text-white',
                  'border-slate-500 bg-slate-500 text-white',
                  'border-slate-400 bg-slate-500 text-white',
                ];

                if (!subject) return null;

                return (
                  <div
                    key={subject.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:border-slate-300 shadow-xs transition-all relative group"
                  >
                    {/* Priority Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                            rankColors[index]
                          }`}
                        >
                          {rankLabels[index]}
                        </span>
                        <span className="text-[11px] font-mono font-semibold text-slate-500">
                          {subject.code}
                        </span>
                      </div>

                      {/* Reorder Buttons & Delete */}
                      <div className="flex items-center gap-1">
                        <button
                          disabled={index === 0}
                          onClick={() => onMoveChoice(index, 'up')}
                          title="Augmenter la priorité"
                          className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          disabled={index === count - 1}
                          onClick={() => onMoveChoice(index, 'down')}
                          title="Diminuer la priorité"
                          className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onRemoveChoice(subject.id)}
                          title="Retirer du panier"
                          className="p-1 rounded text-rose-600 hover:text-rose-800 hover:bg-rose-50 transition-colors ml-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Subject Title */}
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                      {subject.title}
                    </h4>

                    {/* Metadata */}
                    <div className="mt-2.5 pt-2 border-t border-slate-200 flex flex-wrap gap-y-1.5 gap-x-3 text-[11px] text-slate-600">
                      <div className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium text-slate-800">{subject.professorName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{subject.establishment}</span>
                      </div>
                    </div>

                    {/* Required Field pill */}
                    <div className="mt-2 text-[10px] bg-white text-slate-700 px-2.5 py-1 rounded-md border border-slate-200">
                      <span className="font-semibold text-slate-500">Profil requis :</span> {subject.requiredDiplomaField}
                    </div>
                  </div>
                );
              })
            )}

            {/* Tip card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-slate-600" />
                Règlement du Cycle Doctoral USMBA
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Le choix n°1 représente votre vœu préférentiel examiné en priorité par la commission doctorale. Les choix 2 et 3 sont activés si le quota du premier sujet est atteint.
              </p>
            </div>
          </div>

          {/* Footer with validation button */}
          <div className="p-5 bg-slate-50 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Statut du panier :</span>
              <span className={`font-bold ${canSubmit ? 'text-slate-900' : 'text-slate-600'}`}>
                {campaignClosedReason
                  ? 'Campagne fermée'
                  : hasChoices
                  ? `✓ Prêt (${count}/${maxChoices} sujet${count > 1 ? 's' : ''})`
                  : count > maxChoices
                  ? `Maximum autorisé dépassé (${count}/${maxChoices})`
                  : 'Aucun sujet sélectionné'}
              </span>
            </div>

            <button
              disabled={!canSubmit}
              onClick={() => {
                onClose();
                onProceedToAuth();
              }}
              className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                canSubmit
                  ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>Candidater{hasChoices ? ` (${count}/${maxChoices})` : ''}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {!hasChoices && (
              <p className="text-[11px] text-center text-slate-400">
                Ajoutez au moins 1 sujet (jusqu'à {maxChoices}) pour candidater.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
