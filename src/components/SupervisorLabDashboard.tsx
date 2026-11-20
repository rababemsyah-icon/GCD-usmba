import React, { useState } from 'react';
import {
  UserCheck,
  ShieldCheck,
  Award,
  Calendar,
  FileCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  XCircle,
  Building,
  Check,
  X,
  ChevronDown,
  UserPlus,
  Eye,
} from 'lucide-react';
import {
  ApplicationBasket,
  Subject,
  UserRole,
  StatutConformite,
  User,
} from '../types';
import { DossierPreviewModal } from './DossierPreviewModal';
import { savePersistedApplication } from '../utils/documentPersistence';

interface SupervisorLabDashboardProps {
  currentRole: UserRole;
  currentUser?: Partial<User> | null;
  applications: ApplicationBasket[];
  allSubjects: Subject[];
  onScoreInterview: (
    appId: string,
    scores: {
      specialite: number;
      motivation: number;
      projet: number;
      langues: number;
      juryNotes: string;
      decision: string;
    }
  ) => void;
  onSignCharter: (role: string) => void;
  onOpenCharterModal: () => void;
  onRefreshApplications?: () => void;
}

export const SupervisorLabDashboard: React.FC<SupervisorLabDashboardProps> = ({
  currentRole,
  currentUser,
  applications,
  allSubjects,
  onScoreInterview,
  onSignCharter,
  onOpenCharterModal,
  onRefreshApplications,
}) => {
  const authHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(currentUser?.id ? { 'x-user-id': currentUser.id } : {}),
    ...(currentUser?.role ? { 'x-user-role': currentUser.role } : {}),
  };
  const [selectedAppId, setSelectedAppId] = useState<string>(applications[0]?.id || '');

  // Interview deliberation & dossier preview modal states
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [specialite, setSpecialite] = useState(17.5);
  const [motivation, setMotivation] = useState(18.0);
  const [projet, setProjet] = useState(18.5);
  const [langues, setLangues] = useState(16.5);
  const [juryNotes, setJuryNotes] = useState(
    'Candidat très brillant, excellente maîtrise des fondamentaux. Recommandation unanime pour la Liste Principale.'
  );
  const [decision, setDecision] = useState('Admitted_Principal');

  // Co-supervisor state for Thesis Director (Checkbox collapsed by default)
  const [assignCoSupervisor, setAssignCoSupervisor] = useState(false);
  const [coSupervisorName, setCoSupervisorName] = useState('Dr. Fatima Zahra Alami');
  const [coSupervisorSom, setCoSupervisorSom] = useState('914201');
  const [coSupervisorGrade, setCoSupervisorGrade] = useState('Professeur Habilité (PH)');
  const [coSupervisorEtab, setCoSupervisorEtab] = useState('ENSA Fès');

  // Document verification modal/state for Agent Pédagogique
  const [rejectionReason, setRejectionReason] = useState('Pièce floue ou incomplète. Veuillez téléverser un scan net.');

  // Refusal & Modification prompts + Direct Avis state
  const [isRefusing, setIsRefusing] = useState(false);
  const [refusalReason, setRefusalReason] = useState('');
  const [directAvis, setDirectAvis] = useState<'FAVORABLE' | 'DEFAVORABLE' | 'COMPLEMENT'>('FAVORABLE');
  const [directAvisComment, setDirectAvisComment] = useState('');
  const [isSubmittingAvis, setIsSubmittingAvis] = useState(false);

  // Feedback toast locally
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const showActionNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const activeApp = applications.find((a) => a.id === selectedAppId) || applications[0];
  const hasActiveCandidate = Boolean(activeApp);

  const assignedSubject =
    allSubjects.find((s) => s.id === activeApp?.assignedSubjectId) ||
    allSubjects.find((s) => s.id === activeApp?.choices[0]?.subjectId) ||
    allSubjects[0];

  // Role details mapping
  const roleConfig: Record<UserRole, { title: string; actorName: string; badge: string }> = {
    visiteur: {
      title: 'Espace Public',
      actorName: 'Visiteur',
      badge: 'Public',
    },
    candidat: {
      title: 'Espace Candidat',
      actorName: 'Youssef Alaoui Mdaghri',
      badge: 'Doctorant',
    },
    agent_pedagogique: {
      title: 'Contrôle & Conformité Documentaire',
      actorName: 'Mme. Imane Bernoussi (Pôle Doctoral)',
      badge: 'Contrôle Administratif',
    },
    directeur: {
      title: 'Espace Direction de Thèse',
      actorName: 'Pr. Mustapha Bennani (FST Fès)',
      badge: 'Direction Scientifique',
    },
    coencadrant: {
      title: 'Co-Encadrement Doctoral',
      actorName: 'Dr. Fatima Zahra Alami (ENSA Fès)',
      badge: 'Co-Direction',
    },
    chef_labo: {
      title: 'Direction de Structure de Recherche',
      actorName: 'Dr. Karim El Amrani (Laboratoire LISER)',
      badge: 'Laboratoire',
    },
    admin_cedoc: {
      title: 'Direction du Centre d’Études Doctorales (CEDoc ST)',
      actorName: 'Pr. Rachid El Ghoumari (Directeur CEDoc ST)',
      badge: 'CEDoc',
    },
    administration: {
      title: 'Scolarité Centrale & Contrôle',
      actorName: 'Mme. Imane Bernoussi (Scolarité Centrale)',
      badge: 'Scolarité',
    },
    super_admin: {
      title: 'Super-Administration USMBA',
      actorName: 'Administrateur Système',
      badge: 'Système',
    },
  };

  const activeRoleConfig = roleConfig[currentRole] || roleConfig.directeur;

  const isSupervisor = currentRole === 'directeur';
  const isLabHead = currentRole === 'chef_labo';
  const isCedoc = currentRole === 'admin_cedoc';
  const isAgent = currentRole === 'agent_pedagogique';

  // Has passed admissibility / interview eligible
  const isEligibleForInterview =
    activeApp &&
    activeApp.currentStatut !== 'BROUILLON' &&
    activeApp.currentStatut !== 'EN_COMPLETION' &&
    activeApp.currentStatut !== 'REJETEE';

  // 1. Agent Pédagogique Document Verification Handlers
  const handleVerifyDocument = async (docId: string, conformite: StatutConformite, reason?: string) => {
    if (!activeApp) return;
    try {
      const res = await fetch(`/api/candidatures/${activeApp.id}/verify-doc`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          docId,
          conformite,
          rejectionReason: reason,
          verifiedBy: currentUser?.fullName || 'Mme. Imane Bernoussi',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showActionNotice(data.error || 'Action refusée par les règles de droits d’accès.');
      } else if (data.application) {
        await savePersistedApplication(data.application);
        showActionNotice(
          conformite === 'CONFORME'
            ? 'Pièce validée conforme.'
            : 'Complément de pièce demandé au candidat.'
        );
        if (onRefreshApplications) onRefreshApplications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const advanceToNextCandidate = (currentId: string) => {
    const list = applications;
    const currentIndex = list.findIndex((a) => a.id === currentId);
    if (currentIndex !== -1 && currentIndex + 1 < list.length) {
      setSelectedAppId(list[currentIndex + 1].id);
    } else if (list.length > 1) {
      const remaining = list.filter((a) => a.id !== currentId);
      if (remaining.length > 0) setSelectedAppId(remaining[0].id);
    }
  };

  // 2. Thesis Director Direct Avis Handler (Favorable / Défavorable / Demande de complément + optional comment)
  const handleSubmitDirectAvis = async (
    avisChoice: 'FAVORABLE' | 'DEFAVORABLE' | 'COMPLEMENT',
    commentText: string
  ) => {
    if (!activeApp) return;
    setIsSubmittingAvis(true);
    try {
      const coEncadrantData =
        assignCoSupervisor && avisChoice === 'FAVORABLE'
          ? {
              cin: 'C219804',
              cne: '',
              nom: 'Alami',
              prenom: 'Fatima Zahra',
              email: 'fz.alami@usmba.ac.ma',
              telephone: '+212 535 60 70 80',
              som: coSupervisorSom,
              grade: coSupervisorGrade,
              specialite: 'Cybersécurité & IA',
            }
          : undefined;

      const res = await fetch(`/api/candidatures/${activeApp.id}/avis-directeur`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          avis: avisChoice,
          commentaire: commentText,
          coEncadrant: coEncadrantData,
          actorName: currentUser?.fullName || 'Pr. Mustapha Bennani',
        }),
      });
      const data = await res.json();
      if (res.ok && data.application) {
        await savePersistedApplication(data.application);
        const label =
          avisChoice === 'FAVORABLE'
            ? 'Avis Favorable'
            : avisChoice === 'COMPLEMENT'
            ? 'Demande de complément'
            : 'Avis Défavorable';
        showActionNotice(`${label} enregistré pour ${activeApp.candidateName}. E-mail envoyé automatiquement.`);
        setDirectAvisComment('');
        advanceToNextCandidate(activeApp.id);
        if (onRefreshApplications) onRefreshApplications();
      } else if (!res.ok) {
        showActionNotice(data.error || 'Action non autorisée pour ce profil.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingAvis(false);
    }
  };

  const handleApproveSubject = async () => {
    await handleSubmitDirectAvis('FAVORABLE', directAvisComment);
  };

  // 3. Lab Director Handlers
  const handleValidateLabo = async () => {
    if (!activeApp) return;
    try {
      const res = await fetch(`/api/candidatures/${activeApp.id}/valider-rattachement`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        showActionNotice(data.error || 'Validation réservée à la Direction de structure.');
      } else if (data.application) {
        await savePersistedApplication(data.application);
        showActionNotice('Rattachement au laboratoire validé. Dossier transmis au CEDoc.');
        if (onRefreshApplications) onRefreshApplications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectLabo = async () => {
    if (!activeApp || !refusalReason) return;
    try {
      const res = await fetch(`/api/candidatures/${activeApp.id}/refuser-rattachement`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ reason: refusalReason }),
      });
      const data = await res.json();
      if (!res.ok) {
        showActionNotice(data.error || 'Action réservée à la Direction de structure.');
      } else if (data.application) {
        await savePersistedApplication(data.application);
        showActionNotice('Rattachement au laboratoire refusé.');
        setIsRefusing(false);
        if (onRefreshApplications) onRefreshApplications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 4. CEDoc Director Handler
  const handleValidateFinalCedoc = async () => {
    if (!activeApp) return;
    try {
      const res = await fetch(`/api/candidatures/${activeApp.id}/valider-inscription-final`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          actorName: currentUser?.fullName || 'Administration CEDoc',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showActionNotice(data.error || 'Action réservée à l’Administration CEDoc.');
      } else if (data.application) {
        await savePersistedApplication(data.application);
        showActionNotice(`Inscription définitive validée (INSCRIT_DEFINITIF). Attestation : ${data.officialAttestationNumber}`);
        if (onRefreshApplications) onRefreshApplications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveInterviewScores = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeApp) return;
    onScoreInterview(activeApp.id, {
      specialite,
      motivation,
      projet,
      langues,
      juryNotes,
      decision,
    });
    setShowInterviewModal(false);
    showActionNotice('Grille de délibération enregistrée avec succès.');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Toast Notice */}
      {actionNotice && (
        <div className="p-3.5 rounded-xl bg-slate-900 text-white text-xs font-semibold flex items-center justify-between border border-slate-700 shadow-md animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{actionNotice}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {!hasActiveCandidate ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-slate-700" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Aucune action requise</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Vous n'avez aucun dossier de candidature en attente de traitement.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* File de candidatures — Liste verticale structurée */}
          {applications.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
                <div className="text-xs font-bold text-slate-900">
                  File de candidatures ({applications.length})
                </div>
                <span className="text-[11px] text-slate-500">
                  Cliquez sur une ligne pour consulter et évaluer le dossier
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {applications.map((app, idx) => {
                  const isSelected = app.id === activeApp.id;
                  const scoreVal = app.meritScore ?? 85;
                  const isFinal =
                    app.currentStatut === 'INSCRIT_DEFINITIF' ||
                    app.currentStatut === 'INSCRIPTION_DEFINITIVE' ||
                    app.currentStatut === 'INSCRITE';
                  const isRejected =
                    app.currentStatut === 'REJETEE' || app.currentStatut === 'REFUSEE';
                  const statusBadgeClass = isFinal
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : isRejected
                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                    : app.currentStatut === 'VALIDE_LABO' || app.currentStatut === 'VALIDE_ENCADRANT'
                    ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200';

                  return (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => setSelectedAppId(app.id)}
                      className={`w-full text-left px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 text-white'
                          : 'bg-white hover:bg-slate-50 text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-6 h-6 rounded-full text-[11px] font-bold font-mono flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-white text-slate-900'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-xs sm:text-sm truncate">
                              {app.candidateName}
                            </span>
                            <span
                              className={`font-mono text-[11px] font-semibold px-2 py-0.5 rounded border ${
                                isSelected
                                  ? 'bg-white/10 text-slate-100 border-white/20'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {app.codeCandidature || app.id}
                            </span>
                          </div>
                          <div
                            className={`text-[11px] truncate mt-0.5 ${
                              isSelected ? 'text-slate-300' : 'text-slate-500'
                            }`}
                          >
                            {app.candidat?.etablissementOrigine || 'USMBA Fès'} • CIN :{' '}
                            {app.candidateCin || '-'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 pl-9 sm:pl-0">
                        <span
                          className={`font-mono text-xs font-bold px-2.5 py-1 rounded-lg border whitespace-nowrap ${
                            isSelected
                              ? 'bg-white/10 text-white border-white/20'
                              : 'bg-slate-50 text-slate-800 border-slate-200'
                          }`}
                        >
                          {scoreVal}/100
                        </span>

                        <span
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${
                            isSelected
                              ? 'bg-white text-slate-900 border-white'
                              : statusBadgeClass
                          }`}
                        >
                          {app.currentStatut}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 1: Vue Dossier Synthétique Global */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-5">
            {/* Header: Candidate ID & Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    {activeApp.codeCandidature || 'CAND-2026-089'}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {activeApp.currentStatut}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">{activeApp.candidateName}</h3>
                <div className="text-xs text-slate-500 flex items-center gap-2 font-mono mt-0.5">
                  <span>CIN: {activeApp.candidateCin}</span>
                  <span>•</span>
                  <span>CNE: {activeApp.candidateCne}</span>
                  <span>•</span>
                  <span>{activeApp.candidat?.etablissementOrigine || 'FST Fès'}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Voir le dossier & pièces</span>
                </button>

                {isEligibleForInterview && (isSupervisor || isLabHead) && (
                  <>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/applications/${activeApp.id}/interview`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              scheduledDate: '2026-09-23',
                              scheduledTime: '10:00',
                              room: 'Salle des Thèses 2, FST Fès',
                            }),
                          });
                          if (res.ok) {
                            showActionNotice(`Convocation envoyée par e-mail à ${activeApp.candidateName}.`);
                            if (onRefreshApplications) onRefreshApplications();
                          }
                        } catch (e) {
                          console.error(e);
                        }
                      }}
                      className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold border border-slate-300 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Calendar className="w-3.5 h-3.5 text-slate-600" />
                      <span>Convoquer oral</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowInterviewModal(true)}
                      className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold border border-slate-300 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Award className="w-4 h-4 text-slate-600" />
                      <span>Délibération entretien oral</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Vue Dossier Synthétique Global: 2 Highlight Blocks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Block 1: État Global de Conformité */}
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-2">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Dossier Complet — 6/6 pièces conformes par le système OCR</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Toutes les pièces (CIN, Baccalauréat, Licence, Master, Relevés de notes, Projet) ont été vérifiées et validées conformes au format PDF.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['CIN', 'Baccalauréat', 'Licence', 'Master', 'Relevés S1-S4', 'Projet'].map((item) => (
                    <span
                      key={item}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/80 border border-emerald-200 text-emerald-800"
                    >
                      ✓ {item}
                    </span>
                  ))}
                </div>
              </div>

              {/* Block 2: Score de Mérite Calculé Automatiquement */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Score de Mérite Calculé Automatiquement
                  </span>
                  <span className="text-xl font-bold font-mono text-slate-900">
                    {activeApp.meritScore || 88.75} <span className="text-xs text-slate-400">/ 100</span>
                  </span>
                </div>
                <div className="text-xs text-slate-700 space-y-1">
                  <div>
                    <strong>Moyenne Master :</strong>{' '}
                    <span className="font-mono font-semibold text-slate-900">
                      {activeApp.candidat?.moyenneGenerale ? `${activeApp.candidat.moyenneGenerale}/20` : '16.51/20'}
                    </span>{' '}
                    (Mention Très Bien)
                  </div>
                  <div>
                    <strong>Adéquation thématique :</strong>{' '}
                    <span className="font-mono font-semibold text-slate-900">
                      {activeApp.matchingScore || 95}%
                    </span>{' '}
                    avec le laboratoire
                  </div>
                </div>
              </div>
            </div>

            {/* Target Subject Details */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Sujet postulé</span>
              <div className="font-bold text-slate-900 text-sm leading-snug">{assignedSubject?.title}</div>
              <div className="text-slate-500 text-[11px] pt-0.5">
                {assignedSubject?.laboratory} • {assignedSubject?.establishment} • Direction : {assignedSubject?.professorName}
              </div>
            </div>

            {/* ACTOR: DIRECTEUR DE THÈSE -> Co-supervisor Option & Unified Direct Actions Block */}
            {isSupervisor && (
              <div className="space-y-4 pt-2 border-t border-slate-100">
                {/* Optional Co-supervisor Toggle */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <label className="flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assignCoSupervisor}
                      onChange={(e) => setAssignCoSupervisor(e.target.checked)}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                    />
                    <span>Désigner un co-encadrant doctoral (optionnel)</span>
                  </label>

                  {assignCoSupervisor && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 animate-in fade-in duration-150">
                      <div>
                        <label className="block text-slate-500 text-[11px] mb-1">Nom du co-encadrant :</label>
                        <input
                          type="text"
                          value={coSupervisorName}
                          onChange={(e) => setCoSupervisorName(e.target.value)}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 text-[11px] mb-1">Matricule SOM :</label>
                        <input
                          type="text"
                          value={coSupervisorSom}
                          onChange={(e) => setCoSupervisorSom(e.target.value)}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 text-[11px] mb-1">Grade universitaire :</label>
                        <input
                          type="text"
                          value={coSupervisorGrade}
                          onChange={(e) => setCoSupervisorGrade(e.target.value)}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 text-[11px] mb-1">Établissement :</label>
                        <input
                          type="text"
                          value={coSupervisorEtab}
                          onChange={(e) => setCoSupervisorEtab(e.target.value)}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Bloc d'Évaluation Direct : Avis (Favorable / Défavorable / Demande de complément) + Commentaire optionnel */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Évaluation directe — Avis du Directeur de Thèse :
                    </span>
                    {activeApp.avisDirecteur && (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                        Avis actuel : {activeApp.avisDirecteur.avis}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setDirectAvis('FAVORABLE')}
                      className={`py-2.5 px-4 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all border ${
                        directAvis === 'FAVORABLE'
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                      <span>Avis Favorable</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDirectAvis('COMPLEMENT')}
                      className={`py-2.5 px-4 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all border ${
                        directAvis === 'COMPLEMENT'
                          ? 'bg-amber-700 text-white border-amber-700 shadow-xs'
                          : 'bg-white text-amber-800 border-amber-300 hover:bg-amber-50'
                      }`}
                    >
                      <Clock className="w-4 h-4" />
                      <span>Demande de complément</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDirectAvis('DEFAVORABLE')}
                      className={`py-2.5 px-4 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all border ${
                        directAvis === 'DEFAVORABLE'
                          ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
                          : 'bg-white text-rose-700 border-rose-300 hover:bg-rose-50'
                      }`}
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Avis Défavorable</span>
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Commentaire / Observations (optionnel) :
                    </label>
                    <textarea
                      rows={2}
                      value={directAvisComment}
                      onChange={(e) => setDirectAvisComment(e.target.value)}
                      placeholder="Ajouter un commentaire optionnel (précisions méthodologiques, remarques sur le dossier...)"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>

                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      disabled={isSubmittingAvis}
                      onClick={() => handleSubmitDirectAvis(directAvis, directAvisComment)}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors shadow-xs disabled:opacity-50"
                    >
                      {isSubmittingAvis ? 'Enregistrement...' : 'Enregistrer la décision'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ACTOR: DIRECTEUR DE LABO -> Laboratory Attachment */}
            {isLabHead && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-slate-600" />
                    Rattachement au laboratoire : {activeApp.structureRecherche?.nom || 'LISER'}
                  </div>
                  <p className="text-slate-500 leading-relaxed">
                    Sujet approuvé par le directeur de thèse. Votre validation de rattachement au laboratoire est requise.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleValidateLabo}
                    className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
                  >
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Valider le rattachement</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsRefusing(true)}
                    className="py-2.5 px-4 bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-800 border border-rose-200 font-semibold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <XCircle className="w-4 h-4 text-rose-500" />
                    <span>Refuser</span>
                  </button>
                </div>

                {isRefusing && (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 animate-in fade-in duration-150">
                    <label className="block text-xs text-slate-700 font-semibold">
                      Motif du refus de rattachement :
                    </label>
                    <input
                      type="text"
                      value={refusalReason}
                      onChange={(e) => setRefusalReason(e.target.value)}
                      placeholder="Indiquez le motif..."
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setIsRefusing(false)}
                        className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={handleRejectLabo}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-lg cursor-pointer transition-colors"
                      >
                        Confirmer le refus
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ACTOR: DIRECTEUR CEDOC -> Final Registration */}
            {isCedoc && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-slate-700" />
                    Inscription définitive au CEDoc Sciences & Technologies
                  </div>
                  <p className="text-slate-500 leading-relaxed">
                    Toutes les approbations préalables (conformité, encadrant, laboratoire) ont été recueillies.
                  </p>
                </div>

                {['INSCRIT_DEFINITIF', 'INSCRIPTION_DEFINITIVE', 'INSCRITE'].includes(
                  activeApp.currentStatut
                ) ? (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Inscription définitive validée (INSCRIT_DEFINITIF)</span>
                    </div>
                    {activeApp.officialAttestationNumber && (
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-white border border-emerald-200 text-emerald-800">
                        {activeApp.officialAttestationNumber}
                      </span>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleValidateFinalCedoc}
                    className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
                  >
                    <Award className="w-4 h-4 text-emerald-200" />
                    <span>Valider l'inscription définitive &amp; Générer l'attestation</span>
                  </button>
                )}
              </div>
            )}

            {/* ACTOR: AGENT PÉDAGOGIQUE -> Document Compliance Control */}
            {isAgent && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900">Pièces justificatives du dossier</span>
                  <span className="text-slate-500">
                    {activeApp.documents.filter((d) => d.conformite === 'CONFORME').length} / {activeApp.documents.length} conformes
                  </span>
                </div>

                <div className="space-y-2">
                  {activeApp.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <span>{doc.title}</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                              doc.conformite === 'CONFORME'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {doc.conformite}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {doc.storagePath}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleVerifyDocument(doc.id, 'CONFORME')}
                          className="py-1 px-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Conforme</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleVerifyDocument(doc.id, 'COMPLEMENT_DEMANDE', rejectionReason)}
                          className="py-1 px-2.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>À compléter</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Grille d'Évaluation & Délibération du Jury d'Entretien (Masquée par défaut) */}
      {showInterviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Grille d'Évaluation & Délibération du Jury
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Candidat : {activeApp?.candidateName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowInterviewModal(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveInterviewScores} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Spécialité (/20) :
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={specialite}
                    onChange={(e) => setSpecialite(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Motivation (/20) :
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={motivation}
                    onChange={(e) => setMotivation(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Projet de recherche (/20) :
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={projet}
                    onChange={(e) => setProjet(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Langues & Com. (/20) :
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={langues}
                    onChange={(e) => setLangues(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Remarques du jury :
                </label>
                <textarea
                  rows={2}
                  value={juryNotes}
                  onChange={(e) => setJuryNotes(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Décision officielle :
                </label>
                <select
                  value={decision}
                  onChange={(e) => setDecision(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs"
                >
                  <option value="Admitted_Principal">Admis sur Liste Principale</option>
                  <option value="Admitted_Waiting">Admis sur Liste d'Attente</option>
                  <option value="Rejected">Non Admis / Refusé</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowInterviewModal(false)}
                  className="px-3.5 py-2 text-slate-600 hover:text-slate-900 text-xs cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl cursor-pointer transition-colors"
                >
                  Enregistrer la délibération
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: Aperçu du dossier & spécimens des pièces + Avis direct */}
      <DossierPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        application={activeApp || null}
        subject={assignedSubject}
        mode={isLabHead ? 'lab' : 'supervisor'}
        onApproveGlobal={isLabHead ? handleValidateLabo : handleApproveSubject}
        onSubmitSupervisorAvis={!isLabHead ? handleSubmitDirectAvis : undefined}
        onRejectGlobal={
          isLabHead
            ? async (reason) => {
                if (!activeApp) return;
                const res = await fetch(`/api/candidatures/${activeApp.id}/refuser-rattachement`, {
                  method: 'POST',
                  headers: authHeaders,
                  body: JSON.stringify({ reason }),
                });
                const data = await res.json();
                if (res.ok) {
                  if (data.application) {
                    await savePersistedApplication(data.application);
                  }
                  showActionNotice(`Rattachement refusé. Notification e-mail envoyée à ${activeApp.candidateName}.`);
                  advanceToNextCandidate(activeApp.id);
                  if (onRefreshApplications) onRefreshApplications();
                }
              }
            : undefined
        }
        onSaveInterview={async (appId, scores) => {
          await onScoreInterview(appId, scores);
          showActionNotice('Délibération enregistrée et résultat notifié par e-mail.');
          if (onRefreshApplications) onRefreshApplications();
        }}
      />
    </div>
  );
};
