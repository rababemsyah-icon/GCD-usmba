import React from 'react';
import { BookOpen } from 'lucide-react';
import { Subject, CandidateProfile, ApplicationBasket } from '../types';

interface AcademicMatchingPanelProps {
  candidateProfile: CandidateProfile;
  subjects: Subject[];
  currentApplication: ApplicationBasket | null;
  onScheduleInterview?: (date: string, time: string, room: string) => void;
}

export const AcademicMatchingPanel: React.FC<AcademicMatchingPanelProps> = ({
  candidateProfile,
  subjects,
  currentApplication,
}) => {
  const basketSubjectIds = currentApplication?.choices.map((c) => c.subjectId) || ['subj-1', 'subj-2', 'subj-7'];
  const relevantSubjects = subjects.filter((s) => basketSubjectIds.includes(s.id));

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Overview Card: Score Final Unique et Discret */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-slate-900">
        <div>
          <div className="text-xs text-slate-500 font-mono">
            CIN: {candidateProfile.cinNumber || 'CD689412'} • CNE: {candidateProfile.cneNumber || 'M134567890'}
          </div>
          <h3 className="text-base font-bold text-slate-900 mt-0.5">
            {candidateProfile.fullName || currentApplication?.candidateName || 'ALAOUI MDAGHRI Youssef'}
          </h3>
          <div className="text-xs text-slate-500 mt-0.5">
            {candidateProfile.master.title} (Moyenne : {candidateProfile.master.averageGrade}/20, Mention {candidateProfile.master.mention})
          </div>
        </div>

        {/* Discrete Final Score */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center shrink-0 self-start sm:self-auto">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Score de mérite
          </span>
          <span className="text-2xl font-bold font-mono text-slate-900">
            {candidateProfile.meritScoreCalculated || 88} <span className="text-xs text-slate-400">/ 100</span>
          </span>
        </div>
      </div>

      {/* Matching against targeted subjects */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3 text-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-600" />
            Adéquation thématique avec les sujets postulés
          </span>
          <span className="text-xs text-slate-400 font-mono">
            {relevantSubjects.length} sujet(s)
          </span>
        </div>

        <div className="space-y-2">
          {relevantSubjects.map((subj, index) => {
            const ranks = ['1er Choix', '2ème Choix', '3ème Choix'];
            const matchPercentages = [96, 88, 91];
            const percent = matchPercentages[index] || 90;

            return (
              <div
                key={subj.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded">
                      {ranks[index] || `Choix ${index + 1}`}
                    </span>
                    <span className="text-slate-500 font-mono text-[11px]">
                      {subj.code}
                    </span>
                  </div>
                  <h4 className="font-semibold text-slate-900 leading-snug truncate">
                    {subj.title}
                  </h4>
                  <div className="text-[11px] text-slate-500 truncate">
                    {subj.laboratory} • {subj.establishment}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <div className="text-right">
                    <span className="text-sm font-bold font-mono text-slate-900">
                      {percent}%
                    </span>
                    <div className="text-[10px] text-slate-400">Adéquation</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
