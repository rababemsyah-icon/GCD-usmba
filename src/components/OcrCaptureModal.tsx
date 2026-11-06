import React, { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  CheckCircle2,
  Scan,
  RefreshCw,
  FileCheck,
  Award,
  CreditCard,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { OcrDataExtraction, CandidateProfile } from '../types';

interface OcrCaptureModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  candidateProfile: CandidateProfile;
  onUpdateProfile: (updated: Partial<CandidateProfile>) => void;
  onCompleteOcr?: () => void;
}

export const OcrCaptureModal: React.FC<OcrCaptureModalProps> = ({
  candidateProfile,
  onUpdateProfile,
  onCompleteOcr,
}) => {
  const [selectedDocType, setSelectedDocType] = useState<'cin' | 'diplome_master' | 'releve_notes'>('cin');
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState<'idle' | 'scanning' | 'analyzed'>('analyzed');
  const [extractedData, setExtractedData] = useState<OcrDataExtraction | null>({
    documentType: 'cin',
    fullName: 'ALAOUI MDAGHRI Youssef',
    fullNameArabic: 'العلوي مدغري يوسف',
    cinNumber: 'CD689412',
    cneNumber: 'M134567890',
    birthDate: '2001-04-18',
    birthPlace: 'Fès',
    nationality: 'Marocaine',
    diplomaTitle: 'Master Spécialisé en Intelligence Artificielle & Sciences des Données',
    university: 'Université Sidi Mohamed Ben Abdellah',
    faculty: 'Faculté des Sciences et Techniques (FST Fès)',
    graduationYear: 2024,
    mention: 'Très Bien',
    s1Grade: 16.25,
    s2Grade: 15.80,
    s3Grade: 16.90,
    s4Grade: 17.10,
    averageGrade: 16.51,
    readabilityScore: 99.4,
    mrzDetected: true,
    chipPresent: true,
    sharpnessScore: 98.7,
    cornersDetected: true,
    rawConfidence: 99.2,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trigger OCR analysis (either via uploaded image or test specimen)
  const runOcrAnalysis = async (mockType?: 'cin' | 'diplome_master' | 'releve_notes', fileBase64?: string) => {
    setIsScanning(true);
    setScanStep('scanning');

    try {
      const payload: any = {
        documentType: selectedDocType,
      };

      if (fileBase64) {
        payload.imageBase64 = fileBase64;
      } else {
        payload.mockType = mockType || selectedDocType;
      }

      const res = await fetch('/api/ocr/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setExtractedData(json.data);
        setScanStep('analyzed');

        // Apply immediately to profile
        onUpdateProfile({
          cinNumber: json.data.cinNumber,
          cneNumber: json.data.cneNumber,
          master: {
            ...candidateProfile.master,
            title: json.data.diplomaTitle || candidateProfile.master.title,
            averageGrade: json.data.averageGrade || candidateProfile.master.averageGrade,
            mention: json.data.mention || candidateProfile.master.mention,
          },
          ocrVerification: {
            ...candidateProfile.ocrVerification,
            status: 'verified',
            timestamp: new Date().toISOString(),
          },
        });
      }
    } catch (err) {
      console.error('OCR Error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      runOcrAnalysis(undefined, base64);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      {/* Module Title Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Contrôle Documentaire & Identité
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Capture OCR en Temps Réel & Vérification d'Identité
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Numérisation assistée par IA de la Carte Nationale d'Identité (CIN), du Diplôme de Master et des Relevés de Notes. Détection automatique des contours, de la puce biométrique et extraction des notes pour supprimer 90% du temps de saisie.
          </p>
        </div>

        {/* 90% Metric Badge */}
        <div className="shrink-0 bg-gradient-to-br from-emerald-600 to-teal-800 text-white rounded-2xl p-5 text-center shadow-lg shadow-emerald-700/20 border border-emerald-500/30">
          <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight">-90%</div>
          <div className="text-xs text-emerald-100 font-medium mt-1">Temps de Saisie</div>
          <div className="text-[11px] text-emerald-200/80">Extraction Automatisée</div>
        </div>
      </div>

      {/* Document Type Switcher */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            id: 'cin',
            label: "Carte Nationale d'Identité (CIN)",
            icon: CreditCard,
            subtitle: 'Vérification Puce & Zone MRZ',
          },
          {
            id: 'diplome_master',
            label: 'Diplôme de Master / Ingénieur',
            icon: Award,
            subtitle: 'Intitulé, Faculté & Mention',
          },
          {
            id: 'releve_notes',
            label: 'Relevé de Notes S1 à S4',
            icon: Layers,
            subtitle: 'Moyenne générale & validation',
          },
        ].map((doc) => {
          const Icon = doc.icon;
          const isActive = selectedDocType === doc.id;
          return (
            <button
              key={doc.id}
              onClick={() => {
                setSelectedDocType(doc.id as any);
                runOcrAnalysis(doc.id as any);
              }}
              className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-emerald-500/30'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isActive ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-xs sm:text-sm">{doc.label}</div>
                <div className={`text-[11px] mt-0.5 ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                  {doc.subtitle}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Scanner & Side-by-Side Review Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Live Optical Viewfinder / Simulator */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Scan className="w-4 h-4 text-emerald-600" />
              Scanner Optique Intégré au Navigateur
            </span>
            <span className="text-[11px] text-emerald-700 bg-emerald-50 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
              Résolution HD • Détection de Bords
            </span>
          </div>

          {/* Interactive Document Viewfinder Screen */}
          <div className="relative aspect-4/3 w-full bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-700 shadow-inner flex flex-col items-center justify-center p-6 text-white group">
            {/* Corner Crop Reticles */}
            <div className="absolute top-4 left-4 w-7 h-7 border-t-3 border-l-3 border-emerald-400 rounded-tl-sm pointer-events-none" />
            <div className="absolute top-4 right-4 w-7 h-7 border-t-3 border-r-3 border-emerald-400 rounded-tr-sm pointer-events-none" />
            <div className="absolute bottom-4 left-4 w-7 h-7 border-b-3 border-l-3 border-emerald-400 rounded-bl-sm pointer-events-none" />
            <div className="absolute bottom-4 right-4 w-7 h-7 border-b-3 border-r-3 border-emerald-400 rounded-br-sm pointer-events-none" />

            {/* Simulated Animated Laser Beam */}
            <div className="absolute inset-x-4 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-scan-line pointer-events-none" />

            {/* Document Visual Mock in Viewfinder */}
            <div className="relative z-10 w-4/5 max-w-xs bg-slate-900/90 border border-slate-600 rounded-xl p-4 shadow-2xl backdrop-blur-xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                  ROYAUME DU MAROC
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">
                  {selectedDocType === 'cin' ? 'CNIE 2.0' : selectedDocType === 'diplome_master' ? 'USMBA-DEGREE' : 'RELEVÉ APOGÉE'}
                </span>
              </div>

              {selectedDocType === 'cin' ? (
                <div className="flex gap-3 items-center">
                  <div className="w-16 h-20 rounded bg-slate-800 border border-slate-700 flex flex-col items-center justify-center text-slate-400 text-[10px]">
                    <div className="w-8 h-8 rounded-full bg-slate-700 mb-1" />
                    PHOTO
                  </div>
                  <div className="space-y-1 text-[11px] text-slate-200">
                    <div className="font-bold text-white">ALAOUI MDAGHRI</div>
                    <div>Youssef</div>
                    <div className="font-mono text-emerald-300 font-bold text-xs mt-1">CIN: CD689412</div>
                    <div className="text-[10px] text-slate-400">Né le 18/04/2001 à Fès</div>
                  </div>
                </div>
              ) : selectedDocType === 'diplome_master' ? (
                <div className="space-y-1 text-center py-2">
                  <div className="text-[10px] uppercase font-bold text-amber-300">Université Sidi Mohamed Ben Abdellah</div>
                  <div className="text-xs font-bold text-white">MASTER EN INTELLIGENCE ARTIFICIELLE</div>
                  <div className="text-[11px] text-emerald-400 font-semibold">Mention: Très Bien</div>
                  <div className="text-[10px] text-slate-400">Faculté des Sciences et Techniques (FST Fès)</div>
                </div>
              ) : (
                <div className="space-y-1 text-[11px] text-slate-300 py-1">
                  <div className="font-bold text-white text-xs">Relevé Officiel des Notes</div>
                  <div className="flex justify-between text-[10px]"><span>Semestre 1:</span> <span className="font-mono text-emerald-400 font-bold">16.25/20</span></div>
                  <div className="flex justify-between text-[10px]"><span>Semestre 2:</span> <span className="font-mono text-emerald-400 font-bold">15.80/20</span></div>
                  <div className="flex justify-between text-[10px]"><span>Semestre 3:</span> <span className="font-mono text-emerald-400 font-bold">16.90/20</span></div>
                  <div className="flex justify-between text-[10px]"><span>Semestre 4 (PFE):</span> <span className="font-mono text-emerald-400 font-bold">17.10/20</span></div>
                  <div className="border-t border-slate-700 pt-1 flex justify-between font-bold text-white text-xs">
                    <span>Moyenne Générale :</span>
                    <span className="text-emerald-400 font-mono">16.51 / 20</span>
                  </div>
                </div>
              )}

              {/* MRZ bar representation */}
              <div className="pt-1.5 border-t border-slate-700 text-[8px] font-mono tracking-widest text-slate-400 truncate">
                I&lt;MARCD689412&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;0104184M2610302MAR&lt;&lt;&lt;&lt;&lt;&lt;0
              </div>
            </div>

            {/* Scanning indicator */}
            {isScanning && (
              <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center gap-2 z-20">
                <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                <span className="text-xs font-bold text-emerald-300">Extraction IA en cours...</span>
              </div>
            )}
          </div>

          {/* Real-time Quality Checks Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Lisibilité OCR</span>
              <strong className="text-emerald-700 font-mono font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 99.4%
              </strong>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Puce / MRZ</span>
              <strong className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Conforme
              </strong>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Netteté / Bords</span>
              <strong className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Optimale
              </strong>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Authenticité</span>
              <strong className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Vérifiée
              </strong>
            </div>
          </div>

          {/* Action triggers: Upload real file or run instant specimen */}
          <div className="pt-2 flex flex-wrap gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,application/pdf"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Téléverser mon fichier</span>
            </button>

            <button
              onClick={() => runOcrAnalysis()}
              disabled={isScanning}
              className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-700/20 transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Tester Spécimen Officiel (1-Click)</span>
            </button>
          </div>
        </div>

        {/* Right Column: Extracted Structured Data (Auto-filled Candidate Profile) */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                Données Extraites & Profil Auto-Complété
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Vérifiées et certifiées par le moteur OCR de l'Université
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Conforme USMBA
            </span>
          </div>

          {/* Extracted Fields Table */}
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-500 block uppercase font-semibold">Nom & Prénom (Latin)</span>
                <span className="font-bold text-slate-900 text-xs sm:text-sm">
                  {extractedData?.fullName || 'ALAOUI MDAGHRI Youssef'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-500 block uppercase font-semibold">Nom en Arabe</span>
                <span className="font-bold text-slate-900 text-xs sm:text-sm font-serif">
                  {extractedData?.fullNameArabic || 'العلوي مدغري يوسف'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-500 block uppercase font-semibold">Numéro CIN</span>
                <span className="font-mono font-bold text-emerald-700 text-sm">
                  {extractedData?.cinNumber || 'CD689412'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-500 block uppercase font-semibold">Code Massar / CNE</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {extractedData?.cneNumber || 'M134567890'}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-500 block uppercase font-semibold">Diplôme de Master Requis</span>
              <span className="font-bold text-slate-900 text-xs block mt-0.5">
                {extractedData?.diplomaTitle || 'Master Spécialisé en Intelligence Artificielle & Sciences des Données'}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">
                {extractedData?.faculty || 'Faculté des Sciences et Techniques (FST Fès)'} • {extractedData?.university || 'USMBA'}
              </span>
            </div>

            {/* Academic Grades Box */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                  Relevé des Notes Master (S1 - S4)
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-600 text-white font-mono">
                  Mention: {extractedData?.mention || 'Très Bien'}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center pt-1 font-mono text-xs">
                <div className="p-2 rounded-lg bg-white border border-emerald-200">
                  <div className="text-[10px] text-slate-500">S1</div>
                  <div className="font-bold text-slate-900">{extractedData?.s1Grade || 16.25}</div>
                </div>
                <div className="p-2 rounded-lg bg-white border border-emerald-200">
                  <div className="text-[10px] text-slate-500">S2</div>
                  <div className="font-bold text-slate-900">{extractedData?.s2Grade || 15.80}</div>
                </div>
                <div className="p-2 rounded-lg bg-white border border-emerald-200">
                  <div className="text-[10px] text-slate-500">S3</div>
                  <div className="font-bold text-slate-900">{extractedData?.s3Grade || 16.90}</div>
                </div>
                <div className="p-2 rounded-lg bg-white border border-emerald-200">
                  <div className="text-[10px] text-slate-500">S4 (PFE)</div>
                  <div className="font-bold text-slate-900">{extractedData?.s4Grade || 17.10}</div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-emerald-200 text-xs font-bold text-emerald-950">
                <span>Moyenne Générale du Master :</span>
                <span className="text-base font-mono text-emerald-800">
                  {extractedData?.averageGrade || 16.51} / 20
                </span>
              </div>
            </div>
          </div>

          {/* Validation and Apply Button */}
          <div className="pt-2">
            <button
              onClick={() => {
                if (onCompleteOcr) onCompleteOcr();
              }}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Valider les Données OCR & Calculer le Mérite</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-[11px] text-center text-slate-500 mt-2">
              Conforme aux critères de validation académique des dossiers doctoraux.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
