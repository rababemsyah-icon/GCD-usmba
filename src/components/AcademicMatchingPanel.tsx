import React, { useState } from 'react';
import {
  Sparkles,
  Award,
  CheckCircle2,
  TrendingUp,
  BookOpen,
  Calendar,
  Clock,
  MapPin,
  FileText,
  UserCheck,
  Percent,
} from 'lucide-react';
import { Subject, CandidateProfile, ApplicationBasket } from '../types';

interface AcademicMatchingPanelProps {
  candidateProfile: CandidateProfile;
  subjects: Subject[];
  currentApplication: ApplicationBasket | null;
  onScheduleInterview: (date: string, time: string, room: string) => void;
}

export const AcademicMatchingPanel: React.FC<AcademicMatchingPanelProps> = ({
  candidateProfile,
  subjects,
  currentApplication,
  onScheduleInterview,
}) => {
  const [scheduledDate, setScheduledDate] = useState('2026-11-05');
  const [scheduledTime, setScheduledTime] = useState('10:30');
  const [scheduledRoom, setScheduledRoom] = useState('Salle des Thèses 2, FST Fès (Hybride Teams)');
  const [isScheduled, setIsScheduled] = useState(
    Boolean(currentApplication?.interview?.scheduledDate)
  );

  // Evaluate matching for the 3 subjects in the basket or top subjects
  const basketSubjectIds = currentApplication?.choices.map((c) => c.subjectId) || ['subj-1', 'subj-2', 'subj-7'];
  const relevantSubjects = subjects.filter((s) => basketSubjectIds.includes(s.id));

  const masterAvg = candidateProfile.master.averageGrade;
  const mention = candidateProfile.master.mention;

  const handleConfirmSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    onScheduleInterview(scheduledDate, scheduledTime, scheduledRoom);
    setIsScheduled(true);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200">
              <Sparkles className="w-3.5 h-3.5 text-slate-600" />
              Évaluation du Dossier
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Adéquation & Score de Mérite
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Évaluation de la correspondance entre l'intitulé du Master et les prérequis des sujets de recherche.
            </p>
          </div>

          {/* Overall Global Score */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm text-center shrink-0 border border-slate-800">
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-emerald-400">{candidateProfile.meritScoreCalculated} / 100</div>
            <div className="text-xs font-medium text-slate-300 mt-1 uppercase tracking-wider">Score de Mérite</div>
          </div>
        </div>
      </div>

      {/* Official USMBA Formula Breakdown Card */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-800">
        <h3 className="text-base font-bold text-slate-200 uppercase tracking-wider text-xs mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          Barème de Calcul du Mérite
        </h3>
        <p className="text-xs text-slate-300 mb-6 leading-relaxed">
          Le barème officiel doctoral de l'Université Sidi Mohamed Ben Abdellah s'appuie sur quatre composantes objectives numérisées par OCR sans intervention humaine manuelle :
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700">
            <div className="text-slate-400 text-[11px]">1. Moyenne Master (50 pts)</div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
              {((masterAvg / 20) * 50).toFixed(2)} <span className="text-xs text-slate-400">/ 50</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Moyenne: {masterAvg}/20 (OCR certifié)</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700">
            <div className="text-slate-400 text-[11px]">2. Bonus Mention (15 pts)</div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
              15.00 <span className="text-xs text-slate-400">/ 15</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Mention « {mention} »</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700">
            <div className="text-slate-400 text-[11px]">3. Adéquation Filière (25 pts)</div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
              23.75 <span className="text-xs text-slate-400">/ 25</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Corrélation IA & Big Data : 95%</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700">
            <div className="text-slate-400 text-[11px]">4. Parcours Régulier (10 pts)</div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
              10.00 <span className="text-xs text-slate-400">/ 10</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Zéro redoublement (Bac+5 en 5 ans)</div>
          </div>
        </div>
      </div>

      {/* Comparison against the 3 choices */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-emerald-600" />
          Évaluation d'Adéquation sur vos 3 Choix de Thèse
        </h3>

        <div className="space-y-3">
          {relevantSubjects.map((subj, index) => {
            const ranks = ['1er Choix (Prioritaire)', '2ème Choix', '3ème Choix'];
            const matchPercentages = [96, 88, 91];
            const percent = matchPercentages[index] || 90;

            return (
              <div
                key={subj.id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                      {ranks[index]}
                    </span>
                    <span className="text-xs font-mono font-semibold text-slate-500">{subj.code}</span>
                    <span className="text-xs text-slate-500">• {subj.establishment}</span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1">{subj.title}</h4>
                  <div className="text-[11px] text-slate-600">
                    <span className="font-semibold text-slate-700">Encadrant :</span> {subj.professorName} ({subj.laboratory})
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="text-xs text-slate-500 font-medium">Compatibilité Diplôme</div>
                    <div className="text-base font-extrabold font-mono text-emerald-700 flex items-center justify-end gap-1">
                      <Percent className="w-3.5 h-3.5" /> {percent}%
                    </div>
                  </div>

                  <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
                    Adéquation Excellente
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Convocation Générée Automatique pour Entretien */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Convocation Individuelle à l'Entretien Oral</h3>
              <p className="text-[11px] text-slate-500">Planifiée automatiquement selon le rang de mérite</p>
            </div>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
            Commission Doctorale USMBA
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 text-xs text-blue-950 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-700" />
              <div>
                <span className="text-[10px] text-blue-700 block">Date de l'entretien</span>
                <span className="font-bold">{scheduledDate}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-700" />
              <div>
                <span className="text-[10px] text-blue-700 block">Heure de passage</span>
                <span className="font-bold">{scheduledTime} (Heure de Fès)</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-700" />
              <div>
                <span className="text-[10px] text-blue-700 block">Lieu / Salle</span>
                <span className="font-bold">{scheduledRoom}</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-blue-200 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <span className="text-blue-900">
              <strong>Membres du Jury :</strong> Pr. Mustapha Bennani (Rapporteur), Dr. Karim El Amrani (Chef Labo), Pr. Fatima Zahra Alami
            </span>
            <span className="text-emerald-700 font-bold bg-white px-2 py-0.5 rounded border border-emerald-200">
              Convocation Signée Numériquement
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
