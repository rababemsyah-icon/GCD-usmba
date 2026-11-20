import React, { useState, useMemo } from 'react';
import {
  Search,
  BookOpen,
  Building2,
  ChevronRight,
  ChevronDown,
  SlidersHorizontal,
  X,
  Layers,
  ShoppingBag,
  Plus,
  Check,
  ArrowRight,
} from 'lucide-react';
import { Subject, BasketChoice } from '../types';

interface SubjectCatalogProps {
  subjects: Subject[];
  basketChoices: BasketChoice[];
  onAddChoice: (subject: Subject) => void;
  onRemoveChoice: (subjectId: string) => void;
  onOpenBasket: () => void;
  onSelectSubjectForDetail: (subject: Subject) => void;
  onQuickApply?: (subject: Subject) => void;
  onProceedToAuth?: () => void;
  maxChoices?: number;
}

export const SubjectCatalog: React.FC<SubjectCatalogProps> = ({
  subjects,
  basketChoices,
  onAddChoice,
  onRemoveChoice,
  onOpenBasket,
  onSelectSubjectForDetail,
  onProceedToAuth,
  maxChoices = 3,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEstablishment, setSelectedEstablishment] = useState('all');
  const [selectedCedoc, setSelectedCedoc] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showSubjectList, setShowSubjectList] = useState(false);

  const filteredSubjects = useMemo(() => {
    return subjects.filter((subj) => {
      if (selectedEstablishment !== 'all' && subj.establishment !== selectedEstablishment) {
        return false;
      }
      if (selectedCedoc !== 'all' && subj.cedoc !== selectedCedoc) {
        return false;
      }

      if (!searchQuery.trim()) return true;

      const tokens = searchQuery.toLowerCase().split(/\s+/).filter((t) => t.length > 0);
      const combinedIndex = [
        subj.title,
        subj.code,
        subj.professorName,
        subj.laboratory,
        subj.establishment,
        subj.axis,
        subj.requiredDiplomaField,
        ...subj.keywords,
      ]
        .join(' ')
        .toLowerCase();

      return tokens.every((token) => combinedIndex.includes(token));
    });
  }, [subjects, searchQuery, selectedEstablishment, selectedCedoc]);

  return (
    <div className="max-w-4xl mx-auto space-y-5 py-6">
      {/* Central Minimal Clean Search Bar (Pure white and dark grey, no titles or suggestions) */}
      <div className="space-y-3">
        <div className="relative flex items-center shadow-xs">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
            <Search className="w-5 h-5 text-slate-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un sujet, laboratoire ou encadrant..."
            className="w-full pl-12 pr-28 py-3.5 bg-white border border-slate-300 rounded-2xl text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-slate-800 transition-all shadow-xs"
          />

          <div className="absolute inset-y-0 right-2 flex items-center gap-1.5">
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer transition-colors"
                title="Effacer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                showFilters || (selectedEstablishment !== 'all' || selectedCedoc !== 'all')
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
              title="Filtrer par établissement ou CEDoc"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filtres</span>
            </button>
          </div>
        </div>

        {/* Optional Collapsible Filter Strip */}
        {showFilters && (
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs animate-in fade-in duration-150">
            <div>
              <label className="block text-slate-500 font-semibold mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" /> Établissement
              </label>
              <select
                value={selectedEstablishment}
                onChange={(e) => setSelectedEstablishment(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                <option value="all">Tous les établissements</option>
                <option value="FST Fès">Faculté des Sciences et Techniques (FST Fès)</option>
                <option value="ENSA Fès">École Nationale des Sciences Appliquées (ENSA)</option>
                <option value="FS Dhar El Mahraz">Faculté des Sciences Dhar El Mahraz (FSDM)</option>
                <option value="FLSH Dhar El Mahraz">Faculté des Lettres et Sciences Humaines (FLSH)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-500 font-semibold mb-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-slate-400" /> Centre d'Études Doctorales (CEDoc)
              </label>
              <select
                value={selectedCedoc}
                onChange={(e) => setSelectedCedoc(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                <option value="all">Tous les CEDoc</option>
                <option value="CEDoc Sciences et Technologies">CEDoc Sciences et Technologies</option>
                <option value="CEDoc Lettres et Sciences Humaines">CEDoc Lettres et Sciences Humaines</option>
              </select>
            </div>
          </div>
        )}

        {/* Bouton Sujets Disponibles (Ne pas afficher directement, accessible via ce bouton) */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => setShowSubjectList(!showSubjectList)}
            className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 shadow-xs flex items-center gap-2.5 transition-all cursor-pointer"
          >
            <span>{showSubjectList ? 'Masquer les sujets' : 'Sujets disponibles'}</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-xs font-mono font-bold">
              {filteredSubjects.length}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                showSubjectList ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>

        {/* Inline Basket Bar: Visible whenever choices are added (up to 3) */}
        {basketChoices.length > 0 && (
          <div className="bg-slate-900 text-white rounded-2xl p-3.5 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-in fade-in duration-150">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm">
              <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <span className="font-bold">
                  Panier : {basketChoices.length}/{maxChoices} sujet{basketChoices.length > 1 ? 's' : ''} sélectionné{basketChoices.length > 1 ? 's' : ''}
                </span>
                <span className="hidden sm:inline text-slate-300 text-xs ml-2">
                  • Accédez au panier pour finaliser et candidater
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onOpenBasket}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Accéder au panier ({basketChoices.length}/{maxChoices})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Subjects List: Displayed ONLY when 'Sujets disponibles' is clicked */}
      {showSubjectList && (
        <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-2 duration-150">
          {filteredSubjects.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 text-slate-500">
              <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">Aucun sujet ne correspond à votre recherche</p>
              <p className="text-xs text-slate-400 mt-1">Essayez un autre mot-clé ou réinitialisez les filtres.</p>
            </div>
          ) : (
            filteredSubjects.map((subj) => {
              const selectedChoice = basketChoices.find((c) => c.subjectId === subj.id);
              const isSelected = Boolean(selectedChoice);
              return (
                <div
                  key={subj.id}
                  onClick={() => onSelectSubjectForDetail(subj)}
                  className={`w-full p-4 rounded-xl border bg-white transition-all cursor-pointer flex items-center justify-between gap-4 group text-left ${
                    isSelected
                      ? 'border-slate-900 ring-1 ring-slate-900/10 bg-slate-50/50'
                      : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50/60 shadow-xs'
                  }`}
                >
                  {/* Minimal Title Row (No Clutter) */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {subj.code}
                      </span>
                      <span className="text-xs text-slate-500 font-medium truncate">
                        {subj.establishment} • {subj.laboratory}
                      </span>
                      {selectedChoice && (
                        <span className="text-[10px] font-bold text-white bg-slate-900 px-2 py-0.5 rounded-full">
                          Choix n°{selectedChoice.rank}
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm sm:text-base font-semibold text-slate-900 group-hover:text-slate-950 transition-colors leading-snug">
                      {subj.title}
                    </h3>
                  </div>

                  {/* Right Actions: + Panier / Retirer & Consulter */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isSelected) {
                          onRemoveChoice(subj.id);
                        } else {
                          onAddChoice(subj);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 border ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                          : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
                      }`}
                      title={isSelected ? 'Retirer du panier' : `Ajouter au panier (max ${maxChoices})`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Dans le panier</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Panier</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSubjectForDetail(subj);
                      }}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <span>Consulter</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
