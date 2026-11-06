import React, { useEffect } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  Printer,
  QrCode,
  Lock,
  Building2,
  ArrowLeft,
} from 'lucide-react';
import { ApplicationBasket, Subject } from '../types';

interface CharterViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: ApplicationBasket | null;
  subject: Subject | null;
  onSignByRole: (role: string) => void;
}

export const CharterViewerModal: React.FC<CharterViewerModalProps> = ({
  isOpen,
  onClose,
  application,
  subject,
  onSignByRole,
}) => {
  // Support Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !application) return null;

  const signatures = application.signatures;
  const allSigned =
    signatures.candidat.status === 'Signed' &&
    signatures.directeur.status === 'Signed' &&
    signatures.chef_labo.status === 'Signed' &&
    signatures.directeur_ced.status === 'Signed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 overflow-y-auto">
      {/* Backdrop with click-to-close */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        title="Cliquer pour fermer"
      />

      <div
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-300 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Control Bar */}
        <div className="bg-slate-900 text-white p-4 px-6 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-xs flex items-center gap-1.5 cursor-pointer"
              title="Retour / Fermer l'aperçu"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline font-semibold">Fermer</span>
            </button>
            <div>
              <span className="font-bold text-sm block">Charte des Thèses & Fiche d'Inscription Officielle</span>
              <span className="text-[11px] text-slate-400 block hidden sm:block">
                Document Officiel PDF/A-3 • Certificat Cryptographique SHA-256
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-xs flex items-center gap-1.5 cursor-pointer"
              title="Imprimer ou Exporter en PDF"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimer</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white transition-colors cursor-pointer"
              title="Fermer l'aperçu (Échap)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Document formatted as official Academic Charter */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-10 bg-slate-100/70">
          <div className="max-w-3xl mx-auto bg-white p-6 sm:p-12 rounded-2xl shadow-md border border-slate-200 text-slate-900 space-y-8 relative">
            {/* Watermark / Digital Seal */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-[0.03] select-none text-center">
              <Building2 className="w-96 h-96 mx-auto" />
              <div className="text-4xl font-extrabold uppercase tracking-widest mt-4">
                UNIVERSITÉ SIDI MOHAMED BEN ABDELLAH
              </div>
            </div>

            {/* Official Header */}
            <div className="text-center space-y-1 border-b-2 border-slate-900 pb-6">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-700">
                Royaume du Maroc • Université Sidi Mohamed Ben Abdellah de Fès
              </div>
              <div className="text-sm font-semibold text-slate-600">
                Pôle des Études Doctorales • {subject?.cedoc || 'CEDoc Sciences et Technologies'}
              </div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 pt-3">
                CHARTE DES THÈSES & CONTRAT DOCTORAL
              </h1>
              <div className="text-xs font-mono text-emerald-800 font-bold bg-emerald-50 inline-block px-3 py-1 rounded-full border border-emerald-200 mt-1">
                Année Universitaire 2026 / 2027 • Réf. Inscription: {application.id}
              </div>
            </div>

            {/* Candidate & Research Identification */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] block border-b border-slate-200 pb-1">
                  1. Identification du Doctorant
                </span>
                <div><strong>Nom & Prénom :</strong> {application.candidateName}</div>
                <div><strong>Numéro CIN :</strong> <span className="font-mono">{application.candidateCin}</span> (Certifié OCR)</div>
                <div><strong>Code Massar / CNE :</strong> <span className="font-mono">{application.candidateCne}</span></div>
                <div><strong>E-mail Institutionnel :</strong> {application.candidateEmail}</div>
                <div><strong>Diplôme d'Accès :</strong> Master IA & Sciences des Données (FST Fès)</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] block border-b border-slate-200 pb-1">
                  2. Encadrement & Structure d'Accueil
                </span>
                <div><strong>Directeur de Thèse :</strong> {subject?.professorName || 'Pr. Mustapha Bennani'}</div>
                <div><strong>Établissement :</strong> {subject?.establishment || 'FST Fès'}</div>
                <div><strong>Laboratoire :</strong> {subject?.laboratory || 'LISER'}</div>
                <div><strong>Code du Sujet :</strong> <span className="font-mono">{subject?.code || 'CEDOC-ST-2026-001'}</span></div>
              </div>
            </div>

            {/* Subject Title */}
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-950 space-y-1">
              <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-800 block">
                Intitulé Officiel du Sujet de Recherche Agréé
              </span>
              <div className="font-extrabold text-sm text-slate-900">
                {subject?.title}
              </div>
            </div>

            {/* Legal Articles Excerpt */}
            <div className="space-y-3 text-[11px] text-slate-700 leading-relaxed border-t border-slate-200 pt-4">
              <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                Extrait des Dispositions Réglementaires (Décret Ministériel & USMBA)
              </h4>
              <p>
                <strong>Article 1 - Objet de la Charte :</strong> La présente charte définit les engagements réciproques du doctorant, du directeur de thèse, du directeur du laboratoire et du directeur du CEDoc. Elle garantit les conditions scientifiques, matérielles et déontologiques indispensables à la préparation de la thèse de doctorat.
              </p>
              <p>
                <strong>Article 2 - Suivi et Inscription :</strong> L'inscription administrative, les rapports d'avancement périodiques et les autorisations de soutenance sont enregistrés et archivés au sein du système académique officiel de l'Université.
              </p>
              <p>
                <strong>Article 3 - Confidentialité et Propriété Intellectuelle :</strong> Les résultats, brevets et publications découlant des travaux de recherche demeurent soumis aux dispositions régissant la propriété intellectuelle au sein de l'Université Sidi Mohamed Ben Abdellah.
              </p>
            </div>

            {/* Cryptographic Signature Block (4 Signers Chain) */}
            <div className="border-t-2 border-slate-900 pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  Chaîne de Signatures Électroniques Certifiées (Norme USMBA PKI)
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    allSigned
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  {allSigned ? 'Validé à 100% (4/4 Signatures)' : 'En attente de signature finale CED'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* 1. Candidat */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 relative space-y-1.5">
                  <div className="font-bold text-slate-800 text-[11px] uppercase">
                    1. Le Doctorant
                  </div>
                  <div className="text-slate-900 font-semibold">{signatures.candidat.signerName}</div>
                  {signatures.candidat.status === 'Signed' ? (
                    <div className="pt-1 text-[10px] space-y-0.5">
                      <div className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Signé numériquement le {signatures.candidat.signedAt?.slice(0, 10)}
                      </div>
                      <div className="font-mono text-slate-500 truncate">
                        Série: {signatures.candidat.certificateSerial}
                      </div>
                      <div className="font-mono text-[9px] text-slate-400 truncate">
                        Hash: {signatures.candidat.signatureHash}
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => onSignByRole('Candidat')}
                      className="mt-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer"
                    >
                      Signer en tant que Candidat
                    </button>
                  )}
                </div>

                {/* 2. Directeur de Thèse */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 relative space-y-1.5">
                  <div className="font-bold text-slate-800 text-[11px] uppercase">
                    2. Le Directeur de Thèse
                  </div>
                  <div className="text-slate-900 font-semibold">{signatures.directeur.signerName}</div>
                  {signatures.directeur.status === 'Signed' ? (
                    <div className="pt-1 text-[10px] space-y-0.5">
                      <div className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Signé numériquement le {signatures.directeur.signedAt?.slice(0, 10)}
                      </div>
                      <div className="font-mono text-slate-500 truncate">
                        Série: {signatures.directeur.certificateSerial}
                      </div>
                      <div className="font-mono text-[9px] text-slate-400 truncate">
                        Hash: {signatures.directeur.signatureHash}
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => onSignByRole('Directeur')}
                      className="mt-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer"
                    >
                      Signer (Directeur)
                    </button>
                  )}
                </div>

                {/* 3. Chef de Laboratoire */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 relative space-y-1.5">
                  <div className="font-bold text-slate-800 text-[11px] uppercase">
                    3. Le Directeur du Laboratoire
                  </div>
                  <div className="text-slate-900 font-semibold">{signatures.chef_labo.signerName}</div>
                  {signatures.chef_labo.status === 'Signed' ? (
                    <div className="pt-1 text-[10px] space-y-0.5">
                      <div className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Signé numériquement le {signatures.chef_labo.signedAt?.slice(0, 10)}
                      </div>
                      <div className="font-mono text-slate-500 truncate">
                        Série: {signatures.chef_labo.certificateSerial}
                      </div>
                      <div className="font-mono text-[9px] text-slate-400 truncate">
                        Hash: {signatures.chef_labo.signatureHash}
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => onSignByRole('Chef_Labo')}
                      className="mt-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer"
                    >
                      Signer (Chef de Labo)
                    </button>
                  )}
                </div>

                {/* 4. Directeur du CEDoc */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 relative space-y-1.5">
                  <div className="font-bold text-slate-800 text-[11px] uppercase">
                    4. Le Directeur du CEDoc
                  </div>
                  <div className="text-slate-900 font-semibold">{signatures.directeur_ced.signerName}</div>
                  {signatures.directeur_ced.status === 'Signed' ? (
                    <div className="pt-1 text-[10px] space-y-0.5">
                      <div className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Signé numériquement le {signatures.directeur_ced.signedAt?.slice(0, 10)}
                      </div>
                      <div className="font-mono text-slate-500 truncate">
                        Série: {signatures.directeur_ced.certificateSerial}
                      </div>
                      <div className="font-mono text-[9px] text-slate-400 truncate">
                        Hash: {signatures.directeur_ced.signatureHash}
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => onSignByRole('Directeur_CED')}
                      className="mt-1 px-3 py-1 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-lg text-xs cursor-pointer"
                    >
                      Valider & Signer (Directeur CEDoc)
                    </button>
                  )}
                </div>
              </div>

              {/* QR Code & Authority Block */}
              <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                <div className="space-y-1 text-center sm:text-left">
                  <div className="font-bold text-amber-400 uppercase tracking-widest text-[10px]">
                    Sceau Numérique & Autorité de Certification
                  </div>
                  <div className="text-slate-300">
                    Certificat délivré par l'Infrastructure de Clé Publique (PKI) de l'USMBA.
                  </div>
                  <div className="font-mono text-[10px] text-slate-400 truncate max-w-md">
                    DocHash: {application.charterDocumentHash}
                  </div>
                </div>

                <div className="p-2 bg-white rounded-lg shrink-0">
                  <QrCode className="w-16 h-16 text-slate-900" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Strip with explicit and functional Close Button */}
        <div className="p-4 px-6 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 hidden sm:block">
            Document juridique faisant foi au sens de la loi 53-05 relative à l'échange électronique des données juridiques.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto py-2.5 px-6 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4 text-slate-300" />
            <span>Fermer l'aperçu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
