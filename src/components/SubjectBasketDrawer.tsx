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
}

export const SubjectBasketDrawer: React.FC<SubjectBasketDrawerProps> = ({
  isOpen,
  onClose,
  basketChoices,
  allSubjects,
  onRemoveChoice,
  onMoveChoice,
  onProceedToAuth,
}) => {
  if (!isOpen) return null;

  const count = basketChoices.length;
  const isComplete = count === 3;

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
        <div className="w-screen max-w-lg bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  Panier de Candidature
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
                      isComplete ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-slate-900'
                    }`}
                  >
                    {count}/3 Sujets
                  </span>
                </h2>
                <p className="text-xs text-slate-300">Sélection obligatoire de 3 sujets ordonnés</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Status */}
          <div
            className={`px-5 py-2.5 text-xs flex items-center gap-2.5 border-b ${
              isComplete
                ? 'bg-slate-50 text-slate-800 border-slate-200'
                : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
          >
            {isComplete ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium text-xs text-slate-800">
                  3 choix sélectionnés par ordre de préférence.
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="font-medium text-xs text-slate-600">
                  {count === 0 && 'Sélectionnez 3 sujets ordonnés pour valider.'}
                  {count === 1 && 'Encore 2 sujets à sélectionner (1/3).'}
                  {count === 2 && 'Encore 1 sujet à sélectionner (2/3).'}
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
                  Parcourez le catalogue public sans compte et cliquez sur « Ajouter au Panier » sur 3 sujets distincts.
                </p>
              </div>
            ) : (
              selectedSubjects.map(({ choice, subject }, index) => {
                const rankLabels = ['1er Choix (Prioritaire)', '2ème Choix', '3ème Choix'];
                const rankColors = [
                  'border-emerald-500 bg-emerald-500 text-white',
                  'border-blue-500 bg-blue-500 text-white',
                  'border-amber-500 bg-amber-500 text-white',
                ];

                if (!subject) return null;

                return (
                  <div
                    key={subject.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 shadow-xs transition-all relative group"
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
                          className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          disabled={index === count - 1}
                          onClick={() => onMoveChoice(index, 'down')}
                          title="Diminuer la priorité"
                          className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onRemoveChoice(subject.id)}
                          title="Retirer du panier"
                          className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors ml-1"
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
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-y-1.5 gap-x-3 text-[11px] text-slate-600">
                      <div className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium text-slate-700">{subject.professorName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{subject.establishment}</span>
                      </div>
                    </div>

                    {/* Required Field pill */}
                    <div className="mt-2 text-[10px] bg-slate-50 text-slate-600 px-2 py-1 rounded border border-slate-100">
                      <span className="font-semibold text-slate-700">Profil requis:</span> {subject.requiredDiplomaField}
                    </div>
                  </div>
                );
              })
            )}

            {/* Tip card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs text-slate-600 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Règlement des Thèses USMBA
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Le choix n°1 représente votre vœu préférentiel examiné en priorité par la commission doctorale. Les choix 2 et 3 sont activés si le quota du premier sujet est atteint.
              </p>
            </div>
          </div>

          {/* Footer with strict validation button */}
          <div className="p-5 bg-slate-50 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Statut du panier:</span>
              <span className={`font-bold ${isComplete ? 'text-emerald-700' : 'text-amber-700'}`}>
                {isComplete ? '✓ Prêt pour soumission' : `${3 - count} sujet(s) restant(s)`}
              </span>
            </div>

            {/* Strict UI rule enforced: Button is disabled until exactly 3 subjects are in basket */}
            <button
              disabled={!isComplete}
              onClick={() => {
                onClose();
                onProceedToAuth();
              }}
              className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                isComplete
                  ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs cursor-pointer'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
              }`}
            >
              <span>Valider les 3 choix</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {!isComplete && (
              <p className="text-[11px] text-center text-slate-400">
                Sélectionnez 3 sujets pour activer la validation.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
