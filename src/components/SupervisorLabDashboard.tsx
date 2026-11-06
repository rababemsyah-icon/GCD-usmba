import React, { useState } from 'react';
import {
  UserCheck,
  ShieldCheck,
  Award,
  Calendar,
  Send,
  FileCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  ExternalLink,
  Lock,
  XCircle,
  FileText,
  UserPlus,
  Building,
  Check,
  AlertTriangle,
  Download,
  Printer,
} from 'lucide-react';
import {
  ApplicationBasket,
  Subject,
  ThesisExchangeMessage,
  UserRole,
  StatutConformite,
  CandidatureDocument,
} from '../types';

interface SupervisorLabDashboardProps {
  currentRole: UserRole;
  applications: ApplicationBasket[];
  allSubjects: Subject[];
  exchangeMessages: ThesisExchangeMessage[];
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
  onSendMessage: (msg: string, attachmentName?: string) => void;
  onOpenCharterModal: () => void;
  onRefreshApplications?: () => void;
}

export const SupervisorLabDashboard: React.FC<SupervisorLabDashboardProps> = ({
  currentRole,
  applications,
  allSubjects,
  exchangeMessages,
  onScoreInterview,
  onSignCharter,
  onSendMessage,
  onOpenCharterModal,
  onRefreshApplications,
}) => {
  const [selectedAppId, setSelectedAppId] = useState<string>(applications[0]?.id || '');

  // Interview state
  const [specialite, setSpecialite] = useState(17.5);
  const [motivation, setMotivation] = useState(18.0);
  const [projet, setProjet] = useState(18.5);
  const [langues, setLangues] = useState(16.5);
  const [juryNotes, setJuryNotes] = useState(
    'Candidat très brillant, maîtrise avancée des réseaux de neurones profonds. Recommandation unanime pour la Liste Principale.'
  );
  const [decision, setDecision] = useState('Admitted_Principal');

  // Co-supervisor state for Thesis Director
  const [assignCoSupervisor, setAssignCoSupervisor] = useState(true);
  const [coSupervisorName, setCoSupervisorName] = useState('Dr. Fatima Zahra Alami');
  const [coSupervisorSom, setCoSupervisorSom] = useState('914201');
  const [coSupervisorGrade, setCoSupervisorGrade] = useState('Professeur Habilité (PH)');
  const [coSupervisorEtab, setCoSupervisorEtab] = useState('ENSA Fès');

  // Document verification modal/state for Agent Pédagogique
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Pièce floue ou incomplète. Veuillez téléverser un scan net.');

  // Refusal prompt
  const [isRefusing, setIsRefusing] = useState(false);
  const [refusalReason, setRefusalReason] = useState('');

  // Exchange message
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [feedbackDoc, setFeedbackDoc] = useState('');

  // Feedback toast locally
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const showActionNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const activeApp = applications.find((a) => a.id === selectedAppId) || applications[0];
  const hasActiveCandidate = Boolean(activeApp);

  const assignedSubject =
    allSubjects.find((s) => s.id === activeApp?.assignedSubjectId) ||
    allSubjects.find((s) => s.id === activeApp?.choices[0]?.subjectId) ||
    allSubjects[0];

  // Role details mapping
  const roleConfig = {
    agent_pedagogique: {
      title: 'Espace Contrôle & Conformité Documentaire',
      actorName: 'Mme. Imane Bernoussi (Agent Pédagogique - Pôle Doctoral)',
      badge: 'Contrôle Administratif',
      color: 'bg-amber-50 text-amber-900 border-amber-200',
    },
    directeur: {
      title: 'Espace Direction de Thèse',
      actorName: 'Pr. Mustapha Bennani (Directeur de Thèse - FST Fès)',
      badge: 'Direction Scientifique',
      color: 'bg-indigo-50 text-indigo-900 border-indigo-200',
    },
    coencadrant: {
      title: 'Espace Co-Encadrement Doctoral',
      actorName: 'Dr. Fatima Zahra Alami (Co-Encadrant - ENSA Fès)',
      badge: 'Co-Direction',
      color: 'bg-sky-50 text-sky-900 border-sky-200',
    },
    chef_labo: {
      title: 'Espace Direction de Structure de Recherche',
      actorName: 'Dr. Karim El Amrani (Chef du Laboratoire LISER)',
      badge: 'Structure de Recherche',
      color: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    },
    admin_cedoc: {
      title: 'Espace Direction du Centre d’Études Doctorales (CEDoc ST)',
      actorName: 'Pr. Rachid El Ghoumari (Directeur du CEDoc Sciences & Technologies)',
      badge: 'Validation Finale & Attestation',
      color: 'bg-purple-50 text-purple-900 border-purple-200',
    },
    candidat: {
      title: 'Espace Candidat',
      actorName: 'Youssef Alaoui Mdaghri',
      badge: 'Doctorant',
      color: 'bg-slate-50 text-slate-900 border-slate-200',
    },
  }[currentRole] || {
    title: 'Espace Institutionnel GCD-USMBA',
    actorName: 'Pôle Doctoral',
    badge: 'Institutionnel',
    color: 'bg-slate-50 text-slate-900 border-slate-200',
  };

  // Signature state for current role
  const isSupervisor = currentRole === 'directeur';
  const isLabHead = currentRole === 'chef_labo';
  const isCedoc = currentRole === 'admin_cedoc';
  const isAgent = currentRole === 'agent_pedagogique';
  const isCoSupervisor = currentRole === 'coencadrant';

  const signatureState = isSupervisor
    ? activeApp?.signatures.directeur
    : isLabHead
    ? activeApp?.signatures.chef_labo
    : isCedoc
    ? activeApp?.signatures.directeur_ced
    : null;

  const isSignedByMe = signatureState?.status === 'Signed';

  // 1. Agent Pédagogique Document Verification Handlers
  const handleVerifyDocument = async (docId: string, conformite: StatutConformite, reason?: string) => {
    if (!activeApp) return;
    try {
      const res = await fetch(`/api/candidatures/${activeApp.id}/verify-doc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docId,
          conformite,
          rejectionReason: reason,
          verifiedBy: 'Mme. Imane Bernoussi',
        }),
      });
      const data = await res.json();
      if (data.application) {
        showActionNotice(
          conformite === 'CONFORME'
            ? 'Pièce validée CONFORME. Événement validerConformiteDoc() consigné.'
            : 'Pièce signalée NON CONFORME. NotificationAction envoyée au candidat.'
        );
        if (onRefreshApplications) onRefreshApplications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 2. Thesis Director Handlers (approuverSujet / refuserSujet)
  const handleApproveSubject = async () => {
    if (!activeApp) return;
    try {
      const coEncadrantData = assignCoSupervisor
        ? {
            cin: 'C219804',
            cne: '',
            nom: 'Alami',
            prenom: 'Fatima Zahra',
            email: 'fz.alami@usmba.ac.ma',
            telephone: '+212 535 60 70 80',
            som: coSupervisorSom,
            grade: coSupervisorGrade,
            specialite: 'Cybersécurité & Blockchain',
          }
        : undefined;

      const res = await fetch(`/api/candidatures/${activeApp.id}/approuver-sujet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coEncadrant: coEncadrantData }),
      });
      const data = await res.json();
      if (data.application) {
        showActionNotice('Sujet de thèse approuvé (approuverSujet). Transmission vers Directeur de Labo.');
        if (onRefreshApplications) onRefreshApplications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectSubject = async () => {
    if (!activeApp || !refusalReason) return;
    try {
      const res = await fetch(`/api/candidatures/${activeApp.id}/refuser-sujet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: refusalReason }),
      });
      const data = await res.json();
      if (data.application) {
        showActionNotice('Candidature rejetée (refuserSujet) et notifiée au candidat.');
        setIsRefusing(false);
        if (onRefreshApplications) onRefreshApplications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 3. Lab Director Handlers (validerRattachement / refuserRattachement)
  const handleValidateLabo = async () => {
    if (!activeApp) return;
    try {
      const res = await fetch(`/api/candidatures/${activeApp.id}/valider-rattachement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.application) {
        showActionNotice('Rattachement LISER validé (validerRattachement). Transmission vers CEDoc.');
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: refusalReason }),
      });
      const data = await res.json();
      if (data.application) {
        showActionNotice('Rattachement refusé (refuserRattachement).');
        setIsRefusing(false);
        if (onRefreshApplications) onRefreshApplications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 4. CEDoc Director Handler (validerInscriptionFinal)
  const handleValidateFinalCedoc = async () => {
    if (!activeApp) return;
    try {
      const res = await fetch(`/api/candidatures/${activeApp.id}/valider-inscription-final`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.application) {
        showActionNotice(
          `Inscription définitive actée ! Attestation délivrée : ${data.officialAttestationNumber}`
        );
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
    showActionNotice('Grille de notation et délibération enregistrées.');
  };

  const handlePostSupervisorFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMsg.trim() && !feedbackDoc) return;
    onSendMessage(feedbackMsg, feedbackDoc || undefined);
    setFeedbackMsg('');
    setFeedbackDoc('');
    showActionNotice('Message transmis au doctorant dans son carnet de thèse.');
  };

  return (
    <div className="space-y-6">
      {/* Action Notification Banner if any */}
      {actionNotice && (
        <div className="p-4 rounded-2xl bg-slate-900 text-white text-xs font-semibold flex items-center justify-between border border-slate-700 shadow-md animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{actionNotice}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${roleConfig.color}`}>
              {roleConfig.badge}
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            {roleConfig.title}
          </h2>
          <p className="text-xs text-slate-500">
            {roleConfig.actorName}
          </p>
        </div>

        {/* Current State Indicator */}
        <div className="shrink-0 p-3 rounded-xl bg-slate-900 text-white text-xs space-y-1 border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">
            Statut du Dossier
          </div>
          <div className="text-xs font-mono font-bold text-emerald-400">
            {activeApp ? activeApp.currentStatut || activeApp.status : 'Aucun'}
          </div>
        </div>
      </div>

      {!hasActiveCandidate ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm max-w-md mx-auto">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Aucune candidature en attente</h3>
          <p className="text-xs text-slate-500 mt-1">
            Les dossiers apparaissent dès qu'un candidat soumet son panier.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Action Column */}
          <div className="lg:col-span-7 space-y-6">
            {/* Candidate Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-sm">
                    YA
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{activeApp.candidateName}</h3>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 font-mono">
                      <span>CIN: {activeApp.candidateCin}</span>
                      <span>•</span>
                      <span>CNE: {activeApp.candidateCne}</span>
                    </div>
                  </div>
                </div>

                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Score Mérite : {activeApp.meritScore}/100
                </span>
              </div>

              {/* Subject targeted */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Sujet postulé (1er Choix)</span>
                <span className="font-bold text-slate-900 block">{assignedSubject?.title}</span>
                <span className="text-[11px] text-slate-600 block">
                  {assignedSubject?.laboratory} • {assignedSubject?.establishment}
                </span>
              </div>

              {/* ACTOR 1: AGENT PÉDAGOGIQUE -> Document Compliance Control */}
              {isAgent && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-amber-600" />
                      Vérification des Pièces Requises (validerConformiteDoc)
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      {activeApp.documents.filter((d) => d.conformite === 'CONFORME').length} / {activeApp.documents.length} conformes
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {activeApp.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5 max-w-sm">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{doc.title}</span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                doc.conformite === 'CONFORME'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : doc.conformite === 'REMPLACEMENT_REQUIS' || doc.conformite === 'NON_CONFORME'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {doc.conformite}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-500">
                            {doc.storagePath} • {doc.fileSize || '1.5 MB'}
                          </div>
                          {doc.rejectionReason && (
                            <div className="text-[11px] text-rose-600 font-medium">
                              Motif: {doc.rejectionReason}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleVerifyDocument(doc.id, 'CONFORME')}
                            className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-xs cursor-pointer transition-all"
                            title="Valider la conformité de ce document"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Conforme</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setRejectingDocId(doc.id);
                              handleVerifyDocument(doc.id, 'REMPLACEMENT_REQUIS', rejectionReason);
                            }}
                            className="py-1.5 px-3 bg-white hover:bg-rose-50 text-rose-700 font-bold text-xs rounded-xl border border-rose-300 flex items-center gap-1 cursor-pointer transition-all"
                            title="Signaler un défaut et exiger le remplacement de la pièce"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Remplacement requis</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 leading-relaxed">
                    <strong>Règle du Diagramme d'État :</strong> Dès que l'ensemble des pièces est validé CONFORME, la candidature bascule automatiquement vers l'état <code>EnAttenteValidationEncadrant</code>. Si une pièce est déclarée non conforme, le système transmet une <code>NotificationAction</code> au candidat vers l'état <code>ModificationRequise</code>.
                  </div>
                </div>
              )}

              {/* ACTOR 2: DIRECTEUR DE THÈSE -> Subject Approval, Co-supervisor & Decision */}
              {isSupervisor && (
                <div className="space-y-4 pt-2">
                  <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-indigo-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <UserPlus className="w-4 h-4 text-indigo-700" />
                        Rattachement d'un Co-Encadrant (Diagramme de Classes)
                      </h4>
                      <label className="flex items-center gap-1.5 text-xs text-indigo-900 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={assignCoSupervisor}
                          onChange={(e) => setAssignCoSupervisor(e.target.checked)}
                          className="rounded text-indigo-600"
                        />
                        <span>Activer co-encadrement</span>
                      </label>
                    </div>

                    {assignCoSupervisor && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                        <div>
                          <label className="block text-slate-700 font-semibold mb-0.5">Nom du Co-Encadrant :</label>
                          <input
                            type="text"
                            value={coSupervisorName}
                            onChange={(e) => setCoSupervisorName(e.target.value)}
                            className="w-full p-2 rounded-xl border border-indigo-200 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 font-semibold mb-0.5">Matricule SOM :</label>
                          <input
                            type="text"
                            value={coSupervisorSom}
                            onChange={(e) => setCoSupervisorSom(e.target.value)}
                            className="w-full p-2 rounded-xl border border-indigo-200 bg-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 font-semibold mb-0.5">Grade Universitaire :</label>
                          <input
                            type="text"
                            value={coSupervisorGrade}
                            onChange={(e) => setCoSupervisorGrade(e.target.value)}
                            className="w-full p-2 rounded-xl border border-indigo-200 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 font-semibold mb-0.5">Établissement :</label>
                          <input
                            type="text"
                            value={coSupervisorEtab}
                            onChange={(e) => setCoSupervisorEtab(e.target.value)}
                            className="w-full p-2 rounded-xl border border-indigo-200 bg-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions for Thesis Director: approuverSujet vs refuserSujet */}
                  <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Décision d'Encadrement du Sujet (Événements Diagramme)
                      </span>
                      <button
                        onClick={onOpenCharterModal}
                        className="text-xs text-slate-300 hover:text-white underline cursor-pointer flex items-center gap-1"
                      >
                        <span>Aperçu Charte</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <button
                        type="button"
                        onClick={handleApproveSubject}
                        className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
                      >
                        <Check className="w-4 h-4" />
                        <span>approuverSujet() → ValideEncadrant</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsRefusing(true)}
                        className="py-3 px-4 bg-slate-800 hover:bg-rose-900/60 text-slate-200 hover:text-white font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-2 cursor-pointer transition-all"
                      >
                        <XCircle className="w-4 h-4 text-rose-400" />
                        <span>refuserSujet() → Rejete</span>
                      </button>
                    </div>

                    {isRefusing && (
                      <div className="pt-2 space-y-2 border-t border-slate-700 animate-in fade-in">
                        <label className="block text-xs text-slate-300 font-semibold">
                          Motif officiel du refus (consigné dans le Journal d'Audit) :
                        </label>
                        <input
                          type="text"
                          value={refusalReason}
                          onChange={(e) => setRefusalReason(e.target.value)}
                          placeholder="Ex: Capacité d'encadrement atteinte sur cet axe thématique..."
                          className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-600 text-white text-xs"
                        />
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => setIsRefusing(false)}
                            className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-lg cursor-pointer"
                          >
                            Annuler
                          </button>
                          <button
                            type="button"
                            onClick={handleRejectSubject}
                            className="px-3 py-1.5 bg-rose-600 text-white font-bold text-xs rounded-lg cursor-pointer"
                          >
                            Confirmer Refus
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ACTOR 3: DIRECTEUR DE LABO -> Lab Attachment Validation */}
              {isLabHead && (
                <div className="space-y-4 pt-2">
                  <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-2">
                    <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-emerald-700" />
                      Rattachement à la Structure de Recherche : {activeApp.structureRecherche?.nom || 'LISER'}
                    </div>
                    <p className="text-slate-700 leading-relaxed">
                      L'approbation du sujet par Pr. Mustapha Bennani est confirmée. En tant que Directeur de Structure, votre validation de rattachement (budget, moyens d'expérimentation et insertion dans les axes du labo) est requise.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                      Arbitrage de la Structure de Recherche
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <button
                        type="button"
                        onClick={handleValidateLabo}
                        className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
                      >
                        <Check className="w-4 h-4" />
                        <span>validerRattachement() → ValideLabo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsRefusing(true)}
                        className="py-3 px-4 bg-slate-800 hover:bg-rose-900/60 text-slate-200 hover:text-white font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-2 cursor-pointer transition-all"
                      >
                        <XCircle className="w-4 h-4 text-rose-400" />
                        <span>refuserRattachement() → Rejete</span>
                      </button>
                    </div>

                    {isRefusing && (
                      <div className="pt-2 space-y-2 border-t border-slate-700 animate-in fade-in">
                        <label className="block text-xs text-slate-300 font-semibold">
                          Motif du refus de rattachement au laboratoire :
                        </label>
                        <input
                          type="text"
                          value={refusalReason}
                          onChange={(e) => setRefusalReason(e.target.value)}
                          placeholder="Ex: Quotas d'accueil au laboratoire atteints..."
                          className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-600 text-white text-xs"
                        />
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => setIsRefusing(false)}
                            className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-lg cursor-pointer"
                          >
                            Annuler
                          </button>
                          <button
                            type="button"
                            onClick={handleRejectLabo}
                            className="px-3 py-1.5 bg-rose-600 text-white font-bold text-xs rounded-lg cursor-pointer"
                          >
                            Confirmer Refus
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ACTOR 4: DIRECTEUR CEDOC -> Final Registration & Attestation */}
              {isCedoc && (
                <div className="space-y-4 pt-2">
                  <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 text-xs space-y-2">
                    <div className="font-bold text-purple-950 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-purple-700" />
                      Validation Finale & Inscription Définitive (CEDoc ST)
                    </div>
                    <p className="text-slate-700 leading-relaxed">
                      Toutes les étapes préalables sont franchies avec succès (Conformité documentaire, Approbation Directeur de Thèse, Validation Rattachement Laboratoire LISER). Votre validation finale scelle l'inscription doctorale définitive et émet l'attestation officielle.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Décision Institutionnelle Finale
                      </span>
                      <button
                        onClick={onOpenCharterModal}
                        className="text-xs text-slate-300 hover:text-white underline cursor-pointer flex items-center gap-1"
                      >
                        <span>Aperçu Charte & Signatures</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleValidateFinalCedoc}
                      className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>validerInscriptionFinal() → InscriptionDefinitive</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ACTOR 5: CO-ENCADRANT VIEW */}
              {isCoSupervisor && (
                <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 text-xs space-y-2">
                  <div className="font-bold text-sky-950 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-sky-700" />
                    Consultation Co-Direction de Thèse
                  </div>
                  <p className="text-slate-700 leading-relaxed">
                    Vous êtes rattaché(e) en tant que co-encadrant(e) aux côtés de Pr. Mustapha Bennani. Vous avez un accès direct au carnet d'échange pour soumettre des remarques et orienter le candidat sur la méthodologie de recherche.
                  </p>
                </div>
              )}
            </div>

            {/* Oral Interview Scoring Grid (available for jury members) */}
            {(isSupervisor || isLabHead) && (
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-600" />
                    Grille d'Évaluation & Délibération du Jury d'Entretien
                  </h3>
                  <span className="text-xs font-mono font-bold text-emerald-700">
                    Moyenne : {Math.round(((specialite + motivation + projet + langues) / 4) * 100) / 100} / 20
                  </span>
                </div>

                <form onSubmit={handleSaveInterviewScores} className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        1. Spécialité (/20)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.5"
                        value={specialite}
                        onChange={(e) => setSpecialite(Number(e.target.value))}
                        className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        2. Motivation (/20)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.5"
                        value={motivation}
                        onChange={(e) => setMotivation(Number(e.target.value))}
                        className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        3. Projet de recherche (/20)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.5"
                        value={projet}
                        onChange={(e) => setProjet(Number(e.target.value))}
                        className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        4. Langues & Communication (/20)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.5"
                        value={langues}
                        onChange={(e) => setLangues(Number(e.target.value))}
                        className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Remarques de synthèse du Jury :
                    </label>
                    <textarea
                      rows={2}
                      value={juryNotes}
                      onChange={(e) => setJuryNotes(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Décision officielle :
                    </label>
                    <select
                      value={decision}
                      onChange={(e) => setDecision(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
                    >
                      <option value="Admitted_Principal">Admis sur Liste Principale</option>
                      <option value="Admitted_Waiting">Admis sur Liste d'Attente</option>
                      <option value="Rejected">Non Admis / Refusé</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer transition-all shadow-sm"
                  >
                    Enregistrer la Délibération
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Right Column: Integrated Exchange Log (Zero USB / Zero Email) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Send className="w-4 h-4 text-emerald-600" />
                  Espace d'Échange & Carnet de Thèse
                </h3>
                <span className="text-[10px] text-slate-500 font-mono">
                  {exchangeMessages.length} entrées
                </span>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {exchangeMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3.5 rounded-2xl text-xs space-y-1.5 ${
                      msg.senderRole === 'Candidat'
                        ? 'bg-slate-50 border border-slate-200 ml-4'
                        : 'bg-emerald-50/50 border border-emerald-100 mr-4'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-900">{msg.senderName}</span>
                      <span className="text-slate-400 font-mono">
                        {new Date(msg.sentAt).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <p className="text-slate-700 leading-relaxed">{msg.message}</p>
                    {msg.attachmentName && (
                      <div className="p-2 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-[11px] font-mono">
                        <span className="truncate max-w-[180px]">{msg.attachmentName}</span>
                        <span className="text-slate-400">{msg.attachmentSize}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Message composer */}
              <form onSubmit={handlePostSupervisorFeedback} className="space-y-2 pt-2 border-t border-slate-100">
                <textarea
                  rows={2}
                  placeholder="Rédiger une consigne, remarque méthodologique..."
                  value={feedbackMsg}
                  onChange={(e) => setFeedbackMsg(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Pièce jointe (ex: Recommandations.pdf)"
                    value={feedbackDoc}
                    onChange={(e) => setFeedbackDoc(e.target.value)}
                    className="flex-1 p-2 rounded-xl border border-slate-200 text-xs font-mono"
                  />
                  <button
                    type="submit"
                    className="py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer transition-all"
                  >
                    Envoyer
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
