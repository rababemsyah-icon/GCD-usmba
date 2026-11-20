import React, { useState } from 'react';
import {
  CheckCircle2,
  Calendar,
  Clock,
  Award,
  Upload,
  Printer,
  XCircle,
  X,
  ChevronRight,
  FileCheck,
  AlertCircle,
  PlusCircle,
  Trash2,
  Download,
} from 'lucide-react';
import { ApplicationBasket, Subject, User, CampaignRules } from '../types';
import { DOCUMENT_RULES } from '../data/mockDatabase';
import {
  formatFileSize,
  markPersistedDocumentRemoved,
  savePersistedDocument,
} from '../utils/documentPersistence';

interface CandidateDashboardProps {
  application: ApplicationBasket | null;
  allSubjects: Subject[];
  currentUser?: Partial<User> | null;
  activeCampaign?: CampaignRules;
  onSignCharter: (role: string) => void;
  onOpenCharterModal: () => void;
  onRefreshApplication?: () => void;
  onCreateProvisional?: (nom: string, etablissement: string) => void;
}

export const CandidateDashboard: React.FC<CandidateDashboardProps> = ({
  application,
  allSubjects,
  currentUser,
  activeCampaign,
  onSignCharter,
  onOpenCharterModal,
  onRefreshApplication,
  onCreateProvisional,
}) => {
  const maxPdfSizeMB = activeCampaign?.maxPdfSizeMB || 5;
  const authHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(currentUser?.id ? { 'x-user-id': currentUser.id } : {}),
    ...(currentUser?.role ? { 'x-user-role': currentUser.role } : {}),
  };
  const [showAttestationModal, setShowAttestationModal] = useState(false);
  const [showLifecycleModal, setShowLifecycleModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showProvisionalModal, setShowProvisionalModal] = useState(false);

  // Provisional emergency form (Nom + Établissement)
  const [provNom, setProvNom] = useState('');
  const [provEtab, setProvEtab] = useState('FST Fès');

  // File Upload State with Strict PDF & 5MB Verification
  const [uploadDocType, setUploadDocType] = useState<string>('DIPLOME_MASTER');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isVerifyingFile, setIsVerifyingFile] = useState(false);

  const handleCreateProvisionalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!provNom.trim() || !provEtab.trim()) return;
    if (onCreateProvisional) {
      onCreateProvisional(provNom.trim(), provEtab.trim());
    }
    setShowProvisionalModal(false);
  };

  if (!application) {
    return (
      <div className="bg-white rounded-2xl p-8 sm:p-10 text-center border border-slate-200 max-w-lg mx-auto shadow-xs space-y-4">
        <p className="text-sm font-semibold text-slate-800">Aucun dossier actif pour le moment</p>
        <p className="text-xs text-slate-500 leading-relaxed">
          Recherchez un sujet dans le catalogue et cliquez sur « Consulter » puis « Candidater », ou effectuez un enregistrement d'urgence si vos scans ne sont pas prêts.
        </p>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowProvisionalModal(true)}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Enregistrement provisoire (Nom + Établissement)</span>
          </button>
        </div>

        {/* Provisional Modal */}
        {showProvisionalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm">
                  Mode Saisie d'Urgence (Dossier incomplet)
                </h3>
                <button
                  onClick={() => setShowProvisionalModal(false)}
                  className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateProvisionalSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Nom de famille du candidat :
                  </label>
                  <input
                    type="text"
                    required
                    value={provNom}
                    onChange={(e) => setProvNom(e.target.value)}
                    placeholder="Ex: Alaoui"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Établissement d'origine :
                  </label>
                  <select
                    value={provEtab}
                    onChange={(e) => setProvEtab(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  >
                    <option value="FST Fès">Faculté des Sciences et Techniques (FST Fès)</option>
                    <option value="ENSA Fès">École Nationale des Sciences Appliquées (ENSA Fès)</option>
                    <option value="FS Dhar El Mahraz">Faculté des Sciences Dhar El Mahraz (FSDM)</option>
                    <option value="FLSH Dhar El Mahraz">Faculté des Lettres et Sciences Humaines (FLSH)</option>
                    <option value="Autre Établissement Marocain">Autre Établissement Marocain</option>
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
                  <strong>Indicateur :</strong> Le dossier sera enregistré avec le statut officiel <strong>« Dossier en attente de pièces »</strong>.
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowProvisionalModal(false)}
                    className="px-3.5 py-2 text-slate-600 hover:text-slate-900 text-xs cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl cursor-pointer"
                  >
                    Enregistrer en attente
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  const assignedSubject =
    allSubjects.find((s) => s.id === application.assignedSubjectId || s.id === application.choices[0]?.subjectId) ||
    allSubjects[0];

  const isFinalInscrit =
    application.currentStatut === 'INSCRIT_DEFINITIF' ||
    application.currentStatut === 'INSCRIPTION_DEFINITIVE' ||
    application.currentStatut === 'INSCRITE';
  const isInscrite = isFinalInscrit || Boolean(application.officialAttestationNumber);
  const isEnAttentePieces =
    !isInscrite &&
    (application.currentStatut === 'EN_ATTENTE_PIECES' ||
      application.currentStatut === 'EN_COMPLETION' ||
      application.documents.filter((d) => d.conformite === 'CONFORME').length === 0);

  const handleDownloadAttestation = () => {
    const refNumber = application.officialAttestationNumber || 'USMBA-DOC-ATT-2026-089';
    const safeCode = (application.codeCandidature || refNumber).replace(/[^a-zA-Z0-9_-]/g, '_');
    const dateStr = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Attestation d'inscription définitive - ${refNumber}</title>
  <style>
    body { font-family: Georgia, "Times New Roman", serif; color: #0f172a; margin: 0; padding: 36px; background: #f8fafc; }
    .sheet { max-width: 760px; margin: 0 auto; background: #ffffff; border: 2px solid #0f172a; padding: 40px 44px; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 18px; margin-bottom: 24px; }
    .uni { font-size: 13px; text-transform: uppercase; letter-spacing: 1.4px; font-weight: bold; color: #334155; }
    .cedoc { font-size: 15px; font-weight: bold; margin-top: 4px; color: #0f172a; }
    .title { font-size: 22px; font-weight: bold; text-transform: uppercase; margin-top: 16px; letter-spacing: 0.8px; }
    .meta { display: flex; justify-content: space-between; font-family: monospace; font-size: 12px; background: #f1f5f9; padding: 10px 14px; border: 1px solid #cbd5e1; margin-bottom: 24px; }
    .section { margin-bottom: 18px; line-height: 1.65; font-size: 14px; }
    .box { border: 1px solid #cbd5e1; background: #f8fafc; padding: 16px 20px; margin: 18px 0; }
    .row { margin-bottom: 8px; }
    .label { font-weight: bold; color: #334155; }
    .badge { display: inline-block; padding: 4px 10px; border: 1px solid #059669; color: #065f46; background: #ecfdf5; font-family: sans-serif; font-size: 11px; font-weight: bold; text-transform: uppercase; }
    .signatures { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; }
    .sig-box { width: 45%; text-align: center; }
    .sig-stamp { margin-top: 12px; padding: 8px; border: 1px dashed #059669; color: #065f46; font-family: monospace; font-size: 11px; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div class="uni">Royaume du Maroc — Université Sidi Mohamed Ben Abdellah (USMBA) — Fès</div>
      <div class="cedoc">Centre d'Études Doctorales Sciences et Technologies (CEDoc ST)</div>
      <div class="title">Attestation d'Inscription Définitive en Doctorat</div>
    </div>

    <div class="meta">
      <span>RÉFÉRENCE : ${refNumber}</span>
      <span>ANNÉE UNIVERSITAIRE : 2026/2027</span>
    </div>

    <div class="section">
      Le Directeur du Centre d'Études Doctorales de l'Université Sidi Mohamed Ben Abdellah de Fès certifie que le/la doctorant(e) ci-dessous est régulièrement inscrit(e) de manière définitive au cycle doctoral :
    </div>

    <div class="box">
      <div class="row"><span class="label">Nom et Prénom :</span> ${application.candidateName}</div>
      <div class="row"><span class="label">CIN :</span> ${application.candidateCin || '-'} &nbsp;&nbsp;|&nbsp;&nbsp; <span class="label">CNE :</span> ${application.candidateCne || '-'}</div>
      <div class="row"><span class="label">Code de candidature :</span> ${application.codeCandidature}</div>
      <div class="row"><span class="label">Statut officiel :</span> <span class="badge">INSCRIT_DEFINITIF — VALIDÉ</span></div>
      <div class="row" style="margin-top:12px;"><span class="label">Sujet de thèse agréé :</span> ${assignedSubject?.title || 'Sujet doctoral validé'}</div>
      <div class="row"><span class="label">Structure de recherche :</span> ${assignedSubject?.laboratory || application.structureRecherche?.nom || 'Laboratoire USMBA'} (${assignedSubject?.establishment || 'USMBA Fès'})</div>
      <div class="row"><span class="label">Directeur de thèse :</span> ${assignedSubject?.professorName || 'Encadrant USMBA'}</div>
    </div>

    <div class="section">
      La présente attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.
      <br />Fait à Fès, le ${dateStr}.
    </div>

    <div class="signatures">
      <div class="sig-box">
        <strong>Direction de la Structure de Recherche</strong>
        <div class="sig-stamp">Rattachement Laboratoire Validé<br />Visa électronique certifié</div>
      </div>
      <div class="sig-box">
        <strong>Administration &amp; Direction du CEDoc ST</strong>
        <div class="sig-stamp">Inscription Définitive Validée<br />Réf. ${refNumber}</div>
      </div>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Attestation_Inscription_Definitive_${safeCode}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Strict File Upload Validation Handler (Enforces PDF only & Max 5 Mo)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetDocType?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadSuccess(null);
    setIsVerifyingFile(true);

    const docTypeToUse = targetDocType || uploadDocType;

    const extMatch = file.name.match(/\.([a-zA-Z0-9]+)$/);
    const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : '';

    // 0. Check active campaign open status
    if (activeCampaign && !activeCampaign.isOpen) {
      setUploadError(`Campagne clôturée : le dépôt de pièces est fermé pour "${activeCampaign.label}".`);
      setIsVerifyingFile(false);
      e.target.value = '';
      return;
    }

    // 1. Strict PDF-Only Rule Check
    if (ext !== '.pdf') {
      setUploadError(
        `Format non conforme : seuls les documents au format PDF sont autorisés. Les fichiers images (${ext || 'format non reconnu'}, JPG, PNG, Pinterest...) sont immédiatement rejetés.`
      );
      setIsVerifyingFile(false);
      e.target.value = '';
      return;
    }

    // 2. Strict Dynamic Campaign PDF Size Check
    const maxBytes = maxPdfSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setUploadError(
        `Taille de fichier dépassée : ${sizeMB} Mo détectés. La taille limite de la campagne active est de ${maxPdfSizeMB}.0 Mo.`
      );
      setIsVerifyingFile(false);
      e.target.value = '';
      return;
    }

    // 3. Rejection of web/Pinterest/landscape keywords in filename
    const lowerName = file.name.toLowerCase();
    const forbiddenPatterns = ['pinterest', 'wallpaper', 'paysage', 'landscape', 'meme', 'vacances', 'nature', 'sunset'];
    if (forbiddenPatterns.some((pat) => lowerName.includes(pat))) {
      setUploadError(
        `Document rejeté : fichier non académique détecté (${file.name}). Fournissez une numérisation PDF officielle.`
      );
      setIsVerifyingFile(false);
      e.target.value = '';
      return;
    }

    // 4. Read real PDF binary & Server-Side Validation through /api/documents/validate
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Impossible de lire le fichier PDF sélectionné.'));
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/documents/validate', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          docType: docTypeToUse,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'application/pdf',
          base64Data,
          applicationId: application?.id,
          candidateName: application?.candidateName,
          candidateEmail: application?.candidateEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.valid === false) {
        setUploadError(data.error || 'Fichier rejeté : non conforme aux exigences du cycle doctoral.');
      } else {
        const matchedDoc = application?.documents.find((d) => d.docType === docTypeToUse);
        await savePersistedDocument({
          candidateId: application?.candidateId,
          candidateEmail: application?.candidateEmail,
          candidateName: application?.candidateName,
          applicationId: application?.id,
          docType: docTypeToUse,
          title: matchedDoc?.title || DOCUMENT_RULES[docTypeToUse]?.label || docTypeToUse,
          fileName: file.name,
          fileSize: formatFileSize(file.size),
          fileSizeBytes: file.size,
          mimeType: file.type || 'application/pdf',
          dataUrl: base64Data,
          conformite: 'CONFORME',
          uploadedAt: new Date().toISOString(),
          isCameraScan: false,
        });

        setUploadSuccess(`✓ Fichier PDF "${file.name}" validé conforme et enregistré dans le dossier.`);
        if (onRefreshApplication) onRefreshApplication();
      }
    } catch (err: any) {
      setUploadError(`Erreur lors du contrôle : ${err.message}`);
    } finally {
      setIsVerifyingFile(false);
      e.target.value = '';
    }
  };

  const handleRemoveDoc = async (docType: string) => {
    try {
      await markPersistedDocumentRemoved({
        candidateId: application?.candidateId,
        candidateEmail: application?.candidateEmail,
        applicationId: application?.id,
        docType,
      });

      await fetch('/api/documents/remove', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          docType,
          applicationId: application?.id,
          candidateName: application?.candidateName,
          candidateEmail: application?.candidateEmail,
        }),
      });
      setUploadSuccess(`Pièce retirée avec succès. Vous pouvez désormais déposer un nouveau fichier.`);
      setUploadError(null);
      if (onRefreshApplication) onRefreshApplication();
    } catch (e: any) {
      setUploadError(`Erreur lors du retrait : ${e.message}`);
    }
  };

  // Lifecycle Progression Stepper Data
  const tenStates: { key: string; label: string; done: boolean; current: boolean }[] = [
    {
      key: 'BROUILLON',
      label: '1. Sélection du sujet',
      done: true,
      current: !isFinalInscrit && (application.currentStatut === 'BROUILLON' || application.currentStatut === 'EN_COMPLETION'),
    },
    {
      key: 'SOUMIS',
      label: '2. Soumission du dossier',
      done: isFinalInscrit || (application.currentStatut !== 'BROUILLON' && application.currentStatut !== 'EN_COMPLETION'),
      current: !isFinalInscrit && application.currentStatut === 'SOUMIS',
    },
    {
      key: 'EN_ATTENTE_VERIFICATION',
      label: '3. Contrôle des pièces (Admin)',
      done:
        isFinalInscrit ||
        [
          'VERIFICATION_CONFORME',
          'EN_ATTENTE_VALIDATION_ENCADRANT',
          'VALIDE_ENCADRANT',
          'VALIDE_LABO',
          'ADMISE_LISTE_PRINCIPALE',
          'INSCRIPTION_EN_COURS',
        ].includes(application.currentStatut),
      current: !isFinalInscrit && application.currentStatut === 'EN_ATTENTE_VERIFICATION',
    },
    {
      key: 'VERIFICATION_CONFORME',
      label: '4. Pièces validées conformes',
      done:
        isFinalInscrit ||
        [
          'EN_ATTENTE_VALIDATION_ENCADRANT',
          'VALIDE_ENCADRANT',
          'VALIDE_LABO',
          'ADMISE_LISTE_PRINCIPALE',
          'INSCRIPTION_EN_COURS',
        ].includes(application.currentStatut),
      current: !isFinalInscrit && application.currentStatut === 'VERIFICATION_CONFORME',
    },
    {
      key: 'EN_ATTENTE_VALIDATION_ENCADRANT',
      label: '5. Avis du Directeur de Thèse',
      done:
        isFinalInscrit ||
        [
          'VALIDE_ENCADRANT',
          'VALIDE_LABO',
          'ADMISE_LISTE_PRINCIPALE',
          'INSCRIPTION_EN_COURS',
        ].includes(application.currentStatut),
      current: !isFinalInscrit && application.currentStatut === 'EN_ATTENTE_VALIDATION_ENCADRANT',
    },
    {
      key: 'VALIDE_ENCADRANT',
      label: '6. Sujet approuvé par l’encadrant',
      done:
        isFinalInscrit ||
        ['VALIDE_LABO', 'ADMISE_LISTE_PRINCIPALE', 'INSCRIPTION_EN_COURS'].includes(
          application.currentStatut
        ),
      current: !isFinalInscrit && application.currentStatut === 'VALIDE_ENCADRANT',
    },
    {
      key: 'VALIDE_LABO',
      label: '7. Rattachement Laboratoire validé',
      done: isFinalInscrit || application.currentStatut === 'VALIDE_LABO',
      current: !isFinalInscrit && application.currentStatut === 'VALIDE_LABO',
    },
    {
      key: 'INSCRIT_DEFINITIF',
      label: '8. Inscription Définitive & Attestation',
      done: isFinalInscrit,
      current: false,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* 1. Header Card: Dossier Information */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4 text-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                {application.codeCandidature}
              </span>
              {isInscrite ? (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 whitespace-nowrap">
                  <Award className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Inscrit définitif</span>
                </span>
              ) : isEnAttentePieces ? (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Dossier en attente de pièces</span>
                </span>
              ) : (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Dossier complet</span>
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              {application.candidateName}
            </h2>
            <div className="text-xs text-slate-500 font-mono mt-0.5">
              CIN: {application.candidateCin} • CNE: {application.candidateCne}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowDocumentModal(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Dépôt de pièces (PDF)</span>
            </button>
          </div>
        </div>

        {/* Assigned Subject & Lab */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Sujet de recherche</span>
            <span className="font-semibold text-slate-900 block leading-snug">{assignedSubject?.title}</span>
            <span className="text-[11px] text-slate-500 block">
              {assignedSubject?.laboratory} • {assignedSubject?.establishment}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Direction de thèse</span>
            <span className="font-semibold text-slate-900 block">{assignedSubject?.professorName}</span>
            <span className="text-[11px] text-slate-500 block">{assignedSubject?.professorEmail}</span>
          </div>
        </div>

        {/* Status Line with Discrete Link to Lifecycle Modal */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Statut du dossier :</span>
            <span className="font-semibold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200 font-mono">
              {application.currentStatut}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowLifecycleModal(true)}
            className="text-xs font-semibold text-slate-700 hover:text-slate-950 underline flex items-center gap-1 cursor-pointer"
          >
            <span>Voir l'avancement / statut complet</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Oral Interview Convocation (Discrete & Contextual) */}
      {application.interview?.scheduledDate && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Convocation à l'entretien oral
            </div>
            <div className="text-xs sm:text-sm text-slate-800 font-medium">
              Commission doctorale • {application.interview.room || 'Salle des Thèses, FST Fès'}
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-600 pt-0.5">
              <span className="flex items-center gap-1.5 font-semibold text-slate-900">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                {application.interview.scheduledDate}
              </span>
              <span className="flex items-center gap-1.5 text-slate-700">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                {application.interview.scheduledTime || '10:00'}
              </span>
            </div>
          </div>

          {application.interview.total > 0 && (
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-center shrink-0">
              <span className="text-[10px] text-slate-400 font-semibold block">Note d'entretien</span>
              <span className="text-base font-bold text-slate-900 font-mono">
                {application.interview.total}/20
              </span>
            </div>
          )}
        </div>
      )}

      {/* 3. Inscription Banner & Attestation (If officially inscribed) */}
      {isInscrite && (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="text-xs sm:text-sm font-bold text-emerald-950 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Inscription Doctorale Définitive Validée</span>
            </div>
            <div className="text-xs text-emerald-800">
              Réf. Attestation :{' '}
              <span className="font-mono font-bold text-emerald-950">
                {application.officialAttestationNumber || 'USMBA-DOC-ATT-2026-089'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowAttestationModal(true)}
              className="px-3.5 py-2 bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Award className="w-3.5 h-3.5 text-emerald-700" />
              <span>Consulter l'attestation</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadAttestation}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Télécharger l'attestation</span>
            </button>
          </div>
        </div>
      )}

      {/* Direct Clean Documents List: No Clutter */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Pièces justificatives du dossier
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Format PDF uniquement • Taille maximale {maxPdfSizeMB}.0 Mo par fichier
            </p>
          </div>

          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {application.documents.filter((d) => d.conformite === 'CONFORME' || d.storagePath).length} / {application.documents.length} pièces
          </span>
        </div>

        {/* Global/Row Alert Feedbacks */}
        {uploadError && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2 font-medium">
              <XCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{uploadError}</span>
            </div>
            <button
              type="button"
              onClick={() => setUploadError(null)}
              className="text-xs font-semibold underline text-red-700 hover:text-red-900 cursor-pointer"
            >
              Fermer
            </button>
          </div>
        )}

        {uploadSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{uploadSuccess}</span>
            </div>
            <button
              type="button"
              onClick={() => setUploadSuccess(null)}
              className="text-xs font-semibold underline text-emerald-700 hover:text-emerald-900 cursor-pointer"
            >
              Fermer
            </button>
          </div>
        )}

        {/* The clean list of documents */}
        <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
          {application.documents.map((doc) => {
            const isConforme = doc.conformite === 'CONFORME' || (doc.storagePath && doc.storagePath.endsWith('.pdf'));
            const isGuichet = doc.conformite === 'VUE_AU_GUICHET' || doc.verifiedByGuichet;

            return (
              <div
                key={doc.id || doc.docId}
                className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-xs sm:text-sm text-slate-900">
                      {doc.title}
                    </span>
                    {isGuichet ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                        Vue au guichet
                      </span>
                    ) : isConforme ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Conforme (PDF)</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                        En attente de dépôt
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 mt-0.5 font-mono truncate">
                    {doc.uploadedFileName || doc.storagePath
                      ? `${doc.uploadedFileName || doc.storagePath.split('/').pop()}${doc.fileSize ? ` (${doc.fileSize})` : ''}`
                      : 'Aucun fichier PDF joint'}
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-2 self-start sm:self-auto">
                  <label className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white cursor-pointer transition-colors shadow-xs flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {isVerifyingFile
                        ? 'Contrôle...'
                        : isConforme
                        ? `Remplacer (PDF max ${maxPdfSizeMB}Mo)`
                        : `Téléverser / Scanner (PDF max ${maxPdfSizeMB}Mo)`}
                    </span>
                    <input
                      type="file"
                      accept=".pdf"
                      disabled={isVerifyingFile}
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, doc.docType)}
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL 1: Contextual Document Upload & Compliance Status */}
      {showDocumentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Dépôt de pièces justificatives
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Format PDF uniquement • Taille maximale {maxPdfSizeMB}.0 Mo
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDocumentModal(false);
                  setUploadError(null);
                  setUploadSuccess(null);
                }}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contextual Rejection Alert Banner */}
            {uploadError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 space-y-1 animate-in fade-in">
                <div className="flex items-center gap-2 font-bold text-red-800">
                  <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Fichier rejeté</span>
                </div>
                <p className="leading-relaxed pl-6 text-red-700">{uploadError}</p>
              </div>
            )}

            {/* Contextual Success Alert Banner */}
            {uploadSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1 animate-in fade-in">
                <div className="flex items-center gap-2 font-bold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Conformité validée</span>
                </div>
                <p className="leading-relaxed pl-6 text-emerald-700">{uploadSuccess}</p>
              </div>
            )}

            {/* List of documents in modal */}
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
              {application.documents.map((doc) => {
                const isConforme = doc.conformite === 'CONFORME' || (doc.storagePath && doc.storagePath.endsWith('.pdf'));

                return (
                  <div
                    key={doc.id || doc.docId}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-900">
                          {doc.title}
                        </span>
                        {isConforme ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            ✓ Conforme
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                            En attente
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-mono truncate">
                        {doc.uploadedFileName || doc.storagePath
                          ? `${doc.uploadedFileName || doc.storagePath.split('/').pop()}${doc.fileSize ? ` (${doc.fileSize})` : ''}`
                          : 'Aucun fichier PDF joint'}
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {isConforme || doc.storagePath ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveDoc(doc.docType)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-red-50 text-red-700 border border-red-200 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                          title="Retirer ce document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Retirer</span>
                        </button>
                      ) : (
                        <label className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white cursor-pointer transition-colors shadow-xs flex items-center gap-1.5">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Téléverser (PDF max {maxPdfSizeMB}Mo)</span>
                          <input
                            type="file"
                            accept=".pdf"
                            disabled={isVerifyingFile}
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, doc.docType)}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowDocumentModal(false);
                  setUploadError(null);
                  setUploadSuccess(null);
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Full Lifecycle Stepper */}
      {showLifecycleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Cycle de vie et avancement du dossier
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Réf. {application.codeCandidature} • Statut : <strong className="text-slate-800">{application.currentStatut}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLifecycleModal(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {tenStates.map((st, idx) => (
                <div
                  key={st.key}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                    st.current
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : st.done
                      ? 'bg-slate-50 text-slate-800 border-slate-200'
                      : 'bg-white text-slate-400 border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
                      st.current
                        ? 'bg-white text-slate-900'
                        : st.done
                        ? 'bg-slate-200 text-slate-800'
                        : 'bg-slate-100 text-slate-400'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="font-medium text-xs sm:text-sm">{st.label}</span>
                  </div>

                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                    st.current
                      ? 'bg-white/20 text-white'
                      : st.done
                      ? 'text-emerald-700 font-bold'
                      : 'text-slate-400'
                  }`}>
                    {st.current ? 'Étape en cours' : st.done ? '✓ Validé' : 'À venir'}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              {isInscrite ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadAttestation}
                    className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Télécharger l'attestation d'inscription définitive</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLifecycleModal(false);
                      setShowAttestationModal(true);
                    }}
                    className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 font-semibold text-xs rounded-xl cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Award className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Aperçu</span>
                  </button>
                </div>
              ) : (
                <div />
              )}
              <button
                type="button"
                onClick={() => setShowLifecycleModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Official Registration Certificate */}
      {showAttestationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-5 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Université Sidi Mohamed Ben Abdellah
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  Attestation d'inscription doctorale
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAttestationModal(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
              <div className="flex items-center justify-between font-mono text-slate-700 font-semibold border-b border-slate-200 pb-2">
                <span>RÉF : {application.officialAttestationNumber || 'USMBA-DOC-2026-089'}</span>
                <span>ANNÉE : 2026/2027</span>
              </div>

              <div className="space-y-0.5 pt-1">
                <div className="text-slate-500">Doctorant(e) inscrit(e) :</div>
                <div className="text-sm font-bold text-slate-900">{application.candidateName}</div>
                <div className="font-mono text-slate-600">CIN : {application.candidateCin} • CNE : {application.candidateCne}</div>
              </div>

              <div className="space-y-0.5 pt-1">
                <div className="text-slate-500">Sujet de recherche agréé :</div>
                <div className="font-semibold text-slate-900">{assignedSubject?.title}</div>
                <div className="text-slate-600">Laboratoire : {assignedSubject?.laboratory} • {assignedSubject?.establishment}</div>
                <div className="text-slate-600">Directeur de thèse : {assignedSubject?.professorName}</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAttestationModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={handleDownloadAttestation}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger l'attestation</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimer / Exporter PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
