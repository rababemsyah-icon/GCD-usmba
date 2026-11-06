import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ThreeArrowsMenuDrawer } from './components/ThreeArrowsMenuDrawer';
import { SubjectCatalog } from './components/SubjectCatalog';
import { SubjectBasketDrawer } from './components/SubjectBasketDrawer';
import { SubjectDetailModal } from './components/SubjectDetailModal';
import { AuthModal } from './components/AuthModal';
import { OcrCaptureModal } from './components/OcrCaptureModal';
import { AcademicMatchingPanel } from './components/AcademicMatchingPanel';
import { CandidateDashboard } from './components/CandidateDashboard';
import { SupervisorLabDashboard } from './components/SupervisorLabDashboard';
import { CharterViewerModal } from './components/CharterViewerModal';
import { AuditTrailPanel } from './components/AuditTrailPanel';
import {
  INITIAL_SUBJECTS,
  SAMPLE_CANDIDATE_PROFILE,
  INITIAL_APPLICATION,
  INITIAL_EXCHANGE_MESSAGES,
} from './data/mockDatabase';
import {
  Subject,
  BasketChoice,
  CandidateProfile,
  ApplicationBasket,
  ThesisExchangeMessage,
  UserRole,
  User,
} from './types';
import { CheckCircle2, AlertTriangle, ArrowLeft, ShieldCheck, Printer } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('catalog');
  const [currentRole, setCurrentRole] = useState<UserRole>('candidat');

  const [subjects, setSubjects] = useState<Subject[]>(INITIAL_SUBJECTS);
  const [basketChoices, setBasketChoices] = useState<BasketChoice[]>([
    { subjectId: 'subj-1', rank: 1, addedAt: new Date().toISOString() },
    { subjectId: 'subj-2', rank: 2, addedAt: new Date().toISOString() },
    { subjectId: 'subj-7', rank: 3, addedAt: new Date().toISOString() },
  ]);

  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile>(SAMPLE_CANDIDATE_PROFILE);
  const [applications, setApplications] = useState<ApplicationBasket[]>([JSON.parse(JSON.stringify(INITIAL_APPLICATION))]);
  const [exchangeMessages, setExchangeMessages] = useState<ThesisExchangeMessage[]>(INITIAL_EXCHANGE_MESSAGES);

  // Modals state
  const [isThreeArrowsMenuOpen, setIsThreeArrowsMenuOpen] = useState(false);
  const [isBasketOpen, setIsBasketOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCharterModalOpen, setIsCharterModalOpen] = useState(false);
  const [selectedDetailSubject, setSelectedDetailSubject] = useState<Subject | null>(null);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchApplications = () => {
    fetch('/api/applications')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setApplications(data);
        }
      })
      .catch((err) => console.log('Using local applications:', err));
  };

  // Fetch subjects and applications from server on mount
  useEffect(() => {
    fetch('/api/subjects')
      .then((res) => res.json())
      .then((data) => {
        if (data.subjects) setSubjects(data.subjects);
      })
      .catch((err) => console.log('Using local subjects:', err));

    fetchApplications();
  }, []);

  // Basket Management Handlers
  const handleAddChoice = (subject: Subject) => {
    if (basketChoices.length >= 3) {
      showToast('Le panier contient déjà le maximum de 3 sujets.', 'error');
      return;
    }
    if (basketChoices.some((c) => c.subjectId === subject.id)) {
      showToast('Ce sujet figure déjà dans vos choix.', 'info');
      return;
    }

    const nextRank = (basketChoices.length + 1) as 1 | 2 | 3;
    const newChoices = [
      ...basketChoices,
      {
        subjectId: subject.id,
        rank: nextRank,
        addedAt: new Date().toISOString(),
      },
    ];
    setBasketChoices(newChoices);
    showToast(`Sujet ajouté en Choix n°${nextRank} au panier !`, 'success');
  };

  const handleRemoveChoice = (subjectId: string) => {
    const remaining = basketChoices
      .filter((c) => c.subjectId !== subjectId)
      .map((c, index) => ({
        ...c,
        rank: (index + 1) as 1 | 2 | 3,
      }));
    setBasketChoices(remaining);
    showToast('Sujet retiré du panier.', 'info');
  };

  const handleMoveChoice = (currentIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= basketChoices.length) return;

    const reordered = [...basketChoices];
    const temp = reordered[currentIndex];
    reordered[currentIndex] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    const finalChoices = reordered.map((c, idx) => ({
      ...c,
      rank: (idx + 1) as 1 | 2 | 3,
    }));
    setBasketChoices(finalChoices);
    showToast('Ordre de préférence mis à jour.', 'success');
  };

  // Validation Flow: Basket -> Auth -> OCR / Candidate Dashboard
  const handleProceedToAuth = () => {
    if (basketChoices.length !== 3) {
      showToast('Sélectionnez exactement 3 sujets avant de valider.', 'error');
      return;
    }
    setIsAuthModalOpen(true);
  };

  const handleSuccessAuth = async (user: Partial<User>) => {
    try {
      const response = await fetch('/api/basket/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: user.id,
          candidateName: user.fullName,
          candidateEmail: user.email,
          candidateCin: user.cinNumber || candidateProfile.cinNumber,
          candidateCne: user.cneNumber || candidateProfile.cneNumber,
          choices: basketChoices,
        }),
      });

      const data = await response.json();
      if (data.application) {
        setApplications((prev) => [data.application, ...prev]);
        showToast('Panier validé avec succès.', 'success');
        setCurrentTab('ocr');
      }
    } catch (err) {
      console.error(err);
      showToast('Validation effectuée en mode local.', 'success');
      setCurrentTab('ocr');
    }
  };

  // Interview scheduling & scoring
  const handleScheduleInterview = async (date: string, time: string, room: string) => {
    const activeApp = applications[0];
    if (!activeApp) return;

    try {
      const res = await fetch(`/api/applications/${activeApp.id}/interview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledDate: date,
          scheduledTime: time,
          room,
        }),
      });
      const data = await res.json();
      if (data.application) {
        setApplications((prev) => [data.application, ...prev.slice(1)]);
        showToast(`Entretien convoqué pour le ${date} à ${time}.`, 'success');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleScoreInterview = async (
    appId: string,
    scores: {
      specialite: number;
      motivation: number;
      projet: number;
      langues: number;
      juryNotes: string;
      decision: string;
    }
  ) => {
    try {
      const res = await fetch(`/api/applications/${appId}/interview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scores),
      });
      const data = await res.json();
      if (data.application) {
        setApplications((prev) =>
          prev.map((app) => (app.id === appId ? data.application : app))
        );
        showToast('Délibération du jury enregistrée et notifiée au candidat.', 'success');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Certified Cryptographic Signing
  const handleSignCharter = async (role: string) => {
    const activeApp = applications[0];
    if (!activeApp) return;

    try {
      const res = await fetch(`/api/applications/${activeApp.id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          signerName:
            role === 'Candidat'
              ? activeApp.candidateName
              : role === 'Directeur'
              ? 'Pr. Mustapha Bennani'
              : role === 'Chef_Labo'
              ? 'Dr. Karim El Amrani'
              : 'Pôle Doctoral USMBA',
          signerEmail:
            role === 'Candidat'
              ? activeApp.candidateEmail
              : role === 'Directeur'
              ? 'm.bennani@usmba.ac.ma'
              : role === 'Chef_Labo'
              ? 'k.elamrani@usmba.ac.ma'
              : 'cedoc.st@usmba.ac.ma',
        }),
      });
      const data = await res.json();
      if (data.application) {
        setApplications((prev) =>
          prev.map((app) => (app.id === activeApp.id ? data.application : app))
        );
        showToast(
          `Signature électronique (${role}) scellée par hachage SHA-256 !`,
          'success'
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Integrated collaboration message
  const handleSendMessage = async (msg: string, attachmentName?: string) => {
    const activeApp = applications[0];
    if (!activeApp) return;

    const senderRole =
      currentRole === 'candidat'
        ? 'Candidat'
        : currentRole === 'directeur'
        ? 'Directeur'
        : 'Chef_Labo';
    const senderName =
      currentRole === 'candidat'
        ? activeApp.candidateName
        : currentRole === 'directeur'
        ? 'Pr. Mustapha Bennani'
        : 'Dr. Karim El Amrani';

    try {
      const res = await fetch(`/api/applications/${activeApp.id}/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderRole,
          senderName,
          message: msg,
          attachmentName,
        }),
      });
      const data = await res.json();
      if (data.exchangeMessage) {
        setExchangeMessages((prev) => [...prev, data.exchangeMessage]);
        showToast('Document/Message transmis sans clé USB ni email externe.', 'success');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const activeApp = applications[0];
  const assignedSubject =
    subjects.find((s) => s.id === activeApp?.assignedSubjectId) ||
    subjects.find((s) => s.id === activeApp?.choices[0]?.subjectId) ||
    subjects[0];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Distraction-Free Top Navigation featuring the Three-Arrow Button */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        basketCount={basketChoices.length}
        openBasket={() => setIsBasketOpen(true)}
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        onOpenThreeArrowsMenu={() => setIsThreeArrowsMenuOpen(true)}
      />

      {/* Main Single-Focused Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {currentTab === 'catalog' && (
          <SubjectCatalog
            subjects={subjects}
            basketChoices={basketChoices}
            onAddChoice={handleAddChoice}
            onRemoveChoice={handleRemoveChoice}
            onOpenBasket={() => setIsBasketOpen(true)}
            onSelectSubjectForDetail={(subj) => setSelectedDetailSubject(subj)}
          />
        )}

        {currentTab === 'ocr' && (
          <OcrCaptureModal
            candidateProfile={candidateProfile}
            onUpdateProfile={(updated) =>
              setCandidateProfile((prev) => ({ ...prev, ...updated }))
            }
            onCompleteOcr={() => {
              showToast('Données OCR enregistrées dans le profil.', 'success');
              setCurrentTab('matching');
            }}
          />
        )}

        {currentTab === 'matching' && (
          <AcademicMatchingPanel
            candidateProfile={candidateProfile}
            subjects={subjects}
            currentApplication={activeApp}
            onScheduleInterview={handleScheduleInterview}
          />
        )}

        {currentTab === 'candidate_dashboard' && (
          <CandidateDashboard
            application={activeApp}
            allSubjects={subjects}
            exchangeMessages={exchangeMessages}
            onSendMessage={handleSendMessage}
            onSignCharter={handleSignCharter}
            onOpenCharterModal={() => setIsCharterModalOpen(true)}
            onRefreshApplication={fetchApplications}
          />
        )}

        {currentTab === 'supervisor_dashboard' && (
          <SupervisorLabDashboard
            currentRole={currentRole}
            applications={applications}
            allSubjects={subjects}
            exchangeMessages={exchangeMessages}
            onScoreInterview={handleScoreInterview}
            onSignCharter={handleSignCharter}
            onSendMessage={handleSendMessage}
            onOpenCharterModal={() => setIsCharterModalOpen(true)}
            onRefreshApplications={fetchApplications}
          />
        )}

        {currentTab === 'audit_trail' && (
          <AuditTrailPanel onClose={() => setCurrentTab('catalog')} />
        )}

        {/* Clean, Non-Trapping Charter Tab with Functional "Fermer l'aperçu" */}
        {currentTab === 'charter' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
                  Cadre Réglementaire & Contractuel
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">
                  Charte des Thèses
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  Document officiel et signatures de la commission doctorale.
                </p>
              </div>

              {/* Functional Close / Return button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentTab('catalog')}
                  className="py-2.5 px-5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm rounded-xl cursor-pointer transition-all flex items-center gap-2 border border-slate-300"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Fermer l'aperçu</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCharterModalOpen(true)}
                  className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Aperçu Plein Écran</span>
                </button>
              </div>
            </div>

            {/* Embedded Charter View with guaranteed functioning close action */}
            <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm">
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div className="text-xs text-slate-500 font-mono">
                    Réf. Inscription: {activeApp?.id}
                  </div>
                  <button
                    onClick={() => setCurrentTab('catalog')}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Fermer cette vue</span>
                  </button>
                </div>

                <div className="text-center space-y-1">
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-700">
                    Royaume du Maroc • Université Sidi Mohamed Ben Abdellah
                  </div>
                  <h3 className="text-xl font-black text-slate-900">
                    CHARTE DES THÈSES & CONTRAT DOCTORAL
                  </h3>
                  <p className="text-xs text-emerald-800 font-semibold bg-emerald-50 inline-block px-3 py-1 rounded-full border border-emerald-200">
                    Année Universitaire 2026/2027
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <strong className="block text-slate-900">Doctorant :</strong>
                    <div>{activeApp?.candidateName}</div>
                    <div className="font-mono text-slate-500">CIN: {activeApp?.candidateCin}</div>
                    <div className="font-mono text-slate-500">CNE: {activeApp?.candidateCne}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <strong className="block text-slate-900">Direction Scientifique :</strong>
                    <div>{assignedSubject?.professorName}</div>
                    <div className="text-slate-500">{assignedSubject?.establishment}</div>
                    <div className="text-slate-500">{assignedSubject?.laboratory}</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-400">Signatures Cryptographiques SHA-256</span>
                    <span className="text-[11px] font-mono text-emerald-400">USMBA-PKI</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div className="p-2 rounded bg-slate-800">
                      <div className="text-slate-400">1. Candidat</div>
                      <div className="font-bold text-emerald-400">✓ Signé</div>
                    </div>
                    <div className="p-2 rounded bg-slate-800">
                      <div className="text-slate-400">2. Directeur</div>
                      <div className="font-bold text-emerald-400">✓ Signé</div>
                    </div>
                    <div className="p-2 rounded bg-slate-800">
                      <div className="text-slate-400">3. Chef Labo</div>
                      <div className="font-bold text-emerald-400">✓ Signé</div>
                    </div>
                    <div className="p-2 rounded bg-slate-800">
                      <div className="text-slate-400">4. CEDoc</div>
                      <div className="font-bold text-purple-300">En cours</div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentTab('catalog')}
                    className="py-2.5 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Fermer l'aperçu</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCharterModalOpen(true)}
                    className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Ouvrir l'acte officiel complet</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* THE THREE-ARROW MENU DRAWER (Zero-distraction navigation & roles hub) */}
      <ThreeArrowsMenuDrawer
        isOpen={isThreeArrowsMenuOpen}
        onClose={() => setIsThreeArrowsMenuOpen(false)}
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        basketCount={basketChoices.length}
        openBasket={() => setIsBasketOpen(true)}
        currentRole={currentRole}
        onSelectRole={(role) => setCurrentRole(role)}
      />

      {/* Floating Basket Drawer */}
      <SubjectBasketDrawer
        isOpen={isBasketOpen}
        onClose={() => setIsBasketOpen(false)}
        basketChoices={basketChoices}
        allSubjects={subjects}
        onRemoveChoice={handleRemoveChoice}
        onMoveChoice={handleMoveChoice}
        onProceedToAuth={handleProceedToAuth}
      />

      {/* Subject Detail Modal */}
      <SubjectDetailModal
        subject={selectedDetailSubject}
        onClose={() => setSelectedDetailSubject(null)}
        basketChoices={basketChoices}
        onAddChoice={handleAddChoice}
        onRemoveChoice={handleRemoveChoice}
      />

      {/* Seamless Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccessAuth={handleSuccessAuth}
      />

      {/* Fullscreen Charter Modal with fully working close mechanism */}
      {isCharterModalOpen && (
        <CharterViewerModal
          isOpen={isCharterModalOpen}
          onClose={() => setIsCharterModalOpen(false)}
          application={activeApp}
          subject={assignedSubject}
          onSignByRole={handleSignCharter}
        />
      )}

      {/* Toast feedback pill */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl text-xs sm:text-sm font-semibold flex items-center gap-2 text-white ${
              toast.type === 'error'
                ? 'bg-red-600'
                : toast.type === 'info'
                ? 'bg-blue-600'
                : 'bg-emerald-700'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Minimal Clean Footer */}
      <footer className="mt-auto bg-slate-900 text-slate-400 text-xs py-5 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <span className="font-bold text-slate-200">GCD-USMBA</span> • Université Sidi Mohamed Ben Abdellah de Fès
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Sécurité PKI SHA-256 • Pôle des Études Doctorales
          </div>
        </div>
      </footer>
    </div>
  );
}
