import React, { useState, useMemo } from 'react';
import {
  Search,
  BookOpen,
  Building2,
  User,
  Plus,
  Check,
  Tag,
  SlidersHorizontal,
  Info,
  Layers,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Subject, BasketChoice } from '../types';

interface SubjectCatalogProps {
  subjects: Subject[];
  basketChoices: BasketChoice[];
  onAddChoice: (subject: Subject) => void;
  onRemoveChoice: (subjectId: string) => void;
  onOpenBasket: () => void;
  onSelectSubjectForDetail: (subject: Subject) => void;
}

export const SubjectCatalog: React.FC<SubjectCatalogProps> = ({
  subjects,
  basketChoices,
  onAddChoice,
  onRemoveChoice,
  onOpenBasket,
  onSelectSubjectForDetail,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEstablishment, setSelectedEstablishment] = useState('all');
  const [selectedCedoc, setSelectedCedoc] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showSubjectsList, setShowSubjectsList] = useState(false);

  const presetSearches = [
    { label: 'Intelligence Artificielle', query: 'Intelligence Artificielle' },
    { label: 'Solaire & Énergie', query: 'Solaire' },
    { label: 'Cybersécurité', query: 'Cybersécurité' },
    { label: 'Matériaux', query: 'Matériaux' },
    { label: 'NLP & Langue Arabe', query: 'NLP' },
    { label: 'IoT & Jumeaux Numériques', query: 'Jumeaux Numériques' },
    { label: 'Pr. Bennani', query: 'Bennani' },
    { label: 'FST Fès', query: 'FST Fès' },
  ];

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

  const basketCount = basketChoices.length;
  const hasActiveFilters = selectedEstablishment !== 'all' || selectedCedoc !== 'all' || Boolean(searchQuery);

  return (
    <div className="space-y-4">
      {/* Search Bar & Options - Library Style (Clean, sober, zero fluff) */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-xs border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par titre, discipline, laboratoire, encadrant..."
              className="w-full pl-10 pr-20 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:bg-white transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-2 my-auto h-6 px-2 text-[11px] text-slate-400 hover:text-slate-700 rounded transition-colors"
              >
                Effacer
              </button>
            )}
          </div>

          {/* Toggle Button for Filters & Suggestions */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
              showFilters || (selectedEstablishment !== 'all' || selectedCedoc !== 'all')
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filtres & Suggestions</span>
            {(selectedEstablishment !== 'all' || selectedCedoc !== 'all') && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            )}
          </button>
        </div>

        {/* Collapsible Panel: Hidden by default, accessible on click */}
        {showFilters && (
          <div className="pt-3 border-t border-slate-100 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
            {/* Quick Suggestions */}
            <div>
              <div className="text-[11px] text-slate-400 font-semibold mb-1.5 flex items-center gap-1">
                <Tag className="w-3 h-3" />
                Mots-clés suggérés
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs">
                {presetSearches.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => setSearchQuery(preset.query)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                      searchQuery === preset.query
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dropdown Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <label className="block text-slate-500 font-semibold mb-1 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" /> Établissement
                </label>
                <select
                  value={selectedEstablishment}
                  onChange={(e) => setSelectedEstablishment(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
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
                  <Layers className="w-3.5 h-3.5" /> CEDoc
                </label>
                <select
                  value={selectedCedoc}
                  onChange={(e) => setSelectedCedoc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                >
                  <option value="all">Tous les CEDoc</option>
                  <option value="CEDoc Sciences et Technologies">CEDoc Sciences et Technologies</option>
                  <option value="CEDoc Lettres et Sciences Humaines">CEDoc Lettres et Sciences Humaines</option>
                </select>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedEstablishment('all');
                    setSelectedCedoc('all');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 underline font-medium cursor-pointer"
                >
                  Réinitialiser la recherche
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Bar: Sujets Disponibles button (Zero direct display, access on-demand) */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setShowSubjectsList(!showSubjectsList)}
            className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-xs ${
              showSubjectsList
                ? 'bg-slate-900 text-white hover:bg-slate-800'
                : 'bg-emerald-700 hover:bg-emerald-800 text-white'
            }`}
            title="Afficher ou masquer la liste des sujets trouvés"
          >
            <BookOpen className="w-4 h-4 text-emerald-200" />
            <span>{showSubjectsList ? 'Masquer les sujets' : 'Sujets disponibles'}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                showSubjectsList
                  ? 'bg-slate-800 text-slate-200'
                  : 'bg-emerald-800 text-emerald-100'
              }`}
            >
              {filteredSubjects.length}
            </span>
            {showSubjectsList ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {basketCount > 0 && (
            <button
              onClick={onOpenBasket}
              className="px-3 py-2 rounded-xl text-xs text-slate-700 hover:bg-slate-100 border border-slate-200 font-semibold cursor-pointer hidden sm:flex items-center gap-1.5 transition-colors shrink-0"
              title="Consulter les choix sélectionnés dans le panier"
            >
              <span>Panier :</span>
              <span className="font-bold text-emerald-700">{basketCount}/3</span>
            </button>
          )}
        </div>

        <div className="text-xs text-slate-500 font-medium text-center sm:text-right">
          {!showSubjectsList ? (
            <span>
              {filteredSubjects.length > 0 ? (
                <>
                  <strong className="text-slate-800 font-bold">{filteredSubjects.length}</strong> sujet(s) prêt(s) à être consulté(s).
                </>
              ) : (
                'Aucun sujet ne correspond aux critères.'
              )}
            </span>
          ) : (
            <span>Affichage de <strong>{filteredSubjects.length}</strong> sujet(s) disponible(s)</span>
          )}
        </div>
      </div>

      {/* Conditionally Rendered Subjects Grid: Only visible when 'Sujets disponibles' is clicked */}
      {showSubjectsList && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSubjects.map((subject) => {
              const basketIndex = basketChoices.findIndex((c) => c.subjectId === subject.id);
              const inBasket = basketIndex !== -1;
              const currentRank = inBasket ? basketIndex + 1 : null;
              const isBasketFull = basketChoices.length >= 3 && !inBasket;

              return (
                <div
                  key={subject.id}
                  className={`rounded-2xl border transition-all bg-white p-4 sm:p-5 flex flex-col justify-between shadow-xs ${
                    inBasket
                      ? 'border-emerald-500 ring-1 ring-emerald-500/30 bg-emerald-50/15'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    {/* Header tags */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {subject.code}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {subject.establishment}
                        </span>
                        {inBasket && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Choix {currentRank}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title */}
                    <h3
                      className="text-sm sm:text-base font-bold text-slate-900 leading-snug line-clamp-2 hover:text-slate-700 transition-colors cursor-pointer"
                      onClick={() => onSelectSubjectForDetail(subject)}
                    >
                      {subject.title}
                    </h3>

                    {/* Supervisor & Lab */}
                    <div className="mt-2 space-y-1 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-800">{subject.professorName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{subject.laboratory}</span>
                      </div>
                    </div>

                    {/* Abstract Preview */}
                    <p className="mt-2.5 text-xs text-slate-600 leading-relaxed line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {subject.description}
                    </p>

                    {/* Keywords */}
                    <div className="mt-2.5 flex flex-wrap gap-1">
                      {subject.keywords.map((kw) => (
                        <span
                          key={kw}
                          className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => onSelectSubjectForDetail(subject)}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Info className="w-3.5 h-3.5" />
                      Détails
                    </button>

                    {inBasket ? (
                      <button
                        onClick={() => onRemoveChoice(subject.id)}
                        className="py-1.5 px-3 rounded-xl text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors cursor-pointer"
                      >
                        Retirer (Choix {currentRank})
                      </button>
                    ) : (
                      <button
                        disabled={isBasketFull}
                        onClick={() => onAddChoice(subject)}
                        className={`py-1.5 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isBasketFull
                            ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                            : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isBasketFull ? 'Panier plein (3/3)' : `Sélectionner (${basketCount + 1}/3)`}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredSubjects.length === 0 && (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 max-w-md mx-auto">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">Aucun sujet trouvé</h3>
              <p className="text-xs text-slate-500 mt-1">
                Modifiez vos termes de recherche ou réinitialisez les filtres.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
