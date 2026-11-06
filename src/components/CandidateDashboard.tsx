import React, { useState } from 'react';
import {
  LayoutDashboard,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Award,
  ShieldCheck,
  Send,
  FileText,
  Download,
  AlertCircle,
  FileCheck,
  ArrowRight,
  ExternalLink,
  AlertTriangle,
  Upload,
  Printer,
  Sparkles,
  Building,
} from 'lucide-react';
import { ApplicationBasket, Subject, ThesisExchangeMessage } from '../types';

interface CandidateDashboardProps {
  application: ApplicationBasket | null;
  allSubjects: Subject[];
  exchangeMessages: ThesisExchangeMessage[];
  onSendMessage: (msg: string, attachmentName?: string) => void;
  onSignCharter: (role: string) => void;
  onOpenCharterModal: () => void;
  onRefreshApplication?: () => void;
}

export const CandidateDashboard: React.FC<CandidateDashboardProps> = ({
  application,
  allSubjects,
  exchangeMessages,
  onSendMessage,
  onSignCharter,
  onOpenCharterModal,
  onRefreshApplication,
}) => {
  const [newMsg, setNewMsg] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [resubmittingDocId, setResubmittingDocId] = useState<string | null>(null);
  const [resubmittedFileName, setResubmittedFileName] = useState('');
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);
  const [showAttestationModal, setShowAttestationModal] = useState(false);

  if (!application) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-lg mx-auto shadow-sm">
        <LayoutDashboard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">Aucune candidature active</h3>
        <p className="text-xs text-slate-500 mt-1">
          Veuillez remplir votre panier avec 3 sujets et valider pour ouvrir votre espace de suivi doctorant.
        </p>
      </div>
    );
  }

  const assignedSubject =
    allSubjects.find((s) => s.id === application.assignedSubjectId || s.id === application.choices[0]?.subjectId) ||
    allSubjects[0];

  const isCandidateSigned = application.signatures.candidat.status === 'Signed';
  const isDefinitive = application.currentStatut === 'INSCRIPTION_DEFINITIVE' || Boolean(application.officialAttestationNumber);
  const isModificationRequise =
    application.currentStatut === 'MODIFICATION_REQUISE' ||
    application.documents.some((d) => d.conformite === 'REMPLACEMENT_REQUIS' || d.conformite === 'NON_CONFORME');

  const flaggedDoc = application.documents.find(
    (d) => d.conformite === 'REMPLACEMENT_REQUIS' || d.conformite === 'NON_CONFORME'
  );

  const handlePostMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim() && !attachmentName) return;
    onSendMessage(newMsg, attachmentName || undefined);
    setNewMsg('');
    setAttachmentName('');
  };

  const handleResubmitPieces = async (docId: string) => {
    setIsResubmitting(true);
    try {
      const res = await fetch(`/api/candidatures/${application.id}/resubmit-doc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docId,
          fileName: resubmittedFileName || 'Piece_Resoumise_Conforme.pdf',
        }),
      });
      const data = await res.json();
      if (data.application) {
        setActionSuccessNotice('Pièce resoumise avec succès ! Dossier remis en vérification auprès de l’agent pédagogique.');
        setResubmittingDocId(null);
        setResubmittedFileName('');
        if (onRefreshApplication) onRefreshApplication();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsResubmitting(false);
    }
  };

  // State Transition Progression Mapping (diagramme d'état-transition)
  const stateStages = [
    {
      key: 'BROUILLON',
      label: '1. Dépôt & Panier',
      done: true,
      current: false,
    },
    {
      key: 'EN_ATTENTE_VERIFICATION',
      label: '2. Vérification Pièces',
      done: application.currentStatut !== 'BROUILLON_INCOMPLET' && application.currentStatut !== 'BROUILLON_COMPLET',
      current: application.currentStatut === 'EN_ATTENTE_VERIFICATION',
    },
    {
      key: 'EN_ATTENTE_VALIDATION_ENCADRANT',
      label: '3. Avis Encadrant',
      done:
        application.currentStatut === 'VALIDE_ENCADRANT' ||
        application.currentStatut === 'VALIDE_LABO' ||
        application.currentStatut === 'INSCRIPTION_DEFINITIVE',
      current: application.currentStatut === 'EN_ATTENTE_VALIDATION_ENCADRANT',
    },
    {
      key: 'VALIDE_ENCADRANT',
      label: '4. Rattachement Labo',
      done:
        application.currentStatut === 'VALIDE_LABO' ||
        application.currentStatut === 'INSCRIPTION_DEFINITIVE',
      current: application.currentStatut === 'VALIDE_ENCADRANT',
    },
    {
      key: 'VALIDE_LABO',
      label: '5. Inscription CEDoc',
      done: application.currentStatut === 'INSCRIPTION_DEFINITIVE',
      current: application.currentStatut === 'VALIDE_LABO',
    },
    {
      key: 'INSCRIPTION_DEFINITIVE',
      label: '6. Inscription Définitive',
      done: isDefinitive,
      current: isDefinitive,
    },
  ];

  return (
    <div className="space-y-6">
      {actionSuccessNotice && (
        <div className="p-4 rounded-2xl bg-emerald-900 text-white text-xs font-semibold flex items-center justify-between border border-emerald-700 shadow-md animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{actionSuccessNotice}</span>
          </div>
          <button
            onClick={() => setActionSuccessNotice(null)}
            className="text-emerald-300 hover:text-white cursor-pointer"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Top Status & Decision Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-700/60 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Code : {application.codeCandidature || application.id}
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-600 text-white flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Admis Liste Principale (Rang #1)
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-white">
              Félicitations {application.candidateName} !
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Votre candidature a été retenue sur votre 1er choix :{' '}
              <strong className="text-emerald-400">{assignedSubject?.title}</strong>.
            </p>

            <div className="pt-2 flex flex-wrap gap-4 text-xs text-slate-300">
              <div>Encadrant : <strong className="text-white">{assignedSubject?.professorName}</strong></div>
              <div>Laboratoire : <strong className="text-white">{assignedSubject?.laboratory}</strong></div>
              <div>CEDoc : <strong className="text-white">{assignedSubject?.cedoc}</strong></div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="shrink-0 flex flex-col gap-2">
            <button
              onClick={onOpenCharterModal}
              className="py-3 px-5 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Consulter la Charte des Thèses</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {!isCandidateSigned ? (
              <button
                onClick={() => onSignCharter('Candidat')}
                className="py-2.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Apposer ma Signature Numérique</span>
              </button>
            ) : (
              <div className="text-[11px] text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 rounded-xl px-3 py-1.5 text-center flex items-center justify-center gap-1.5 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Signé par le candidat (SHA-256)
              </div>
            )}

            {isDefinitive && (
              <button
                onClick={() => setShowAttestationModal(true)}
                className="py-2.5 px-5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Award className="w-4 h-4" />
                <span>Télécharger Attestation Officielle</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ALERT: Action Requise (ModificationRequise branch of State Transition Diagram) */}
      {isModificationRequise && flaggedDoc && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-3xl p-6 shadow-sm space-y-4 animate-in fade-in">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-rose-950">
                  Action Requise : Remplacement de Pièce ({flaggedDoc.title})
                </h3>
                <p className="text-xs text-rose-800 mt-0.5">
                  L'agent pédagogique a signalé une non-conformité : <strong className="font-semibold">{flaggedDoc.rejectionReason || 'Document illisible'}</strong>.
                </p>
              </div>
            </div>

            <span className="text-[11px] font-mono px-2.5 py-1 bg-rose-200 text-rose-900 rounded-full font-bold">
              Échéance : 4 jours
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-rose-200 space-y-3">
            <label className="block text-xs font-semibold text-slate-700">
              Sélectionnez le nouveau scan net du document :
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                placeholder="Nom du fichier (ex: Master_Scan_HauteDefinition.pdf)"
                value={resubmittedFileName}
                onChange={(e) => setResubmittedFileName(e.target.value)}
                className="flex-1 w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono"
              />
              <button
                type="button"
                disabled={isResubmitting}
                onClick={() => handleResubmitPieces(flaggedDoc.id)}
                className="w-full sm:w-auto py-2.5 px-5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                <span>{isResubmitting ? 'Envoi...' : 'resoumettrePieces()'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Conformément à la machine d'état, cette action renvoie immédiatement votre dossier vers l'état <code>EnCoursVerificationDoc</code>.
            </p>
          </div>
        </div>
      )}

      {/* Progress Timeline: État de Transition & Progression */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Étapes du dossier
          </h3>
          <span className="text-xs font-mono text-emerald-800 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            Statut actuel : {application.currentStatut}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {stateStages.map((stage, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-2xl border transition-all ${
                stage.current
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20 font-bold'
                  : stage.done
                  ? 'bg-slate-50 border-slate-200 text-slate-800'
                  : 'bg-white border-slate-100 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Étape {idx + 1}</span>
                {stage.done ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-slate-300" />
                )}
              </div>
              <div className="text-xs font-semibold leading-tight">{stage.label}</div>
              <div className="text-[10px] text-slate-500 font-mono mt-1">
                {stage.done ? 'Validé' : stage.current ? 'En cours' : 'En attente'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dossier Details & Documents List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Dossier Information & Documents */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              Pièces Justificatives Déposées & Conformité
            </h3>

            <div className="space-y-2.5">
              {application.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-900">{doc.title}</div>
                    <div className="text-[11px] font-mono text-slate-500">
                      {doc.storagePath} • {doc.fileSize || '1.8 MB'}
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                      doc.conformite === 'CONFORME'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : doc.conformite === 'REMPLACEMENT_REQUIS' || doc.conformite === 'NON_CONFORME'
                        ? 'bg-rose-100 text-rose-800 border-rose-200'
                        : 'bg-amber-100 text-amber-800 border-amber-200'
                    }`}
                  >
                    {doc.conformite}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Integrated Exchange Log */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-600" />
                Carnet de Thèse Numérique
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">
                {exchangeMessages.length} messages
              </span>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {exchangeMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3.5 rounded-2xl text-xs space-y-1.5 ${
                    msg.senderRole === 'Candidat'
                      ? 'bg-emerald-50/70 border border-emerald-200 ml-4'
                      : 'bg-slate-50 border border-slate-200 mr-4'
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
            <form onSubmit={handlePostMessage} className="space-y-2 pt-2 border-t border-slate-100">
              <textarea
                rows={2}
                placeholder="Rédiger un rapport, poser une question à l'encadrant..."
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Pièce jointe (ex: Manuscrit_v1.pdf)"
                  value={attachmentName}
                  onChange={(e) => setAttachmentName(e.target.value)}
                  className="flex-1 p-2 rounded-xl border border-slate-200 text-xs font-mono"
                />
                <button
                  type="submit"
                  className="py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer transition-all"
                >
                  Transmettre
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Official Registration Certificate Modal */}
      {showAttestationModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 border border-slate-200 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Royaume du Maroc • Université Sidi Mohamed Ben Abdellah
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  ATTESTATION OFFICIELLE D'INSCRIPTION DOCTORALE
                </h3>
              </div>
              <button
                onClick={() => setShowAttestationModal(false)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs cursor-pointer"
              >
                Fermer
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-slate-500">Réf. Attestation :</span>
                <span className="font-mono font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
                  {application.officialAttestationNumber || 'USMBA-DOC-ATT-2026-089'}
                </span>
              </div>

              <div className="space-y-1.5 text-slate-700 leading-relaxed">
                <p>
                  Le Directeur du Centre d'Études Doctorales (CEDoc Sciences et Technologies) de l'Université Sidi Mohamed Ben Abdellah de Fès atteste par la présente que le doctorant :
                </p>
                <div className="p-3 bg-white rounded-xl border border-slate-200 font-medium text-slate-900">
                  <div>Nom & Prénom : <strong>{application.candidateName}</strong></div>
                  <div>CIN : <strong>{application.candidateCin}</strong> | CNE : <strong>{application.candidateCne}</strong></div>
                  <div>Formation Doctorale : <strong>Sciences et Technologies de l’Ingénieur</strong></div>
                  <div>Structure de Recherche : <strong>Laboratoire LISER</strong></div>
                  <div>Directeur de Thèse : <strong>Pr. Mustapha Bennani</strong></div>
                </div>
                <p>
                  Est régulièrement inscrit au cycle doctoral au titre de l'année universitaire <strong>2026-2027</strong>.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <div>Fait à Fès, le {new Date().toLocaleDateString('fr-FR')}</div>
                <div className="text-emerald-700 font-semibold">Signature Électronique Certifiée CEDoc ST</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAttestationModal(false)}
                className="py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="py-2.5 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer l'Attestation</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
