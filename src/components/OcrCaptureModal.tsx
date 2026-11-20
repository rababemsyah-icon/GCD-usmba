import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  CreditCard,
  Award,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Upload,
  Camera,
  Trash2,
  X,
  Video,
  RefreshCw,
} from 'lucide-react';
import { CandidateProfile, ApplicationBasket, User, CampaignRules } from '../types';
import {
  formatFileSize,
  getPersistedDocumentsForCandidate,
  markPersistedDocumentRemoved,
  savePersistedDocument,
} from '../utils/documentPersistence';

export interface RequiredDocumentItem {
  id: string;
  docType: 'CIN' | 'DIPLOME_MASTER' | 'RELEVE_NOTES' | 'DIPLOME_LICENCE' | 'DIPLOME_BAC' | 'PROJET';
  title: string;
  description: string;
  required: boolean;
  isUploaded?: boolean;
  fileName?: string;
}

interface OcrCaptureModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  candidateProfile?: CandidateProfile;
  currentUser?: Partial<User> | null;
  activeCampaign?: CampaignRules;
  onUpdateProfile?: (updated: Partial<CandidateProfile>) => void;
  onCompleteOcr?: () => void;
  application?: ApplicationBasket | null;
  onRefreshApplication?: () => void;
}

const DEFAULT_DOCUMENTS: RequiredDocumentItem[] = [
  {
    id: 'cin',
    docType: 'CIN',
    title: "Carte Nationale d'Identité (CIN)",
    description: 'Scan recto-verso lisible en un seul document PDF',
    required: true,
  },
  {
    id: 'diplome_master',
    docType: 'DIPLOME_MASTER',
    title: 'Diplôme de Master / Titre d’Ingénieur',
    description: 'Diplôme officiel ou attestation de réussite définitive',
    required: true,
  },
  {
    id: 'releve_notes',
    docType: 'RELEVE_NOTES',
    title: 'Relevés de Notes Universitaires',
    description: 'Relevés de notes complets des semestres de Master (S1 à S4)',
    required: true,
  },
  {
    id: 'diplome_licence',
    docType: 'DIPLOME_LICENCE',
    title: 'Diplôme de Licence / Équivalent',
    description: 'Diplôme ou attestation de réussite de licence',
    required: true,
  },
  {
    id: 'diplome_bac',
    docType: 'DIPLOME_BAC',
    title: 'Diplôme du Baccalauréat',
    description: 'Diplôme original ou attestation du baccalauréat',
    required: true,
  },
  {
    id: 'projet',
    docType: 'PROJET',
    title: 'Projet de Thèse / Note de Recherche',
    description: 'Descriptif synthétique du projet de recherche (2 à 5 pages)',
    required: false,
  },
];

export const OcrCaptureModal: React.FC<OcrCaptureModalProps> = ({
  candidateProfile,
  currentUser,
  activeCampaign,
  onUpdateProfile,
  onCompleteOcr,
  application,
  onRefreshApplication,
}) => {
  const maxPdfSizeMB = activeCampaign?.maxPdfSizeMB || 5;
  const authHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(currentUser?.id ? { 'x-user-id': currentUser.id } : {}),
    ...(currentUser?.role ? { 'x-user-role': currentUser.role } : {}),
  };

  // Check if current user is a fresh candidate account (Sara Idrissi or Sara Berrada)
  const isSara =
    currentUser?.id === 'usr-candidate-sara' ||
    currentUser?.id === 'usr-candidate-berrada' ||
    currentUser?.email?.toLowerCase().includes('sara') ||
    currentUser?.email?.toLowerCase().includes('berrada') ||
    application?.candidateEmail?.toLowerCase().includes('sara') ||
    application?.candidateEmail?.toLowerCase().includes('berrada') ||
    candidateProfile?.nom?.toLowerCase().includes('idrissi') ||
    candidateProfile?.nom?.toLowerCase().includes('berrada');

  const [documentsState, setDocumentsState] = useState<
    Record<string, { isUploaded: boolean; fileName?: string; fileSize?: string }>
  >(() => {
    if (isSara || !application) {
      return {
        cin: { isUploaded: false },
        diplome_master: { isUploaded: false },
        releve_notes: { isUploaded: false },
        diplome_licence: { isUploaded: false },
        diplome_bac: { isUploaded: false },
        projet: { isUploaded: false },
      };
    }

    const initial: Record<string, { isUploaded: boolean; fileName?: string; fileSize?: string }> = {
      cin: { isUploaded: true, fileName: 'CIN_Youssef_Alaoui.pdf' },
      diplome_master: { isUploaded: true, fileName: 'Diplome_Master_IA.pdf' },
      releve_notes: { isUploaded: true, fileName: 'Releves_Notes_S1_S4.pdf' },
      diplome_licence: { isUploaded: true, fileName: 'Licence_Informatique.pdf' },
      diplome_bac: { isUploaded: true, fileName: 'Baccalaureat_Sciences.pdf' },
      projet: { isUploaded: false },
    };

    if (application?.documents && application.documents.length > 0) {
      application.documents.forEach((d) => {
        const key = d.docType.toLowerCase();
        if ((d.storagePath || d.fileUrl || d.fileDataUrl) && d.conformite !== 'MANQUANTE') {
          initial[key] = {
            isUploaded: true,
            fileName: d.uploadedFileName || d.storagePath.split('/').pop() || `${d.title}.pdf`,
            fileSize: d.fileSize,
          };
        } else {
          initial[key] = { isUploaded: false };
        }
      });
    }

    return initial;
  });

  // Synchronize state when application or persisted IndexedDB records change
  useEffect(() => {
    let cancelled = false;

    const syncFromAppAndStorage = async () => {
      const updated: Record<string, { isUploaded: boolean; fileName?: string; fileSize?: string }> = {
        cin: { isUploaded: false },
        diplome_master: { isUploaded: false },
        releve_notes: { isUploaded: false },
        diplome_licence: { isUploaded: false },
        diplome_bac: { isUploaded: false },
        projet: { isUploaded: false },
      };

      if (application?.documents && application.documents.length > 0) {
        application.documents.forEach((d) => {
          const key = d.docType.toLowerCase();
          if ((d.storagePath || d.fileUrl || d.fileDataUrl) && d.conformite !== 'MANQUANTE') {
            updated[key] = {
              isUploaded: true,
              fileName: d.uploadedFileName || d.storagePath.split('/').pop() || `${d.title}.pdf`,
              fileSize: d.fileSize,
            };
          } else {
            updated[key] = { isUploaded: false };
          }
        });
      }

      try {
        const persisted = await getPersistedDocumentsForCandidate({
          candidateId: application?.candidateId || currentUser?.id,
          candidateEmail: application?.candidateEmail || currentUser?.email,
          applicationId: application?.id,
        });

        for (const rec of persisted) {
          const key = rec.docType.toLowerCase();
          if (rec.removed) {
            updated[key] = { isUploaded: false };
          } else if (rec.dataUrl) {
            updated[key] = {
              isUploaded: true,
              fileName: rec.fileName,
              fileSize: rec.fileSize,
            };
          }
        }
      } catch (err) {
        console.warn('Error restoring persisted candidate documents:', err);
      }

      if (!cancelled) {
        setDocumentsState(updated);
      }
    };

    syncFromAppAndStorage();

    return () => {
      cancelled = true;
    };
  }, [application, currentUser?.id, currentUser?.email, isSara]);

  const [activeMessage, setActiveMessage] = useState<{
    type: 'success' | 'error';
    text: string;
    docId?: string;
  } | null>(null);

  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);

  // Camera Scan State & Refs
  const [activeCameraDoc, setActiveCameraDoc] = useState<{
    id: string;
    title: string;
    docType: string;
  } | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera tracks cleanly
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setActiveCameraDoc(null);
    setCameraError(null);
    setIsCapturing(false);
  };

  // Start live webcam stream
  const startCamera = async (doc: { id: string; title: string; docType: string }) => {
    setActiveCameraDoc(doc);
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('API caméra non supportée par ce navigateur.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setCameraError(
        "Accès caméra non disponible ou refusé. Vous pouvez utiliser le bouton « Téléverser » pour envoyer directement votre fichier PDF."
      );
    }
  };

  // Capture frame snapshot and validate
  const captureCameraFrame = async () => {
    if (!videoRef.current || !activeCameraDoc) return;
    setIsCapturing(true);

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Contexte 2D non disponible.');

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

      const fakeFileName = `${activeCameraDoc.docType}_Scan_Camera_${Date.now()}.pdf`;

      const estimatedBytes = Math.round((dataUrl.length * 3) / 4);
      const formattedSize = formatFileSize(estimatedBytes);

      const res = await fetch('/api/documents/validate', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          docType: activeCameraDoc.docType,
          fileName: fakeFileName,
          fileSize: estimatedBytes,
          mimeType: 'image/jpeg',
          isCameraScan: true,
          base64Data: dataUrl,
          applicationId: application?.id,
          candidateName: application?.candidateName || currentUser?.fullName,
          candidateEmail: application?.candidateEmail || currentUser?.email,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.valid === false) {
        setCameraError(data.error || 'Erreur lors de la validation du scan.');
        setIsCapturing(false);
        return;
      }

      await savePersistedDocument({
        candidateId: application?.candidateId || currentUser?.id,
        candidateEmail: application?.candidateEmail || currentUser?.email,
        candidateName: application?.candidateName || currentUser?.fullName,
        applicationId: application?.id,
        docType: activeCameraDoc.docType,
        title: activeCameraDoc.title,
        fileName: fakeFileName,
        fileSize: formattedSize,
        fileSizeBytes: estimatedBytes,
        mimeType: 'image/jpeg',
        dataUrl,
        conformite: 'CONFORME',
        uploadedAt: new Date().toISOString(),
        isCameraScan: true,
      });

      setDocumentsState((prev) => ({
        ...prev,
        [activeCameraDoc.id]: {
          isUploaded: true,
          fileName: fakeFileName,
          fileSize: formattedSize,
        },
      }));

      setActiveMessage({
        type: 'success',
        text: `✓ Numérisation caméra validée : "${activeCameraDoc.title}" (${fakeFileName}). Notification e-mail envoyée.`,
        docId: activeCameraDoc.id,
      });

      stopCamera();
      if (onRefreshApplication) onRefreshApplication();
    } catch (err: any) {
      setCameraError(`Erreur lors de la capture : ${err.message}`);
      setIsCapturing(false);
    }
  };

  // Strict File Upload Validation (PDF only, max 5MB)
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    docId: string,
    docTitle: string,
    docType: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setActiveMessage(null);
    setUploadingDocId(docId);

    const extMatch = file.name.match(/\.([a-zA-Z0-9]+)$/);
    const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : '';

    // 0. Check active campaign open status
    if (activeCampaign && !activeCampaign.isOpen) {
      setActiveMessage({
        type: 'error',
        text: `Campagne clôturée : le dépôt de pièces est fermé pour "${activeCampaign.label}".`,
        docId,
      });
      setUploadingDocId(null);
      e.target.value = '';
      return;
    }

    // 1. Strict PDF-Only Check
    if (ext !== '.pdf') {
      setActiveMessage({
        type: 'error',
        text: `Format non conforme : seuls les fichiers PDF sont acceptés. Les fichiers images (${ext || 'inconnu'}, JPG, PNG, etc.) sont immédiatement rejetés.`,
        docId,
      });
      setUploadingDocId(null);
      e.target.value = '';
      return;
    }

    // 2. Strict Dynamic Campaign PDF Size Check
    const maxBytes = maxPdfSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setActiveMessage({
        type: 'error',
        text: `Taille limite dépassée : le fichier fait ${sizeMB} Mo. La limite autorisée pour la campagne active est de ${maxPdfSizeMB}.0 Mo maximum.`,
        docId,
      });
      setUploadingDocId(null);
      e.target.value = '';
      return;
    }

    // 3. Inappropriate File Check
    const lowerName = file.name.toLowerCase();
    const forbidden = ['pinterest', 'wallpaper', 'paysage', 'landscape', 'meme', 'vacances', 'nature'];
    if (forbidden.some((kw) => lowerName.includes(kw))) {
      setActiveMessage({
        type: 'error',
        text: `Fichier rejeté : document non académique détecté (${file.name}). Veuillez déposer le document officiel au format PDF.`,
        docId,
      });
      setUploadingDocId(null);
      e.target.value = '';
      return;
    }

    // 4. Read real PDF binary and send to Server-Side Validation & Storage
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
          docType,
          fileName: file.name,
          fileSize: file.size,
          mimeType: 'application/pdf',
          base64Data,
          applicationId: application?.id,
          candidateName: application?.candidateName || currentUser?.fullName,
          candidateEmail: application?.candidateEmail || currentUser?.email,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.valid === false) {
        setActiveMessage({
          type: 'error',
          text: data.error || `Erreur de conformité sur "${file.name}".`,
          docId,
        });
      } else {
        const formattedSize = formatFileSize(file.size);

        await savePersistedDocument({
          candidateId: application?.candidateId || currentUser?.id,
          candidateEmail: application?.candidateEmail || currentUser?.email,
          candidateName: application?.candidateName || currentUser?.fullName,
          applicationId: application?.id,
          docType,
          title: docTitle,
          fileName: file.name,
          fileSize: formattedSize,
          fileSizeBytes: file.size,
          mimeType: file.type || 'application/pdf',
          dataUrl: base64Data,
          conformite: 'CONFORME',
          uploadedAt: new Date().toISOString(),
          isCameraScan: false,
        });

        setDocumentsState((prev) => ({
          ...prev,
          [docId]: {
            isUploaded: true,
            fileName: file.name,
            fileSize: formattedSize,
          },
        }));

        setActiveMessage({
          type: 'success',
          text: `✓ Document "${docTitle}" validé et enregistré (${file.name}). E-mail de confirmation transmis.`,
          docId,
        });

        if (onRefreshApplication) onRefreshApplication();
      }
    } catch (err: any) {
      setActiveMessage({
        type: 'error',
        text: `Erreur lors de l’envoi : ${err.message}`,
        docId,
      });
    } finally {
      setUploadingDocId(null);
      e.target.value = '';
    }
  };

  // "Retirer" Handler: Removes the document and re-displays upload options
  const handleRemoveDocument = async (docId: string, docTitle: string, docType: string) => {
    try {
      setDocumentsState((prev) => ({
        ...prev,
        [docId]: {
          isUploaded: false,
          fileName: undefined,
          fileSize: undefined,
        },
      }));

      await markPersistedDocumentRemoved({
        candidateId: application?.candidateId || currentUser?.id,
        candidateEmail: application?.candidateEmail || currentUser?.email,
        applicationId: application?.id,
        docType,
      });

      await fetch('/api/documents/remove', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          docType,
          applicationId: application?.id,
          candidateName: application?.candidateName || currentUser?.fullName,
          candidateEmail: application?.candidateEmail || currentUser?.email,
        }),
      });

      setActiveMessage({
        type: 'success',
        text: `Pièce "${docTitle}" retirée avec succès. Vous pouvez maintenant téléverser un nouveau PDF ou utiliser le scan caméra.`,
        docId,
      });

      if (onRefreshApplication) onRefreshApplication();
    } catch (err: any) {
      console.error(err);
    }
  };

  const getDocIcon = (docType: string) => {
    switch (docType) {
      case 'CIN':
        return <CreditCard className="w-4 h-4 text-slate-700" />;
      case 'DIPLOME_MASTER':
      case 'DIPLOME_LICENCE':
      case 'DIPLOME_BAC':
        return <Award className="w-4 h-4 text-slate-700" />;
      default:
        return <FileText className="w-4 h-4 text-slate-700" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Context Feedback Alert */}
      {activeMessage && (
        <div
          className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 animate-in fade-in duration-150 ${
            activeMessage.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {activeMessage.type === 'error' ? (
              <XCircle className="w-4 h-4 text-red-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span className="font-medium">{activeMessage.text}</span>
          </div>

          <button
            type="button"
            onClick={() => setActiveMessage(null)}
            className="text-xs font-semibold underline text-slate-600 hover:text-slate-900 cursor-pointer shrink-0"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Main Clean Document List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {DEFAULT_DOCUMENTS.map((doc) => {
          const docState = documentsState[doc.id] || { isUploaded: false };
          const isUploading = uploadingDocId === doc.id;

          return (
            <div
              key={doc.id}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
            >
              {/* Document Info */}
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                  {getDocIcon(doc.docType)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-xs sm:text-sm text-slate-900">
                      {doc.title}
                    </h3>

                    {docState.isUploaded ? (
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

                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                    {docState.fileName ? (
                      <span className="font-mono text-slate-700">
                        Fichier : {docState.fileName}
                        {docState.fileSize ? ` (${docState.fileSize})` : ''}
                      </span>
                    ) : (
                      doc.description
                    )}
                  </p>
                </div>
              </div>

              {/* Action Buttons: Dépôt, Retrait & Scan Caméra */}
              <div className="shrink-0 flex items-center gap-2 self-start sm:self-auto">
                {docState.isUploaded ? (
                  /* Replaced 'Remplacer' by strict 'Retirer' button */
                  <button
                    type="button"
                    onClick={() => handleRemoveDocument(doc.id, doc.title, doc.docType)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-red-50 text-red-700 border border-red-200 hover:border-red-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Supprimer cette pièce pour déposer un nouveau document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Retirer</span>
                  </button>
                ) : (
                  /* Two options when document is pending: Upload PDF OR Scan Camera */
                  <div className="flex items-center gap-1.5">
                    {/* 1. Téléverser PDF */}
                    <label
                      className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                        isUploading
                          ? 'bg-slate-200 text-slate-600 cursor-not-allowed'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploading ? 'Contrôle...' : 'Téléverser (PDF)'}</span>
                      <input
                        type="file"
                        accept=".pdf"
                        disabled={isUploading}
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, doc.id, doc.title, doc.docType)}
                      />
                    </label>

                    {/* 2. Scanner via Caméra */}
                    <button
                      type="button"
                      onClick={() => startCamera(doc)}
                      className="px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                      title="Scanner avec la webcam du navigateur"
                    >
                      <Camera className="w-3.5 h-3.5 text-slate-600" />
                      <span>Scanner caméra</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Camera Scanner Modal */}
      {activeCameraDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden border border-slate-200 shadow-2xl flex flex-col text-slate-900">
            {/* Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-white" />
                <div>
                  <h3 className="font-bold text-sm">Scanner via Caméra</h3>
                  <p className="text-[11px] text-slate-300 truncate max-w-xs">
                    {activeCameraDoc.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={stopCamera}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Camera Viewport */}
            <div className="p-4 bg-slate-950 flex flex-col items-center justify-center min-h-[300px] relative">
              {cameraError ? (
                <div className="text-center p-6 text-slate-300 space-y-3">
                  <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                  <p className="text-xs leading-relaxed max-w-sm">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => startCamera(activeCameraDoc)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Réessayer</span>
                  </button>
                </div>
              ) : (
                <div className="relative w-full aspect-4/3 bg-black rounded-2xl overflow-hidden flex items-center justify-center">
                  <video
                    ref={(el) => {
                      videoRef.current = el;
                      if (el && streamRef.current) {
                        el.srcObject = streamRef.current;
                      }
                    }}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Framing Overlay */}
                  <div className="absolute inset-4 border-2 border-dashed border-white/70 rounded-xl pointer-events-none flex flex-col justify-between p-3">
                    <span className="text-[10px] font-semibold bg-black/60 text-white px-2 py-0.5 rounded backdrop-blur-xs self-start">
                      Cadrez le document officiel
                    </span>
                    <span className="text-[10px] font-mono text-white/80 self-end">
                      PDF Numérisation auto
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Action Footer */}
            <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={stopCamera}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Annuler
              </button>

              <button
                type="button"
                disabled={Boolean(cameraError) || isCapturing}
                onClick={captureCameraFrame}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Camera className="w-4 h-4" />
                <span>{isCapturing ? 'Capture & Validation...' : 'Capturer & Numériser'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
