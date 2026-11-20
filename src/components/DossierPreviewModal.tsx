import React, { useState, useEffect } from 'react';
import {
  X,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  CreditCard,
  Award,
  ShieldCheck,
  User as UserIcon,
  Check,
  AlertCircle,
  Calendar,
  Download,
  ExternalLink,
} from 'lucide-react';
import {
  ApplicationBasket,
  Subject,
  StatutConformite,
  CandidatureDocument,
} from '../types';
import { PdfCanvasPreview } from './PdfCanvasPreview';
import { dataUrlToObjectUrl } from '../utils/documentPersistence';

interface DossierPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: ApplicationBasket | null;
  subject?: Subject;
  mode: 'admin' | 'supervisor' | 'lab';
  // Admin callbacks
  onVerifyDocument?: (appId: string, docId: string, conformite: StatutConformite, reason?: string) => Promise<void> | void;
  onMarkVueAuGuichet?: (appId: string, docId: string) => Promise<void> | void;
  onTransitionStatus?: (appId: string, nextStatus: string, reason?: string) => Promise<void> | void;
  onValidateFinalInscription?: (appId: string) => Promise<void> | void;
  // Supervisor callbacks
  onApproveGlobal?: () => Promise<void> | void;
  onRequestModification?: (reason: string) => Promise<void> | void;
  onRejectGlobal?: (reason: string) => Promise<void> | void;
  onSubmitSupervisorAvis?: (
    avis: 'FAVORABLE' | 'DEFAVORABLE' | 'COMPLEMENT',
    commentaire: string
  ) => Promise<void> | void;
  onSaveInterview?: (
    appId: string,
    scores: {
      specialite: number;
      motivation: number;
      projet: number;
      langues: number;
      juryNotes: string;
      decision: string;
    }
  ) => Promise<void> | void;
}

type PreviewDocItem = {
  id: string;
  docType: string;
  title: string;
  conformite: string;
  storagePath?: string;
  fileSize?: string;
  fileType?: string;
  dateUploaded?: string;
  uploadedFileName?: string;
  fileUrl?: string;
  fileDataUrl?: string;
  isRealUpload?: boolean;
  rejectionReason?: string;
  isCharter?: boolean;
};

export const DossierPreviewModal: React.FC<DossierPreviewModalProps> = ({
  isOpen,
  onClose,
  application,
  subject,
  mode,
  onVerifyDocument,
  onMarkVueAuGuichet,
  onTransitionStatus,
  onValidateFinalInscription,
  onApproveGlobal,
  onRequestModification,
  onRejectGlobal,
  onSubmitSupervisorAvis,
  onSaveInterview,
}) => {
  const [selectedDocType, setSelectedDocType] = useState<string>('CIN');
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);
  const [docRejectionReason, setDocRejectionReason] = useState(
    'Document illisible, tronqué ou scan non conforme.'
  );

  // Direct Supervisor Avis block state
  const [selectedAvis, setSelectedAvis] = useState<'FAVORABLE' | 'DEFAVORABLE' | 'COMPLEMENT'>('FAVORABLE');
  const [avisComment, setAvisComment] = useState('');
  const [isSavingAvis, setIsSavingAvis] = useState(false);

  // Global status / supervisor inline forms
  const [activeActionMode, setActiveActionMode] = useState<
    'none' | 'complement' | 'refuse' | 'interview'
  >('none');
  const [actionReason, setActionReason] = useState('');

  // Interview deliberation fields
  const [specialite, setSpecialite] = useState(17.5);
  const [motivation, setMotivation] = useState(18.0);
  const [projet, setProjet] = useState(18.5);
  const [langues, setLangues] = useState(16.5);
  const [juryNotes, setJuryNotes] = useState(
    'Candidat solide, maîtrise méthodologique avérée. Recommandé pour admission.'
  );
  const [decision, setDecision] = useState('Admitted_Principal');

  // Auto-select the first really uploaded candidate document when opening a dossier
  useEffect(() => {
    if (!isOpen || !application) return;
    const firstRealUpload = (application.documents || []).find(
      (d) => d.isRealUpload && (d.fileUrl || d.fileDataUrl) && d.conformite !== 'MANQUANTE'
    );
    if (firstRealUpload) {
      setSelectedDocType(firstRealUpload.docType);
    } else {
      setSelectedDocType('CIN');
    }
  }, [isOpen, application?.id]);

  if (!isOpen || !application) return null;

  const existingDocs: PreviewDocItem[] = (application.documents || []).map((d: CandidatureDocument) => ({
    id: d.id || d.docId,
    docType: d.docType,
    title: d.title,
    conformite: d.conformite,
    storagePath: d.storagePath,
    fileSize: d.fileSize,
    fileType: d.fileType,
    dateUploaded: d.dateUploaded,
    uploadedFileName: d.uploadedFileName,
    fileUrl: d.fileUrl,
    fileDataUrl: d.fileDataUrl,
    isRealUpload: d.isRealUpload,
    rejectionReason: d.rejectionReason,
  }));

  // Ensure the 4 core document specimens (CIN, Master, Relevés, Charte) are always present
  const ensureSpecimen = (docType: string, fallbackTitle: string) => {
    if (!existingDocs.some((d) => d.docType === docType)) {
      existingDocs.push({
        id: `specimen-${docType}`,
        docType,
        title: fallbackTitle,
        conformite: 'MANQUANTE',
        storagePath: '',
        fileSize: undefined,
      });
    }
  };

  ensureSpecimen('CIN', "Carte Nationale d'Identité (CIN)");
  ensureSpecimen('DIPLOME_MASTER', 'Diplôme de Master / Ingénieur');
  ensureSpecimen('RELEVE_NOTES', 'Relevé de notes universitaires (S1-S4)');

  const docsList: PreviewDocItem[] = [
    ...existingDocs,
    {
      id: 'charter-specimen',
      docType: 'CHARTE_SIGNEE',
      title: 'Charte des Thèses & Contrat Doctoral',
      conformite:
        application.signatures?.directeur?.status === 'Signed'
          ? 'SIGNÉE'
          : 'EN_ATTENTE_SIGNATURE',
      storagePath: '/documents/Charte_Theses_USMBA_2026.pdf',
      fileSize: '640 Ko',
      isCharter: true,
    },
  ];

  const activeDoc =
    docsList.find((d) => d.docType === selectedDocType) || docsList[0];

  const candidateName = application.candidateName || 'Candidat Doctorant';
  const nameParts = candidateName.split(' ');
  const firstName = nameParts[0] || 'Youssef';
  const lastName = nameParts.slice(1).join(' ') || 'Alaoui';
  const cin = application.candidateCin || 'CD689412';
  const cne = application.candidateCne || 'M134567890';
  const establishment =
    application.candidat?.etablissementOrigine || 'Faculté des Sciences et Techniques (FST Fès)';
  const average = application.candidat?.moyenneGenerale || 16.51;
  const diplomaTitle =
    application.candidat?.diplomeObtenu ||
    'Master Spécialisé en Intelligence Artificielle & Sciences des Données';

  const getSpecimenIcon = (docType: string) => {
    switch (docType) {
      case 'CIN':
        return <CreditCard className="w-4 h-4 text-slate-700" />;
      case 'DIPLOME_MASTER':
      case 'DIPLOME_LICENCE':
      case 'DIPLOME_BAC':
        return <Award className="w-4 h-4 text-slate-700" />;
      case 'CHARTE_SIGNEE':
        return <ShieldCheck className="w-4 h-4 text-slate-700" />;
      default:
        return <FileText className="w-4 h-4 text-slate-700" />;
    }
  };

  // Render realistic high-fidelity document specimen per type
  const renderSpecimenPreview = (docType: string) => {
    if (docType === 'CIN') {
      return (
        <div className="space-y-4">
          {/* CNIE Recto Specimen */}
          <div className="bg-white border-2 border-slate-300 rounded-2xl p-5 shadow-xs space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Royaume du Maroc
                </div>
                <div className="text-xs font-extrabold text-slate-900">
                  CARTE NATIONALE D'IDENTITÉ ÉLECTRONIQUE (CNIE)
                </div>
              </div>
              <div className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-800">
                SPÉCIMEN RECTO
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-20 h-24 rounded-xl bg-slate-100 border border-slate-300 flex flex-col items-center justify-center text-slate-400 shrink-0">
                <UserIcon className="w-8 h-8 text-slate-500" />
                <span className="text-[9px] font-mono mt-1 text-slate-500">PHOTO</span>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs flex-1">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Prénom</span>
                  <span className="font-bold text-slate-900 uppercase">{firstName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Nom</span>
                  <span className="font-bold text-slate-900 uppercase">{lastName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">N° CIN</span>
                  <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                    {cin}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Lieu de naissance</span>
                  <span className="font-semibold text-slate-800">FÈS • MAROC</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Date de naissance</span>
                  <span className="font-mono text-slate-800">14 / 05 / 2001</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Valable jusqu'au</span>
                  <span className="font-mono text-slate-800">18 / 09 / 2034</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 font-mono text-[10px] tracking-widest text-slate-500 bg-slate-50 p-2 rounded-lg">
              IDMAR{cin}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;0105147M3409184MAR&lt;&lt;&lt;&lt;&lt;&lt;
              <br />
              {lastName.toUpperCase()}&lt;&lt;{firstName.toUpperCase()}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
            </div>
          </div>

          {/* Verso info */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-[11px] text-slate-600 flex items-center justify-between">
            <span>
              <strong>Verso vérifié :</strong> Code CNE / Massar :{' '}
              <span className="font-mono text-slate-900">{cne}</span> • Adresse : Fès Saïss
            </span>
            <span className="text-emerald-700 font-semibold">✓ Puce & MRZ lisibles</span>
          </div>
        </div>
      );
    }

    if (docType === 'DIPLOME_MASTER' || docType === 'DIPLOME_LICENCE' || docType === 'DIPLOME_BAC') {
      const levelLabel =
        docType === 'DIPLOME_MASTER'
          ? 'DIPLÔME DE MASTER SPÉCIALISÉ'
          : docType === 'DIPLOME_LICENCE'
          ? 'DIPLÔME DE LICENCE FONDAMENTALE / SCIENCES & TECHNIQUES'
          : 'BACCALAURÉAT DE L’ENSEIGNEMENT SECONDAIRE';
      const mention = average >= 16 ? 'TRÈS BIEN' : average >= 14 ? 'BIEN' : 'ASSEZ BIEN';

      return (
        <div className="bg-white border-2 border-slate-800 rounded-2xl p-6 shadow-xs space-y-5 text-center relative">
          <div className="border-b border-slate-200 pb-3 space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Royaume du Maroc • Ministère de l'Enseignement Supérieur
            </div>
            <div className="text-sm font-extrabold text-slate-900">
              UNIVERSITÉ SIDI MOHAMED BEN ABDELLAH — FÈS
            </div>
            <div className="text-xs font-semibold text-slate-600">{establishment}</div>
          </div>

          <div className="py-2 space-y-2">
            <div className="inline-block px-3 py-1 rounded-full bg-slate-100 border border-slate-300 text-[11px] font-bold tracking-wider text-slate-900">
              {levelLabel}
            </div>
            <p className="text-xs text-slate-600 pt-2">
              Le Président de l'Université et le Doyen de l'Établissement attestent que :
            </p>
            <div className="text-lg font-black text-slate-900 tracking-tight uppercase">
              {candidateName}
            </div>
            <div className="text-xs font-mono text-slate-500">
              CIN : {cin} • Code National Étudiant : {cne}
            </div>
            <p className="text-xs text-slate-700 max-w-md mx-auto pt-1 leading-relaxed">
              a satisfait à l'ensemble des épreuves et soutenu avec succès son cursus en{' '}
              <strong className="text-slate-900">
                {docType === 'DIPLOME_MASTER'
                  ? diplomaTitle
                  : docType === 'DIPLOME_LICENCE'
                  ? 'Sciences Mathématiques et Informatique'
                  : 'Sciences Physiques & Mathématiques'}
              </strong>
              .
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-200 text-xs">
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-400 block">Session</span>
              <span className="font-bold text-slate-900">Juin 2025</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-400 block">Mention</span>
              <span className="font-bold text-emerald-800">{mention}</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-400 block">Moyenne</span>
              <span className="font-mono font-bold text-slate-900">{average}/20</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 text-[11px] text-slate-500 border-t border-slate-100">
            <span>Cachet officiel & Signature du Doyen</span>
            <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
              QR-VERIF: USMBA-{cin}
            </span>
          </div>
        </div>
      );
    }

    if (docType === 'RELEVE_NOTES') {
      const modules = [
        { code: 'M11', intitule: 'Intelligence Artificielle & Raisonnement', sem: 'S1', note: '17.25', res: 'Validé' },
        { code: 'M14', intitule: 'Apprentissage Profond (Deep Learning)', sem: 'S2', note: '16.80', res: 'Validé' },
        { code: 'M21', intitule: 'Architectures Big Data & Cloud', sem: 'S2', note: '16.10', res: 'Validé' },
        { code: 'M31', intitule: 'Traitement du Langage & Vision', sem: 'S3', note: '16.40', res: 'Validé' },
        { code: 'M34', intitule: 'Méthodologie de la Recherche Scientifique', sem: 'S3', note: '17.00', res: 'Validé' },
        { code: 'M41', intitule: 'Mémoire de Fin d’Études (PFE)', sem: 'S4', note: '17.50', res: 'Validé' },
      ];
      return (
        <div className="bg-white border border-slate-300 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {establishment}
              </div>
              <div className="text-sm font-bold text-slate-900">
                RELEVÉ DE NOTES ET RÉSULTATS (S1 À S4)
              </div>
            </div>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
              CNE: {cne}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-500">Étudiant :</span>{' '}
              <strong className="text-slate-900">{candidateName}</strong>
            </div>
            <div>
              <span className="text-slate-500">CIN :</span>{' '}
              <strong className="font-mono text-slate-900">{cin}</strong>
            </div>
            <div className="col-span-2">
              <span className="text-slate-500">Filière :</span>{' '}
              <strong className="text-slate-900">{diplomaTitle}</strong>
            </div>
          </div>

          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] uppercase text-slate-500">
                <th className="py-1.5">Code</th>
                <th className="py-1.5">Module</th>
                <th className="py-1.5 text-center">Sem.</th>
                <th className="py-1.5 text-right">Note /20</th>
                <th className="py-1.5 text-right">Résultat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {modules.map((m) => (
                <tr key={m.code}>
                  <td className="py-1.5 font-mono text-slate-500">{m.code}</td>
                  <td className="py-1.5 font-medium text-slate-900">{m.intitule}</td>
                  <td className="py-1.5 text-center font-mono text-slate-500">{m.sem}</td>
                  <td className="py-1.5 text-right font-mono font-bold text-slate-900">{m.note}</td>
                  <td className="py-1.5 text-right text-emerald-700 font-semibold">{m.res}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between pt-3 border-t border-slate-200 text-xs">
            <span className="text-slate-600">
              Moyenne Générale Cycle Master :{' '}
              <strong className="font-mono text-slate-900 text-sm">{average} / 20</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
              Admis • Mention Très Bien
            </span>
          </div>
        </div>
      );
    }

    if (docType === 'CHARTE_SIGNEE') {
      return (
        <div className="bg-white border border-slate-300 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="text-center border-b border-slate-200 pb-3 space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Université Sidi Mohamed Ben Abdellah • Pôle Études Doctorales
            </div>
            <div className="text-sm font-black text-slate-900">
              CHARTE DES THÈSES & CONTRAT DOCTORAL 2026/2027
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              Réf. {application.codeCandidature}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Doctorant</span>
              <span className="font-bold text-slate-900 block">{candidateName}</span>
              <span className="font-mono text-[11px] text-slate-500">CIN: {cin}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Directeur de Thèse</span>
              <span className="font-bold text-slate-900 block">
                {subject?.professorName || 'Pr. Mustapha Bennani'}
              </span>
              <span className="text-[11px] text-slate-500">
                {application.structureRecherche?.acronyme || 'Labo LISER'}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 leading-relaxed text-slate-700">
            <div className="font-bold text-slate-900">
              Sujet retenu : {subject?.title || 'Recherche Doctorale USMBA'}
            </div>
            <p className="text-[11px]">
              <strong>Article 1 :</strong> Le doctorant s'engage à consacrer ses travaux à la réalisation du projet scientifique validé sous la direction de son encadrant et à respecter les règles d'éthique et d'intégrité scientifique de l'USMBA.
            </p>
            <p className="text-[11px]">
              <strong>Article 2 :</strong> La soutenance est conditionnée par l'obtention de 200 heures de formations complémentaires et la publication de deux articles indexés.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
            {[
              { label: '1. Candidat', st: application.signatures?.candidat?.status },
              { label: '2. Directeur', st: application.signatures?.directeur?.status },
              { label: '3. Chef Labo', st: application.signatures?.chef_labo?.status },
              { label: '4. CEDoc', st: application.signatures?.directeur_ced?.status },
            ].map((sig) => (
              <div key={sig.label} className="p-2 rounded-lg border border-slate-200 bg-slate-50">
                <div className="text-slate-500">{sig.label}</div>
                <div className={`font-bold ${sig.st === 'Signed' ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {sig.st === 'Signed' ? '✓ Signé PKI' : 'En attente'}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Default fallback specimen (Projet de thèse / Photo identité)
    return (
      <div className="bg-white border border-slate-300 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Spécimen Documentaire Officiel
            </div>
            <div className="text-sm font-bold text-slate-900">{activeDoc?.title}</div>
          </div>
          <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
            PDF • Vérifié
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2 text-slate-700 leading-relaxed">
          <div>
            <strong>Candidat :</strong> {candidateName} (CIN: {cin})
          </div>
          <div>
            <strong>Sujet ciblé :</strong> {subject?.title || 'Thèse Doctorale USMBA'}
          </div>
          <p className="pt-1 text-[11px] text-slate-600">
            Document PDF conforme aux critères techniques de la plateforme GCD-USMBA (format PDF natif, résolution lisible, signature et cachet présents, taille &lt; 5 Mo).
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/65 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[94vh] border border-slate-200 shadow-2xl flex flex-col overflow-hidden text-slate-900">
        {/* Top Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                {application.codeCandidature}
              </span>
              <span className="text-xs font-semibold text-slate-300">
                Statut : <strong className="text-white">{application.currentStatut}</strong>
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold mt-1">
              Dossier & Aperçu des Pièces — {candidateName}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center cursor-pointer transition-colors"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Two-Column Body: Left = Document List + Controls | Right = Spacious Live Document Preview */}
        <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          {/* Left Panel (4 cols): Piece Selector + Actions */}
          <div className="lg:col-span-4 p-4 sm:p-5 space-y-4 bg-white lg:overflow-y-auto lg:min-h-0">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Établissement :</span>
                <span className="font-semibold text-slate-900">{establishment}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Score de Mérite :</span>
                <span className="font-mono font-bold text-slate-900">
                  {application.meritScore || 88.75} / 100
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">CIN / CNE :</span>
                <span className="font-mono text-slate-800">
                  {cin} • {cne}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-0.5">
                Pièces du dossier ({docsList.length}) — Cliquer « Voir »
              </div>

              {docsList.map((doc) => {
                const isSelected = activeDoc?.docType === doc.docType;
                const isConforme =
                  doc.conformite === 'CONFORME' ||
                  doc.conformite === 'VUE_AU_GUICHET' ||
                  doc.conformite === 'SIGNÉE';
                const isRejected =
                  doc.conformite === 'COMPLEMENT_DEMANDE' ||
                  doc.conformite === 'NON_CONFORME';

                return (
                  <div
                    key={doc.id}
                    className={`p-3 rounded-xl border transition-all space-y-2 ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs truncate">{doc.title}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              isSelected
                                ? 'bg-slate-800 text-slate-200'
                                : isConforme
                                ? 'bg-emerald-100 text-emerald-800'
                                : isRejected
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {doc.conformite}
                          </span>
                          <span
                            className={`text-[10px] font-mono truncate ${
                              isSelected ? 'text-slate-300' : 'text-slate-500'
                            }`}
                          >
                            {doc.isRealUpload && doc.fileUrl
                              ? `PDF déposé : ${doc.uploadedFileName || doc.storagePath?.split('/').pop()}`
                              : doc.storagePath && doc.conformite !== 'MANQUANTE'
                              ? doc.storagePath.split('/').pop()
                              : 'Aucune pièce déposée (spécimen)'}
                          </span>
                        </div>
                      </div>

                      {/* Bouton Voir */}
                      <button
                        type="button"
                        onClick={() => setSelectedDocType(doc.docType)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-white text-slate-900'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                        }`}
                      >
                        <Eye className="w-3 h-3" />
                        <span>Voir</span>
                      </button>
                    </div>

                    {/* Quick Admin Controls per piece */}
                    {mode === 'admin' && !doc.isCharter && onVerifyDocument && (
                      <div className="pt-1.5 border-t border-slate-200/20 flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onVerifyDocument(application.id, doc.id, 'CONFORME')}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                              : 'bg-slate-900 text-white hover:bg-slate-800'
                          }`}
                        >
                          Conforme
                        </button>

                        {onMarkVueAuGuichet && (
                          <button
                            type="button"
                            onClick={() => onMarkVueAuGuichet(application.id, doc.id)}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer border ${
                              isSelected
                                ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            Vu guichet
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            setRejectingDocId(rejectingDocId === doc.id ? null : doc.id)
                          }
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer border ${
                            isSelected
                              ? 'bg-rose-950 text-rose-200 border-rose-800 hover:bg-rose-900'
                              : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
                          }`}
                        >
                          Rejeter
                        </button>
                      </div>
                    )}

                    {/* Inline Rejection Reason for a specific piece */}
                    {mode === 'admin' && rejectingDocId === doc.id && onVerifyDocument && (
                      <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-slate-900 space-y-2">
                        <input
                          type="text"
                          value={docRejectionReason}
                          onChange={(e) => setDocRejectionReason(e.target.value)}
                          placeholder="Motif du rejet de la pièce..."
                          className="w-full p-1.5 text-[11px] bg-white border border-rose-300 rounded-md"
                        />
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setRejectingDocId(null)}
                            className="px-2 py-1 text-[10px] text-slate-600 cursor-pointer"
                          >
                            Annuler
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onVerifyDocument(
                                application.id,
                                doc.id,
                                'COMPLEMENT_DEMANDE',
                                docRejectionReason
                              );
                              setRejectingDocId(null);
                            }}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded cursor-pointer"
                          >
                            Confirmer rejet + E-mail
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Panel (8 cols): Spacious Large-Format Document Preview + Direct Avis */}
          <div className="lg:col-span-8 p-4 sm:p-6 bg-slate-50 flex flex-col gap-5 lg:overflow-y-auto lg:min-h-0">
            <div className="space-y-3">
              {(() => {
                const effectiveFileUrl =
                  activeDoc?.fileUrl ||
                  (activeDoc?.fileDataUrl
                    ? dataUrlToObjectUrl(
                        activeDoc.fileDataUrl,
                        `${application.id}::${activeDoc.docType}::${activeDoc.dateUploaded || 'v1'}`,
                        activeDoc.fileType || 'application/pdf'
                      )
                    : '');
                const hasRealUpload = Boolean(
                  activeDoc?.isRealUpload &&
                    (effectiveFileUrl || activeDoc?.fileDataUrl) &&
                    activeDoc?.conformite !== 'MANQUANTE'
                );
                const realFileName =
                  activeDoc?.uploadedFileName ||
                  activeDoc?.storagePath?.split('/').pop() ||
                  `${activeDoc?.docType || 'document'}.pdf`;

                return (
                  <>
                    {/* Clean Header Row: Quick Document Tabs + Context Status */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {[
                          { type: 'CIN', label: 'CIN' },
                          { type: 'DIPLOME_MASTER', label: 'Master' },
                          { type: 'RELEVE_NOTES', label: 'Relevés' },
                          { type: 'CHARTE_SIGNEE', label: 'Charte' },
                        ].map((tab) => {
                          const isTabActive = activeDoc?.docType === tab.type;
                          return (
                            <button
                              key={tab.type}
                              type="button"
                              onClick={() => setSelectedDocType(tab.type)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors border ${
                                isTabActive
                                  ? 'bg-slate-900 text-white border-slate-900'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {tab.label}
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-2 min-w-0">
                        <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-700 min-w-0">
                          {getSpecimenIcon(activeDoc?.docType || 'CIN')}
                          <span className="truncate max-w-[220px]">
                            {activeDoc?.title}
                          </span>
                        </div>
                        {hasRealUpload ? (
                          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-emerald-100 border border-emerald-200 text-emerald-900 whitespace-nowrap shrink-0">
                            PDF déposé
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 whitespace-nowrap shrink-0">
                            {activeDoc?.conformite === 'MANQUANTE'
                              ? 'Spécimen type'
                              : 'Spécimen PDF'}
                          </span>
                        )}
                      </div>
                    </div>

                    {hasRealUpload && (effectiveFileUrl || activeDoc?.fileDataUrl) ? (
                      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                        {/* Real Document Renderer: Camera Scan Image or Unified PDF.js Large-Format Viewer */}
                        {activeDoc?.fileType?.startsWith('image/') ? (
                          <>
                            <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
                              <div className="flex items-center gap-2 min-w-0 flex-1 basis-48">
                                <FileText className="w-4 h-4 text-slate-600 shrink-0" />
                                <span
                                  className="font-mono text-xs font-bold text-slate-900 truncate"
                                  title={realFileName}
                                >
                                  {realFileName}
                                </span>
                                {activeDoc?.fileSize && (
                                  <span className="text-[11px] text-slate-500 font-mono whitespace-nowrap shrink-0">
                                    {activeDoc.fileSize}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {effectiveFileUrl && (
                                  <a
                                    href={effectiveFileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700 inline-flex items-center gap-1.5 whitespace-nowrap transition-colors"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                    <span>Ouvrir</span>
                                  </a>
                                )}
                                {effectiveFileUrl && (
                                  <a
                                    href={effectiveFileUrl}
                                    download={realFileName}
                                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-900 text-[11px] font-semibold text-white inline-flex items-center gap-1.5 whitespace-nowrap transition-colors"
                                  >
                                    <Download className="w-3.5 h-3.5 shrink-0" />
                                    <span>Télécharger</span>
                                  </a>
                                )}
                              </div>
                            </div>
                            <div className="h-[480px] sm:h-[540px] overflow-auto bg-slate-100 p-4 sm:p-5 flex items-center justify-center">
                              <img
                                src={activeDoc.fileDataUrl || effectiveFileUrl}
                                alt={realFileName}
                                className="max-w-full max-h-full object-contain rounded-lg shadow-md border border-slate-200 bg-white"
                              />
                            </div>
                          </>
                        ) : (
                          <PdfCanvasPreview
                            key={
                              activeDoc?.fileDataUrl
                                ? `${application.id}-${activeDoc.docType}-${activeDoc.dateUploaded}`
                                : effectiveFileUrl
                            }
                            fileUrl={effectiveFileUrl}
                            fileDataUrl={activeDoc?.fileDataUrl}
                            fileName={realFileName}
                            fileSize={activeDoc?.fileSize}
                          />
                        )}
                      </div>
                    ) : (
                      renderSpecimenPreview(activeDoc?.docType || 'CIN')
                    )}
                  </>
                );
              })()}
            </div>

            {/* Direct Evaluation Block for Directeur de Thèse */}
            {mode === 'supervisor' && onSubmitSupervisorAvis && (
              <div className="p-4 rounded-2xl bg-white border border-slate-300 space-y-3 text-xs shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                    Avis Direct du Directeur de Thèse
                  </span>
                  {application.avisDirecteur && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      Dernier avis : {application.avisDirecteur.avis}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedAvis('FAVORABLE')}
                    className={`py-2 px-2.5 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 border cursor-pointer transition-all ${
                      selectedAvis === 'FAVORABLE'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Favorable</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedAvis('COMPLEMENT')}
                    className={`py-2 px-2.5 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 border cursor-pointer transition-all ${
                      selectedAvis === 'COMPLEMENT'
                        ? 'bg-amber-700 text-white border-amber-700 shadow-xs'
                        : 'bg-white text-amber-800 border-amber-200 hover:bg-amber-50'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Demande de complément</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedAvis('DEFAVORABLE')}
                    className={`py-2 px-2.5 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 border cursor-pointer transition-all ${
                      selectedAvis === 'DEFAVORABLE'
                        ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
                        : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Défavorable</span>
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Commentaire / Observations (optionnel) :
                  </label>
                  <textarea
                    rows={2}
                    value={avisComment}
                    onChange={(e) => setAvisComment(e.target.value)}
                    placeholder="Saisissez un commentaire optionnel à joindre à votre avis..."
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    disabled={isSavingAvis}
                    onClick={async () => {
                      setIsSavingAvis(true);
                      try {
                        await onSubmitSupervisorAvis(selectedAvis, avisComment);
                        setAvisComment('');
                        onClose();
                      } finally {
                        setIsSavingAvis(false);
                      }
                    }}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors disabled:opacity-50"
                  >
                    {isSavingAvis ? 'Enregistrement...' : "Enregistrer l'avis & Notifier"}
                  </button>
                </div>
              </div>
            )}

            {/* Inline Decision Forms for Supervisor or Admin */}
            {activeActionMode === 'complement' && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2.5 text-xs">
                <label className="font-bold text-amber-950 block">
                  Précisez le motif de correction / complément demandé :
                </label>
                <input
                  type="text"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Ex: Veuillez joindre les relevés certifiés de S3 et S4..."
                  className="w-full p-2 bg-white border border-amber-300 rounded-xl text-xs"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveActionMode('none')}
                    className="px-3 py-1.5 text-slate-600 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (mode === 'admin' && onTransitionStatus) {
                        await onTransitionStatus(
                          application.id,
                          'COMPLEMENT_REQUIS',
                          actionReason || 'Pièce manquante ou à régulariser'
                        );
                      } else if (onRequestModification) {
                        await onRequestModification(
                          actionReason || 'Précision demandée sur le dossier'
                        );
                      }
                      setActiveActionMode('none');
                      setActionReason('');
                    }}
                    className="px-4 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-xl cursor-pointer"
                  >
                    Envoyer la demande + E-mail
                  </button>
                </div>
              </div>
            )}

            {activeActionMode === 'refuse' && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-2.5 text-xs">
                <label className="font-bold text-rose-950 block">
                  Motif officiel du refus :
                </label>
                <input
                  type="text"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Ex: Dossier incomplet ou prérequis académiques insuffisants..."
                  className="w-full p-2 bg-white border border-rose-300 rounded-xl text-xs"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveActionMode('none')}
                    className="px-3 py-1.5 text-slate-600 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (mode === 'admin' && onTransitionStatus) {
                        await onTransitionStatus(
                          application.id,
                          'REJETEE',
                          actionReason || 'Dossier rejeté par la scolarité'
                        );
                      } else if (onRejectGlobal) {
                        await onRejectGlobal(actionReason || 'Candidature refusée');
                      }
                      setActiveActionMode('none');
                      setActionReason('');
                      onClose();
                    }}
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl cursor-pointer"
                  >
                    Confirmer le refus + E-mail
                  </button>
                </div>
              </div>
            )}

            {activeActionMode === 'interview' && onSaveInterview && (
              <div className="p-4 rounded-2xl bg-white border border-slate-300 space-y-3 text-xs shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-900">
                    Délibération d'entretien oral ({candidateName})
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveActionMode('none')}
                    className="text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                      Spécialité /20
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      step="0.5"
                      value={specialite}
                      onChange={(e) => setSpecialite(Number(e.target.value))}
                      className="w-full p-1.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                      Motivation /20
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      step="0.5"
                      value={motivation}
                      onChange={(e) => setMotivation(Number(e.target.value))}
                      className="w-full p-1.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                      Projet /20
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      step="0.5"
                      value={projet}
                      onChange={(e) => setProjet(Number(e.target.value))}
                      className="w-full p-1.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                      Langues /20
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      step="0.5"
                      value={langues}
                      onChange={(e) => setLangues(Number(e.target.value))}
                      className="w-full p-1.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                      Décision officielle
                    </label>
                    <select
                      value={decision}
                      onChange={(e) => setDecision(e.target.value)}
                      className="w-full p-1.5 border border-slate-200 rounded-lg bg-slate-50"
                    >
                      <option value="Admitted_Principal">Admis sur Liste Principale</option>
                      <option value="Admitted_Waiting">Admis sur Liste d'Attente</option>
                      <option value="Rejected">Non Admis / Refusé</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                      Observations du jury
                    </label>
                    <input
                      type="text"
                      value={juryNotes}
                      onChange={(e) => setJuryNotes(e.target.value)}
                      className="w-full p-1.5 border border-slate-200 rounded-lg bg-slate-50"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await onSaveInterview(application.id, {
                        specialite,
                        motivation,
                        projet,
                        langues,
                        juryNotes,
                        decision,
                      });
                      setActiveActionMode('none');
                      onClose();
                    }}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl cursor-pointer"
                  >
                    Enregistrer la délibération + Notifier
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Decision Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          {mode === 'admin' ? (
            <div className="flex flex-wrap items-center gap-2">
              {onValidateFinalInscription &&
                !['INSCRIT_DEFINITIF', 'INSCRIPTION_DEFINITIVE', 'INSCRITE'].includes(
                  application.currentStatut
                ) && (
                  <button
                    type="button"
                    onClick={async () => {
                      await onValidateFinalInscription(application.id);
                      onClose();
                    }}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <Award className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
                    <span>Valider l'inscription définitive &amp; Générer l'attestation</span>
                  </button>
                )}

              {['INSCRIT_DEFINITIF', 'INSCRIPTION_DEFINITIVE', 'INSCRITE'].includes(
                application.currentStatut
              ) && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold whitespace-nowrap">
                  <Award className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    Inscrit définitif
                    {application.officialAttestationNumber
                      ? ` • ${application.officialAttestationNumber}`
                      : ''}
                  </span>
                </span>
              )}

              {onTransitionStatus &&
                !['INSCRIT_DEFINITIF', 'INSCRIPTION_DEFINITIVE', 'INSCRITE'].includes(
                  application.currentStatut
                ) && (
                  <>
                    <button
                      type="button"
                      onClick={async () => {
                        await onTransitionStatus(application.id, 'VERIFICATION_CONFORME');
                        onClose();
                      }}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Valider le dossier (Conforme)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setActiveActionMode(
                          activeActionMode === 'complement' ? 'none' : 'complement'
                        )
                      }
                      className="px-3.5 py-2 bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Exiger complément
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setActiveActionMode(activeActionMode === 'refuse' ? 'none' : 'refuse')
                      }
                      className="px-3.5 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Rejeter le dossier
                    </button>
                  </>
                )}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {mode === 'lab' && onApproveGlobal && (
                <button
                  type="button"
                  onClick={async () => {
                    await onApproveGlobal();
                    onClose();
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                  <span>Valider le rattachement</span>
                </button>
              )}

              {mode === 'lab' && onRejectGlobal && (
                <button
                  type="button"
                  onClick={() =>
                    setActiveActionMode(activeActionMode === 'refuse' ? 'none' : 'refuse')
                  }
                  className="px-3.5 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Refuser rattachement
                </button>
              )}

              {onSaveInterview && (
                <button
                  type="button"
                  onClick={() =>
                    setActiveActionMode(
                      activeActionMode === 'interview' ? 'none' : 'interview'
                    )
                  }
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5 text-slate-700" />
                  <span>Délibération entretien</span>
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Fermer l'aperçu
          </button>
        </div>
      </div>
    </div>
  );
};
